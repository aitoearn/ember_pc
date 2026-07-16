import {
  BadgeCheck,
  BookOpen,
  Boxes,
  ClipboardList,
  FlaskConical,
  MessageCircleMore,
  Plus,
  Settings,
  Smartphone,
  Sparkles,
  Workflow,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type {
  AgentObservabilityPageParams,
  DeviceAutomationPageParams,
} from "@/types/page";
import { CURRENT_SIDEBAR_NAV_SCHEMA_VERSION } from "@/lib/api/appConfigTypes";
import { type AgentPageParams, type Page, type PageParams } from "@/types/page";
import { SettingsTabs } from "@/types/settings";
import { isAgentObservabilityEnabled } from "../../features/agent-observability/featureFlag";
import { resolvePluginHostFlags } from "../../features/plugin/featureFlag";
import type { PluginHostFlags } from "../../features/plugin/types";
import { buildHomeAgentParams } from "@/lib/workspace/navigation";

export { CURRENT_SIDEBAR_NAV_SCHEMA_VERSION };

export interface SidebarNavItemDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  page?: Page;
  params?: PageParams;
  resolveParams?: (params?: PageParams) => PageParams | undefined;
  isActive?: (currentPage: Page, currentParams?: PageParams) => boolean;
  configurable?: boolean;
}

function isAgentEntryActive(
  currentPage: Page,
  currentParams: PageParams | undefined,
  expectedEntry: NonNullable<AgentPageParams["agentEntry"]>,
): boolean {
  return (
    currentPage === "agent" &&
    (currentParams as AgentPageParams | undefined)?.agentEntry === expectedEntry
  );
}

const BASE_MAIN_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] = [
  {
    id: "home-general",
    label: "新建任务",
    icon: Plus,
    page: "agent",
    params: buildHomeAgentParams(),
    resolveParams: (params) =>
      buildHomeAgentParams(params as AgentPageParams | undefined),
    isActive: (currentPage, currentParams) =>
      isAgentEntryActive(currentPage, currentParams, "new-task"),
    configurable: false,
  },
  {
    id: "device-automation",
    label: "端自动化",
    icon: Smartphone,
    page: "device-automation",
    params: { view: "list" } satisfies DeviceAutomationPageParams,
    isActive: (currentPage) => currentPage === "device-automation",
    configurable: false,
  },
  {
    id: "test-case-management",
    label: "测试用例",
    icon: ClipboardList,
    page: "test-case-management",
    isActive: (currentPage) => currentPage === "test-case-management",
    configurable: false,
  },
  {
    id: "experts",
    label: "专家",
    icon: BadgeCheck,
    page: "experts",
    isActive: (currentPage) => currentPage === "experts",
    configurable: false,
  },
  {
    id: "skills",
    label: "Skills",
    icon: Sparkles,
    page: "skills",
    isActive: (currentPage) => currentPage === "skills",
    configurable: false,
  },
  {
    id: "plugins",
    label: "插件",
    icon: Boxes,
    page: "plugins",
    isActive: (currentPage) => currentPage === "plugins",
    configurable: false,
  },
  {
    id: "knowledge",
    label: "项目资料",
    icon: BookOpen,
    page: "knowledge",
    isActive: (currentPage) => currentPage === "knowledge",
    configurable: false,
  },
];

const AGENT_OBSERVABILITY_NAV_ITEM: SidebarNavItemDefinition = {
  id: "agent-observability",
  label: "Agent 观测",
  icon: Waypoints,
  page: "agent-observability",
  params: { tab: "tracing" } satisfies AgentObservabilityPageParams,
  isActive: (currentPage) => currentPage === "agent-observability",
  configurable: false,
};

const PLUGIN_LAB_NAV_ITEM: SidebarNavItemDefinition = {
  id: "plugin-lab",
  label: "Plugin Lab",
  icon: FlaskConical,
  page: "plugin-lab",
  isActive: (currentPage) => currentPage === "plugin-lab",
  configurable: false,
};

export interface MainSidebarNavBuildOptions {
  labEnabled?: boolean;
  agentObservabilityEnabled?: boolean;
}

export function buildMainSidebarNavItems(
  options: MainSidebarNavBuildOptions = {},
): SidebarNavItemDefinition[] {
  const labEnabled =
    options.labEnabled ?? resolvePluginHostFlags().labEnabled;
  const agentObservabilityEnabled =
    options.agentObservabilityEnabled ?? isAgentObservabilityEnabled();

  const items: SidebarNavItemDefinition[] = [...BASE_MAIN_SIDEBAR_NAV_ITEMS];
  if (agentObservabilityEnabled) {
    items.splice(3, 0, AGENT_OBSERVABILITY_NAV_ITEM);
  }
  if (labEnabled) {
    items.push(PLUGIN_LAB_NAV_ITEM);
  }
  return items;
}

export const MAIN_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] =
  buildMainSidebarNavItems();

export const FOOTER_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] = [
  {
    id: "settings",
    label: "设置",
    icon: Settings,
    page: "settings",
    params: {
      tab: SettingsTabs.Home,
    },
    isActive: (currentPage) => currentPage === "settings",
    configurable: false,
  },
  {
    id: "automation",
    label: "持续流程",
    icon: Workflow,
    page: "automation",
    isActive: (currentPage) => currentPage === "automation",
    configurable: false,
  },
  {
    id: "channels",
    label: "消息渠道",
    icon: MessageCircleMore,
    page: "channels",
    isActive: (currentPage) => currentPage === "channels",
    configurable: false,
  },
];

export const FIXED_MAIN_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] =
  MAIN_SIDEBAR_NAV_ITEMS.filter((item) => item.configurable === false);

export const CONFIGURABLE_MAIN_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] =
  MAIN_SIDEBAR_NAV_ITEMS.filter((item) => item.configurable !== false);

export const FIXED_FOOTER_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] =
  FOOTER_SIDEBAR_NAV_ITEMS.filter((item) => item.configurable === false);

export const CONFIGURABLE_FOOTER_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] =
  FOOTER_SIDEBAR_NAV_ITEMS.filter((item) => item.configurable !== false);

const CONFIGURABLE_SIDEBAR_NAV_ITEMS: SidebarNavItemDefinition[] = [
  ...CONFIGURABLE_MAIN_SIDEBAR_NAV_ITEMS,
  ...CONFIGURABLE_FOOTER_SIDEBAR_NAV_ITEMS,
];

export const DEFAULT_ENABLED_SIDEBAR_NAV_ITEM_IDS: string[] = [];

const CONFIGURABLE_SIDEBAR_NAV_ITEM_ID_SET = new Set<string>(
  CONFIGURABLE_SIDEBAR_NAV_ITEMS.map((item) => item.id),
);

function normalizeEnabledSidebarNavItems(items: string[]): string[] {
  const unique = Array.from(new Set(items));
  return unique.filter((item) =>
    CONFIGURABLE_SIDEBAR_NAV_ITEM_ID_SET.has(item),
  );
}

export function resolveEnabledSidebarNavItems(
  savedItems?: string[],
  schemaVersion = CURRENT_SIDEBAR_NAV_SCHEMA_VERSION,
): string[] {
  if (schemaVersion < CURRENT_SIDEBAR_NAV_SCHEMA_VERSION) {
    return [...DEFAULT_ENABLED_SIDEBAR_NAV_ITEM_IDS];
  }

  if (!savedItems || savedItems.length === 0) {
    return [...DEFAULT_ENABLED_SIDEBAR_NAV_ITEM_IDS];
  }

  const normalized = normalizeEnabledSidebarNavItems(savedItems);
  if (normalized.length === 0) {
    return [...DEFAULT_ENABLED_SIDEBAR_NAV_ITEM_IDS];
  }

  return normalized;
}
