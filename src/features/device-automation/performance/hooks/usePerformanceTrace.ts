import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getProject, requireDefaultProjectId } from "@/lib/api/project";
import {
  analyzePerformanceTrace,
  cancelPerformanceTraceCapture,
  deletePerformanceTraceArtifact,
  deletePerformanceTraceLocalFile,
  getPerformanceTraceCaptureStatus,
  listPerformanceApps,
  listPerformanceTraceAnalyses,
  listPerformanceTraceArtifacts,
  openPerformanceTraceExternal,
  readPerformanceSession,
  savePerformanceTraceAnalysis,
  savePerformanceTraceArtifact,
  startPerformanceTraceCapture,
  stopPerformanceTraceCapture,
} from "@/lib/api/deviceAutomationPerformance";
import { safeListen, safeInvoke } from "@/lib/dev-bridge";
import type { DeviceAutomationCardModel } from "../../types";
import { DEFAULT_PERF_TRACE_PRESET_ID } from "../constants/tracePresets";
import {
  canLinkTraceToApmSession,
  EMPTY_PERFORMANCE_APM_BRIDGE,
  type PerformanceApmBridge,
} from "../constants/apmTraceBridge";
import { isAndroidPerfCollectionSupported } from "../constants/platformMatrix";
import {
  DEVICE_AUTOMATION_PERF_TRACE_PROGRESS_EVENT,
  type DeviceAutomationPerfTraceProgressPayload,
} from "../events";
import type {
  PerfTraceAnalysisOptions,
  PerfTraceAnalysisType,
  PerfTracePresetId,
  PerformanceInstalledApp,
  PerformanceSession,
  PerformanceTraceAnalysis,
  PerformanceTraceArtifact,
} from "../types";

export type PerfTracePhase = "idle" | "recording" | "stopping" | "pulling";

export interface UsePerformanceTraceOptions {
  devices: DeviceAutomationCardModel[];
  apmBridge?: PerformanceApmBridge;
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return String(error);
}

function buildTracesDir(rootPath: string): string {
  const normalized = rootPath.replace(/[/\\]+$/, "");
  return `${normalized}/performance-traces`;
}

export function usePerformanceTrace({
  devices,
  apmBridge = EMPTY_PERFORMANCE_APM_BRIDGE,
}: UsePerformanceTraceOptions) {
  const { t } = useTranslation("deviceAutomation");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceRootPath, setWorkspaceRootPath] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [apps, setApps] = useState<PerformanceInstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [presetId, setPresetId] = useState<PerfTracePresetId>(DEFAULT_PERF_TRACE_PRESET_ID);
  const [useCustomConfig, setUseCustomConfig] = useState(false);
  const [customConfigOverride, setCustomConfigOverride] = useState("");
  const [linkToApmSession, setLinkToApmSession] = useState(false);
  const [phase, setPhase] = useState<PerfTracePhase>("idle");
  const [activeCaptureId, setActiveCaptureId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<PerformanceTraceArtifact[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<PerformanceTraceAnalysis[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [analyzingType, setAnalyzingType] = useState<PerfTraceAnalysisType | null>(null);
  const [progressPhase, setProgressPhase] = useState<string | null>(null);
  const [linkedSession, setLinkedSession] = useState<PerformanceSession | null>(null);
  const [linkedSessionLoading, setLinkedSessionLoading] = useState(false);

  const phaseRef = useRef<PerfTracePhase>("idle");
  phaseRef.current = phase;

  const onlineDevices = useMemo(
    () => devices.filter((device) => device.status === "online"),
    [devices],
  );

  const selectedDevice = useMemo(
    () => onlineDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [onlineDevices, selectedDeviceId],
  );

  const canRecord = isAndroidPerfCollectionSupported(selectedDevice?.platform);
  const isRecording = phase === "recording" || phase === "stopping" || phase === "pulling";

  const canLinkApmSession = useMemo(
    () => canLinkTraceToApmSession(apmBridge, selectedDeviceId, packageName),
    [apmBridge, packageName, selectedDeviceId],
  );

  useEffect(() => {
    if (canLinkApmSession) {
      setLinkToApmSession(true);
    } else {
      setLinkToApmSession(false);
    }
  }, [canLinkApmSession]);

  const resolvedLinkedSessionId =
    linkToApmSession && canLinkApmSession ? apmBridge.sessionId : null;

  const selectedArtifact = useMemo(
    () => artifacts.find((item) => item.id === selectedArtifactId) ?? null,
    [artifacts, selectedArtifactId],
  );

  const reloadAnalyses = useCallback(async (artifactId: string) => {
    if (!artifactId) {
      return;
    }
    setAnalysesLoading(true);
    try {
      const rows = await listPerformanceTraceAnalyses(artifactId, { limit: 10 });
      setAnalyses(rows);
    } catch (error) {
      console.error("加载 Trace 分析历史失败:", error);
      toast.error(toMessage(error));
    } finally {
      setAnalysesLoading(false);
    }
  }, []);

  const reloadArtifacts = useCallback(async (workspace: string) => {
    if (!workspace) {
      return;
    }
    setArtifactsLoading(true);
    try {
      const rows = await listPerformanceTraceArtifacts(workspace);
      setArtifacts(rows);
    } catch (error) {
      console.error("加载 Trace 列表失败:", error);
      toast.error(toMessage(error));
    } finally {
      setArtifactsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const id = await requireDefaultProjectId();
        const project = await getProject(id);
        if (cancelled) {
          return;
        }
        setWorkspaceId(id);
        if (project?.rootPath) {
          setWorkspaceRootPath(project.rootPath);
        }
        await reloadArtifacts(id);
        const status = await getPerformanceTraceCaptureStatus();
        if (status.activeCaptureId) {
          setActiveCaptureId(status.activeCaptureId);
          setPhase("recording");
        }
      } catch (error) {
        console.error("初始化 Trace 工作区失败:", error);
        toast.error(toMessage(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadArtifacts]);

  useEffect(() => {
    const ready = artifacts.find((item) => item.status === "ready");
    if (!selectedArtifactId && ready) {
      setSelectedArtifactId(ready.id);
    }
  }, [artifacts, selectedArtifactId]);

  useEffect(() => {
    if (!selectedArtifactId) {
      setAnalyses([]);
      return;
    }
    void reloadAnalyses(selectedArtifactId);
  }, [reloadAnalyses, selectedArtifactId]);

  useEffect(() => {
    const sessionId = selectedArtifact?.linkedSessionId?.trim();
    if (!sessionId) {
      setLinkedSession(null);
      setLinkedSessionLoading(false);
      return;
    }
    let cancelled = false;
    setLinkedSessionLoading(true);
    void readPerformanceSession(sessionId)
      .then((session) => {
        if (!cancelled) {
          setLinkedSession(session);
        }
      })
      .catch((error) => {
        console.error("加载关联 APM 会话失败:", error);
        if (!cancelled) {
          setLinkedSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLinkedSessionLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedArtifact?.linkedSessionId]);

  useEffect(() => {
    if (selectedDeviceId && onlineDevices.some((device) => device.id === selectedDeviceId)) {
      return;
    }
    setSelectedDeviceId(onlineDevices[0]?.id ?? "");
  }, [onlineDevices, selectedDeviceId]);

  const runAnalysis = useCallback(
    async (analysisType: PerfTraceAnalysisType, options?: PerfTraceAnalysisOptions) => {
      if (!selectedArtifact?.localPath || selectedArtifact.status !== "ready") {
        toast.error(t("deviceAutomation.performance.trace.analysis.noArtifact"));
        return;
      }
      setAnalyzingType(analysisType);
      try {
        const { result } = await analyzePerformanceTrace({
          localPath: selectedArtifact.localPath,
          analysisType,
          packageName: selectedArtifact.packageName,
          ...(options?.timeRange ? { timeRange: options.timeRange } : {}),
          ...(options?.frameTarget ? { frameTarget: options.frameTarget } : {}),
        });
        const analysis: PerformanceTraceAnalysis = {
          id: crypto.randomUUID(),
          artifactId: selectedArtifact.id,
          analysisType,
          packageName: selectedArtifact.packageName,
          timeRangeJson:
            options?.timeRange || options?.frameTarget
              ? JSON.stringify({
                  timeRange: options.timeRange ?? null,
                  frameTarget: options.frameTarget ?? null,
                })
              : null,
          resultJson: JSON.stringify(result),
          status: "done",
          createdAt: new Date().toISOString(),
        };
        await savePerformanceTraceAnalysis(analysis);
        await reloadAnalyses(selectedArtifact.id);
        toast.success(t("deviceAutomation.performance.trace.analysis.done"));
      } catch (error) {
        console.error("Trace 分析失败:", error);
        toast.error(toMessage(error));
      } finally {
        setAnalyzingType(null);
      }
    },
    [reloadAnalyses, selectedArtifact, t],
  );

  const refreshApps = useCallback(async () => {
    if (!selectedDevice) {
      return;
    }
    setAppsLoading(true);
    try {
      const nextApps = await listPerformanceApps({
        platform: selectedDevice.platform,
        deviceId: selectedDevice.id,
      });
      setApps(nextApps);
      if (nextApps.length > 0 && !packageName) {
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
    void refreshApps();
  }, [refreshApps]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;
    void safeListen<DeviceAutomationPerfTraceProgressPayload>(
      DEVICE_AUTOMATION_PERF_TRACE_PROGRESS_EVENT,
      (event) => {
        const payload = event.payload;
        if (!payload?.captureId) {
          return;
        }
        setProgressPhase(payload.phase);
        if (payload.phase === "pulling") {
          setPhase("pulling");
        }
        if (payload.phase === "failed") {
          setPhase("idle");
          setActiveCaptureId(null);
          toast.error(payload.error ?? t("deviceAutomation.performance.trace.errors.failed"));
        }
      },
    ).then((stop) => {
      if (disposed) {
        stop();
        return;
      }
      unlisten = stop;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [t]);

  const startRecording = useCallback(async () => {
    if (!selectedDevice) {
      toast.error(t("deviceAutomation.performance.errors.noDevice"));
      return;
    }
    if (!packageName) {
      toast.error(t("deviceAutomation.performance.errors.noApp"));
      return;
    }
    if (!workspaceRootPath) {
      toast.error(t("deviceAutomation.performance.trace.errors.noWorkspace"));
      return;
    }
    setPhase("recording");
    try {
      const hasCustomConfig = useCustomConfig || customConfigOverride.trim().length > 0;
      const effectivePresetId: PerfTracePresetId = hasCustomConfig ? "custom" : presetId;
      const configOverride = hasCustomConfig ? customConfigOverride.trim() : undefined;
      if (effectivePresetId === "custom" && !configOverride) {
        toast.error(t("deviceAutomation.performance.trace.errors.customConfigRequired"));
        setPhase("idle");
        return;
      }
      const result = await startPerformanceTraceCapture({
        deviceId: selectedDevice.id,
        packageName,
        presetId: effectivePresetId,
        localTracesDir: buildTracesDir(workspaceRootPath),
        ...(configOverride ? { configOverride } : {}),
        ...(resolvedLinkedSessionId ? { linkedSessionId: resolvedLinkedSessionId } : {}),
      });
      setActiveCaptureId(result.captureId);
      toast.success(t("deviceAutomation.performance.trace.toast.started"));
    } catch (error) {
      setPhase("idle");
      setActiveCaptureId(null);
      toast.error(toMessage(error));
    }
  }, [
    customConfigOverride,
    packageName,
    presetId,
    resolvedLinkedSessionId,
    selectedDevice,
    t,
    useCustomConfig,
    workspaceRootPath,
  ]);

  const stopRecording = useCallback(async () => {
    if (!activeCaptureId || !workspaceId) {
      return;
    }
    setPhase("stopping");
    try {
      const stopped = await stopPerformanceTraceCapture(activeCaptureId);
      const artifact: PerformanceTraceArtifact = {
        id: activeCaptureId,
        workspaceId,
        linkedSessionId: resolvedLinkedSessionId,
        deviceId: selectedDevice?.id ?? "",
        devicePlatform: "android",
        packageName,
        presetId,
        configJson: null,
        localPath: stopped.localPath,
        remotePath: stopped.remotePath ?? null,
        sizeBytes: stopped.sizeBytes,
        durationMs: stopped.durationMs,
        status: "ready",
        errorMessage: null,
        createdAt: new Date().toISOString(),
        stoppedAt: new Date().toISOString(),
      };
      await savePerformanceTraceArtifact(artifact);
      await reloadArtifacts(workspaceId);
      toast.success(t("deviceAutomation.performance.trace.toast.stopped"));
    } catch (error) {
      toast.error(toMessage(error));
    } finally {
      setPhase("idle");
      setActiveCaptureId(null);
      setProgressPhase(null);
    }
  }, [
    activeCaptureId,
    packageName,
    presetId,
    reloadArtifacts,
    resolvedLinkedSessionId,
    selectedDevice?.id,
    t,
    workspaceId,
  ]);

  const cancelRecording = useCallback(async () => {
    if (!activeCaptureId) {
      return;
    }
    try {
      await cancelPerformanceTraceCapture(activeCaptureId);
      toast.message(t("deviceAutomation.performance.trace.toast.cancelled"));
    } catch (error) {
      toast.error(toMessage(error));
    } finally {
      setPhase("idle");
      setActiveCaptureId(null);
    }
  }, [activeCaptureId, t]);

  const deleteArtifact = useCallback(
    async (artifactId: string) => {
      if (!workspaceId) {
        return;
      }
      const artifact = artifacts.find((item) => item.id === artifactId);
      const localPath = artifact?.localPath?.trim() ?? "";
      try {
        await deletePerformanceTraceArtifact(artifactId);
        if (localPath) {
          try {
            await deletePerformanceTraceLocalFile(localPath);
          } catch (fileError) {
            console.warn("删除 trace 本地文件失败:", fileError);
          }
        }
        if (selectedArtifactId === artifactId) {
          setSelectedArtifactId(null);
          setAnalyses([]);
        }
        await reloadArtifacts(workspaceId);
        toast.success(t("deviceAutomation.performance.trace.toast.deleted"));
      } catch (error) {
        toast.error(toMessage(error));
      }
    },
    [artifacts, reloadArtifacts, selectedArtifactId, t, workspaceId],
  );

  const openInPerfettoUi = useCallback(
    async (localPath: string) => {
      try {
        const result = await openPerformanceTraceExternal({
          localPath,
          target: "perfetto_ui",
        });
        if (result.url) {
          await safeInvoke("open_external_url", { url: result.url });
        }
        if (result.pathCopied) {
          toast.success(t("deviceAutomation.performance.trace.toast.openUiPathCopied"));
        } else {
          toast.message(t("deviceAutomation.performance.trace.toast.openUiHint"));
        }
      } catch (error) {
        toast.error(toMessage(error));
      }
    },
    [t],
  );

  const confirmLeaveTab = useCallback((): boolean => {
    if (!isRecording) {
      return true;
    }
    return window.confirm(t("deviceAutomation.performance.trace.leaveTabConfirm"));
  }, [isRecording, t]);

  const focusArtifact = useCallback(
    (artifactId: string) => {
      const artifact = artifacts.find((item) => item.id === artifactId);
      if (!artifact) {
        void reloadArtifacts(workspaceId).then(() => {
          setSelectedArtifactId(artifactId);
        });
        return;
      }
      setSelectedArtifactId(artifactId);
      if (artifact.deviceId) {
        setSelectedDeviceId(artifact.deviceId);
      }
      if (artifact.packageName) {
        setPackageName(artifact.packageName);
      }
    },
    [artifacts, reloadArtifacts, workspaceId],
  );

  return {
    onlineDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedDevice,
    canRecord,
    apps,
    appsLoading,
    refreshApps,
    packageName,
    setPackageName,
    presetId,
    setPresetId,
    useCustomConfig,
    setUseCustomConfig,
    customConfigOverride,
    setCustomConfigOverride,
    linkToApmSession,
    setLinkToApmSession,
    canLinkApmSession,
    resolvedLinkedSessionId,
    phase,
    isRecording,
    progressPhase,
    artifacts,
    artifactsLoading,
    startRecording,
    stopRecording,
    cancelRecording,
    deleteArtifact,
    openInPerfettoUi,
    confirmLeaveTab,
    selectedArtifactId,
    setSelectedArtifactId,
    selectedArtifact,
    analyses,
    analysesLoading,
    analyzingType,
    runAnalysis,
    focusArtifact,
    linkedSession,
    linkedSessionLoading,
  };
}
