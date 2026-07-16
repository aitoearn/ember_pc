import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getRecommendedAnalysesForPreset,
  isRecommendedAnalysis,
} from "../constants/traceAnalysisRecommendations";
import type {
  PerfTraceAnalysisOptions,
  PerfTraceAnalysisType,
  PerfTracePresetId,
  PerformanceTraceAnalysis,
} from "../types";
import {
  parseTraceAnalysisResult,
  PerfTraceAnalysisRawJson,
  PerfTraceAnalysisResultDetails,
} from "./PerfTraceAnalysisResultDetails";

const ANALYSIS_TYPE_KEYS = {
  jank_summary: "deviceAutomation.performance.trace.analysis.jank",
  jank_frame_detail: "deviceAutomation.performance.trace.analysis.jankFrameDetail",
  startup_summary: "deviceAutomation.performance.trace.analysis.startup",
  cpu_quadrant: "deviceAutomation.performance.trace.analysis.cpu",
  memory_summary: "deviceAutomation.performance.trace.analysis.memory",
  anr_summary: "deviceAutomation.performance.trace.analysis.anr",
} as const satisfies Record<PerfTraceAnalysisType, `deviceAutomation.${string}`>;

export interface PerfTraceAnalysisViewProps {
  analyses: PerformanceTraceAnalysis[];
  loading: boolean;
  analyzingType: PerfTraceAnalysisType | null;
  onRunAnalysis: (
    analysisType: PerfTraceAnalysisType,
    options?: PerfTraceAnalysisOptions,
  ) => void;
  disabled?: boolean;
  artifactPresetId?: PerfTracePresetId | null;
}

export function PerfTraceAnalysisView({
  analyses,
  loading,
  analyzingType,
  onRunAnalysis,
  disabled = false,
  artifactPresetId = null,
}: PerfTraceAnalysisViewProps) {
  const { t } = useTranslation("deviceAutomation");
  const noDataLabel = t("deviceAutomation.performance.trace.analysis.noData");
  const latest = analyses[0] ?? null;
  const latestResult = latest ? parseTraceAnalysisResult(latest.resultJson) : null;
  const recommended = getRecommendedAnalysesForPreset(artifactPresetId);

  return (
    <section
      className="rounded-xl border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)] p-4"
      data-testid="perf-trace-analysis-view"
    >
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">
            {t("deviceAutomation.performance.trace.analysis.title")}
          </h3>
          {recommended.length > 0 ? (
            <p className="flex items-center gap-1 text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
              <Sparkles className="h-3.5 w-3.5" />
              {t("deviceAutomation.performance.trace.analysis.recommendedHint")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ANALYSIS_TYPE_KEYS) as PerfTraceAnalysisType[]).map(
            (analysisType) => {
              const isRecommended = isRecommendedAnalysis(artifactPresetId, analysisType);
              return (
                <button
                  key={analysisType}
                  type="button"
                  className={`rounded-md border px-2.5 py-1 text-xs hover:bg-[color:var(--ember-surface-muted,#f7f7f5)] disabled:opacity-50 ${
                    isRecommended
                      ? "border-[color:var(--ember-accent,#2563eb)] bg-[color:color-mix(in_srgb,var(--ember-accent,#2563eb)_8%,transparent)]"
                      : "border-[color:var(--ember-surface-border,#ececea)]"
                  }`}
                  disabled={disabled || analyzingType !== null}
                  data-testid={`perf-trace-analyze-${analysisType}`}
                  onClick={() => onRunAnalysis(analysisType)}
                >
                  {analyzingType === analysisType
                    ? t("deviceAutomation.performance.trace.analysis.running")
                    : t(ANALYSIS_TYPE_KEYS[analysisType])}
                  {isRecommended ? " ★" : ""}
                </button>
              );
            },
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
          {t("deviceAutomation.performance.trace.analysis.loading")}
        </p>
      ) : latest && latestResult ? (
        <div className="space-y-3" data-testid="perf-trace-analysis-latest">
          <p className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
            {t(`deviceAutomation.performance.trace.analysis.${latest.analysisType}`)} ·{" "}
            {new Date(latest.createdAt).toLocaleString()}
          </p>
          <PerfTraceAnalysisResultDetails
            analysisType={latest.analysisType}
            result={latestResult}
            noDataLabel={noDataLabel}
            onAnalyzeJankFrame={
              latest.analysisType === "jank_summary"
                ? (highlight) => {
                    onRunAnalysis("jank_frame_detail", { frameTarget: highlight });
                  }
                : undefined
            }
          />
          {latest.analysisType === "jank_summary" &&
          latestResult.dataStatus !== "empty" &&
          Number(latestResult.jankFrames ?? 0) > 0 ? (
            <button
              type="button"
              className="rounded-md border border-[color:var(--ember-accent,#2563eb)] px-3 py-1.5 text-xs text-[color:var(--ember-accent,#2563eb)] hover:bg-[color:color-mix(in_srgb,var(--ember-accent,#2563eb)_8%,transparent)] disabled:opacity-50"
              disabled={disabled || analyzingType !== null}
              data-testid="perf-trace-drilldown-jank-frame-detail"
              onClick={() => onRunAnalysis("jank_frame_detail")}
            >
              {analyzingType === "jank_frame_detail"
                ? t("deviceAutomation.performance.trace.analysis.running")
                : t("deviceAutomation.performance.trace.analysis.drillDownJankFrameDetail")}
            </button>
          ) : null}
          <PerfTraceAnalysisRawJson result={latestResult} />
        </div>
      ) : (
        <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
          {t("deviceAutomation.performance.trace.analysis.empty")}
        </p>
      )}

      {analyses.length > 1 ? (
        <ul className="mt-4 space-y-1 border-t border-[color:var(--ember-surface-border,#ececea)] pt-3">
          {analyses.slice(1, 6).map((analysis) => {
            const result = parseTraceAnalysisResult(analysis.resultJson);
            const summary =
              result.dataStatus === "empty"
                ? typeof result.note === "string" && result.note.length > 0
                  ? result.note
                  : noDataLabel
                : t(`deviceAutomation.performance.trace.analysis.historyLine.${analysis.analysisType}`, {
                    defaultValue: analysis.analysisType,
                    ...(result as Record<string, unknown>),
                  });
            return (
              <li
                key={analysis.id}
                className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]"
              >
                {t(`deviceAutomation.performance.trace.analysis.${analysis.analysisType}`)} · {summary}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
