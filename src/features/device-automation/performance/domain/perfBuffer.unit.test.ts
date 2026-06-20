import { describe, expect, it } from "vitest";
import {
  appendPerfFrame,
  appendPerfPoint,
  computeAllPerfSummaries,
  computePerfSummary,
  createEmptyPerfBuffers,
} from "./perfBuffer";
import { PERF_MAX_POINTS } from "../constants/metrics";

describe("perfBuffer", () => {
  it("滑动窗口最多保留 120 点", () => {
    let buffers = createEmptyPerfBuffers();
    for (let index = 0; index < PERF_MAX_POINTS + 5; index += 1) {
      buffers = appendPerfPoint(buffers, "fps", { ts: index, value: index });
    }
    expect(buffers.fps).toHaveLength(PERF_MAX_POINTS);
    expect(buffers.fps[0]?.value).toBe(5);
    expect(buffers.fps.at(-1)?.value).toBe(PERF_MAX_POINTS + 4);
  });

  it("computePerfSummary 计算 avg/max/min", () => {
    let buffers = createEmptyPerfBuffers();
    for (const value of [10, 20, 30]) {
      buffers = appendPerfPoint(buffers, "cpu_app", {
        ts: value,
        value,
      });
    }
    expect(computePerfSummary(buffers, "cpu_app")).toEqual({
      avg: 20,
      max: 30,
      min: 10,
    });
  });

  it("appendPerfFrame 按帧写入多个指标", () => {
    const buffers = appendPerfFrame(createEmptyPerfBuffers(), 1000, {
      cpu_app: 12.5,
      mem_total: 256,
      fps: 60,
    });
    expect(buffers.cpu_app).toEqual([{ ts: 1000, value: 12.5 }]);
    expect(buffers.mem_total).toEqual([{ ts: 1000, value: 256 }]);
    expect(buffers.fps).toEqual([{ ts: 1000, value: 60 }]);
    expect(buffers.cpu_sys).toEqual([]);
  });

  it("computeAllPerfSummaries 跳过空序列", () => {
    let buffers = createEmptyPerfBuffers();
    buffers = appendPerfPoint(buffers, "fps", { ts: 1, value: 58 });
    buffers = appendPerfPoint(buffers, "fps", { ts: 2, value: 60 });
    expect(computeAllPerfSummaries(buffers)).toEqual({
      fps: { avg: 59, max: 60, min: 58 },
    });
  });
});
