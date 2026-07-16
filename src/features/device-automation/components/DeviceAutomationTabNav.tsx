import { useTranslation } from "react-i18next";
import { emberTabButtonClassName } from "@/lib/appearance/tabButtonClassNames";
import type { DeviceAutomationWorkspaceTab } from "@/types/page";
import {
  DEVICE_AUTOMATION_WORKSPACE_TABS,
  getDeviceAutomationWorkspaceTabLabelKey,
  resolveDeviceAutomationWorkspaceTab,
} from "../constants/workspaceTabs";

interface DeviceAutomationTabNavProps {
  activeTab: DeviceAutomationWorkspaceTab | undefined;
  onTabChange: (tab: DeviceAutomationWorkspaceTab) => void;
}

export function DeviceAutomationTabNav({
  activeTab,
  onTabChange,
}: DeviceAutomationTabNavProps) {
  const { t } = useTranslation("deviceAutomation");
  const resolvedActiveTab = resolveDeviceAutomationWorkspaceTab(activeTab);

  return (
    <header className="shrink-0 border-b border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)] px-4 py-2">
      <nav
        aria-label={t("deviceAutomation.tabs.navAria")}
        className="flex min-h-[calc(var(--layout-header-height,58px)-16px)] items-center"
      >
        <div
          role="tablist"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {DEVICE_AUTOMATION_WORKSPACE_TABS.map((tab) => {
            const isActive = tab === resolvedActiveTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                data-testid={`device-automation-tab-${tab}`}
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                className={emberTabButtonClassName(isActive)}
                onClick={() => onTabChange(tab)}
              >
                <span className="truncate whitespace-nowrap">
                  {t(getDeviceAutomationWorkspaceTabLabelKey(tab))}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
