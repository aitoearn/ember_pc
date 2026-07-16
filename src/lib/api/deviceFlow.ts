/**
 * 确定性测试流 Desktop Host 命令封装（手动录制 / 回放运行时）。
 * App Server 持久化见 `src/features/device-automation/flow/api.ts`。
 */

import { safeInvoke, safeListen } from "@/lib/dev-bridge";
import type { TestFlow } from "@/features/device-automation/flow/domain/flowFormat";
import type { DeviceFlowReplayEvent } from "@/features/device-automation/events";
import { deviceFlowReplayEventChannel as replayChannel } from "@/features/device-automation/events";
import type { FlowStep } from "@/features/device-automation/flow/domain/flowFormat";

export interface StartManualFlowRecordRequest {
  recordId: string;
  deviceId: string;
  serial: string;
  screenWidth?: number;
  screenHeight?: number;
}

export interface StartDeviceFlowReplayRequest {
  runId: string;
  flowId: string;
  deviceId: string;
  serial: string;
  flow: TestFlow;
  selfHealingEnabled: boolean;
  providerId?: string;
  model?: string;
}

export async function startManualFlowRecord(
  request: StartManualFlowRecordRequest,
): Promise<{ recordId: string }> {
  return await safeInvoke<{ recordId: string }>(
    "device_flow_record_manual_start",
    request as unknown as Record<string, unknown>,
  );
}

export async function stopManualFlowRecord(params: {
  recordId: string;
}): Promise<{ steps: FlowStep[] }> {
  return await safeInvoke<{ steps: FlowStep[] }>(
    "device_flow_record_manual_stop",
    params,
  );
}

export function listenDeviceFlowReplayEvents(
  runId: string,
  handler: (event: DeviceFlowReplayEvent) => void,
): Promise<() => void> {
  return safeListen<DeviceFlowReplayEvent>(replayChannel(runId), (event) => {
    handler(event.payload);
  });
}

/** 先订阅事件再调用，避免漏事件。 */
export async function startDeviceFlowReplay(
  request: StartDeviceFlowReplayRequest,
): Promise<{ runId: string }> {
  return await safeInvoke<{ runId: string }>(
    "device_flow_replay_start",
    request as unknown as Record<string, unknown>,
  );
}

export async function cancelDeviceFlowReplay(runId: string): Promise<{
  cancelled: boolean;
}> {
  return await safeInvoke<{ cancelled: boolean }>(
    "device_flow_replay_cancel",
    { runId },
  );
}
