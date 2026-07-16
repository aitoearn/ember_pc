import type { AgentDeviceRecord } from "../types";

const DESKTOP_PLATFORMS = new Set(["macos", "linux"]);

function isDesktopHostDevice(device: AgentDeviceRecord): boolean {
  const platform = device.platform.trim().toLowerCase();
  const target = device.target?.trim().toLowerCase() ?? "";
  const id = device.id.trim().toLowerCase();

  if (target === "desktop") {
    return true;
  }
  if (DESKTOP_PLATFORMS.has(platform)) {
    return true;
  }
  if (id === "host-macos-local" || id.startsWith("host-macos")) {
    return true;
  }
  return false;
}

/** 未启动的 iOS/Android 模拟器会被 agent-device 枚举出来，默认不在工作台展示。 */
export function shouldIncludeAgentDeviceInInventory(
  device: AgentDeviceRecord,
): boolean {
  if (isDesktopHostDevice(device)) {
    return false;
  }

  const kind = device.kind.trim().toLowerCase();
  if (kind === "simulator" || kind === "emulator") {
    return device.booted === true;
  }
  return true;
}

export function filterAgentDevicesForInventory(
  devices: AgentDeviceRecord[],
): AgentDeviceRecord[] {
  return devices.filter(shouldIncludeAgentDeviceInInventory);
}
