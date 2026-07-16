import type { PerfTraceAnalysisType } from "../../../src/features/device-automation/performance/types";
import type { TraceQueryRow } from "../traceProcessorRunner";

export type AnalysisTemplateContext = {
  analysisType: PerfTraceAnalysisType;
  packageName: string;
  timeRange?: { startNs: number; endNs: number };
  frameTarget?: {
    frameId?: number | null;
    startTsNs?: number;
    endTsNs?: number;
  };
  runSql: (sql: string) => Promise<TraceQueryRow[]>;
};
