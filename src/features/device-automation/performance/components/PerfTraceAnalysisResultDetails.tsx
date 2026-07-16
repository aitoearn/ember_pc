import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PerfTraceAnalysisType, PerfTraceFrameTarget } from "../types";

export function parseTraceAnalysisResult(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function MetricCard(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface-muted,#f7f7f5)] px-3 py-2">
      <p className="text-[11px] text-[color:var(--ember-text-muted,#6b6b66)]">{props.label}</p>
      <p className="text-sm font-semibold tabular-nums">{props.value}</p>
      {props.hint ? (
        <p className="mt-0.5 text-[11px] text-[color:var(--ember-text-muted,#6b6b66)]">
          {props.hint}
        </p>
      ) : null}
    </div>
  );
}

function EmptyNote({ note, fallback }: { note?: unknown; fallback: string }) {
  const text = typeof note === "string" && note.length > 0 ? note : fallback;
  return (
    <p className="rounded-lg border border-dashed border-[color:var(--ember-surface-border,#ececea)] px-3 py-4 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
      {text}
    </p>
  );
}

function JankResultBody({
  result,
  noDataLabel,
  onAnalyzeJankFrame,
}: {
  result: Record<string, unknown>;
  noDataLabel: string;
  onAnalyzeJankFrame?: (target: PerfTraceFrameTarget) => void;
}) {
  const { t } = useTranslation("deviceAutomation");
  if (result.dataStatus === "empty") {
    return <EmptyNote note={result.note} fallback={noDataLabel} />;
  }

  const highlights =
    (result.highlights as
      | {
          frameMs?: number;
          rootCauseSummary?: string;
          jankType?: string | null;
          tsNs?: number;
          frameId?: number | null;
        }[]
      | undefined) ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.totalFrames")}
          value={String(result.totalFrames ?? 0)}
        />
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.jankFrames")}
          value={String(result.jankFrames ?? 0)}
        />
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.p99Frame")}
          value={`${result.p99FrameMs ?? "—"} ms`}
        />
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.severeJank")}
          value={String(result.severeJankFrames ?? 0)}
        />
      </div>
      {highlights.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.trace.analysis.metrics.topJankFrames")}
          </p>
          <ul className="space-y-1.5">
            {highlights.slice(0, 5).map((item, index) => (
              <li
                key={`${item.frameMs}-${index}`}
                className="rounded-md border border-[color:var(--ember-surface-border,#ececea)] px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium tabular-nums">
                      {item.frameMs?.toFixed?.(1) ?? item.frameMs} ms
                    </span>
                    <span className="mx-1.5 text-[color:var(--ember-text-muted,#6b6b66)]">·</span>
                    <span>{item.rootCauseSummary ?? item.jankType ?? "—"}</span>
                  </div>
                  {onAnalyzeJankFrame && item.tsNs ? (
                    <button
                      type="button"
                      className="shrink-0 text-[color:var(--ember-accent,#2563eb)] hover:underline"
                      data-testid={`perf-trace-analyze-highlight-${index}`}
                      onClick={() =>
                        onAnalyzeJankFrame({
                          ...(item.frameId != null ? { frameId: item.frameId } : {}),
                          startTsNs: Math.round(Number(item.tsNs)),
                          ...(item.frameMs
                            ? {
                                endTsNs: Math.round(
                                  Number(item.tsNs) + Number(item.frameMs) * 1e6,
                                ),
                              }
                            : {}),
                        })
                      }
                    >
                      {t("deviceAutomation.performance.trace.analysis.analyzeThisFrame")}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function JankFrameDetailBody({
  result,
  noDataLabel,
}: {
  result: Record<string, unknown>;
  noDataLabel: string;
}) {
  const { t } = useTranslation("deviceAutomation");
  if (result.dataStatus === "empty") {
    return <EmptyNote note={result.note} fallback={noDataLabel} />;
  }

  const frame = (result.frame as { frameMs?: number; jankType?: string | null; frameId?: number | null }) ?? {};
  const rootCause =
    (result.rootCause as {
      primaryCause?: string;
      deepReason?: string;
      optimizationHint?: string;
      reasonCode?: string;
      confidence?: string;
    }) ?? {};
  const slices =
    (result.mainThreadSlices as { name?: string; durMs?: number; maxMs?: number }[] | undefined) ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.worstFrameMs")}
          value={`${frame.frameMs ?? "—"} ms`}
        />
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.jankType")}
          value={String(frame.jankType ?? "—")}
        />
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.rootCauseCode")}
          value={String(rootCause.reasonCode ?? "—")}
        />
      </div>
      <div className="rounded-lg border border-[color:var(--ember-surface-border,#ececea)] px-3 py-3 text-sm">
        <p className="font-medium">{rootCause.primaryCause ?? "—"}</p>
        <p className="mt-1 text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
          {rootCause.deepReason}
        </p>
        {rootCause.optimizationHint ? (
          <p className="mt-2 text-xs text-[color:var(--ember-accent,#2563eb)]">
            {t("deviceAutomation.performance.trace.analysis.metrics.optimizationHint")}:{" "}
            {rootCause.optimizationHint}
          </p>
        ) : null}
      </div>
      {slices.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.trace.analysis.metrics.mainThreadTop")}
          </p>
          <ul className="space-y-1 text-xs">
            {slices.slice(0, 6).map((slice, index) => (
              <li key={`${slice.name}-${index}`} className="flex justify-between gap-2">
                <span className="truncate">{slice.name ?? "—"}</span>
                <span className="shrink-0 tabular-nums">
                  {slice.durMs ?? 0} ms
                  {slice.maxMs != null ? ` · max ${slice.maxMs} ms` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StartupResultBody({
  result,
  noDataLabel,
}: {
  result: Record<string, unknown>;
  noDataLabel: string;
}) {
  const { t } = useTranslation("deviceAutomation");
  if (result.dataStatus === "empty") {
    return <EmptyNote note={result.note} fallback={noDataLabel} />;
  }

  const topThreads =
    (result.mainThreadTopSlices as { sliceName?: string; durMs?: number }[] | undefined) ??
    [];

  const rating =
    Number(result.timeToDisplayMs ?? 0) <= 0
      ? "—"
      : Number(result.timeToDisplayMs) <= 800
        ? "good"
        : Number(result.timeToDisplayMs) <= 1500
          ? "fair"
          : "slow";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.timeToDisplay")}
          value={`${result.timeToDisplayMs ?? "—"} ms`}
        />
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.startupCount")}
          value={String(result.startupCount ?? 0)}
        />
        <MetricCard
          label={t("deviceAutomation.performance.trace.analysis.metrics.rating")}
          value={rating}
        />
      </div>
      {topThreads.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.trace.analysis.metrics.mainThreadTop")}
          </p>
          <ul className="space-y-1 text-xs">
            {topThreads.slice(0, 5).map((slice, index) => (
              <li key={`${slice.sliceName}-${index}`} className="flex justify-between gap-2">
                <span className="truncate">{slice.sliceName ?? "—"}</span>
                <span className="shrink-0 tabular-nums text-[color:var(--ember-text-muted,#6b6b66)]">
                  {slice.durMs ?? 0} ms
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CpuResultBody({
  result,
  noDataLabel,
}: {
  result: Record<string, unknown>;
  noDataLabel: string;
}) {
  const { t } = useTranslation("deviceAutomation");
  if (result.dataStatus === "empty") {
    return <EmptyNote note={result.note} fallback={noDataLabel} />;
  }

  const quadrantsRaw = result.quadrants as Record<string, number> | undefined;
  const quadrantEntries = quadrantsRaw
    ? Object.entries(quadrantsRaw).map(([label, ratio]) => ({
        label,
        cpuPercent: Math.round((ratio ?? 0) * 1000) / 10,
      }))
    : [];
  const topThreads =
    (result.topThreads as { name?: string; cpuPercent?: number }[] | undefined) ?? [];

  return (
    <div className="space-y-3">
      {quadrantEntries.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quadrantEntries.map((quadrant) => (
            <MetricCard
              key={quadrant.label}
              label={quadrant.label}
              value={`${quadrant.cpuPercent}%`}
            />
          ))}
        </div>
      ) : null}
      {topThreads.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.trace.analysis.metrics.topCpuThreads")}
          </p>
          <ul className="space-y-1 text-xs">
            {topThreads.slice(0, 5).map((thread, index) => (
              <li key={`${thread.name}-${index}`} className="flex justify-between gap-2">
                <span className="truncate">{thread.name ?? "—"}</span>
                <span className="shrink-0 tabular-nums">{thread.cpuPercent ?? 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MemoryResultBody({
  result,
  noDataLabel,
}: {
  result: Record<string, unknown>;
  noDataLabel: string;
}) {
  const { t } = useTranslation("deviceAutomation");
  if (result.dataStatus === "empty") {
    return <EmptyNote note={result.note} fallback={noDataLabel} />;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <MetricCard
        label={t("deviceAutomation.performance.trace.analysis.metrics.gcCount")}
        value={String(result.totalGcCount ?? 0)}
      />
      <MetricCard
        label={t("deviceAutomation.performance.trace.analysis.metrics.gcTime")}
        value={`${result.totalGcTimeMs ?? 0} ms`}
      />
      <MetricCard
        label={t("deviceAutomation.performance.trace.analysis.metrics.gcRating")}
        value={String(result.gcFrequencyRating ?? "—")}
      />
    </div>
  );
}

function AnrResultBody({
  result,
  noDataLabel,
}: {
  result: Record<string, unknown>;
  noDataLabel: string;
}) {
  const { t } = useTranslation("deviceAutomation");
  if (result.dataStatus === "empty") {
    return <EmptyNote note={result.note} fallback={noDataLabel} />;
  }

  const breakdown =
    (result.typeBreakdown as { anrType?: string; eventCount?: number }[] | undefined) ?? [];

  return (
    <div className="space-y-3">
      <MetricCard
        label={t("deviceAutomation.performance.trace.analysis.metrics.anrCount")}
        value={String(result.totalAnrCount ?? 0)}
      />
      {breakdown.length > 0 ? (
        <ul className="space-y-1 text-xs">
          {breakdown.slice(0, 5).map((item, index) => (
            <li key={`${item.anrType}-${index}`} className="flex justify-between gap-2">
              <span className="truncate">{item.anrType ?? "—"}</span>
              <span className="shrink-0 tabular-nums">×{item.eventCount ?? 0}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface PerfTraceAnalysisResultDetailsProps {
  analysisType: PerfTraceAnalysisType;
  result: Record<string, unknown>;
  noDataLabel: string;
  onAnalyzeJankFrame?: (target: PerfTraceFrameTarget) => void;
}

export function PerfTraceAnalysisResultDetails({
  analysisType,
  result,
  noDataLabel,
  onAnalyzeJankFrame,
}: PerfTraceAnalysisResultDetailsProps) {
  switch (analysisType) {
    case "jank_summary":
      return (
        <JankResultBody
          result={result}
          noDataLabel={noDataLabel}
          onAnalyzeJankFrame={onAnalyzeJankFrame}
        />
      );
    case "jank_frame_detail":
      return <JankFrameDetailBody result={result} noDataLabel={noDataLabel} />;
    case "startup_summary":
      return <StartupResultBody result={result} noDataLabel={noDataLabel} />;
    case "cpu_quadrant":
      return <CpuResultBody result={result} noDataLabel={noDataLabel} />;
    case "memory_summary":
      return <MemoryResultBody result={result} noDataLabel={noDataLabel} />;
    case "anr_summary":
      return <AnrResultBody result={result} noDataLabel={noDataLabel} />;
    default: {
      const neverType: never = analysisType;
      return <pre className="text-xs">{JSON.stringify({ neverType, result }, null, 2)}</pre>;
    }
  }
}

export function PerfTraceAnalysisRawJson({
  result,
}: {
  result: Record<string, unknown>;
}) {
  const { t } = useTranslation("deviceAutomation");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-[color:var(--ember-surface-border,#ececea)] pt-3">
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-[color:var(--ember-text-muted,#6b6b66)] hover:text-[color:var(--ember-text,#1a1a17)]"
        onClick={() => setExpanded((value) => !value)}
        data-testid="perf-trace-analysis-raw-toggle"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {t("deviceAutomation.performance.trace.analysis.rawJson")}
      </button>
      {expanded ? (
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-[color:var(--ember-surface-muted,#f7f7f5)] p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
