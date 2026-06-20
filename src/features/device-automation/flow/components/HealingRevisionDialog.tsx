import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { HealingRevision } from "../domain/flowFormat";

interface HealingRevisionDialogProps {
  revisions: HealingRevision[];
  loading: boolean;
  onAccept: (id: string) => void;
  onFlagDefect: (id: string) => void;
}

/**
 * 待确认自愈修订列表：展示原/新定位差异，支持接受或标记缺陷。
 */
export function HealingRevisionDialog({
  revisions,
  loading,
  onAccept,
  onFlagDefect,
}: HealingRevisionDialogProps) {
  const { t } = useTranslation("deviceAutomation");

  if (loading) {
    return (
      <p className="text-sm text-neutral-500">
        {t("deviceAutomation.flow.healing.loading")}
      </p>
    );
  }

  if (revisions.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        {t("deviceAutomation.flow.healing.empty")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {revisions.map((revision) => (
        <li
          key={revision.id}
          className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-neutral-700"
        >
          <p className="font-medium text-neutral-900">
            {t("deviceAutomation.flow.healing.stepLabel", {
              index: revision.stepIndex,
            })}
          </p>
          <p className="mt-1 font-mono text-[11px]">
            {revision.originalLocators
              .map((l) => `${l.kind}:${l.value}`)
              .join(" · ")}
          </p>
          <p className="mt-1 font-mono text-[11px] text-violet-700">
            → {revision.healedLocator.kind}:{revision.healedLocator.value}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onAccept(revision.id)}
            >
              {t("deviceAutomation.flow.healing.accept")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onFlagDefect(revision.id)}
            >
              {t("deviceAutomation.flow.healing.flagDefect")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
