import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { PerformanceSession } from "../types";

export interface PerformanceSessionHistoryProps {
  sessions: PerformanceSession[];
  loading: boolean;
  onSelectSession: (session: PerformanceSession) => void;
}

function formatTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function PerformanceSessionHistory({
  sessions,
  loading,
  onSelectSession,
}: PerformanceSessionHistoryProps) {
  const { t } = useTranslation("deviceAutomation");
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="rounded-xl border border-neutral-200/80 bg-white shadow-sm"
        data-testid="performance-session-history"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              {t("deviceAutomation.performance.history.title")}
            </h3>
            <p className="text-xs text-neutral-500">
              {loading
                ? t("deviceAutomation.list.loading")
                : t("deviceAutomation.performance.history.count", {
                    count: sessions.length,
                  })}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-neutral-500 transition-transform",
              open ? "rotate-180" : "",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-neutral-100 px-4 py-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("deviceAutomation.list.loading")}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {t("deviceAutomation.performance.history.empty")}
            </p>
          ) : (
            <div className="grid gap-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className="rounded-lg border border-neutral-200/80 px-3 py-2 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
                  onClick={() => onSelectSession(session)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {session.packageName}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {t(`deviceAutomation.performance.session.status.${session.status}`)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {session.deviceId} · {formatTime(session.startedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
