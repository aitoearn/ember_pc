import type { PerfPoint } from "../domain/perfBuffer";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const PADDING = 8;

export interface PerformanceMetricChartProps {
  series: PerfPoint[];
  label: string;
  unit: string;
  strokeClassName?: string;
  emptyLabel: string;
}

export function PerformanceMetricChart({
  series,
  label,
  unit,
  strokeClassName = "stroke-sky-600",
  emptyLabel,
}: PerformanceMetricChartProps) {
  const values = series.map((point) => point.value);
  const latest = values.at(-1);
  const maxValue = values.length > 0 ? Math.max(...values, 1) : 1;
  const minValue = values.length > 0 ? Math.min(...values, 0) : 0;
  const range = Math.max(maxValue - minValue, 1);

  const points = series
    .map((point, index) => {
      const x =
        series.length <= 1
          ? CHART_WIDTH / 2
          : PADDING +
            (index / (series.length - 1)) * (CHART_WIDTH - PADDING * 2);
      const normalized = (point.value - minValue) / range;
      const y =
        CHART_HEIGHT - PADDING - normalized * (CHART_HEIGHT - PADDING * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div
      className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm"
      data-testid={`performance-metric-chart-${label}`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-neutral-800">{label}</span>
        <span className="text-xs text-neutral-500">
          {latest !== undefined ? `${latest.toFixed(1)} ${unit}` : emptyLabel}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-[120px] w-full"
        role="img"
        aria-label={label}
      >
        <rect
          x={0}
          y={0}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          className="fill-neutral-50"
          rx={8}
        />
        {series.length > 1 ? (
          <polyline
            fill="none"
            className={strokeClassName}
            strokeWidth={2}
            points={points}
          />
        ) : null}
      </svg>
    </div>
  );
}
