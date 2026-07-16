import { describe, expect, it } from "vitest";
import type { PerformanceTraceArtifact } from "../types";
import { buildLinkedTraceCountBySessionId } from "./linkedTraceCounts";

function artifact(
  partial: Partial<PerformanceTraceArtifact> & Pick<PerformanceTraceArtifact, "id">,
): PerformanceTraceArtifact {
  return {
    workspaceId: "ws-1",
    linkedSessionId: null,
    deviceId: "dev-1",
    devicePlatform: "android",
    packageName: "com.demo",
    presetId: "scroll_jank",
    configJson: null,
    localPath: "/tmp/t.perfetto-trace",
    remotePath: null,
    sizeBytes: 1024,
    durationMs: 5000,
    status: "ready",
    errorMessage: null,
    createdAt: "2026-06-17T00:00:00.000Z",
    stoppedAt: null,
    ...partial,
  };
}

describe("buildLinkedTraceCountBySessionId", () => {
  it("仅统计 ready 且有关联 session 的 artifact", () => {
    const counts = buildLinkedTraceCountBySessionId([
      artifact({ id: "a1", linkedSessionId: "sess-1" }),
      artifact({ id: "a2", linkedSessionId: "sess-1" }),
      artifact({ id: "a3", linkedSessionId: "sess-2" }),
      artifact({ id: "a4", linkedSessionId: "sess-1", status: "recording" }),
      artifact({ id: "a5", linkedSessionId: null }),
    ]);
    expect(counts).toEqual({ "sess-1": 2, "sess-2": 1 });
  });
});
