export type PerfMetricKey = "cpu_app" | "cpu_sys" | "mem_total" | "fps";

export type PerfMetricId = "cpu" | "memory" | "fps";

export type PerfSessionStatus = "running" | "stopped" | "failed";

export interface PerfMetricSummary {
  avg: number;
  max: number;
  min: number;
}

export type PerfMetricSummaryMap = Partial<Record<PerfMetricKey, PerfMetricSummary>>;

export interface PerformanceInstalledApp {
  packageName: string;
  label?: string;
}

export interface PerformanceSession {
  id: string;
  workspaceId: string;
  deviceId: string;
  devicePlatform: "android" | "ios" | "harmony";
  packageName: string;
  metrics: PerfMetricId[];
  intervalMs: number;
  status: PerfSessionStatus;
  startedAt: string;
  stoppedAt: string | null;
  summary: PerfMetricSummaryMap | null;
}

export interface PerformanceLiveFrame {
  sessionId: string;
  ts: number;
  data: Partial<Record<PerfMetricKey, number>>;
}

/** P2 · Perfetto trace 录制预设 */
export type PerfTracePresetId =
  | "scroll_jank"
  | "cold_start"
  | "cpu_sched"
  | "custom";

/** P2 · Trace artifact 生命周期状态 */
export type PerfTraceArtifactStatus = "recording" | "ready" | "failed";

/** P2 · L1 分析模板类型 */
export type PerfTraceAnalysisType =
  | "jank_summary"
  | "startup_summary"
  | "cpu_quadrant";

/** P2 · 分析任务状态 */
export type PerfTraceAnalysisStatus = "pending" | "done" | "failed";

/** P2 · Perfetto trace 文件元数据（与 App Server SQLite 对齐） */
export interface PerformanceTraceArtifact {
  id: string;
  workspaceId: string;
  linkedSessionId: string | null;
  deviceId: string;
  devicePlatform: "android" | "ios" | "harmony";
  packageName: string;
  presetId: PerfTracePresetId;
  configJson: string | null;
  localPath: string | null;
  remotePath: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
  status: PerfTraceArtifactStatus;
  errorMessage: string | null;
  createdAt: string;
  stoppedAt: string | null;
}

/** P2 · Trace L1 分析结果 */
export interface PerformanceTraceAnalysis {
  id: string;
  artifactId: string;
  analysisType: PerfTraceAnalysisType;
  packageName: string;
  timeRangeJson: string | null;
  resultJson: string;
  status: PerfTraceAnalysisStatus;
  createdAt: string;
}
