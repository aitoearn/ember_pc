import { describe, expect, it } from "vitest";
import {
  filterAgentDevicesForInventory,
  shouldIncludeAgentDeviceInInventory,
} from "./deviceInventoryFilter";
import { projectAgentDevice, projectAgentDevices } from "./deviceProjection";

describe("projectAgentDevice", () => {
  it("应将 agent-device Android 在线设备映射为卡片模型", () => {
    const device = projectAgentDevice({
      platform: "android",
      id: "emulator-5554",
      name: "HUAWEI HBP-AL00",
      kind: "emulator",
      booted: true,
    });

    expect(device).toMatchObject({
      id: "emulator-5554",
      serial: "emulator-5554",
      name: "HUAWEI HBP-AL00",
      brand: "华为",
      status: "online",
      platform: "android",
      agentPlatform: "android",
      connectionType: "emulator",
      group: "local",
    });
  });

  it("HBP 机型代号应识别为华为", () => {
    const device = projectAgentDevice({
      platform: "android",
      id: "2NX022521100",
      name: "HBP AL00",
      kind: "physical",
      booted: true,
    });

    expect(device.brand).toBe("华为");
  });

  it("应使用 adb 补全的分辨率与系统版本", () => {
    const device = projectAgentDevice({
      platform: "android",
      id: "phone-1",
      name: "HBP AL00",
      kind: "physical",
      booted: true,
      brand: "HUAWEI",
      model: "HBP-AL00",
      resolution: "1224x2700",
      platformVersion: "12",
      target: "mobile",
    });

    expect(device).toMatchObject({
      brand: "华为",
      model: "HBP-AL00",
      resolution: "1224x2700",
      system: "Android 12",
      space: "移动设备",
    });
  });

  it("应将 iOS 未启动模拟器映射为 offline", () => {
    const device = projectAgentDevice({
      platform: "ios",
      id: "00008110-001A12345678901",
      name: "iPhone 16 Pro",
      kind: "simulator",
      booted: false,
    });

    expect(device.status).toBe("offline");
    expect(device.platform).toBe("ios");
    expect(device.system).toBe("iOS");
  });

  it("默认不展示未启动的模拟器/仿真器", () => {
    const devices = [
      {
        platform: "ios",
        id: "sim-off",
        name: "iPhone 17 Pro",
        kind: "simulator",
        booted: false,
      },
      {
        platform: "ios",
        id: "sim-on",
        name: "iPhone 16 Pro",
        kind: "simulator",
        booted: true,
      },
      {
        platform: "android",
        id: "emu-off",
        name: "Pixel Emulator",
        kind: "emulator",
        booted: false,
      },
      {
        platform: "android",
        id: "phone-1",
        name: "HBP AL00",
        kind: "physical",
        booted: false,
      },
    ];

    expect(shouldIncludeAgentDeviceInInventory(devices[0]!)).toBe(false);
    expect(shouldIncludeAgentDeviceInInventory(devices[1]!)).toBe(true);
    expect(shouldIncludeAgentDeviceInInventory(devices[2]!)).toBe(false);
    expect(shouldIncludeAgentDeviceInInventory(devices[3]!)).toBe(true);
    expect(filterAgentDevicesForInventory(devices).map((device) => device.id)).toEqual([
      "sim-on",
      "phone-1",
    ]);
    expect(projectAgentDevices(devices).map((device) => device.id)).toEqual([
      "sim-on",
      "phone-1",
    ]);
  });

  it("不展示 macOS/Linux 桌面宿主设备", () => {
    const devices = [
      {
        platform: "macos",
        id: "host-macos-local",
        name: "lisqdeMacBook-Pro.local",
        kind: "device",
        target: "desktop",
        booted: true,
      },
      {
        platform: "linux",
        id: "local",
        name: "ubuntu-dev",
        kind: "device",
        target: "desktop",
        booted: true,
      },
      {
        platform: "android",
        id: "emulator-5554",
        name: "Pixel 8",
        kind: "emulator",
        booted: true,
      },
    ];

    expect(filterAgentDevicesForInventory(devices).map((device) => device.id)).toEqual([
      "emulator-5554",
    ]);
    expect(projectAgentDevices(devices).map((device) => device.id)).toEqual([
      "emulator-5554",
    ]);
  });
});
