import { describe, expect, it } from "vitest";
import { buildMonkeyShellArgs } from "./monkeyTest";

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
