/** 对齐 SmartPerfetto memory_analysis.skill.yaml 的 GC 视图与概览 SQL。 */

export function buildInitGcEventsViewSql(packageGlob: string, pkgLiteral: string): string {
  return `
DROP VIEW IF EXISTS ember_gc_events;

CREATE VIEW ember_gc_events AS
SELECT
  s.ts,
  s.dur,
  s.name AS gc_name,
  t.name AS thread_name,
  t.tid,
  p.pid,
  p.name AS process_name,
  p.upid,
  CASE WHEN t.tid = p.pid THEN 1 ELSE 0 END AS is_main_thread,
  CASE
    WHEN s.name GLOB '*ConcurrentCopying*' THEN 'ConcurrentCopying'
    WHEN s.name GLOB '*MarkSweep*' THEN 'MarkSweep'
    WHEN s.name GLOB '*Explicit*' THEN 'Explicit'
    WHEN s.name GLOB '*young*' OR s.name GLOB '*Young*' THEN 'Young'
    WHEN s.name GLOB '*full*' OR s.name GLOB '*Full*' THEN 'Full'
    ELSE 'Other'
  END AS gc_type
FROM slice s
JOIN thread_track tt ON s.track_id = tt.id
JOIN thread t ON tt.utid = t.utid
JOIN process p ON t.upid = p.upid
WHERE (p.name GLOB '${packageGlob}' OR '${pkgLiteral}' = '')
  AND (
    s.name GLOB '*GC*'
    OR s.name GLOB '*gc*'
    OR s.name GLOB '*ConcurrentCopying*'
  );
`.trim();
}

export function buildGcOverviewSql(): string {
  return `
SELECT
  COUNT(*) AS total_gc_count,
  SUM(dur) / 1e6 AS total_gc_time_ms,
  ROUND(AVG(dur) / 1e6, 2) AS avg_gc_time_ms,
  ROUND(MAX(dur) / 1e6, 2) AS max_gc_time_ms,
  SUM(CASE WHEN is_main_thread = 1 THEN 1 ELSE 0 END) AS main_thread_gc_count,
  SUM(CASE WHEN is_main_thread = 1 THEN dur ELSE 0 END) / 1e6 AS main_thread_gc_time_ms
FROM ember_gc_events;
`.trim();
}

export function buildGcTypeBreakdownSql(): string {
  return `
SELECT
  gc_type,
  COUNT(*) AS count,
  ROUND(SUM(dur) / 1e6, 2) AS total_dur_ms
FROM ember_gc_events
GROUP BY gc_type
ORDER BY total_dur_ms DESC
LIMIT 8;
`.trim();
}
