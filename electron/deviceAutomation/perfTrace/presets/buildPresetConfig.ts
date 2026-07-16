import type { PerfTracePresetId } from "../../../../src/features/device-automation/performance/types";

/** 未指定时的兜底时长（毫秒）。 */
export const DEFAULT_PERF_TRACE_DURATION_MS = 20000;

/** 各预设默认时长，对齐 SmartPerfetto traceCaptureConfig.ts。 */
export const PERF_TRACE_PRESET_DEFAULT_DURATION_MS: Record<
  Exclude<PerfTracePresetId, "custom">,
  number
> = {
  scroll_jank: 15000,
  cold_start: 20000,
  cpu_sched: 15000,
  memory: 30000,
  anr: 30000,
  overview: 20000,
  camera: 20000,
  game: 20000,
  power: 60000,
  full: 20000,
};

export type BuildPerfTracePresetOptions = {
  packageName?: string;
  durationMs?: number;
};

const COMMON_FTRACE_EVENTS = [
  "sched/sched_switch",
  "sched/sched_blocked_reason",
  "sched/sched_waking",
  "sched/sched_wakeup",
  "sched/sched_wakeup_new",
  "power/cpu_frequency",
  "power/cpu_idle",
  "ftrace/print",
];

const BINDER_EVENTS = [
  "binder/binder_transaction",
  "binder/binder_transaction_received",
  "binder/binder_transaction_alloc_buf",
];

const IO_EVENTS = [
  "block/block_rq_issue",
  "block/block_rq_complete",
  "f2fs/f2fs_sync_file_enter",
  "f2fs/f2fs_sync_file_exit",
  "ext4/ext4_sync_file_enter",
  "ext4/ext4_sync_file_exit",
];

const MEMORY_EVENTS = [
  "oom/oom_score_adj_update",
  "kmem/rss_stat",
  "vmscan/mm_vmscan_direct_reclaim_begin",
  "vmscan/mm_vmscan_direct_reclaim_end",
];

const CAMERA_MEMORY_EVENTS = [
  "dmabuf_heap/dma_heap_stat",
  "ion/ion_stat",
];

const POWER_EVENTS = [
  "power/suspend_resume",
  "power/wakeup_source_activate",
  "power/wakeup_source_deactivate",
  "power/gpu_frequency",
  "thermal/thermal_temperature",
  "thermal/cdev_update",
];

const COMMON_DATA_SOURCES = [
  "android.packages_list",
  "linux.process_stats",
  "linux.sys_stats",
  "android.log",
];

function escapeTextProto(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

export function calculateCaptureBufferSizeKb(
  durationMs: number,
  minimumKb = 65536,
): number {
  const durationSeconds = durationMs / 1000;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("durationMs 必须为正数");
  }
  const estimatedKb = Math.round(durationSeconds * 8 * 1024);
  const clampedKb = Math.max(64 * 1024, Math.min(512 * 1024, estimatedKb));
  return Math.max(minimumKb, clampedKb);
}

function renderDataSource(name: string, extraLines: string[] = []): string {
  if (name === "android.power") {
    return [
      "data_sources {",
      "  config {",
      '    name: "android.power"',
      "    target_buffer: 1",
      "    android_power_config {",
      "      battery_poll_ms: 1000",
      "      battery_counters: BATTERY_COUNTER_CHARGE",
      "      battery_counters: BATTERY_COUNTER_CAPACITY_PERCENT",
      "      battery_counters: BATTERY_COUNTER_CURRENT",
      "      battery_counters: BATTERY_COUNTER_CURRENT_AVG",
      "      battery_counters: BATTERY_COUNTER_VOLTAGE",
      "      collect_power_rails: true",
      "      collect_energy_estimation_breakdown: true",
      "      collect_entity_state_residency: true",
      "    }",
      "  }",
      "}",
    ].join("\n");
  }
  if (name === "android.network_packets") {
    return [
      "data_sources {",
      "  config {",
      '    name: "android.network_packets"',
      "    target_buffer: 1",
      "    android_network_packets_config {",
      "      poll_ms: 250",
      "    }",
      "  }",
      "}",
    ].join("\n");
  }
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

function renderProcessStatsSource(): string {
  return renderDataSource("linux.process_stats", [
    "    process_stats_config {",
    "      scan_all_processes_on_start: true",
    "    }",
  ]);
}

function renderSysStatsSource(): string {
  // 不写入 cpufreq_period_ms：部分 Android 内置 perfetto 的 SysStatsConfig 尚无该字段，
  // 会触发 perfetto_cmd 校验失败。CPU 频率改由 ftrace power/cpu_frequency 事件采集。
  return renderDataSource("linux.sys_stats", [
    "    sys_stats_config {",
    "      stat_period_ms: 1000",
    "      stat_counters: STAT_CPU_TIMES",
    "      stat_counters: STAT_FORK_COUNT",
    "    }",
  ]);
}

function renderFtraceBlock(
  atraceCategories: string[],
  ftraceEvents: string[],
  atraceApps: string,
): string {
  return [
    "data_sources {",
    "  config {",
    '    name: "linux.ftrace"',
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

function renderBaseHeader(
  comment: string,
  durationMs: number,
  minimumBufferKb: number,
): string {
  const bufferSizeKb = calculateCaptureBufferSizeKb(durationMs, minimumBufferKb);
  return [
    `# ${comment}`,
    "# 对齐 SmartPerfetto traceCaptureConfig.ts（独立 data_sources + 动态 buffer）",
    "buffers {",
    `  size_kb: ${bufferSizeKb}`,
    "  fill_policy: RING_BUFFER",
    "}",
    "buffers {",
    "  size_kb: 4096",
    "  fill_policy: RING_BUFFER",
    "}",
    ...COMMON_DATA_SOURCES.filter((source) => source !== "linux.sys_stats").map(
      (source) =>
        source === "linux.process_stats"
          ? renderProcessStatsSource()
          : renderDataSource(source),
    ),
  ].join("\n");
}

function renderFooter(durationMs: number): string {
  return [
    renderSysStatsSource(),
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
    renderBaseHeader("Ember · scroll_jank（SmartPerfetto scrolling）", durationMs, 65536),
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
    renderBaseHeader("Ember · cold_start（SmartPerfetto startup）", durationMs, 65536),
    renderDataSource("android.surfaceflinger.frametimeline"),
    renderFtraceBlock(
      ["am", "wm", "view", "gfx", "input", "dalvik", "binder_driver", "pm", "webview"],
      [
        ...COMMON_FTRACE_EVENTS,
        ...BINDER_EVENTS,
        ...IO_EVENTS,
        "power/suspend_resume",
      ],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildCpuSchedConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · cpu_sched（SmartPerfetto cpu）", durationMs, 65536),
    renderFtraceBlock(
      ["am", "wm", "view", "gfx", "input", "binder_driver"],
      [...COMMON_FTRACE_EVENTS, ...BINDER_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildMemoryConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · memory（SmartPerfetto memory）", durationMs, 98304),
    renderFtraceBlock(
      ["am", "wm", "view", "dalvik", "binder_driver"],
      [...COMMON_FTRACE_EVENTS, ...MEMORY_EVENTS, ...IO_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildAnrConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · anr（SmartPerfetto anr）", durationMs, 98304),
    renderDataSource("android.input.inputevent"),
    renderFtraceBlock(
      ["am", "wm", "view", "input", "dalvik", "binder_driver"],
      [...COMMON_FTRACE_EVENTS, ...BINDER_EVENTS, ...IO_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildOverviewConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · overview（SmartPerfetto overview）", durationMs, 65536),
    renderDataSource("android.surfaceflinger.frametimeline"),
    renderDataSource("android.input.inputevent"),
    renderFtraceBlock(
      ["am", "wm", "view", "gfx", "input", "dalvik", "binder_driver", "pm", "webview"],
      [...COMMON_FTRACE_EVENTS, ...BINDER_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildCameraConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · camera（SmartPerfetto camera）", durationMs, 98304),
    renderDataSource("android.surfaceflinger.frametimeline"),
    renderFtraceBlock(
      ["camera", "hal", "gfx", "view", "binder_driver", "freq", "sched"],
      [...COMMON_FTRACE_EVENTS, ...BINDER_EVENTS, ...CAMERA_MEMORY_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildGameConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · game（SmartPerfetto game/rendering）", durationMs, 98304),
    renderDataSource("android.surfaceflinger.frametimeline"),
    renderDataSource("gpu.counters"),
    renderDataSource("gpu.renderstages"),
    renderFtraceBlock(
      ["gfx", "view", "input", "wm", "am", "hal", "video", "rs", "binder_driver"],
      [...COMMON_FTRACE_EVENTS, ...BINDER_EVENTS, "power/gpu_frequency"],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildPowerConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · power（SmartPerfetto power/battery）", durationMs, 131072),
    renderDataSource("android.power"),
    renderDataSource("android.network_packets"),
    renderFtraceBlock(
      ["am", "pm", "power", "network", "binder_driver"],
      [...COMMON_FTRACE_EVENTS, ...POWER_EVENTS],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

function buildFullConfig(packageName: string, durationMs: number): string {
  return [
    renderBaseHeader("Ember · full（SmartPerfetto full diagnostic）", durationMs, 131072),
    renderDataSource("android.surfaceflinger.frametimeline"),
    renderDataSource("android.input.inputevent"),
    renderFtraceBlock(
      [
        "am",
        "adb",
        "aidl",
        "dalvik",
        "audio",
        "binder_lock",
        "binder_driver",
        "bionic",
        "camera",
        "database",
        "gfx",
        "hal",
        "input",
        "network",
        "nnapi",
        "pm",
        "power",
        "rs",
        "res",
        "rro",
        "sm",
        "ss",
        "vibrator",
        "video",
        "view",
        "webview",
        "wm",
      ],
      [
        ...COMMON_FTRACE_EVENTS,
        ...BINDER_EVENTS,
        ...IO_EVENTS,
        ...MEMORY_EVENTS,
        ...CAMERA_MEMORY_EVENTS,
        "irq/irq_handler_entry",
        "irq/irq_handler_exit",
        "sync/sync_timeline",
        "sync/sync_wait",
        "power/gpu_frequency",
        "raw_syscalls/sys_enter",
        "raw_syscalls/sys_exit",
      ],
      packageName,
    ),
    renderFooter(durationMs),
  ].join("\n");
}

export function resolvePerfTracePresetDurationMs(
  presetId: Exclude<PerfTracePresetId, "custom">,
  overrideMs?: number,
): number {
  if (overrideMs != null && Number.isFinite(overrideMs) && overrideMs > 0) {
    return Math.round(overrideMs);
  }
  return PERF_TRACE_PRESET_DEFAULT_DURATION_MS[presetId];
}

export function buildPerfTracePresetConfig(
  presetId: Exclude<PerfTracePresetId, "custom">,
  options: BuildPerfTracePresetOptions = {},
): string {
  const packageName = options.packageName?.trim() || "*";
  const durationMs = resolvePerfTracePresetDurationMs(presetId, options.durationMs);

  switch (presetId) {
    case "scroll_jank":
      return buildScrollJankConfig(packageName, durationMs);
    case "cold_start":
      return buildColdStartConfig(packageName, durationMs);
    case "cpu_sched":
      return buildCpuSchedConfig(packageName, durationMs);
    case "memory":
      return buildMemoryConfig(packageName, durationMs);
    case "anr":
      return buildAnrConfig(packageName, durationMs);
    case "overview":
      return buildOverviewConfig(packageName, durationMs);
    case "camera":
      return buildCameraConfig(packageName, durationMs);
    case "game":
      return buildGameConfig(packageName, durationMs);
    case "power":
      return buildPowerConfig(packageName, durationMs);
    case "full":
      return buildFullConfig(packageName, durationMs);
    default: {
      const neverPreset: never = presetId;
      throw new Error(`未知预设：${neverPreset}`);
    }
  }
}
