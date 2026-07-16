import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PerformanceSession, PerformanceTraceArtifact } from "../types";
import { PerformanceSessionSummaryModal } from "./PerformanceSessionSummaryModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockListArtifacts = vi.fn();

vi.mock("@/lib/api/deviceAutomationPerformance", () => ({
  listPerformanceTraceArtifacts: (...args: unknown[]) => mockListArtifacts(...args),
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const session: PerformanceSession = {
  id: "sess-apm-1",
  workspaceId: "ws-1",
  deviceId: "dev-1",
  devicePlatform: "android",
  packageName: "com.demo.app",
  metrics: ["cpu"],
  intervalMs: 1000,
  status: "stopped",
  startedAt: "2026-06-17T00:00:00.000Z",
  stoppedAt: "2026-06-17T00:01:00.000Z",
  summary: null,
};

describe("PerformanceSessionSummaryModal", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockListArtifacts.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("打开时按 linkedSessionId 加载关联 Trace", async () => {
    const linkedArtifact: PerformanceTraceArtifact = {
      id: "trace-linked",
      workspaceId: "ws-1",
      linkedSessionId: "sess-apm-1",
      deviceId: "dev-1",
      devicePlatform: "android",
      packageName: "com.demo.app",
      presetId: "scroll_jank",
      configJson: null,
      localPath: "/tmp/trace.perfetto-trace",
      remotePath: null,
      sizeBytes: 1024,
      durationMs: 5000,
      status: "ready",
      errorMessage: null,
      createdAt: "2026-06-17T00:00:05.000Z",
      stoppedAt: "2026-06-17T00:00:10.000Z",
    };
    mockListArtifacts.mockResolvedValueOnce([linkedArtifact]);

    await act(async () => {
      root.render(
        <PerformanceSessionSummaryModal
          session={session}
          workspaceId="ws-1"
          open
          onOpenChange={vi.fn()}
          onOpenLinkedTrace={vi.fn()}
        />,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListArtifacts).toHaveBeenCalledWith("ws-1", {
      linkedSessionId: "sess-apm-1",
    });
    expect(
      document.querySelector('[data-testid="performance-open-linked-trace-trace-linked"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-testid="apm-trace-timeline-bar"]')).not.toBeNull();
  });
});
