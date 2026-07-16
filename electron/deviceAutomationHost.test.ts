import { describe, expect, it, vi } from "vitest";
import {
  DEVICE_AUTOMATION_COMMANDS,
  ElectronDeviceAutomationHost,
  isDeviceAutomationCommand,
} from "./deviceAutomationHost";
import { ELECTRON_HOST_COMMANDS } from "./ipcChannels";

const runtimeMocks = vi.hoisted(() => ({
  ensure: vi.fn(async () => ({ ready: true, backend: "agent-device" })),
  listDevices: vi.fn(async () => ({ devices: [] })),
  getMonkeyStatus: vi.fn(() => ({ activeSessionId: undefined })),
  getPerfStatus: vi.fn(() => ({ activeSessionId: undefined })),
  stopScrcpy: vi.fn(() => ({ ok: true })),
}));

vi.mock("./deviceAutomationSidecar", () => ({
  deviceAutomationRuntime: runtimeMocks,
}));

describe("electron/deviceAutomationHost", () => {
  it("DEVICE_AUTOMATION_COMMANDS 全部纳入 ELECTRON_HOST_COMMANDS 白名单", () => {
    const hostCommandSet = new Set<string>(ELECTRON_HOST_COMMANDS);
    expect(
      DEVICE_AUTOMATION_COMMANDS.every((command) =>
        hostCommandSet.has(command),
      ),
    ).toBe(true);
  });

  it("isDeviceAutomationCommand 识别 device_automation 前缀命令", () => {
    expect(isDeviceAutomationCommand("device_automation_list_devices")).toBe(
      true,
    );
    expect(isDeviceAutomationCommand("ui_agent_start")).toBe(true);
    expect(isDeviceAutomationCommand("device_flow_replay_start")).toBe(true);
    expect(isDeviceAutomationCommand("workspace_list")).toBe(false);
  });

  it("invoke 将 list_devices 转发到 runtime.listDevices", async () => {
    const host = new ElectronDeviceAutomationHost();
    await host.invoke("device_automation_list_devices", { force: true });
    expect(runtimeMocks.listDevices).toHaveBeenCalledWith({ force: true });
  });

  it("invoke 将 get_sidecar_status 转发到 runtime.ensure", async () => {
    const host = new ElectronDeviceAutomationHost();
    await host.invoke("device_automation_get_sidecar_status");
    expect(runtimeMocks.ensure).toHaveBeenCalled();
  });

  it("invoke 将 monkey_get_status 转发到 runtime.getMonkeyStatus", async () => {
    const host = new ElectronDeviceAutomationHost();
    const result = await host.invoke("device_automation_monkey_get_status");
    expect(runtimeMocks.getMonkeyStatus).toHaveBeenCalled();
    expect(result).toEqual({ activeSessionId: undefined });
  });
});
