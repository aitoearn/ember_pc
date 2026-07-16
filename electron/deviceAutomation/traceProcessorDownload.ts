import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import {
  detectTraceProcessorPlatform,
  resolveTraceProcessorDownloadUrl,
  TRACE_PROCESSOR_PIN,
} from "./traceProcessorPin";

/** @deprecated 保留常量供测试引用；实际版本见 TRACE_PROCESSOR_PIN.version */
export const PERFETTO_TRACE_PROCESSOR_PIN = TRACE_PROCESSOR_PIN.version;

let cacheRootDir: string | null = null;

export function setTraceProcessorCacheRoot(dir: string | null): void {
  cacheRootDir = dir?.trim() || null;
}

export function getTraceProcessorEnvOverride(): string | null {
  const candidates = [
    process.env.PERFETTO_TRACE_PROCESSOR_PATH?.trim(),
    process.env.TRACE_PROCESSOR_PATH?.trim(),
  ];
  for (const value of candidates) {
    if (value) {
      return value;
    }
  }
  return null;
}

function resolveBinaryFileName(platform = detectTraceProcessorPlatform()): string {
  return platform.startsWith("windows-")
    ? "trace_processor_shell.exe"
    : "trace_processor_shell";
}

function resolveCachedBinaryPath(rootDir: string): string {
  return path.join(
    rootDir,
    "perfetto",
    TRACE_PROCESSOR_PIN.version,
    resolveBinaryFileName(),
  );
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
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
            reject(new Error(`下载 trace_processor_shell 失败: HTTP ${status}`));
            response.resume();
            return;
          }
          mkdirSync(path.dirname(destination), { recursive: true });
          const file = createWriteStream(destination, { mode: 0o755 });
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

async function installTraceProcessorBinary(destination: string): Promise<void> {
  const platform = detectTraceProcessorPlatform();
  const expectedSha = TRACE_PROCESSOR_PIN.sha256ByPlatform[platform];
  const url = resolveTraceProcessorDownloadUrl(platform);
  const tmpSuffix = platform.startsWith("windows-") ? ".exe" : "";
  const tmp = path.join(
    os.tmpdir(),
    `ember-trace_processor_shell-${process.pid}-${Date.now()}${tmpSuffix}`,
  );

  try {
    console.log("[perf-trace] 开始下载 trace_processor_shell…", url);
    await downloadToFile(url, tmp);
    const actualSha = sha256File(tmp);
    if (actualSha !== expectedSha) {
      throw new Error(
        `trace_processor_shell SHA256 校验失败。\n期望: ${expectedSha}\n实际: ${actualSha}`,
      );
    }
    if (process.platform !== "win32") {
      chmodSync(tmp, 0o755);
    }
    const smoke = spawnSync(tmp, ["--version"], { stdio: "ignore" });
    if (smoke.status !== 0) {
      throw new Error("下载的 trace_processor_shell 未通过 --version 冒烟测试");
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    if (existsSync(destination)) {
      rmSync(destination, { force: true });
    }
    renameSync(tmp, destination);
    if (process.platform !== "win32") {
      chmodSync(destination, 0o755);
    }
    console.log("[perf-trace] trace_processor_shell 下载完成:", destination);
  } catch (error) {
    try {
      rmSync(tmp, { force: true });
    } catch {
      // ignore cleanup failure
    }
    throw error;
  }
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
    throw new Error("trace_processor_shell 尚未下载，请先触发 L1 分析以下载");
  }

  await installTraceProcessorBinary(binaryPath);
  return binaryPath;
}

export function resetTraceProcessorDownloadForTests(): void {
  cacheRootDir = null;
}
