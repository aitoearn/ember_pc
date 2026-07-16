import type { PerfMetricKey } from "./types";

export const DEVICE_AUTOMATION_PERF_FRAME_EVENT =
  "device_automation_perf_frame";

export type DeviceAutomationPerfFramePayload = {
  sessionId: string;
  ts: number;
  data: Partial<Record<PerfMetricKey, number>>;
};

/** P2 · Perfetto trace 录制/pull 进度事件 */
export const DEVICE_AUTOMATION_PERF_TRACE_PROGRESS_EVENT =
  "device_automation_perf_trace_progress";

export type PerfTraceProgressPhase =
  | "starting"
  | "recording"
  | "stopping"
  | "pulling"
  | "done"
  | "failed";

export type DeviceAutomationPerfTraceProgressPayload = {
  captureId: string;
  phase: PerfTraceProgressPhase;
  bytesReceived?: number;
  bytesTotal?: number;
  error?: string;
};
