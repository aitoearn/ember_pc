/**
 * 稳定性崩溃分析 API（Electron Host 命令）。
 */

import type {
  StabilityAnalysisStartParams,
  StabilityAnalysisStartResult,
  StabilityAnalysisToolStatus,
} from "@/features/device-automation/stability/types";
import { safeInvoke } from "@/lib/dev-bridge/safeInvoke";

export type StabilityAnalysisStatus = {
  activeRunId?: string;
  startedAt?: string;
};

export type StabilityAnalysisCancelResult = {
  runId: string;
  status: "canceled";
  stoppedAt: string;
};

export async function getStabilityAnalysisToolStatus(): Promise<StabilityAnalysisToolStatus> {
  return await safeInvoke<StabilityAnalysisToolStatus>(
    "device_automation_stability_analysis_get_tool_status",
    {},
  );
}

export async function startStabilityAnalysis(
  params: StabilityAnalysisStartParams,
): Promise<StabilityAnalysisStartResult> {
  return await safeInvoke<StabilityAnalysisStartResult>(
    "device_automation_stability_analysis_start",
    params,
  );
}

export async function cancelStabilityAnalysis(
  runId: string,
): Promise<StabilityAnalysisCancelResult> {
  return await safeInvoke<StabilityAnalysisCancelResult>(
    "device_automation_stability_analysis_cancel",
    { runId },
  );
}

export async function getStabilityAnalysisStatus(): Promise<StabilityAnalysisStatus> {
  return await safeInvoke<StabilityAnalysisStatus>(
    "device_automation_stability_analysis_get_status",
    {},
  );
}
