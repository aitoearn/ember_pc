import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdbExecSync } from "./performanceMonitor/androidCollectors";
import {
  getPerfStatus,
  listPerfApps,
  resetPerformanceMonitorForTests,
  setPerfAdbExecForTests,
  setPerfFrameEmitter,
  startPerfCollection,
  stopPerfCollection,
} from "./performanceMonitor";

const TOP_LINE =
  "12345 u0_a123 10 -10 12G 120M 80M S  12.5   2.1   0:03.21 com.demo.app";
const PROC_STAT =
  "cpu  1000 100 200 600 50 0 0 0 0 0\ncpu  2000 150 250 1100 80 0 0 0 0 0";
const MEMINFO = "TOTAL PSS:   204800";
const GFXINFO = "Total frames rendered: 120";

function createMockAdb(): AdbExecSync {
  let gfxFrames = 100;
  return vi.fn((_deviceId, args) => {
    if (args.includes("pm") && args.includes("-3")) {
      return {
        stdout: "package:com.demo.app\n",
        stderr: "",
        exitCode: 0,
      };
    }
    if (args.includes("top")) {
      return { stdout: TOP_LINE, stderr: "", exitCode: 0 };
    }
    if (args.includes("/proc/stat")) {
      return { stdout: PROC_STAT, stderr: "", exitCode: 0 };
    }
    if (args.includes("pidof")) {
      return { stdout: "12345", stderr: "", exitCode: 0 };
    }
    if (args.includes("meminfo")) {
      return { stdout: MEMINFO, stderr: "", exitCode: 0 };
    }
    if (args.includes("gfxinfo") && args.includes("reset")) {
      gfxFrames = 100;
      return { stdout: "", stderr: "", exitCode: 0 };
    }
    if (args.includes("gfxinfo")) {
      gfxFrames += 30;
      return {
        stdout: `${GFXINFO.replace("120", String(gfxFrames))}\n`,
        stderr: "",
        exitCode: 0,
      };
    }
    return { stdout: "", stderr: "", exitCode: 0 };
  });
}

describe("performanceMonitor", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetPerformanceMonitorForTests();
    setPerfAdbExecForTests(createMockAdb());
  });

  it("listPerfApps 仅 Android 返回第三方包名", () => {
    expect(listPerfApps({ platform: "ios", deviceId: "ios-1" }).apps).toEqual([]);
    expect(listPerfApps({ platform: "android", deviceId: "emulator-5554" }).apps).toEqual([
      { packageName: "com.demo.app" },
    ]);
  });

  it("start/stop 返回 summary 并清理 active session", () => {
    const started = startPerfCollection({
      platform: "android",
      deviceId: "emulator-5554",
      packageName: "com.demo.app",
      metrics: ["cpu", "memory"],
      intervalMs: 1000,
    });
    expect(started.sessionId).toBeTruthy();
    expect(getPerfStatus().activeSessionId).toBe(started.sessionId);

    const stopped = stopPerfCollection(started.sessionId);
    expect(stopped.summary).toBeDefined();
    expect(getPerfStatus()).toEqual({});
  });

  it("同设备再次 start 会先结束旧 session", () => {
    const first = startPerfCollection({
      platform: "android",
      deviceId: "emulator-5554",
      packageName: "com.demo.app",
      metrics: ["fps"],
      intervalMs: 500,
    });
    const second = startPerfCollection({
      platform: "android",
      deviceId: "emulator-5554",
      packageName: "com.demo.app",
      metrics: ["fps"],
      intervalMs: 500,
    });
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(getPerfStatus().activeSessionId).toBe(second.sessionId);
    stopPerfCollection(second.sessionId);
  });

  it("非法 interval 拒绝启动", () => {
    expect(() =>
      startPerfCollection({
        platform: "android",
        deviceId: "emulator-5554",
        packageName: "com.demo.app",
        metrics: ["cpu"],
        intervalMs: 750,
      }),
    ).toThrow("采集间隔非法");
  });

  it("采集 tick 会广播 perf frame", async () => {
    vi.useFakeTimers();
    const frames: unknown[] = [];
    setPerfFrameEmitter((payload) => {
      frames.push(payload);
    });

    startPerfCollection({
      platform: "android",
      deviceId: "emulator-5554",
      packageName: "com.demo.app",
      metrics: ["cpu"],
      intervalMs: 500,
    });

    await vi.advanceTimersByTimeAsync(600);
    expect(frames.length).toBeGreaterThan(0);

    const active = getPerfStatus().activeSessionId;
    expect(active).toBeTruthy();
    if (active) {
      stopPerfCollection(active);
    }
    vi.useRealTimers();
  });
});
