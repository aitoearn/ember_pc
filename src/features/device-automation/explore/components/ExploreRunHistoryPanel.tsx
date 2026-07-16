import { ExternalLink, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { openPathWithDefaultApp } from "@/lib/api/fileSystem";
import type { ExploreRun } from "../types";

export interface ExploreRunHistoryPanelProps {
  runs: ExploreRun[];
  loading?: boolean;
}

function formatRunTime(value: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function ExploreRunHistoryPanel({
  runs,
  loading,
}: ExploreRunHistoryPanelProps) {
  const { t } = useTranslation("deviceAutomation");

  const openPath = (path: string) => {
    void openPathWithDefaultApp(path);
  };

  return (
    <div
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      data-testid="explore-run-history-panel"
    >
      <h3 className="text-sm font-semibold text-neutral-900">
        {t("deviceAutomation.explore.runs.title")}
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        {t("deviceAutomation.explore.runs.subtitle")}
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-neutral-500">
          {t("deviceAutomation.explore.runs.loading")}
        </p>
      ) : runs.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          {t("deviceAutomation.explore.runs.empty")}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-500">
                <th className="py-2 pr-3 font-medium">
                  {t("deviceAutomation.explore.runs.colTime")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("deviceAutomation.explore.runs.colApp")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("deviceAutomation.explore.runs.colEngine")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("deviceAutomation.explore.runs.colConclusion")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("deviceAutomation.explore.runs.colSteps")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("deviceAutomation.explore.runs.colRules")}
                </th>
                <th className="py-2 font-medium">
                  {t("deviceAutomation.explore.runs.colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-neutral-50 text-neutral-800"
                  data-testid={`explore-run-row-${run.id}`}
                >
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {formatRunTime(run.startedAt)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px]">
                    {run.packageName}
                  </td>
                  <td className="py-2 pr-3">
                    {run.engineMode === "fastbot"
                      ? t("deviceAutomation.monkey.toolbar.engineMode.fastbot")
                      : t("deviceAutomation.monkey.toolbar.engineMode.system")}
                  </td>
                  <td className="py-2 pr-3">{run.conclusion}</td>
                  <td className="py-2 pr-3">{run.eventsInjected}</td>
                  <td className="py-2 pr-3">
                    {run.ruleFailuresCount > 0
                      ? t("deviceAutomation.explore.runs.ruleFailures", {
                          count: run.ruleFailuresCount,
                        })
                      : t("deviceAutomation.explore.runs.ruleFailuresNone")}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {run.bugReportPath ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openPath(run.bugReportPath!)}
                        >
                          <ExternalLink className="mr-1 size-3" />
                          {t("deviceAutomation.monkey.log.openReport")}
                        </Button>
                      ) : null}
                      {run.localResultDir ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openPath(run.localResultDir!)}
                        >
                          <FolderOpen className="mr-1 size-3" />
                          {t("deviceAutomation.monkey.log.openResultDir")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
