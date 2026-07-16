import type { DeviceAutomationCardModel } from "./types";

let cachedDeviceList: DeviceAutomationCardModel[] | null = null;

export function readCachedDeviceAutomationList(): DeviceAutomationCardModel[] | null {
  return cachedDeviceList;
}

export function writeCachedDeviceAutomationList(
  devices: DeviceAutomationCardModel[],
): void {
  cachedDeviceList = devices;
}

/** 测试专用：重置会话级设备列表缓存。 */
export function resetDeviceAutomationListSessionCacheForTests(): void {
  cachedDeviceList = null;
}
