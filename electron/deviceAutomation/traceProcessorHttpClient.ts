import http from "node:http";
import { decodeQueryResult, encodeQueryArgs } from "./traceProcessorProtobuf";

export type TraceProcessorHttpSqlResult = {
  columns: string[];
  rows: unknown[][];
  durationMs: number;
  error?: string;
};

export async function executeTraceProcessorHttpSql(params: {
  port: number;
  sql: string;
  timeoutMs: number;
  hostname?: string;
}): Promise<TraceProcessorHttpSqlResult> {
  const startTime = Date.now();
  const body = encodeQueryArgs(params.sql);
  const responseBody = await executeTraceProcessorHttpRaw({
    hostname: params.hostname ?? "127.0.0.1",
    port: params.port,
    path: "/query",
    body,
    timeoutMs: params.timeoutMs,
  });
  const parsed = decodeQueryResult(responseBody);
  return {
    columns: parsed.columnNames,
    rows: parsed.rows,
    durationMs: Date.now() - startTime,
    ...(parsed.error ? { error: parsed.error } : {}),
  };
}

function executeTraceProcessorHttpRaw(params: {
  hostname: string;
  port: number;
  path: "/query" | "/status";
  body: Buffer;
  timeoutMs: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let request: http.ClientRequest | null = null;
    const timer = setTimeout(() => {
      request?.destroy();
      finish(new Error(`trace_processor HTTP 查询超时（${params.timeoutMs}ms）`));
    }, params.timeoutMs);

    const finish = (error: Error | null, body?: Buffer): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
        return;
      }
      resolve(body ?? Buffer.alloc(0));
    };

    request = http.request(
      {
        hostname: params.hostname,
        port: params.port,
        path: params.path,
        method: "POST",
        headers: {
          "Content-Type": "application/x-protobuf",
          "Content-Length": params.body.length,
        },
        timeout: params.timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const responseBody = Buffer.concat(chunks);
          if ((response.statusCode ?? 0) !== 200) {
            finish(
              new Error(
                `trace_processor HTTP ${response.statusCode}: ${responseBody.toString("utf8")}`,
              ),
            );
            return;
          }
          finish(null, responseBody);
        });
      },
    );

    request.on("error", (error) => finish(error));
    request.on("timeout", () => {
      request?.destroy();
      finish(new Error("trace_processor HTTP 查询超时"));
    });
    request.write(params.body);
    request.end();
  });
}

export function isTraceProcessorReadyMessage(text: string): boolean {
  return (
    text.includes("Starting HTTP server") || text.includes("Starting RPC server")
  );
}
