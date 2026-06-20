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

function isJankRow(
  row: Record<string, string | number | null>,
  jankThresholdMs: number,
): boolean {
  const jankType = row.jank_type;
  if (jankType != null && String(jankType) !== "" && String(jankType) !== "None") {
    return true;
  }
  const frameMs = Number(row.frame_ms);
  return Number.isFinite(frameMs) && frameMs > jankThresholdMs;
}

export async function buildJankSummaryResult(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const pkg = escapeSqlLiteral(ctx.packageName);
  const pkgGlob = packageGlob(ctx.packageName);
  const jankThresholdMs = 16.7;
  const severeThresholdMs = 32;

  const timelineCheckSql = `
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name='actual_frame_timeline_slice'
) THEN 1 ELSE 0 END AS has_frame_timeline;
`.trim();

  const checkRows = await runSqlSafe(ctx.runSql, timelineCheckSql);
  const hasFrameTimeline = Number(checkRows[0]?.has_frame_timeline) === 1;

  let dataSource = "none";
  let rows: Record<string, string | number | null>[] = [];

  if (hasFrameTimeline) {
    const frameTimelineSql = `
SELECT a.dur/1e6 AS frame_ms, a.ts, a.jank_type, p.name AS process_name
FROM actual_frame_timeline_slice a
LEFT JOIN process p ON a.upid = p.upid
WHERE (p.name GLOB '${pkgGlob}' OR '${pkg}' = '')
  AND COALESCE(a.display_frame_token, a.surface_frame_token) IS NOT NULL
ORDER BY a.ts
LIMIT 5000;
`.trim();
    rows = await runSqlSafe(ctx.runSql, frameTimelineSql);
    if (rows.length > 0) {
      dataSource = "actual_frame_timeline_slice";
    }
  }

  if (rows.length === 0) {
    const fallbackSql = `
SELECT dur/1e6 AS frame_ms, ts, NULL AS jank_type, name AS process_name
FROM slice
WHERE (name GLOB '*DrawFrame*' OR name GLOB '*Choreographer*')
  AND (name GLOB '*${pkg}*' OR '${pkg}' = '')
ORDER BY ts
LIMIT 5000;
`.trim();
    rows = await runSqlSafe(ctx.runSql, fallbackSql);
    if (rows.length > 0) {
      dataSource = "slice_drawframe_fallback";
    }
  }

  const frameMsValues = rows
    .map((row) => Number(row.frame_ms))
    .filter((value) => Number.isFinite(value) && value > 0);

  const jankRows = rows.filter((row) => isJankRow(row, jankThresholdMs));
  const severeJankRows = jankRows.filter((row) => {
    const frameMs = Number(row.frame_ms);
    return Number.isFinite(frameMs) && frameMs > severeThresholdMs;
  });

  const highlights = jankRows
    .slice(0, 5)
    .map((row) => {
      const frameMsValue = Number(row.frame_ms);
      return {
        tsNs: Number(row.ts ?? 0),
        frameMs: frameMsValue,
        reason:
          frameMsValue > severeThresholdMs ? "severe_jank" : "jank",
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
      note =
        `未在 Frame Timeline 中找到包 ${ctx.packageName} 的帧数据；请确认录制期间有滑动/动画，且包名正确`;
    }
  }

  return {
    packageName: ctx.packageName,
    dataStatus,
    dataSource,
    traceDurationMs:
      frameMsValues.length > 0
        ? Math.round(frameMsValues.length * jankThresholdMs)
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
