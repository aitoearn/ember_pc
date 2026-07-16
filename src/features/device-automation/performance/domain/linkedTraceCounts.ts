import type { PerformanceTraceArtifact } from "../types";

/** 按 linkedSessionId 统计就绪 Trace 数量（用于 APM 历史列表角标）。 */
export function buildLinkedTraceCountBySessionId(
  artifacts: PerformanceTraceArtifact[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const artifact of artifacts) {
    const sessionId = artifact.linkedSessionId?.trim();
    if (!sessionId || artifact.status !== "ready") {
      continue;
    }
    counts[sessionId] = (counts[sessionId] ?? 0) + 1;
  }
  return counts;
}
