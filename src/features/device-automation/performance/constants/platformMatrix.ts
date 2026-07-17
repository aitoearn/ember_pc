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

/** 静态能力矩阵。Android 与 HarmonyOS 均已支持 CPU/内存/FPS 实时采集。 */
export const PERF_PLATFORM_MATRIX_ROWS: readonly PerfPlatformMatrixRow[] = [
  {
    metricId: "cpu",
    labelKey: "deviceAutomation.performance.metrics.cpu",
    android: "p1",
    ios: "planned",
    harmony: "p1",
  },
  {
    metricId: "memory",
    labelKey: "deviceAutomation.performance.metrics.memory",
    android: "p1",
    ios: "planned",
    harmony: "p1",
  },
  {
    metricId: "fps",
    labelKey: "deviceAutomation.performance.metrics.fps",
    android: "p1",
    ios: "planned",
    harmony: "p1",
  },
] as const;

export function isAndroidPerfCollectionSupported(
  platform: string | undefined,
): boolean {
  return platform?.trim().toLowerCase() === "android";
}

/** HarmonyOS 通过 SmartPerf（SP_daemon）支持实时采集；ohos 归一化到 harmony。 */
export function isHarmonyPerfCollectionSupported(
  platform: string | undefined,
): boolean {
  const value = platform?.trim().toLowerCase();
  return value === "harmony" || value === "ohos";
}

/** P1 实时 APM 采集是否支持当前平台（Android + HarmonyOS）。 */
export function isPerfCollectionSupported(platform: string | undefined): boolean {
  return (
    isAndroidPerfCollectionSupported(platform) ||
    isHarmonyPerfCollectionSupported(platform)
  );
}
