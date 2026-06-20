import { spawn } from "node:child_process";
import type { PerfTraceAnalysisType } from "../../src/features/device-automation/performance/types";
import { runAnalysisTemplate } from "./analysisTemplates";
import { parseTraceProcessorTableOutput } from "./traceProcessorTableParser";

export type TraceQueryRow = Record<string, string | number | null>;

const DEFAULT_TIMEOUT_MS = 30_000;

export type TraceProcessorRunnerParams = {
  binaryPath: string;
  tracePath: string;
  sql: string;
  timeoutMs?: number;
};

export type TraceAnalysisParams = {
  binaryPath: string;
  localPath: string;
  analysisType: PerfTraceAnalysisType;
  packageName: string;
  timeRange?: { startNs: number; endNs: number };
  timeoutMs?: number;
};

let spawnImpl = spawn;

export function setTraceProcessorSpawnForTests(
  impl: typeof spawn | null,
): void {
  spawnImpl = impl ?? spawn;
}

export function resetTraceProcessorRunnerForTests(): void {
  spawnImpl = spawn;
}

export { parseTraceProcessorTableOutput } from "./traceProcessorTableParser";

export async function runTraceSql(
  params: TraceProcessorRunnerParams,
): Promise<TraceQueryRow[]> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const child = spawnImpl(
      params.binaryPath,
      ["-Q", params.sql, params.tracePath],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`trace_processor 查询超时（${timeoutMs}ms）`));
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `trace_processor 退出码 ${code ?? "unknown"}`,
          ),
        );
        return;
      }
      resolve(parseTraceProcessorTableOutput(stdout));
    });
  });
}

export async function runTraceAnalysis(
  params: TraceAnalysisParams,
): Promise<Record<string, unknown>> {
  return runAnalysisTemplate({
    analysisType: params.analysisType,
    packageName: params.packageName,
    timeRange: params.timeRange,
    runSql: (sql) =>
      runTraceSql({
        binaryPath: params.binaryPath,
        tracePath: params.localPath,
        sql,
        timeoutMs: params.timeoutMs,
      }),
  });
}
