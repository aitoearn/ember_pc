import { prewarmDeviceAutomationScrcpy } from "@/lib/api/deviceAutomation";
import type { DeviceAutomationCardModel } from "../types";

const prewarmedDeviceIds = new Set<string>();
const prewarmInFlight = new Set<string>();

export function resetScrcpyPrewarmStateForTests(): void {
  prewarmedDeviceIds.clear();
  prewarmInFlight.clear();
}

export function shouldPrewarmScrcpyDevice(device: DeviceAutomationCardModel): boolean {
  return device.platform === "android" && device.status === "online";
}

export function scheduleScrcpyPrewarmForDevice(deviceId: string): void {
  if (prewarmedDeviceIds.has(deviceId) || prewarmInFlight.has(deviceId)) {
    return;
  }
  prewarmInFlight.add(deviceId);
  void prewarmDeviceAutomationScrcpy({ deviceId })
    .then((result) => {
      if (result.status === "ready" || result.status === "scheduled") {
        prewarmedDeviceIds.add(deviceId);
      }
    })
    .catch((error) => {
      console.warn(`[scrcpy] 设备 ${deviceId} jar 预热失败:`, error);
    })
    .finally(() => {
      prewarmInFlight.delete(deviceId);
    });
}

export function scheduleScrcpyPrewarmForDevices(
  devices: DeviceAutomationCardModel[],
  limit = 3,
): void {
  let scheduled = 0;
  for (const device of devices) {
    if (!shouldPrewarmScrcpyDevice(device)) {
      continue;
    }
    if (prewarmedDeviceIds.has(device.id) || prewarmInFlight.has(device.id)) {
      continue;
    }
    scheduleScrcpyPrewarmForDevice(device.id);
    scheduled += 1;
    if (scheduled >= limit) {
      break;
    }
  }
}
