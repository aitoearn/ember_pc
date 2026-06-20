import { statSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearScrcpyJarCacheForTests,
  findScrcpyReverseListenPort,
  isScrcpyJarCached,
  prewarmScrcpyJarFast,
  prepareScrcpyReverseTcpFast,
  removeScrcpyReverseFast,
  reverseScrcpyTcpFast,
  sendAndroidNavigationFast,
  startScrcpyServerFast,
  teardownScrcpySessionFast,
  type ScrcpyAdbFastPathDeps,
} from "./scrcpyAdbFastPath";

describe("scrcpyAdbFastPath", () => {
  beforeEach(() => {
    clearScrcpyJarCacheForTests();
    vi.useRealTimers();
  });

  it("prepare 对齐 aya reverseTcp：复用已有 reverse 端口", async () => {
    const execAdbSync = vi.fn((_deviceId, args) => {
      if (args[0] === "reverse" && args[1] === "--list") {
        return {
          stdout: "UsbFfs localabstract:scrcpy_00012345 tcp:54115\n",
          stderr: "",
          exitCode: 0,
        };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const response = await prepareScrcpyReverseTcpFast(
      {
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00012345",
      },
      { execAdbSync, spawnAdb: vi.fn() },
    );
    expect(response).toEqual({ port: 54115, reused: true });
    expect(
      execAdbSync.mock.calls.filter((call) => call[1]?.[0] === "reverse" && call[1]?.[1] !== "--list"),
    ).toHaveLength(0);
  });

  it("prepare 无已有 reverse 时分配端口并建立映射", async () => {
    const execAdbSync = vi.fn((_deviceId, args) => {
      if (args[0] === "reverse" && args[1] === "--list") {
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const response = await prepareScrcpyReverseTcpFast(
      {
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00012345",
      },
      {
        execAdbSync,
        spawnAdb: vi.fn(),
        allocateLocalTcpPort: vi.fn(async () => 65471),
      },
    );
    expect(response).toEqual({ port: 65471, reused: false });
    expect(execAdbSync).toHaveBeenCalledWith("emulator-5554", [
      "reverse",
      "localabstract:scrcpy_00012345",
      "tcp:65471",
    ]);
  });

  it("teardown 可只移除 reverse 而不 pkill", () => {
    const execAdbSync = vi.fn(() => ({ stdout: "", stderr: "", exitCode: 0 }));
    teardownScrcpySessionFast(
      {
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00012345",
        killServer: false,
      },
      { execAdbSync, spawnAdb: vi.fn() },
    );
    expect(execAdbSync).toHaveBeenCalledTimes(1);
    expect(execAdbSync).toHaveBeenCalledWith("emulator-5554", [
      "reverse",
      "--remove",
      "localabstract:scrcpy_00012345",
    ]);
  });

  it("reverse 直接 adb reverse 设备 abstract → 主机 tcp", () => {
    const execAdbSync = vi.fn(() => ({ stdout: "", stderr: "", exitCode: 0 }));
    const response = reverseScrcpyTcpFast(
      {
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00012345",
        localPort: 54115,
      },
      { execAdbSync, spawnAdb: vi.fn() },
    );
    expect(response).toMatchObject({
      port: 54115,
      transport: "adb-fast-path",
    });
  });

  it("findScrcpyReverseListenPort 解析 adb reverse --list", () => {
    const execAdbSync = vi.fn(() => ({
      stdout: "UsbFfs localabstract:scrcpy_00012345 tcp:54115\n",
      stderr: "",
      exitCode: 0,
    }));
    expect(
      findScrcpyReverseListenPort(
        "emulator-5554",
        "localabstract:scrcpy_00012345",
        { execAdbSync, spawnAdb: vi.fn() },
      ),
    ).toBe(54115);
  });

  it("start 对齐 aya：不 pkill，直接 spawn server", () => {
    const localSize = statSync(__filename).size;
    const execAdbSync = vi.fn((_deviceId, args) => {
      if (args[0] === "shell" && args[1] === "stat") {
        return { stdout: String(localSize), stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const spawnAdb = vi.fn(() => ({
      pid: 99,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    }));
    startScrcpyServerFast(
      {
        deviceId: "emulator-5554",
        scid: "12345",
        scrcpyServerPath: __filename,
        audio: false,
      },
      { execAdbSync, spawnAdb },
    );
    expect(execAdbSync.mock.calls.some((call) => call[1]?.[1] === "pkill")).toBe(false);
    expect(spawnAdb).toHaveBeenCalled();
  });

  it("start 在 jar 已存在且同大小时跳过 push", () => {
    const localSize = statSync(__filename).size;
    const execAdbSync = vi.fn((_deviceId, args) => {
      if (args[0] === "shell" && args[1] === "stat") {
        return { stdout: String(localSize), stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const spawnAdb = vi.fn(() => ({
      pid: 99,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    }));
    const deps: ScrcpyAdbFastPathDeps = { execAdbSync, spawnAdb };
    const response = startScrcpyServerFast(
      {
        deviceId: "emulator-5554",
        scid: "12345",
        scrcpyServerPath: __filename,
        audio: false,
      },
      deps,
    );
    expect(response.pid).toBe(99);
    expect(execAdbSync.mock.calls.some((call) => call[1]?.[0] === "push")).toBe(false);
    expect(spawnAdb).toHaveBeenCalled();
    expect(isScrcpyJarCached("emulator-5554", __filename)).toBe(true);
  });

  it("缓存命中但远端 jar 缺失时会重新 push", () => {
    const localSize = statSync(__filename).size;
    let remoteExists = true;
    const execAdbSync = vi.fn((_deviceId, args) => {
      if (args[0] === "shell" && args[1] === "stat") {
        return remoteExists
          ? { stdout: String(localSize), stderr: "", exitCode: 0 }
          : { stdout: "", stderr: "No such file", exitCode: 1 };
      }
      if (args[0] === "push") {
        remoteExists = true;
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const spawnAdb = vi.fn(() => ({
      pid: 101,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    }));
    const deps: ScrcpyAdbFastPathDeps = { execAdbSync, spawnAdb };
    startScrcpyServerFast(
      {
        deviceId: "emulator-5554",
        scid: "12345",
        scrcpyServerPath: __filename,
        audio: false,
      },
      deps,
    );
    remoteExists = false;
    execAdbSync.mockClear();
    startScrcpyServerFast(
      {
        deviceId: "emulator-5554",
        scid: "67890",
        scrcpyServerPath: __filename,
        audio: false,
      },
      deps,
    );
    expect(execAdbSync.mock.calls.some((call) => call[1]?.[0] === "push")).toBe(true);
    expect(spawnAdb).toHaveBeenCalledTimes(2);
  });

  it("start 在缓存命中且远端仍有效时跳过 push", () => {
    const localSize = statSync(__filename).size;
    const execAdbSync = vi.fn((_deviceId, args) => {
      if (args[0] === "shell" && args[1] === "stat") {
        return { stdout: String(localSize), stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const spawnAdb = vi.fn(() => ({
      pid: 100,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    }));
    const deps: ScrcpyAdbFastPathDeps = { execAdbSync, spawnAdb };
    startScrcpyServerFast(
      {
        deviceId: "emulator-5554",
        scid: "12345",
        scrcpyServerPath: __filename,
        audio: false,
      },
      deps,
    );
    execAdbSync.mockClear();
    startScrcpyServerFast(
      {
        deviceId: "emulator-5554",
        scid: "67890",
        scrcpyServerPath: __filename,
        audio: false,
      },
      deps,
    );
    expect(execAdbSync.mock.calls.some((call) => call[1]?.[0] === "push")).toBe(false);
    expect(spawnAdb).toHaveBeenCalledTimes(2);
  });

  it("sendAndroidNavigationFast 对齐 aya input keyevent", () => {
    const execAdbSync = vi.fn(() => ({ stdout: "", stderr: "", exitCode: 0 }));
    sendAndroidNavigationFast(
      { deviceId: "emulator-5554", action: "back" },
      { execAdbSync, spawnAdb: vi.fn() },
    );
    expect(execAdbSync).toHaveBeenCalledWith("emulator-5554", [
      "shell",
      "input",
      "keyevent",
      "4",
    ]);
  });

  it("prewarm 首次 scheduled，缓存就绪后返回 ready", async () => {
    vi.useFakeTimers();
    const localSize = statSync(__filename).size;
    const execAdbSync = vi.fn((_deviceId, args) => {
      if (args[0] === "shell" && args[1] === "stat") {
        return { stdout: String(localSize), stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const deps: ScrcpyAdbFastPathDeps = { execAdbSync, spawnAdb: vi.fn() };
    expect(
      prewarmScrcpyJarFast(
        { deviceId: "emulator-5554", scrcpyServerPath: __filename },
        deps,
      ).status,
    ).toBe("scheduled");
    await vi.runAllTimersAsync();
    expect(
      prewarmScrcpyJarFast(
        { deviceId: "emulator-5554", scrcpyServerPath: __filename },
        deps,
      ).status,
    ).toBe("ready");
  });
});
