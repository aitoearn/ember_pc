import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ReplayState } from "../domain/replayProjection";
import type { TestFlow } from "../domain/flowFormat";

interface FlowReplayViewProps {
  flow: TestFlow | null;
  state: ReplayState;
  running: boolean;
  selfHealingEnabled: boolean;
  onSelfHealingChange: (enabled: boolean) => void;
  onStart: () => void;
  onCancel: () => void;
  onPersist: () => void;
  platformUnsupported?: boolean;
  frequentHealing?: boolean;
}

export function FlowReplayView({
  flow,
  state,
  running,
  selfHealingEnabled,
  onSelfHealingChange,
  onStart,
  onCancel,
  onPersist,
  platformUnsupported = false,
  frequentHealing = false,
}: FlowReplayViewProps) {
  const { t } = useTranslation("deviceAutomation");

  if (!flow) {
    return (
      <p className="text-sm text-neutral-500">
        {t("deviceAutomation.flow.replay.selectFlow")}
      </p>
    );
  }

  if (platformUnsupported) {
    return (
      <p className="text-sm text-amber-700">
        {t("deviceAutomation.flow.platform.unsupported")}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={selfHealingEnabled}
            onChange={(e) => onSelfHealingChange(e.target.checked)}
            disabled={running}
          />
          {t("deviceAutomation.flow.healing.enable")}
        </label>
        {running ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("deviceAutomation.flow.replay.cancel")}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onStart}>
            {t("deviceAutomation.flow.replay.start")}
          </Button>
        )}
        {state.status === "done" ? (
          <Button type="button" variant="secondary" size="sm" onClick={onPersist}>
            {t("deviceAutomation.flow.replay.persistRun")}
          </Button>
        ) : null}
      </div>

      {running ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="size-4 animate-spin" />
          {t("deviceAutomation.flow.replay.running")}
        </div>
      ) : null}

      {frequentHealing ? (
        <p className="mt-3 text-sm text-amber-800">
          {t("deviceAutomation.flow.healing.frequentHint")}
        </p>
      ) : null}

      {state.summary ? (
        <p className="mt-3 text-sm text-neutral-700">
          {state.summary}
          {state.status === "done" ? (
            <span className="ml-2 text-xs text-neutral-500">
              token={state.llmTokenUsed}
            </span>
          ) : null}
        </p>
      ) : null}

      <ol className="mt-4 space-y-2">
        {state.steps.map((step) => (
          <li
            key={step.index}
            className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs"
          >
            <span className="font-mono font-medium text-violet-700">
              #{step.index} {step.op} · {step.status}
            </span>
            {step.locatorKind ? (
              <span className="ml-2 text-neutral-500">{step.locatorKind}</span>
            ) : null}
            {step.screenshot ? (
              <img
                src={step.screenshot}
                alt=""
                className="mt-2 max-h-24 rounded border border-neutral-200"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
