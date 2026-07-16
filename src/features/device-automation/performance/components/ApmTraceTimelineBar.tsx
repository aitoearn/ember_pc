import { useTranslation } from "react-i18next";
import { presetLabelKey } from "../constants/tracePresets";
import type { TraceTimelineSegment } from "../domain/apmTraceTimeline";
import { formatTimelineOffsetMs } from "../domain/apmTraceTimeline";

export interface ApmTraceTimelineBarProps {
  sessionDurationMs: number;
  segments: TraceTimelineSegment[];
  activeArtifactId?: string | null;
  onSelectArtifact?: (artifactId: string) => void;
}

export function ApmTraceTimelineBar({
  sessionDurationMs,
  segments,
  activeArtifactId = null,
  onSelectArtifact,
}: ApmTraceTimelineBarProps) {
  const { t } = useTranslation("deviceAutomation");

  if (segments.length === 0 || sessionDurationMs <= 0) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="apm-trace-timeline-bar">
      <div className="flex items-center justify-between text-[11px] text-[color:var(--ember-text-muted,#6b6b66)]">
        <span>{t("deviceAutomation.performance.timeline.sessionStart")}</span>
        <span>
          {t("deviceAutomation.performance.timeline.sessionDuration", {
            duration: formatTimelineOffsetMs(sessionDurationMs),
          })}
        </span>
        <span>{t("deviceAutomation.performance.timeline.sessionEnd")}</span>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-[color:var(--ember-surface-muted,#f7f7f5)]"
        role="img"
        aria-label={t("deviceAutomation.performance.timeline.ariaLabel")}
      >
        {segments.map((segment) => {
          const isActive = activeArtifactId === segment.artifactId;
          const className = `absolute top-0 h-full rounded-full ${
            isActive
              ? "bg-[color:var(--ember-accent,#2563eb)]"
              : "bg-[color:color-mix(in_srgb,var(--ember-accent,#2563eb)_55%,white)]"
          }`;
          const style = {
            left: `${segment.startPercent}%`,
            width: `${Math.max(segment.widthPercent, 1.5)}%`,
          };
          if (onSelectArtifact) {
            return (
              <button
                key={segment.artifactId}
                type="button"
                className={`${className} p-0`}
                style={style}
                data-testid={`apm-trace-timeline-segment-${segment.artifactId}`}
                aria-label={t("deviceAutomation.performance.timeline.selectTrace", {
                  preset: t(presetLabelKey(segment.presetId)),
                })}
                title={t(presetLabelKey(segment.presetId))}
                onClick={() => onSelectArtifact(segment.artifactId)}
              />
            );
          }
          return (
            <div
              key={segment.artifactId}
              className={className}
              style={style}
              title={t(presetLabelKey(segment.presetId))}
              aria-hidden
            />
          );
        })}
      </div>
      <ul className="space-y-1 text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
        {segments.map((segment) => (
          <li key={`legend-${segment.artifactId}`} className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-[color:var(--ember-text,#1a1a17)]">
              {t(presetLabelKey(segment.presetId))}
            </span>
            <span className="tabular-nums">
              {t("deviceAutomation.performance.timeline.traceOffset", {
                start: formatTimelineOffsetMs(segment.offsetStartMs),
                end: formatTimelineOffsetMs(segment.offsetEndMs),
              })}
              {!segment.fullyWithinSession
                ? ` · ${t("deviceAutomation.performance.timeline.partialOverlap")}`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
