import type { PerfTraceFrameTarget } from "../types";

export type JankHighlightLike = {
  tsNs?: number;
  frameMs?: number;
  frameId?: number | null;
};

/** 从卡顿摘要 highlight 构造单帧根因分析目标。 */
export function frameTargetFromJankHighlight(
  highlight: JankHighlightLike,
): PerfTraceFrameTarget | null {
  const startTsNs = Number(highlight.tsNs ?? 0);
  const frameMs = Number(highlight.frameMs ?? 0);
  if (!Number.isFinite(startTsNs) || startTsNs <= 0) {
    return null;
  }
  const endTsNs =
    frameMs > 0 ? Math.round(startTsNs + frameMs * 1e6) : undefined;
  return {
    ...(highlight.frameId != null ? { frameId: highlight.frameId } : {}),
    startTsNs: Math.round(startTsNs),
    ...(endTsNs != null ? { endTsNs } : {}),
  };
}
