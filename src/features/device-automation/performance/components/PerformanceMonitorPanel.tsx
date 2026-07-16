import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { readPerformanceSession } from "@/lib/api/deviceAutomationPerformance";
import type { DeviceAutomationCardModel } from "../../types";
import { PerfTracePanel } from "./PerfTracePanel";
import { PerformanceLiveCharts } from "./PerformanceLiveCharts";
import { PerformanceModeSwitch, type PerformanceMonitorMode } from "./PerformanceModeSwitch";
import { PerformanceMonitorToolbar } from "./PerformanceMonitorToolbar";
import { PerformancePlatformMatrix } from "./PerformancePlatformMatrix";
import { PerformanceSessionHistory } from "./PerformanceSessionHistory";
import { PerformanceSessionSummaryModal } from "./PerformanceSessionSummaryModal";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { usePerformanceTrace } from "../hooks/usePerformanceTrace";

export interface PerformanceMonitorPanelProps {
  devices: DeviceAutomationCardModel[];
  onTraceLeaveGuardChange?: (guard: (() => boolean) | null) => void;
}

export function PerformanceMonitorPanel({
  devices,
  onTraceLeaveGuardChange,
}: PerformanceMonitorPanelProps) {
  const { t } = useTranslation("deviceAutomation");
  const [mode, setMode] = useState<PerformanceMonitorMode>("apm");
  const monitor = usePerformanceMonitor({ devices });

  const apmBridge = useMemo(
    () => ({
      sessionId: monitor.activeSessionId,
      isRunning: monitor.isRunning,
      deviceId: monitor.selectedDeviceId,
      packageName: monitor.packageName,
    }),
    [
      monitor.activeSessionId,
      monitor.isRunning,
      monitor.packageName,
      monitor.selectedDeviceId,
    ],
  );

  const trace = usePerformanceTrace({ devices, apmBridge });

  useEffect(() => {
    onTraceLeaveGuardChange?.(trace.confirmLeaveTab);
    return () => {
      onTraceLeaveGuardChange?.(null);
    };
  }, [onTraceLeaveGuardChange, trace.confirmLeaveTab]);

  const handleModeChange = useCallback(
    (next: PerformanceMonitorMode) => {
      if (next === mode) {
        return;
      }
      if (mode === "apm" && monitor.isRunning) {
        const ok = window.confirm(t("deviceAutomation.performance.mode.leaveApmConfirm"));
        if (!ok) {
          return;
        }
      }
      if (mode === "trace" && trace.isRecording) {
        if (!trace.confirmLeaveTab()) {
          return;
        }
      }
      if (next === "trace") {
        if (monitor.selectedDeviceId) {
          trace.setSelectedDeviceId(monitor.selectedDeviceId);
        }
        if (monitor.packageName) {
          trace.setPackageName(monitor.packageName);
        }
      }
      if (next === "apm") {
        if (trace.selectedDeviceId) {
          monitor.setSelectedDeviceId(trace.selectedDeviceId);
        }
        if (trace.packageName) {
          monitor.setPackageName(trace.packageName);
        }
      }
      setMode(next);
    },
    [mode, monitor, t, trace],
  );

  const handleOpenLinkedTrace = useCallback(
    (artifactId: string) => {
      setMode("trace");
      trace.focusArtifact(artifactId);
    },
    [trace],
  );

  const handleOpenLinkedApmSession = useCallback(
    (sessionId: string) => {
      setMode("apm");
      const fromHistory = monitor.history.find((item) => item.id === sessionId);
      if (fromHistory) {
        monitor.setSelectedHistorySession(fromHistory);
        return;
      }
      void readPerformanceSession(sessionId)
        .then((session) => {
          monitor.setSelectedHistorySession(session);
        })
        .catch((error) => {
          console.error("打开关联 APM 会话失败:", error);
        });
    },
    [monitor],
  );

  return (
    <div
      className="flex min-h-full flex-col gap-4"
      data-testid="performance-monitor-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("deviceAutomation.performance.title")}</h2>
          <p className="mt-0.5 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            {mode === "apm"
              ? t("deviceAutomation.performance.subtitle")
              : t("deviceAutomation.performance.trace.subtitle")}
          </p>
        </div>
        <PerformanceModeSwitch mode={mode} onModeChange={handleModeChange} />
      </div>

      {mode === "trace" ? (
        <PerfTracePanel trace={trace} onOpenLinkedApmSession={handleOpenLinkedApmSession} />
      ) : (
        <>
          <PerformanceMonitorToolbar
            onlineDevices={monitor.onlineDevices}
            selectedDeviceId={monitor.selectedDeviceId}
            onDeviceChange={monitor.setSelectedDeviceId}
            apps={monitor.apps}
            appsLoading={monitor.appsLoading}
            onRefreshApps={() => void monitor.refreshApps()}
            packageName={monitor.packageName}
            onPackageChange={monitor.setPackageName}
            metrics={monitor.metrics}
            onToggleMetric={monitor.toggleMetric}
            intervalMs={monitor.intervalMs}
            onIntervalChange={monitor.setIntervalMs}
            canCollect={monitor.canCollect}
            isRunning={monitor.isRunning}
            onStart={() => void monitor.start()}
            onStop={() => void monitor.stop()}
          />

          {!monitor.canCollect && monitor.selectedDevice ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              data-testid="performance-platform-unsupported"
            >
              <p className="font-medium">
                {t("deviceAutomation.performance.platform.unsupportedTitle")}
              </p>
              <p className="mt-1 text-amber-800/90">
                {t("deviceAutomation.performance.platform.unsupportedDescription")}
              </p>
            </div>
          ) : null}

          <PerformanceLiveCharts
            metrics={monitor.metrics}
            buffers={monitor.buffers}
            isRunning={monitor.isRunning}
          />

          {!monitor.canCollect ? <PerformancePlatformMatrix /> : null}

          <PerformanceSessionHistory
            sessions={monitor.history}
            loading={monitor.historyLoading}
            linkedTraceCountBySessionId={monitor.linkedTraceCountBySessionId}
            onSelectSession={monitor.setSelectedHistorySession}
          />

          <PerformanceSessionSummaryModal
            session={monitor.selectedHistorySession}
            workspaceId={monitor.workspaceId}
            open={monitor.selectedHistorySession !== null}
            onOpenChange={(open) => {
              if (!open) {
                monitor.setSelectedHistorySession(null);
              }
            }}
            onOpenLinkedTrace={handleOpenLinkedTrace}
          />
        </>
      )}
    </div>
  );
}
