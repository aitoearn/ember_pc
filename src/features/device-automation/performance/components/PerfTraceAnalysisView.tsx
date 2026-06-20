import { useTranslation } from "react-i18next";
import type {
  PerfTraceAnalysisType,
  PerformanceTraceAnalysis,
} from "../types";

const ANALYSIS_TYPE_KEYS = {
  jank_summary: "deviceAutomation.performance.trace.analysis.jank",
  startup_summary: "deviceAutomation.performance.trace.analysis.startup",
  cpu_quadrant: "deviceAutomation.performance.trace.analysis.cpu",
} as const satisfies Record<PerfTraceAnalysisType, `deviceAutomation.${string}`>;

export interface PerfTraceAnalysisViewProps {
  analyses: PerformanceTraceAnalysis[];
  loading: boolean;
  analyzingType: PerfTraceAnalysisType | null;
  onRunAnalysis: (analysisType: PerfTraceAnalysisType) => void;
  disabled?: boolean;
}

function parseResultJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function renderResultSummary(
  analysisType: PerfTraceAnalysisType,
  result: Record<string, unknown>,
  noDataLabel: string,
): string {
  if (result.dataStatus === "empty") {
    const note = result.note;
    return typeof note === "string" && note.length > 0 ? note : noDataLabel;
  }

  if (analysisType === "jank_summary") {
    if (Number(result.totalFrames ?? 0) === 0) {
      const note = result.note;
      return typeof note === "string" && note.length > 0 ? note : noDataLabel;
    }
    return `P99 ${result.p99FrameMs ?? "—"} ms · jank ${result.jankFrames ?? 0}`;
  }
  if (analysisType === "startup_summary") {
    if (
      Number(result.timeToDisplayMs ?? 0) === 0 &&
      Number(result.startupCount ?? 0) === 0
    ) {
      const note = result.note;
      return typeof note === "string" && note.length > 0 ? note : noDataLabel;
    }
    return `TTD ${result.timeToDisplayMs ?? "—"} ms`;
  }
  if (analysisType === "cpu_quadrant") {
    const top = (result.topThreads as { name?: string; cpuPercent?: number }[] | undefined)?.[0];
    return top ? `${top.name} ${top.cpuPercent}%` : "—";
  }
  return "";
}

export function PerfTraceAnalysisView({
  analyses,
  loading,
  analyzingType,
  onRunAnalysis,
  disabled = false,
}: PerfTraceAnalysisViewProps) {
  const { t } = useTranslation("deviceAutomation");
  const noDataLabel = t("deviceAutomation.performance.trace.analysis.noData");
  const latest = analyses[0] ?? null;
  const latestResult = latest ? parseResultJson(latest.resultJson) : null;

  return (
    <section
      className="rounded-xl border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)] p-4"
      data-testid="perf-trace-analysis-view"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">
          {t("deviceAutomation.performance.trace.analysis.title")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ANALYSIS_TYPE_KEYS) as PerfTraceAnalysisType[]).map(
            (analysisType) => (
              <button
                key={analysisType}
                type="button"
                className="rounded-md border border-[color:var(--ember-surface-border,#ececea)] px-2.5 py-1 text-xs hover:bg-[color:var(--ember-surface-muted,#f7f7f5)] disabled:opacity-50"
                disabled={disabled || analyzingType !== null}
                data-testid={`perf-trace-analyze-${analysisType}`}
                onClick={() => onRunAnalysis(analysisType)}
              >
                {analyzingType === analysisType
                  ? t("deviceAutomation.performance.trace.analysis.running")
                  : t(ANALYSIS_TYPE_KEYS[analysisType])}
              </button>
            ),
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
          {t("deviceAutomation.performance.trace.analysis.loading")}
        </p>
      ) : latest && latestResult ? (
        <div className="space-y-2" data-testid="perf-trace-analysis-latest">
          <p className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
            {t(`deviceAutomation.performance.trace.analysis.${latest.analysisType}`)} ·{" "}
            {new Date(latest.createdAt).toLocaleString()}
          </p>
          <p
            className={`text-sm font-medium ${
              latestResult.dataStatus === "empty"
                ? "text-[color:var(--ember-text-muted,#6b6b66)]"
                : ""
            }`}
          >
            {renderResultSummary(latest.analysisType, latestResult, noDataLabel)}
          </p>
          <pre className="max-h-48 overflow-auto rounded-md bg-[color:var(--ember-surface-muted,#f7f7f5)] p-3 text-xs">
            {JSON.stringify(latestResult, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
          {t("deviceAutomation.performance.trace.analysis.empty")}
        </p>
      )}

      {analyses.length > 1 ? (
        <ul className="mt-4 space-y-1 border-t border-[color:var(--ember-surface-border,#ececea)] pt-3">
          {analyses.slice(1, 6).map((analysis) => {
            const result = parseResultJson(analysis.resultJson);
            return (
              <li
                key={analysis.id}
                className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]"
              >
                {t(`deviceAutomation.performance.trace.analysis.${analysis.analysisType}`)} ·{" "}
                {renderResultSummary(analysis.analysisType, result, noDataLabel)}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
