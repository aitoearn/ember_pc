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
    id: "memory",
    labelKey: "memory",
    descriptionKey: "memoryDesc",
  },
  {
    id: "anr",
    labelKey: "anr",
    descriptionKey: "anrDesc",
  },
  {
    id: "overview",
    labelKey: "overview",
    descriptionKey: "overviewDesc",
  },
  {
    id: "camera",
    labelKey: "camera",
    descriptionKey: "cameraDesc",
  },
  {
    id: "game",
    labelKey: "game",
    descriptionKey: "gameDesc",
  },
  {
    id: "power",
    labelKey: "power",
    descriptionKey: "powerDesc",
  },
  {
    id: "full",
    labelKey: "full",
    descriptionKey: "fullDesc",
  },
  {
    id: "custom",
    labelKey: "custom",
    descriptionKey: "customDesc",
  },
];

/** 主界面下拉展示的预设（custom 放在高级选项） */
export const PERF_TRACE_MAIN_PRESETS = PERF_TRACE_PRESETS.filter(
  (preset) => preset.id !== "custom",
);

export function findPerfTracePresetMeta(id: PerfTracePresetId): PerfTracePresetMeta | undefined {
  return PERF_TRACE_PRESETS.find((preset) => preset.id === id);
}

export function presetLabelKey(id: PerfTracePresetId): string {
  const meta = findPerfTracePresetMeta(id);
  return `deviceAutomation.performance.trace.preset.${meta?.labelKey ?? id}`;
}

export function presetDescriptionKey(id: PerfTracePresetId): string {
  const meta = findPerfTracePresetMeta(id);
  return `deviceAutomation.performance.trace.preset.${meta?.descriptionKey ?? `${id}Desc`}`;
}

export const DEFAULT_PERF_TRACE_PRESET_ID: PerfTracePresetId = "scroll_jank";

/** 各预设默认录制时长（秒），与 Electron buildPresetConfig 对齐 */
export const PERF_TRACE_PRESET_DURATION_SEC: Record<
  Exclude<PerfTracePresetId, "custom">,
  number
> = {
  scroll_jank: 15,
  cold_start: 20,
  cpu_sched: 15,
  memory: 30,
  anr: 30,
  overview: 20,
  camera: 20,
  game: 20,
  power: 60,
  full: 20,
};
