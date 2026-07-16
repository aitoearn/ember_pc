import { buildJankFramesViewSql } from "./sql/jankFramesSql";
import { classifyJankRootCause } from "./jankRootCause";
import type { AnalysisTemplateContext } from "./types";
import { escapeSqlLiteral, packageGlob, runSqlSafe } from "./sqlUtils";

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * ratio) - 1),
  );
  return sorted[index] ?? 0;
}

export async function buildJankSummaryResult(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const pkg = escapeSqlLiteral(ctx.packageName);
  const pkgGlob = packageGlob(ctx.packageName);
  const severeThresholdMs = 32;

  await runSqlSafe(ctx.runSql, buildJankFramesViewSql());

  const timelineCheckSql = `
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name='actual_frame_timeline_slice'
) THEN 1 ELSE 0 END AS has_frame_timeline;
`.trim();

  const checkRows = await runSqlSafe(ctx.runSql, timelineCheckSql);
  const hasFrameTimeline = Number(checkRows[0]?.has_frame_timeline) === 1;

  let dataSource = "none";
  let allFrameRows: Record<string, string | number | null>[] = [];
  let jankRows: Record<string, string | number | null>[] = [];

  if (hasFrameTimeline) {
    const allFramesSql = `
WITH actual_dedup AS (
  SELECT
    upid,
    name AS frame_id_str,
    MIN(ts) AS ts,
    MAX(dur) AS dur_ns,
    MIN(jank_type) AS jank_type
  FROM actual_frame_timeline_slice
  WHERE COALESCE(display_frame_token, surface_frame_token) IS NOT NULL
  GROUP BY upid, name
)
SELECT
  a.dur_ns / 1e6 AS frame_ms,
  a.ts,
  a.jank_type,
  p.name AS process_name
FROM actual_dedup a
LEFT JOIN process p ON a.upid = p.upid
WHERE (p.name GLOB '${pkgGlob}' OR '${pkg}' = '')
ORDER BY a.ts
LIMIT 5000;
`.trim();
    allFrameRows = await runSqlSafe(ctx.runSql, allFramesSql);

    const jankSql = `
SELECT frame_ms, start_ts AS ts, jank_type, process_name, frame_id
FROM ember_scrolling_jank_frames
WHERE (process_name GLOB '${pkgGlob}' OR '${pkg}' = '')
ORDER BY start_ts
LIMIT 5000;
`.trim();
    jankRows = await runSqlSafe(ctx.runSql, jankSql);

    if (allFrameRows.length > 0 || jankRows.length > 0) {
      dataSource = "ember_scrolling_jank_frames";
    }
  }

  if (allFrameRows.length === 0 && jankRows.length === 0) {
    const fallbackSql = `
SELECT dur/1e6 AS frame_ms, ts, NULL AS jank_type, name AS process_name
FROM slice
WHERE (name GLOB '*DrawFrame*' OR name GLOB '*Choreographer*')
  AND (name GLOB '*${pkg}*' OR '${pkg}' = '')
ORDER BY ts
LIMIT 5000;
`.trim();
    allFrameRows = await runSqlSafe(ctx.runSql, fallbackSql);
    jankRows = allFrameRows.filter((row) => Number(row.frame_ms) > 16.7);
    if (allFrameRows.length > 0) {
      dataSource = "slice_drawframe_fallback";
    }
  }

  const frameMsValues = allFrameRows
    .map((row) => Number(row.frame_ms))
    .filter((value) => Number.isFinite(value) && value > 0);

  const severeJankRows = jankRows.filter((row) => {
    const frameMs = Number(row.frame_ms);
    return Number.isFinite(frameMs) && frameMs > severeThresholdMs;
  });

  const highlights = jankRows.slice(0, 8).map((row) => {
    const frameMsValue = Number(row.frame_ms);
    const rootCause = classifyJankRootCause(
      row.jank_type != null ? String(row.jank_type) : null,
      frameMsValue,
    );
    return {
      tsNs: Number(row.ts ?? 0),
      frameMs: frameMsValue,
      frameId: row.frame_id ?? null,
      reason: rootCause.code,
      rootCauseSummary: rootCause.summary,
      jankType: row.jank_type ?? null,
    };
  });

  const dataStatus = frameMsValues.length > 0 ? "ok" : "empty";
  let note: string | undefined;
  if (dataStatus === "empty") {
    if (!hasFrameTimeline) {
      note =
        "trace 中无 Frame Timeline 表，请使用 scroll_jank 预设并在录制期间滑动界面";
    } else {
      note = `未在 Frame Timeline 中找到包 ${ctx.packageName} 的帧数据；请确认录制期间有滑动/动画，且包名正确`;
    }
  }

  return {
    packageName: ctx.packageName,
    dataStatus,
    dataSource,
    traceDurationMs:
      frameMsValues.length > 0
        ? Math.round(
            Number(allFrameRows.at(-1)?.ts ?? 0) / 1e6 -
              Number(allFrameRows[0]?.ts ?? 0) / 1e6,
          )
        : 0,
    totalFrames: frameMsValues.length,
    jankFrames: jankRows.length,
    severeJankFrames: severeJankRows.length,
    p50FrameMs: Number(percentile(frameMsValues, 0.5).toFixed(2)),
    p90FrameMs: Number(percentile(frameMsValues, 0.9).toFixed(2)),
    p99FrameMs: Number(percentile(frameMsValues, 0.99).toFixed(2)),
    missedVsyncCount: jankRows.length,
    highlights,
    note,
  };
}
