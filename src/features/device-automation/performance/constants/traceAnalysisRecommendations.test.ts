import { describe, expect, it } from "vitest";
import {
  getRecommendedAnalysesForPreset,
  isRecommendedAnalysis,
} from "./traceAnalysisRecommendations";

describe("traceAnalysisRecommendations", () => {
  it("滑动卡顿预设推荐 jank + cpu", () => {
    expect(getRecommendedAnalysesForPreset("scroll_jank")).toEqual([
      "jank_summary",
      "jank_frame_detail",
      "cpu_quadrant",
    ]);
    expect(isRecommendedAnalysis("scroll_jank", "jank_summary")).toBe(true);
    expect(isRecommendedAnalysis("scroll_jank", "anr_summary")).toBe(false);
  });

  it("custom 预设回退到通用推荐", () => {
    expect(getRecommendedAnalysesForPreset("custom")).toContain("jank_summary");
  });
});
