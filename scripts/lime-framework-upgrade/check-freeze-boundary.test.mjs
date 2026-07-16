import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findFreezeViolations,
  mapLimePathToEmber,
  parsePatchFilePaths,
} from "./lib/freeze-manifest.mjs";

describe("freeze-manifest 边界匹配", () => {
  it("目录前缀冻结 device-automation", () => {
    const { violations } = findFreezeViolations([
      "src/features/device-automation/monkey/hooks/useMonkeyTest.ts",
    ]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].reason, "directory");
  });

  it("glob 冻结 Harness 组件", () => {
    const { violations } = findFreezeViolations([
      "src/components/agent/chat/components/HarnessReplayCaseCard.tsx",
    ]);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].reason, "glob");
  });

  it("lime-rs 路径映射为 ember-rs 后匹配测试 Rust 模块", () => {
    const { violations } = findFreezeViolations(
      ["lime-rs/crates/app-server/src/processor/test_cases.rs"],
      { mapLimeRs: true },
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0].path, "ember-rs/crates/app-server/src/processor/test_cases.rs");
    assert.equal(violations[0].sourcePath, "lime-rs/crates/app-server/src/processor/test_cases.rs");
  });

  it("非冻结路径不报错", () => {
    const { violations } = findFreezeViolations([
      "src/features/plugin/ui/PluginsPage.tsx",
      "packages/app-server-client/src/index.ts",
    ]);
    assert.equal(violations.length, 0);
  });

  it("mapLimePathToEmber 只替换顶层目录", () => {
    assert.equal(
      mapLimePathToEmber("lime-rs/crates/agent/src/lib.rs"),
      "ember-rs/crates/agent/src/lib.rs",
    );
    assert.equal(mapLimePathToEmber("src/lib/foo.ts"), "src/lib/foo.ts");
  });
});

describe("parsePatchFilePaths", () => {
  it("解析 git diff 路径", () => {
    const patch = `diff --git a/lime-rs/Cargo.toml b/lime-rs/Cargo.toml
--- a/lime-rs/Cargo.toml
+++ b/lime-rs/Cargo.toml
diff --git a/src/features/device-automation/foo.ts b/src/features/device-automation/foo.ts
--- a/src/features/device-automation/foo.ts
+++ b/src/features/device-automation/foo.ts
`;
    const paths = parsePatchFilePaths(patch);
    assert.ok(paths.includes("lime-rs/Cargo.toml"));
    assert.ok(paths.includes("src/features/device-automation/foo.ts"));
  });
});
