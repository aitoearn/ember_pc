import { chmodSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { access } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

/** 与 SmartPerfetto 对齐的 pin 版本（按需下载 URL 带版本目录） */
export const PERFETTO_TRACE_PROCESSOR_PIN = "v52.0";

const DOWNLOAD_BASE = "https://get.perfetto.dev/trace_processor";

let cacheRootDir: string | null = null;

export function setTraceProcessorCacheRoot(dir: string | null): void {
  cacheRootDir = dir?.trim() || null;
}

export function getTraceProcessorEnvOverride(): string | null {
  const value = process.env.PERFETTO_TRACE_PROCESSOR_PATH?.trim();
  return value || null;
}

function resolveBinaryFileName(): string {
  if (process.platform === "win32") {
    return "trace_processor.exe";
  }
  return "trace_processor";
}

function resolveCachedBinaryPath(rootDir: string): string {
  return path.join(rootDir, "perfetto", resolveBinaryFileName());
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function downloadToFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = (targetUrl: string, redirectsLeft = 5) => {
      https
        .get(targetUrl, (response) => {
          const status = response.statusCode ?? 0;
          if (
            (status === 301 || status === 302 || status === 307 || status === 308) &&
            response.headers.location &&
            redirectsLeft > 0
          ) {
            response.resume();
            request(response.headers.location, redirectsLeft - 1);
            return;
          }
          if (status < 200 || status >= 300) {
            reject(new Error(`下载 trace_processor 失败: HTTP ${status}`));
            response.resume();
            return;
          }
          mkdirSync(path.dirname(destination), { recursive: true });
          const file = createWriteStream(destination);
          response.pipe(file);
          file.on("finish", () => {
            file.close(() => resolve());
          });
          file.on("error", reject);
        })
        .on("error", reject);
    };
    request(url);
  });
}

export async function resolveTraceProcessorBinary(options?: {
  cacheRoot?: string;
  downloadIfMissing?: boolean;
}): Promise<string> {
  const envOverride = getTraceProcessorEnvOverride();
  if (envOverride) {
    if (!(await isExecutable(envOverride))) {
      throw new Error(
        `PERFETTO_TRACE_PROCESSOR_PATH 指向的文件不存在: ${envOverride}`,
      );
    }
    return envOverride;
  }

  const root = options?.cacheRoot?.trim() || cacheRootDir?.trim();
  if (!root) {
    throw new Error(
      "未配置 trace_processor 缓存目录，请设置 PERFETTO_TRACE_PROCESSOR_PATH",
    );
  }

  const binaryPath = resolveCachedBinaryPath(root);
  if (await isExecutable(binaryPath)) {
    return binaryPath;
  }

  if (options?.downloadIfMissing === false) {
    throw new Error("trace_processor 尚未下载，请先触发 L1 分析以下载");
  }

  console.log("[perf-trace] 开始下载 trace_processor…", DOWNLOAD_BASE);
  await downloadToFile(DOWNLOAD_BASE, binaryPath);
  if (process.platform !== "win32") {
    chmodSync(binaryPath, 0o755);
  }
  console.log("[perf-trace] trace_processor 下载完成:", binaryPath);
  return binaryPath;
}

export function resetTraceProcessorDownloadForTests(): void {
  cacheRootDir = null;
}
