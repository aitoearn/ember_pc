import { describe, expect, it } from "vitest";
import {
  isHiddenConversationArtifactPath,
  isHiddenInternalArtifactPath,
} from "./internalArtifactVisibility";

describe("isHiddenInternalArtifactPath", () => {
  it("应隐藏 .ember/tasks 下的内部任务快照 JSON", () => {
    expect(
      isHiddenInternalArtifactPath(
        ".ember/tasks/image_generate/task-image-1.json",
      ),
    ).toBe(true);
    expect(
      isHiddenInternalArtifactPath(
        "/workspace/demo/.ember/tasks/image_generate/task-image-1.json",
      ),
    ).toBe(true);
  });

  it("不应隐藏用户可消费的正式产物", () => {
    expect(
      isHiddenInternalArtifactPath("content-posts/demo.publish-pack.json"),
    ).toBe(false);
    expect(
      isHiddenInternalArtifactPath(
        ".ember/artifacts/thread-1/report.artifact.json",
      ),
    ).toBe(false);
    expect(isHiddenInternalArtifactPath("content-posts/demo-cover.png")).toBe(
      false,
    );
  });

  it("聊天区应隐藏 .ember/artifacts 下的内部 artifact 文稿 JSON", () => {
    expect(
      isHiddenConversationArtifactPath(
        ".ember/artifacts/thread-1/report.artifact.json",
      ),
    ).toBe(true);
    expect(
      isHiddenConversationArtifactPath(
        "/workspace/demo/.ember/artifacts/thread-1/report.artifact.json",
      ),
    ).toBe(true);
    expect(
      isHiddenConversationArtifactPath("content-posts/demo.publish-pack.json"),
    ).toBe(false);
    expect(
      isHiddenConversationArtifactPath("exports/x-article/google/index.md"),
    ).toBe(false);
  });

  it("聊天区应隐藏辅助运行时投影工件", () => {
    expect(
      isHiddenConversationArtifactPath(
        ".ember/harness/sessions/session-1/auxiliary-runtime/title-generation-aux-1.json",
      ),
    ).toBe(true);
    expect(
      isHiddenConversationArtifactPath(
        "/workspace/demo/.ember/harness/sessions/session-1/auxiliary-runtime/title-generation-aux-1.json",
      ),
    ).toBe(true);
    expect(
      isHiddenConversationArtifactPath(
        ".ember/harness/sessions/session-1/evidence/runtime.json",
      ),
    ).toBe(false);
  });
});
