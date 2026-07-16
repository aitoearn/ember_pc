import { describe, expect, it } from "vitest";
import { buildStartupSummaryResult } from "./startupSummary";
import type { AnalysisTemplateContext } from "./types";

function createCtx(
  runSql: AnalysisTemplateContext["runSql"],
  packageName = "com.example.app",
): AnalysisTemplateContext {
  return {
    analysisType: "startup_summary",
    packageName,
    runSql,
  };
}

describe("buildStartupSummaryResult", () => {
  it("使用 android_startups 读取 TTFD", async () => {
    const result = await buildStartupSummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("has_android_startups")) {
          return [{ has_android_startups: 1 }];
        }
        if (sql.includes("android_startups")) {
          return [
            {
              startup_id: 1,
              package: "com.example.app",
              startup_type: "cold",
              dur_ms: 800,
              ttid_ms: 500,
              ttfd_ms: 900,
            },
          ];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("ok");
    expect(result.dataSource).toBe("android_startups");
    expect(result.timeToDisplayMs).toBe(900);
    expect(result.coldStartCount).toBe(1);
  });

  it("无启动事件时标记 empty", async () => {
    const result = await buildStartupSummaryResult(
      createCtx(async (sql) => {
        if (sql.includes("has_android_startups")) {
          return [{ has_android_startups: 1 }];
        }
        return [];
      }),
    );

    expect(result.dataStatus).toBe("empty");
    expect(result.timeToDisplayMs).toBe(0);
    expect(result.note).toContain("cold_start");
  });
});
