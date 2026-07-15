import { describe, expect, it } from "vitest";
import {
  appendStabilityAnalysisEvent,
  initialStabilityAnalysisState,
} from "./stabilityAnalysisProjection";

const RUN_ID = "run-001";

function buildPayload(
  line: Parameters<typeof appendStabilityAnalysisEvent>[1]["line"],
) {
  return { runId: RUN_ID, line };
}

describe("stabilityAnalysisProjection", () => {
  it("忽略非当前 runId 的事件", () => {
    const next = appendStabilityAnalysisEvent(
      initialStabilityAnalysisState,
      buildPayload({ ts: 1, type: "log", message: "hello" }),
      "other-run",
    );
    expect(next.logs).toHaveLength(0);
  });

  it("追加 log 事件并保持 running 状态", () => {
    const running = {
      ...initialStabilityAnalysisState,
      phase: "running" as const,
      runId: RUN_ID,
    };
    const next = appendStabilityAnalysisEvent(
      running,
      buildPayload({ ts: 1, type: "log", message: "step 1" }),
      RUN_ID,
    );
    expect(next.phase).toBe("running");
    expect(next.logs).toHaveLength(1);
    expect(next.logs[0]?.message).toBe("step 1");
  });

  it("done 事件结束 run 并写入报告路径", () => {
    const running = {
      ...initialStabilityAnalysisState,
      phase: "running" as const,
      runId: RUN_ID,
      logs: [{ ts: 1, type: "log" as const, message: "working" }],
    };
    const next = appendStabilityAnalysisEvent(
      running,
      buildPayload({
        ts: 2,
        type: "done",
        message: "完成",
        reportDir: "/tmp/reports/run-001",
        primaryArtifactPath: "/tmp/reports/run-001/final_output.md",
      }),
      RUN_ID,
    );
    expect(next.phase).toBe("idle");
    expect(next.runId).toBeNull();
    expect(next.reportDir).toBe("/tmp/reports/run-001");
    expect(next.primaryArtifactPath).toBe(
      "/tmp/reports/run-001/final_output.md",
    );
    expect(next.errorMessage).toBeUndefined();
    expect(next.logs).toHaveLength(2);
  });

  it("error 事件结束 run 并记录错误信息", () => {
    const running = {
      ...initialStabilityAnalysisState,
      phase: "running" as const,
      runId: RUN_ID,
    };
    const next = appendStabilityAnalysisEvent(
      running,
      buildPayload({
        ts: 3,
        type: "error",
        message: "LLM 调用失败",
      }),
      RUN_ID,
    );
    expect(next.phase).toBe("idle");
    expect(next.runId).toBeNull();
    expect(next.errorMessage).toBe("LLM 调用失败");
  });
});
