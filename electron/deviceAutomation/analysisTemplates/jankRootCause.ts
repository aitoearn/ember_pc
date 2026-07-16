/** 将 Frame Timeline jank_type 映射为可读根因分类（对齐 SmartPerfetto L1 语义，无 LLM）。 */
export type JankRootCauseCode =
  | "severe_jank"
  | "jank"
  | "gpu_compositor"
  | "input_latency"
  | "deadline_missed"
  | "buffer_stuffing"
  | "unknown";

export function classifyJankRootCause(
  jankType: string | null | undefined,
  frameMs: number,
): { code: JankRootCauseCode; summary: string } {
  const severe = frameMs > 32;
  const baseCode: JankRootCauseCode = severe ? "severe_jank" : "jank";

  if (!jankType || String(jankType).trim().length === 0) {
    return {
      code: baseCode,
      summary: severe ? "单帧耗时超过 32ms（严重卡顿）" : "单帧耗时超过 16.7ms（卡顿）",
    };
  }

  const normalized = String(jankType).toLowerCase();

  if (
    normalized.includes("gpu") ||
    normalized.includes("surfaceflinger") ||
    normalized.includes("sf_") ||
    normalized.includes("compositor")
  ) {
    return {
      code: "gpu_compositor",
      summary: `GPU / SurfaceFlinger 合成路径延迟（${jankType}）`,
    };
  }

  if (
    normalized.includes("input") ||
    normalized.includes("touch") ||
    normalized.includes("motion")
  ) {
    return {
      code: "input_latency",
      summary: `输入事件处理延迟（${jankType}）`,
    };
  }

  if (
    normalized.includes("stuff") ||
    normalized.includes("backpressure") ||
    normalized.includes("queue")
  ) {
    return {
      code: "buffer_stuffing",
      summary: `帧队列积压 / backpressure（${jankType}）`,
    };
  }

  if (
    normalized.includes("deadline") ||
    normalized.includes("missed") ||
    normalized.includes("jank")
  ) {
    return {
      code: "deadline_missed",
      summary: `错过 VSYNC 截止期（${jankType}）`,
    };
  }

  return {
    code: baseCode,
    summary: `${jankType}${severe ? " · 严重卡顿" : ""}`,
  };
}
