import { describe, expect, it } from "vitest";
import { buildAnrSummaryResult } from "./anrSummary";
import type { AnalysisTemplateContext } from "./types";

function createCtx(
  runSql: AnalysisTemplateContext["runSql"],
  packageName = "com.example.app",
): AnalysisTemplateContext {
  return {
    analysisType: "anr_summary",
    packageName,
    runSql,
  };
}

describe("buildAnrSummaryResult", () => {
  it("统计 ANR 总数与类型分布", async () => {
    const result = await buildAnrSummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("has_android_anrs")) {
          return [{ has_android_anrs: 1 }];
        }
        if (sql.includes("total_anr_count")) {
          return [
            {
              total_anr_count: 2,
              affected_process_count: 1,
              anr_span_seconds: 3.5,
              first_anr_ts: 1000,
            },
          ];
        }
        if (sql.includes("GROUP BY anr_type")) {
          return [{ anr_type: "INPUT_DISPATCHING_TIMEOUT", event_count: 2 }];
        }
        if (sql.includes("ORDER BY ts")) {
          return [
            {
              ts: 1000,
              process_name: "com.example.app",
              anr_type: "INPUT_DISPATCHING_TIMEOUT",
              subject: "Input dispatching timed out",
              pid: 1234,
            },
          ];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("ok");
    expect(result.totalAnrCount).toBe(2);
    expect(result.typeBreakdown).toHaveLength(1);
    expect(result.highlights).toHaveLength(1);
  });

  it("无 ANR 数据时标记 empty", async () => {
    const result = await buildAnrSummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("has_android_anrs")) {
          return [{ has_android_anrs: 1 }];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("empty");
    expect(result.note).toContain("anr 预设");
  });
});
