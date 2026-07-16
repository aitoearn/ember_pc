import { existsSync, readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import path from "node:path";
import { requestJson } from "./http";
import type { AgentDeviceCliRecord } from "./agentDeviceCli";
import {
  clearAgentDeviceSessionEnsured,
  clearAllAgentDeviceSessionEnsured,
  isAgentDeviceSessionEnsured,
  markAgentDeviceSessionEnsured,
} from "./agentDeviceSession";
import {
  isAgentDeviceSessionAlreadyActiveFailure,
  isAgentDeviceSessionAlreadyActiveMessage,
  isAgentDeviceSessionBoundToOtherDeviceFailure,
  isAgentDeviceSessionBoundToOtherDeviceMessage,
} from "./agentDeviceSessionErrors";

const DEFAULT_SESSION_NAME = "ember-device-automation";

type AgentDeviceDaemonInfo = {
  httpPort?: number;
  token?: string;
  transport?: "socket" | "http" | "dual";
};

type AgentDeviceDaemonResponse =
  | {
      ok: true;
      data?: Record<string, unknown>;
    }
  | {
      ok: false;
      error?: {
        message?: string;
        code?: string;
      };
    };

type JsonRpcResponse = {
  result?: AgentDeviceDaemonResponse;
  error?: {
    message?: string;
    data?: {
      code?: string;
    };
  };
};

type DeviceSelector = {
  platform: string;
  deviceId: string;
};

type SendDaemonCommandOptions = {
  /** screenshot / press 等 generic 命令需要先 open 建立 session。 */
  deviceSelector?: DeviceSelector;
  /** 批量 RPC 内后续命令跳过重复 open。 */
  skipSessionEnsure?: boolean;
  /** 批量 RPC 内后续命令跳过重复 health 探测。 */
  skipHealthCheck?: boolean;
};

const DAEMON_HEALTH_CACHE_MS = 3_000;
let lastDaemonHealthCheckAt = 0;
let lastDaemonHealthOk = false;

export async function listAgentDevicesViaDaemon(
  stateDir: string,
): Promise<AgentDeviceCliRecord[] | null> {
  const response = await sendAgentDeviceDaemonCommand(stateDir, {
    command: "devices",
    positionals: [],
  });
  if (!response) {
    return null;
  }
  if (response.ok === false) {
    throw new Error(response.error?.message ?? "agent-device daemon 命令执行失败");
  }
  const devices = response.data?.devices;
  return Array.isArray(devices) ? (devices as AgentDeviceCliRecord[]) : [];
}

export async function captureAgentDeviceScreenshotViaDaemon(
  stateDir: string,
  params: {
    platform: string;
    deviceId: string;
    outputPath: string;
  },
): Promise<string | null> {
  const response = await sendAgentDeviceDaemonCommand(
    stateDir,
    {
      command: "screenshot",
      positionals: [params.outputPath],
      flags: buildDeviceSelectorFlags(params),
    },
    { deviceSelector: params },
  );
  if (!response) {
    return null;
  }
  assertDaemonResponseOk(response);
  return typeof response.data?.path === "string" ? response.data.path : params.outputPath;
}

export async function sendAgentDeviceNavigationViaDaemon(
  stateDir: string,
  params: {
    action: "back" | "home";
    platform: string;
    deviceId: string;
  },
): Promise<boolean> {
  return await sendBooleanAgentDeviceDaemonCommand(
    stateDir,
    {
      command: params.action,
      positionals: [],
      flags: buildDeviceSelectorFlags(params),
    },
    params,
  );
}

export async function sendAgentDevicePressViaDaemon(
  stateDir: string,
  params: {
    platform: string;
    deviceId: string;
    x: number;
    y: number;
  },
): Promise<boolean> {
  return await sendBooleanAgentDeviceDaemonCommand(stateDir, {
    command: "press",
    positionals: [String(params.x), String(params.y)],
    flags: buildDeviceSelectorFlags(params),
  }, params);
}

export async function sendAgentDeviceSwipeViaDaemon(
  stateDir: string,
  params: {
    platform: string;
    deviceId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  },
): Promise<boolean> {
  return await sendBooleanAgentDeviceDaemonCommand(stateDir, {
    command: "swipe",
    positionals: [
      String(params.x1),
      String(params.y1),
      String(params.x2),
      String(params.y2),
    ],
    flags: buildDeviceSelectorFlags(params),
  }, params);
}

export async function reverseAgentDeviceScrcpyTcpViaDaemon(
  stateDir: string,
  params: {
    deviceId: string;
    remote: string;
    localPort: number;
  },
): Promise<Record<string, unknown> | null> {
  const deviceSelector = { platform: "android", deviceId: params.deviceId };
  const response = await sendAgentDeviceDaemonCommand(
    stateDir,
    {
      command: "scrcpy_reverse_tcp",
      positionals: [],
      flags: {
        platform: "android",
        serial: params.deviceId,
        remote: params.remote,
        localPort: params.localPort,
      },
    },
    { deviceSelector },
  );
  if (!response) {
    return null;
  }
  assertDaemonResponseOk(response);
  return response.data ?? {};
}

export async function startAgentDeviceScrcpyViaDaemon(
  stateDir: string,
  params: {
    deviceId: string;
    scid: string;
    scrcpyServerPath: string;
    maxSize?: number;
    videoBitRate?: number;
    audio?: boolean;
  },
): Promise<Record<string, unknown> | null> {
  const deviceSelector = { platform: "android", deviceId: params.deviceId };
  const response = await sendAgentDeviceDaemonCommand(
    stateDir,
    {
      command: "scrcpy_start",
      positionals: [],
      flags: {
        platform: "android",
        serial: params.deviceId,
        scid: params.scid,
        scrcpyServerPath: params.scrcpyServerPath,
        ...(params.maxSize !== undefined ? { maxSize: params.maxSize } : {}),
        ...(params.videoBitRate !== undefined
          ? { videoBitRate: params.videoBitRate }
          : {}),
        ...(params.audio !== undefined ? { audio: params.audio } : {}),
      },
    },
    { deviceSelector },
  );
  if (!response) {
    return null;
  }
  assertDaemonResponseOk(response);
  return response.data ?? {};
}

export async function connectAgentDeviceScrcpyViaDaemon(
  stateDir: string,
  params: {
    deviceId: string;
    remote: string;
    localPort: number;
    scid: string;
    scrcpyServerPath: string;
    maxSize?: number;
    videoBitRate?: number;
    audio?: boolean;
  },
): Promise<{
  reverse: Record<string, unknown>;
  start: Record<string, unknown>;
} | null> {
  const deviceSelector = { platform: "android", deviceId: params.deviceId };
  const batchOptions: SendDaemonCommandOptions = {
    deviceSelector,
    skipSessionEnsure: true,
    skipHealthCheck: true,
  };

  async function runConnectBatch(): Promise<{
    reverse: Record<string, unknown>;
    start: Record<string, unknown>;
  } | null> {
    const reverseResponse = await sendAgentDeviceDaemonCommand(
      stateDir,
      {
        command: "scrcpy_reverse_tcp",
        positionals: [],
        flags: {
          platform: "android",
          serial: params.deviceId,
          remote: params.remote,
          localPort: params.localPort,
        },
      },
      batchOptions,
    );
    if (!reverseResponse) {
      return null;
    }
    assertDaemonResponseOk(reverseResponse);

    const startResponse = await sendAgentDeviceDaemonCommand(
      stateDir,
      {
        command: "scrcpy_start",
        positionals: [],
        flags: {
          platform: "android",
          serial: params.deviceId,
          scid: params.scid,
          scrcpyServerPath: params.scrcpyServerPath,
          ...(params.maxSize !== undefined ? { maxSize: params.maxSize } : {}),
          ...(params.videoBitRate !== undefined
            ? { videoBitRate: params.videoBitRate }
            : {}),
          ...(params.audio !== undefined ? { audio: params.audio } : {}),
        },
      },
      batchOptions,
    );
    if (!startResponse) {
      return null;
    }
    assertDaemonResponseOk(startResponse);
    return {
      reverse: reverseResponse.data ?? {},
      start: startResponse.data ?? {},
    };
  }

  const ensured = await ensureAgentDeviceSessionViaDaemon(stateDir, deviceSelector);
  if (!ensured) {
    return null;
  }
  const info = readDaemonInfo(stateDir);
  if (!info?.httpPort || !info.token) {
    return null;
  }
  if (!(await isDaemonHealthy(info.httpPort))) {
    return null;
  }

  try {
    return await runConnectBatch();
  } catch (error) {
    if (!isSessionNotFoundFailure(error)) {
      console.warn("[device-automation] scrcpy connect 批量 RPC 失败", error);
      return null;
    }
    clearAgentDeviceSessionEnsured(deviceSelector.platform, deviceSelector.deviceId);
    const reopened = await ensureAgentDeviceSessionViaDaemon(stateDir, deviceSelector);
    if (!reopened) {
      return null;
    }
    try {
      return await runConnectBatch();
    } catch (retryError) {
      console.warn("[device-automation] scrcpy connect 重试仍失败", retryError);
      return null;
    }
  }
}

/** 进入设备页时预热 agent-device 会话，避免首次 scrcpy 再 open。 */
export async function warmAgentDeviceSessionViaDaemon(
  stateDir: string,
  selector: DeviceSelector,
): Promise<boolean> {
  return ensureAgentDeviceSessionViaDaemon(stateDir, selector);
}

async function sendBooleanAgentDeviceDaemonCommand(
  stateDir: string,
  params: {
    command: string;
    positionals: string[];
    flags?: Record<string, unknown>;
  },
  deviceSelector?: DeviceSelector,
): Promise<boolean> {
  const response = await sendAgentDeviceDaemonCommand(stateDir, params, {
    deviceSelector,
  });
  if (!response) {
    return false;
  }
  assertDaemonResponseOk(response);
  return true;
}

type OpenSessionResult = "ok" | "bound-to-other-device" | "failed";

async function ensureAgentDeviceSessionViaDaemon(
  stateDir: string,
  selector: DeviceSelector,
): Promise<boolean> {
  if (isAgentDeviceSessionEnsured(selector.platform, selector.deviceId)) {
    return true;
  }
  const result = await openAgentDeviceSessionOnce(stateDir, selector);
  if (result === "ok") {
    markAgentDeviceSessionEnsured(selector.platform, selector.deviceId);
    return true;
  }
  if (result === "bound-to-other-device") {
    // 会话被锁在另一台设备（通常是已断开的旧设备）：关闭后用当前设备重新 open，支持切换设备。
    console.warn(
      "[device-automation] agent-device 会话绑定到其他设备，关闭旧会话后切换到",
      selector.deviceId,
    );
    await closeAgentDeviceSessionViaDaemon(stateDir);
    clearAllAgentDeviceSessionEnsured();
    const reopened = await openAgentDeviceSessionOnce(stateDir, selector);
    if (reopened === "ok") {
      markAgentDeviceSessionEnsured(selector.platform, selector.deviceId);
      return true;
    }
  }
  return false;
}

async function openAgentDeviceSessionOnce(
  stateDir: string,
  selector: DeviceSelector,
): Promise<OpenSessionResult> {
  try {
    const response = await invokeAgentDeviceDaemonCommand(stateDir, {
      command: "open",
      positionals: [],
      flags: buildDeviceSelectorFlags(selector),
    });
    if (!response || response.ok === false) {
      const message = response?.ok === false ? response.error?.message : undefined;
      if (isAgentDeviceSessionAlreadyActiveMessage(message)) {
        return "ok";
      }
      if (isAgentDeviceSessionBoundToOtherDeviceMessage(message)) {
        return "bound-to-other-device";
      }
      console.warn(
        "[device-automation] agent-device open 会话失败",
        message ?? "未知错误",
      );
      return "failed";
    }
    return "ok";
  } catch (error) {
    if (isAgentDeviceSessionAlreadyActiveFailure(error)) {
      return "ok";
    }
    if (isAgentDeviceSessionBoundToOtherDeviceFailure(error)) {
      return "bound-to-other-device";
    }
    console.warn("[device-automation] agent-device open 会话失败", error);
    return "failed";
  }
}

async function closeAgentDeviceSessionViaDaemon(stateDir: string): Promise<void> {
  try {
    await invokeAgentDeviceDaemonCommand(stateDir, {
      command: "close",
      positionals: [],
    });
  } catch (error) {
    console.warn("[device-automation] 关闭旧 agent-device 会话失败", error);
  }
}

async function sendAgentDeviceDaemonCommand(
  stateDir: string,
  params: {
    command: string;
    positionals: string[];
    flags?: Record<string, unknown>;
  },
  options?: SendDaemonCommandOptions,
): Promise<AgentDeviceDaemonResponse | null> {
  const info = readDaemonInfo(stateDir);
  if (!info?.httpPort || !info.token) {
    return null;
  }

  if (options?.deviceSelector && !options.skipSessionEnsure) {
    const ensured = await ensureAgentDeviceSessionViaDaemon(
      stateDir,
      options.deviceSelector,
    );
    if (!ensured) {
      return null;
    }
  }

  try {
    if (!options?.skipHealthCheck) {
      const healthy = await isDaemonHealthy(info.httpPort);
      if (!healthy) {
        return null;
      }
    }
    return await invokeAgentDeviceDaemonCommand(stateDir, params, info);
  } catch (error) {
    if (options?.deviceSelector && isSessionNotFoundFailure(error)) {
      clearAgentDeviceSessionEnsured(
        options.deviceSelector.platform,
        options.deviceSelector.deviceId,
      );
      const reopened = await ensureAgentDeviceSessionViaDaemon(
        stateDir,
        options.deviceSelector,
      );
      if (reopened) {
        try {
          return await invokeAgentDeviceDaemonCommand(stateDir, params, info);
        } catch (retryError) {
          console.warn(
            "[device-automation] agent-device daemon 重试仍失败，将回退 CLI",
            retryError,
          );
          return null;
        }
      }
    }
    console.warn("[device-automation] agent-device daemon 调用失败，将回退 CLI", error);
    return null;
  }
}

async function invokeAgentDeviceDaemonCommand(
  stateDir: string,
  params: {
    command: string;
    positionals: string[];
    flags?: Record<string, unknown>;
  },
  info?: AgentDeviceDaemonInfo | null,
): Promise<AgentDeviceDaemonResponse | null> {
  const daemonInfo = info ?? readDaemonInfo(stateDir);
  if (!daemonInfo?.httpPort || !daemonInfo.token) {
    return null;
  }

  const rpc = (await requestJson(`http://127.0.0.1:${daemonInfo.httpPort}/rpc`, {
    method: "POST",
    headers: {
      "x-agent-device-token": daemonInfo.token,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `ember-${Date.now()}`,
      method: "agent_device.command",
      params: {
        token: daemonInfo.token,
        session: DEFAULT_SESSION_NAME,
        command: params.command,
        positionals: params.positionals,
        flags: {
          ...params.flags,
          stateDir,
          daemonTransport: "http",
        },
      },
    }),
  })) as JsonRpcResponse;

  if (rpc.error) {
    if (rpc.error.data?.code === "SESSION_NOT_FOUND") {
      throw new Error(rpc.error.message ?? "No active session. Run open first.");
    }
    throw new Error(rpc.error.message ?? "agent-device daemon RPC 调用失败");
  }

  const result = rpc.result ?? null;
  if (result?.ok === false && result.error?.code === "SESSION_NOT_FOUND") {
    throw new Error(result.error.message ?? "No active session. Run open first.");
  }
  return result;
}

function isSessionNotFoundFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes("SESSION_NOT_FOUND") ||
    error.message.includes("No active session")
  );
}

function assertDaemonResponseOk(response: AgentDeviceDaemonResponse): asserts response is {
  ok: true;
  data?: Record<string, unknown>;
} {
  if (response.ok === false) {
    throw new Error(response.error?.message ?? "agent-device daemon 命令执行失败");
  }
}

function buildDeviceSelectorFlags(params: {
  platform: string;
  deviceId: string;
}): Record<string, unknown> {
  const platform = params.platform.trim().toLowerCase();
  const flags: Record<string, unknown> = { platform };
  if (platform === "android") {
    flags.serial = params.deviceId;
  } else if (platform === "ios") {
    flags.udid = params.deviceId;
  } else {
    flags.device = params.deviceId;
  }
  return flags;
}

function readDaemonInfo(stateDir: string): AgentDeviceDaemonInfo | null {
  const infoPath = path.join(stateDir, "daemon.json");
  if (!existsSync(infoPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(infoPath, "utf8")) as AgentDeviceDaemonInfo;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 测试专用：重置 daemon health 缓存，避免用例间互相污染。 */
export function resetAgentDeviceDaemonHealthCacheForTests(): void {
  lastDaemonHealthCheckAt = 0;
  lastDaemonHealthOk = false;
}

async function isDaemonHealthy(httpPort: number, force = false): Promise<boolean> {
  const now = Date.now();
  if (
    !force &&
    now - lastDaemonHealthCheckAt < DAEMON_HEALTH_CACHE_MS &&
    lastDaemonHealthOk
  ) {
    return true;
  }
  lastDaemonHealthOk = await requestOk(`http://127.0.0.1:${httpPort}/health`);
  lastDaemonHealthCheckAt = now;
  return lastDaemonHealthOk;
}

async function requestOk(url: string): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const parsed = new URL(url);
    const request = httpRequest(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve((response.statusCode ?? 500) < 400);
        });
      },
    );
    request.on("error", () => resolve(false));
    request.end();
  });
}
