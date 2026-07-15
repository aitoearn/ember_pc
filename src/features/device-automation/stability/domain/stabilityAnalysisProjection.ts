import type { DeviceAutomationStabilityAnalysisEventPayload } from "../events";
import type {
  StabilityAnalysisEventLine,
  StabilityAnalysisPhase,
} from "../types";

export interface StabilityAnalysisViewState {
  phase: StabilityAnalysisPhase;
  runId: string | null;
  logs: StabilityAnalysisEventLine[];
  reportDir?: string;
  primaryArtifactPath?: string;
  errorMessage?: string;
}

export const initialStabilityAnalysisState: StabilityAnalysisViewState = {
  phase: "idle",
  runId: null,
  logs: [],
};

const MAX_LOG_LINES = 500;

export function appendStabilityAnalysisEvent(
  state: StabilityAnalysisViewState,
  payload: DeviceAutomationStabilityAnalysisEventPayload,
  activeRunId: string | null,
): StabilityAnalysisViewState {
  if (!activeRunId || payload.runId !== activeRunId) {
    return state;
  }

  const line = payload.line;
  const logs =
    state.logs.length >= MAX_LOG_LINES
      ? [...state.logs.slice(-MAX_LOG_LINES + 1), line]
      : [...state.logs, line];

  if (line.type === "done") {
    return {
      ...state,
      phase: "idle",
      runId: null,
      logs,
      reportDir: line.reportDir ?? state.reportDir,
      primaryArtifactPath:
        line.primaryArtifactPath ?? state.primaryArtifactPath,
      errorMessage: undefined,
    };
  }

  if (line.type === "error") {
    return {
      ...state,
      phase: "idle",
      runId: null,
      logs,
      errorMessage: line.message,
    };
  }

  return { ...state, logs };
}
