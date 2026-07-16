import { describe, expect, it } from "vitest";
import { frameTargetFromJankHighlight } from "./jankHighlightTarget";

describe("frameTargetFromJankHighlight", () => {
  it("从 highlight 构造 frameTarget", () => {
    expect(
      frameTargetFromJankHighlight({
        tsNs: 1_000_000,
        frameMs: 20,
        frameId: 3,
      }),
    ).toEqual({
      frameId: 3,
      startTsNs: 1_000_000,
      endTsNs: 1_000_000 + 20 * 1e6,
    });
  });

  it("无 tsNs 时返回 null", () => {
    expect(frameTargetFromJankHighlight({ frameMs: 20 })).toBeNull();
  });
});
