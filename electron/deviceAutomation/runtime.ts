import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  captureAgentDeviceScreenshot,
  listAgentDevices,
  probeAgentDeviceInstallation,
  readScreenshotBase64,
  sendAgentDeviceNavigation,
  sendAgentDevicePress,
  sendAgentDeviceSwipe,
  type AgentDeviceCliRecord,
} from "./agentDeviceCli";
import {
  captureAgentDeviceScreenshotViaDaemon,
  connectAgentDeviceScrcpyViaDaemon,
  listAgentDevicesViaDaemon,
  reverseAgentDeviceScrcpyTcpViaDaemon,
  sendAgentDeviceNavigationViaDaemon,
  sendAgentDevicePressViaDaemon,
  sendAgentDeviceSwipeViaDaemon,
  startAgentDeviceScrcpyViaDaemon,
  warmAgentDeviceSessionViaDaemon,
} from "./agentDeviceDaemonClient";
import {
  cancelAutoGlmTask,
  createAutoGlmTaskSession,
  getAutoGlmSidecarStatus,
  getAutoGlmTask,
  listAutoGlmTaskEvents,
  submitAutoGlmTaskSessionTask,
  type AutoGlmTaskEvent,
  type AutoGlmTaskRun,
  type AutoGlmTaskSession,
} from "./autoGlmApi";
import { autoGlmSidecar } from "./autoGlmSidecar";
import { resolveScrcpyServerPath } from "./scrcpyServerPath";
import {
  prewarmScrcpyJarFast,
  prepareScrcpyReverseTcpFast,
  reverseScrcpyTcpFast,
  sendAndroidNavigationFast,
  startScrcpyServerFast,
  stopScrcpyServerFast,
  teardownScrcpySessionFast,
} from "./scrcpyAdbFastPath";
import {
  getPerfStatus,
  listPerfApps,
  setPerfFrameEmitter,
  startPerfCollection,
  stopPerfCollection,
  type PerfFrameEmitter,
  type PerfStartParams,
} from "./performanceMonitor";
import {
  getMonkeyStatus,
  setMonkeyEventEmitter,
  startMonkeyTest,
  stopMonkeyTest,
  type MonkeyEventEmitter,
  type MonkeyStartParams,
} from "./monkeyTest";
import {
  analyzePerfTrace,
  cancelPerfTraceCapture,
  deletePerfTraceLocalFile,
  getPerfTraceCaptureStatus,
  openPerfTraceExternal,
  setPerfTraceProgressEmitter,
  startPerfTraceCapture,
  stopPerfTraceCapture,
  type PerfTraceAnalyzeParams,
  type PerfTraceProgressEmitter,
  type PerfTraceStartParams,
} from "./perfTraceCapture";
import { enrichAndroidDeviceRecords } from "./androidDeviceMetadata";
import { filterAgentDevicesForInventory } from "../../src/features/device-automation/domain/deviceInventoryFilter";

const DEVICE_LIST_CACHE_TTL_MS = 3_000;

export type DeviceAutomationRuntimeStatus = {
  ready: boolean;
  backend: "agent-device";
  agentDeviceRoot?: string;
  agentDeviceStateDir?: string;
  error?: string;
};

export type DeviceAutomationDeviceListResponse = {
  devices: AgentDeviceCliRecord[];
};

export type DeviceAutomationScreenshotResponse = {
  base64: string;
  mediaType: string;
  capturedAt: string;
};

export type DeviceAutomationScrcpyReverseTcpResponse = Record<string, unknown>;
export type DeviceAutomationScrcpyStartResponse = Record<string, unknown>;
export type DeviceAutomationScrcpyConnectResponse = {
  reverse: DeviceAutomationScrcpyReverseTcpResponse;
  start: DeviceAutomationScrcpyStartResponse;
};

type EnsureRuntimeParams = {
  warmDevice?: {
    platform: string;
    deviceId: string;
  };
};

type DeviceListCache = {
  expiresAt: number;
  devices: AgentDeviceCliRecord[];
};

type DeviceAutomationRuntimeOptions = {
  getAndroidDevices?: () => AgentDeviceCliRecord[];
  resolveScrcpyServerPath?: () => string;
};

type DeviceInventoryChangeEmitter = (payload: {
  source: "agent-device-daemon";
  changedAt: string;
}) => void;

let deviceListCache: DeviceListCache | null = null;
let daemonDeviceMergeInFlight: Promise<void> | null = null;

function buildReadyStatus(): DeviceAutomationRuntimeStatus {
  const readyState = probeAgentDeviceInstallation();
  return {
    ready: true,
    backend: "agent-device",
    agentDeviceRoot: readyState.rootPath,
    agentDeviceStateDir: readyState.stateDir,
  };
}

async function buildDeviceListResponse(
  devices: AgentDeviceCliRecord[],
): Promise<DeviceAutomationDeviceListResponse> {
  const filtered = filterAgentDevicesForInventory(devices);
  const enriched = await enrichAndroidDeviceRecords(filtered);
  return { devices: enriched };
}

export class DeviceAutomationRuntime {
  #getAndroidDevices?: () => AgentDeviceCliRecord[];
  readonly #resolveScrcpyServerPath: () => string;
  #emitInventoryChanged: DeviceInventoryChangeEmitter | null = null;

  constructor(options: DeviceAutomationRuntimeOptions = {}) {
    this.#getAndroidDevices = options.getAndroidDevices;
    this.#resolveScrcpyServerPath =
      options.resolveScrcpyServerPath ?? resolveScrcpyServerPath;
  }

  setAndroidDeviceProvider(provider: (() => AgentDeviceCliRecord[]) | null): void {
    this.#getAndroidDevices = provider ?? undefined;
    deviceListCache = null;
  }

  setInventoryChangeEmitter(emitter: DeviceInventoryChangeEmitter | null): void {
    this.#emitInventoryChanged = emitter;
  }

  setPerfFrameEmitter(emitter: PerfFrameEmitter | null): void {
    setPerfFrameEmitter(emitter);
  }

  listPerfApps(params: { platform: string; deviceId: string }) {
    return listPerfApps(params);
  }

  startPerfCollection(params: PerfStartParams) {
    return startPerfCollection(params);
  }

  stopPerfCollection(params: { sessionId: string }) {
    return stopPerfCollection(params.sessionId);
  }

  getPerfStatus() {
    return getPerfStatus();
  }

  setMonkeyEventEmitter(emitter: MonkeyEventEmitter | null): void {
    setMonkeyEventEmitter(emitter);
  }

  startMonkeyTest(params: MonkeyStartParams) {
    return startMonkeyTest(params);
  }

  stopMonkeyTest(params: { sessionId: string }) {
    return stopMonkeyTest(params);
  }

  getMonkeyStatus() {
    return getMonkeyStatus();
  }

  setPerfTraceProgressEmitter(emitter: PerfTraceProgressEmitter | null): void {
    setPerfTraceProgressEmitter(emitter);
  }

  startPerfTraceCapture(params: PerfTraceStartParams) {
    return startPerfTraceCapture(params);
  }

  stopPerfTraceCapture(params: { captureId: string }) {
    return stopPerfTraceCapture(params.captureId);
  }

  cancelPerfTraceCapture(params: { captureId: string }) {
    return cancelPerfTraceCapture(params.captureId);
  }

  getPerfTraceCaptureStatus() {
    return getPerfTraceCaptureStatus();
  }

  analyzePerfTrace(params: PerfTraceAnalyzeParams) {
    return analyzePerfTrace(params);
  }

  openPerfTraceExternal(params: { localPath: string; target: "perfetto_ui" }) {
    return openPerfTraceExternal(params);
  }

  deletePerfTraceLocalFile(params: { localPath: string }) {
    return deletePerfTraceLocalFile(params.localPath);
  }

  async ensure(params?: EnsureRuntimeParams): Promise<DeviceAutomationRuntimeStatus> {
    try {
      if (params?.warmDevice) {
        const readyState = probeAgentDeviceInstallation();
        await warmAgentDeviceSessionViaDaemon(readyState.stateDir, params.warmDevice);
      }
      return buildReadyStatus();
    } catch (error) {
      return {
        ready: false,
        backend: "agent-device",
        error: error instanceof Error ? error.message : "设备自动化 runtime 启动失败",
      };
    }
  }

  async listDevices(options?: {
    force?: boolean;
  }): Promise<DeviceAutomationDeviceListResponse> {
    const readyState = probeAgentDeviceInstallation();
    const now = Date.now();
    const androidFastPath = this.#getAndroidDevices?.() ?? [];

    if (options?.force) {
      return await this.#fetchFullDeviceList(readyState.stateDir, androidFastPath, now);
    }

    if (deviceListCache && deviceListCache.expiresAt > now) {
      const devices = mergeAndroidFastPathDevices(
        androidFastPath,
        extractNonAndroidDevices(deviceListCache.devices),
      );
      deviceListCache = {
        devices,
        expiresAt: deviceListCache.expiresAt,
      };
      this.#scheduleDaemonDeviceMerge(readyState.stateDir, androidFastPath);
      return await buildDeviceListResponse(devices);
    }

    if (androidFastPath.length > 0) {
      const devices = mergeAndroidFastPathDevices(
        androidFastPath,
        extractNonAndroidDevices(deviceListCache?.devices ?? []),
      );
      deviceListCache = {
        devices,
        expiresAt: now + DEVICE_LIST_CACHE_TTL_MS,
      };
      this.#scheduleDaemonDeviceMerge(readyState.stateDir, androidFastPath);
      return await buildDeviceListResponse(devices);
    }

    return await this.#fetchFullDeviceList(readyState.stateDir, androidFastPath, now);
  }

  async #fetchFullDeviceList(
    stateDir: string,
    androidFastPath: AgentDeviceCliRecord[],
    now: number,
  ): Promise<DeviceAutomationDeviceListResponse> {
    const agentDevices =
      (await listAgentDevicesViaDaemon(stateDir)) ?? listAgentDevices();
    const devices = mergeAndroidFastPathDevices(androidFastPath, agentDevices);
    deviceListCache = {
      devices,
      expiresAt: now + DEVICE_LIST_CACHE_TTL_MS,
    };
    return await buildDeviceListResponse(devices);
  }

  #scheduleDaemonDeviceMerge(
    stateDir: string,
    androidFastPath: AgentDeviceCliRecord[],
  ): void {
    if (daemonDeviceMergeInFlight) {
      return;
    }
    const now = Date.now();
    if (
      deviceListCache &&
      deviceListCache.expiresAt > now &&
      extractNonAndroidDevices(deviceListCache.devices).length > 0
    ) {
      return;
    }
    daemonDeviceMergeInFlight = this.#mergeDaemonDevicesInBackground(
      stateDir,
      androidFastPath,
    ).finally(() => {
      daemonDeviceMergeInFlight = null;
    });
  }

  async #mergeDaemonDevicesInBackground(
    stateDir: string,
    _androidFastPath: AgentDeviceCliRecord[],
  ): Promise<void> {
    try {
      const agentDevices =
        (await listAgentDevicesViaDaemon(stateDir)) ?? listAgentDevices();
      const devices = mergeAndroidFastPathDevices(
        this.#getAndroidDevices?.() ?? [],
        agentDevices,
      );
      const previous = deviceListCache?.devices ?? [];
      const now = Date.now();
      deviceListCache = {
        devices,
        expiresAt: now + DEVICE_LIST_CACHE_TTL_MS,
      };
      if (!areDeviceListsEqual(previous, devices)) {
        this.#emitInventoryChanged?.({
          source: "agent-device-daemon",
          changedAt: new Date(now).toISOString(),
        });
      }
    } catch (error) {
      console.warn("[device-automation] 后台合并 agent-device 设备列表失败", error);
    }
  }

  async captureScreenshot(params: {
    platform: string;
    deviceId: string;
  }): Promise<DeviceAutomationScreenshotResponse> {
    const readyState = probeAgentDeviceInstallation();
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "lime-device-shot-"));
    const outputPath = path.join(tempDir, "screen.png");
    try {
      const screenshotPath =
        (await captureAgentDeviceScreenshotViaDaemon(readyState.stateDir, {
          platform: params.platform,
          deviceId: params.deviceId,
          outputPath,
        })) ??
        captureAgentDeviceScreenshot({
          platform: params.platform,
          deviceId: params.deviceId,
          outputPath,
        });
      const payload = readScreenshotBase64(screenshotPath);
      return {
        ...payload,
        capturedAt: new Date().toISOString(),
      };
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  async sendNavigation(params: {
    action: "back" | "home";
    platform: string;
    deviceId: string;
  }): Promise<{ ok: true }> {
    if (params.platform === "android") {
      try {
        sendAndroidNavigationFast({
          deviceId: params.deviceId,
          action: params.action,
        });
        return { ok: true };
      } catch (fastPathError) {
        console.warn(
          "[device-automation] adb input keyevent 快路径失败，回退 agent-device",
          fastPathError,
        );
      }
    }
    const readyState = probeAgentDeviceInstallation();
    const sentViaDaemon = await sendAgentDeviceNavigationViaDaemon(
      readyState.stateDir,
      params,
    );
    if (!sentViaDaemon) {
      sendAgentDeviceNavigation(params);
    }
    return { ok: true };
  }

  async ensureAiSidecar() {
    return await getAutoGlmSidecarStatus();
  }

  async prepareAiSession(params: {
    deviceId: string;
    deviceSerial: string;
    mode?: "classic" | "layered";
  }): Promise<{ sidecar: Awaited<ReturnType<typeof getAutoGlmSidecarStatus>>; session: AutoGlmTaskSession }> {
    const sidecar = await getAutoGlmSidecarStatus();
    if (!sidecar.ready) {
      throw new Error(sidecar.error ?? "AutoGLM 服务尚未就绪");
    }
    const session = await createAutoGlmTaskSession(params);
    return { sidecar, session };
  }

  async submitAiTask(params: {
    sessionId: string;
    message: string;
  }): Promise<AutoGlmTaskRun> {
    await getAutoGlmSidecarStatus();
    return await submitAutoGlmTaskSessionTask(params);
  }

  async pollAiTask(params: {
    taskId: string;
    afterSeq?: number;
  }): Promise<{ task: AutoGlmTaskRun; events: AutoGlmTaskEvent[] }> {
    await getAutoGlmSidecarStatus();
    const [task, events] = await Promise.all([
      getAutoGlmTask(params.taskId),
      listAutoGlmTaskEvents(params),
    ]);
    return { task, events };
  }

  async cancelAiTask(taskId: string): Promise<AutoGlmTaskRun> {
    await getAutoGlmSidecarStatus();
    return await cancelAutoGlmTask(taskId);
  }

  async sendTap(params: {
    platform: string;
    deviceId: string;
    x: number;
    y: number;
  }): Promise<{ ok: true }> {
    const readyState = probeAgentDeviceInstallation();
    const sentViaDaemon = await sendAgentDevicePressViaDaemon(
      readyState.stateDir,
      params,
    );
    if (!sentViaDaemon) {
      sendAgentDevicePress(params);
    }
    return { ok: true };
  }

  async sendSwipe(params: {
    platform: string;
    deviceId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }): Promise<{ ok: true }> {
    const readyState = probeAgentDeviceInstallation();
    const sentViaDaemon = await sendAgentDeviceSwipeViaDaemon(
      readyState.stateDir,
      params,
    );
    if (!sentViaDaemon) {
      sendAgentDeviceSwipe(params);
    }
    return { ok: true };
  }

  async prepareScrcpyReverse(params: {
    deviceId: string;
    remote: string;
  }): Promise<{ port: number; reused: boolean }> {
    try {
      return await prepareScrcpyReverseTcpFast(params);
    } catch (fastPathError) {
      console.warn(
        "[device-automation] scrcpy adb 快路径 reverseTcp 失败",
        fastPathError,
      );
      throw fastPathError;
    }
  }

  async reverseScrcpyTcp(params: {
    deviceId: string;
    remote: string;
    localPort: number;
  }): Promise<DeviceAutomationScrcpyReverseTcpResponse> {
    try {
      return reverseScrcpyTcpFast(params);
    } catch (fastPathError) {
      console.warn("[device-automation] scrcpy adb 快路径 reverse 失败，回退 daemon", fastPathError);
    }
    const readyState = probeAgentDeviceInstallation();
    const response = await reverseAgentDeviceScrcpyTcpViaDaemon(
      readyState.stateDir,
      params,
    );
    if (!response) {
      throw new Error("agent-device daemon 不可用，无法建立 scrcpy reverse");
    }
    const returnedPort = readScrcpyReverseTcpPort(response);
    if (returnedPort !== params.localPort) {
      const reused = response.reused === true;
      throw new Error(
        `adb reverse 端口不一致：Electron 监听 ${params.localPort}，adb 映射 ${returnedPort ?? "未知"}${reused ? "（复用了旧 reverse）" : ""}`,
      );
    }
    return response;
  }

  async startScrcpy(params: {
    deviceId: string;
    scid: string;
    maxSize?: number;
    videoBitRate?: number;
    audio?: boolean;
  }): Promise<DeviceAutomationScrcpyStartResponse> {
    // 兜底：每次 start 前先 stop，清理设备端残留 scrcpy server。
    stopScrcpyServerFast(params.deviceId);
    try {
      return startScrcpyServerFast({
        ...params,
        scrcpyServerPath: this.#resolveScrcpyServerPath(),
      });
    } catch (fastPathError) {
      console.warn("[device-automation] scrcpy adb 快路径 start 失败，回退 daemon", fastPathError);
    }
    const readyState = probeAgentDeviceInstallation();
    const response = await startAgentDeviceScrcpyViaDaemon(readyState.stateDir, {
      ...params,
      scrcpyServerPath: this.#resolveScrcpyServerPath(),
    });
    if (!response) {
      throw new Error("agent-device daemon 不可用，无法启动 scrcpy");
    }
    return response;
  }

  /** 对齐 aya：单次调用内 sync reverse + fire-and-forget start（主进程 adb 快路径，无 daemon 往返）。 */
  async launchScrcpy(params: {
    deviceId: string;
    remote: string;
    localPort: number;
    scid: string;
    maxSize?: number;
    videoBitRate?: number;
    audio?: boolean;
  }): Promise<{ ok: true }> {
    await this.reverseScrcpyTcp({
      deviceId: params.deviceId,
      remote: params.remote,
      localPort: params.localPort,
    });
    void this.startScrcpy({
      deviceId: params.deviceId,
      scid: params.scid,
      maxSize: params.maxSize,
      videoBitRate: params.videoBitRate,
      audio: params.audio,
    }).catch((error) => {
      console.warn("[device-automation] scrcpy server 后台启动失败", error);
    });
    return { ok: true };
  }

  stopScrcpy(params: { deviceId: string }): { ok: true } {
    stopScrcpyServerFast(params.deviceId);
    return { ok: true };
  }

  teardownScrcpy(params: {
    deviceId: string;
    remote: string;
    killServer?: boolean;
  }): { ok: true } {
    teardownScrcpySessionFast(params);
    return { ok: true };
  }

  /** 后台 push scrcpy.jar，列表/调试页进入时预热，连接热路径跳过 stat/push。 */
  prewarmScrcpy(params: { deviceId: string }): { status: "ready" | "scheduled" | "skipped" } {
    try {
      return prewarmScrcpyJarFast({
        deviceId: params.deviceId,
        scrcpyServerPath: this.#resolveScrcpyServerPath(),
      });
    } catch (error) {
      console.warn("[device-automation] scrcpy jar 预热失败", error);
      return { status: "skipped" };
    }
  }

  async connectScrcpy(params: {
    deviceId: string;
    remote: string;
    localPort: number;
    scid: string;
    maxSize?: number;
    videoBitRate?: number;
    audio?: boolean;
  }): Promise<DeviceAutomationScrcpyConnectResponse> {
    const readyState = probeAgentDeviceInstallation();
    const response = await connectAgentDeviceScrcpyViaDaemon(readyState.stateDir, {
      ...params,
      scrcpyServerPath: this.#resolveScrcpyServerPath(),
    });
    if (!response) {
      throw new Error("agent-device daemon 不可用，无法建立 scrcpy 连接");
    }
    const returnedPort = readScrcpyReverseTcpPort(response.reverse);
    if (returnedPort !== params.localPort) {
      const reused = response.reverse.reused === true;
      throw new Error(
        `adb reverse 端口不一致：Electron 监听 ${params.localPort}，adb 映射 ${returnedPort ?? "未知"}${reused ? "（复用了旧 reverse）" : ""}`,
      );
    }
    return response;
  }

  async stop(): Promise<void> {
    deviceListCache = null;
    daemonDeviceMergeInFlight = null;
    await autoGlmSidecar.stop();
  }
}

export const deviceAutomationRuntime = new DeviceAutomationRuntime();

/** 测试专用：重置模块级设备列表缓存，避免用例间互相污染。 */
export function resetDeviceAutomationRuntimeStateForTests(): void {
  deviceListCache = null;
  daemonDeviceMergeInFlight = null;
}

function extractNonAndroidDevices(
  devices: AgentDeviceCliRecord[],
): AgentDeviceCliRecord[] {
  return filterAgentDevicesForInventory(devices).filter(
    (device) => device.platform !== "android",
  );
}

function areDeviceListsEqual(
  left: AgentDeviceCliRecord[],
  right: AgentDeviceCliRecord[],
): boolean {
  return normalizeDeviceListSnapshot(left) === normalizeDeviceListSnapshot(right);
}

function normalizeDeviceListSnapshot(devices: AgentDeviceCliRecord[]): string {
  return devices
    .map((device) => `${device.platform}\t${device.id}`)
    .sort()
    .join("\n");
}

function mergeAndroidFastPathDevices(
  androidFastPathDevices: AgentDeviceCliRecord[],
  agentDevices: AgentDeviceCliRecord[],
): AgentDeviceCliRecord[] {
  if (androidFastPathDevices.length === 0) {
    return agentDevices;
  }
  const agentAndroidById = new Map(
    agentDevices
      .filter((device) => device.platform === "android")
      .map((device) => [device.id, device] as const),
  );
  const mergedAndroid = androidFastPathDevices.map((fastDevice) => {
    const agentDevice = agentAndroidById.get(fastDevice.id);
    if (!agentDevice) {
      return fastDevice;
    }
    return {
      ...fastDevice,
      ...agentDevice,
      booted: fastDevice.booted ?? agentDevice.booted,
      target: fastDevice.target ?? agentDevice.target,
    };
  });
  return [
    ...mergedAndroid,
    ...agentDevices.filter((device) => device.platform !== "android"),
  ];
}

function readScrcpyReverseTcpPort(response: Record<string, unknown>): number | undefined {
  const { port } = response;
  return typeof port === "number" && Number.isFinite(port) ? port : undefined;
}
