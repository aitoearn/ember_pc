import { describe, expect, it } from "vitest";
import {
  buildPerfTracePresetConfig,
  calculateCaptureBufferSizeKb,
  DEFAULT_PERF_TRACE_DURATION_MS,
  PERF_TRACE_PRESET_DEFAULT_DURATION_MS,
  resolvePerfTracePresetDurationMs,
} from "./buildPresetConfig";

describe("buildPerfTracePresetConfig", () => {
  it("每个内置预设生成合法 textproto（无重复 config 块）", () => {
    for (const presetId of [
      "scroll_jank",
      "cold_start",
      "cpu_sched",
      "memory",
      "anr",
      "overview",
      "camera",
      "game",
      "power",
      "full",
    ] as const) {
      const config = buildPerfTracePresetConfig(presetId, {
        packageName: "com.example.app",
        durationMs: 15000,
      });
      expect(config).toContain("duration_ms: 15000");
      expect(config).toContain('atrace_apps: "com.example.app"');
      expect(config).toContain('name: "linux.ftrace"');
      expect(config).toContain("android.log");
      expect(config).toContain("linux.sys_stats");
      expect(config).not.toContain("cpufreq_period_ms");
      const configBlocks = config.match(/^\s*config\s*\{/gm) ?? [];
      const dataSourceBlocks = config.match(/^\s*data_sources\s*\{/gm) ?? [];
      expect(configBlocks.length).toBe(dataSourceBlocks.length);
    }
  });

  it("滑动卡顿预设包含 FrameTimeline 与 input", () => {
    const config = buildPerfTracePresetConfig("scroll_jank", {
      packageName: "com.demo",
    });
    expect(config).toContain("android.surfaceflinger.frametimeline");
    expect(config).toContain("android.input.inputevent");
    expect(config).toContain('atrace_categories: "gfx"');
  });

  it("冷启动预设包含 IO ftrace 事件", () => {
    const config = buildPerfTracePresetConfig("cold_start", {
      packageName: "com.demo",
    });
    expect(config).toContain("block/block_rq_issue");
    expect(config).toContain("power/suspend_resume");
  });

  it("默认时长按预设映射（对齐 SmartPerfetto）", () => {
    expect(resolvePerfTracePresetDurationMs("scroll_jank")).toBe(15000);
    expect(resolvePerfTracePresetDurationMs("cold_start")).toBe(20000);
    expect(resolvePerfTracePresetDurationMs("cpu_sched")).toBe(
      PERF_TRACE_PRESET_DEFAULT_DURATION_MS.cpu_sched,
    );
    const config = buildPerfTracePresetConfig("cpu_sched");
    expect(config).toContain(
      `duration_ms: ${PERF_TRACE_PRESET_DEFAULT_DURATION_MS.cpu_sched}`,
    );
    expect(DEFAULT_PERF_TRACE_DURATION_MS).toBe(20000);
  });

  it("calculateCaptureBufferSizeKb 随录制时长放大", () => {
    expect(calculateCaptureBufferSizeKb(15000, 65536)).toBeGreaterThanOrEqual(65536);
    expect(calculateCaptureBufferSizeKb(60000, 65536)).toBeGreaterThan(
      calculateCaptureBufferSizeKb(15000, 65536),
    );
  });

  it("功耗预设包含 android.power 与网络包统计", () => {
    const config = buildPerfTracePresetConfig("power", {
      packageName: "com.demo",
    });
    expect(config).toContain('name: "android.power"');
    expect(config).toContain('name: "android.network_packets"');
    expect(config).toContain("power/suspend_resume");
    expect(config).toContain(`duration_ms: ${PERF_TRACE_PRESET_DEFAULT_DURATION_MS.power}`);
  });

  it("游戏预设包含 GPU 数据源", () => {
    const config = buildPerfTracePresetConfig("game", {
      packageName: "com.demo",
    });
    expect(config).toContain("gpu.counters");
    expect(config).toContain("gpu.renderstages");
  });

  it("全量预设包含扩展 atrace 类别", () => {
    const config = buildPerfTracePresetConfig("full", {
      packageName: "com.demo",
    });
    expect(config).toContain('atrace_categories: "camera"');
    expect(config).toContain("raw_syscalls/sys_enter");
  });
});
