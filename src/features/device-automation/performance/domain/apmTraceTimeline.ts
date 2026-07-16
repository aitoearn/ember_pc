import type { PerformanceSession, PerformanceTraceArtifact } from "../types";

export type ApmSessionWindow = {
  startMs: number;
  endMs: number;
  durationMs: number;
};

export type TraceTimelineSegment = {
  artifactId: string;
  presetId: string;
  traceStartMs: number;
  traceEndMs: number;
  /** 相对 APM 会话起点偏移（毫秒） */
  offsetStartMs: number;
  /** 相对 APM 会话起点结束偏移（毫秒） */
  offsetEndMs: number;
  startPercent: number;
  widthPercent: number;
  /** trace 是否完全落在会话窗口内 */
  fullyWithinSession: boolean;
};

function parseIsoMs(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** 解析 APM 会话时间窗。 */
export function resolveApmSessionWindow(
  session: Pick<PerformanceSession, "startedAt" | "stoppedAt">,
): ApmSessionWindow | null {
  const startMs = parseIsoMs(session.startedAt);
  if (startMs == null) {
    return null;
  }
  const stoppedMs = parseIsoMs(session.stoppedAt);
  const endMs = stoppedMs != null && stoppedMs >= startMs ? stoppedMs : startMs;
  const durationMs = Math.max(endMs - startMs, 1);
  return { startMs, endMs, durationMs };
}

/** 解析 Trace artifact 录制时间窗。 */
export function resolveTraceArtifactWindow(
  artifact: Pick<PerformanceTraceArtifact, "createdAt" | "stoppedAt" | "durationMs">,
): { startMs: number; endMs: number } | null {
  const startMs = parseIsoMs(artifact.createdAt);
  if (startMs == null) {
    return null;
  }
  const stoppedMs = parseIsoMs(artifact.stoppedAt);
  const durationMs = Number(artifact.durationMs ?? 0);
  const endMs =
    stoppedMs != null && stoppedMs >= startMs
      ? stoppedMs
      : durationMs > 0
        ? startMs + durationMs
        : startMs + 1;
  return { startMs, endMs: Math.max(endMs, startMs) };
}

/** 将 Trace 投影到 APM 会话时间轴（百分比位置）。 */
export function projectTraceOntoApmSession(
  session: Pick<PerformanceSession, "startedAt" | "stoppedAt">,
  artifact: Pick<
    PerformanceTraceArtifact,
    "id" | "presetId" | "createdAt" | "stoppedAt" | "durationMs"
  >,
): TraceTimelineSegment | null {
  const sessionWindow = resolveApmSessionWindow(session);
  const traceWindow = resolveTraceArtifactWindow(artifact);
  if (!sessionWindow || !traceWindow) {
    return null;
  }

  const offsetStartMs = traceWindow.startMs - sessionWindow.startMs;
  const offsetEndMs = traceWindow.endMs - sessionWindow.startMs;
  const clampedStart = Math.max(0, Math.min(sessionWindow.durationMs, offsetStartMs));
  const clampedEnd = Math.max(
    clampedStart,
    Math.min(sessionWindow.durationMs, offsetEndMs),
  );
  const spanMs = clampedEnd - clampedStart;
  if (spanMs <= 0) {
    return null;
  }

  return {
    artifactId: artifact.id,
    presetId: artifact.presetId,
    traceStartMs: traceWindow.startMs,
    traceEndMs: traceWindow.endMs,
    offsetStartMs: clampedStart,
    offsetEndMs: clampedEnd,
    startPercent: (clampedStart / sessionWindow.durationMs) * 100,
    widthPercent: (spanMs / sessionWindow.durationMs) * 100,
    fullyWithinSession:
      offsetStartMs >= 0 &&
      offsetEndMs <= sessionWindow.durationMs &&
      traceWindow.endMs > traceWindow.startMs,
  };
}

export function projectTracesOntoApmSession(
  session: Pick<PerformanceSession, "startedAt" | "stoppedAt">,
  artifacts: Array<
    Pick<
      PerformanceTraceArtifact,
      "id" | "presetId" | "createdAt" | "stoppedAt" | "durationMs"
    >
  >,
): TraceTimelineSegment[] {
  return artifacts
    .map((artifact) => projectTraceOntoApmSession(session, artifact))
    .filter((segment): segment is TraceTimelineSegment => segment != null);
}

export function formatTimelineOffsetMs(offsetMs: number): string {
  if (offsetMs < 1000) {
    return `${Math.round(offsetMs)} ms`;
  }
  if (offsetMs < 60_000) {
    return `${(offsetMs / 1000).toFixed(1)} s`;
  }
  const minutes = Math.floor(offsetMs / 60_000);
  const seconds = Math.round((offsetMs % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}
