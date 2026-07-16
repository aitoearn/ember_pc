import type { PerfMetricId } from "../types";

export const PERF_MAX_POINTS = 120;

export const PERF_DEFAULT_INTERVAL_MS = 1000;

/** Clarify：固定档位下拉，不允许自由输入。 */
export const PERF_INTERVAL_OPTIONS_MS = [500, 1000, 2000, 5000] as const;

export type PerfIntervalMs = (typeof PERF_INTERVAL_OPTIONS_MS)[number];

export interface PerfMetricOption {
  id: PerfMetricId;
  labelKey: `deviceAutomation.performance.metrics.${PerfMetricId}`;
  seriesKeys: readonly ("cpu_app" | "cpu_sys" | "mem_total" | "fps")[];
}

export const PERF_METRIC_OPTIONS: readonly PerfMetricOption[] = [
  {
    id: "cpu",
    labelKey: "deviceAutomation.performance.metrics.cpu",
    seriesKeys: ["cpu_app", "cpu_sys"],
  },
  {
    id: "memory",
    labelKey: "deviceAutomation.performance.metrics.memory",
    seriesKeys: ["mem_total"],
  },
  {
    id: "fps",
    labelKey: "deviceAutomation.performance.metrics.fps",
    seriesKeys: ["fps"],
  },
] as const;

export const PERF_DEFAULT_METRIC_IDS: readonly PerfMetricId[] = [
  "cpu",
  "memory",
  "fps",
];

export function isPerfIntervalMs(value: number): value is PerfIntervalMs {
  return (PERF_INTERVAL_OPTIONS_MS as readonly number[]).includes(value);
}
