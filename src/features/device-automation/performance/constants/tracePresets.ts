import type { PerfTracePresetId } from "../types";

export type PerfTracePresetMeta = {
  id: PerfTracePresetId;
  /** i18n key 后缀：deviceAutomation.performance.trace.preset.{labelKey} */
  labelKey: string;
  descriptionKey: string;
};

/** P2 内置 Perfetto 预设（由 Electron buildPresetConfig 生成，对齐 ../perf/SmartPerfetto） */
export const PERF_TRACE_PRESETS: PerfTracePresetMeta[] = [
  {
    id: "scroll_jank",
    labelKey: "scrollJank",
    descriptionKey: "scrollJankDesc",
  },
  {
    id: "cold_start",
    labelKey: "coldStart",
    descriptionKey: "coldStartDesc",
  },
  {
    id: "cpu_sched",
    labelKey: "cpuSched",
    descriptionKey: "cpuSchedDesc",
  },
  {
    id: "custom",
    labelKey: "custom",
    descriptionKey: "customDesc",
  },
];

export const DEFAULT_PERF_TRACE_PRESET_ID: PerfTracePresetId = "scroll_jank";
