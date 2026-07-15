import { describe, expect, it } from "vitest";
import { applyCrashAnalysisPrefill } from "./crashAnalysisPrefill";
import {
  appendStabilityAnalysisEvent,
  initialStabilityAnalysisState,
  isCanceledAnalysisMessage,
} from "./stabilityAnalysisProjection";

const RUN_ID = "run-001";

function buildPayload(
  line: Parameters<typeof appendStabilityAnalysisEvent>[1]["line"],
) {
  return { runId: RUN_ID, line };
}

describe("applyCrashAnalysisPrefill", () => {
  it("仅预填 crashLogPath，不将压测 localResultDir 写入 libraryDir", () => {
    const result = applyCrashAnalysisPrefill(
      {
        crashLogPath: "",
        libraryDir: "/existing/symbols",
        codeRoot: "/code",
      },
      {
        crashLogPath: "/monkey/crash.log",
        localResultDir: "/monkey/results/run-001",
      },
    );

    expect(result.form.crashLogPath).toBe("/monkey/crash.log");
    expect(result.form.libraryDir).toBe("/existing/symbols");
    expect(result.form.codeRoot).toBe("/code");
    expect(result.localResultDir).toBe("/monkey/results/run-001");
  });
});

describe("isCanceledAnalysisMessage", () => {
  it("识别取消类消息", () => {
    expect(isCanceledAnalysisMessage("稳定性分析已取消")).toBe(true);
    expect(isCanceledAnalysisMessage("Analysis canceled by user")).toBe(true);
    expect(isCanceledAnalysisMessage("LLM 调用失败")).toBe(false);
  });
});

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

  it("取消类 error 事件按正常结束处理，不写入 errorMessage", () => {
    const running = {
      ...initialStabilityAnalysisState,
      phase: "canceling" as const,
      runId: RUN_ID,
    };
    const next = appendStabilityAnalysisEvent(
      running,
      buildPayload({
        ts: 4,
        type: "error",
        message: "稳定性分析已取消",
      }),
      RUN_ID,
    );
    expect(next.phase).toBe("idle");
    expect(next.runId).toBeNull();
    expect(next.errorMessage).toBeUndefined();
    expect(next.logs.at(-1)?.message).toBe("稳定性分析已取消");
  });
});
