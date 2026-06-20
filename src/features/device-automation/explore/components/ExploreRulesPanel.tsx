import { Loader2, Plus, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ExploreConfig, ExploreRule } from "../types";
import {
  createEmptyExploreRule,
  formatLineList,
  parseLineList,
} from "../domain/exploreRuleDefaults";
import { ExploreRuleEditorCard } from "./ExploreRuleEditorCard";

export interface ExploreRulesPanelProps {
  rules: ExploreRule[];
  config: ExploreConfig;
  loading?: boolean;
  saving?: boolean;
  disabled?: boolean;
  onRulesChange: (rules: ExploreRule[]) => void;
  onConfigChange: (config: ExploreConfig) => void;
  onSave: () => Promise<void>;
}

export function ExploreRulesPanel({
  rules,
  config,
  loading,
  saving,
  disabled,
  onRulesChange,
  onConfigChange,
  onSave,
}: ExploreRulesPanelProps) {
  const { t } = useTranslation("deviceAutomation");

  const handleSave = () => {
    void onSave()
      .then(() => toast.success(t("deviceAutomation.explore.saveSuccess")))
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : String(error),
        );
      });
  };

  const addRule = (kind: "invariant" | "property") => {
    onRulesChange([...rules, createEmptyExploreRule(kind)]);
  };

  const updateRule = (index: number, next: ExploreRule) => {
    onRulesChange(rules.map((rule, i) => (i === index ? next : rule)));
  };

  const removeRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      data-testid="explore-rules-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            {t("deviceAutomation.explore.title")}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            {t("deviceAutomation.explore.subtitle")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || saving || loading}
          onClick={handleSave}
        >
          {saving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-4" />
          )}
          {t("deviceAutomation.explore.save")}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">
          {t("deviceAutomation.explore.loading")}
        </p>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t("deviceAutomation.explore.configTitle")}
        </h4>
        <label className="block space-y-1 text-xs text-neutral-600">
          {t("deviceAutomation.explore.actWhitelist")}
          <Textarea
            value={formatLineList(config.actWhitelist)}
            onChange={(e) =>
              onConfigChange({
                ...config,
                actWhitelist: parseLineList(e.target.value),
                actBlacklist:
                  parseLineList(e.target.value).length > 0
                    ? []
                    : config.actBlacklist,
              })
            }
            disabled={disabled}
            rows={3}
            placeholder={t("deviceAutomation.explore.actListPlaceholder")}
          />
        </label>
        <label className="block space-y-1 text-xs text-neutral-600">
          {t("deviceAutomation.explore.actBlacklist")}
          <Textarea
            value={formatLineList(config.actBlacklist)}
            onChange={(e) =>
              onConfigChange({
                ...config,
                actBlacklist: parseLineList(e.target.value),
                actWhitelist:
                  parseLineList(e.target.value).length > 0
                    ? []
                    : config.actWhitelist,
              })
            }
            disabled={disabled}
            rows={3}
            placeholder={t("deviceAutomation.explore.actListPlaceholder")}
          />
        </label>
        <p className="text-[11px] text-neutral-500">
          {t("deviceAutomation.explore.actListHint")}
        </p>
        <label className="block space-y-1 text-xs text-neutral-600">
          {t("deviceAutomation.explore.blockWidgets")}
          <Textarea
            value={formatLineList(config.blockWidgetXpaths)}
            onChange={(e) =>
              onConfigChange({
                ...config,
                blockWidgetXpaths: parseLineList(e.target.value),
              })
            }
            disabled={disabled}
            rows={3}
            placeholder={t("deviceAutomation.explore.xpathPlaceholder")}
          />
        </label>
        <label className="block space-y-1 text-xs text-neutral-600">
          {t("deviceAutomation.explore.blockTrees")}
          <Textarea
            value={formatLineList(config.blockTreeXpaths)}
            onChange={(e) =>
              onConfigChange({
                ...config,
                blockTreeXpaths: parseLineList(e.target.value),
              })
            }
            disabled={disabled}
            rows={2}
            placeholder={t("deviceAutomation.explore.xpathPlaceholder")}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t("deviceAutomation.explore.rulesTitle")}
          </h4>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => addRule("invariant")}
            >
              <Plus className="mr-1 size-3.5" />
              {t("deviceAutomation.explore.addInvariant")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => addRule("property")}
            >
              <Plus className="mr-1 size-3.5" />
              {t("deviceAutomation.explore.addProperty")}
            </Button>
          </div>
        </div>
        {rules.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {t("deviceAutomation.explore.rulesEmpty")}
          </p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <ExploreRuleEditorCard
                key={rule.id}
                rule={rule}
                disabled={disabled}
                onChange={(next) => updateRule(index, next)}
                onRemove={() => removeRule(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
