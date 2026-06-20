export const DEFAULT_PHOENIX_BASE_URL = "http://127.0.0.1:6006";

export const PHOENIX_BASE_URL_STORAGE_KEY =
  "lime.agent-observability.phoenix-base-url";

export function normalizePhoenixBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return DEFAULT_PHOENIX_BASE_URL;
  }
  return trimmed;
}

export function buildPhoenixTracingUrl(baseUrl: string): string {
  const normalized = normalizePhoenixBaseUrl(baseUrl);
  if (normalized.endsWith("/projects")) {
    return normalized;
  }
  return `${normalized}/projects`;
}

export async function probePhoenixHealth(baseUrl: string): Promise<boolean> {
  const normalized = normalizePhoenixBaseUrl(baseUrl);
  try {
    const response = await fetch(`${normalized}/healthz`, {
      method: "GET",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
