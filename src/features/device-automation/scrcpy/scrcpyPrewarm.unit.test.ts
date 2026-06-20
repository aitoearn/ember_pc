// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetScrcpyPrewarmStateForTests,
  scheduleScrcpyPrewarmForDevice,
  scheduleScrcpyPrewarmForDevices,
  shouldPrewarmScrcpyDevice,
} from "./scrcpyPrewarm";
import type { DeviceAutomationCardModel } from "../types";

vi.mock("@/lib/api/deviceAutomation", () => ({
  prewarmDeviceAutomationScrcpy: vi.fn(() => Promise.resolve({ status: "scheduled" as const })),
}));

import { prewarmDeviceAutomationScrcpy } from "@/lib/api/deviceAutomation";

function androidDevice(id: string): DeviceAutomationCardModel {
  return {
    id,
    name: id,
    serial: id,
    platform: "android",
    agentPlatform: "android",
    status: "online",
    brand: "Huawei",
    model: "Test",
    system: "Android 14",
    resolution: "1080x2400",
    group: "—",
    space: "—",
    connectionType: "usb",
  };
}

describe("scrcpyPrewarm", () => {
  beforeEach(() => {
    resetScrcpyPrewarmStateForTests();
    vi.mocked(prewarmDeviceAutomationScrcpy).mockClear();
  });

  it("shouldPrewarmScrcpyDevice 仅匹配在线 Android", () => {
    expect(shouldPrewarmScrcpyDevice(androidDevice("a"))).toBe(true);
    expect(
      shouldPrewarmScrcpyDevice({ ...androidDevice("b"), status: "offline" }),
    ).toBe(false);
    expect(
      shouldPrewarmScrcpyDevice({ ...androidDevice("c"), platform: "ios" }),
    ).toBe(false);
  });

  it("同一设备只触发一次预热", async () => {
    scheduleScrcpyPrewarmForDevice("emulator-5554");
    scheduleScrcpyPrewarmForDevice("emulator-5554");
    await Promise.resolve();
    expect(prewarmDeviceAutomationScrcpy).toHaveBeenCalledTimes(1);
  });

  it("scheduleScrcpyPrewarmForDevices 默认最多预热 3 台", async () => {
    scheduleScrcpyPrewarmForDevices([
      androidDevice("d1"),
      androidDevice("d2"),
      androidDevice("d3"),
      androidDevice("d4"),
    ]);
    await Promise.resolve();
    expect(prewarmDeviceAutomationScrcpy).toHaveBeenCalledTimes(3);
  });
});
