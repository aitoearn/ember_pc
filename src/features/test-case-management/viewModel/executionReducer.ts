/**
 * 执行编排纯函数层（US3）。
 *
 * 把 UI Agent sidecar 的事件流（thought / action / screenshot / result / done…）
 * 折叠成可渲染的执行状态，并在结束时派生出可落库的 TestCaseRun。所有逻辑保持
 * 无副作用，便于 *.unit.test.ts 覆盖；React 侧只负责订阅事件与持久化。
 */

import type { UiAgentEvent } from "@/features/device-automation/events";
import type {
  TestCaseRun,
  TestCaseRunResult,
  TestCaseRunStep,
} from "../types";

/** 执行整体状态机。 */
export type ExecutionStatus =
  | "idle"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked";

/** 单步执行的可视化投影（screenshot 为 data URI，仅用于实时预览）。 */
export interface ExecutionStepView {
  stepNo: number;
  thought: string;
  action: string;
  screenshot: string;
  status: "running" | "completed";
  durationSec?: number;
}

export interface ExecutionState {
  status: ExecutionStatus;
  steps: ExecutionStepView[];
  summary: string;
  errorMessage: string;
}

export const initialExecutionState: ExecutionState = {
  status: "idle",
  steps: [],
  summary: "",
  errorMessage: "",
};

function upsertStep(
  steps: ExecutionStepView[],
  stepNo: number,
  patch: Partial<ExecutionStepView>,
): ExecutionStepView[] {
  const existing = steps.find((s) => s.stepNo === stepNo);
  if (existing) {
    return steps.map((s) => (s.stepNo === stepNo ? { ...s, ...patch } : s));
  }
  const created: ExecutionStepView = {
    stepNo,
    thought: "",
    action: "",
    screenshot: "",
    status: "running",
    ...patch,
  };
  return [...steps, created].sort((a, b) => a.stepNo - b.stepNo);
}

/** 把单个事件折叠进执行状态（不可变更新）。 */
export function reduceExecutionEvent(
  state: ExecutionState,
  event: UiAgentEvent,
): ExecutionState {
  switch (event.type) {
    case "step":
      return { ...state, steps: upsertStep(state.steps, event.step, {}) };
    case "thought":
      return {
        ...state,
        steps: upsertStep(state.steps, event.step, { thought: event.text }),
      };
    case "action":
      return {
        ...state,
        steps: upsertStep(state.steps, event.step, { action: event.text }),
      };
    case "screenshot":
      return {
        ...state,
        steps: upsertStep(state.steps, event.step, {
          screenshot: `data:${event.mediaType};base64,${event.imageBase64}`,
        }),
      };
    case "result":
      return {
        ...state,
        steps: upsertStep(state.steps, event.step, {
          status: "completed",
          durationSec: Math.round(event.durationMs / 100) / 10,
        }),
      };
    case "done":
      return {
        ...state,
        status: event.success ? "succeeded" : "failed",
        summary: event.finalMessage || event.reason || state.summary,
        errorMessage: event.success ? "" : event.finalMessage || event.reason,
      };
    case "error":
      return {
        ...state,
        status: "failed",
        errorMessage: event.message,
        summary: state.summary || event.message,
      };
    case "exit":
      if (event.code !== 0 && state.status === "running") {
        return {
          ...state,
          status: "blocked",
          errorMessage: `UI Agent 进程异常退出（code=${event.code}）`,
        };
      }
      return state;
    case "log":
    default:
      return state;
  }
}

/** 把状态机结果映射为用例执行判定。 */
export function deriveRunResult(status: ExecutionStatus): TestCaseRunResult {
  switch (status) {
    case "succeeded":
      return "通过";
    case "failed":
      return "失败";
    case "idle":
    case "running":
    case "blocked":
      return "阻塞";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/** 执行是否已进入终态（可落库）。 */
export function isTerminal(status: ExecutionStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "blocked";
}

function stepToRunStep(
  runId: string,
  view: ExecutionStepView,
  ts: string,
): TestCaseRunStep {
  const observation = [view.thought, view.action]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
  return {
    id: `${runId}-${view.stepNo}`,
    runId,
    stepNo: view.stepNo,
    observation,
    screenshotPath: "",
    ts,
  };
}

export interface BuildRunArgs {
  id: string;
  caseId: string;
  deviceId: string;
  instruction: string;
  startedAt: string;
  finishedAt: string;
  state: ExecutionState;
}

/** 从执行状态派生出可落库的执行记录。 */
export function buildRunRecord(args: BuildRunArgs): TestCaseRun {
  const result = deriveRunResult(args.state.status);
  return {
    id: args.id,
    caseId: args.caseId,
    deviceId: args.deviceId,
    instruction: args.instruction,
    result,
    summary: args.state.summary,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    steps: args.state.steps.map((view) =>
      stepToRunStep(args.id, view, args.finishedAt),
    ),
  };
}
