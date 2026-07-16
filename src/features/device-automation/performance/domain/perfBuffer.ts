import { PERF_MAX_POINTS } from "../constants/metrics";
import type { PerfMetricKey, PerfMetricSummaryMap } from "../types";

export type PerfPoint = { ts: number; value: number };

export type PerfSeriesBuffers = Record<PerfMetricKey, PerfPoint[]>;

const PERF_METRIC_KEYS: readonly PerfMetricKey[] = [
  "cpu_app",
  "cpu_sys",
  "mem_total",
  "fps",
];

export function createEmptyPerfBuffers(): PerfSeriesBuffers {
  return {
    cpu_app: [],
    cpu_sys: [],
    mem_total: [],
    fps: [],
  };
}

export function appendPerfPoint(
  buffers: PerfSeriesBuffers,
  key: PerfMetricKey,
  point: PerfPoint,
): PerfSeriesBuffers {
  const next = [...buffers[key], point];
  const trimmed =
    next.length > PERF_MAX_POINTS ? next.slice(-PERF_MAX_POINTS) : next;
  return { ...buffers, [key]: trimmed };
}

export function appendPerfFrame(
  buffers: PerfSeriesBuffers,
  ts: number,
  data: Partial<Record<PerfMetricKey, number>>,
): PerfSeriesBuffers {
  let next = buffers;
  for (const key of PERF_METRIC_KEYS) {
    const value = data[key];
    if (value === undefined || Number.isNaN(value)) {
      continue;
    }
    next = appendPerfPoint(next, key, { ts, value });
  }
  return next;
}

export function computePerfSummary(
  buffers: PerfSeriesBuffers,
  key: PerfMetricKey,
): { avg: number; max: number; min: number } | undefined {
  const series = buffers[key];
  if (series.length === 0) {
    return undefined;
  }
  const values = series.map((point) => point.value);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    avg: sum / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  };
}

export function computeAllPerfSummaries(
  buffers: PerfSeriesBuffers,
): PerfMetricSummaryMap {
  const summary: PerfMetricSummaryMap = {};
  for (const key of PERF_METRIC_KEYS) {
    const metricSummary = computePerfSummary(buffers, key);
    if (metricSummary) {
      summary[key] = metricSummary;
    }
  }
  return summary;
}
