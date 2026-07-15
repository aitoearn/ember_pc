import type { StabilityAnalysisEventLine } from "./types";

export const DEVICE_AUTOMATION_STABILITY_ANALYSIS_EVENT =
  "device_automation_stability_analysis_event";

export type DeviceAutomationStabilityAnalysisEventPayload = {
  runId: string;
  line: StabilityAnalysisEventLine;
};
