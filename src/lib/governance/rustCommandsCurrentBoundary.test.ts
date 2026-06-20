/* global process */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

// 旧 Tauri wrapper 整目录 `ember-rs/src/**` 已于 2026-06-10 物理删除。
// 历史背景：该目录是脱离 cargo 构建图的孤儿目录（workspace 只含 `crates/*`，
// `src/` 没有 `lib.rs` / `main.rs` 也没有 `[package]` 段），曾沉积约 18.7 万行
// 与 113 个 `#[tauri::command]` 标注。删除后留下这条守卫，确保任何形式的回流
// 都被阻断：新 Rust 后端能力进入 `ember-rs/crates/*`（App Server / RuntimeCore /
// services），桌面壳能力进入 Electron Desktop Host。
//
// 治理收口：
// - `tauri-wrapper-quick-cleanup-queue.md` / `tauri-wrapper-command-inventory.md`
//   / `rust-commands-current-migration-cleanup-plan.md` 标记 `superseded`。
// - `scripts/check-app-server-client-contract.mjs` / `scripts/check-command-contracts.mjs`
//   不再以 `ember-rs/src/**` 文件作为正向 invariant 来源，仅保留负向回流守卫。
// - `AGENTS.md` 第 12、13 条精简为：`ember-rs/src/**` 已删除，新 Rust 代码进 crates。

const FORBIDDEN_LEGACY_PATHS = [
  "ember-rs/src",
  "ember-rs/src/commands",
  "ember-rs/src/services",
  "ember-rs/src/dev_bridge",
  "ember-rs/src/app",
  "ember-rs/src/agent",
  "ember-rs/src/agent_tools",
  "ember-rs/src/skills",
  "ember-rs/src/voice",
  "ember-rs/src/tray",
  "ember-rs/src/config",
  "ember-rs/src/theme",
  "ember-rs/src/tests",
  "ember-rs/src/dev_bridge.rs",
  "ember-rs/src/logger.rs",
  "ember-rs/src/profiling.rs",
  "ember-rs/src/crash_reporting.rs",
  "ember-rs/src/global_shortcut_guard.rs",
  "ember-rs/src/workspace_support.rs",
];

describe("rust commands current boundary", () => {
  it("`ember-rs/src/**` 旧 Tauri wrapper 目录及其子目录不应恢复", () => {
    const restored = FORBIDDEN_LEGACY_PATHS.filter((relativePath) =>
      existsSync(join(REPO_ROOT, relativePath)),
    );
    expect(restored, "禁止恢复 ember-rs/src/** 旧 Tauri wrapper 路径").toEqual([]);
  });
});
