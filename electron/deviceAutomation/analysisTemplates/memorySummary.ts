import {
  buildGcOverviewSql,
  buildGcTypeBreakdownSql,
  buildInitGcEventsViewSql,
} from "./sql/memoryAnalysisSql";
import type { AnalysisTemplateContext } from "./types";
import { escapeSqlLiteral, packageGlob, runSqlSafe } from "./sqlUtils";

export async function buildMemorySummaryResult(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const pkg = escapeSqlLiteral(ctx.packageName);
  const pkgGlob = packageGlob(ctx.packageName);

  await runSqlSafe(ctx.runSql, buildInitGcEventsViewSql(pkgGlob, pkg));

  const overviewRows = await runSqlSafe(ctx.runSql, buildGcOverviewSql());
  const typeRows = await runSqlSafe(ctx.runSql, buildGcTypeBreakdownSql());

  const overview = overviewRows[0] ?? {};
  const totalGcCount = Number(overview.total_gc_count ?? 0);
  const totalGcTimeMs = Number(overview.total_gc_time_ms ?? 0);
  const mainThreadGcCount = Number(overview.main_thread_gc_count ?? 0);

  const gcTypeBreakdown = typeRows.map((row) => ({
    gcType: String(row.gc_type ?? "Other"),
    count: Number(row.count ?? 0),
    totalDurMs: Number(row.total_dur_ms ?? 0),
  }));

  const dataStatus = totalGcCount > 0 ? "ok" : "empty";
  let note: string | undefined;
  if (dataStatus === "empty") {
    note = `trace 中未检测到 ${ctx.packageName} 的 GC 事件；请使用 memory 预设并在录制期间触发内存压力或滑动`;
  }

  let gcFrequencyRating = "良好";
  if (totalGcCount > 100) {
    gcFrequencyRating = "频繁";
  } else if (totalGcCount > 50) {
    gcFrequencyRating = "较多";
  } else if (totalGcCount > 10) {
    gcFrequencyRating = "正常";
  }

  let gcTimeRating = "优秀";
  if (totalGcTimeMs > 2000) {
    gcTimeRating = "严重";
  } else if (totalGcTimeMs > 500) {
    gcTimeRating = "需优化";
  } else if (totalGcTimeMs > 100) {
    gcTimeRating = "良好";
  }

  return {
    packageName: ctx.packageName,
    dataStatus,
    dataSource: "ember_gc_events",
    totalGcCount,
    totalGcTimeMs: Math.round(totalGcTimeMs),
    avgGcTimeMs: Number(overview.avg_gc_time_ms ?? 0),
    maxGcTimeMs: Number(overview.max_gc_time_ms ?? 0),
    mainThreadGcCount,
    mainThreadGcTimeMs: Math.round(Number(overview.main_thread_gc_time_ms ?? 0)),
    gcFrequencyRating,
    gcTimeRating,
    gcTypeBreakdown,
    note,
  };
}
