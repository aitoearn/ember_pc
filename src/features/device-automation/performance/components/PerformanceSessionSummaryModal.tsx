import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApmTraceTimelineBar } from "./ApmTraceTimelineBar";
import { listPerformanceTraceArtifacts } from "@/lib/api/deviceAutomationPerformance";
import { presetLabelKey } from "../constants/tracePresets";
import {
  projectTracesOntoApmSession,
  resolveApmSessionWindow,
} from "../domain/apmTraceTimeline";
import type { PerformanceSession, PerfMetricKey, PerformanceTraceArtifact } from "../types";

const METRIC_LABEL_KEYS = {
  cpu_app: "deviceAutomation.performance.charts.cpuApp",
  cpu_sys: "deviceAutomation.performance.charts.cpuSys",
  mem_total: "deviceAutomation.performance.charts.memory",
  fps: "deviceAutomation.performance.charts.fps",
} as const satisfies Record<PerfMetricKey, `deviceAutomation.${string}`>;

export interface PerformanceSessionSummaryModalProps {
  session: PerformanceSession | null;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLinkedTrace?: (artifactId: string) => void;
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

function formatBytes(sizeBytes: number | null): string {
  if (sizeBytes == null || sizeBytes <= 0) {
    return "—";
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PerformanceSessionSummaryModal({
  session,
  workspaceId,
  open,
  onOpenChange,
  onOpenLinkedTrace,
}: PerformanceSessionSummaryModalProps) {
  const { t } = useTranslation("deviceAutomation");
  const [linkedTraces, setLinkedTraces] = useState<PerformanceTraceArtifact[]>([]);
  const [linkedTracesLoading, setLinkedTracesLoading] = useState(false);

  useEffect(() => {
    if (!open || !session?.id || !workspaceId) {
      setLinkedTraces([]);
      return;
    }
    let cancelled = false;
    setLinkedTracesLoading(true);
    void listPerformanceTraceArtifacts(workspaceId, { linkedSessionId: session.id })
      .then((artifacts) => {
        if (!cancelled) {
          setLinkedTraces(artifacts.filter((item) => item.status === "ready"));
        }
      })
      .catch((error) => {
        console.error("加载关联 Trace 失败:", error);
        if (!cancelled) {
          setLinkedTraces([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLinkedTracesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, session?.id, workspaceId]);

  const sessionWindow = session ? resolveApmSessionWindow(session) : null;
  const timelineSegments =
    session && linkedTraces.length > 0
      ? projectTracesOntoApmSession(session, linkedTraces)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("deviceAutomation.performance.summary.title")}</DialogTitle>
        </DialogHeader>
        {session ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 text-neutral-600">
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.device")}:{" "}
                </span>
                {session.deviceId}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.app")}:{" "}
                </span>
                {session.packageName}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.startedAt")}:{" "}
                </span>
                {formatTime(session.startedAt)}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.stoppedAt")}:{" "}
                </span>
                {formatTime(session.stoppedAt)}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.session.statusLabel")}:{" "}
                </span>
                {t(`deviceAutomation.performance.session.status.${session.status}`)}
              </div>
            </div>

            {session.summary && Object.keys(session.summary).length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.toolbar.metrics")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.summary.avg")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.summary.max")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.summary.min")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(session.summary) as PerfMetricKey[]).map((key) => {
                      const metric = session.summary?.[key];
                      if (!metric) {
                        return null;
                      }
                      return (
                        <tr key={key} className="border-b border-neutral-100">
                          <td className="px-3 py-2 text-neutral-800">
                            {t(METRIC_LABEL_KEYS[key])}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {metric.avg.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {metric.max.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {metric.min.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-neutral-500">
                {t("deviceAutomation.performance.summary.empty")}
              </p>
            )}

            <section data-testid="performance-session-linked-traces">
              <h4 className="mb-2 text-sm font-medium text-neutral-900">
                {t("deviceAutomation.performance.summary.linkedTracesTitle")}
              </h4>
              {linkedTracesLoading ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("deviceAutomation.list.loading")}
                </div>
              ) : linkedTraces.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  {t("deviceAutomation.performance.summary.linkedTracesEmpty")}
                </p>
              ) : (
                <div className="space-y-3">
                  {sessionWindow && timelineSegments.length > 0 ? (
                    <ApmTraceTimelineBar
                      sessionDurationMs={sessionWindow.durationMs}
                      segments={timelineSegments}
                      onSelectArtifact={onOpenLinkedTrace}
                    />
                  ) : null}
                  <ul className="space-y-2">
                  {linkedTraces.map((artifact) => (
                    <li
                      key={artifact.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {t(presetLabelKey(artifact.presetId))}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatBytes(artifact.sizeBytes)} · {formatTime(artifact.createdAt)}
                        </p>
                      </div>
                      {onOpenLinkedTrace ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-testid={`performance-open-linked-trace-${artifact.id}`}
                          onClick={() => {
                            onOpenLinkedTrace(artifact.id);
                            onOpenChange(false);
                          }}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          {t("deviceAutomation.performance.summary.openLinkedTrace")}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
