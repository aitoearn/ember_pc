import { describe, expect, it } from "vitest";
import { inferDeviceBrand, normalizeBrandLabel } from "./deviceBrand";

describe("inferDeviceBrand", () => {
  it("优先使用 adb brand 属性并映射为中文", () => {
    expect(
      inferDeviceBrand({
        name: "HBP AL00",
        brand: "HUAWEI",
      }),
    ).toBe("华为");
  });

  it("名称含 HUAWEI 时识别为华为", () => {
    expect(
      inferDeviceBrand({
        name: "HUAWEI HBP-AL00",
      }),
    ).toBe("华为");
  });

  it("仅有机型代号 HBP 时识别为华为", () => {
    expect(
      inferDeviceBrand({
        name: "HBP AL00",
      }),
    ).toBe("华为");
  });

  it("manufacturer 可作为品牌兜底", () => {
    expect(
      inferDeviceBrand({
        name: "未知设备",
        manufacturer: "Xiaomi",
      }),
    ).toBe("小米");
  });

  it("无匹配时返回首词", () => {
    expect(
      inferDeviceBrand({
        name: "Nexus 5",
      }),
    ).toBe("Nexus");
  });
});

describe("normalizeBrandLabel", () => {
  it("映射常见英文品牌", () => {
    expect(normalizeBrandLabel("huawei")).toBe("华为");
    expect(normalizeBrandLabel("HONOR")).toBe("荣耀");
  });
});
