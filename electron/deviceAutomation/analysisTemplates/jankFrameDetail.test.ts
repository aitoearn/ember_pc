import { describe, expect, it } from "vitest";
import { buildJankFrameDetailResult } from "./jankFrameDetail";
import type { AnalysisTemplateContext } from "./types";

function createCtx(
  runSql: AnalysisTemplateContext["runSql"],
  packageName = "com.example.app",
  frameTarget?: AnalysisTemplateContext["frameTarget"],
): AnalysisTemplateContext {
  return {
    analysisType: "jank_frame_detail",
    packageName,
    runSql,
    ...(frameTarget ? { frameTarget } : {}),
  };
}

describe("buildJankFrameDetailResult", () => {
  it("分析最严重卡顿帧并输出主线程 slice + 根因", async () => {
    const result = await buildJankFrameDetailResult(
      createCtx(async (sql) => {
        if (sql.includes("ember_scrolling_jank_frames") && sql.includes("ORDER BY frame_ms")) {
          return [
            {
              frame_id: 9,
              start_ts: 1_000_000,
              end_ts: 1_030_000_000,
              frame_ms: 30,
              jank_type: "Jank",
              process_name: "com.example.app",
            },
          ];
        }
        if (sql.includes("main_thread") && sql.includes("GROUP BY s.name")) {
          return [
            { name: "performTraversals", dur_ms: 12.5, count: 2, max_ms: 8 },
            { name: "DrawFrame", dur_ms: 6, count: 1, max_ms: 6 },
          ];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("ok");
    expect((result.frame as { frameMs: number }).frameMs).toBe(30);
    expect((result.rootCause as { reasonCode: string }).reasonCode).toBe("layout_measure");
    expect((result.mainThreadSlices as unknown[]).length).toBe(2);
  });

  it("无卡顿帧时返回 empty", async () => {
    const result = await buildJankFrameDetailResult(createCtx(async () => []));
    expect(result.dataStatus).toBe("empty");
  });

  it("按 frame_id 目标分析指定帧", async () => {
    const result = await buildJankFrameDetailResult(
      createCtx(
        async (sql) => {
          if (sql.includes("frame_id = 7")) {
            return [
              {
                frame_id: 7,
                start_ts: 2_000_000,
                end_ts: 2_020_000_000,
                frame_ms: 20,
                jank_type: "Jank",
                process_name: "com.example.app",
              },
            ];
          }
          if (sql.includes("GROUP BY s.name")) {
            return [{ name: "DrawFrame", dur_ms: 8, count: 1, max_ms: 8 }];
          }
          return [];
        },
        "com.example.app",
        { frameId: 7, startTsNs: 2_000_000 },
      ),
    );

    expect(result.dataStatus).toBe("ok");
    expect((result.frame as { frameId: number }).frameId).toBe(7);
    expect(result.selectionMode).toBe("frame_id");
  });
});
