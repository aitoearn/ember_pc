import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PerformanceTraceAnalysis } from "../types";
import { PerfTraceAnalysisView } from "./PerfTraceAnalysisView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("PerfTraceAnalysisView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("卡顿摘要有 jank 时展示单帧根因下钻按钮", async () => {
    const onRunAnalysis = vi.fn();
    const analysis: PerformanceTraceAnalysis = {
      id: "a-1",
      artifactId: "trace-1",
      analysisType: "jank_summary",
      packageName: "com.demo.app",
      timeRangeJson: null,
      resultJson: JSON.stringify({
        dataStatus: "ok",
        jankFrames: 3,
        totalFrames: 100,
        p99FrameMs: 28,
        severeJankFrames: 1,
        highlights: [],
      }),
      status: "done",
      createdAt: "2026-06-17T00:00:00.000Z",
    };

    await act(async () => {
      root.render(
        <PerfTraceAnalysisView
          analyses={[analysis]}
          loading={false}
          analyzingType={null}
          onRunAnalysis={onRunAnalysis}
          artifactPresetId="scroll_jank"
        />,
      );
    });

    const button = container.querySelector(
      '[data-testid="perf-trace-drilldown-jank-frame-detail"]',
    ) as HTMLButtonElement | null;
    expect(button).not.toBeNull();

    await act(async () => {
      button?.click();
    });

    expect(onRunAnalysis).toHaveBeenCalledWith("jank_frame_detail");
  });

  it("卡顿摘要 highlight 可下钻到指定帧", async () => {
    const onRunAnalysis = vi.fn();
    const analysis: PerformanceTraceAnalysis = {
      id: "a-2",
      artifactId: "trace-1",
      analysisType: "jank_summary",
      packageName: "com.demo.app",
      timeRangeJson: null,
      resultJson: JSON.stringify({
        dataStatus: "ok",
        jankFrames: 2,
        highlights: [
          {
            tsNs: 2_000_000,
            frameMs: 24,
            frameId: 7,
            rootCauseSummary: "deadline missed",
          },
        ],
      }),
      status: "done",
      createdAt: "2026-06-17T00:00:00.000Z",
    };

    await act(async () => {
      root.render(
        <PerfTraceAnalysisView
          analyses={[analysis]}
          loading={false}
          analyzingType={null}
          onRunAnalysis={onRunAnalysis}
          artifactPresetId="scroll_jank"
        />,
      );
    });

    const highlightButton = document.querySelector(
      '[data-testid="perf-trace-analyze-highlight-0"]',
    ) as HTMLButtonElement | null;
    expect(highlightButton).not.toBeNull();

    await act(async () => {
      highlightButton?.click();
    });

    expect(onRunAnalysis).toHaveBeenCalledWith("jank_frame_detail", {
      frameTarget: {
        frameId: 7,
        startTsNs: 2_000_000,
        endTsNs: 2_000_000 + 24 * 1e6,
      },
    });
  });
});
