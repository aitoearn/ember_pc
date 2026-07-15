import { useTranslation } from "react-i18next";
import { emberTabButtonClassName } from "@/lib/appearance/tabButtonClassNames";
import type { StabilityAssuranceMode } from "../types";

export interface StabilityModeSwitchProps {
  mode: StabilityAssuranceMode;
  onModeChange: (mode: StabilityAssuranceMode) => void;
}

export function StabilityModeSwitch({
  mode,
  onModeChange,
}: StabilityModeSwitchProps) {
  const { t } = useTranslation("deviceAutomation");

  return (
    <div
      role="tablist"
      aria-label={t("deviceAutomation.stability.mode.navAria")}
      className="inline-flex rounded-lg border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface-muted,#f7f7f5)] p-0.5"
      data-testid="stability-mode-switch"
    >
      {(["stress-test", "crash-analysis"] as const).map((item) => {
        const isActive = mode === item;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`stability-mode-${item}`}
            className={emberTabButtonClassName(isActive)}
            onClick={() => onModeChange(item)}
          >
            {t(`deviceAutomation.stability.mode.${item}`)}
          </button>
        );
      })}
    </div>
  );
}
