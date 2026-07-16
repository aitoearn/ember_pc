import { describe, expect, it } from "vitest";
import {
  buildExploreRunFromMonkeySession,
  countExploreRuleFailures,
} from "./buildExploreRun";

describe("buildExploreRun", () => {
  it("优先用 stepsSummary.scriptInfoCount 统计规则失败", () => {
    expect(
      countExploreRuleFailures([], {
        totalLines: 1,
        monkeyStepCount: 1,
        scriptInfoCount: 3,
        crashCount: 0,
        anrCount: 0,
        killAppsCount: 0,
      }),
    ).toBe(3);
  });

  it("从日志行统计 invariant/property 失败", () => {
    const logs = [
      {
        ts: 1,
        type: "error" as const,
        message: "[invariant] 登录页：元素不存在",
      },
      { ts: 2, type: "log" as const, message: "ok" },
    ];
    expect(countExploreRuleFailures(logs)).toBe(1);
  });

  it("组装 ExploreRun 留痕", () => {
    const run = buildExploreRunFromMonkeySession(
      "ws-1",
      {
        sessionId: "sess-1",
        deviceId: "dev-1",
        packageName: "com.demo",
        mode: "fastbot",
        eventCount: 100,
        throttleMs: 300,
        runningMinutes: 5,
        startedAt: "2026-06-18T00:00:00Z",
        stoppedAt: "2026-06-18T00:05:00Z",
        conclusion: "completed",
        eventsInjected: 42,
        crashCount: 0,
        anrCount: 0,
      },
      [],
      2,
    );
    expect(run.id).toBe("sess-1");
    expect(run.workspaceId).toBe("ws-1");
    expect(run.exploreRulesCount).toBe(2);
    expect(run.summary).toContain("completed");
  });
});
