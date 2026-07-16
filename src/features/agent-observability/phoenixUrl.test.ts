import { describe, expect, it } from "vitest";
import {
  buildPhoenixTracingUrl,
  DEFAULT_PHOENIX_BASE_URL,
  normalizePhoenixBaseUrl,
} from "./phoenixUrl";

describe("phoenixUrl", () => {
  it("规范化 Phoenix 基址", () => {
    expect(normalizePhoenixBaseUrl("")).toBe(DEFAULT_PHOENIX_BASE_URL);
    expect(normalizePhoenixBaseUrl("http://127.0.0.1:6006/")).toBe(
      "http://127.0.0.1:6006",
    );
  });

  it("构建 Tracing 项目列表 URL", () => {
    expect(buildPhoenixTracingUrl("http://127.0.0.1:6006")).toBe(
      "http://127.0.0.1:6006/projects",
    );
    expect(buildPhoenixTracingUrl("http://127.0.0.1:6006/projects")).toBe(
      "http://127.0.0.1:6006/projects",
    );
  });
});
