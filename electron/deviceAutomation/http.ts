import { request as httpRequest } from "node:http";

export async function requestJson(
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
): Promise<unknown> {
  return await new Promise<unknown>((resolve, reject) => {
    const parsed = new URL(url);
    const request = httpRequest(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: init?.method ?? "GET",
        headers:
          init?.body !== undefined
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(init.body).toString(),
                ...init.headers,
              }
            : init?.headers,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if ((response.statusCode ?? 500) >= 400) {
            reject(
              new Error(
                `设备自动化服务请求失败：HTTP ${response.statusCode ?? "unknown"} ${raw}`,
              ),
            );
            return;
          }
          if (!raw.trim()) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("error", reject);
    if (init?.body !== undefined) {
      request.write(init.body);
    }
    request.end();
  });
}
