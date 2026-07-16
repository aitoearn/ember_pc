import { ExternalLink, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ApmTraceTimelineBar } from "./ApmTraceTimelineBar";
import {
  projectTraceOntoApmSession,
  resolveApmSessionWindow,
} from "../domain/apmTraceTimeline";
import type { PerformanceSession, PerformanceTraceArtifact } from "../types";

export interface PerfTraceLinkedSessionCardProps {
  session: PerformanceSession | null;
  artifact: PerformanceTraceArtifact;
  loading?: boolean;
  onOpenApmSession?: (sessionId: string) => void;
}

export function PerfTraceLinkedSessionCard({
  session,
  artifact,
  loading = false,
  onOpenApmSession,
}: PerfTraceLinkedSessionCardProps) {
  const { t } = useTranslation("deviceAutomation");

  if (!artifact.linkedSessionId) {
    return null;
  }

  const sessionWindow = session ? resolveApmSessionWindow(session) : null;
  const segment =
    session && sessionWindow
      ? projectTraceOntoApmSession(session, artifact)
      : null;
  const fpsAvg = session?.summary?.fps?.avg;
  const cpuAvg = session?.summary?.cpu_app?.avg;

  return (
    <section
      className="rounded-xl border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)] p-4"
      data-testid="perf-trace-linked-session-card"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">
            {t("deviceAutomation.performance.trace.linkedSession.title")}
          </h3>
          <p className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.trace.linkedSession.subtitle", {
              sessionId: artifact.linkedSessionId,
            })}
          </p>
        </div>
        {onOpenApmSession ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="perf-trace-open-linked-apm-session"
            onClick={() => onOpenApmSession(artifact.linkedSessionId!)}
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            {t("deviceAutomation.performance.trace.linkedSession.openApm")}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("deviceAutomation.list.loading")}
        </div>
      ) : session && segment && sessionWindow ? (
        <div className="space-y-3">
          {(fpsAvg != null || cpuAvg != null) && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {fpsAvg != null ? (
                <div className="rounded-lg bg-[color:var(--ember-surface-muted,#f7f7f5)] px-3 py-2 text-xs">
                  <p className="text-[color:var(--ember-text-muted,#6b6b66)]">
                    {t("deviceAutomation.performance.charts.fps")}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">{fpsAvg.toFixed(1)}</p>
                </div>
              ) : null}
              {cpuAvg != null ? (
                <div className="rounded-lg bg-[color:var(--ember-surface-muted,#f7f7f5)] px-3 py-2 text-xs">
                  <p className="text-[color:var(--ember-text-muted,#6b6b66)]">
                    {t("deviceAutomation.performance.charts.cpuApp")}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">{cpuAvg.toFixed(1)}%</p>
                </div>
              ) : null}
              <div className="rounded-lg bg-[color:var(--ember-surface-muted,#f7f7f5)] px-3 py-2 text-xs">
                <p className="text-[color:var(--ember-text-muted,#6b6b66)]">
                  {t("deviceAutomation.performance.trace.linkedSession.apmDuration")}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {(sessionWindow.durationMs / 1000).toFixed(0)} s
                </p>
              </div>
            </div>
          )}
          <ApmTraceTimelineBar
            sessionDurationMs={sessionWindow.durationMs}
            segments={[segment]}
            activeArtifactId={artifact.id}
          />
        </div>
      ) : (
        <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
          {t("deviceAutomation.performance.trace.linkedSession.unavailable")}
        </p>
      )}
    </section>
  );
}
