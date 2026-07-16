import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExploreRule, ExploreRuleKind } from "../types";
import { HardAssertionFields } from "./HardAssertionFields";

export interface ExploreRuleEditorCardProps {
  rule: ExploreRule;
  disabled?: boolean;
  onChange: (rule: ExploreRule) => void;
  onRemove: () => void;
}

export function ExploreRuleEditorCard({
  rule,
  disabled,
  onChange,
  onRemove,
}: ExploreRuleEditorCardProps) {
  const { t } = useTranslation("deviceAutomation");

  const setKind = (kind: ExploreRuleKind) => {
    onChange({
      ...rule,
      kind,
      precondition: kind === "property" ? rule.precondition : undefined,
    });
  };

  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
      data-testid={`explore-rule-${rule.id}`}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <label className="text-xs text-neutral-600">
            {t("deviceAutomation.explore.rule.name")}
          </label>
          <Input
            value={rule.name}
            onChange={(e) => onChange({ ...rule, name: e.target.value })}
            disabled={disabled}
            className="h-8"
          />
        </div>
        <div className="flex min-w-[120px] flex-col gap-1">
          <label className="text-xs text-neutral-600">
            {t("deviceAutomation.explore.rule.kind")}
          </label>
          <Select
            value={rule.kind}
            onValueChange={(v) => setKind(v as ExploreRuleKind)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invariant">
                {t("deviceAutomation.explore.rule.kindInvariant")}
              </SelectItem>
              <SelectItem value="property">
                {t("deviceAutomation.explore.rule.kindProperty")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Checkbox
            checked={rule.enabled}
            onCheckedChange={(checked) =>
              onChange({ ...rule, enabled: checked === true })
            }
            disabled={disabled}
          />
          <span className="text-sm text-neutral-700">
            {t("deviceAutomation.explore.rule.enabled")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-neutral-500"
            onClick={onRemove}
            disabled={disabled}
            aria-label={t("deviceAutomation.explore.rule.remove")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {rule.kind === "property" ? (
        <div className="mt-3">
          <HardAssertionFields
            label={t("deviceAutomation.explore.rule.precondition")}
            value={
              rule.precondition ?? {
                locatorKind: "text",
                value: "",
                match: "contains",
                present: true,
              }
            }
            onChange={(precondition) => onChange({ ...rule, precondition })}
            disabled={disabled}
          />
        </div>
      ) : null}

      <div className="mt-3">
        <HardAssertionFields
          label={t("deviceAutomation.explore.rule.assertion")}
          value={rule.assertion}
          onChange={(assertion) => onChange({ ...rule, assertion })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
