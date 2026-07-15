import { describe, expect, it } from "vitest";
import { buildMonkeyShellArgs } from "./monkeyTest";
import { filterAndroidLogcatLines } from "./captureDeviceLogcat";

describe("buildMonkeyShellArgs", () => {
  it("拼装包名、节流、事件数与 seed", () => {
    const args = buildMonkeyShellArgs({
      deviceId: "emulator-5554",
      packageName: "com.example.app",
      eventCount: 500,
      throttleMs: 200,
      seed: 42,
    });
    expect(args).toContain("-p");
    expect(args).toContain("com.example.app");
    expect(args).toContain("--throttle");
    expect(args).toContain("200");
    expect(args).toContain("-s");
    expect(args).toContain("42");
    expect(args[args.length - 1]).toBe("500");
  });

  it("空包名抛错", () => {
    expect(() =>
      buildMonkeyShellArgs({
        deviceId: "d",
        packageName: "  ",
      }),
    ).toThrow("packageName");
  });
});

describe("filterAndroidLogcatLines", () => {
  it("按包名与 FATAL/ANR 关键词过滤", () => {
    const lines = [
      "01-01 00:00:00.000  1234  5678 I ActivityManager: Start proc com.demo.app",
      "01-01 00:00:01.000  1234  5678 E AndroidRuntime: FATAL EXCEPTION: main",
      "01-01 00:00:01.001  1234  5678 E AndroidRuntime: Process: com.demo.app",
      "01-01 00:00:02.000  1234  5678 I System.out: unrelated noise",
    ];
    const filtered = filterAndroidLogcatLines(lines, {
      packageName: "com.demo.app",
      maxLines: 10,
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((line) => line.includes("com.demo.app"))).toBe(true);
    expect(filtered.some((line) => line.includes("AndroidRuntime"))).toBe(true);
  });
});
