import type { PerfTracePresetId } from "../../../../src/features/device-automation/performance/types";

/** 默认录制时长（毫秒），与 SmartPerfetto scrolling/startup 预设接近。 */
export const DEFAULT_PERF_TRACE_DURATION_MS = 30000;

export type BuildPerfTracePresetOptions = {
  packageName?: string;
  durationMs?: number;
};

const COMMON_FTRACE_EVENTS = [
  "sched/sched_switch",
  "sched/sched_wakeup",
  "sched/sched_blocked_reason",
  "power/cpu_frequency",
  "power/cpu_idle",
];

const BINDER_EVENTS = [
  "binder/binder_transaction",
  "binder/binder_transaction_received",
];

function escapeTextProto(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function renderDataSource(name: string, extraLines: string[] = []): string {
  return [
    "data_sources {",
    "  config {",
    `    name: "${escapeTextProto(name)}"`,
    "    target_buffer: 1",
    ...extraLines,
    "  }",
    "}",
  ].join("\n");
}

function renderFtraceBlock(
  atraceCategories: string[],
  ftraceEvents: string[],
  atraceApps: string,
): string {
  return [
    "data_sources {",
    "  config {",
    "    name: \"linux.ftrace\"",
    "    target_buffer: 0",
    "    ftrace_config {",
    ...ftraceEvents.map(
      (event) => `      ftrace_events: "${escapeTextProto(event)}"`,
    ),
    ...atraceCategories.map(
      (category) => `      atrace_categories: "${escapeTextProto(category)}"`,
    ),
    `      atrace_apps: "${escapeTextProto(atraceApps)}"`,
    "    }",
    "  }",
    "}",
  ].join("\n");
}

function renderBaseHeader(comment: string): string {
  return [
    `# ${comment}`,
    "# 文本结构对齐 SmartPerfetto captureConfig（每 data_source 独立块 + linux.ftrace atrace_apps）",
    "buffers {",
    "  size_kb: 65536",
    "  fill_policy: RING_BUFFER",
    "}",
    "buffers {",
    "  size_kb: 4096",
    "  fill_policy: RING_BUFFER",
    "}",
    renderDataSource("android.packages_list"),
    renderDataSource("linux.process_stats", [
      "    process_stats_config {",
      "      scan_all_processes_on_start: true",
      "    }",
    ]),
  ].join("\n");
}

function renderFooter(durationMs: number): string {
  return [
    `duration_ms: ${durationMs}`,
    "flush_period_ms: 5000",
    "incremental_state_config {",
    "  clear_period_ms: 5000",
    "}",
    "",
  ].join("\n");
}

function buildScrollJankConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember P2 · scroll_jank（对齐 SmartPerfetto scrolling）"),
    renderDataSource("android.surfaceflinger.frametimeline"),
    renderDataSource("android.input.inputevent"),
    renderFtraceBlock(
      ["gfx", "view", "input", "wm", "am", "binder_driver", "webview"],
      [...COMMON_FTRACE_EVENTS, "power/gpu_frequency", ...BINDER_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildColdStartConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember P2 · cold_start（对齐 SmartPerfetto startup）"),
    renderDataSource("android.surfaceflinger.frametimeline"),
    renderFtraceBlock(
      ["am", "wm", "view", "gfx", "input", "dalvik", "binder_driver", "pm", "webview"],
      [
        ...COMMON_FTRACE_EVENTS,
        ...BINDER_EVENTS,
        "power/suspend_resume",
      ],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildCpuSchedConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember P2 · cpu_sched（对齐 SmartPerfetto cpu）"),
    renderDataSource("linux.sys_stats", [
      "    sys_stats_config {",
      "      stat_period_ms: 1000",
      "      stat_counters: STAT_CPU_TIMES",
      "      stat_counters: STAT_FORK_COUNT",
      "      cpufreq_period_ms: 1000",
      "    }",
    ]),
    renderFtraceBlock(
      ["am", "wm", "view", "gfx", "input", "binder_driver"],
      [...COMMON_FTRACE_EVENTS, ...BINDER_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

export function buildPerfTracePresetConfig(
  presetId: Exclude<PerfTracePresetId, "custom">,
  options: BuildPerfTracePresetOptions = {},
): string {
  const packageName = options.packageName?.trim() || "*";
  const durationMs = options.durationMs ?? DEFAULT_PERF_TRACE_DURATION_MS;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("durationMs 必须为正数");
  }

  switch (presetId) {
    case "scroll_jank":
      return buildScrollJankConfig(packageName, durationMs);
    case "cold_start":
      return buildColdStartConfig(packageName, durationMs);
    case "cpu_sched":
      return buildCpuSchedConfig(packageName, durationMs);
    default: {
      const neverPreset: never = presetId;
      throw new Error(`未知预设：${neverPreset}`);
    }
  }
}
