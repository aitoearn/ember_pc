/** 对齐 SmartPerfetto backend/sql/smartperfetto/scrolling/jank_frames.sql */

export function buildJankFramesViewSql(): string {
  return `
INCLUDE PERFETTO MODULE android.frames.timeline;

DROP VIEW IF EXISTS ember_scrolling_jank_frames;

CREATE PERFETTO VIEW ember_scrolling_jank_frames AS
WITH expected_per_frame AS (
  SELECT upid, name, MIN(dur) AS expected_dur_ns
  FROM expected_frame_timeline_slice
  GROUP BY upid, name
),
actual_dedup AS (
  SELECT
    upid,
    name AS frame_id_str,
    MIN(ts) AS start_ts,
    MAX(dur) AS dur_ns,
    MIN(layer_name) AS layer_name,
    GROUP_CONCAT(DISTINCT jank_type) AS jank_type
  FROM actual_frame_timeline_slice
  WHERE jank_type IS NOT NULL AND jank_type != 'None'
  GROUP BY upid, name
)
SELECT
  CAST(actual.frame_id_str AS INTEGER) AS frame_id,
  actual.start_ts,
  actual.dur_ns,
  actual.start_ts + actual.dur_ns AS end_ts,
  actual.dur_ns / 1e6 AS frame_ms,
  actual.jank_type,
  process.name AS process_name,
  actual.layer_name,
  expected.expected_dur_ns,
  1 AS is_jank
FROM actual_dedup AS actual
LEFT JOIN process USING (upid)
LEFT JOIN expected_per_frame AS expected
  ON expected.upid = actual.upid AND expected.name = actual.frame_id_str;
`.trim();
}
