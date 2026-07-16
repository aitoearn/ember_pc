import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DeviceAutomationWorkspaceTab } from "@/types/page";
import {
  getDeviceAutomationWorkspaceTabLabelKey,
  resolveDeviceAutomationWorkspaceTab,
} from "../constants/workspaceTabs";

interface DeviceAutomationPlaceholderPanelProps {
  tab: DeviceAutomationWorkspaceTab | undefined;
}

export function DeviceAutomationPlaceholderPanel({
  tab,
}: DeviceAutomationPlaceholderPanelProps) {
  const { t } = useTranslation("deviceAutomation");
  const resolvedTab = resolveDeviceAutomationWorkspaceTab(tab);

  return (
    <div
      className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center"
      data-testid={`device-automation-placeholder-${resolvedTab}`}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)] shadow-sm">
        <Construction
          className="size-7 text-[color:var(--theme-default,#00A76F)]"
          aria-hidden
        />
      </div>
      <h2 className="text-lg font-semibold text-[color:var(--ember-text,#4a4a45)]">
        {t(getDeviceAutomationWorkspaceTabLabelKey(resolvedTab))}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--ember-text-muted,#9b9b96)]">
        {t("deviceAutomation.tabs.placeholderDescription")}
      </p>
    </div>
  );
}
