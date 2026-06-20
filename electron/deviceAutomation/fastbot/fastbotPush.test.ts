import { describe, expect, it } from "vitest";
import {
  buildFastbotShellArgs,
  buildFastbotShellCommand,
} from "./fastbotPush";

describe("buildFastbotShellArgs", () => {
  it("拼装 Fastbot 服务启动参数（对齐 Kea2）", () => {
    const args = buildFastbotShellArgs({
      packageName: "com.example.app",
      logStamp: "abc123",
      runningMinutes: 10,
      throttleMs: 200,
      fastbotAgent: "double-sarsa",
      deviceOutputRoot: "/sdcard/.ember-fastbot",
      profilePeriod: 25,
    });
    expect(args).toContain("CLASSPATH=/sdcard/monkeyq.jar:/sdcard/framework.jar:/sdcard/fastbot-thirdpart.jar:/sdcard/kea2-thirdpart.jar");
    expect(args).toContain("exec");
    expect(args).toContain("app_process");
    expect(args).toContain("--agent-u2");
    expect(args).toContain("double-sarsa");
    expect(args).toContain("--running-minutes");
    expect(args).toContain("10");
    expect(args).toContain("--throttle");
    expect(args).toContain("200");
    expect(args).toContain("--output-directory");
    expect(args).toContain("/sdcard/.ember-fastbot/output_abc123");
    expect(args).toContain("-p");
    expect(args).toContain("com.example.app");
    expect(args).toContain("--profile-period");
    expect(args).toContain("25");
    expect(args.filter((a) => a === "-v").length).toBe(3);
  });

  it("空包名抛错", () => {
    expect(() =>
      buildFastbotShellArgs({
        packageName: "  ",
        logStamp: "x",
        runningMinutes: 1,
        throttleMs: 0,
        fastbotAgent: "sarsa",
        deviceOutputRoot: "/sdcard/.ember-fastbot",
      }),
    ).toThrow("packageName");
  });

  it("shell 命令包含 LD_LIBRARY_PATH", () => {
    const args = buildFastbotShellArgs({
      packageName: "com.example.app",
      logStamp: "abc",
      runningMinutes: 1,
      throttleMs: 0,
      fastbotAgent: "sarsa",
      deviceOutputRoot: "/sdcard/.ember-fastbot",
    });
    const cmd = buildFastbotShellCommand(args, "/data/local/tmp/arm64-v8a");
    expect(cmd).toContain("export LD_LIBRARY_PATH=/data/local/tmp/arm64-v8a");
    expect(cmd).toContain("exec");
  });
});
