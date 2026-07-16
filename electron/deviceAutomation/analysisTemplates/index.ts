import type { PerfTraceAnalysisType } from "../../../src/features/device-automation/performance/types";
import { buildAnrSummaryResult } from "./anrSummary";
import { buildCpuQuadrantResult } from "./cpuQuadrant";
import { buildJankFrameDetailResult } from "./jankFrameDetail";
import { buildJankSummaryResult } from "./jankSummary";
import { buildMemorySummaryResult } from "./memorySummary";
import { buildStartupSummaryResult } from "./startupSummary";
import type { AnalysisTemplateContext } from "./types";

const TEMPLATE_BUILDERS: Record<
  PerfTraceAnalysisType,
  (ctx: AnalysisTemplateContext) => Promise<Record<string, unknown>>
> = {
  jank_summary: buildJankSummaryResult,
  jank_frame_detail: buildJankFrameDetailResult,
  startup_summary: buildStartupSummaryResult,
  cpu_quadrant: buildCpuQuadrantResult,
  memory_summary: buildMemorySummaryResult,
  anr_summary: buildAnrSummaryResult,
};

export async function runAnalysisTemplate(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const builder = TEMPLATE_BUILDERS[ctx.analysisType];
  if (!builder) {
    throw new Error(`不支持的分析类型: ${ctx.analysisType}`);
  }
  return builder(ctx);
}

export type { AnalysisTemplateContext } from "./types";
