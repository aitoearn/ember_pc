/**
 * 回放事件 → 可渲染状态投影（纯函数）。
 */

import type { DeviceFlowReplayEvent } from "../../events";
import type { FlowRunConclusion, Locator } from "./flowFormat";

export type ReplayStepViewStatus = "pending" | "running" | "passed" | "failed" | "blocked" | "healed";

export interface ReplayStepView {
  index: number;
  op: string;
  status: ReplayStepViewStatus;
  locatorKind?: string;
  screenshot?: string;
  assertOk?: boolean;
  assertReason?: string;
  durationMs?: number;
  healingReason?: string;
  healedLocator?: Locator;
}

export interface ReplayState {
  status: "idle" | "running" | "done";
  steps: ReplayStepView[];
  conclusion: FlowRunConclusion | null;
  healingTriggered: boolean;
  llmTokenUsed: number;
  summary: string;
  errorMessage: string;
}

export const initialReplayState: ReplayState = {
  status: "idle",
  steps: [],
  conclusion: null,
  healingTriggered: false,
  llmTokenUsed: 0,
  summary: "",
  errorMessage: "",
};

function upsertStep(
  steps: ReplayStepView[],
  index: number,
  patch: Partial<ReplayStepView>,
): ReplayStepView[] {
  const existing = steps.find((s) => s.index === index);
  if (existing) {
    return steps.map((s) => {
      if (s.index !== index) {
        return s;
      }
      const status: ReplayStepViewStatus = patch.status ?? s.status;
      return { ...s, ...patch, status };
    });
  }
  const status: ReplayStepViewStatus = patch.status ?? "pending";
  const next: ReplayStepView = {
    ...patch,
    index,
    op: patch.op ?? "unknown",
    status,
  };
  return [...steps, next].sort((a, b) => a.index - b.index);
}

export function reduceReplayEvent(
  state: ReplayState,
  event: DeviceFlowReplayEvent,
): ReplayState {
  switch (event.type) {
    case "step":
      return {
        ...state,
        status: "running",
        steps: upsertStep(state.steps, event.index, {
          op: event.op,
          status: "running",
        }),
      };
    case "locating":
      return {
        ...state,
        steps: upsertStep(state.steps, event.index, {
          locatorKind: event.locatorKind,
        }),
      };
    case "screenshot":
      return {
        ...state,
        steps: upsertStep(state.steps, event.index, {
          screenshot: `data:${event.mediaType};base64,${event.imageBase64}`,
        }),
      };
    case "healing":
      return {
        ...state,
        steps: upsertStep(state.steps, event.index, {
          healingReason: event.reason,
        }),
      };
    case "healed":
      return {
        ...state,
        steps: upsertStep(state.steps, event.index, {
          status: "healed",
          healedLocator: event.healedLocator,
        }),
      };
    case "assert":
      return {
        ...state,
        steps: upsertStep(state.steps, event.index, {
          assertOk: event.ok,
          assertReason: event.reason,
        }),
      };
    case "result":
      return {
        ...state,
        steps: upsertStep(state.steps, event.index, {
          status: event.status,
          durationMs: event.durationMs,
        }),
      };
    case "done":
      return {
        ...state,
        status: "done",
        conclusion: event.conclusion,
        healingTriggered: event.healingTriggered,
        llmTokenUsed: event.llmTokenUsed,
        summary: event.summary,
      };
    case "error":
      return {
        ...state,
        errorMessage: event.message,
      };
    case "exit":
      return state;
    default: {
      const _exhaustive: never = event;
      return state;
    }
  }
}
