import type {
  FlowRunConclusion,
  FlowRunStepStatus,
  Locator,
} from "./flow/domain/flowFormat";

export const DEVICE_AUTOMATION_INVENTORY_CHANGED_EVENT =
  "device_automation_inventory_changed";

export type DeviceAutomationInventoryChangedPayload = {
  source: "adb-track-devices" | "agent-device-daemon";
  changedAt: string;
};

/** UI Agent 事件桥前缀，渲染层 safeListen(`uiAgent:event:<taskId>`) 订阅。 */
export function uiAgentEventChannel(taskId: string): string {
  return `uiAgent:event:${taskId}`;
}

/** sidecar 通过 stdout 推送、经事件桥转发到渲染层的步骤事件。 */
export type UiAgentEvent =
  | { taskId: string; type: "step"; step: number; status: "running" }
  | {
      taskId: string;
      type: "screenshot";
      step: number;
      imageBase64: string;
      mediaType: string;
    }
  | { taskId: string; type: "thought"; step: number; text: string }
  | {
      taskId: string;
      type: "action";
      step: number;
      name: string;
      args: Record<string, unknown>;
      text: string;
    }
  | {
      taskId: string;
      type: "result";
      step: number;
      status: "completed";
      durationMs: number;
    }
  | {
      taskId: string;
      type: "done";
      success: boolean;
      reason: string;
      finalMessage: string;
    }
  | { taskId: string; type: "error"; message: string }
  | { taskId: string; type: "exit"; code: number }
  | { taskId: string; type: "log"; message: string };

/** 确定性回放事件桥前缀，渲染层 safeListen(`deviceFlow:replay:event:<runId>`) 订阅。 */
export function deviceFlowReplayEventChannel(runId: string): string {
  return `deviceFlow:replay:event:${runId}`;
}

/** sidecar 回放运行时经 stdout 推送、由事件桥转发到渲染层的步骤事件。 */
export type DeviceFlowReplayEvent =
  | { runId: string; type: "step"; index: number; op: string; status: "running" }
  // 当前尝试的定位策略
  | { runId: string; type: "locating"; index: number; locatorKind: string }
  | {
      runId: string;
      type: "screenshot";
      index: number;
      imageBase64: string;
      mediaType: string;
    }
  // 进入自愈（降级 VLM）
  | { runId: string; type: "healing"; index: number; reason: string }
  // 自愈成功，待生成修订
  | { runId: string; type: "healed"; index: number; healedLocator: Locator }
  | { runId: string; type: "assert"; index: number; ok: boolean; reason?: string }
  | {
      runId: string;
      type: "result";
      index: number;
      status: FlowRunStepStatus;
      durationMs: number;
    }
  | {
      runId: string;
      type: "done";
      conclusion: FlowRunConclusion;
      healingTriggered: boolean;
      llmTokenUsed: number;
      summary: string;
    }
  | { runId: string; type: "error"; message: string }
  | { runId: string; type: "exit"; code: number };
