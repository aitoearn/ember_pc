import { describe, expect, it } from "vitest";
import { buildMemorySummaryResult } from "./memorySummary";
import type { AnalysisTemplateContext } from "./types";

function createCtx(
  runSql: AnalysisTemplateContext["runSql"],
  packageName = "com.example.app",
): AnalysisTemplateContext {
  return {
    analysisType: "memory_summary",
    packageName,
    runSql,
  };
}

describe("buildMemorySummaryResult", () => {
  it("统计 GC 次数与耗时", async () => {
    const result = await buildMemorySummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("CREATE VIEW ember_gc_events")) {
          return [];
        }
        if (sql.includes("gc_type")) {
          return [
            { gc_type: "ConcurrentCopying", count: 12, total_dur_ms: 180 },
            { gc_type: "Young", count: 8, total_dur_ms: 40 },
          ];
        }
        if (sql.includes("total_gc_count")) {
          return [
            {
              total_gc_count: 20,
              total_gc_time_ms: 220,
              avg_gc_time_ms: 11,
              max_gc_time_ms: 45,
              main_thread_gc_count: 3,
              main_thread_gc_time_ms: 30,
            },
          ];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("ok");
    expect(result.totalGcCount).toBe(20);
    expect(result.gcFrequencyRating).toBe("正常");
    expect(result.gcTypeBreakdown).toHaveLength(2);
  });

  it("无 GC 数据时标记 empty", async () => {
    const result = await buildMemorySummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("CREATE VIEW ember_gc_events")) {
          return [];
        }
        if (sql.includes("total_gc_count")) {
          return [{ total_gc_count: 0 }];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("empty");
    expect(result.note).toContain("com.example.app");
  });
});
