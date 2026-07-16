/** Android ADB 输出解析（P1 实时 APM，见 collection-architecture §3）。 */

export type ProcStatSnapshot = {
  total: number;
  idle: number;
};

export type AdbExecSync = (
  deviceId: string,
  args: string[],
) => { stdout: string; stderr: string; exitCode: number | null };

const PACKAGE_PREFIX = "package:";

/** 解析 `pm list packages -3` 输出。 */
export function parseThirdPartyPackages(stdout: string): string[] {
  const packages: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(PACKAGE_PREFIX)) {
      continue;
    }
    const packageName = trimmed.slice(PACKAGE_PREFIX.length).trim();
    if (packageName) {
      packages.push(packageName);
    }
  }
  return packages.sort((left, right) => left.localeCompare(right));
}

/** 解析 `/proc/stat` 首行 CPU 汇总。 */
export function parseProcStatLine(line: string): ProcStatSnapshot | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("cpu ")) {
    return undefined;
  }
  const values = trimmed
    .split(/\s+/)
    .slice(1)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));
  if (values.length < 4) {
    return undefined;
  }
  const idle = values[3] + (values[4] ?? 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return undefined;
  }
  return { total, idle };
}

/** 与上一帧差分计算系统 CPU 占用（0–100）。 */
export function computeSystemCpuPercent(
  previous: ProcStatSnapshot,
  current: ProcStatSnapshot,
): number | undefined {
  const totalDelta = current.total - previous.total;
  const idleDelta = current.idle - previous.idle;
  if (totalDelta <= 0) {
    return undefined;
  }
  const busy = totalDelta - idleDelta;
  const percent = (busy / totalDelta) * 100;
  if (!Number.isFinite(percent) || percent < 0) {
    return undefined;
  }
  return Math.min(100, percent);
}

/** 从 `top -n 1 -b` 输出解析目标应用 CPU%。 */
export function parseTopAppCpu(stdout: string, packageName: string): number | undefined {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.includes(packageName)) {
      continue;
    }
    const stateMatch = line.match(/\sS\s+(\d+(?:\.\d+)?)/);
    if (stateMatch) {
      const value = Number.parseFloat(stateMatch[1]);
      if (Number.isFinite(value) && value >= 0) {
        return value;
      }
    }
    const tokens = line.trim().split(/\s+/);
    for (const token of tokens) {
      if (!token.endsWith("%")) {
        continue;
      }
      const value = Number.parseFloat(token.slice(0, -1));
      if (Number.isFinite(value) && value >= 0 && value <= 100) {
        return value;
      }
    }
  }
  return undefined;
}

/** 从 `dumpsys meminfo` 解析 TOTAL PSS（KB→MB）。 */
export function parseMeminfoPssMb(stdout: string): number | undefined {
  const match = stdout.match(/TOTAL\s+PSS:\s+(\d+)/i);
  if (!match) {
    return undefined;
  }
  const kb = Number.parseInt(match[1], 10);
  if (!Number.isFinite(kb) || kb < 0) {
    return undefined;
  }
  return kb / 1024;
}

/** 从 `dumpsys gfxinfo` 解析累计渲染帧数。 */
export function parseGfxinfoTotalFrames(stdout: string): number | undefined {
  const match = stdout.match(/Total frames rendered:\s*(\d+)/i);
  if (!match) {
    return undefined;
  }
  const frames = Number.parseInt(match[1], 10);
  if (!Number.isFinite(frames) || frames < 0) {
    return undefined;
  }
  return frames;
}

/** 根据帧数增量与轮询间隔估算 FPS。 */
export function computeFps(deltaFrames: number, intervalMs: number): number | undefined {
  if (intervalMs <= 0 || deltaFrames < 0) {
    return undefined;
  }
  const fps = (deltaFrames * 1000) / intervalMs;
  if (!Number.isFinite(fps) || fps < 0) {
    return undefined;
  }
  return Math.min(120, fps);
}

export function collectAndroidPerfSample(params: {
  execAdbSync: AdbExecSync;
  deviceId: string;
  packageName: string;
  metrics: ReadonlySet<"cpu" | "memory" | "fps">;
  intervalMs: number;
  procStatPrevious: ProcStatSnapshot | null;
  gfxFramesPrevious: number | null;
}): {
  data: Partial<Record<"cpu_app" | "cpu_sys" | "mem_total" | "fps", number>>;
  procStatPrevious: ProcStatSnapshot | null;
  gfxFramesPrevious: number | null;
} {
  const data: Partial<Record<"cpu_app" | "cpu_sys" | "mem_total" | "fps", number>> = {};
  let procStatPrevious = params.procStatPrevious;
  let gfxFramesPrevious = params.gfxFramesPrevious;

  if (params.metrics.has("cpu")) {
    const topResult = params.execAdbSync(params.deviceId, ["shell", "top", "-n", "1", "-b"]);
    if (topResult.exitCode === 0) {
      const cpuApp = parseTopAppCpu(topResult.stdout, params.packageName);
      if (cpuApp !== undefined) {
        data.cpu_app = cpuApp;
      }
    }

    const statResult = params.execAdbSync(params.deviceId, [
      "shell",
      "cat",
      "/proc/stat",
    ]);
    if (statResult.exitCode === 0) {
      const firstLine = statResult.stdout.split(/\r?\n/)[0] ?? "";
      const current = parseProcStatLine(firstLine);
      if (current && procStatPrevious) {
        const cpuSys = computeSystemCpuPercent(procStatPrevious, current);
        if (cpuSys !== undefined) {
          data.cpu_sys = cpuSys;
        }
      }
      if (current) {
        procStatPrevious = current;
      }
    }
  }

  if (params.metrics.has("memory")) {
    const pidResult = params.execAdbSync(params.deviceId, [
      "shell",
      "pidof",
      params.packageName,
    ]);
    const pid = pidResult.stdout.trim().split(/\s+/)[0];
    if (pid) {
      const memResult = params.execAdbSync(params.deviceId, [
        "shell",
        "dumpsys",
        "meminfo",
        pid,
      ]);
      if (memResult.exitCode === 0) {
        const memTotal = parseMeminfoPssMb(memResult.stdout);
        if (memTotal !== undefined) {
          data.mem_total = memTotal;
        }
      }
    }
  }

  if (params.metrics.has("fps")) {
    const gfxResult = params.execAdbSync(params.deviceId, [
      "shell",
      "dumpsys",
      "gfxinfo",
      params.packageName,
    ]);
    if (gfxResult.exitCode === 0) {
      const totalFrames = parseGfxinfoTotalFrames(gfxResult.stdout);
      if (totalFrames !== undefined) {
        if (gfxFramesPrevious !== null) {
          const fps = computeFps(totalFrames - gfxFramesPrevious, params.intervalMs);
          if (fps !== undefined) {
            data.fps = fps;
          }
        }
        gfxFramesPrevious = totalFrames;
      }
    }
  }

  return { data, procStatPrevious, gfxFramesPrevious };
}
