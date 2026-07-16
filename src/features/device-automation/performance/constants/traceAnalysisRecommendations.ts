import type { PerfTraceAnalysisType, PerfTracePresetId } from "../types";

/** 内置预设（不含 custom） */
export type BuiltInPerfTracePresetId = Exclude<PerfTracePresetId, "custom">;

/** 各采集预设推荐的 L1 分析模板（首项为首选） */
export const PRESET_RECOMMENDED_ANALYSES: Record<
  BuiltInPerfTracePresetId,
  PerfTraceAnalysisType[]
> = {
  scroll_jank: ["jank_summary", "jank_frame_detail", "cpu_quadrant"],
  cold_start: ["startup_summary", "cpu_quadrant"],
  cpu_sched: ["cpu_quadrant", "anr_summary"],
  memory: ["memory_summary", "cpu_quadrant"],
  anr: ["anr_summary", "cpu_quadrant"],
  overview: ["jank_summary", "startup_summary", "cpu_quadrant"],
  camera: ["jank_summary", "memory_summary", "cpu_quadrant"],
  game: ["jank_summary", "jank_frame_detail", "cpu_quadrant"],
  power: ["cpu_quadrant"],
  full: [
    "jank_summary",
    "startup_summary",
    "memory_summary",
    "anr_summary",
    "cpu_quadrant",
  ],
};

export function getRecommendedAnalysesForPreset(
  presetId: PerfTracePresetId | string | null | undefined,
): PerfTraceAnalysisType[] {
  if (!presetId || presetId === "custom") {
    return ["jank_summary", "cpu_quadrant"];
  }
  return PRESET_RECOMMENDED_ANALYSES[presetId as BuiltInPerfTracePresetId] ?? [
    "jank_summary",
    "cpu_quadrant",
  ];
}

export function isRecommendedAnalysis(
  presetId: PerfTracePresetId | string | null | undefined,
  analysisType: PerfTraceAnalysisType,
): boolean {
  return getRecommendedAnalysesForPreset(presetId).includes(analysisType);
}
