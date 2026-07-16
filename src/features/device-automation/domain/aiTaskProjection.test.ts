import { describe, expect, it } from "vitest";
import {
  isTerminalAiTaskStatus,
  projectGenieStepsFromEvents,
} from "./aiTaskProjection";

describe("aiTaskProjection", () => {
  it("应将 step 事件映射为 Genie 步骤", () => {
    const steps = projectGenieStepsFromEvents([
      {
        task_id: "task-1",
        seq: 1,
        event_type: "step",
        role: "assistant",
        payload: {
          step: 1,
          thinking: "先打开设置",
          action: "open_settings",
        },
        created_at: "2026-06-15T00:00:00.000Z",
      },
    ]);

    expect(steps).toEqual([
      {
        index: 1,
        desc: "open_settings",
        status: "completed",
        thought: "先打开设置",
        action: "open_settings",
      },
    ]);
  });

  it("应识别终止任务状态", () => {
    expect(isTerminalAiTaskStatus("SUCCEEDED")).toBe(true);
    expect(isTerminalAiTaskStatus("RUNNING")).toBe(false);
  });
});
