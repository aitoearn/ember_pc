import type { PerfMetricId } from "../types";

export type PerfPlatformMatrixPlatform = "android" | "ios" | "harmony";

export type PerfPlatformSupportLevel = "p1" | "planned" | "partial" | "unsupported";

export interface PerfPlatformMatrixRow {
  metricId: PerfMetricId;
  labelKey: `deviceAutomation.performance.metrics.${PerfMetricId}`;
  android: PerfPlatformSupportLevel;
  ios: PerfPlatformSupportLevel;
  harmony: PerfPlatformSupportLevel;
}

/** 静态能力矩阵，对齐 AutoPilot 文章与 P1 范围。 */
export const PERF_PLATFORM_MATRIX_ROWS: readonly PerfPlatformMatrixRow[] = [
  {
    metricId: "cpu",
    labelKey: "deviceAutomation.performance.metrics.cpu",
    android: "p1",
    ios: "planned",
    harmony: "planned",
  },
  {
    metricId: "memory",
    labelKey: "deviceAutomation.performance.metrics.memory",
    android: "p1",
    ios: "planned",
    harmony: "partial",
  },
  {
    metricId: "fps",
    labelKey: "deviceAutomation.performance.metrics.fps",
    android: "p1",
    ios: "planned",
    harmony: "planned",
  },
] as const;

export function isAndroidPerfCollectionSupported(
  platform: string | undefined,
): boolean {
  return platform?.trim().toLowerCase() === "android";
}
