import { describe, expect, it } from "vitest";
import {
  projectTraceOntoApmSession,
  projectTracesOntoApmSession,
  resolveApmSessionWindow,
} from "./apmTraceTimeline";

describe("apmTraceTimeline", () => {
  const session = {
    startedAt: "2026-06-17T00:00:00.000Z",
    stoppedAt: "2026-06-17T00:02:00.000Z",
  };

  it("解析 APM 会话 2 分钟窗口", () => {
    const window = resolveApmSessionWindow(session);
    expect(window?.durationMs).toBe(120_000);
  });

  it("将会中 Trace 投影到会话时间轴", () => {
    const segment = projectTraceOntoApmSession(session, {
      id: "trace-1",
      presetId: "scroll_jank",
      createdAt: "2026-06-17T00:00:30.000Z",
      stoppedAt: "2026-06-17T00:00:45.000Z",
      durationMs: 15_000,
    });
    expect(segment).not.toBeNull();
    expect(segment?.offsetStartMs).toBe(30_000);
    expect(segment?.offsetEndMs).toBe(45_000);
    expect(segment?.startPercent).toBeCloseTo(25, 1);
    expect(segment?.widthPercent).toBeCloseTo(12.5, 1);
    expect(segment?.fullyWithinSession).toBe(true);
  });

  it("多 Trace 投影保持顺序", () => {
    const segments = projectTracesOntoApmSession(session, [
      {
        id: "a",
        presetId: "scroll_jank",
        createdAt: "2026-06-17T00:01:00.000Z",
        stoppedAt: "2026-06-17T00:01:20.000Z",
        durationMs: 20_000,
      },
      {
        id: "b",
        presetId: "memory",
        createdAt: "2026-06-17T00:00:10.000Z",
        stoppedAt: "2026-06-17T00:00:25.000Z",
        durationMs: 15_000,
      },
    ]);
    expect(segments).toHaveLength(2);
    expect(segments.map((item) => item.artifactId).sort()).toEqual(["a", "b"]);
  });
});
