/** 对齐 SmartPerfetto anr_analysis.skill.yaml 的 L1 摘要 SQL。 */

export function buildAnrDetectionSql(packageGlob: string, pkgLiteral: string): string {
  return `
INCLUDE PERFETTO MODULE android.anrs;

SELECT
  COUNT(*) AS total_anr_count,
  COUNT(DISTINCT process_name) AS affected_process_count,
  MIN(ts) AS first_anr_ts,
  MAX(ts) AS last_anr_ts,
  ROUND((MAX(ts) - MIN(ts)) / 1e9, 2) AS anr_span_seconds
FROM android_anrs
WHERE (
  process_name GLOB '${packageGlob}'
  OR process_name GLOB '${packageGlob}:*'
  OR '${pkgLiteral}' = ''
);
`.trim();
}

export function buildAnrTypeBreakdownSql(packageGlob: string, pkgLiteral: string): string {
  return `
INCLUDE PERFETTO MODULE android.anrs;

SELECT
  anr_type,
  COUNT(*) AS event_count
FROM android_anrs
WHERE (
  process_name GLOB '${packageGlob}'
  OR process_name GLOB '${packageGlob}:*'
  OR '${pkgLiteral}' = ''
)
GROUP BY anr_type
ORDER BY event_count DESC
LIMIT 10;
`.trim();
}

export function buildAnrEventListSql(packageGlob: string, pkgLiteral: string): string {
  return `
INCLUDE PERFETTO MODULE android.anrs;

SELECT
  ts,
  process_name,
  anr_type,
  subject,
  pid
FROM android_anrs
WHERE (
  process_name GLOB '${packageGlob}'
  OR process_name GLOB '${packageGlob}:*'
  OR '${pkgLiteral}' = ''
)
ORDER BY ts
LIMIT 20;
`.trim();
}
