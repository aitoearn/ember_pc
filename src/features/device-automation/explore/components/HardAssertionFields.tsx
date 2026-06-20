import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HardAssertionExpr } from "../../flow/domain/flowFormat";
import { isExploreLocatorKind, isTextMatch, EXPLORE_LOCATOR_KINDS } from "../domain/exploreRuleDefaults";

export interface HardAssertionFieldsProps {
  label?: string;
  value: HardAssertionExpr;
  onChange: (value: HardAssertionExpr) => void;
  disabled?: boolean;
}

export function HardAssertionFields({
  label,
  value,
  onChange,
  disabled,
}: HardAssertionFieldsProps) {
  const { t } = useTranslation("deviceAutomation");

  return (
    <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/80 p-3">
      {label ? (
        <p className="text-xs font-medium text-neutral-700">{label}</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-neutral-600">
          {t("deviceAutomation.explore.assertion.locatorKind")}
          <Select
            value={value.locatorKind}
            onValueChange={(v) => {
              if (!isExploreLocatorKind(v)) {
                return;
              }
              onChange({ ...value, locatorKind: v });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPLORE_LOCATOR_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {t(`deviceAutomation.explore.locatorKind.${kind}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-xs text-neutral-600">
          {t("deviceAutomation.explore.assertion.match")}
          <Select
            value={value.match ?? "contains"}
            onValueChange={(v) => {
              if (!isTextMatch(v)) {
                return;
              }
              onChange({ ...value, match: v });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">
                {t("deviceAutomation.explore.assertion.matchContains")}
              </SelectItem>
              <SelectItem value="exact">
                {t("deviceAutomation.explore.assertion.matchExact")}
              </SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-xs text-neutral-600 sm:col-span-2">
          {t("deviceAutomation.explore.assertion.value")}
          <Input
            value={value.value}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
            disabled={disabled}
            className="h-8"
            placeholder={t("deviceAutomation.explore.assertion.valuePlaceholder")}
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`present-${value.locatorKind}-${value.value}`}
          checked={value.present}
          onCheckedChange={(checked) =>
            onChange({ ...value, present: checked === true })
          }
          disabled={disabled}
        />
        <label
          htmlFor={`present-${value.locatorKind}-${value.value}`}
          className="text-sm text-neutral-700"
        >
          {t("deviceAutomation.explore.assertion.present")}
        </label>
      </div>
    </div>
  );
}
