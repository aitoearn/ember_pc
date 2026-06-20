import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { requireDefaultProjectId } from "@/lib/api/project";
import {
  listPerformanceApps,
  listPerformanceSessions,
  savePerformanceSession,
  startPerformanceCollection,
  stopPerformanceCollection,
} from "@/lib/api/deviceAutomationPerformance";
import { safeListen } from "@/lib/dev-bridge";
import type { DeviceAutomationCardModel } from "../../types";
import {
  PERF_DEFAULT_INTERVAL_MS,
  PERF_DEFAULT_METRIC_IDS,
} from "../constants/metrics";
import { isAndroidPerfCollectionSupported } from "../constants/platformMatrix";
import {
  appendPerfFrame,
  createEmptyPerfBuffers,
  type PerfSeriesBuffers,
} from "../domain/perfBuffer";
import { DEVICE_AUTOMATION_PERF_FRAME_EVENT } from "../events";
import type {
  PerfMetricId,
  PerformanceInstalledApp,
  PerformanceSession,
} from "../types";
import type { PerfIntervalMs } from "../constants/metrics";

export type PerfMonitorPhase = "idle" | "running" | "stopping";

export interface UsePerformanceMonitorOptions {
  devices: DeviceAutomationCardModel[];
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return String(error);
}

export function usePerformanceMonitor({ devices }: UsePerformanceMonitorOptions) {
  const { t } = useTranslation("deviceAutomation");
  const [workspaceId, setWorkspaceId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [apps, setApps] = useState<PerformanceInstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [metrics, setMetrics] = useState<PerfMetricId[]>([...PERF_DEFAULT_METRIC_IDS]);
  const [intervalMs, setIntervalMs] = useState<PerfIntervalMs>(PERF_DEFAULT_INTERVAL_MS);
  const [buffers, setBuffers] = useState<PerfSeriesBuffers>(() => createEmptyPerfBuffers());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeStartedAt, setActiveStartedAt] = useState<string | null>(null);
  const [phase, setPhase] = useState<PerfMonitorPhase>("idle");
  const [history, setHistory] = useState<PerformanceSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] =
    useState<PerformanceSession | null>(null);

  const activeSessionRef = useRef<string | null>(null);
  const phaseRef = useRef<PerfMonitorPhase>("idle");
  activeSessionRef.current = activeSessionId;
  phaseRef.current = phase;

  const onlineDevices = useMemo(
    () => devices.filter((device) => device.status === "online"),
    [devices],
  );

  const selectedDevice = useMemo(
    () => onlineDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [onlineDevices, selectedDeviceId],
  );

  const canCollect = isAndroidPerfCollectionSupported(selectedDevice?.platform);
  const isRunning = phase === "running";

  const reloadHistory = useCallback(async (workspace: string) => {
    if (!workspace) {
      return;
    }
    setHistoryLoading(true);
    try {
      const sessions = await listPerformanceSessions(workspace);
      setHistory(sessions);
    } catch (error) {
      console.error("加载性能会话历史失败:", error);
      toast.error(toMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const id = await requireDefaultProjectId();
        if (cancelled) {
          return;
        }
        setWorkspaceId(id);
        await reloadHistory(id);
      } catch (error) {
        console.error("解析默认工作区失败:", error);
        toast.error(toMessage(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadHistory]);

  useEffect(() => {
    if (selectedDeviceId && onlineDevices.some((device) => device.id === selectedDeviceId)) {
      return;
    }
    setSelectedDeviceId(onlineDevices[0]?.id ?? "");
  }, [onlineDevices, selectedDeviceId]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;
    void safeListen<{
      sessionId: string;
      ts: number;
      data: Partial<Record<string, number>>;
    }>(DEVICE_AUTOMATION_PERF_FRAME_EVENT, (event) => {
      const payload = event.payload;
      if (!payload || payload.sessionId !== activeSessionRef.current) {
        return;
      }
      setBuffers((current) =>
        appendPerfFrame(current, payload.ts, payload.data),
      );
    })
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
          return;
        }
        unlisten = nextUnlisten;
      })
      .catch((error) => {
        console.warn("订阅性能帧事件失败:", error);
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const refreshApps = useCallback(async () => {
    if (!selectedDevice) {
      return;
    }
    setAppsLoading(true);
    try {
      const nextApps = await listPerformanceApps({
        platform: selectedDevice.agentPlatform,
        deviceId: selectedDevice.id,
      });
      setApps(nextApps);
      if (nextApps.length === 0) {
        setPackageName("");
      } else if (!nextApps.some((app) => app.packageName === packageName)) {
        setPackageName(nextApps[0]?.packageName ?? "");
      }
    } catch (error) {
      console.error("刷新应用列表失败:", error);
      toast.error(toMessage(error));
    } finally {
      setAppsLoading(false);
    }
  }, [packageName, selectedDevice]);

  useEffect(() => {
    if (!selectedDevice || !canCollect) {
      setApps([]);
      setPackageName("");
      return;
    }
    void refreshApps();
  }, [canCollect, refreshApps, selectedDevice]);

  const toggleMetric = useCallback((metricId: PerfMetricId, checked: boolean) => {
    setMetrics((current) => {
      if (checked) {
        return current.includes(metricId) ? current : [...current, metricId];
      }
      return current.filter((item) => item !== metricId);
    });
  }, []);

  const persistStoppedSession = useCallback(
    async (params: {
      sessionId: string;
      startedAt: string;
      stoppedAt: string;
      summary: PerformanceSession["summary"];
      failed?: boolean;
    }) => {
      if (!workspaceId || !selectedDevice) {
        return;
      }
      const session: PerformanceSession = {
        id: params.sessionId,
        workspaceId,
        deviceId: selectedDevice.id,
        devicePlatform: selectedDevice.platform,
        packageName,
        metrics,
        intervalMs,
        status: params.failed ? "failed" : "stopped",
        startedAt: params.startedAt,
        stoppedAt: params.stoppedAt,
        summary: params.summary,
      };
      try {
        await savePerformanceSession(session);
        await reloadHistory(workspaceId);
      } catch (error) {
        console.error("保存性能会话失败:", error);
        toast.error(toMessage(error));
      }
    },
    [intervalMs, metrics, packageName, reloadHistory, selectedDevice, workspaceId],
  );

  const stop = useCallback(async () => {
    const sessionId = activeSessionRef.current;
    if (!sessionId || phaseRef.current === "stopping") {
      return;
    }
    setPhase("stopping");
    try {
      const result = await stopPerformanceCollection(sessionId);
      await persistStoppedSession({
        sessionId,
        startedAt: activeStartedAt ?? result.stoppedAt,
        stoppedAt: result.stoppedAt,
        summary: result.summary,
        failed: result.failed,
      });
    } catch (error) {
      console.error("停止性能采集失败:", error);
      toast.error(toMessage(error));
    } finally {
      setActiveSessionId(null);
      setActiveStartedAt(null);
      setPhase("idle");
    }
  }, [activeStartedAt, persistStoppedSession]);

  const start = useCallback(async () => {
    if (!selectedDevice) {
      toast.error(t("deviceAutomation.performance.errors.noDevice"));
      return;
    }
    if (!canCollect) {
      return;
    }
    if (!packageName.trim()) {
      toast.error(t("deviceAutomation.performance.errors.noApp"));
      return;
    }
    if (metrics.length === 0) {
      toast.error(t("deviceAutomation.performance.errors.noMetrics"));
      return;
    }
    if (phaseRef.current !== "idle") {
      return;
    }
    setBuffers(createEmptyPerfBuffers());
    try {
      const result = await startPerformanceCollection({
        platform: "android",
        deviceId: selectedDevice.id,
        packageName,
        metrics,
        intervalMs,
      });
      setActiveSessionId(result.sessionId);
      setActiveStartedAt(result.startedAt);
      setPhase("running");
    } catch (error) {
      console.error("开始性能采集失败:", error);
      toast.error(toMessage(error));
    }
  }, [canCollect, intervalMs, metrics, packageName, selectedDevice, t]);

  const persistRef = useRef(persistStoppedSession);
  persistRef.current = persistStoppedSession;
  const startedAtRef = useRef(activeStartedAt);
  startedAtRef.current = activeStartedAt;

  useEffect(() => {
    return () => {
      const sessionId = activeSessionRef.current;
      if (!sessionId || phaseRef.current !== "running") {
        return;
      }
      void (async () => {
        try {
          const result = await stopPerformanceCollection(sessionId);
          await persistRef.current({
            sessionId,
            startedAt: startedAtRef.current ?? result.stoppedAt,
            stoppedAt: result.stoppedAt,
            summary: result.summary,
            failed: result.failed,
          });
        } catch (error) {
          console.warn("离开性能 Tab 时停止采集失败:", error);
        }
      })();
    };
  }, []);

  return {
    workspaceId,
    onlineDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedDevice,
    apps,
    appsLoading,
    refreshApps,
    packageName,
    setPackageName,
    metrics,
    toggleMetric,
    intervalMs,
    setIntervalMs,
    buffers,
    phase,
    isRunning,
    canCollect,
    start,
    stop,
    history,
    historyLoading,
    selectedHistorySession,
    setSelectedHistorySession,
    reloadHistory,
  };
}
