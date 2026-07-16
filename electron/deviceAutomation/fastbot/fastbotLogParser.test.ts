import { describe, expect, it, vi } from "vitest";
import {
  appendAndParseFastbotLog,
  createFastbotLogParserState,
} from "./fastbotLogParser";

describe("fastbotLogParser", () => {
  it("识别 Kea2 风格 CRASH 日志", () => {
    const state = createFastbotLogParserState();
    const lines: string[] = [];
    appendAndParseFastbotLog(
      "[Fastbot]*** ERROR *** // CRASH: com.demo.app (pid 100) (elapsed nanos: 1)\n",
      state,
      { onLogLine: (line) => lines.push(line.message) },
    );
    expect(state.crashDetected).toBe(true);
    expect(state.crashCount).toBe(1);
    expect(lines.some((msg) => msg.includes("CRASH: package=com.demo.app"))).toBe(true);
  });

  it("识别 ANR 与结束统计", () => {
    const state = createFastbotLogParserState();
    const onLogLine = vi.fn();
    appendAndParseFastbotLog(
      "[Fastbot]*** ERROR *** ANR in com.demo.app (com.demo.MainActivity)\nMonkey is over!\nApp appears 2 crash, 1 anr\n",
      state,
      { onLogLine },
    );
    expect(state.anrDetected).toBe(true);
    expect(state.crashCount).toBe(2);
    expect(state.anrCount).toBe(1);
    expect(state.statisticPrinted).toBe(true);
  });
});
