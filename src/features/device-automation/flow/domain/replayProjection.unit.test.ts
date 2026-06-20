import { describe, expect, it } from "vitest";

import type { DeviceFlowReplayEvent } from "../../events";
import {
  initialReplayState,
  reduceReplayEvent,
} from "./replayProjection";

describe("reduceReplayEvent", () => {
  it("折叠 step/result/done 为可渲染状态", () => {
    const events: DeviceFlowReplayEvent[] = [
      { runId: "r1", type: "step", index: 0, op: "tap", status: "running" },
      {
        runId: "r1",
        type: "result",
        index: 0,
        status: "passed",
        durationMs: 120,
      },
      {
        runId: "r1",
        type: "done",
        conclusion: "passed",
        healingTriggered: false,
        llmTokenUsed: 0,
        summary: "回放通过",
      },
    ];
    let state = initialReplayState;
    for (const event of events) {
      state = reduceReplayEvent(state, event);
    }
    expect(state.status).toBe("done");
    expect(state.conclusion).toBe("passed");
    expect(state.steps[0].status).toBe("passed");
    expect(state.steps[0].durationMs).toBe(120);
  });
});
