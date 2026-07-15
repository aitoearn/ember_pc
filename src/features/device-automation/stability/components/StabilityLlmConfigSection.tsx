import { Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StabilityLlmConfig } from "../types";

export interface StabilityLlmConfigSectionProps {
  draft: {
    baseUrl: string;
    model: string;
    apiKey: string;
    provider: StabilityLlmConfig["provider"];
  };
  loading: boolean;
  saving: boolean;
  isConfigured: boolean;
  onDraftChange: (
    patch: Partial<StabilityLlmConfigSectionProps["draft"]>,
  ) => void;
  onSave: () => void;
}

const PROVIDERS: StabilityLlmConfig["provider"][] = [
  "openai",
  "deepseek",
  "zhipu_bigmodel",
];

export function StabilityLlmConfigSection({
  draft,
  loading,
  saving,
  isConfigured,
  onDraftChange,
  onSave,
}: StabilityLlmConfigSectionProps) {
  const { t } = useTranslation("deviceAutomation");

  return (
    <section
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      data-testid="stability-llm-config-section"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            {t("deviceAutomation.stability.llm.title")}
          </h3>
          <p className="mt-1 text-xs text-neutral-600">
            {t("deviceAutomation.stability.llm.description")}
          </p>
        </div>
        {isConfigured ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            {t("deviceAutomation.stability.llm.configured")}
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            {t("deviceAutomation.stability.llm.notConfigured")}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="stability-llm-provider">
            {t("deviceAutomation.stability.llm.provider")}
          </Label>
          <Select
            value={draft.provider}
            onValueChange={(value) =>
              onDraftChange({
                provider: value as StabilityLlmConfig["provider"],
              })
            }
            disabled={loading || saving}
          >
            <SelectTrigger id="stability-llm-provider" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {t(`deviceAutomation.stability.llm.providers.${provider}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stability-llm-model">
            {t("deviceAutomation.stability.llm.model")}
          </Label>
          <Input
            id="stability-llm-model"
            value={draft.model}
            onChange={(event) => onDraftChange({ model: event.target.value })}
            placeholder={t("deviceAutomation.stability.llm.modelPlaceholder")}
            disabled={loading || saving}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="stability-llm-base-url">
            {t("deviceAutomation.stability.llm.baseUrl")}
          </Label>
          <Input
            id="stability-llm-base-url"
            value={draft.baseUrl}
            onChange={(event) => onDraftChange({ baseUrl: event.target.value })}
            placeholder={t("deviceAutomation.stability.llm.baseUrlPlaceholder")}
            disabled={loading || saving}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="stability-llm-api-key">
            {t("deviceAutomation.stability.llm.apiKey")}
          </Label>
          <Input
            id="stability-llm-api-key"
            type="password"
            value={draft.apiKey}
            onChange={(event) => onDraftChange({ apiKey: event.target.value })}
            placeholder={t("deviceAutomation.stability.llm.apiKeyPlaceholder")}
            disabled={loading || saving}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => void onSave()}
          disabled={loading || saving}
        >
          {saving ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-3.5" />
          )}
          {t("deviceAutomation.stability.llm.save")}
        </Button>
      </div>
    </section>
  );
}
