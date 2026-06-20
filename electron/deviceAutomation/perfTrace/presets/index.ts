import type { PerfTracePresetId } from "../../../../src/features/device-automation/performance/types";
import {
  buildPerfTracePresetConfig,
  type BuildPerfTracePresetOptions,
} from "./buildPresetConfig";

export type LoadPerfTracePresetOptions = BuildPerfTracePresetOptions & {
  configOverride?: string;
};

/**
 * 加载 Perfetto 文本配置。
 * 内置预设由代码生成（对齐 ../perf/SmartPerfetto captureConfig），并注入目标包名到 atrace_apps。
 */
export function loadPerfTracePresetConfig(
  presetId: PerfTracePresetId,
  options: LoadPerfTracePresetOptions = {},
): string {
  if (presetId === "custom") {
    const trimmed = options.configOverride?.trim();
    if (!trimmed) {
      throw new Error("custom 预设需要提供 configOverride");
    }
    return trimmed;
  }
  return buildPerfTracePresetConfig(presetId, {
    packageName: options.packageName,
    durationMs: options.durationMs,
  });
}
