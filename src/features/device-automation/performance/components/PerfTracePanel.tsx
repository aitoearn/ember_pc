import { ExternalLink, Loader2, Play, Square, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERF_TRACE_PRESETS } from "../constants/tracePresets";
import { PerfTraceAnalysisView } from "./PerfTraceAnalysisView";
import type { usePerformanceTrace } from "../hooks/usePerformanceTrace";
import type { PerfTracePresetId } from "../types";

const PRESET_LABEL_KEYS = {
  scroll_jank: "deviceAutomation.performance.trace.preset.scrollJank",
  cold_start: "deviceAutomation.performance.trace.preset.coldStart",
  cpu_sched: "deviceAutomation.performance.trace.preset.cpuSched",
  custom: "deviceAutomation.performance.trace.preset.custom",
} as const satisfies Record<PerfTracePresetId, `deviceAutomation.${string}`>;

export interface PerfTracePanelProps {
  trace: ReturnType<typeof usePerformanceTrace>;
}

function formatBytes(sizeBytes: number | null): string {
  if (sizeBytes == null || sizeBytes <= 0) {
    return "—";
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PerfTracePanel({ trace }: PerfTracePanelProps) {
  const { t } = useTranslation("deviceAutomation");

  const startDisabled =
    !trace.canRecord ||
    trace.isRecording ||
    !trace.selectedDeviceId ||
    !trace.packageName;

  return (
    <div className="flex flex-col gap-4" data-testid="perf-trace-panel">
      <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
        {t("deviceAutomation.performance.trace.subtitle")}
      </p>

      {!trace.canRecord && trace.selectedDevice ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="perf-trace-platform-unsupported"
        >
          {t("deviceAutomation.performance.trace.unsupported")}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)] p-4">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.toolbar.device")}
          </label>
          <Select
            value={trace.selectedDeviceId}
            onValueChange={trace.setSelectedDeviceId}
            disabled={trace.isRecording}
          >
            <SelectTrigger data-testid="perf-trace-device-select">
              <SelectValue placeholder={t("deviceAutomation.performance.devices.empty")} />
            </SelectTrigger>
            <SelectContent>
              {trace.onlineDevices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name || device.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[220px] flex-[2]">
          <label className="mb-1 block text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.toolbar.app")}
          </label>
          <Select
            value={trace.packageName}
            onValueChange={trace.setPackageName}
            disabled={trace.isRecording || trace.appsLoading}
          >
            <SelectTrigger data-testid="perf-trace-app-select">
              <SelectValue placeholder={t("deviceAutomation.performance.apps.empty")} />
            </SelectTrigger>
            <SelectContent>
              {trace.apps.map((app) => (
                <SelectItem key={app.packageName} value={app.packageName}>
                  {app.label ? `${app.label} (${app.packageName})` : app.packageName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.trace.presetLabel")}
          </label>
          <Select
            value={trace.presetId}
            onValueChange={(value) => trace.setPresetId(value as PerfTracePresetId)}
            disabled={trace.isRecording}
          >
            <SelectTrigger data-testid="perf-trace-preset-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERF_TRACE_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {t(PRESET_LABEL_KEYS[preset.id])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {!trace.isRecording ? (
            <Button
              type="button"
              disabled={startDisabled}
              onClick={() => void trace.startRecording()}
              data-testid="perf-trace-start"
            >
              <Play className="mr-1.5 h-4 w-4" />
              {t("deviceAutomation.performance.trace.start")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void trace.stopRecording()}
                disabled={trace.phase === "stopping" || trace.phase === "pulling"}
                data-testid="perf-trace-stop"
              >
                {trace.phase === "stopping" || trace.phase === "pulling" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-1.5 h-4 w-4" />
                )}
                {t("deviceAutomation.performance.trace.stop")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void trace.cancelRecording()}
                data-testid="perf-trace-cancel"
              >
                {t("deviceAutomation.performance.trace.cancel")}
              </Button>
            </>
          )}
        </div>
      </div>

      {trace.progressPhase ? (
        <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]" data-testid="perf-trace-progress">
          {t("deviceAutomation.performance.trace.progress", {
            phase: trace.progressPhase,
          })}
        </p>
      ) : null}

      <section data-testid="perf-trace-artifact-list">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {t("deviceAutomation.performance.trace.listTitle")}
          </h3>
          {trace.artifactsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[color:var(--ember-text-muted,#6b6b66)]" />
          ) : null}
        </div>
        {trace.artifacts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--ember-surface-border,#ececea)] px-4 py-6 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("deviceAutomation.performance.trace.listEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--ember-surface-border,#ececea)] rounded-xl border border-[color:var(--ember-surface-border,#ececea)]">
            {trace.artifacts.map((artifact) => (
              <li
                key={artifact.id}
                className={`flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 ${
                  trace.selectedArtifactId === artifact.id
                    ? "bg-[color:var(--ember-surface-muted,#f7f7f5)]"
                    : ""
                }`}
                data-testid={`perf-trace-artifact-${artifact.id}`}
                onClick={() => trace.setSelectedArtifactId(artifact.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{artifact.packageName}</p>
                  <p className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
                    {artifact.presetId} · {formatBytes(artifact.sizeBytes)} ·{" "}
                    {t(`deviceAutomation.performance.trace.status.${artifact.status}`)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {artifact.localPath && artifact.status === "ready" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void trace.openInPerfettoUi(artifact.localPath!)}
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      {t("deviceAutomation.performance.trace.openUi")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={trace.isRecording}
                    onClick={() => void trace.deleteArtifact(artifact.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">{t("deviceAutomation.performance.trace.delete")}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {trace.selectedArtifact?.status === "ready" ? (
        <PerfTraceAnalysisView
          analyses={trace.analyses}
          loading={trace.analysesLoading}
          analyzingType={trace.analyzingType}
          onRunAnalysis={(type) => void trace.runAnalysis(type)}
          disabled={trace.isRecording}
        />
      ) : null}
    </div>
  );
}
