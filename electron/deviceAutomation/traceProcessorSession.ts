import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import {
  executeTraceProcessorHttpSql,
  isTraceProcessorReadyMessage,
} from "./traceProcessorHttpClient";

const STARTUP_TIMEOUT_MS = 120_000;
const DEFAULT_QUERY_TIMEOUT_MS = 60_000;

/** Tier-0 stdlib 预加载（对齐 SmartPerfetto WorkingTraceProcessor）。 */
export const CRITICAL_STDLIB_MODULES = [
  "android.frames.timeline",
  "android.startup.startups",
  "android.binder",
] as const;

export type TraceProcessorSession = {
  tracePath: string;
  port: number;
  query: (sql: string, timeoutMs?: number) => Promise<{
    columns: string[];
    rows: unknown[][];
  }>;
  close: () => Promise<void>;
};

let spawnImpl = spawn;

export function setTraceProcessorSessionSpawnForTests(
  impl: typeof spawn | null,
): void {
  spawnImpl = impl ?? spawn;
}

export function resetTraceProcessorSessionForTests(): void {
  spawnImpl = spawn;
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("无法分配 trace_processor HTTP 端口")));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

export async function openTraceProcessorSession(params: {
  binaryPath: string;
  tracePath: string;
  preloadStdlib?: boolean;
}): Promise<TraceProcessorSession> {
  const port = await findFreePort();
  const child = await startTraceProcessorHttpServer({
    binaryPath: params.binaryPath,
    tracePath: params.tracePath,
    port,
  });

  let closed = false;
  const session: TraceProcessorSession = {
    tracePath: params.tracePath,
    port,
    query: async (sql, timeoutMs = DEFAULT_QUERY_TIMEOUT_MS) => {
      if (closed) {
        throw new Error("trace_processor 会话已关闭");
      }
      const result = await executeTraceProcessorHttpSql({
        port,
        sql,
        timeoutMs,
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return {
        columns: result.columns,
        rows: result.rows,
      };
    },
    close: async () => {
      if (closed) {
        return;
      }
      closed = true;
      await stopChildProcess(child);
    },
  };

  if (params.preloadStdlib !== false) {
    for (const moduleName of CRITICAL_STDLIB_MODULES) {
      await session.query(`INCLUDE PERFETTO MODULE ${moduleName};`, DEFAULT_QUERY_TIMEOUT_MS);
    }
  }

  return session;
}

async function startTraceProcessorHttpServer(params: {
  binaryPath: string;
  tracePath: string;
  port: number;
}): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(
      params.binaryPath,
      ["--httpd", "--http-port", String(params.port), params.tracePath],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (error: Error | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        void stopChildProcess(child);
        reject(error);
        return;
      }
      resolve(child);
    };

    const timer = setTimeout(() => {
      finish(
        new Error(
          `trace_processor HTTP 启动超时。stdout: ${stdout.slice(-500)} stderr: ${stderr.slice(-500)}`,
        ),
      );
    }, STARTUP_TIMEOUT_MS);

    const handleOutput = (text: string): void => {
      if (text.includes("Could not open") || text.includes("Could not read")) {
        finish(new Error(text.trim()));
        return;
      }
      if (isTraceProcessorReadyMessage(text)) {
        setTimeout(() => finish(null), 300);
      }
    };

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
      handleOutput(String(chunk));
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
      handleOutput(String(chunk));
    });
    child.on("error", (error) => finish(error));
    child.on("exit", (code) => {
      if (!settled) {
        finish(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `trace_processor 提前退出，code=${code ?? "unknown"}`,
          ),
        );
      }
    });
  });
}

async function stopChildProcess(child: ChildProcess): Promise<void> {
  if (child.killed || child.exitCode != null) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}
