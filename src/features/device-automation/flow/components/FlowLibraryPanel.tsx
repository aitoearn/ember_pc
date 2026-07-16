import { Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { TestFlow } from "../domain/flowFormat";

interface FlowLibraryPanelProps {
  flows: TestFlow[];
  loading: boolean;
  error: string;
  selectedFlowId: string | null;
  onSelect: (flowId: string) => void;
  onDelete: (flowId: string) => void;
}

export function FlowLibraryPanel({
  flows,
  loading,
  error,
  selectedFlowId,
  onSelect,
  onDelete,
}: FlowLibraryPanelProps) {
  const { t } = useTranslation("deviceAutomation");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="size-4 animate-spin" />
        {t("deviceAutomation.flow.library.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        {t("deviceAutomation.flow.library.empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
      {flows.map((flow) => {
        const selected = flow.id === selectedFlowId;
        return (
          <li
            key={flow.id}
            className={`flex items-center justify-between gap-2 px-3 py-2 ${selected ? "bg-violet-50" : ""}`}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onSelect(flow.id)}
            >
              <span className="block truncate text-sm font-medium text-neutral-900">
                {flow.name}
              </span>
              <span className="block truncate text-xs text-neutral-500">
                {flow.appPackage} · {flow.steps.length}{" "}
                {t("deviceAutomation.flow.library.stepCount")}
              </span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-neutral-500 hover:text-red-600"
              aria-label={t("deviceAutomation.flow.library.delete")}
              onClick={() => onDelete(flow.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
