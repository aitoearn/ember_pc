/**
 * CPU 拓扑物化表 + 四象限聚合 SQL。
 * 逻辑对齐 SmartPerfetto cpu_topology_view.skill.yaml 与 thread_states_quadrant 片段。
 */

export const CREATE_CPU_TOPOLOGY_TABLE_SQL = `
DROP TABLE IF EXISTS _cpu_topology;

CREATE PERFETTO TABLE _cpu_topology AS
WITH
observed_sched_cpus AS (
  SELECT cpu AS cpu_id FROM sched_slice WHERE cpu IS NOT NULL
  UNION
  SELECT cpu AS cpu_id
  FROM thread_state
  WHERE cpu IS NOT NULL AND state = 'Running'
),
observed_counter_cpus AS (
  SELECT t.cpu AS cpu_id
  FROM cpu_counter_track t
  JOIN counter c ON c.track_id = t.id
  WHERE t.name = 'cpufreq'
    AND t.cpu IS NOT NULL
    AND c.value > 0
  GROUP BY t.cpu
),
cpu_universe AS (
  SELECT cpu_id, 'sched_observed' AS universe_source
  FROM observed_sched_cpus
  UNION
  SELECT cpu_id, 'cpufreq_observed_fallback' AS universe_source
  FROM observed_counter_cpus
  WHERE NOT EXISTS (SELECT 1 FROM observed_sched_cpus)
  UNION
  SELECT id AS cpu_id, 'cpu_table_fallback_no_observed' AS universe_source
  FROM cpu
  WHERE NOT EXISTS (SELECT 1 FROM observed_sched_cpus)
    AND NOT EXISTS (SELECT 1 FROM observed_counter_cpus)
),
cpu_capacity AS (
  SELECT
    cu.cpu_id,
    cu.universe_source,
    COALESCE(c.capacity, 0) AS capacity
  FROM cpu_universe cu
  LEFT JOIN cpu c ON c.id = cu.cpu_id
),
cpu_max_freq AS (
  SELECT t.cpu AS cpu_id, MAX(c.value) AS max_freq
  FROM counter c
  JOIN cpu_counter_track t ON c.track_id = t.id
  WHERE t.name = 'cpufreq'
    AND t.cpu IN (SELECT cpu_id FROM cpu_universe)
  GROUP BY t.cpu
),
selected_scale_source AS (
  SELECT
    CASE
      WHEN (SELECT COUNT(*) FROM cpu_capacity) > 0
        AND (SELECT COUNT(*) FROM cpu_capacity WHERE universe_source = 'cpu_table_fallback_no_observed') = 0
        AND (SELECT COUNT(*) FROM cpu_capacity WHERE capacity > 0) = (SELECT COUNT(*) FROM cpu_capacity)
        THEN 'capacity_scale'
      WHEN (SELECT COUNT(*) FROM cpu_capacity) > 0
        AND (SELECT COUNT(*) FROM cpu_capacity WHERE universe_source = 'cpu_table_fallback_no_observed') = 0
        AND (SELECT COUNT(*) FROM cpu_max_freq WHERE max_freq > 0) = (SELECT COUNT(*) FROM cpu_capacity)
        THEN 'freq_rank'
      ELSE 'observed_no_scale'
    END AS source
),
raw_cpu_scale AS (
  SELECT
    cc.cpu_id,
    cc.universe_source,
    cc.capacity,
    cf.max_freq,
    CASE
      WHEN s.source = 'capacity_scale' THEN cc.capacity
      WHEN s.source = 'freq_rank' THEN cf.max_freq
      ELSE NULL
    END AS scale_value,
    s.source AS topology_source
  FROM cpu_capacity cc
  LEFT JOIN cpu_max_freq cf ON cc.cpu_id = cf.cpu_id
  CROSS JOIN selected_scale_source s
),
scale_bounds AS (
  SELECT MAX(scale_value) AS max_scale
  FROM raw_cpu_scale
  WHERE scale_value > 0
),
cpu_scale AS (
  SELECT
    rs.*,
    CASE
      WHEN rs.scale_value > 0 AND (SELECT max_scale FROM scale_bounds) > 0
        THEN CAST(ROUND(rs.scale_value * 20.0 / (SELECT max_scale FROM scale_bounds)) AS INTEGER)
      ELSE NULL
    END AS scale_bucket
  FROM raw_cpu_scale rs
),
distinct_scales AS (
  SELECT
    scale_bucket,
    avg_scale_value,
    ROW_NUMBER() OVER (ORDER BY scale_bucket ASC) AS cluster_rank,
    COUNT(*) OVER () AS cluster_count
  FROM (
    SELECT scale_bucket, AVG(scale_value) AS avg_scale_value
    FROM cpu_scale
    WHERE scale_bucket IS NOT NULL AND scale_bucket > 0
    GROUP BY scale_bucket
  )
),
scale_clusters AS (
  SELECT
    ds.scale_bucket,
    ds.avg_scale_value,
    ds.cluster_rank,
    ds.cluster_count,
    COUNT(cs.cpu_id) AS cores_in_cluster
  FROM distinct_scales ds
  JOIN cpu_scale cs ON cs.scale_bucket = ds.scale_bucket
  GROUP BY ds.scale_bucket, ds.avg_scale_value, ds.cluster_rank, ds.cluster_count
)
SELECT
  cs.cpu_id,
  cs.universe_source,
  cs.capacity,
  cs.max_freq,
  cs.scale_value,
  cs.scale_bucket,
  CASE
    WHEN cs.scale_bucket IS NULL OR cs.scale_bucket <= 0 THEN 'unknown'
    WHEN sc.cluster_count <= 1 AND (SELECT COUNT(*) FROM cpu_scale) <= 4 THEN 'little'
    WHEN sc.cluster_count <= 1 THEN 'unknown'
    WHEN sc.cluster_count = 2 AND sc.cluster_rank = sc.cluster_count THEN 'big'
    WHEN sc.cluster_rank = 1 THEN 'little'
    WHEN sc.cluster_rank = sc.cluster_count AND sc.cores_in_cluster = 1 THEN 'prime'
    WHEN sc.cluster_rank = sc.cluster_count THEN 'big'
    WHEN sc.cluster_rank = sc.cluster_count - 1
      AND (SELECT cores_in_cluster FROM scale_clusters WHERE cluster_rank = sc.cluster_count) = 1 THEN 'big'
    ELSE 'medium'
  END AS core_type,
  CASE
    WHEN cs.scale_bucket IS NULL OR cs.scale_bucket <= 0 THEN cs.topology_source
    WHEN sc.cluster_count <= 1 AND (SELECT COUNT(*) FROM cpu_scale) <= 4 THEN cs.topology_source || '_uniform_four_little'
    WHEN sc.cluster_count <= 1 THEN cs.topology_source || '_uniform'
    ELSE cs.topology_source
  END AS topology_source,
  sc.cluster_rank,
  sc.cluster_count,
  sc.cores_in_cluster
FROM cpu_scale cs
LEFT JOIN scale_clusters sc ON cs.scale_bucket = sc.scale_bucket;
`.trim();

export function buildCpuQuadrantAggregationSql(packageGlob: string, pkgLiteral: string): string {
  return `
WITH trace_bounds AS (
  SELECT MIN(ts) AS start_ts, MAX(ts) AS end_ts FROM slice
),
target_threads AS (
  SELECT
    t.utid,
    t.tid,
    t.name AS thread_name,
    p.pid,
    p.name AS process_name,
    CASE
      WHEN t.tid = p.pid THEN 'MainThread'
      WHEN t.name = 'RenderThread' THEN 'RenderThread'
      WHEN t.name GLOB '[0-9]*.raster' THEN 'RenderThread'
      WHEN t.name GLOB '[0-9]*.ui' THEN 'MainThread'
      ELSE 'Other'
    END AS thread_type,
    (SELECT start_ts FROM trace_bounds) AS thread_start_ts,
    (SELECT end_ts FROM trace_bounds) AS thread_end_ts
  FROM thread t
  JOIN process p ON t.upid = p.upid
  WHERE (p.name GLOB '${packageGlob}' OR '${pkgLiteral}' = '')
    AND (
      t.tid = p.pid
      OR t.name = 'RenderThread'
      OR t.name GLOB '[0-9]*.raster'
      OR t.name GLOB '[0-9]*.ui'
    )
),
thread_states AS (
  SELECT
    tt.thread_type,
    CASE
      WHEN ts.state = 'Running' AND COALESCE(ct.core_type, 'little') IN ('prime', 'big') THEN 'Q1'
      WHEN ts.state = 'Running' AND COALESCE(ct.core_type, 'little') IN ('medium', 'little') THEN 'Q2'
      WHEN ts.state IN ('R', 'R+') THEN 'Q3'
      WHEN ts.state IN ('D', 'DK') THEN 'Q4a'
      WHEN ts.state IN ('S', 'I') THEN 'Q4b'
      ELSE 'Other'
    END AS quadrant,
    SUM(ts.dur) AS dur_ns
  FROM thread_state ts
  JOIN target_threads tt ON ts.utid = tt.utid
  LEFT JOIN _cpu_topology ct ON ts.cpu = ct.cpu_id
  WHERE ts.ts >= tt.thread_start_ts AND ts.ts < tt.thread_end_ts
  GROUP BY tt.thread_type, quadrant
),
quadrant_totals AS (
  SELECT quadrant, SUM(dur_ns) AS dur_ns
  FROM thread_states
  WHERE quadrant != 'Other'
  GROUP BY quadrant
)
SELECT quadrant, dur_ns
FROM quadrant_totals
ORDER BY quadrant;
`.trim();
}

export function buildStartupMainThreadSlicesSql(packageGlob: string): string {
  return `
INCLUDE PERFETTO MODULE android.startup.startups;

WITH startup_window AS (
  SELECT MIN(s.ts) AS start_ts, MAX(s.ts + s.dur) AS end_ts
  FROM android_startups s
  WHERE s.package GLOB '${packageGlob}'
)
SELECT
  sl.name AS slice_name,
  ROUND(SUM(sl.dur) / 1e6, 2) AS dur_ms
FROM slice sl
JOIN thread t ON sl.utid = t.utid
JOIN process p ON t.upid = p.upid
CROSS JOIN startup_window sw
WHERE p.name GLOB '${packageGlob}'
  AND t.tid = p.pid
  AND sl.dur > 0
  AND sl.ts >= sw.start_ts
  AND sl.ts < sw.end_ts
GROUP BY sl.name
ORDER BY dur_ms DESC
LIMIT 10;
`.trim();
}
