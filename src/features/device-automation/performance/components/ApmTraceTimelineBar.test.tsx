import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApmTraceTimelineBar } from "./ApmTraceTimelineBar";
import type { TraceTimelineSegment } from "../domain/apmTraceTimeline";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const segments: TraceTimelineSegment[] = [
  {
    artifactId: "trace-a",
    presetId: "scroll_jank",
    traceStartMs: 0,
    traceEndMs: 15_000,
    offsetStartMs: 30_000,
    offsetEndMs: 45_000,
    startPercent: 25,
    widthPercent: 12.5,
    fullyWithinSession: true,
  },
];

describe("ApmTraceTimelineBar", () => {
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

  it("渲染时间轴与图例", async () => {
    await act(async () => {
      root.render(
        <ApmTraceTimelineBar sessionDurationMs={120_000} segments={segments} />,
      );
    });

    expect(container.querySelector('[data-testid="apm-trace-timeline-bar"]')).not.toBeNull();
    expect(container.textContent).toContain(
      "deviceAutomation.performance.timeline.traceOffset",
    );
  });

  it("点击 segment 触发 onSelectArtifact", async () => {
    const onSelectArtifact = vi.fn();
    await act(async () => {
      root.render(
        <ApmTraceTimelineBar
          sessionDurationMs={120_000}
          segments={segments}
          onSelectArtifact={onSelectArtifact}
        />,
      );
    });

    const segment = container.querySelector(
      '[data-testid="apm-trace-timeline-segment-trace-a"]',
    ) as HTMLButtonElement | null;
    expect(segment).not.toBeNull();

    await act(async () => {
      segment?.click();
    });

    expect(onSelectArtifact).toHaveBeenCalledWith("trace-a");
  });
});
