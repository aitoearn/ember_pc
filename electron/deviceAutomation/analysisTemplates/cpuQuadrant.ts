import {
  buildCpuQuadrantAggregationSql,
  CREATE_CPU_TOPOLOGY_TABLE_SQL,
} from "./sql/cpuAnalysisSql";
import type { AnalysisTemplateContext } from "./types";
import { escapeSqlLiteral, packageGlob, runSqlSafe } from "./sqlUtils";

const QUADRANT_LABELS: Record<string, keyof QuadrantBreakdown> = {
  Q1: "runningBigCore",
  Q2: "runningLittleCore",
  Q3: "runnable",
  Q4a: "uninterruptible",
  Q4b: "sleeping",
};

type QuadrantBreakdown = {
  runningBigCore: number;
  runningLittleCore: number;
  runnable: number;
  uninterruptible: number;
  sleeping: number;
};

function emptyQuadrants(): QuadrantBreakdown {
  return {
    runningBigCore: 0,
    runningLittleCore: 0,
    runnable: 0,
    uninterruptible: 0,
    sleeping: 0,
  };
}

export async function buildCpuQuadrantResult(
  ctx: AnalysisTemplateContext,
): Promise<Record<string, unknown>> {
  const pkg = escapeSqlLiteral(ctx.packageName);
  const pkgGlob = packageGlob(ctx.packageName);

  await runSqlSafe(ctx.runSql, CREATE_CPU_TOPOLOGY_TABLE_SQL);

  const threadSql = `
SELECT thread.name AS thread_name, SUM(slice.dur)/1e9 AS cpu_s
FROM slice
JOIN thread USING(utid)
JOIN process p ON thread.upid = p.upid
WHERE slice.dur > 0
  AND (p.name GLOB '${pkgGlob}' OR '${pkg}' = '')
GROUP BY thread.name
ORDER BY cpu_s DESC
LIMIT 20;
`.trim();

  const quadrantSql = buildCpuQuadrantAggregationSql(pkgGlob, pkg);

  const [threadRows, quadrantRows] = await Promise.all([
    runSqlSafe(ctx.runSql, threadSql),
    runSqlSafe(ctx.runSql, quadrantSql),
  ]);

  const totalCpu = threadRows.reduce(
    (sum, row) => sum + Number(row.cpu_s ?? 0),
    0,
  );

  const topThreads = threadRows.slice(0, 5).map((row) => {
    const cpuSeconds = Number(row.cpu_s ?? 0);
    return {
      name: String(row.thread_name ?? "unknown"),
      cpuPercent:
        totalCpu > 0 ? Number(((cpuSeconds / totalCpu) * 100).toFixed(1)) : 0,
    };
  });

  const targetThread = topThreads.find((item) =>
    item.name.toLowerCase().includes(ctx.packageName.split(".").pop() ?? ""),
  );

  const quadrantTotals = emptyQuadrants();
  let totalDurNs = 0;
  for (const row of quadrantRows) {
    const quadrant = String(row.quadrant ?? "");
    const label = QUADRANT_LABELS[quadrant];
    const durNs = Number(row.dur_ns ?? 0);
    if (!label || !Number.isFinite(durNs) || durNs <= 0) {
      continue;
    }
    quadrantTotals[label] += durNs;
    totalDurNs += durNs;
  }

  const quadrants =
    totalDurNs > 0
      ? {
          runningBigCore: Number(
            (quadrantTotals.runningBigCore / totalDurNs).toFixed(3),
          ),
          runningLittleCore: Number(
            (quadrantTotals.runningLittleCore / totalDurNs).toFixed(3),
          ),
          runnable: Number((quadrantTotals.runnable / totalDurNs).toFixed(3)),
          uninterruptible: Number(
            (quadrantTotals.uninterruptible / totalDurNs).toFixed(3),
          ),
          sleeping: Number((quadrantTotals.sleeping / totalDurNs).toFixed(3)),
        }
      : emptyQuadrants();

  const hasQuadrantData = totalDurNs > 0;

  return {
    packageName: ctx.packageName,
    quadrants,
    quadrantBreakdownMs: hasQuadrantData
      ? {
          runningBigCore: Math.round(quadrantTotals.runningBigCore / 1e6),
          runningLittleCore: Math.round(quadrantTotals.runningLittleCore / 1e6),
          runnable: Math.round(quadrantTotals.runnable / 1e6),
          uninterruptible: Math.round(quadrantTotals.uninterruptible / 1e6),
          sleeping: Math.round(quadrantTotals.sleeping / 1e6),
        }
      : emptyQuadrants(),
    topThreads,
    targetThreadCpuPercent: targetThread?.cpuPercent ?? topThreads[0]?.cpuPercent ?? 0,
    note:
      threadRows.length === 0
        ? "trace 中缺少目标进程 slice 数据，请确认包名与 cpu_sched/overview 预设"
        : !hasQuadrantData
          ? "trace 中缺少 thread_state/sched 数据，四象限无法计算"
          : undefined,
  };
}
