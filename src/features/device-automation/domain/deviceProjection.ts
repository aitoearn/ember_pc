import type {
  AgentDeviceRecord,
  DeviceAutomationCardModel,
  DeviceAutomationPlatform,
  DeviceAutomationStatus,
} from "../types";
import { inferDeviceBrand } from "./deviceBrand";
import {
  filterAgentDevicesForInventory,
  shouldIncludeAgentDeviceInInventory,
} from "./deviceInventoryFilter";
import { formatDeviceSpace, formatDeviceSystemLine } from "./deviceDisplay";

export {
  filterAgentDevicesForInventory,
  shouldIncludeAgentDeviceInInventory,
} from "./deviceInventoryFilter";

function mapPlatform(platform: string): DeviceAutomationPlatform {
  const normalized = platform.trim().toLowerCase();
  if (normalized === "ios") {
    return "ios";
  }
  if (normalized === "harmony" || normalized === "ohos") {
    return "harmony";
  }
  return "android";
}

function mapConnectionStatus(device: AgentDeviceRecord): DeviceAutomationStatus {
  if (device.booted === false) {
    return "offline";
  }
  return "online";
}

function mapConnectionType(kind: string): string {
  const normalized = kind.trim().toLowerCase();
  if (normalized === "simulator") {
    return "simulator";
  }
  if (normalized === "emulator") {
    return "emulator";
  }
  if (normalized === "physical") {
    return "usb";
  }
  return kind.trim() || "unknown";
}

export function projectAgentDevice(
  device: AgentDeviceRecord,
): DeviceAutomationCardModel {
  const platform = mapPlatform(device.platform);
  const name = device.name?.trim() || device.id;
  const model = device.model?.trim() || name;
  const status = mapConnectionStatus(device);
  return {
    id: device.id,
    serial: device.id,
    name,
    brand: inferDeviceBrand({
      name,
      model: device.model,
      brand: device.brand,
      manufacturer: device.manufacturer,
    }),
    model,
    system: formatDeviceSystemLine(platform, device.platformVersion),
    resolution: device.resolution?.trim() || "—",
    group: "local",
    space: formatDeviceSpace(device.target),
    status,
    platform,
    agentPlatform: device.platform.trim().toLowerCase(),
    connectionType: mapConnectionType(device.kind),
  };
}

export function projectAgentDevices(
  devices: AgentDeviceRecord[],
): DeviceAutomationCardModel[] {
  return filterAgentDevicesForInventory(devices).map(projectAgentDevice);
}

/** @deprecated 兼容旧命名 */
export const projectAutoGlmDevice = projectAgentDevice;

/** @deprecated 兼容旧命名 */
export const projectAutoGlmDevices = projectAgentDevices;
