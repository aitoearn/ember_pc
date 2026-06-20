import { describe, expect, it } from "vitest";
import { buildJankSummaryResult } from "./jankSummary";
import type { AnalysisTemplateContext } from "./types";

function createCtx(
  runSql: AnalysisTemplateContext["runSql"],
  packageName = "com.example.app",
): AnalysisTemplateContext {
  return {
    analysisType: "jank_summary",
    packageName,
    runSql,
  };
}

describe("buildJankSummaryResult", () => {
  it("使用 actual_frame_timeline_slice 统计帧与卡顿", async () => {
    const result = await buildJankSummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("has_frame_timeline")) {
          return [{ has_frame_timeline: 1 }];
        }
        if (sql.includes("actual_frame_timeline_slice")) {
          return [
            { frame_ms: 10, ts: 1000, jank_type: "None", process_name: "com.example.app" },
            { frame_ms: 20, ts: 2000, jank_type: "Jank", process_name: "com.example.app" },
            { frame_ms: 40, ts: 3000, jank_type: "Jank", process_name: "com.example.app" },
          ];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("ok");
    expect(result.dataSource).toBe("actual_frame_timeline_slice");
    expect(result.totalFrames).toBe(3);
    expect(result.jankFrames).toBe(2);
    expect(result.p99FrameMs).toBe(20);
  });

  it("无帧数据时标记 empty 并给出说明", async () => {
    const result = await buildJankSummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("has_frame_timeline")) {
          return [{ has_frame_timeline: 1 }];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("empty");
    expect(result.totalFrames).toBe(0);
    expect(result.p99FrameMs).toBe(0);
    expect(result.note).toContain("com.example.app");
  });
});
