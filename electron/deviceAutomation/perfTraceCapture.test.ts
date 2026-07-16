import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AdbExecSync } from "./performanceMonitor/androidCollectors";
import {
  getPerfTraceCaptureStatus,
  deletePerfTraceLocalFile,
  resetPerfTraceCaptureForTests,
  setPerfettoBackgroundPidForTests,
  setPerfTraceAdbExecForTests,
  setPerfTraceProgressEmitter,
  startPerfTraceCapture,
  stopPerfTraceCapture,
} from "./perfTraceCapture";

function mockSuccessfulAdb(): AdbExecSync {
  return (_deviceId, args) => {
    const joined = args.join(" ");
    if (joined.includes("which perfetto")) {
      return { exitCode: 0, stdout: "/system/bin/perfetto\n", stderr: "" };
    }
    if (joined.includes("test -d /proc")) {
      return { exitCode: 0, stdout: "RUN\n", stderr: "" };
    }
    if (joined.includes("stat -c")) {
      return { exitCode: 0, stdout: "128\n", stderr: "" };
    }
    if (joined.startsWith("pull")) {
      const localPath = args[args.length - 1] ?? "";
      writeFileSync(localPath, "mock-trace-bytes", "utf8");
    }
    return { exitCode: 0, stdout: "", stderr: "" };
  };
}

describe("perfTraceCapture", () => {
  afterEach(() => {
    resetPerfTraceCaptureForTests();
  });

  it("start 与 stop 走 adb 序列并返回本地路径", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "perf-trace-test-"));
    const progress: string[] = [];
    setPerfTraceProgressEmitter((payload) => {
      progress.push(payload.phase);
    });
    setPerfTraceAdbExecForTests(mockSuccessfulAdb());
    setPerfettoBackgroundPidForTests("12345");

    const started = startPerfTraceCapture({
      deviceId: "dev-1",
      packageName: "com.example.app",
      presetId: "scroll_jank",
      localTracesDir: tmpDir,
    });

    expect(started.captureId).toBeTruthy();
    expect(getPerfTraceCaptureStatus().activeCaptureId).toBe(started.captureId);
    expect(progress).toContain("recording");

    const stopped = stopPerfTraceCapture(started.captureId);
    expect(stopped.localPath).toContain(".perfetto-trace");
    expect(stopped.sizeBytes).toBeGreaterThan(0);
    expect(getPerfTraceCaptureStatus().activeCaptureId).toBeUndefined();
    expect(progress).toContain("done");

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("同设备禁止双 trace", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "perf-trace-dup-"));
    setPerfTraceAdbExecForTests(mockSuccessfulAdb());
    setPerfettoBackgroundPidForTests("12345");

    startPerfTraceCapture({
      deviceId: "dev-1",
      packageName: "com.example.app",
      presetId: "cpu_sched",
      localTracesDir: tmpDir,
    });

    expect(() =>
      startPerfTraceCapture({
        deviceId: "dev-1",
        packageName: "com.example.app",
        presetId: "cpu_sched",
        localTracesDir: tmpDir,
      }),
    ).toThrow("已有进行中的 Trace 录制");

    resetPerfTraceCaptureForTests();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("deletePerfTraceLocalFile 删除本地 trace 文件", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "perf-trace-del-"));
    const filePath = path.join(tmpDir, "sample.perfetto-trace");
    writeFileSync(filePath, "mock-trace", "utf8");

    const deleted = deletePerfTraceLocalFile(filePath);
    expect(deleted.deleted).toBe(true);
    expect(() => deletePerfTraceLocalFile(filePath)).not.toThrow();
    expect(deletePerfTraceLocalFile(filePath).deleted).toBe(false);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});
