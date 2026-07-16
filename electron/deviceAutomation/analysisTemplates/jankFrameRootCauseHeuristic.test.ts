import { describe, expect, it } from "vitest";
import { inferJankFrameRootCause } from "./jankFrameRootCauseHeuristic";

describe("inferJankFrameRootCause", () => {
  it("识别 GC 根因", () => {
    const result = inferJankFrameRootCause({
      slices: [{ name: "Background concurrent copying GC", durMs: 12.5 }],
      jankType: "Jank",
      frameMs: 28,
    });
    expect(result.reasonCode).toBe("gc_pause");
    expect(result.primaryCause).toContain("GC");
  });

  it("识别布局根因", () => {
    const result = inferJankFrameRootCause({
      slices: [{ name: "performTraversals", durMs: 18 }],
      jankType: null,
      frameMs: 22,
    });
    expect(result.reasonCode).toBe("layout_measure");
  });
});
