import { describe, expect, it } from "vitest";
import type { UiAgentEvent } from "@/features/device-automation/events";
import {
  buildRunRecord,
  deriveRunResult,
  initialExecutionState,
  isTerminal,
  reduceExecutionEvent,
  type ExecutionState,
} from "./executionReducer";

const TASK = "task-1";

function fold(events: UiAgentEvent[]): ExecutionState {
  return events.reduce(reduceExecutionEvent, initialExecutionState);
}

describe("executionReducer", () => {
  it("按步骤折叠 thought/action/screenshot/result", () => {
    const state = fold([
      { taskId: TASK, type: "step", step: 1, status: "running" },
      { taskId: TASK, type: "thought", step: 1, text: "需要点击登录" },
      {
        taskId: TASK,
        type: "action",
        step: 1,
        name: "tap",
        args: {},
        text: "tap(登录)",
      },
      {
        taskId: TASK,
        type: "screenshot",
        step: 1,
        imageBase64: "abc",
        mediaType: "image/png",
      },
      { taskId: TASK, type: "result", step: 1, status: "completed", durationMs: 1500 },
    ]);

    expect(state.steps).toHaveLength(1);
    const [step] = state.steps;
    expect(step.thought).toBe("需要点击登录");
    expect(step.action).toBe("tap(登录)");
    expect(step.screenshot).toBe("data:image/png;base64,abc");
    expect(step.status).toBe("completed");
    expect(step.durationSec).toBe(1.5);
  });

  it("多步骤乱序到达仍按 stepNo 升序合并", () => {
    const state = fold([
      { taskId: TASK, type: "thought", step: 2, text: "第二步" },
      { taskId: TASK, type: "thought", step: 1, text: "第一步" },
    ]);
    expect(state.steps.map((s) => s.stepNo)).toEqual([1, 2]);
  });

  it("done 成功 → succeeded 且摘要取 finalMessage", () => {
    const state = fold([
      { taskId: TASK, type: "step", step: 1, status: "running" },
      {
        taskId: TASK,
        type: "done",
        success: true,
        reason: "ok",
        finalMessage: "全部断言通过",
      },
    ]);
    expect(state.status).toBe("succeeded");
    expect(state.summary).toBe("全部断言通过");
    expect(deriveRunResult(state.status)).toBe("通过");
  });

  it("done 失败 → failed 且记录错误", () => {
    const state = fold([
      {
        taskId: TASK,
        type: "done",
        success: false,
        reason: "断言失败",
        finalMessage: "",
      },
    ]);
    expect(state.status).toBe("failed");
    expect(state.errorMessage).toBe("断言失败");
    expect(deriveRunResult(state.status)).toBe("失败");
  });

  it("运行中进程非零退出 → blocked", () => {
    const running = reduceExecutionEvent(initialExecutionState, {
      taskId: TASK,
      type: "step",
      step: 1,
      status: "running",
    });
    const state = reduceExecutionEvent(
      { ...running, status: "running" },
      { taskId: TASK, type: "exit", code: 1 },
    );
    expect(state.status).toBe("blocked");
    expect(deriveRunResult(state.status)).toBe("阻塞");
  });

  it("已终态后的 exit 0 不回退状态", () => {
    const done = fold([
      {
        taskId: TASK,
        type: "done",
        success: true,
        reason: "ok",
        finalMessage: "完成",
      },
    ]);
    const after = reduceExecutionEvent(done, {
      taskId: TASK,
      type: "exit",
      code: 0,
    });
    expect(after.status).toBe("succeeded");
  });

  it("isTerminal 仅在终态返回 true", () => {
    expect(isTerminal("idle")).toBe(false);
    expect(isTerminal("running")).toBe(false);
    expect(isTerminal("succeeded")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
    expect(isTerminal("blocked")).toBe(true);
  });

  it("buildRunRecord 拼装 observation 并剥离实时截图", () => {
    const state = fold([
      { taskId: TASK, type: "step", step: 1, status: "running" },
      { taskId: TASK, type: "thought", step: 1, text: "想法" },
      {
        taskId: TASK,
        type: "action",
        step: 1,
        name: "tap",
        args: {},
        text: "tap(x)",
      },
      {
        taskId: TASK,
        type: "screenshot",
        step: 1,
        imageBase64: "img",
        mediaType: "image/png",
      },
      {
        taskId: TASK,
        type: "done",
        success: true,
        reason: "ok",
        finalMessage: "完成",
      },
    ]);

    const run = buildRunRecord({
      id: "run-1",
      caseId: "case-1",
      deviceId: "dev-1",
      instruction: "执行登录",
      startedAt: "2026-06-17T00:00:00.000Z",
      finishedAt: "2026-06-17T00:01:00.000Z",
      state,
    });

    expect(run.result).toBe("通过");
    expect(run.summary).toBe("完成");
    expect(run.steps).toHaveLength(1);
    expect(run.steps[0].observation).toBe("想法\ntap(x)");
    expect(run.steps[0].screenshotPath).toBe("");
    expect(run.steps[0].id).toBe("run-1-1");
  });
});
