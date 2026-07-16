import { useTranslation } from "react-i18next";
import { PERF_METRIC_OPTIONS } from "../constants/metrics";
import type { PerfSeriesBuffers } from "../domain/perfBuffer";
import type { PerfMetricId } from "../types";
import { PerformanceMetricChart } from "./PerformanceMetricChart";

const SERIES_META = {
  cpu_app: {
    labelKey: "deviceAutomation.performance.charts.cpuApp",
    unitKey: "deviceAutomation.performance.units.percent",
    strokeClassName: "stroke-emerald-600",
  },
  cpu_sys: {
    labelKey: "deviceAutomation.performance.charts.cpuSys",
    unitKey: "deviceAutomation.performance.units.percent",
    strokeClassName: "stroke-amber-600",
  },
  mem_total: {
    labelKey: "deviceAutomation.performance.charts.memory",
    unitKey: "deviceAutomation.performance.units.mb",
    strokeClassName: "stroke-violet-600",
  },
  fps: {
    labelKey: "deviceAutomation.performance.charts.fps",
    unitKey: "deviceAutomation.performance.units.fps",
    strokeClassName: "stroke-sky-600",
  },
} as const satisfies Record<
  "cpu_app" | "cpu_sys" | "mem_total" | "fps",
  {
    labelKey: `deviceAutomation.${string}`;
    unitKey: `deviceAutomation.${string}`;
    strokeClassName: string;
  }
>;

export interface PerformanceLiveChartsProps {
  metrics: PerfMetricId[];
  buffers: PerfSeriesBuffers;
  isRunning: boolean;
}

export function PerformanceLiveCharts({
  metrics,
  buffers,
  isRunning,
}: PerformanceLiveChartsProps) {
  const { t } = useTranslation("deviceAutomation");
  const selectedOptions = PERF_METRIC_OPTIONS.filter((option) =>
    metrics.includes(option.id),
  );
  const emptyLabel = isRunning
    ? t("deviceAutomation.performance.charts.waiting")
    : t("deviceAutomation.performance.charts.empty");

  if (selectedOptions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 p-8 text-center text-sm text-neutral-500">
        {t("deviceAutomation.performance.errors.noMetrics")}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-2"
      data-testid="performance-live-charts"
    >
      {selectedOptions.flatMap((option) =>
        option.seriesKeys.map((seriesKey) => {
          const meta = SERIES_META[seriesKey];
          return (
            <PerformanceMetricChart
              key={seriesKey}
              series={buffers[seriesKey]}
              label={t(meta.labelKey)}
              unit={t(meta.unitKey)}
              strokeClassName={meta.strokeClassName}
              emptyLabel={emptyLabel}
            />
          );
        }),
      )}
    </div>
  );
}
