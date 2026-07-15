import { ExternalLink, FolderOpen, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarkdownRenderer } from "@/components/agent/chat/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { openPathWithDefaultApp, revealPathInFinder } from "@/lib/api/fileSystem";
import type { StabilityAnalysisViewState } from "../domain/stabilityAnalysisProjection";

export interface CrashAnalysisResultPanelProps {
  viewState: StabilityAnalysisViewState;
  reportMarkdown: string;
  reportLoading: boolean;
}

export function CrashAnalysisResultPanel({
  viewState,
  reportMarkdown,
  reportLoading,
}: CrashAnalysisResultPanelProps) {
  const { t } = useTranslation("deviceAutomation");
  const isRunning =
    viewState.phase === "running" || viewState.phase === "canceling";

  const openPath = (path: string) => {
    void openPathWithDefaultApp(path);
  };

  const revealDir = (path: string) => {
    void revealPathInFinder(path);
  };

  return (
    <div
      className="flex min-h-[320px] flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      data-testid="crash-analysis-result-panel"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">
          {t("deviceAutomation.stability.crash.resultTitle")}
        </h3>
        {viewState.reportDir || viewState.primaryArtifactPath ? (
          <div className="flex flex-wrap gap-2">
            {viewState.primaryArtifactPath ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => openPath(viewState.primaryArtifactPath!)}
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                {t("deviceAutomation.stability.crash.openReport")}
              </Button>
            ) : null}
            {viewState.reportDir ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => revealDir(viewState.reportDir!)}
              >
                <FolderOpen className="mr-1.5 size-3.5" />
                {t("deviceAutomation.stability.crash.openReportDir")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {viewState.errorMessage ? (
        <p
          className="mt-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
          data-testid="crash-analysis-error"
        >
          {viewState.errorMessage}
        </p>
      ) : null}

      {isRunning ? (
        <div className="mt-2 flex shrink-0 items-center gap-2 text-xs text-neutral-600">
          <Loader2 className="size-3.5 animate-spin" />
          {viewState.phase === "canceling"
            ? t("deviceAutomation.stability.crash.canceling")
            : t("deviceAutomation.stability.crash.running")}
        </div>
      ) : null}

      <div className="mt-3 grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-[220px] flex-col">
          <p className="mb-1.5 text-xs font-medium text-neutral-600">
            {t("deviceAutomation.stability.crash.logTitle")}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50 p-3 font-mono text-[11px] leading-5 text-neutral-700">
            {viewState.logs.length === 0 && !isRunning ? (
              <p className="text-neutral-500">
                {t("deviceAutomation.stability.crash.logEmpty")}
              </p>
            ) : (
              viewState.logs.map((line, index) => (
                <div
                  key={`${line.ts}-${index}`}
                  className={
                    line.type === "error" || line.type === "stderr"
                      ? "text-red-700"
                      : undefined
                  }
                >
                  {line.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-[220px] flex-col">
          <p className="mb-1.5 text-xs font-medium text-neutral-600">
            {t("deviceAutomation.stability.crash.reportPreviewTitle")}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-neutral-100 bg-white p-3 text-sm">
            {reportLoading ? (
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Loader2 className="size-3.5 animate-spin" />
                {t("deviceAutomation.stability.crash.reportLoading")}
              </div>
            ) : reportMarkdown.trim() ? (
              <MarkdownRenderer
                content={reportMarkdown}
                baseFilePath={viewState.primaryArtifactPath}
              />
            ) : (
              <p className="text-xs text-neutral-500">
                {t("deviceAutomation.stability.crash.reportEmpty")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
