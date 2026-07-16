import { describe, expect, it } from "vitest";

import {
  DEVICE_AUTOMATION_CAPABILITY_KEYS,
  DEVICE_AUTOMATION_EXAMPLE_PROMPT_KEYS,
  isDeviceAutomationExecutionMode,
  isDeviceAutomationPerceptionKernel,
  resolveDevicePlatformBadgeClassName,
  resolveDevicePlatformLabelKey,
} from "./workbenchPresentation";

describe("workbenchPresentation", () => {
  it("应暴露四块能力卡片文案 key", () => {
    expect(DEVICE_AUTOMATION_CAPABILITY_KEYS).toHaveLength(4);
  });

  it("应暴露三条示例用例 prompt key", () => {
    expect(DEVICE_AUTOMATION_EXAMPLE_PROMPT_KEYS).toHaveLength(3);
  });

  it("应按平台返回 i18n label key", () => {
    expect(resolveDevicePlatformLabelKey("android")).toBe(
      "deviceAutomation.platform.android",
    );
    expect(resolveDevicePlatformLabelKey("ios")).toBe(
      "deviceAutomation.platform.ios",
    );
    expect(resolveDevicePlatformLabelKey("harmony")).toBe(
      "deviceAutomation.platform.harmony",
    );
  });

  it("应为三端平台返回区分色 badge class", () => {
    expect(resolveDevicePlatformBadgeClassName("android")).toContain("emerald");
    expect(resolveDevicePlatformBadgeClassName("ios")).toContain("slate");
    expect(resolveDevicePlatformBadgeClassName("harmony")).toContain("red");
  });

  it("应校验执行模式与感知内核枚举", () => {
    expect(isDeviceAutomationExecutionMode("flexible")).toBe(true);
    expect(isDeviceAutomationExecutionMode("strict")).toBe(true);
    expect(isDeviceAutomationExecutionMode("script")).toBe(false);
    expect(isDeviceAutomationPerceptionKernel("hybrid")).toBe(true);
    expect(isDeviceAutomationPerceptionKernel("xml")).toBe(false);
  });
});
