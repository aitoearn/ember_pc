/**
 * VLM UI Agent 事件流 → 确定性流步骤的纯投影。
 *
 * 消费 `UiAgentEvent`（thought / action / screenshot / result），将 sidecar 动作名
 *（click / type / swipe / open_app / press_back …）映射为 `FlowStep[]`。
 * 定位信息优先从 action.args 中的确定性字段提取；坐标类动作回落为 vlm_anchor（0–1000）。
 */

import type { UiAgentEvent } from "../../events";
import type { FlowOp, FlowStep, Locator } from "./flowFormat";
import { sortLocatorsByPriority } from "./flowFormat";

/** 投影可选上下文：包名、屏幕尺寸（像素坐标 → 归一化锚点）。 */
export interface RecordingProjectionOptions {
  /** launch_app / open_app 缺省包名（来自任务 packageName）。 */
  appPackage?: string;
  /** 屏幕宽（像素），缺省 1080（与 ui-agent sidecar 默认一致）。 */
  screenWidth?: number;
  /** 屏幕高（像素），缺省 2400。 */
  screenHeight?: number;
}

/** 单步录制草稿（按 sidecar step 序号聚合）。 */
interface StepDraft {
  stepNo: number;
  thought?: string;
  actionName?: string;
  actionArgs?: Record<string, unknown>;
  actionText?: string;
}

/** 折叠 UiAgentEvent 时的可变状态。 */
export interface RecordingProjectionState {
  drafts: Map<number, StepDraft>;
  /** 已投影步骤，key 为 sidecar step 序号（1-based）。 */
  stepsByStepNo: Map<number, FlowStep>;
  options: RecordingProjectionOptions;
}

const DEFAULT_SCREEN_WIDTH = 1080;
const DEFAULT_SCREEN_HEIGHT = 2400;

export const initialRecordingProjectionState = (
  options: RecordingProjectionOptions = {},
): RecordingProjectionState => ({
  drafts: new Map(),
  stepsByStepNo: new Map(),
  options,
});

/** 从 action 事件批量投影（便利函数）。 */
export function projectUiAgentEventsToFlowSteps(
  events: UiAgentEvent[],
  options: RecordingProjectionOptions = {},
): FlowStep[] {
  let state = initialRecordingProjectionState(options);
  for (const event of events) {
    state = reduceRecordingProjectionEvent(state, event);
  }
  return recordingProjectionStateToFlowSteps(state);
}

/** 把单个 UiAgentEvent 折叠进投影状态（不可变更新）。 */
export function reduceRecordingProjectionEvent(
  state: RecordingProjectionState,
  event: UiAgentEvent,
): RecordingProjectionState {
  switch (event.type) {
    case "step":
      return upsertDraft(state, event.step, {});
    case "thought":
      return upsertDraft(state, event.step, { thought: event.text });
    case "action": {
      const draft = getOrCreateDraft(state, event.step);
      const mergedDraft: StepDraft = {
        ...draft,
        thought: draft.thought,
        actionName: event.name,
        actionArgs: event.args,
        actionText: event.text,
      };
      const flowStep = mapActionToFlowStep(
        event.step,
        mergedDraft,
        state.options,
      );
      const drafts = new Map(state.drafts);
      drafts.set(event.step, mergedDraft);
      if (!flowStep) {
        return { ...state, drafts };
      }
      const stepsByStepNo = new Map(state.stepsByStepNo);
      stepsByStepNo.set(event.step, flowStep);
      return { ...state, drafts, stepsByStepNo };
    }
    case "screenshot":
    case "result":
    case "done":
    case "error":
    case "exit":
    case "log":
      return state;
    default: {
      const _exhaustive: never = event;
      return state;
    }
  }
}

/** 导出有序 FlowStep[]，index 从 0 连续重编号。 */
export function recordingProjectionStateToFlowSteps(
  state: RecordingProjectionState,
): FlowStep[] {
  const stepNos = [...state.stepsByStepNo.keys()].sort((a, b) => a - b);
  return stepNos.map((stepNo, index) => {
    const step = state.stepsByStepNo.get(stepNo)!;
    return { ...step, index };
  });
}

function upsertDraft(
  state: RecordingProjectionState,
  stepNo: number,
  patch: Partial<StepDraft>,
): RecordingProjectionState {
  const draft = getOrCreateDraft(state, stepNo);
  const drafts = new Map(state.drafts);
  drafts.set(stepNo, { ...draft, ...patch });
  return { ...state, drafts };
}

function getOrCreateDraft(state: RecordingProjectionState, stepNo: number): StepDraft {
  const existing = state.drafts.get(stepNo);
  if (existing) {
    return existing;
  }
  return { stepNo };
}

function resolveScreenSize(options: RecordingProjectionOptions): {
  width: number;
  height: number;
} {
  const width =
    Number.isFinite(options.screenWidth) && options.screenWidth! > 0
      ? options.screenWidth!
      : DEFAULT_SCREEN_WIDTH;
  const height =
    Number.isFinite(options.screenHeight) && options.screenHeight! > 0
      ? options.screenHeight!
      : DEFAULT_SCREEN_HEIGHT;
  return { width, height };
}

function readStringArg(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumberArg(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

/** 像素坐标转 qwen3 归一化 0–1000（与 ui-agent sidecar 互逆）。 */
function pixelToNorm(
  x: number,
  y: number,
  width: number,
  height: number,
): { xNorm: number; yNorm: number } {
  return {
    xNorm: Math.round((x * 1000) / width),
    yNorm: Math.round((y * 1000) / height),
  };
}

function buildVlmAnchorLocator(
  x: number,
  y: number,
  options: RecordingProjectionOptions,
): Locator {
  const { width, height } = resolveScreenSize(options);
  const { xNorm, yNorm } = pixelToNorm(x, y, width, height);
  return {
    kind: "vlm_anchor",
    value: `${xNorm},${yNorm}`,
    vlmAnchor: { xNorm, yNorm },
  };
}

/**
 * 从 action.args 提取多策略 locator。
 * 支持 sidecar 未来扩展的 resourceId / text / accessibilityId / uiTreePath 字段。
 */
function buildLocatorsFromActionArgs(
  args: Record<string, unknown>,
  options: RecordingProjectionOptions,
): Locator[] {
  const locators: Locator[] = [];

  const resourceId =
    readStringArg(args, "resourceId") ?? readStringArg(args, "resource_id");
  if (resourceId) {
    locators.push({ kind: "resource_id", value: resourceId });
  }

  const text = readStringArg(args, "text");
  if (text) {
    locators.push({ kind: "text", value: text, match: "contains" });
  }

  const accessibilityId =
    readStringArg(args, "accessibilityId") ?? readStringArg(args, "accessibility_id");
  if (accessibilityId) {
    locators.push({ kind: "accessibility_id", value: accessibilityId });
  }

  const uiTreePath =
    readStringArg(args, "uiTreePath") ?? readStringArg(args, "ui_tree_path");
  if (uiTreePath) {
    locators.push({ kind: "ui_tree_path", value: uiTreePath });
  }

  const x = readNumberArg(args, "x");
  const y = readNumberArg(args, "y");
  if (x !== undefined && y !== undefined) {
    locators.push(buildVlmAnchorLocator(x, y, options));
  }

  return sortLocatorsByPriority(locators);
}

function mapActionToFlowStep(
  stepNo: number,
  draft: StepDraft,
  options: RecordingProjectionOptions,
): FlowStep | null {
  const name = draft.actionName;
  if (!name) {
    return null;
  }
  const args = draft.actionArgs ?? {};
  const intent = draft.thought?.trim() || undefined;
  // 输出 index 在 recordingProjectionStateToFlowSteps 中重编号；此处用 stepNo 占位。
  const index = stepNo;

  switch (name) {
    case "click":
      return {
        index,
        op: "tap",
        locators: buildLocatorsFromActionArgs(args, options),
        intent,
      };
    case "long_press": {
      const longPressMs = readNumberArg(args, "time");
      const step: FlowStep = {
        index,
        op: "tap",
        locators: buildLocatorsFromActionArgs(args, options),
        intent,
      };
      if (longPressMs !== undefined) {
        step.args = { longPressMs: Math.round(longPressMs * 1000) };
      }
      return step;
    }
    case "swipe":
      return {
        index,
        op: "swipe",
        locators: buildLocatorsFromActionArgs(args, options),
        args: {
          direction: readStringArg(args, "direction") ?? "up",
          distance: readNumberArg(args, "distance") ?? 800,
        },
        intent,
      };
    case "type": {
      const text = readStringArg(args, "content") ?? "";
      const locators = buildLocatorsFromActionArgs(args, options);
      // 无坐标时，用输入内容作为 text 定位兜底（聚焦输入框场景）。
      if (locators.length === 0 && text) {
        locators.push({ kind: "text", value: text, match: "contains" });
      }
      return {
        index,
        op: "input_text",
        locators,
        args: { text },
        intent,
      };
    }
    case "open_app": {
      const packageName =
        options.appPackage?.trim() ||
        readStringArg(args, "package") ||
        readStringArg(args, "content") ||
        readStringArg(args, "app_name");
      return {
        index,
        op: "launch_app",
        args: packageName ? { package: packageName } : undefined,
        intent,
      };
    }
    case "press_back":
      return { index, op: "back", intent };
    case "wait":
      return { index, op: "wait", intent };
    case "finished":
    case "press_home":
      return null;
    default:
      return null;
  }
}

/** sidecar 动作名 → FlowOp（用于测试与诊断）。 */
export function mapUiAgentActionNameToFlowOp(name: string): FlowOp | null {
  switch (name) {
    case "click":
    case "long_press":
      return "tap";
    case "swipe":
      return "swipe";
    case "type":
      return "input_text";
    case "open_app":
      return "launch_app";
    case "press_back":
      return "back";
    case "wait":
      return "wait";
    default:
      return null;
  }
}
