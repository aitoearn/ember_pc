import { describe, expect, it } from "vitest";
import { buildCpuQuadrantResult } from "./cpuQuadrant";
import type { AnalysisTemplateContext } from "./types";

function createCtx(
  runSql: AnalysisTemplateContext["runSql"],
  packageName = "com.example.app",
): AnalysisTemplateContext {
  return {
    analysisType: "cpu_quadrant",
    packageName,
    runSql,
  };
}

describe("buildCpuQuadrantResult", () => {
  it("根据 thread_state 计算真实四象限占比", async () => {
    const result = await buildCpuQuadrantResult(
      createCtx(async (sql) => {
        if (sql.includes("CREATE PERFETTO TABLE _cpu_topology")) {
          return [];
        }
        if (sql.includes("quadrant_totals") || sql.includes("quadrant,")) {
          return [
            { quadrant: "Q1", dur_ns: 400_000_000 },
            { quadrant: "Q2", dur_ns: 100_000_000 },
            { quadrant: "Q3", dur_ns: 200_000_000 },
            { quadrant: "Q4a", dur_ns: 50_000_000 },
            { quadrant: "Q4b", dur_ns: 250_000_000 },
          ];
        }
        if (sql.includes("thread.name AS thread_name")) {
          return [{ thread_name: "MainThread", cpu_s: 2.5 }];
        }
        return [];
      }),
    );

    expect(result.quadrants).toEqual({
      runningBigCore: 0.4,
      runningLittleCore: 0.1,
      runnable: 0.2,
      uninterruptible: 0.05,
      sleeping: 0.25,
    });
    expect(result.note).toBeUndefined();
  });

  it("缺少 sched 数据时给出说明", async () => {
    const result = await buildCpuQuadrantResult(
      createCtx(async () => []),
    );

    expect(result.quadrants).toEqual({
      runningBigCore: 0,
      runningLittleCore: 0,
      runnable: 0,
      uninterruptible: 0,
      sleeping: 0,
    });
    expect(result.note).toContain("slice");
  });
});
