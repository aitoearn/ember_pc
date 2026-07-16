import { describe, expect, it } from "vitest";

import { deviceFlowRecordRuntime } from "./deviceFlowRecord";

describe("deviceFlowRecordRuntime", () => {
  it("start/stop 返回 tap + swipe + back 步骤", () => {
    const { recordId } = deviceFlowRecordRuntime.start({
      recordId: "rec-1",
      deviceId: "dev-1",
      serial: "serial-1",
      screenWidth: 1080,
      screenHeight: 2400,
    });

    deviceFlowRecordRuntime.recordTapIfActive({
      deviceId: "dev-1",
      x: 540,
      y: 1200,
    });
    deviceFlowRecordRuntime.recordSwipeIfActive({
      deviceId: "dev-1",
      x1: 540,
      y1: 1800,
      x2: 540,
      y2: 1200,
    });
    deviceFlowRecordRuntime.recordNavigationIfActive({
      deviceId: "dev-1",
      action: "back",
    });

    const { steps } = deviceFlowRecordRuntime.stop({ recordId });
    expect(steps).toHaveLength(3);
    expect(steps[0].op).toBe("tap");
    expect(steps[1].op).toBe("swipe");
    expect(steps[2].op).toBe("back");
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it("同设备重复 start 抛错", () => {
    deviceFlowRecordRuntime.start({
      recordId: "rec-a",
      deviceId: "dev-x",
      serial: "",
    });
    expect(() =>
      deviceFlowRecordRuntime.start({
        recordId: "rec-b",
        deviceId: "dev-x",
        serial: "",
      }),
    ).toThrow(/已有进行中的手动录制/);
    deviceFlowRecordRuntime.stop({ recordId: "rec-a" });
  });
});
