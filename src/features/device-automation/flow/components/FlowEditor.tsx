import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FlowStep, TestFlow } from "../domain/flowFormat";
import { isFlowFormatCompatible } from "../domain/flowFormat";

interface FlowEditorProps {
  flow: TestFlow | null;
  onSave: (flow: TestFlow) => Promise<void>;
}

export function FlowEditor({ flow, onSave }: FlowEditorProps) {
  const { t } = useTranslation("deviceAutomation");
  const [name, setName] = useState("");
  const [appPackage, setAppPackage] = useState("");
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!flow) {
      setName("");
      setAppPackage("");
      setSteps([]);
      return;
    }
    setName(flow.name);
    setAppPackage(flow.appPackage);
    setSteps(flow.steps);
  }, [flow]);

  if (!flow) {
    return (
      <p className="text-sm text-neutral-500">
        {t("deviceAutomation.flow.editor.emptySelection")}
      </p>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...flow,
        name: name.trim(),
        appPackage: appPackage.trim(),
        steps,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4">
      {!isFlowFormatCompatible(flow.formatVersion) ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("deviceAutomation.flow.editor.formatIncompatible", {
            version: flow.formatVersion,
          })}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t("deviceAutomation.flow.editor.name")}
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t("deviceAutomation.flow.editor.appPackage")}
          <Input
            value={appPackage}
            onChange={(e) => setAppPackage(e.target.value)}
          />
        </label>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-neutral-900">
          {t("deviceAutomation.flow.editor.stepsTitle")}
        </h4>
        <ol className="space-y-2">
          {steps.map((step) => (
            <li
              key={step.index}
              className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
            >
              <span className="font-mono font-medium text-violet-700">
                #{step.index} {step.op}
              </span>
              {step.intent ? (
                <p className="mt-1 text-neutral-600">{step.intent}</p>
              ) : null}
              {step.locators?.length ? (
                <p className="mt-1 font-mono text-[11px] text-neutral-500">
                  {step.locators.map((l) => `${l.kind}:${l.value}`).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <Button type="button" disabled={saving} onClick={() => void handleSave()}>
        {saving
          ? t("deviceAutomation.flow.editor.saving")
          : t("deviceAutomation.flow.editor.save")}
      </Button>
    </div>
  );
}
