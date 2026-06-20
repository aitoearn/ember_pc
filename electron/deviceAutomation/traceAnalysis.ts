import { statSync } from "node:fs";
import type { PerfTraceAnalyzeParams } from "./perfTraceCapture";
import { resolveTraceProcessorBinary } from "./traceProcessorDownload";
import { runTraceAnalysis } from "./traceProcessorRunner";

export async function analyzePerfTraceWithProcessor(
  params: PerfTraceAnalyzeParams,
): Promise<{ result: Record<string, unknown> }> {
  const localPath = params.localPath.trim();
  if (!localPath) {
    throw new Error("localPath 不能为空");
  }
  try {
    statSync(localPath);
  } catch {
    throw new Error("trace 文件不存在");
  }

  const binaryPath = await resolveTraceProcessorBinary({ downloadIfMissing: true });
  const result = await runTraceAnalysis({
    binaryPath,
    localPath,
    analysisType: params.analysisType,
    packageName: params.packageName,
    timeRange: params.timeRange,
  });

  return { result };
}
