import type { DeviceAutomationWorkspaceTab } from "@/types/page";

/** 移动端测试工作台顶部 Tab 顺序（设备管理优先，对齐 AutoPilot 信息架构）。 */
export const DEVICE_AUTOMATION_WORKSPACE_TABS = [
  "devices",
  "ai-case-generation",
  "ui-auto-test",
  "stability-assurance",
  "performance",
  "startup-time",
  "packet-capture",
] as const satisfies readonly DeviceAutomationWorkspaceTab[];

export type DeviceAutomationWorkspaceTabId =
  (typeof DEVICE_AUTOMATION_WORKSPACE_TABS)[number];

/** 旧 Tab id → 当前 Tab id，用于深链接与历史路由兼容。 */
export const LEGACY_TAB_ALIASES = {
  "monkey-test": "stability-assurance",
} as const satisfies Record<string, DeviceAutomationWorkspaceTabId>;

export type DeviceAutomationWorkspaceTabLegacyId =
  keyof typeof LEGACY_TAB_ALIASES;

export function resolveDeviceAutomationWorkspaceTab(
  tab:
    | DeviceAutomationWorkspaceTab
    | DeviceAutomationWorkspaceTabLegacyId
    | undefined,
): DeviceAutomationWorkspaceTabId {
  if (!tab) {
    return "devices";
  }
  const normalized =
    LEGACY_TAB_ALIASES[tab as DeviceAutomationWorkspaceTabLegacyId] ?? tab;
  if (
    DEVICE_AUTOMATION_WORKSPACE_TABS.includes(
      normalized as DeviceAutomationWorkspaceTabId,
    )
  ) {
    return normalized as DeviceAutomationWorkspaceTabId;
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
