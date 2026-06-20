import { ExternalLink, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { openPathWithDefaultApp } from "@/lib/api/fileSystem";
import type { MonkeyLogLine, MonkeySessionSummary } from "../types";

interface MonkeyTestLogPanelProps {
  logs: MonkeyLogLine[];
  isRunning: boolean;
  lastSummary: MonkeySessionSummary | null;
}

export function MonkeyTestLogPanel({
  logs,
  isRunning,
  lastSummary,
}: MonkeyTestLogPanelProps) {
  const { t } = useTranslation("deviceAutomation");

  const openPath = (path: string) => {
    void openPathWithDefaultApp(path);
  };

  return (
    <div
      className="flex h-full min-h-[280px] max-h-[min(560px,55vh)] flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      data-testid="monkey-test-log-panel"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">
          {t("deviceAutomation.monkey.log.title")}
        </h3>
        {lastSummary?.bugReportPath || lastSummary?.localResultDir ? (
          <div className="flex flex-wrap gap-2">
            {lastSummary.bugReportPath ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => openPath(lastSummary.bugReportPath!)}
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                {t("deviceAutomation.monkey.log.openReport")}
              </Button>
            ) : null}
            {lastSummary.localResultDir ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => openPath(lastSummary.localResultDir!)}
              >
                <FolderOpen className="mr-1.5 size-3.5" />
                {t("deviceAutomation.monkey.log.openResultDir")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {lastSummary ? (
        <p className="mt-2 shrink-0 text-xs text-neutral-600">
          {t("deviceAutomation.monkey.log.summary", {
            conclusion: lastSummary.conclusion ?? "unknown",
            events: lastSummary.eventsInjected ?? 0,
            crashes: lastSummary.crashCount,
            anrs: lastSummary.anrCount,
          })}
        </p>
      ) : null}
      {lastSummary?.stepsSummary ? (
        <p className="mt-1 shrink-0 text-xs text-neutral-500">
          {t("deviceAutomation.monkey.log.stepsSummary", {
            monkey: lastSummary.stepsSummary.monkeyStepCount,
            script: lastSummary.stepsSummary.scriptInfoCount,
            lastStep: lastSummary.stepsSummary.lastMonkeyStep ?? 0,
          })}
        </p>
      ) : null}
      <div
        className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-neutral-100 bg-neutral-50 p-3 font-mono text-[11px] leading-5 text-neutral-700"
      >
        {logs.length === 0 && !isRunning ? (
          <p className="text-neutral-500">
            {t("deviceAutomation.monkey.log.empty")}
          </p>
        ) : (
          logs.map((line, index) => (
            <div
              key={`${line.ts}-${index}`}
              className={
                line.type === "crash" || line.type === "anr"
                  ? "text-red-700"
                  : line.type === "error"
                    ? "text-amber-800"
                    : undefined
              }
            >
              {line.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
