import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  DeviceInventoryWatcher,
  normalizeDeviceSnapshot,
  parseTrackDevicesFrame,
} from "./deviceInventoryWatcher";

class FakeProcess extends EventEmitter {
  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();
  kill = vi.fn();
}

describe("deviceInventoryWatcher", () => {
  it("解析 adb track-devices 帧并归一化为稳定快照", () => {
    const devices = parseTrackDevicesFrame(
      "List of devices attached\nemulator-5554\tdevice\nR5CT\tunauthorized\n",
    );

    expect(devices).toEqual([
      { id: "emulator-5554", state: "device" },
      { id: "R5CT", state: "unauthorized" },
    ]);
    expect(normalizeDeviceSnapshot(devices)).toBe(
      "R5CT\tunauthorized\nemulator-5554\tdevice",
    );
  });

  it("初始快照不广播，后续设备变化 debounce 后广播一次", () => {
    vi.useFakeTimers();
    const emitted: Array<{ event: string; payload?: unknown }> = [];
    const child = new FakeProcess();
    const spawnProcess = vi.fn(() => child as never);
    const watcher = new DeviceInventoryWatcher({
      emit: (event, payload) => emitted.push({ event, payload }),
      env: { DEVICE_AUTOMATION_ADB: "/tmp/adb" },
      spawnProcess: spawnProcess as never,
      debounceMs: 20,
      restartDelayMs: 20,
    });

    watcher.start();
    child.stdout.emit("data", "List of devices attached\n\n");
    vi.advanceTimersByTime(30);
    expect(emitted).toEqual([]);

    child.stdout.emit(
      "data",
      "List of devices attached\nemulator-5554\tdevice\n\n",
    );
    vi.advanceTimersByTime(19);
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.event).toBe("device_automation_inventory_changed");

    watcher.stop();
    vi.useRealTimers();
  });

  it("首帧 adb 快照到达时触发 onInitialSnapshot", () => {
    const onInitialSnapshot = vi.fn();
    const child = new FakeProcess();
    const spawnProcess = vi.fn(() => child as never);
    const watcher = new DeviceInventoryWatcher({
      emit: vi.fn(),
      env: { DEVICE_AUTOMATION_ADB: "/tmp/adb" },
      spawnProcess: spawnProcess as never,
      onInitialSnapshot,
    });

    watcher.start();
    expect(onInitialSnapshot).not.toHaveBeenCalled();

    child.stdout.emit("data", "List of devices attached\n\n");
    expect(onInitialSnapshot).toHaveBeenCalledTimes(1);

    child.stdout.emit(
      "data",
      "List of devices attached\nemulator-5554\tdevice\n\n",
    );
    expect(onInitialSnapshot).toHaveBeenCalledTimes(1);

    watcher.stop();
  });

  it("维护可直接用于列表快路径的 Android 在线设备快照", () => {
    const child = new FakeProcess();
    const spawnProcess = vi.fn(() => child as never);
    const watcher = new DeviceInventoryWatcher({
      emit: vi.fn(),
      env: { DEVICE_AUTOMATION_ADB: "/tmp/adb" },
      spawnProcess: spawnProcess as never,
      debounceMs: 20,
      restartDelayMs: 20,
    });

    watcher.start();
    child.stdout.emit(
      "data",
      [
        "List of devices attached",
        "emulator-5554\tdevice",
        "R5CT\tunauthorized",
        "",
        "",
      ].join("\n"),
    );

    expect(watcher.getAndroidDevices()).toEqual([
      {
        platform: "android",
        id: "emulator-5554",
        name: "emulator-5554",
        kind: "device",
        target: "emulator-5554",
        booted: true,
      },
    ]);

    watcher.stop();
  });
});
