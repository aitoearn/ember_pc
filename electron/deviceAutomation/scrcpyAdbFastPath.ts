import { createServer } from "node:net";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { statSync } from "node:fs";
import { resolveAdbPath } from "./deviceInventoryWatcher";

const SCRCPY_VERSION = "3.1";
const DEFAULT_REMOTE_SCRCPY_PATH = "/data/local/tmp/ember/scrcpy.jar";

/** 对齐 Android KeyEvent / aya main.inputKey */
export const ANDROID_KEYCODE_BACK = 4;
export const ANDROID_KEYCODE_HOME = 3;

export type ScrcpyAdbFastPathDeps = {
  execAdbSync: typeof execAdbSync;
  spawnAdb: typeof spawnAdb;
  allocateLocalTcpPort?: () => Promise<number>;
};

const defaultDeps: ScrcpyAdbFastPathDeps = {
  execAdbSync,
  spawnAdb,
};

const jarReadyCache = new Set<string>();
const jarPrewarmInFlight = new Set<string>();

export type ScrcpyReverseFastParams = {
  deviceId: string;
  remote: string;
  localPort: number;
};

export type ScrcpyStartFastParams = {
  deviceId: string;
  scid: string;
  scrcpyServerPath: string;
  remotePath?: string;
  maxSize?: number;
  videoBitRate?: number;
  audio?: boolean;
};

export type ScrcpyPrewarmJarParams = {
  deviceId: string;
  scrcpyServerPath: string;
  remotePath?: string;
};

export type ScrcpyPrewarmJarResult = {
  status: "ready" | "scheduled" | "skipped";
};

export function buildScrcpyJarCacheKey(
  deviceId: string,
  remotePath: string,
  localSize: number,
): string {
  return `${deviceId}\0${remotePath}\0${localSize}`;
}

export function clearScrcpyJarCacheForTests(): void {
  jarReadyCache.clear();
  jarPrewarmInFlight.clear();
}

export function isScrcpyJarCached(
  deviceId: string,
  localPath: string,
  remotePath = DEFAULT_REMOTE_SCRCPY_PATH,
): boolean {
  const localSize = statSync(localPath).size;
  return jarReadyCache.has(buildScrcpyJarCacheKey(deviceId, remotePath, localSize));
}

export function reverseScrcpyTcpFast(
  params: ScrcpyReverseFastParams,
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): Record<string, unknown> {
  if (!params.remote.startsWith("localabstract:scrcpy_")) {
    throw new Error("scrcpy reverse remote 必须是 localabstract:scrcpy_<scid>");
  }
  const result = deps.execAdbSync(params.deviceId, [
    "reverse",
    params.remote,
    `tcp:${params.localPort}`,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(
      `adb reverse 失败：${result.stderr.trim() || result.stdout.trim() || "未知错误"}`,
    );
  }
  return {
    port: params.localPort,
    local: params.remote,
    remote: `tcp:${params.localPort}`,
    reused: false,
    transport: "adb-fast-path",
  };
}

/** 解析 adb reverse --list，查找已有 scrcpy abstract → 本地 tcp 端口映射。 */
export function findScrcpyReverseListenPort(
  deviceId: string,
  remote: string,
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): number | undefined {
  const result = deps.execAdbSync(deviceId, ["reverse", "--list"]);
  if (result.exitCode !== 0) {
    return undefined;
  }
  for (const line of result.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const tcpIndex = trimmed.lastIndexOf("tcp:");
    if (tcpIndex < 0) {
      continue;
    }
    const remotePart = trimmed.slice(0, tcpIndex).trim().split(/\s+/).pop();
    if (remotePart !== remote) {
      continue;
    }
    const port = Number.parseInt(trimmed.slice(tcpIndex + 4).trim(), 10);
    if (Number.isFinite(port) && port > 0) {
      return port;
    }
  }
  return undefined;
}

export function allocateLocalTcpPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("无法分配 scrcpy 本地 TCP 端口"));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

export function removeScrcpyReverseFast(
  deviceId: string,
  remote: string,
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): void {
  if (!remote.startsWith("localabstract:scrcpy_")) {
    throw new Error("scrcpy reverse remote 必须是 localabstract:scrcpy_<scid>");
  }
  deps.execAdbSync(deviceId, ["reverse", "--remove", remote]);
}

export function teardownScrcpySessionFast(
  params: { deviceId: string; remote: string; killServer?: boolean },
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): Record<string, unknown> {
  if (params.killServer !== false) {
    stopScrcpyServerFast(params.deviceId, deps);
  }
  removeScrcpyReverseFast(params.deviceId, params.remote, deps);
  return {
    deviceId: params.deviceId,
    remote: params.remote,
    transport: "adb-fast-path",
  };
}

/**
 * 对齐 aya reverseTcp：查找已有 reverse 端口并复用，否则分配新端口并 adb reverse。
 */
export async function prepareScrcpyReverseTcpFast(
  params: { deviceId: string; remote: string },
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): Promise<{ port: number; reused: boolean }> {
  if (!params.remote.startsWith("localabstract:scrcpy_")) {
    throw new Error("scrcpy reverse remote 必须是 localabstract:scrcpy_<scid>");
  }
  const existing = findScrcpyReverseListenPort(params.deviceId, params.remote, deps);
  if (existing !== undefined) {
    return { port: existing, reused: true };
  }
  const allocate = deps.allocateLocalTcpPort ?? allocateLocalTcpPort;
  const port = await allocate();
  reverseScrcpyTcpFast(
    { deviceId: params.deviceId, remote: params.remote, localPort: port },
    deps,
  );
  return { port, reused: false };
}

export function stopScrcpyServerFast(
  deviceId: string,
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): Record<string, unknown> {
  const result = deps.execAdbSync(deviceId, [
    "shell",
    "pkill",
    "-f",
    "com.genymobile.scrcpy.Server",
  ]);
  return {
    deviceId,
    exitCode: result.exitCode,
    transport: "adb-fast-path",
  };
}

export function startScrcpyServerFast(
  params: ScrcpyStartFastParams,
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): Record<string, unknown> {
  const remotePath = params.remotePath ?? DEFAULT_REMOTE_SCRCPY_PATH;
  ensureScrcpyJarOnDevice(params.deviceId, params.scrcpyServerPath, remotePath, deps);
  const shellArgs = buildScrcpyServerShellArgs(params, remotePath);
  const child = deps.spawnAdb(params.deviceId, shellArgs);
  drainScrcpyServerOutput(child);
  return {
    deviceId: params.deviceId,
    pid: child.pid,
    remotePath,
    scid: params.scid,
    version: SCRCPY_VERSION,
    transport: "adb-fast-path",
  };
}

/** 后台 push scrcpy.jar，IPC 立即返回；连接时若已缓存则跳过 stat/push。 */
export function prewarmScrcpyJarFast(
  params: ScrcpyPrewarmJarParams,
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): ScrcpyPrewarmJarResult {
  const remotePath = params.remotePath ?? DEFAULT_REMOTE_SCRCPY_PATH;
  const localSize = statSync(params.scrcpyServerPath).size;
  const cacheKey = buildScrcpyJarCacheKey(params.deviceId, remotePath, localSize);
  if (jarReadyCache.has(cacheKey)) {
    return { status: "ready" };
  }
  if (jarPrewarmInFlight.has(cacheKey)) {
    return { status: "skipped" };
  }
  jarPrewarmInFlight.add(cacheKey);
  setImmediate(() => {
    void ensureScrcpyJarOnDeviceAsync(
      params.deviceId,
      params.scrcpyServerPath,
      remotePath,
      deps,
    )
      .then((ready) => {
        if (ready) {
          jarReadyCache.add(cacheKey);
        }
      })
      .catch((error) => {
        console.warn("[scrcpy] jar 预热失败:", error);
      })
      .finally(() => {
        jarPrewarmInFlight.delete(cacheKey);
      });
  });
  return { status: "scheduled" };
}

/** 对齐 aya Toolbar：adb shell input keyevent <keyCode> */
export function inputAndroidKeyFast(
  params: { deviceId: string; keyCode: number },
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): Record<string, unknown> {
  const result = deps.execAdbSync(params.deviceId, [
    "shell",
    "input",
    "keyevent",
    String(params.keyCode),
  ]);
  if (result.exitCode !== 0) {
    throw new Error(
      `adb input keyevent 失败：${result.stderr.trim() || result.stdout.trim() || "未知错误"}`,
    );
  }
  return {
    deviceId: params.deviceId,
    keyCode: params.keyCode,
    transport: "adb-fast-path",
  };
}

export function sendAndroidNavigationFast(
  params: { deviceId: string; action: "back" | "home" },
  deps: ScrcpyAdbFastPathDeps = defaultDeps,
): Record<string, unknown> {
  const keyCode =
    params.action === "back" ? ANDROID_KEYCODE_BACK : ANDROID_KEYCODE_HOME;
  return inputAndroidKeyFast({ deviceId: params.deviceId, keyCode }, deps);
}

function ensureScrcpyJarOnDevice(
  deviceId: string,
  localPath: string,
  remotePath: string,
  deps: ScrcpyAdbFastPathDeps,
): void {
  const localSize = statSync(localPath).size;
  const cacheKey = buildScrcpyJarCacheKey(deviceId, remotePath, localSize);
  if (jarReadyCache.has(cacheKey)) {
    if (remoteJarMatchesLocalSize(deviceId, remotePath, localSize, deps)) {
      return;
    }
    jarReadyCache.delete(cacheKey);
    console.warn(
      `[scrcpy] 设备 ${deviceId} 缓存显示 jar 已就绪，但远端 ${remotePath} 缺失或大小不一致，将重新 push`,
    );
  } else if (remoteJarMatchesLocalSize(deviceId, remotePath, localSize, deps)) {
    jarReadyCache.add(cacheKey);
    return;
  }
  deps.execAdbSync(deviceId, ["shell", "mkdir", "-p", pathDirname(remotePath)]);
  const pushResult = deps.execAdbSync(deviceId, ["push", localPath, remotePath]);
  if (pushResult.exitCode !== 0) {
    throw new Error(
      `adb push scrcpy.jar 失败：${pushResult.stderr.trim() || pushResult.stdout.trim() || "未知错误"}`,
    );
  }
  if (!remoteJarMatchesLocalSize(deviceId, remotePath, localSize, deps)) {
    throw new Error(`adb push scrcpy.jar 后远端校验失败：${remotePath}`);
  }
  jarReadyCache.add(cacheKey);
  console.info(`[scrcpy] 已向设备 ${deviceId} push scrcpy.jar → ${remotePath}`);
}

function pathDirname(remotePath: string): string {
  const index = remotePath.lastIndexOf("/");
  if (index <= 0) {
    return remotePath;
  }
  return remotePath.slice(0, index);
}

async function ensureScrcpyJarOnDeviceAsync(
  deviceId: string,
  localPath: string,
  remotePath: string,
  deps: ScrcpyAdbFastPathDeps,
): Promise<boolean> {
  const localSize = statSync(localPath).size;
  const cacheKey = buildScrcpyJarCacheKey(deviceId, remotePath, localSize);
  if (jarReadyCache.has(cacheKey)) {
    return true;
  }
  if (remoteJarMatchesLocalSize(deviceId, remotePath, localSize, deps)) {
    jarReadyCache.add(cacheKey);
    return true;
  }
  return await pushScrcpyJarAsync(deviceId, localPath, remotePath, deps);
}

function remoteJarMatchesLocalSize(
  deviceId: string,
  remotePath: string,
  localSize: number,
  deps: ScrcpyAdbFastPathDeps,
): boolean {
  const statResult = deps.execAdbSync(deviceId, [
    "shell",
    "stat",
    "-c",
    "%s",
    remotePath,
  ]);
  if (statResult.exitCode !== 0) {
    return false;
  }
  const remoteSize = Number.parseInt(statResult.stdout.trim(), 10);
  return Number.isFinite(remoteSize) && remoteSize === localSize;
}

function pushScrcpyJarAsync(
  deviceId: string,
  localPath: string,
  remotePath: string,
  deps: ScrcpyAdbFastPathDeps,
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = deps.spawnAdb(deviceId, ["push", localPath, remotePath]);
    child.on("error", (error) => {
      console.warn("[scrcpy] adb push 进程错误:", error);
      resolve(false);
    });
    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

function buildScrcpyServerShellArgs(
  params: ScrcpyStartFastParams,
  remotePath: string,
): string[] {
  const options: string[] = [];
  appendStringOption(options, "scid", params.scid);
  appendNumberOption(options, "max_size", params.maxSize);
  appendNumberOption(options, "video_bit_rate", params.videoBitRate);
  appendBooleanOption(options, "audio", params.audio);
  return [
    "shell",
    `CLASSPATH=${remotePath}`,
    "app_process",
    "/system/bin",
    "com.genymobile.scrcpy.Server",
    SCRCPY_VERSION,
    ...options,
  ];
}

function appendStringOption(options: string[], key: string, value: string | undefined): void {
  if (value) {
    options.push(`${key}=${value}`);
  }
}

function appendNumberOption(options: string[], key: string, value: number | undefined): void {
  if (value !== undefined) {
    options.push(`${key}=${value}`);
  }
}

function appendBooleanOption(options: string[], key: string, value: boolean | undefined): void {
  if (value !== undefined) {
    options.push(`${key}=${value}`);
  }
}

function drainScrcpyServerOutput(child: ChildProcessWithoutNullStreams): void {
  let loggedStderr = false;
  const forward = (stream: NodeJS.ReadableStream | null, label: "stdout" | "stderr"): void => {
    if (!stream) {
      return;
    }
    stream.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString().trim();
      if (!text) {
        return;
      }
      if (label === "stderr" || !loggedStderr) {
        console.info(`[scrcpy] server ${label}:`, text.slice(0, 500));
        if (label === "stderr") {
          loggedStderr = true;
        }
      }
    });
    stream.on("error", () => {});
  };
  forward(child.stdout, "stdout");
  forward(child.stderr, "stderr");
  child.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.warn(
        `[scrcpy] server adb shell 退出 code=${code ?? "null"} signal=${signal ?? "null"}（若设备无 jar 或 reverse 未就绪，server 会秒退且 renderer 端 socket 超时）`,
      );
    }
  });
}

export function execAdbSync(
  deviceId: string,
  args: string[],
): { stdout: string; stderr: string; exitCode: number | null } {
  const adbPath = resolveAdbPath(process.env) ?? "adb";
  const result = spawnSync(adbPath, ["-s", deviceId, ...args], {
    encoding: "utf8",
    shell: false,
  });
  return {
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    exitCode: result.status,
  };
}

function spawnAdb(deviceId: string, args: string[]): ChildProcessWithoutNullStreams {
  const adbPath = resolveAdbPath(process.env) ?? "adb";
  return spawn(adbPath, ["-s", deviceId, ...args], {
    stdio: "pipe",
    shell: false,
  });
}
