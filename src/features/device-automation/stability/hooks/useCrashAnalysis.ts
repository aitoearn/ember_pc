import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  cancelStabilityAnalysis,
  getStabilityAnalysisStatus,
  getStabilityAnalysisToolStatus,
  startStabilityAnalysis,
} from "@/lib/api/deviceStabilityAnalysis";
import { readFilePreview } from "@/lib/api/fileBrowser";
import { safeListen } from "@/lib/dev-bridge";
import {
  appendStabilityAnalysisEvent,
  initialStabilityAnalysisState,
} from "../domain/stabilityAnalysisProjection";
import {
  DEVICE_AUTOMATION_STABILITY_ANALYSIS_EVENT,
  type DeviceAutomationStabilityAnalysisEventPayload,
} from "../events";
import type {
  CrashAnalysisFormState,
  CrashAnalysisPrefill,
  StabilityAnalysisScope,
  StabilityAnalysisToolStatus,
} from "../types";

const REPORT_PREVIEW_MAX_BYTES = 512 * 1024;

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return String(error);
}

const EMPTY_FORM: CrashAnalysisFormState = {
  crashLogPath: "",
  libraryDir: "",
  codeRoot: "",
};

export interface UseCrashAnalysisOptions {
  prefill?: CrashAnalysisPrefill | null;
  llmConfigured: boolean;
}

export function useCrashAnalysis({
  prefill,
  llmConfigured,
}: UseCrashAnalysisOptions) {
  const { t } = useTranslation("deviceAutomation");
  const [toolStatus, setToolStatus] = useState<StabilityAnalysisToolStatus>({
    available: false,
  });
  const [toolLoading, setToolLoading] = useState(true);
  const [form, setForm] = useState<CrashAnalysisFormState>(EMPTY_FORM);
  const [viewState, setViewState] = useState(initialStabilityAnalysisState);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const activeRunRef = useRef<string | null>(null);
  const acceptingEventsRef = useRef(false);

  const isRunning =
    viewState.phase === "running" || viewState.phase === "canceling";

  const refreshToolStatus = useCallback(async () => {
    setToolLoading(true);
    try {
      const status = await getStabilityAnalysisToolStatus();
      setToolStatus(status);
    } catch (error) {
      console.error("查询 sa-agent 工具状态失败:", error);
      setToolStatus({
        available: false,
        error: toMessage(error),
      });
    } finally {
      setToolLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshToolStatus();
  }, [refreshToolStatus]);

  useEffect(() => {
    if (!prefill) {
      return;
    }
    setForm((prev) => ({
      crashLogPath: prefill.crashLogPath?.trim() || prev.crashLogPath,
      libraryDir: prefill.localResultDir?.trim() || prev.libraryDir,
      codeRoot: prev.codeRoot,
    }));
  }, [prefill]);

  const loadReportPreview = useCallback(async (artifactPath: string) => {
    setReportLoading(true);
    try {
      const preview = await readFilePreview(artifactPath, REPORT_PREVIEW_MAX_BYTES);
      if (preview.content && !preview.isBinary) {
        setReportMarkdown(preview.content);
      } else {
        setReportMarkdown("");
      }
    } catch (error) {
      console.error("读取分析报告预览失败:", error);
      setReportMarkdown("");
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    void safeListen<DeviceAutomationStabilityAnalysisEventPayload>(
      DEVICE_AUTOMATION_STABILITY_ANALYSIS_EVENT,
      (event) => {
        const payload = event.payload;
        if (!payload?.runId) {
          return;
        }
        const boundRunId = activeRunRef.current;
        if (boundRunId && payload.runId !== boundRunId) {
          return;
        }
        if (!boundRunId && !acceptingEventsRef.current) {
          return;
        }
        if (!boundRunId) {
          activeRunRef.current = payload.runId;
        }
        const runId = activeRunRef.current;
        if (!runId) {
          return;
        }
        setViewState((prev) => {
          const next = appendStabilityAnalysisEvent(prev, payload, runId);
          if (payload.line.type === "done") {
            acceptingEventsRef.current = false;
            activeRunRef.current = null;
            if (payload.line.primaryArtifactPath) {
              void loadReportPreview(payload.line.primaryArtifactPath);
            }
          }
          if (payload.line.type === "error") {
            acceptingEventsRef.current = false;
            activeRunRef.current = null;
          }
          return next;
        });
      },
    )
      .then((fn) => {
        unlisten = fn;
      })
      .catch((error) => {
        console.warn("订阅稳定性分析事件失败:", error);
      });
    return () => {
      unlisten?.();
    };
  }, [loadReportPreview]);

  useEffect(() => {
    let disposed = false;
    void getStabilityAnalysisStatus()
      .then((status) => {
        if (disposed || !status.activeRunId) {
          return;
        }
        activeRunRef.current = status.activeRunId;
        acceptingEventsRef.current = true;
        setViewState((prev) => ({
          ...prev,
          phase: "running",
          runId: status.activeRunId ?? null,
        }));
      })
      .catch((error) => {
        console.warn("恢复稳定性分析状态失败:", error);
      });
    return () => {
      disposed = true;
    };
  }, []);

  const updateForm = useCallback((patch: Partial<CrashAnalysisFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const canStartFull =
    toolStatus.available &&
    !isRunning &&
    form.crashLogPath.trim().length > 0 &&
    form.libraryDir.trim().length > 0 &&
    llmConfigured;

  const canStartParseOnly =
    toolStatus.available &&
    !isRunning &&
    form.crashLogPath.trim().length > 0 &&
    form.libraryDir.trim().length > 0;

  const start = useCallback(
    async (scope: StabilityAnalysisScope) => {
      if (scope === "full" && !llmConfigured) {
        toast.error(t("deviceAutomation.stability.errors.llmNotConfigured"));
        return;
      }
      if (!form.crashLogPath.trim() || !form.libraryDir.trim()) {
        toast.error(t("deviceAutomation.stability.errors.missingPaths"));
        return;
      }
      acceptingEventsRef.current = true;
      activeRunRef.current = null;
      setReportMarkdown("");
      setViewState({
        phase: "running",
        runId: null,
        logs: [],
        reportDir: undefined,
        primaryArtifactPath: undefined,
        errorMessage: undefined,
      });
      try {
        const codeRoots = form.codeRoot.trim()
          ? [form.codeRoot.trim()]
          : undefined;
        const result = await startStabilityAnalysis({
          crashLogPath: form.crashLogPath.trim(),
          libraryDir: form.libraryDir.trim(),
          codeRoots,
          scope,
          promptMode: "analysis",
          outputFormat: "markdown",
        });
        activeRunRef.current = result.runId;
        setViewState((prev) => ({
          ...prev,
          runId: result.runId,
        }));
      } catch (error) {
        acceptingEventsRef.current = false;
        activeRunRef.current = null;
        setViewState(initialStabilityAnalysisState);
        toast.error(toMessage(error));
      }
    },
    [form, llmConfigured, t],
  );

  const cancel = useCallback(async () => {
    const runId = activeRunRef.current ?? viewState.runId;
    if (!runId) {
      return;
    }
    setViewState((prev) => ({ ...prev, phase: "canceling" }));
    try {
      await cancelStabilityAnalysis(runId);
    } catch (error) {
      toast.error(toMessage(error));
      setViewState((prev) => ({ ...prev, phase: "running" }));
    }
  }, [viewState.runId]);

  return {
    toolStatus,
    toolLoading,
    form,
    updateForm,
    viewState,
    reportMarkdown,
    reportLoading,
    isRunning,
    canStartFull,
    canStartParseOnly,
    refreshToolStatus,
    start,
    cancel,
  };
}
