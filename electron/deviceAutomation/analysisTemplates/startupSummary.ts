import type { AnalysisTemplateContext } from "./types";
import { escapeSqlLiteral, packageGlob, runSqlSafe } from "./sqlUtils";

type StartupRow = Record<string, string | number | null>;

export async function buildStartupSummaryResult(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const pkg = escapeSqlLiteral(ctx.packageName);
  const pkgGlob = packageGlob(ctx.packageName);

  const startupTableCheckSql = `
INCLUDE PERFETTO MODULE android.startup.startups;
INCLUDE PERFETTO MODULE android.startup.time_to_display;
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name='android_startups'
) THEN 1 ELSE 0 END AS has_android_startups;
`.trim();

  const checkRows = await runSqlSafe(ctx.runSql, startupTableCheckSql);
  const hasAndroidStartups = Number(checkRows[0]?.has_android_startups) === 1;

  let dataSource = "none";
  let startupRows: StartupRow[] = [];

  if (hasAndroidStartups) {
    const startupSql = `
INCLUDE PERFETTO MODULE android.startup.startups;
INCLUDE PERFETTO MODULE android.startup.time_to_display;
SELECT
  s.startup_id,
  s.package,
  s.startup_type,
  s.dur/1e6 AS dur_ms,
  ttd.time_to_initial_display/1e6 AS ttid_ms,
  ttd.time_to_full_display/1e6 AS ttfd_ms
FROM android_startups s
LEFT JOIN android_startup_time_to_display ttd USING (startup_id)
WHERE s.package GLOB '${pkgGlob}' OR '${pkg}' = ''
ORDER BY s.ts
LIMIT 20;
`.trim();
    startupRows = await runSqlSafe(ctx.runSql, startupSql);
    if (startupRows.length > 0) {
      dataSource = "android_startups";
    }
  }

  let breakdown: { phase: string; durMs: number }[] = [];
  if (startupRows.length > 0) {
    breakdown = startupRows.slice(0, 8).map((row) => ({
      phase: `${String(row.startup_type ?? "startup")} #${row.startup_id ?? ""}`,
      durMs: Math.round(Number(row.dur_ms ?? 0)),
    }));
  } else {
    const fallbackSql = `
SELECT name, dur/1e6 AS dur_ms
FROM slice
WHERE (name GLOB '*startup*' OR name GLOB '*Start*' OR name GLOB '*Launch*')
  AND dur > 0
ORDER BY ts
LIMIT 50;
`.trim();
    const sliceRows = await runSqlSafe(ctx.runSql, fallbackSql);
    if (sliceRows.length > 0) {
      dataSource = "slice_fallback";
      breakdown = sliceRows.slice(0, 8).map((row) => ({
        phase: String(row.name ?? "unknown"),
        durMs: Math.round(Number(row.dur_ms ?? 0)),
      }));
    }
  }

  const primaryStartup = startupRows[0];
  const ttfdMs = Number(primaryStartup?.ttfd_ms);
  const ttidMs = Number(primaryStartup?.ttid_ms);
  const durMs = Number(primaryStartup?.dur_ms);

  let timeToDisplayMs = 0;
  if (Number.isFinite(ttfdMs) && ttfdMs > 0) {
    timeToDisplayMs = Math.round(ttfdMs);
  } else if (Number.isFinite(ttidMs) && ttidMs > 0) {
    timeToDisplayMs = Math.round(ttidMs);
  } else if (Number.isFinite(durMs) && durMs > 0) {
    timeToDisplayMs = Math.round(durMs);
  } else if (breakdown.length > 0 && dataSource === "slice_fallback") {
    timeToDisplayMs = breakdown.reduce((sum, item) => sum + item.durMs, 0);
  }

  const coldStartCount =
    startupRows.length > 0
      ? startupRows.filter((row) => String(row.startup_type) === "cold").length
      : breakdown.length > 0
        ? 1
        : 0;

  const dataStatus =
    startupRows.length > 0 || (breakdown.length > 0 && timeToDisplayMs > 0)
      ? "ok"
      : "empty";

  let note: string | undefined;
  if (dataStatus === "empty") {
    note =
      `trace 中未检测到 ${ctx.packageName} 的启动事件；请使用 cold_start 预设，点录制后立刻冷启动应用（先杀进程再打开）`;
  }

  return {
    packageName: ctx.packageName,
    dataStatus,
    dataSource,
    coldStartCount,
    startupCount: startupRows.length,
    timeToDisplayMs,
    ttidMs: Number.isFinite(ttidMs) ? Math.round(ttidMs) : null,
    ttfdMs: Number.isFinite(ttfdMs) ? Math.round(ttfdMs) : null,
    breakdown,
    note,
  };
}
