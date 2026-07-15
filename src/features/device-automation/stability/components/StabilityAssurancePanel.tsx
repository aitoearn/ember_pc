import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { MonkeyTestPanel } from "../../monkey/components/MonkeyTestPanel";
import type { DeviceAutomationCardModel } from "../../types";
import type { CrashAnalysisPrefill, StabilityAssuranceMode } from "../types";
import { CrashAnalysisPanel } from "./CrashAnalysisPanel";
import { StabilityModeSwitch } from "./StabilityModeSwitch";

export interface StabilityAssurancePanelProps {
  devices: DeviceAutomationCardModel[];
}

export function StabilityAssurancePanel({ devices }: StabilityAssurancePanelProps) {
  const { t } = useTranslation("deviceAutomation");
  const [mode, setMode] = useState<StabilityAssuranceMode>("stress-test");
  const [crashPrefill, setCrashPrefill] = useState<CrashAnalysisPrefill | null>(
    null,
  );

  const handleOpenCrashAnalysis = useCallback((prefill: CrashAnalysisPrefill) => {
    setCrashPrefill(prefill);
    setMode("crash-analysis");
  }, []);

  return (
    <div
      className="flex min-h-full flex-col gap-4"
      data-testid="stability-assurance-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--ember-text,#4a4a45)]">
            {t("deviceAutomation.stability.title")}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.stability.subtitle")}
          </p>
        </div>
        <StabilityModeSwitch mode={mode} onModeChange={setMode} />
      </div>

      {mode === "stress-test" ? (
        <MonkeyTestPanel
          devices={devices}
          onOpenCrashAnalysis={handleOpenCrashAnalysis}
        />
      ) : (
        <CrashAnalysisPanel prefill={crashPrefill} />
      )}
    </div>
  );
}
