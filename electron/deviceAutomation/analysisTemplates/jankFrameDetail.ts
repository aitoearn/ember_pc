import { classifyJankRootCause } from "./jankRootCause";
import { inferJankFrameRootCause } from "./jankFrameRootCauseHeuristic";
import { buildJankFramesViewSql } from "./sql/jankFramesSql";
import type { AnalysisTemplateContext } from "./types";
import { escapeSqlLiteral, packageGlob, runSqlSafe } from "./sqlUtils";

const BASE_FRAME_SELECT = `
SELECT frame_id, start_ts, end_ts, frame_ms, jank_type, process_name
FROM ember_scrolling_jank_frames
WHERE (process_name GLOB '{pkgGlob}' OR '{pkg}' = '')
`.trim();

function buildFrameSelectSql(
  pkg: string,
  pkgGlob: string,
  ctx: AnalysisTemplateContext,
): string {
  const target = ctx.frameTarget;
  if (target?.frameId != null && Number.isFinite(Number(target.frameId))) {
    return `${BASE_FRAME_SELECT.replace("{pkgGlob}", pkgGlob).replace("{pkg}", pkg)}
  AND frame_id = ${Number(target.frameId)}
LIMIT 1;`;
  }
  if (
    target?.startTsNs != null &&
    Number.isFinite(target.startTsNs) &&
    target.startTsNs > 0
  ) {
    return `${BASE_FRAME_SELECT.replace("{pkgGlob}", pkgGlob).replace("{pkg}", pkg)}
  AND start_ts = ${Math.round(target.startTsNs)}
LIMIT 1;`;
  }
  if (ctx.timeRange) {
    return `${BASE_FRAME_SELECT.replace("{pkgGlob}", pkgGlob).replace("{pkg}", pkg)}
  AND start_ts >= ${Math.round(ctx.timeRange.startNs)}
  AND end_ts <= ${Math.round(ctx.timeRange.endNs)}
ORDER BY frame_ms DESC, start_ts ASC
LIMIT 1;`;
  }
  return `${BASE_FRAME_SELECT.replace("{pkgGlob}", pkgGlob).replace("{pkg}", pkg)}
ORDER BY frame_ms DESC, start_ts ASC
LIMIT 1;`;
}

export async function buildJankFrameDetailResult(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const pkg = escapeSqlLiteral(ctx.packageName);
  const pkgGlob = packageGlob(ctx.packageName);

  await runSqlSafe(ctx.runSql, buildJankFramesViewSql());

  const frameSql = buildFrameSelectSql(pkg, pkgGlob, ctx);
  const frameRows = await runSqlSafe(ctx.runSql, frameSql);
  const selected = frameRows[0];

  if (!selected || Number(selected.frame_ms ?? 0) <= 0) {
    const targetHint = ctx.frameTarget?.frameId
      ? `frame_id=${ctx.frameTarget.frameId}`
      : ctx.frameTarget?.startTsNs
        ? `start_ts=${ctx.frameTarget.startTsNs}`
        : "最严重卡顿帧";
    return {
      packageName: ctx.packageName,
      dataStatus: "empty",
      note: `未找到 ${ctx.packageName} 的目标帧（${targetHint}）；请确认 trace 含 Frame Timeline 且包名正确`,
    };
  }

  const startTs = Number(selected.start_ts ?? 0);
  const endTs = Number(selected.end_ts ?? startTs);
  const frameMs = Number(selected.frame_ms ?? 0);
  const jankType = selected.jank_type != null ? String(selected.jank_type) : null;

  const mainSlicesSql = `
WITH main_thread AS (
  SELECT t.utid
  FROM thread t
  JOIN process p ON t.upid = p.upid
  WHERE (p.name GLOB '${pkgGlob}' OR '${pkg}' = '')
    AND (t.tid = p.pid OR t.name GLOB '[0-9]*.ui')
)
SELECT
  s.name,
  ROUND(SUM(s.dur) / 1e6, 2) AS dur_ms,
  COUNT(*) AS count,
  ROUND(MAX(s.dur) / 1e6, 2) AS max_ms
FROM slice s
JOIN thread_track tt ON s.track_id = tt.id
WHERE tt.utid IN (SELECT utid FROM main_thread)
  AND s.ts >= ${startTs}
  AND s.ts < ${endTs}
  AND s.dur >= 1000000
  AND s.name NOT GLOB '*resynced*'
GROUP BY s.name
HAVING dur_ms > 1
ORDER BY dur_ms DESC
LIMIT 10;
`.trim();

  const sliceRows = await runSqlSafe(ctx.runSql, mainSlicesSql);
  const mainThreadSlices = sliceRows.map((row) => ({
    name: String(row.name ?? "unknown"),
    durMs: Number(row.dur_ms ?? 0),
    count: Number(row.count ?? 0),
    maxMs: Number(row.max_ms ?? 0),
  }));

  const rootCause = inferJankFrameRootCause({
    slices: mainThreadSlices,
    jankType,
    frameMs,
  });
  const jankClassification = classifyJankRootCause(jankType, frameMs);

  return {
    packageName: ctx.packageName,
    dataStatus: "ok",
    selectionMode: ctx.frameTarget?.frameId
      ? "frame_id"
      : ctx.frameTarget?.startTsNs
        ? "start_ts"
        : ctx.timeRange
          ? "time_range"
          : "worst_frame",
    frame: {
      frameId: selected.frame_id ?? null,
      frameMs,
      jankType,
      startTsNs: startTs,
      endTsNs: endTs,
      processName: selected.process_name ?? null,
    },
    jankClassification: {
      code: jankClassification.code,
      summary: jankClassification.summary,
    },
    rootCause,
    mainThreadSlices,
    note:
      mainThreadSlices.length === 0
        ? "帧窗口内未找到 >1ms 主线程 slice，可能缺少 gfx/view trace 或帧边界不完整"
        : undefined,
  };
}
