/**
 * 移动端性能监控 API
 *
 * 会话持久化走 App Server JSON-RPC（perfMonitor/session/*）；
 * 实时采集走 Electron host 命令（device_automation_perf_*）。
 */

import { AppServerClient } from "@/lib/api/appServer";
import { safeInvoke } from "@/lib/dev-bridge/safeInvoke";
import {
  METHOD_PERF_MONITOR_SESSION_LIST,
  METHOD_PERF_MONITOR_SESSION_READ,
  METHOD_PERF_MONITOR_SESSION_SAVE,
  METHOD_PERF_MONITOR_TRACE_ANALYSIS_LIST,
  METHOD_PERF_MONITOR_TRACE_ANALYSIS_SAVE,
  METHOD_PERF_MONITOR_TRACE_DELETE,
  METHOD_PERF_MONITOR_TRACE_LIST,
  METHOD_PERF_MONITOR_TRACE_READ,
  METHOD_PERF_MONITOR_TRACE_SAVE,
} from "../../../packages/app-server-client/src/protocol";
import type {
  PerformanceInstalledApp,
  PerformanceSession,
  PerformanceTraceAnalysis,
  PerformanceTraceArtifact,
  PerfMetricId,
  PerfMetricSummaryMap,
  PerfTraceAnalysisType,
  PerfTracePresetId,
} from "@/features/device-automation/performance/types";

type PerfAppServerClient = Pick<AppServerClient, "request">;

type PerfSessionSaveResponse = { session: PerformanceSession };
type PerfSessionListResponse = { sessions?: PerformanceSession[] | null };
type PerfSessionReadResponse = { session?: PerformanceSession | null };

async function requestPerfAppServer<T>(
  method: string,
  params: unknown,
  client: PerfAppServerClient = new AppServerClient(),
): Promise<T> {
  const response = await client.request<T>(method, params);
  return response.result;
}

export async function savePerformanceSession(
  session: PerformanceSession,
  client?: PerfAppServerClient,
): Promise<PerformanceSession> {
  const response = await requestPerfAppServer<PerfSessionSaveResponse>(
    METHOD_PERF_MONITOR_SESSION_SAVE,
    { session },
    client,
  );
  return response.session;
}

export async function listPerformanceSessions(
  workspaceId: string,
  options?: { limit?: number; offset?: number },
  client?: PerfAppServerClient,
): Promise<PerformanceSession[]> {
  const response = await requestPerfAppServer<PerfSessionListResponse>(
    METHOD_PERF_MONITOR_SESSION_LIST,
    {
      workspaceId,
      limit: options?.limit,
      offset: options?.offset,
    },
    client,
  );
  return response.sessions ?? [];
}

export async function readPerformanceSession(
  id: string,
  client?: PerfAppServerClient,
): Promise<PerformanceSession | null> {
  const response = await requestPerfAppServer<PerfSessionReadResponse>(
    METHOD_PERF_MONITOR_SESSION_READ,
    { id },
    client,
  );
  return response.session ?? null;
}

export async function listPerformanceApps(params: {
  platform: string;
  deviceId: string;
}): Promise<PerformanceInstalledApp[]> {
  const response = await safeInvoke<{ apps?: PerformanceInstalledApp[] }>(
    "device_automation_perf_list_apps",
    params,
  );
  return response.apps ?? [];
}

export async function startPerformanceCollection(params: {
  platform: "android";
  deviceId: string;
  packageName: string;
  metrics: PerfMetricId[];
  intervalMs: number;
}): Promise<{ sessionId: string; startedAt: string }> {
  return safeInvoke("device_automation_perf_start", params);
}

export async function stopPerformanceCollection(sessionId: string): Promise<{
  summary: PerfMetricSummaryMap;
  stoppedAt: string;
  failed?: boolean;
}> {
  return safeInvoke("device_automation_perf_stop", { sessionId });
}

export async function getPerformanceCollectionStatus(): Promise<{
  activeSessionId?: string;
  deviceId?: string;
  packageName?: string;
  metrics?: PerfMetricId[];
}> {
  return safeInvoke("device_automation_perf_get_status", {});
}

type PerfTraceSaveResponse = { id: string };
type PerfTraceListResponse = { artifacts?: PerformanceTraceArtifact[] | null };
type PerfTraceReadResponse = { artifact?: PerformanceTraceArtifact | null };
type PerfTraceDeleteResponse = { deleted: boolean };
type PerfTraceAnalysisSaveResponse = { id: string };
type PerfTraceAnalysisListResponse = {
  analyses?: PerformanceTraceAnalysis[] | null;
};

export async function savePerformanceTraceArtifact(
  artifact: PerformanceTraceArtifact,
  client?: PerfAppServerClient,
): Promise<string> {
  const response = await requestPerfAppServer<PerfTraceSaveResponse>(
    METHOD_PERF_MONITOR_TRACE_SAVE,
    { artifact },
    client,
  );
  return response.id;
}

export async function listPerformanceTraceArtifacts(
  workspaceId: string,
  options?: { limit?: number; offset?: number },
  client?: PerfAppServerClient,
): Promise<PerformanceTraceArtifact[]> {
  const response = await requestPerfAppServer<PerfTraceListResponse>(
    METHOD_PERF_MONITOR_TRACE_LIST,
    {
      workspaceId,
      limit: options?.limit,
      offset: options?.offset,
    },
    client,
  );
  return response.artifacts ?? [];
}

export async function readPerformanceTraceArtifact(
  id: string,
  client?: PerfAppServerClient,
): Promise<PerformanceTraceArtifact | null> {
  const response = await requestPerfAppServer<PerfTraceReadResponse>(
    METHOD_PERF_MONITOR_TRACE_READ,
    { id },
    client,
  );
  return response.artifact ?? null;
}

export async function deletePerformanceTraceArtifact(
  id: string,
  client?: PerfAppServerClient,
): Promise<boolean> {
  const response = await requestPerfAppServer<PerfTraceDeleteResponse>(
    METHOD_PERF_MONITOR_TRACE_DELETE,
    { id },
    client,
  );
  return response.deleted;
}

export async function savePerformanceTraceAnalysis(
  analysis: PerformanceTraceAnalysis,
  client?: PerfAppServerClient,
): Promise<string> {
  const response = await requestPerfAppServer<PerfTraceAnalysisSaveResponse>(
    METHOD_PERF_MONITOR_TRACE_ANALYSIS_SAVE,
    { analysis },
    client,
  );
  return response.id;
}

export async function listPerformanceTraceAnalyses(
  artifactId: string,
  options?: { limit?: number },
  client?: PerfAppServerClient,
): Promise<PerformanceTraceAnalysis[]> {
  const response = await requestPerfAppServer<PerfTraceAnalysisListResponse>(
    METHOD_PERF_MONITOR_TRACE_ANALYSIS_LIST,
    {
      artifactId,
      limit: options?.limit,
    },
    client,
  );
  return response.analyses ?? [];
}

export async function startPerformanceTraceCapture(params: {
  deviceId: string;
  packageName: string;
  presetId: PerfTracePresetId;
  localTracesDir: string;
  configOverride?: string;
  linkedSessionId?: string;
}): Promise<{ captureId: string; startedAt: string }> {
  return safeInvoke("device_automation_perf_trace_start", params);
}

export async function stopPerformanceTraceCapture(captureId: string): Promise<{
  localPath: string;
  sizeBytes: number;
  durationMs: number;
  remotePath?: string;
}> {
  return safeInvoke("device_automation_perf_trace_stop", { captureId });
}

export async function cancelPerformanceTraceCapture(
  captureId: string,
): Promise<{ cancelled: true }> {
  return safeInvoke("device_automation_perf_trace_cancel", { captureId });
}

export async function getPerformanceTraceCaptureStatus(): Promise<{
  activeCaptureId?: string;
  deviceId?: string;
  presetId?: string;
  phase?: string;
}> {
  return safeInvoke("device_automation_perf_trace_get_status", {});
}

export async function analyzePerformanceTrace(params: {
  localPath: string;
  analysisType: PerfTraceAnalysisType;
  packageName: string;
  timeRange?: { startNs: number; endNs: number };
}): Promise<{ result: Record<string, unknown> }> {
  return safeInvoke("device_automation_perf_trace_analyze", params);
}

export async function openPerformanceTraceExternal(params: {
  localPath: string;
  target: "perfetto_ui";
}): Promise<{ opened: boolean; url?: string }> {
  return safeInvoke("device_automation_perf_trace_open_external", params);
}

export async function deletePerformanceTraceLocalFile(
  localPath: string,
): Promise<{ deleted: boolean }> {
  return safeInvoke("device_automation_perf_trace_delete_local", { localPath });
}
