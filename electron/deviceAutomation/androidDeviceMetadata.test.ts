import { describe, expect, it } from "vitest";
import {
  parseAndroidDisplaySize,
  parseAndroidMetadataShellOutput,
} from "./androidDeviceMetadata";

describe("parseAndroidDisplaySize", () => {
  it("解析 Physical size", () => {
    expect(
      parseAndroidDisplaySize("Physical size: 1224x2700\nOverride size: 1080x2400"),
    ).toBe("1224x2700");
  });

  it("无 Physical 时使用 Override", () => {
    expect(parseAndroidDisplaySize("Override size: 1080x2400")).toBe("1080x2400");
  });

  it("支持直接宽高格式", () => {
    expect(parseAndroidDisplaySize("1080x2400")).toBe("1080x2400");
  });
});

describe("parseAndroidMetadataShellOutput", () => {
  it("按行解析 adb 批量输出", () => {
    expect(
      parseAndroidMetadataShellOutput(
        "HUAWEI\nHUAWEI\nHBP-AL00\n12\nPhysical size: 1224x2700",
      ),
    ).toEqual({
      brand: "HUAWEI",
      manufacturer: "HUAWEI",
      model: "HBP-AL00",
      platformVersion: "12",
      resolution: "1224x2700",
    });
  });
});
