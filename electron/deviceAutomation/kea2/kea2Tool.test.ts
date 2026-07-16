import { describe, expect, it } from "vitest";
import { buildKea2RunCliArgs } from "./kea2Tool";

describe("kea2Tool", () => {
  it("构建 Kea2 run CLI 参数", () => {
    const args = buildKea2RunCliArgs({
      deviceId: "emulator-5554",
      packageName: "com.demo.app",
      outputDir: "/tmp/out",
      logStamp: "abc123",
      runningMinutes: 5,
      maxStep: 1000,
      throttleMs: 200,
      profilePeriod: 25,
      takeScreenshots: true,
      kea2PropertyScript: "properties/demo.py",
    });
    expect(args).toContain("run");
    expect(args).toContain("-s");
    expect(args).toContain("emulator-5554");
    expect(args).toContain("propertytest");
    expect(args).toContain("properties/demo.py");
    expect(args).toContain("--take-screenshots");
  });

  it("默认 discover properties 脚本", () => {
    const args = buildKea2RunCliArgs({
      deviceId: "d1",
      packageName: "com.app",
      outputDir: "/out",
      logStamp: "x",
      runningMinutes: 1,
      maxStep: 10,
      throttleMs: 0,
      profilePeriod: 10,
      takeScreenshots: false,
    });
    expect(args).toEqual(
      expect.arrayContaining(["propertytest", "discover", "-s", "properties", "-p", "*.py"]),
    );
  });
});
