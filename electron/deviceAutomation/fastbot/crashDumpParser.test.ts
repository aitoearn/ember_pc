import { describe, expect, it } from "vitest";
import { parseCrashDumpContent } from "./crashDumpParser";

describe("crashDumpParser", () => {
  it("解析 crash-dump.log 中的 crash 块", () => {
    const content = `StepsCount: 42
CrashScreen: screenshot-42-001.png
20260716103000
crash:
// CRASH: com.demo.app (pid 1234) (dump time: 0)
// Long Msg: java.lang.NullPointerException: demo
// stack line 1
// crash end
`;
    const { crashEvents, anrEvents } = parseCrashDumpContent(content);
    expect(anrEvents).toHaveLength(0);
    expect(crashEvents).toHaveLength(1);
    expect(crashEvents[0]?.stepsCount).toBe(42);
    expect(crashEvents[0]?.crashScreen).toBe("screenshot-42-001.png");
    expect(crashEvents[0]?.exceptionType).toBe("java.lang.NullPointerException");
    expect(crashEvents[0]?.time).toBe("2026-07-16 10:30:00");
  });

  it("解析 ANR 块并简化 Reason", () => {
    const content = `20260716103100
anr:
// ANR: com.demo.app (pid 5678)
Reason: Input dispatching timed out (No response)
trace line
anr end
`;
    const { anrEvents } = parseCrashDumpContent(content);
    expect(anrEvents).toHaveLength(1);
    expect(anrEvents[0]?.reason).toBe("Input dispatching timed out");
    expect(anrEvents[0]?.process).toBe("5678");
  });
});
