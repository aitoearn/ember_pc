import { describe, expect, it } from "vitest";
import { classifyJankRootCause } from "./jankRootCause";

describe("classifyJankRootCause", () => {
  it("无 jank_type 时按帧耗时区分普通/严重卡顿", () => {
    expect(classifyJankRootCause(null, 20).code).toBe("jank");
    expect(classifyJankRootCause(null, 40).code).toBe("severe_jank");
  });

  it("识别 GPU / SurfaceFlinger 路径", () => {
    const result = classifyJankRootCause("SurfaceFlingerGpuDeadlineMissed", 25);
    expect(result.code).toBe("gpu_compositor");
    expect(result.summary).toContain("GPU");
  });

  it("识别输入延迟", () => {
    const result = classifyJankRootCause("InputHandlingLatency", 18);
    expect(result.code).toBe("input_latency");
  });

  it("识别 deadline missed", () => {
    const result = classifyJankRootCause("AppDeadlineMissed", 22);
    expect(result.code).toBe("deadline_missed");
  });
});
