import { describe, expect, it, vi } from "vitest";

import { waitForUiStable } from "./flowWaiter";

describe("flowWaiter", () => {
  it("dump 稳定后返回 ok", async () => {
    let count = 0;
    const result = await waitForUiStable({
      stabilizeMs: 100,
      timeoutMs: 2000,
      pollMs: 50,
      captureDump: async () => {
        count += 1;
        return count >= 2 ? "stable-xml" : "changing-xml";
      },
    });
    expect(result.ok).toBe(true);
  });

  it("超时返回 timeout", async () => {
    const result = await waitForUiStable({
      stabilizeMs: 500,
      timeoutMs: 100,
      pollMs: 30,
      captureDump: async () => "always-changing-" + Date.now(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("timeout");
    }
  });
});
