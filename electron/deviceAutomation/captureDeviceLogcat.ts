import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveAdbPath } from "./deviceInventoryWatcher";

export type CaptureAndroidLogcatParams = {
  deviceId: string;
  outputDir: string;
  packageName?: string;
  maxLines?: number;
};

const DEFAULT_MAX_LINES = 4000;
const CRASH_KEYWORDS = ["FATAL", "ANR", "AndroidRuntime", "crash", "CRASH"];
const PLACEHOLDER_SECRETS = [
  /^YOUR_/i,
  /^sk-your-/i,
  /^xxx+$/i,
  /^placeholder$/i,
];

let spawnSyncImpl = spawnSync;

export function setCaptureDeviceLogcatSpawnSyncForTests(
  impl: typeof spawnSync | null,
): void {
  spawnSyncImpl = impl ?? spawnSync;
}

export function resetCaptureDeviceLogcatForTests(): void {
  spawnSyncImpl = spawnSync;
}

/** 按包名与崩溃关键词过滤 logcat 行（可单测）。 */
export function filterAndroidLogcatLines(
  rawLines: string[],
  options?: { packageName?: string; maxLines?: number },
): string[] {
  const packageName = options?.packageName?.trim();
  const maxLines = Math.max(1, options?.maxLines ?? DEFAULT_MAX_LINES);
  const pkgNeedle = packageName?.toLowerCase();

  const matched = rawLines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }
    const upper = trimmed.toUpperCase();
    const hasCrashSignal = CRASH_KEYWORDS.some((keyword) =>
      upper.includes(keyword.toUpperCase()),
    );
    if (!hasCrashSignal) {
      return false;
    }
    if (pkgNeedle && !trimmed.toLowerCase().includes(pkgNeedle)) {
      return false;
    }
    return true;
  });

  if (matched.length > 0) {
    return matched.slice(-maxLines);
  }

  // 无包名命中时回退：保留末尾若干行，避免空文件
  const nonEmpty = rawLines.filter((line) => line.trim());
  return nonEmpty.slice(-Math.min(maxLines, 800));
}

/**
 * 采集 Android logcat 并写入 `{outputDir}/crash-logcat.txt`。
 * 失败时返回 undefined，不阻塞 Monkey 收尾。
 */
export function captureAndroidLogcat(
  params: CaptureAndroidLogcatParams,
): string | undefined {
  const deviceId = params.deviceId?.trim();
  const outputDir = params.outputDir?.trim();
  if (!deviceId || !outputDir) {
    return undefined;
  }

  const adbPath = resolveAdbPath(process.env) ?? "adb";
  const result = spawnSyncImpl(
    adbPath,
    ["-s", deviceId, "logcat", "-d", "-v", "threadtime"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );

  if (result.error) {
    console.warn(
      "[device-automation] 采集 logcat 失败：",
      result.error.message,
    );
    return undefined;
  }

  if (result.status !== 0) {
    console.warn(
      "[device-automation] adb logcat 退出码异常：",
      result.status,
      result.stderr?.trim() || result.stdout?.trim(),
    );
    return undefined;
  }

  const rawLines = String(result.stdout ?? "")
    .split(/\r?\n/)
    .filter(Boolean);
  const filtered = filterAndroidLogcatLines(rawLines, {
    packageName: params.packageName,
    maxLines: params.maxLines,
  });

  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "crash-logcat.txt");
  writeFileSync(outputPath, `${filtered.join("\n")}\n`, "utf8");
  console.log("[device-automation] 已写入 crash logcat：", outputPath);
  return outputPath;
}

export function isPlaceholderLlmSecret(value: string | undefined | null): boolean {
  const secret = value?.trim();
  if (!secret) {
    return true;
  }
  return PLACEHOLDER_SECRETS.some((pattern) => pattern.test(secret));
}
