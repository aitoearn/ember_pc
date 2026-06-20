import { describe, expect, it } from "vitest";
import {
  buildPerfTracePresetConfig,
  DEFAULT_PERF_TRACE_DURATION_MS,
} from "./buildPresetConfig";

describe("buildPerfTracePresetConfig", () => {
  it("每个内置预设生成合法 textproto（无重复 config 块）", () => {
    for (const presetId of ["scroll_jank", "cold_start", "cpu_sched"] as const) {
      const config = buildPerfTracePresetConfig(presetId, {
        packageName: "com.example.app",
        durationMs: 15000,
      });
      expect(config).toContain("duration_ms: 15000");
      expect(config).toContain('atrace_apps: "com.example.app"');
      expect(config).toContain("name: \"linux.ftrace\"");
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

  it("默认时长为 30 秒", () => {
    const config = buildPerfTracePresetConfig("cpu_sched");
    expect(config).toContain(`duration_ms: ${DEFAULT_PERF_TRACE_DURATION_MS}`);
    expect(config).toContain('atrace_apps: "*"');
  });
});
