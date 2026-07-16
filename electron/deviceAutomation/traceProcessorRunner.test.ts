import { describe, expect, it } from "vitest";
import { parseTraceProcessorTableOutput } from "./traceProcessorTableParser";

describe("traceProcessorRunner", () => {
  it("parseTraceProcessorTableOutput 解析 trace_processor CSV stdout", () => {
    const stdout = `"frame_ms","ts"\n12.3,1000\n18.9,2000`;

    const rows = parseTraceProcessorTableOutput(stdout);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.frame_ms).toBe(12.3);
    expect(rows[1]?.ts).toBe(2000);
  });

  it("空输出返回空数组", () => {
    expect(parseTraceProcessorTableOutput("")).toEqual([]);
    expect(parseTraceProcessorTableOutput("only_header")).toEqual([]);
  });
});
