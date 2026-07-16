import { spawn } from "node:child_process";
import type { PerfTraceAnalysisType } from "../../src/features/device-automation/performance/types";
import { runAnalysisTemplate } from "./analysisTemplates";
import { rowsToRecords } from "./analysisTemplates/sqlUtils";
import { parseTraceProcessorTableOutput } from "./traceProcessorTableParser";
import {
  openTraceProcessorSession,
  type TraceProcessorSession,
} from "./traceProcessorSession";

export type TraceQueryRow = Record<string, string | number | null>;

const DEFAULT_TIMEOUT_MS = 60_000;
const CLI_FALLBACK_TIMEOUT_MS = 30_000;

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
  frameTarget?: {
    frameId?: number | null;
    startTsNs?: number;
    endTsNs?: number;
  };
  timeoutMs?: number;
};

let spawnImpl = spawn;
let sessionFactory: typeof openTraceProcessorSession = openTraceProcessorSession;

export function setTraceProcessorSpawnForTests(
  impl: typeof spawn | null,
): void {
  spawnImpl = impl ?? spawn;
}

export function setTraceProcessorSessionFactoryForTests(
  factory: typeof openTraceProcessorSession | null,
): void {
  sessionFactory = factory ?? openTraceProcessorSession;
}

export function resetTraceProcessorRunnerForTests(): void {
  spawnImpl = spawn;
  sessionFactory = openTraceProcessorSession;
}

export { parseTraceProcessorTableOutput } from "./traceProcessorTableParser";

/** CLI `-Q` 冷启动查询（测试/降级路径）。 */
export async function runTraceSqlCli(
  params: TraceProcessorRunnerParams,
): Promise<TraceQueryRow[]> {
  const timeoutMs = params.timeoutMs ?? CLI_FALLBACK_TIMEOUT_MS;
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

async function runTraceSqlViaSession(
  session: TraceProcessorSession,
  sql: string,
  timeoutMs: number,
): Promise<TraceQueryRow[]> {
  const result = await session.query(sql, timeoutMs);
  return rowsToRecords(result.columns, result.rows);
}

export async function runTraceAnalysis(
  params: TraceAnalysisParams,
): Promise<Record<string, unknown>> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let session: TraceProcessorSession | null = null;

  try {
    session = await sessionFactory({
      binaryPath: params.binaryPath,
      tracePath: params.localPath,
      preloadStdlib: true,
    });

    const runSql = (sql: string) => runTraceSqlViaSession(session!, sql, timeoutMs);

    return await runAnalysisTemplate({
      analysisType: params.analysisType,
      packageName: params.packageName,
      timeRange: params.timeRange,
      frameTarget: params.frameTarget,
      runSql,
    });
  } finally {
    await session?.close();
  }
}
