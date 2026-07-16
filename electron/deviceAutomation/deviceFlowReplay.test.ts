import { describe, expect, it } from "vitest";
import {
  deviceFlowReplayEventChannel,
  deviceFlowReplayRuntime,
} from "./deviceFlowReplay";

describe("deviceFlowReplay", () => {
  it("事件通道按 runId 隔离", () => {
    expect(deviceFlowReplayEventChannel("run-a")).toBe(
      "deviceFlow:replay:event:run-a",
    );
    expect(deviceFlowReplayEventChannel("run-b")).not.toBe(
      deviceFlowReplayEventChannel("run-a"),
    );
  });

  it("未知 runId 取消回放返回 false", () => {
    expect(deviceFlowReplayRuntime.cancel("missing-run")).toEqual({
      cancelled: false,
    });
  });
});
