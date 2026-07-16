import type { DeviceAutomationPlatform } from "../types";

export function platformLabel(platform: DeviceAutomationPlatform): string {
  if (platform === "ios") {
    return "iOS";
  }
  if (platform === "harmony") {
    return "HarmonyOS";
  }
  return "Android";
}

/** 卡片「系统」行：平台 + 可选版本号，对齐 lmweb formatSystemLine。 */
export function formatDeviceSystemLine(
  platform: DeviceAutomationPlatform,
  platformVersion?: string,
): string {
  const base = platformLabel(platform);
  const version = platformVersion?.trim();
  return version ? `${base} ${version}` : base;
}

/** 卡片「空间」行：将 agent-device target 映射为可读文案。 */
export function formatDeviceSpace(target?: string): string {
  const normalized = target?.trim().toLowerCase();
  if (!normalized) {
    return "—";
  }
  if (normalized === "mobile") {
    return "移动设备";
  }
  if (normalized === "tv") {
    return "电视";
  }
  if (normalized === "desktop") {
    return "桌面";
  }
  return target.trim();
}
