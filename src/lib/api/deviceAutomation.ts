import { safeInvoke } from "@/lib/dev-bridge";
import { safeListen } from "@/lib/dev-bridge";
import {
  DEVICE_AUTOMATION_INVENTORY_CHANGED_EVENT,
  type DeviceAutomationInventoryChangedPayload,
} from "@/features/device-automation/events";
import type {
  AgentDeviceListResponse,
  DeviceAutomationRuntimeStatus,
  DeviceAutomationScreenshotResponse,
  DeviceAutomationScrcpyReverseTcpResponse,
  DeviceAutomationScrcpyConnectResponse,
  DeviceAutomationScrcpyStartResponse,
  DeviceAutomationAiPollResponse,
  DeviceAutomationAiSessionResponse,
  DeviceAutomationAiTaskRun,
  AutoGlmSidecarStatus,
} from "@/features/device-automation/types";

export function listenDeviceAutomationInventoryChanged(
  handler: (payload: DeviceAutomationInventoryChangedPayload) => void,
): Promise<() => void> {
  return safeListen<DeviceAutomationInventoryChangedPayload>(
    DEVICE_AUTOMATION_INVENTORY_CHANGED_EVENT,
    (event) => {
      handler(event.payload);
    },
  );
}

export async function ensureDeviceAutomationRuntime(params?: {
  warmDevice?: { platform: string; deviceId: string };
}): Promise<DeviceAutomationRuntimeStatus> {
  return await safeInvoke<DeviceAutomationRuntimeStatus>(
    "device_automation_ensure_sidecar",
    params ?? {},
  );
}

/** @deprecated 兼容旧命名 */
export const ensureDeviceAutomationSidecar = ensureDeviceAutomationRuntime;

export async function getDeviceAutomationRuntimeStatus(): Promise<DeviceAutomationRuntimeStatus> {
  return await safeInvoke<DeviceAutomationRuntimeStatus>(
    "device_automation_get_sidecar_status",
  );
}

/** @deprecated 兼容旧命名 */
export const getDeviceAutomationSidecarStatus = getDeviceAutomationRuntimeStatus;

export async function listDeviceAutomationDevices(options?: {
  force?: boolean;
}): Promise<AgentDeviceListResponse> {
  return await safeInvoke<AgentDeviceListResponse>(
    "device_automation_list_devices",
    options,
  );
}

export async function captureDeviceAutomationScreenshot(params: {
  platform: string;
  deviceId: string;
}): Promise<DeviceAutomationScreenshotResponse> {
  return await safeInvoke<DeviceAutomationScreenshotResponse>(
    "device_automation_capture_screenshot",
    params,
  );
}

export async function sendDeviceAutomationNavigation(params: {
  action: "back" | "home";
  platform: string;
  deviceId: string;
}): Promise<{ ok: true }> {
  return await safeInvoke<{ ok: true }>(
    "device_automation_send_navigation",
    params,
  );
}

export async function ensureDeviceAutomationAiSidecar(): Promise<AutoGlmSidecarStatus> {
  return await safeInvoke<AutoGlmSidecarStatus>(
    "device_automation_ensure_ai_sidecar",
  );
}

export async function prepareDeviceAutomationAiSession(params: {
  deviceId: string;
  deviceSerial: string;
  mode?: "classic" | "layered";
}): Promise<DeviceAutomationAiSessionResponse> {
  return await safeInvoke<DeviceAutomationAiSessionResponse>(
    "device_automation_prepare_ai_session",
    params,
  );
}

export async function submitDeviceAutomationAiTask(params: {
  sessionId: string;
  message: string;
}): Promise<DeviceAutomationAiTaskRun> {
  return await safeInvoke<DeviceAutomationAiTaskRun>(
    "device_automation_submit_ai_task",
    params,
  );
}

export async function pollDeviceAutomationAiTask(params: {
  taskId: string;
  afterSeq?: number;
}): Promise<DeviceAutomationAiPollResponse> {
  return await safeInvoke<DeviceAutomationAiPollResponse>(
    "device_automation_poll_ai_task",
    params,
  );
}

export async function cancelDeviceAutomationAiTask(
  taskId: string,
): Promise<DeviceAutomationAiTaskRun> {
  return await safeInvoke<DeviceAutomationAiTaskRun>(
    "device_automation_cancel_ai_task",
    { taskId },
  );
}

export async function sendDeviceAutomationTap(params: {
  platform: string;
  deviceId: string;
  x: number;
  y: number;
}): Promise<{ ok: true }> {
  return await safeInvoke<{ ok: true }>("device_automation_send_tap", params);
}

export async function sendDeviceAutomationSwipe(params: {
  platform: string;
  deviceId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): Promise<{ ok: true }> {
  return await safeInvoke<{ ok: true }>("device_automation_send_swipe", params);
}

/** 对齐 aya main.reverseTcp */
export async function reverseDeviceAutomationScrcpyTcpPort(params: {
  deviceId: string;
  remote: string;
}): Promise<{ port: number; reused: boolean }> {
  return await safeInvoke<{ port: number; reused: boolean }>(
    "device_automation_scrcpy_prepare_reverse",
    params,
  );
}

/** @deprecated 使用 reverseDeviceAutomationScrcpyTcpPort */
export const prepareDeviceAutomationScrcpyReverse = reverseDeviceAutomationScrcpyTcpPort;

export async function reverseDeviceAutomationScrcpyTcp(params: {
  deviceId: string;
  remote: string;
  localPort: number;
}): Promise<DeviceAutomationScrcpyReverseTcpResponse> {
  return await safeInvoke<DeviceAutomationScrcpyReverseTcpResponse>(
    "device_automation_scrcpy_reverse_tcp",
    params,
  );
}

export async function startDeviceAutomationScrcpy(params: {
  deviceId: string;
  scid: string;
  maxSize?: number;
  videoBitRate?: number;
  audio?: boolean;
}): Promise<DeviceAutomationScrcpyStartResponse> {
  return await safeInvoke<DeviceAutomationScrcpyStartResponse>(
    "device_automation_scrcpy_start",
    params,
  );
}

export async function stopDeviceAutomationScrcpy(params: {
  deviceId: string;
}): Promise<{ ok: true }> {
  return await safeInvoke<{ ok: true }>("device_automation_scrcpy_stop", params);
}

export async function teardownDeviceAutomationScrcpySession(params: {
  deviceId: string;
  remote: string;
  killServer?: boolean;
}): Promise<{ ok: true }> {
  return await safeInvoke<{ ok: true }>("device_automation_scrcpy_teardown", params);
}

export async function launchDeviceAutomationScrcpy(params: {
  deviceId: string;
  remote: string;
  localPort: number;
  scid: string;
  maxSize?: number;
  videoBitRate?: number;
  audio?: boolean;
}): Promise<{ ok: true }> {
  return await safeInvoke<{ ok: true }>("device_automation_scrcpy_launch", params);
}

export async function prewarmDeviceAutomationScrcpy(params: {
  deviceId: string;
}): Promise<{ status: "ready" | "scheduled" | "skipped" }> {
  return await safeInvoke<{ status: "ready" | "scheduled" | "skipped" }>(
    "device_automation_scrcpy_prewarm",
    params,
  );
}

export async function connectDeviceAutomationScrcpy(params: {
  deviceId: string;
  remote: string;
  localPort: number;
  scid: string;
  maxSize?: number;
  videoBitRate?: number;
  audio?: boolean;
}): Promise<DeviceAutomationScrcpyConnectResponse> {
  try {
    return await safeInvoke<DeviceAutomationScrcpyConnectResponse>(
      "device_automation_scrcpy_connect",
      params,
    );
  } catch (error) {
    if (!isDesktopHostUnsupportedCommandError(error, "device_automation_scrcpy_connect")) {
      throw error;
    }
    // preload / 主进程未重建时白名单不含 scrcpy_connect；回退 split RPC 保证投屏可用。
    console.warn(
      "[device-automation] Desktop Host 尚未注册 scrcpy_connect，回退 reverse+start（请重启 npm run electron:dev 以启用合并命令）",
    );
    const reverse = await reverseDeviceAutomationScrcpyTcp({
      deviceId: params.deviceId,
      remote: params.remote,
      localPort: params.localPort,
    });
    const start = await startDeviceAutomationScrcpy({
      deviceId: params.deviceId,
      scid: params.scid,
      maxSize: params.maxSize,
      videoBitRate: params.videoBitRate,
      audio: params.audio,
    });
    return { reverse, start };
  }
}

function isDesktopHostUnsupportedCommandError(
  error: unknown,
  command: string,
): boolean {
  return (
    error instanceof Error &&
    error.message.includes(`尚未支持命令 "${command}"`)
  );
}
