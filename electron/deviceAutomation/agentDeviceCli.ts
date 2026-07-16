import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { app } from "../electronRuntime";
import {
  isAgentDeviceSessionEnsured,
  markAgentDeviceSessionEnsured,
} from "./agentDeviceSession";
import {
  isAgentDeviceSessionAlreadyActiveFailure,
  isAgentDeviceSessionAlreadyActiveMessage,
} from "./agentDeviceSessionErrors";
import { resolveNodeSpawn } from "./resolveNodeSpawn";
import { resolveToolRoot } from "./resolveToolRoot";

const DEFAULT_SESSION_NAME = "ember-device-automation";
const CLI_TIMEOUT_MS = 120_000;

export type AgentDeviceCliRecord = {
  platform: string;
  id: string;
  name: string;
  kind: string;
  target?: string;
  booted?: boolean;
  brand?: string;
  manufacturer?: string;
  model?: string;
  resolution?: string;
  platformVersion?: string;
};

type AgentDeviceCliEnvelope = {
  success?: boolean;
  data?: Record<string, unknown>;
  error?: {
    message?: string;
    code?: string;
  };
};

function resolveAgentDeviceRoot(): string | null {
  return resolveToolRoot({
    envVar: "DEVICE_AUTOMATION_AGENT_DEVICE_ROOT",
    siblingDirName: "agent-device",
    packagedSubdir: path.join("device-automation", "agent-device"),
  });
}

function resolveStateDir(): string {
  const configured = process.env.DEVICE_AUTOMATION_AGENT_DEVICE_STATE_DIR?.trim();
  if (configured) {
    mkdirSync(configured, { recursive: true });
    return configured;
  }
  const stateDir = path.join(
    app.getPath("userData"),
    "device-automation",
    "agent-device-state",
  );
  mkdirSync(stateDir, { recursive: true });
  return stateDir;
}

function resolveDistEntry(rootPath: string): string | null {
  const candidates = [
    path.join(rootPath, "dist", "src", "internal", "bin.js"),
    path.join(rootPath, "dist", "src", "bin.js"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveCliInvocation(rootPath: string): {
  command: string;
  baseArgs: string[];
  cwd: string;
  spawnEnv: NodeJS.ProcessEnv;
} {
  const distEntry = resolveDistEntry(rootPath);
  const wrapperEntry = path.join(rootPath, "bin", "agent-device.mjs");
  if (distEntry && existsSync(wrapperEntry)) {
    const nodeSpawn = resolveNodeSpawn();
    return {
      command: nodeSpawn.command,
      baseArgs: [wrapperEntry],
      cwd: rootPath,
      spawnEnv: nodeSpawn.env,
    };
  }

  if (distEntry) {
    const nodeSpawn = resolveNodeSpawn();
    return {
      command: nodeSpawn.command,
      baseArgs: [distEntry],
      cwd: rootPath,
      spawnEnv: nodeSpawn.env,
    };
  }

  const sourceEntry = path.join(rootPath, "src", "bin.ts");
  if (existsSync(sourceEntry)) {
    const nodeSpawn = resolveNodeSpawn({ requireRealNode: true });
    return {
      command: nodeSpawn.command,
      baseArgs: ["--experimental-strip-types", sourceEntry],
      cwd: rootPath,
      spawnEnv: nodeSpawn.env,
    };
  }

  throw new Error(
    "未找到 agent-device 可执行入口。请先在 agent-device 工程执行 pnpm build。",
  );
}

function runAgentDeviceCli(args: string[]): AgentDeviceCliEnvelope {
  const rootPath = resolveAgentDeviceRoot();
  if (!rootPath) {
    throw new Error(
      "未找到 agent-device 目录。请设置环境变量 DEVICE_AUTOMATION_AGENT_DEVICE_ROOT。",
    );
  }

  const invocation = resolveCliInvocation(rootPath);
  const stateDir = resolveStateDir();
  const result = spawnSync(
    invocation.command,
    [
      ...invocation.baseArgs,
      ...args,
      "--json",
      "--state-dir",
      stateDir,
      "--session",
      DEFAULT_SESSION_NAME,
    ],
    {
      cwd: invocation.cwd,
      env: {
        ...invocation.spawnEnv,
        AGENT_DEVICE_DAEMON_SERVER_MODE: "http",
      },
      encoding: "utf8",
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  const stdout = result.stdout?.trim() ?? "";
  const stderr = result.stderr?.trim() ?? "";
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      stderr ||
        stdout ||
        `agent-device 命令失败（exit ${result.status ?? "unknown"}）`,
    );
  }
  if (!stdout) {
    throw new Error(stderr || "agent-device 未返回 JSON 输出");
  }

  try {
    return JSON.parse(stdout) as AgentDeviceCliEnvelope;
  } catch {
    throw new Error(`agent-device 输出无法解析为 JSON：${stdout}`);
  }
}

function unwrapCliData<T>(envelope: AgentDeviceCliEnvelope): T {
  if (envelope.success === false) {
    const message =
      envelope.error?.message ?? "agent-device 命令执行失败";
    if (isAgentDeviceSessionAlreadyActiveMessage(message)) {
      return {} as T;
    }
    throw new Error(message);
  }
  return (envelope.data ?? {}) as T;
}

export function getAgentDeviceRootPath(): string | null {
  return resolveAgentDeviceRoot();
}

export function listAgentDevices(): AgentDeviceCliRecord[] {
  const envelope = runAgentDeviceCli(["devices"]);
  const data = unwrapCliData<{ devices?: AgentDeviceCliRecord[] }>(envelope);
  return Array.isArray(data.devices) ? data.devices : [];
}

function appendDeviceSelectorArgs(
  args: string[],
  platform: string,
  deviceId: string,
): void {
  if (platform === "android") {
    args.push("--serial", deviceId);
  } else if (platform === "ios") {
    args.push("--udid", deviceId);
  } else {
    args.push("--device", deviceId);
  }
}

/** 通过 open 绑定设备到 ember-device-automation session（无 app 参数，仅 attach 设备）。 */
export function openAgentDeviceSession(params: {
  platform: string;
  deviceId: string;
}): void {
  const args = ["open", "--platform", params.platform];
  appendDeviceSelectorArgs(args, params.platform, params.deviceId);
  try {
    const envelope = runAgentDeviceCli(args);
    unwrapCliData(envelope);
  } catch (error) {
    if (!isAgentDeviceSessionAlreadyActiveFailure(error)) {
      throw error;
    }
  }
  markAgentDeviceSessionEnsured(params.platform, params.deviceId);
}

export function ensureAgentDeviceSession(params: {
  platform: string;
  deviceId: string;
}): void {
  if (isAgentDeviceSessionEnsured(params.platform, params.deviceId)) {
    return;
  }
  openAgentDeviceSession(params);
}

export function captureAgentDeviceScreenshot(params: {
  platform: string;
  deviceId: string;
  outputPath: string;
}): string {
  ensureAgentDeviceSession(params);
  const args = [
    "screenshot",
    params.outputPath,
    "--platform",
    params.platform,
  ];
  appendDeviceSelectorArgs(args, params.platform, params.deviceId);

  const envelope = runAgentDeviceCli(args);
  const data = unwrapCliData<{ path?: string }>(envelope);
  const screenshotPath = data.path ?? params.outputPath;
  if (!existsSync(screenshotPath)) {
    throw new Error("截图文件未生成");
  }
  return screenshotPath;
}

export function readScreenshotBase64(filePath: string): {
  base64: string;
  mediaType: string;
} {
  const buffer = readFileSync(filePath);
  return {
    base64: buffer.toString("base64"),
    mediaType: "image/png",
  };
}

export function sendAgentDeviceNavigation(params: {
  action: "back" | "home";
  platform: string;
  deviceId: string;
}): void {
  ensureAgentDeviceSession(params);
  const args = [params.action, "--platform", params.platform];
  appendDeviceSelectorArgs(args, params.platform, params.deviceId);
  runAgentDeviceCli(args);
}

export function sendAgentDevicePress(params: {
  platform: string;
  deviceId: string;
  x: number;
  y: number;
}): void {
  ensureAgentDeviceSession(params);
  const args = [
    "press",
    String(params.x),
    String(params.y),
    "--platform",
    params.platform,
  ];
  appendDeviceSelectorArgs(args, params.platform, params.deviceId);
  runAgentDeviceCli(args);
}

export function sendAgentDeviceSwipe(params: {
  platform: string;
  deviceId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): void {
  ensureAgentDeviceSession(params);
  const args = [
    "swipe",
    String(params.x1),
    String(params.y1),
    String(params.x2),
    String(params.y2),
    "--platform",
    params.platform,
  ];
  appendDeviceSelectorArgs(args, params.platform, params.deviceId);
  runAgentDeviceCli(args);
}

/** 仅校验 agent-device 安装与 CLI 入口，不启动子进程（避免每次 ensure 多花 ~2–3s）。 */
export function probeAgentDeviceInstallation(): {
  rootPath: string;
  stateDir: string;
} {
  const rootPath = resolveAgentDeviceRoot();
  if (!rootPath) {
    throw new Error(
      "未找到 agent-device 目录。请设置环境变量 DEVICE_AUTOMATION_AGENT_DEVICE_ROOT。",
    );
  }
  resolveCliInvocation(rootPath);
  const stateDir = resolveStateDir();
  return { rootPath, stateDir };
}

export function ensureAgentDeviceReady(): {
  rootPath: string;
  stateDir: string;
} {
  return probeAgentDeviceInstallation();
}
