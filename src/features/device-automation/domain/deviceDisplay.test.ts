import { describe, expect, it } from "vitest";
import { formatDeviceSpace, formatDeviceSystemLine } from "./deviceDisplay";

describe("formatDeviceSystemLine", () => {
  it("无版本时只显示平台", () => {
    expect(formatDeviceSystemLine("android")).toBe("Android");
  });

  it("有版本时拼接平台与版本", () => {
    expect(formatDeviceSystemLine("android", "12")).toBe("Android 12");
  });
});

describe("formatDeviceSpace", () => {
  it("映射常见 target", () => {
    expect(formatDeviceSpace("mobile")).toBe("移动设备");
    expect(formatDeviceSpace("tv")).toBe("电视");
    expect(formatDeviceSpace("desktop")).toBe("桌面");
  });

  it("未知 target 原样返回", () => {
    expect(formatDeviceSpace("lab-a")).toBe("lab-a");
  });
});
