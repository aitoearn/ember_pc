import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DeviceAutomationPerfTraceProgressPayload } from "../../src/features/device-automation/performance/events";
import type {
  PerfTraceAnalysisType,
  PerfTracePresetId,
} from "../../src/features/device-automation/performance/types";
import { resolveAdbPath } from "./deviceInventoryWatcher";
import { loadPerfTracePresetConfig } from "./perfTrace/presets";
import { execAdbSync } from "./scrcpyAdbFastPath";
import { analyzePerfTraceWithProcessor } from "./traceAnalysis";
import type { AdbExecSync } from "./performanceMonitor/androidCollectors";

export type PerfTraceProgressEmitter = (
  payload: DeviceAutomationPerfTraceProgressPayload,
) => void;

export type PerfTraceStartParams = {
  deviceId: string;
  packageName: string;
  presetId: PerfTracePresetId;
  localTracesDir: string;
  configOverride?: string;
  linkedSessionId?: string;
};

export type PerfTraceStartResult = {
  captureId: string;
  startedAt: string;
};

export type PerfTraceStopResult = {
  localPath: string;
  sizeBytes: number;
  durationMs: number;
  remotePath?: string;
};

export type PerfTraceStatusResult = {
  activeCaptureId?: string;
  deviceId?: string;
  presetId?: string;
  phase?: DeviceAutomationPerfTraceProgressPayload["phase"];
};

export type PerfTraceAnalyzeParams = {
  localPath: string;
  analysisType: PerfTraceAnalysisType;
  packageName: string;
  timeRange?: { startNs: number; endNs: number };
};

type ActiveCapture = {
  captureId: string;
  deviceId: string;
  packageName: string;
  presetId: PerfTracePresetId;
  localTracesDir: string;
  remoteTracePath: string;
  hostLogPath: string;
  perfettoPid: string;
  startedAtMs: number;
  startedAt: string;
  linkedSessionId?: string;
};

const REMOTE_PERFETTO_TRACE_DIR = "/data/misc/perfetto-traces";
const REMOTE_TRACE_WAIT_MS = 12000;
const REMOTE_TRACE_POLL_MS = 500;
const PERFETTO_PID_WAIT_MS = 12000;

let progressEmitter: PerfTraceProgressEmitter | null = null;
let activeCapture: ActiveCapture | null = null;
let adbExec: AdbExecSync = execAdbSync;
let perfettoBackgroundPidForTests: string | null = null;

export function setPerfTraceProgressEmitter(
  emitter: PerfTraceProgressEmitter | null,
): void {
  progressEmitter = emitter;
}

export function setPerfTraceAdbExecForTests(exec: AdbExecSync | null): void {
  adbExec = exec ?? execAdbSync;
}

export function setPerfettoBackgroundPidForTests(pid: string | null): void {
  perfettoBackgroundPidForTests = pid;
}

export function resetPerfTraceCaptureForTests(): void {
  progressEmitter = null;
  activeCapture = null;
  adbExec = execAdbSync;
  perfettoBackgroundPidForTests = null;
}

function emitProgress(payload: DeviceAutomationPerfTraceProgressPayload): void {
  progressEmitter?.(payload);
}

function adb(deviceId: string, adbArgs: string[]) {
  return adbExec(deviceId, adbArgs);
}

function remoteTracePathForCapture(captureId: string): string {
  return `${REMOTE_PERFETTO_TRACE_DIR}/ember_${captureId}.perfetto-trace`;
}

function hostLogPathForCapture(localTracesDir: string, captureId: string): string {
  return path.join(localTracesDir, `${captureId}.perfetto-host.log`);
}

function ensureNoActiveCapture(): void {
  if (activeCapture) {
    throw new Error("当前设备已有进行中的 Trace 录制，请先停止");
  }
}

function ensurePerfettoAvailable(deviceId: string): void {
  const which = adb(deviceId, ["shell", "which", "perfetto"]);
  if (which.exitCode !== 0 || !which.stdout.trim()) {
    throw new Error("设备上未找到 perfetto 命令，当前 ROM 可能未开放 trace 能力");
  }
}

function remoteFileSize(deviceId: string, remotePath: string): number | null {
  const result = adb(deviceId, ["shell", "stat", "-c", "%s", remotePath]);
  if (result.exitCode !== 0) {
    return null;
  }
  const size = Number.parseInt(result.stdout.trim(), 10);
  return Number.isFinite(size) ? size : null;
}

function waitForRemoteTraceFile(
  deviceId: string,
  remotePath: string,
  maxWaitMs = REMOTE_TRACE_WAIT_MS,
): number {
  let waited = 0;
  while (waited < maxWaitMs) {
    const size = remoteFileSize(deviceId, remotePath);
    if (size !== null && size > 0) {
      return size;
    }
    const sleepSec = String(REMOTE_TRACE_POLL_MS / 1000);
    adb(deviceId, ["shell", "sleep", sleepSec]);
    waited += REMOTE_TRACE_POLL_MS;
  }
  return 0;
}

function readHostLogTail(hostLogPath: string): string {
  try {
    const content = readFileSync(hostLogPath, "utf8");
    const lines = content.trim().split(/\r?\n/);
    return lines.slice(-30).join("\n").trim();
  } catch {
    return "";
  }
}

function parsePerfettoBackgroundPid(output: string): string | null {
  const match = output.trim().match(/^(\d+)$/m);
  return match?.[1] ?? null;
}

function isPerfettoPidAlive(deviceId: string, pid: string): boolean {
  const result = adb(deviceId, [
    "shell",
    `test -d /proc/${pid} && echo RUN || echo TERM`,
  ]);
  return result.stdout.includes("RUN");
}

function waitForPerfettoPidExit(
  deviceId: string,
  pid: string,
  maxWaitMs = PERFETTO_PID_WAIT_MS,
): void {
  let waited = 0;
  while (waited < maxWaitMs) {
    if (!isPerfettoPidAlive(deviceId, pid)) {
      return;
    }
    adb(deviceId, ["shell", "sleep", "0.5"]);
    waited += 500;
  }
}

function killStalePerfettoProcesses(deviceId: string): void {
  adb(deviceId, [
    "shell",
    "pkill -INT perfetto >/dev/null 2>&1 || true; pkill -INT traced >/dev/null 2>&1 || true; sleep 1",
  ]);
}

function startPerfettoBackground(
  deviceId: string,
  tracePath: string,
  hostLogPath: string,
  configText: string,
): string {
  ensurePerfettoTraceDir(deviceId);
  killStalePerfettoProcesses(deviceId);
  adb(deviceId, ["shell", "rm", "-f", tracePath]);
  try {
    unlinkSync(hostLogPath);
  } catch {
    // best-effort
  }

  if (perfettoBackgroundPidForTests) {
    return perfettoBackgroundPidForTests;
  }

  const adbPath = resolveAdbPath(process.env) ?? "adb";
  const result = spawnSync(
    adbPath,
    [
      "-s",
      deviceId,
      "shell",
      "perfetto",
      "--background",
      "--txt",
      "-o",
      tracePath,
      "-c",
      "-",
    ],
    {
      input: configText,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  try {
    writeFileSync(hostLogPath, combined, "utf8");
  } catch {
    // best-effort
  }

  if (result.status !== 0) {
    throw new Error(combined || "perfetto --background 启动失败");
  }

  const pid = parsePerfettoBackgroundPid(result.stdout ?? "");
  if (!pid) {
    throw new Error(`未解析到 perfetto 后台 PID：${combined || "(空输出)"}`);
  }

  if (!isPerfettoPidAlive(deviceId, pid)) {
    throw new Error(
      `perfetto 未能保持运行（PID ${pid} 已退出）。${combined || "请确认设备 ROM 已开放 trace 权限"}`,
    );
  }

  return pid;
}

function stopPerfettoOnDevice(deviceId: string, pid: string): void {
  adb(deviceId, ["shell", `kill -TERM ${pid} >/dev/null 2>&1 || kill -INT ${pid}`]);
  waitForPerfettoPidExit(deviceId, pid);
}

function ensurePerfettoTraceDir(deviceId: string): void {
  const result = adb(deviceId, ["shell", "mkdir", "-p", REMOTE_PERFETTO_TRACE_DIR]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "创建设备 perfetto trace 目录失败");
  }
}

function cleanupRemoteArtifacts(
  deviceId: string,
  paths: string[],
): void {
  if (paths.length === 0) {
    return;
  }
  adb(deviceId, ["shell", "rm", "-f", ...paths]);
}

export function startPerfTraceCapture(params: PerfTraceStartParams): PerfTraceStartResult {
  ensureNoActiveCapture();
  const deviceId = params.deviceId.trim();
  const packageName = params.packageName.trim();
  const localTracesDir = params.localTracesDir.trim();
  if (!deviceId || !packageName || !localTracesDir) {
    throw new Error("deviceId、packageName、localTracesDir 不能为空");
  }

  const captureId = randomUUID();
  const startedAt = new Date().toISOString();
  const remoteTracePath = remoteTracePathForCapture(captureId);
  mkdirSync(localTracesDir, { recursive: true });
  const hostLogPath = hostLogPathForCapture(localTracesDir, captureId);

  emitProgress({ captureId, phase: "starting" });

  try {
    ensurePerfettoAvailable(deviceId);

    const configText = loadPerfTracePresetConfig(params.presetId, {
      packageName,
      configOverride: params.configOverride,
    });
    const perfettoPid = startPerfettoBackground(
      deviceId,
      remoteTracePath,
      hostLogPath,
      configText,
    );

    activeCapture = {
      captureId,
      deviceId,
      packageName,
      presetId: params.presetId,
      localTracesDir,
      remoteTracePath,
      hostLogPath,
      perfettoPid,
      startedAtMs: Date.now(),
      startedAt,
      linkedSessionId: params.linkedSessionId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "启动 Trace 录制失败";
    cleanupRemoteArtifacts(deviceId, [remoteTracePath]);
    emitProgress({ captureId, phase: "failed", error: message });
    throw error instanceof Error ? error : new Error(message);
  }

  emitProgress({ captureId, phase: "recording" });
  return { captureId, startedAt };
}

export function stopPerfTraceCapture(captureId: string): PerfTraceStopResult {
  const capture = activeCapture;
  if (!capture || capture.captureId !== captureId) {
    throw new Error("未找到进行中的 Trace 录制");
  }

  emitProgress({ captureId, phase: "stopping" });

  stopPerfettoOnDevice(capture.deviceId, capture.perfettoPid);

  const remoteSize = waitForRemoteTraceFile(capture.deviceId, capture.remoteTracePath);
  if (remoteSize <= 0) {
    const logHint = readHostLogTail(capture.hostLogPath);
    const error = logHint
      ? `设备上未生成 trace 文件。${logHint}`
      : "设备上未生成 trace 文件（perfetto 可能未写入或 ROM 限制 trace 输出）";
    emitProgress({ captureId, phase: "failed", error });
    cleanupRemoteArtifacts(capture.deviceId, [capture.remoteTracePath]);
    activeCapture = null;
    throw new Error(error);
  }

  emitProgress({ captureId, phase: "pulling" });

  const localPath = path.join(
    capture.localTracesDir,
    `${captureId}.perfetto-trace`,
  );
  const pullResult = adb(capture.deviceId, [
    "pull",
    capture.remoteTracePath,
    localPath,
  ]);
  if (pullResult.exitCode !== 0) {
    const error = pullResult.stderr || "pull trace 文件失败";
    emitProgress({ captureId, phase: "failed", error });
    activeCapture = null;
    throw new Error(error);
  }

  cleanupRemoteArtifacts(capture.deviceId, [capture.remoteTracePath]);

  let sizeBytes = 0;
  try {
    sizeBytes = statSync(localPath).size;
  } catch {
    sizeBytes = remoteSize;
  }
  const durationMs = Math.max(0, Date.now() - capture.startedAtMs);

  activeCapture = null;
  emitProgress({ captureId, phase: "done", bytesReceived: sizeBytes, bytesTotal: sizeBytes });

  return {
    localPath,
    sizeBytes,
    durationMs,
    remotePath: capture.remoteTracePath,
  };
}

export function cancelPerfTraceCapture(captureId: string): { cancelled: true } {
  const capture = activeCapture;
  if (!capture || capture.captureId !== captureId) {
    throw new Error("未找到进行中的 Trace 录制");
  }

  stopPerfettoOnDevice(capture.deviceId, capture.perfettoPid);
  cleanupRemoteArtifacts(capture.deviceId, [capture.remoteTracePath]);
  activeCapture = null;
  emitProgress({ captureId, phase: "failed", error: "已取消录制" });
  return { cancelled: true };
}

export function getPerfTraceCaptureStatus(): PerfTraceStatusResult {
  if (!activeCapture) {
    return {};
  }
  return {
    activeCaptureId: activeCapture.captureId,
    deviceId: activeCapture.deviceId,
    presetId: activeCapture.presetId,
    phase: "recording",
  };
}

export function analyzePerfTrace(
  params: PerfTraceAnalyzeParams,
): Promise<{ result: Record<string, unknown> }> {
  return analyzePerfTraceWithProcessor(params);
}

export function openPerfTraceExternal(params: {
  localPath: string;
  target: "perfetto_ui";
}): { opened: boolean; url?: string } {
  const localPath = params.localPath.trim();
  if (!localPath) {
    throw new Error("localPath 不能为空");
  }
  try {
    statSync(localPath);
  } catch {
    throw new Error("trace 文件不存在");
  }
  return {
    opened: true,
    url: "https://ui.perfetto.dev",
  };
}

export function deletePerfTraceLocalFile(localPath: string): { deleted: boolean } {
  const normalized = localPath.trim();
  if (!normalized) {
    throw new Error("localPath 不能为空");
  }
  try {
    unlinkSync(normalized);
    return { deleted: true };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT") {
      return { deleted: false };
    }
    throw error;
  }
}

export function emitPerfTraceProgressForTests(
  payload: DeviceAutomationPerfTraceProgressPayload,
): void {
  progressEmitter?.(payload);
}
