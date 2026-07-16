import { Home, Loader2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { DeviceAutomationCardModel } from "../types";

interface DeviceMirrorShellProps {
  device: DeviceAutomationCardModel;
  children: ReactNode;
  refreshPending?: boolean;
  onRefresh?: () => void;
  navigationPending?: "back" | "home" | null;
  navigationError?: string | null;
  onNavigate?: (action: "back" | "home") => void;
  showNavigation?: boolean;
}

export function DeviceMirrorShell({
  device,
  children,
  refreshPending = false,
  onRefresh,
  navigationPending = null,
  navigationError = null,
  onNavigate,
  showNavigation = false,
}: DeviceMirrorShellProps) {
  const { t } = useTranslation("deviceAutomation");
  const platformLabel = device.system.trim() || device.platform.toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-neutral-100/80 pb-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
            {t("deviceAutomation.debug.mirrorTitle")}
          </p>
          <p className="truncate text-sm font-semibold text-neutral-900">
            {device.name}
          </p>
          <p className="truncate text-[11px] text-neutral-500">{platformLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={refreshPending}
              onClick={onRefresh}
              title={t("deviceAutomation.debug.refreshMirror")}
            >
              {refreshPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
            </Button>
          ) : null}
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {t(`deviceAutomation.status.${device.status}`)}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      {showNavigation && onNavigate ? (
        <div className="mt-2 shrink-0 border-t border-neutral-100 pt-2">
          {navigationError ? (
            <p className="mb-2 text-center text-xs text-red-600">{navigationError}</p>
          ) : null}
          <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-[72px] rounded-full text-xs"
            disabled={navigationPending !== null}
            onClick={() => onNavigate("back")}
          >
            {navigationPending === "back" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              t("deviceAutomation.debug.navigationBack")
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-w-[72px] rounded-full text-xs"
            disabled={navigationPending !== null}
            onClick={() => onNavigate("home")}
          >
            {navigationPending === "home" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                <Home className="mr-1 size-3.5" />
                {t("deviceAutomation.debug.navigationHome")}
              </>
            )}
          </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
