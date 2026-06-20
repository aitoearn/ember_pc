import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { resolveDevicePlatformBadgeClassName, resolveDevicePlatformLabelKey } from "../domain/workbenchPresentation";
import type { DeviceAutomationPlatform } from "../types";

interface DevicePlatformBadgeProps {
  platform: DeviceAutomationPlatform;
  className?: string;
}

export function DevicePlatformBadge({
  platform,
  className,
}: DevicePlatformBadgeProps) {
  const { t } = useTranslation("deviceAutomation");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        resolveDevicePlatformBadgeClassName(platform),
        className,
      )}
    >
      {t(resolveDevicePlatformLabelKey(platform))}
    </span>
  );
}
