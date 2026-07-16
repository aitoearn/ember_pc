import { describe, expect, it } from "vitest";

import type { UiAgentEvent } from "../../events";
import {
  initialRecordingProjectionState,
  mapUiAgentActionNameToFlowOp,
  projectUiAgentEventsToFlowSteps,
  reduceRecordingProjectionEvent,
  recordingProjectionStateToFlowSteps,
} from "./recordingProjection";

const TASK_ID = "task-1";

function actionEvent(
  step: number,
  name: string,
  args: Record<string, unknown>,
  text?: string,
): UiAgentEvent {
  return {
    taskId: TASK_ID,
    type: "action",
    step,
    name,
    args,
    text: text ?? `${name}(...)`,
  };
}

function thoughtEvent(step: number, text: string): UiAgentEvent {
  return { taskId: TASK_ID, type: "thought", step, text };
}

describe("mapUiAgentActionNameToFlowOp", () => {
  it("映射 tap / input / swipe / launch / back / wait", () => {
    expect(mapUiAgentActionNameToFlowOp("click")).toBe("tap");
    expect(mapUiAgentActionNameToFlowOp("long_press")).toBe("tap");
    expect(mapUiAgentActionNameToFlowOp("type")).toBe("input_text");
    expect(mapUiAgentActionNameToFlowOp("swipe")).toBe("swipe");
    expect(mapUiAgentActionNameToFlowOp("open_app")).toBe("launch_app");
    expect(mapUiAgentActionNameToFlowOp("press_back")).toBe("back");
    expect(mapUiAgentActionNameToFlowOp("wait")).toBe("wait");
    expect(mapUiAgentActionNameToFlowOp("finished")).toBeNull();
  });
});

describe("projectUiAgentEventsToFlowSteps", () => {
  const screen = { screenWidth: 1080, screenHeight: 2400 };

  it("click → tap + vlm_anchor（像素转 0–1000）+ intent", () => {
    const events: UiAgentEvent[] = [
      thoughtEvent(1, "点击设置图标进入设置页"),
      actionEvent(1, "click", { x: 540, y: 1200 }, "click(point='540,1200')"),
    ];
    const steps = projectUiAgentEventsToFlowSteps(events, screen);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      index: 0,
      op: "tap",
      intent: "点击设置图标进入设置页",
    });
    expect(steps[0].locators).toEqual([
      {
        kind: "vlm_anchor",
        value: "500,500",
        vlmAnchor: { xNorm: 500, yNorm: 500 },
      },
    ]);
  });

  it("type → input_text + text 参数与定位", () => {
    const events: UiAgentEvent[] = [
      thoughtEvent(2, "在搜索框输入 WiFi"),
      actionEvent(2, "type", { content: "WiFi", x: 100, y: 200 }),
    ];
    const steps = projectUiAgentEventsToFlowSteps(events, screen);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      index: 0,
      op: "input_text",
      args: { text: "WiFi" },
      intent: "在搜索框输入 WiFi",
    });
    expect(steps[0].locators?.some((l) => l.kind === "vlm_anchor")).toBe(true);
  });

  it("swipe → swipe + direction/distance + 起点锚点", () => {
    const events: UiAgentEvent[] = [
      thoughtEvent(3, "向上滑动查看更多"),
      actionEvent(3, "swipe", {
        x: 540,
        y: 1800,
        direction: "up",
        distance: 600,
      }),
    ];
    const steps = projectUiAgentEventsToFlowSteps(events, screen);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      index: 0,
      op: "swipe",
      args: { direction: "up", distance: 600 },
      intent: "向上滑动查看更多",
    });
    expect(steps[0].locators?.[0]?.kind).toBe("vlm_anchor");
  });

  it("open_app → launch_app，优先 options.appPackage", () => {
    const events: UiAgentEvent[] = [
      thoughtEvent(1, "打开目标应用"),
      actionEvent(1, "open_app", { content: "ignored" }),
    ];
    const steps = projectUiAgentEventsToFlowSteps(events, {
      appPackage: "com.example.target",
    });
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      index: 0,
      op: "launch_app",
      args: { package: "com.example.target" },
      intent: "打开目标应用",
    });
  });

  it("press_back → back", () => {
    const events: UiAgentEvent[] = [
      thoughtEvent(4, "返回上一页"),
      actionEvent(4, "press_back", {}),
    ];
    const steps = projectUiAgentEventsToFlowSteps(events);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      index: 0,
      op: "back",
      intent: "返回上一页",
    });
    expect(steps[0].locators).toBeUndefined();
  });

  it("多步事件按 step 序号排序并连续重编号 index", () => {
    const events: UiAgentEvent[] = [
      thoughtEvent(1, "第一步"),
      actionEvent(1, "click", { x: 100, y: 200 }),
      thoughtEvent(2, "第二步"),
      actionEvent(2, "press_back", {}),
      { taskId: TASK_ID, type: "done", success: true, reason: "ok", finalMessage: "完成" },
    ];
    const steps = projectUiAgentEventsToFlowSteps(events, screen);
    expect(steps).toHaveLength(2);
    expect(steps[0].index).toBe(0);
    expect(steps[0].op).toBe("tap");
    expect(steps[1].index).toBe(1);
    expect(steps[1].op).toBe("back");
  });

  it("确定性 locator 字段优先于 vlm_anchor 且按优先级排序", () => {
    const events: UiAgentEvent[] = [
      actionEvent(1, "click", {
        x: 540,
        y: 1200,
        resource_id: "btn_ok",
        text: "确定",
      }),
    ];
    const steps = projectUiAgentEventsToFlowSteps(events, screen);
    expect(steps[0].locators?.map((l) => l.kind)).toEqual([
      "resource_id",
      "text",
      "vlm_anchor",
    ]);
  });
});

describe("reduceRecordingProjectionEvent", () => {
  it("thought 先于 action 时 intent 正确合并", () => {
    let state = initialRecordingProjectionState({ screenWidth: 1080, screenHeight: 2400 });
    state = reduceRecordingProjectionEvent(state, thoughtEvent(1, "稍后合并的思考"));
    state = reduceRecordingProjectionEvent(
      state,
      actionEvent(1, "wait", {}),
    );
    const steps = recordingProjectionStateToFlowSteps(state);
    expect(steps[0].intent).toBe("稍后合并的思考");
    expect(steps[0].op).toBe("wait");
  });
});
