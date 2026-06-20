import type { DeviceAutomationWorkspaceTab } from "@/types/page";

/** 移动端测试工作台顶部 Tab 顺序（设备管理优先，对齐 AutoPilot 信息架构）。 */
export const DEVICE_AUTOMATION_WORKSPACE_TABS = [
  "devices",
  "ai-case-generation",
  "ui-auto-test",
  "monkey-test",
  "performance",
  "startup-time",
  "packet-capture",
] as const satisfies readonly DeviceAutomationWorkspaceTab[];

export type DeviceAutomationWorkspaceTabId =
  (typeof DEVICE_AUTOMATION_WORKSPACE_TABS)[number];

export function resolveDeviceAutomationWorkspaceTab(
  tab: DeviceAutomationWorkspaceTab | undefined,
): DeviceAutomationWorkspaceTabId {
  if (tab && DEVICE_AUTOMATION_WORKSPACE_TABS.includes(tab)) {
    return tab;
  }
  return "devices";
}

export type DeviceAutomationWorkspaceTabLabelKey =
  `deviceAutomation.tabs.${DeviceAutomationWorkspaceTabId}`;

export function getDeviceAutomationWorkspaceTabLabelKey(
  tab: DeviceAutomationWorkspaceTabId,
): DeviceAutomationWorkspaceTabLabelKey {
  return `deviceAutomation.tabs.${tab}`;
}
