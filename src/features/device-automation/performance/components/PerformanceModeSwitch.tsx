import { useTranslation } from "react-i18next";
import { emberTabButtonClassName } from "@/lib/appearance/tabButtonClassNames";

export type PerformanceMonitorMode = "apm" | "trace";

export interface PerformanceModeSwitchProps {
  mode: PerformanceMonitorMode;
  onModeChange: (mode: PerformanceMonitorMode) => void;
}

export function PerformanceModeSwitch({
  mode,
  onModeChange,
}: PerformanceModeSwitchProps) {
  const { t } = useTranslation("deviceAutomation");

  return (
    <div
      role="tablist"
      aria-label={t("deviceAutomation.performance.mode.navAria")}
      className="inline-flex rounded-lg border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface-muted,#f7f7f5)] p-0.5"
      data-testid="performance-mode-switch"
    >
      {(["apm", "trace"] as const).map((item) => {
        const isActive = mode === item;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`performance-mode-${item}`}
            className={emberTabButtonClassName(isActive)}
            onClick={() => onModeChange(item)}
          >
            {t(`deviceAutomation.performance.mode.${item}`)}
          </button>
        );
      })}
    </div>
  );
}
