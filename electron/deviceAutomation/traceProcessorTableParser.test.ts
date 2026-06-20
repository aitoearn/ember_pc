import { describe, expect, it } from "vitest";
import { parseTraceProcessorTableOutput } from "./traceProcessorTableParser";

describe("traceProcessorTableParser", () => {
  it("解析单列 CSV（trace_processor 常见输出）", () => {
    const stdout = `"total"\n5038`;
    const rows = parseTraceProcessorTableOutput(stdout);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.total).toBe(5038);
  });

  it("解析多列 CSV 含引号字符串", () => {
    const stdout = `"frame_ms","ts","jank_type"\n224.016476,231452797541025,"App Deadline Missed"`;
    const rows = parseTraceProcessorTableOutput(stdout);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.frame_ms).toBe(224.016476);
    expect(rows[0]?.ts).toBe(231452797541025);
    expect(rows[0]?.jank_type).toBe("App Deadline Missed");
  });

  it("忽略 stderr 混入的加载日志（仅 stdout 应传入）", () => {
    const stdout = `"has_frame_timeline"\n1`;
    const rows = parseTraceProcessorTableOutput(stdout);
    expect(rows[0]?.has_frame_timeline).toBe(1);
  });

  it("空输出返回空数组", () => {
    expect(parseTraceProcessorTableOutput("")).toEqual([]);
    expect(parseTraceProcessorTableOutput("only noise")).toEqual([]);
  });
});
