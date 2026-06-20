import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_UPDATE_BASE_URL,
  buildElectronUpdateFeedUploadPlan,
  updateFeedUrlForPlatform,
} from "./update-feed-core.mjs";

describe("update-feed-core", () => {
  it("默认更新基址应为 updates.aiearn.me", () => {
    expect(DEFAULT_UPDATE_BASE_URL).toBe("https://updates.aiearn.me");
  });

  it("应按平台生成 feed URL", () => {
    expect(updateFeedUrlForPlatform(undefined, "darwin", "arm64")).toBe(
      "https://updates.aiearn.me/ember/stable/darwin-arm64/RELEASES.json",
    );
    expect(updateFeedUrlForPlatform(undefined, "win32", "x64")).toBe(
      "https://updates.aiearn.me/ember/stable/win32-x64",
    );
  });

  it("上传计划应包含 current 与版本化路径", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "ember-update-feed-core-"),
    );
    const assetsDir = path.join(root, "release-assets");
    const feedDir = path.join(assetsDir, "aarch64-apple-darwin");
    fs.mkdirSync(feedDir, { recursive: true });
    fs.writeFileSync(path.join(feedDir, "RELEASES.json"), "{}");

    const plan = buildElectronUpdateFeedUploadPlan({
      assetsDir,
      version: "1.0.0",
    });

    expect(
      plan.some((item) => item.key === "ember/stable/darwin-arm64/RELEASES.json"),
    ).toBe(true);
    expect(
      plan.some(
        (item) => item.key === "ember/stable/v1.0.0/darwin-arm64/RELEASES.json",
      ),
    ).toBe(true);
  });
});
