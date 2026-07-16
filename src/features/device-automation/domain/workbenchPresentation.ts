import type { DeviceAutomationPlatform } from "../types";

export type DeviceAutomationExecutionMode = "flexible" | "strict";
export type DeviceAutomationPerceptionKernel = "ui-tree" | "vision" | "hybrid";

export type DeviceAutomationPlatformLabelKey =
  | "deviceAutomation.platform.android"
  | "deviceAutomation.platform.ios"
  | "deviceAutomation.platform.harmony";

export type DeviceAutomationCapabilityKey =
  | "deviceAutomation.list.capability.triPlatform"
  | "deviceAutomation.list.capability.mirror"
  | "deviceAutomation.list.capability.aiDriver"
  | "deviceAutomation.list.capability.assertion";

export type DeviceAutomationExamplePromptKey =
  | "deviceAutomation.debug.examplePrompt.login"
  | "deviceAutomation.debug.examplePrompt.settingsWifi"
  | "deviceAutomation.debug.examplePrompt.relaunch";

export const DEVICE_AUTOMATION_CAPABILITY_KEYS = [
  "deviceAutomation.list.capability.triPlatform",
  "deviceAutomation.list.capability.mirror",
  "deviceAutomation.list.capability.aiDriver",
  "deviceAutomation.list.capability.assertion",
] as const satisfies readonly DeviceAutomationCapabilityKey[];

export const DEVICE_AUTOMATION_EXAMPLE_PROMPT_KEYS = [
  "deviceAutomation.debug.examplePrompt.login",
  "deviceAutomation.debug.examplePrompt.settingsWifi",
  "deviceAutomation.debug.examplePrompt.relaunch",
] as const satisfies readonly DeviceAutomationExamplePromptKey[];

const PLATFORM_LABEL_KEYS: Record<
  DeviceAutomationPlatform,
  DeviceAutomationPlatformLabelKey
> = {
  android: "deviceAutomation.platform.android",
  ios: "deviceAutomation.platform.ios",
  harmony: "deviceAutomation.platform.harmony",
};

const PLATFORM_BADGE_CLASS: Record<DeviceAutomationPlatform, string> = {
  android: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ios: "bg-slate-100 text-slate-700 ring-slate-200",
  harmony: "bg-red-50 text-[#ce0e2d] ring-red-100",
};

export function resolveDevicePlatformLabelKey(
  platform: DeviceAutomationPlatform,
): DeviceAutomationPlatformLabelKey {
  return PLATFORM_LABEL_KEYS[platform];
}

export function resolveDevicePlatformBadgeClassName(
  platform: DeviceAutomationPlatform,
): string {
  return PLATFORM_BADGE_CLASS[platform];
}

export function isDeviceAutomationExecutionMode(
  value: string,
): value is DeviceAutomationExecutionMode {
  return value === "flexible" || value === "strict";
}

export function isDeviceAutomationPerceptionKernel(
  value: string,
): value is DeviceAutomationPerceptionKernel {
  return value === "ui-tree" || value === "vision" || value === "hybrid";
}
