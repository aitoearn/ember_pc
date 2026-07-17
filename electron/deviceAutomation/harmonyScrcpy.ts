/**
 * HarmonyOS 投屏（hoscrcpy）Electron 侧桥接。
 *
 * spawn Java wrapper（包装华为 hoscrcpy SDK）：
 *   - wrapper stdout：[4 字节大端长度][H264] 逐帧 → 解帧后经本地 WebSocket 以二进制消息下发给 renderer。
 *   - wrapper stderr：日志 + `@@META@@`/`@@READY@@`/`@@ERROR@@` 结构化事件。
 *   - wrapper stdin：控制指令行（renderer 经 WebSocket 文本消息回传）。
 *
 * 单设备单会话：再次 start 会先结束旧会话（与性能采集一致）。
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
// 仓库未安装 @types/ws；运行时依赖已存在，用本地窄类型承接桥接 API。
// @ts-expect-error -- 缺少 @types/ws
import { WebSocketServer } from "ws";
import { resolveHdcPath } from "./resolveHdcPath";
import { resolveHoscrcpyJarPaths } from "./harmonyScrcpyPaths";

const META_TIMEOUT_MS = 25_000;
const WRAPPER_MAIN_CLASS = "com.lime.harmonyscrcpy.HarmonyScrcpyWrapper";

/** hoscrcpy 桥接实际用到的 WebSocket 子集。 */
type HarmonyScrcpySocket = {
  OPEN: number;
  readyState: number;
  send(data: Buffer | Uint8Array | string): void;
  close(): void;
  on(
    event: "message",
    listener: (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => void,
  ): void;
  on(event: "close", listener: () => void): void;
};

export type HarmonyScrcpyStartParams = {
  deviceId: string;
  scale?: number;
  bitRate?: number;
  frameRate?: number;
};

export type HarmonyScrcpyStartResult = {
  wsUrl: string;
  port: number;
  width: number;
  height: number;
  scale: number;
};

export type HarmonyScrcpyStatusResult = {
  active: boolean;
  deviceId?: string;
  port?: number;
};

type ActiveHarmonyScrcpy = {
  deviceId: string;
  child: ChildProcessWithoutNullStreams;
  wss: WebSocketServer;
  port: number;
  client: HarmonyScrcpySocket | null;
  stdoutBuffer: Buffer;
  stderrBuffer: string;
  width: number;
  height: number;
  scale: number;
  /** 对齐 lmdeviceagent：缓存 SPS/PPS/IDR，新观看者先发关键帧。 */
  cachedSps: Buffer | null;
  cachedPps: Buffer | null;
  cachedIdr: Buffer | null;
};

let active: ActiveHarmonyScrcpy | null = null;
/** 同一 deviceId 的并发 start 复用同一 Promise，避免预热+进页双启。 */
let startInFlight: {
  deviceId: string;
  promise: Promise<HarmonyScrcpyStartResult>;
} | null = null;

/** 在 offset 处识别 Annex-B 起始码长度（3 或 4），否则 0。 */
function annexBStartCodeLen(frame: Buffer, offset: number): number {
  if (
    offset + 3 < frame.length &&
    frame[offset] === 0 &&
    frame[offset + 1] === 0 &&
    frame[offset + 2] === 0 &&
    frame[offset + 3] === 1
  ) {
    return 4;
  }
  if (
    offset + 2 < frame.length &&
    frame[offset] === 0 &&
    frame[offset + 1] === 0 &&
    frame[offset + 2] === 1
  ) {
    return 3;
  }
  return 0;
}

/** 遍历 Annex-B 帧中的 NAL，回调 (type, nalWithStartCode)。 */
function forEachAnnexBNal(
  frame: Buffer,
  onNal: (type: number, nal: Buffer) => void,
): void {
  const starts: number[] = [];
  for (let i = 0; i + 3 < frame.length; i++) {
    if (annexBStartCodeLen(frame, i) > 0) {
      starts.push(i);
      // 跳过已识别起始码，避免 000001 被当成两次
      i += annexBStartCodeLen(frame, i) - 1;
    }
  }
  for (let s = 0; s < starts.length; s++) {
    const nalStart = starts[s]!;
    const scLen = annexBStartCodeLen(frame, nalStart);
    const payloadStart = nalStart + scLen;
    if (payloadStart >= frame.length) {
      continue;
    }
    const nalEnd = s + 1 < starts.length ? starts[s + 1]! : frame.length;
    const type = frame[payloadStart]! & 0x1f;
    onNal(type, frame.subarray(nalStart, nalEnd));
  }
}

function cacheKeyFramesFromAnnexB(
  session: ActiveHarmonyScrcpy,
  frame: Buffer,
): void {
  forEachAnnexBNal(frame, (type, nal) => {
    if (type === 7) {
      session.cachedSps = Buffer.from(nal);
      session.cachedPps = null;
      session.cachedIdr = null;
    } else if (type === 8) {
      session.cachedPps = Buffer.from(nal);
    } else if (type === 5) {
      session.cachedIdr = Buffer.from(nal);
    }
  });
}

function sendCachedKeyFrames(
  session: ActiveHarmonyScrcpy,
  socket: HarmonyScrcpySocket,
): void {
  if (socket.readyState !== socket.OPEN) {
    return;
  }
  try {
    if (session.cachedSps) {
      socket.send(session.cachedSps);
    }
    if (session.cachedPps) {
      socket.send(session.cachedPps);
    }
    if (session.cachedIdr) {
      socket.send(session.cachedIdr);
    }
  } catch (error) {
    console.warn("[harmony-scrcpy] 发送缓存关键帧失败", error);
  }
}

function resolveJavaCommand(): string {
  const home = process.env.JAVA_HOME?.trim();
  if (home) {
    const exe = path.join(
      home,
      "bin",
      process.platform === "win32" ? "java.exe" : "java",
    );
    if (existsSync(exe)) {
      return exe;
    }
  }
  return process.platform === "win32" ? "java.exe" : "java";
}

/** 从 wrapper stdout 缓冲区解出完整 H264 帧，逐帧回调。 */
function drainFrames(session: ActiveHarmonyScrcpy, onFrame: (frame: Buffer) => void): void {
  let buffer = session.stdoutBuffer;
  while (buffer.length >= 4) {
    const len = buffer.readUInt32BE(0);
    if (buffer.length < 4 + len) {
      break;
    }
    const frame = buffer.subarray(4, 4 + len);
    onFrame(frame);
    buffer = buffer.subarray(4 + len);
  }
  session.stdoutBuffer = buffer;
}

export async function startHarmonyScrcpy(
  params: HarmonyScrcpyStartParams,
): Promise<HarmonyScrcpyStartResult> {
  if (!params.deviceId?.trim()) {
    throw new Error("deviceId 不能为空");
  }

  // 已在播同一设备：直接复用（进页预热场景）。
  if (
    active &&
    active.deviceId === params.deviceId &&
    active.width > 0 &&
    active.height > 0
  ) {
    console.info(`[harmony-scrcpy] 复用已有会话 deviceId=${params.deviceId}`);
    return {
      wsUrl: `ws://127.0.0.1:${active.port}`,
      port: active.port,
      width: active.width,
      height: active.height,
      scale: active.scale,
    };
  }

  if (startInFlight && startInFlight.deviceId === params.deviceId) {
    console.info(`[harmony-scrcpy] 等待进行中的启动 deviceId=${params.deviceId}`);
    return await startInFlight.promise;
  }

  const promise = startHarmonyScrcpyInternal(params);
  startInFlight = { deviceId: params.deviceId, promise };
  try {
    return await promise;
  } finally {
    if (startInFlight?.promise === promise) {
      startInFlight = null;
    }
  }
}

async function startHarmonyScrcpyInternal(
  params: HarmonyScrcpyStartParams,
): Promise<HarmonyScrcpyStartResult> {
  await stopHarmonyScrcpy();

  const jars = resolveHoscrcpyJarPaths();
  if (!jars) {
    throw new Error(
      "未找到 hoscrcpy 资源（缺少 SDK jar 或 wrapper jar）。请将华为 hoscrcpy jar 放入 resources/device-automation/hoscrcpy/ 并运行 npm run electron:build:host:dev。",
    );
  }

  const hdcPath = resolveHdcPath(process.env);
  const javaCommand = resolveJavaCommand();
  const classpath = [jars.sdkJar, jars.wrapperJar].join(path.delimiter);
  const args = [
    "-cp",
    classpath,
    WRAPPER_MAIN_CLASS,
    "--sn",
    params.deviceId,
    "--hdc",
    hdcPath,
  ];
  if (params.scale && params.scale > 1) {
    args.push("--scale", String(params.scale));
  }
  if (params.bitRate && params.bitRate > 0) {
    args.push("--bitrate", String(params.bitRate));
  }
  if (params.frameRate && params.frameRate > 0) {
    args.push("--framerate", String(params.frameRate));
  }

  const child = spawn(javaCommand, args, { stdio: ["pipe", "pipe", "pipe"] });

  const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise<void>((resolve, reject) => {
    wss.once("listening", () => resolve());
    wss.once("error", (error: Error) => reject(error));
  });
  const port = (wss.address() as AddressInfo).port;

  const session: ActiveHarmonyScrcpy = {
    deviceId: params.deviceId,
    child,
    wss,
    port,
    client: null,
    stdoutBuffer: Buffer.alloc(0),
    stderrBuffer: "",
    width: 0,
    height: 0,
    scale: params.scale && params.scale > 1 ? params.scale : 1,
    cachedSps: null,
    cachedPps: null,
    cachedIdr: null,
  };
  active = session;

  wss.on("connection", (socket: HarmonyScrcpySocket) => {
    // 仅保留最新连接。
    session.client?.close();
    session.client = socket;
    console.info("[harmony-scrcpy] renderer 已连接投屏 WebSocket");
    // 对齐 lmdeviceagent：先发缓存 SPS/PPS/IDR，再请求新 IDR。
    sendCachedKeyFrames(session, socket);
    try {
      child.stdin.write("idr\n");
    } catch {
      // ignore
    }
    socket.on(
      "message",
      (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        if (isBinary) {
          return;
        }
        const line = Buffer.isBuffer(data)
          ? data.toString("utf8")
          : typeof data === "string"
            ? data
            : Array.isArray(data)
              ? Buffer.concat(data).toString("utf8")
              : Buffer.from(new Uint8Array(data)).toString("utf8");
        const trimmed = line.trim();
        if (trimmed) {
          try {
            child.stdin.write(`${trimmed}\n`);
          } catch {
            // ignore：子进程可能已退出
          }
        }
      },
    );
    socket.on("close", () => {
      if (session.client === socket) {
        session.client = null;
      }
    });
  });

  let forwardedFrames = 0;
  child.stdout.on("data", (chunk: Buffer) => {
    session.stdoutBuffer = Buffer.concat([session.stdoutBuffer, chunk]);
    drainFrames(session, (frame) => {
      // 复制后再发，避免 Buffer.subarray 视图在部分 ws 版本上误发整段底层内存。
      const payload = Buffer.from(frame);
      cacheKeyFramesFromAnnexB(session, payload);
      forwardedFrames += 1;
      if (forwardedFrames <= 5 || forwardedFrames % 60 === 0) {
        const head = payload.subarray(0, Math.min(8, payload.length)).toString("hex");
        console.info(
          `[harmony-scrcpy] 转发帧#${forwardedFrames} len=${payload.length} head=${head} client=${
            session.client?.readyState === session.client?.OPEN ? "open" : "none"
          }`,
        );
      }
      const client = session.client;
      if (client && client.readyState === client.OPEN) {
        client.send(payload);
      }
    });
  });

  return await new Promise<HarmonyScrcpyStartResult>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        void stopHarmonyScrcpy();
        reject(new Error("鸿蒙投屏启动超时（未收到设备分辨率）"));
      }
    }, META_TIMEOUT_MS);

    const finalizeError = (message: string) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        void stopHarmonyScrcpy();
        reject(new Error(message));
      }
    };

    child.stderr.on("data", (chunk: Buffer) => {
      session.stderrBuffer += chunk.toString("utf8");
      const lines = session.stderrBuffer.split(/\r?\n/);
      session.stderrBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        if (trimmed.startsWith("@@META@@")) {
          const json = trimmed.slice("@@META@@".length).trim();
          try {
            const meta = JSON.parse(json) as {
              width: number;
              height: number;
              scale?: number;
            };
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              const scale = meta.scale ?? params.scale ?? 1;
              session.width = meta.width;
              session.height = meta.height;
              session.scale = scale;
              resolve({
                wsUrl: `ws://127.0.0.1:${port}`,
                port,
                width: meta.width,
                height: meta.height,
                scale,
              });
            }
          } catch (error) {
            console.warn("[harmony-scrcpy] 解析 META 失败", error);
          }
        } else if (trimmed.startsWith("@@READY@@")) {
          console.info("[harmony-scrcpy] wrapper READY，请求 IDR");
          try {
            child.stdin.write("idr\n");
          } catch {
            // ignore
          }
        } else if (trimmed.startsWith("@@ERROR@@")) {
          const message = trimmed.slice("@@ERROR@@".length).trim();
          console.error("[harmony-scrcpy] wrapper 错误:", message);
          finalizeError(message || "鸿蒙投屏启动失败");
        } else {
          console.info("[harmony-scrcpy]", trimmed);
        }
      }
    });

    child.on("error", (error) => {
      finalizeError(`无法启动 Java（hoscrcpy wrapper）：${error.message}`);
    });
    child.on("exit", (code, signal) => {
      console.info(
        `[harmony-scrcpy] wrapper 退出 code=${code ?? "null"} signal=${signal ?? "null"}`,
      );
      if (active === session) {
        session.client?.close();
        session.wss.close();
        active = null;
      }
      finalizeError("鸿蒙投屏进程已退出");
    });
  });
}

export async function stopHarmonyScrcpy(): Promise<{ stopped: boolean }> {
  const session = active;
  if (!session) {
    return { stopped: false };
  }
  active = null;
  try {
    session.child.stdin.write("stop\n");
  } catch {
    // ignore
  }
  try {
    session.client?.close();
  } catch {
    // ignore
  }
  try {
    session.wss.close();
  } catch {
    // ignore
  }
  try {
    session.child.kill();
  } catch {
    // ignore
  }
  return { stopped: true };
}

export function getHarmonyScrcpyStatus(): HarmonyScrcpyStatusResult {
  if (!active) {
    return { active: false };
  }
  return { active: true, deviceId: active.deviceId, port: active.port };
}

export function resetHarmonyScrcpyForTests(): void {
  if (active) {
    try {
      active.wss.close();
    } catch {
      // ignore
    }
    try {
      active.child.kill();
    } catch {
      // ignore
    }
    active = null;
  }
}
