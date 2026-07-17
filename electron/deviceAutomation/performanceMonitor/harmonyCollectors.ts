/**
 * HarmonyOS SmartPerf 采集解析（P1 实时 APM，对齐 Android `androidCollectors.ts`）。
 *
 * 采集手段：设备端命令行工具 `SP_daemon`（华为 SmartPerf Device-daemon），
 * 通过 hdc 每 tick 执行一次 `SP_daemon -N 1 -PKG <pkg> [-c] [-r] [-f]`，
 * 解析其 `order:N key=value` 行式输出。
 *
 * 与 Android 的差异：SP_daemon 直接给出整机 CPU 占用（TotalcpuUsage）与实时 FPS，
 * 无需像 Android 那样做 /proc/stat 差分或 gfxinfo 帧数差分，因此采集器是无状态的。
 */

import type { HdcExecSync } from "../resolveHdcPath";

export type { HdcExecSync };

export type HarmonyPerfMetricId = "cpu" | "memory" | "fps";

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 从 SP_daemon `order:N key=value` 输出解析指定标量字段。
 *
 * 采用 `(?:^|\s)key=` 前缀锚定，避免 `pss` 命中 `nativeHeapPss`、
 * `fps` 命中 `fpsJitters`/`ohtestfps`、`TotalcpuUsage` 命中 `TotalcpuidleUsage` 等。
 * 若字段多次出现（多个采样块），取最后一次的值。
 */
export function parseSpDaemonValue(stdout: string, key: string): number | undefined {
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(key)}=(-?\\d+(?:\\.\\d+)?)`, "g");
  let match: RegExpExecArray | null;
  let value: number | undefined;
  while ((match = pattern.exec(stdout)) !== null) {
    const parsed = Number.parseFloat(match[1]);
    if (Number.isFinite(parsed)) {
      value = parsed;
    }
  }
  return value;
}

/** 解析 `bm dump -a` 输出的应用包名列表（缩进的 bundle 名逐行罗列）。 */
export function parseHarmonyPackages(stdout: string): string[] {
  const packages = new Set<string>();
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    // 跳过标题/汇总行，如 "ID: 100"、"bundle name list:"、含空格或冒号的行。
    if (line.includes(" ") || line.includes(":")) {
      continue;
    }
    // 鸿蒙包名形如 com.example.app / ohos.samples.ecg（至少一个点）。
    if (/^[A-Za-z][\w-]*(?:\.[\w-]+)+$/.test(line)) {
      packages.add(line);
    }
  }
  return [...packages].sort((left, right) => left.localeCompare(right));
}

function clampPercent(value: number): number {
  if (value < 0) {
    return 0;
  }
  return Math.min(100, value);
}

/** 采集一次 HarmonyOS 性能样本（阻塞约 1s，SP_daemon 一秒采集一次）。 */
export function collectHarmonyPerfSample(params: {
  execHdcSync: HdcExecSync;
  deviceId: string;
  packageName: string;
  metrics: ReadonlySet<HarmonyPerfMetricId>;
}): {
  data: Partial<Record<"cpu_app" | "cpu_sys" | "mem_total" | "fps", number>>;
} {
  const data: Partial<Record<"cpu_app" | "cpu_sys" | "mem_total" | "fps", number>> = {};

  const flags: string[] = [];
  if (params.metrics.has("cpu")) {
    flags.push("-c");
  }
  if (params.metrics.has("memory")) {
    flags.push("-r");
  }
  if (params.metrics.has("fps")) {
    flags.push("-f");
  }
  if (flags.length === 0) {
    return { data };
  }

  const result = params.execHdcSync(params.deviceId, [
    "shell",
    "SP_daemon",
    "-N",
    "1",
    "-PKG",
    params.packageName,
    ...flags,
  ]);

  const stdout = result.stdout ?? "";
  // SP_daemon 正常输出必然包含 order: 前缀；否则视为不可用（无 SP_daemon / 权限不足）。
  if (!stdout.includes("order:")) {
    return { data };
  }

  if (params.metrics.has("cpu")) {
    const cpuApp = parseSpDaemonValue(stdout, "ProcCpuUsage");
    if (cpuApp !== undefined) {
      data.cpu_app = clampPercent(cpuApp);
    }
    const cpuSys = parseSpDaemonValue(stdout, "TotalcpuUsage");
    if (cpuSys !== undefined) {
      data.cpu_sys = clampPercent(cpuSys);
    }
  }

  if (params.metrics.has("memory")) {
    const pssKb = parseSpDaemonValue(stdout, "pss");
    if (pssKb !== undefined && pssKb >= 0) {
      data.mem_total = pssKb / 1024;
    }
  }

  if (params.metrics.has("fps")) {
    const fps = parseSpDaemonValue(stdout, "fps");
    if (fps !== undefined && fps >= 0) {
      data.fps = Math.min(240, fps);
    }
  }

  return { data };
}

/** 通过 `bm dump -a` 列出 HarmonyOS 设备上的应用包名。 */
export function listHarmonyPackages(params: {
  execHdcSync: HdcExecSync;
  deviceId: string;
}): string[] {
  const result = params.execHdcSync(params.deviceId, ["shell", "bm", "dump", "-a"]);
  if (result.exitCode !== 0 && !result.stdout.trim()) {
    return [];
  }
  return parseHarmonyPackages(result.stdout);
}
