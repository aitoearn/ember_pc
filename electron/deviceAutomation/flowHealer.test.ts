import { describe, expect, it, vi } from "vitest";

import { healFlowStep } from "./flowHealer";

describe("flowHealer", () => {
  it("VLM 返回坐标时产出 vlm_anchor", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        usage: { total_tokens: 42 },
        choices: [{ message: { content: "point=500,600" } }],
      }),
    })) as unknown as typeof fetch;

    const result = await healFlowStep({
      step: { index: 0, op: "tap", intent: "点击确定" },
      screenshotBase64: "abc",
      mediaType: "image/png",
      screen: { width: 1080, height: 2400 },
      baseUrl: "https://api.example.com/v1",
      apiKey: "key",
      model: "test-model",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.healedLocator.kind).toBe("vlm_anchor");
      expect(result.healedLocator.vlmAnchor).toEqual({ xNorm: 500, yNorm: 600 });
      expect(result.tokenUsed).toBe(42);
    }
  });
});
