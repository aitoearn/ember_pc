import { describe, expect, it } from "vitest";

import {
  buildManualBackStep,
  buildManualSwipeStep,
  buildManualTapStep,
  inferSwipeDirection,
  mergeFlowStepDrafts,
  reindexFlowSteps,
} from "./manualRecordingProjection";

describe("inferSwipeDirection", () => {
  it("按主方向推断 up/down/left/right", () => {
    expect(inferSwipeDirection(0, -100)).toBe("up");
    expect(inferSwipeDirection(0, 100)).toBe("down");
    expect(inferSwipeDirection(-80, 10)).toBe("left");
    expect(inferSwipeDirection(80, 10)).toBe("right");
  });
});

describe("buildManualTapStep", () => {
  it("像素坐标转 vlm_anchor（1080×2400）", () => {
    const step = buildManualTapStep(0, 540, 1200, {
      width: 1080,
      height: 2400,
    });
    expect(step.op).toBe("tap");
    expect(step.locators?.[0]).toMatchObject({
      kind: "vlm_anchor",
      value: "500,500",
      vlmAnchor: { xNorm: 500, yNorm: 500 },
    });
  });
});

describe("buildManualSwipeStep", () => {
  it("含方向、距离与起点锚点", () => {
    const step = buildManualSwipeStep(1, 540, 1800, 540, 1200, {
      width: 1080,
      height: 2400,
    });
    expect(step.op).toBe("swipe");
    expect(step.args).toMatchObject({ direction: "up", distance: 600 });
    expect(step.locators?.[0]?.kind).toBe("vlm_anchor");
  });
});

describe("buildManualBackStep", () => {
  it("映射为 back 操作", () => {
    expect(buildManualBackStep(2).op).toBe("back");
  });
});

describe("reindexFlowSteps / mergeFlowStepDrafts", () => {
  it("连续重编号", () => {
    const merged = mergeFlowStepDrafts(
      [buildManualBackStep(5)],
      [buildManualTapStep(9, 10, 20)],
    );
    expect(merged.map((s) => s.index)).toEqual([0, 1]);
    expect(reindexFlowSteps([{ index: 3, op: "wait" }])[0].index).toBe(0);
  });
});
