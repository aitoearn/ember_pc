import type { DeviceAutomationMonkeyEventPayload } from "../events";
import type { MonkeyLogLine, MonkeySessionSummary } from "../types";

export interface MonkeySessionViewState {
  phase: "idle" | "running" | "stopping";
  logs: MonkeyLogLine[];
  summary: MonkeySessionSummary | null;
}

export const initialMonkeySessionState: MonkeySessionViewState = {
  phase: "idle",
  logs: [],
  summary: null,
};

const MAX_LOG_LINES = 500;

export function appendMonkeyEvent(
  state: MonkeySessionViewState,
  payload: DeviceAutomationMonkeyEventPayload,
  activeSessionId: string | null,
): MonkeySessionViewState {
  if (!activeSessionId || payload.sessionId !== activeSessionId) {
    return state;
  }
  const logs =
    state.logs.length >= MAX_LOG_LINES
      ? [...state.logs.slice(-MAX_LOG_LINES + 1), payload.line]
      : [...state.logs, payload.line];
  return { ...state, logs };
}

export function countMonkeyIncidents(logs: MonkeyLogLine[]): {
  crashCount: number;
  anrCount: number;
} {
  let crashCount = 0;
  let anrCount = 0;
  for (const line of logs) {
    if (line.type === "crash") {
      crashCount += 1;
    } else if (line.type === "anr") {
      anrCount += 1;
    }
  }
  return { crashCount, anrCount };
}
