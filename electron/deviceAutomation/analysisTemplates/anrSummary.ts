import {
  buildAnrDetectionSql,
  buildAnrEventListSql,
  buildAnrTypeBreakdownSql,
} from "./sql/anrAnalysisSql";
import type { AnalysisTemplateContext } from "./types";
import { escapeSqlLiteral, packageGlob, runSqlSafe } from "./sqlUtils";

export async function buildAnrSummaryResult(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const pkg = escapeSqlLiteral(ctx.packageName);
  const pkgGlob = packageGlob(ctx.packageName);

  const tableCheckSql = `
INCLUDE PERFETTO MODULE android.anrs;
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name='android_anrs'
) THEN 1 ELSE 0 END AS has_android_anrs;
`.trim();

  const checkRows = await runSqlSafe(ctx.runSql, tableCheckSql);
  const hasAndroidAnrs = Number(checkRows[0]?.has_android_anrs) === 1;

  let dataSource = "none";
  let detectionRows: Record<string, string | number | null>[] = [];
  let typeRows: Record<string, string | number | null>[] = [];
  let eventRows: Record<string, string | number | null>[] = [];

  if (hasAndroidAnrs) {
    detectionRows = await runSqlSafe(
      ctx.runSql,
      buildAnrDetectionSql(pkgGlob, pkg),
    );
    typeRows = await runSqlSafe(
      ctx.runSql,
      buildAnrTypeBreakdownSql(pkgGlob, pkg),
    );
    eventRows = await runSqlSafe(
      ctx.runSql,
      buildAnrEventListSql(pkgGlob, pkg),
    );
    if (detectionRows.length > 0 || eventRows.length > 0) {
      dataSource = "android_anrs";
    }
  }

  const detection = detectionRows[0] ?? {};
  const totalAnrCount = Number(detection.total_anr_count ?? eventRows.length);
  const affectedProcessCount = Number(detection.affected_process_count ?? 0);
  const anrSpanSeconds = Number(detection.anr_span_seconds ?? 0);

  const typeBreakdown = typeRows.map((row) => ({
    anrType: String(row.anr_type ?? "unknown"),
    eventCount: Number(row.event_count ?? 0),
  }));

  const highlights = eventRows.slice(0, 8).map((row) => ({
    tsNs: Number(row.ts ?? 0),
    processName: String(row.process_name ?? ""),
    anrType: String(row.anr_type ?? "unknown"),
    subject: row.subject ?? null,
  }));

  const dataStatus = totalAnrCount > 0 ? "ok" : "empty";
  let note: string | undefined;
  if (dataStatus === "empty") {
    note = `trace 中未检测到 ${ctx.packageName} 的 ANR 事件；请使用 anr 预设并在录制期间复现无响应场景`;
  } else if (totalAnrCount > 3) {
    note = `检测到 ${totalAnrCount} 个 ANR，可能存在系统级压力，建议结合 CPU/内存 trace 交叉查看`;
  }

  return {
    packageName: ctx.packageName,
    dataStatus,
    dataSource,
    totalAnrCount,
    affectedProcessCount,
    anrSpanSeconds,
    firstAnrTsNs: Number(detection.first_anr_ts ?? highlights[0]?.tsNs ?? 0),
    typeBreakdown,
    highlights,
    note,
  };
}
