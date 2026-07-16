# Lime 框架升级 · 差异清单（M0）

> 生成基准：2026-07-16  
> Lime 路径：`/Users/lisq/project/agent/lime`  
> Fork 基点：`2cf98aa9034e64142e2387b6ce05495277b49919`（v1.66.0）  
> 主计划：[`lime-framework-upgrade-plan.md`](./lime-framework-upgrade-plan.md)

## 批次边界（tag → SHA）

| 批次 | 范围 | 起始 SHA | 结束 SHA | Release |
| --- | --- | --- | --- | --- |
| **A** | v1.66.0 → v1.80.0 | `2cf98aa` | `b95403785` | v1.67–v1.80 |
| **B** | v1.80.0 → v1.90.0 | `b95403785` | `10d9a2e0d` | v1.81–v1.90 |
| **C** | v1.90.0 → v1.100.0 | `10d9a2e0d` | `56e4e7d9a` | v1.91–v1.100 |
| **D** | v1.100.0 → v1.104.0 | `56e4e7d9a` | `d1ddadf5f` | v1.101–v1.104 |

完整 tag 序列（fork 后 38 个 Release）：`v1.67.0` … `v1.104.0`（见 Lime `git log 2cf98aa..HEAD --grep="Release v"`）。

## 各批次变更规模（Lime 侧）

### Batch A：`2cf98aa..b95403785`

| 目录 | 文件数 | +/− 行（约） |
| --- | --- | --- |
| `packages/` | 86 | +19k / −7k |
| `src/lib/` | 174 | +23k / −12k |
| `src/components/agent/` | 865 | +167k / −58k |
| `ember-rs/` | 752 | +157k / −51k |
| `electron/` | 23 | +6k / −1k |
| `scripts/` | 103 | +37k / −6k |

**主题**：Projection Store 初版、Plugin 一级产品、内容工厂 dogfood、构建管线。

### Batch B：`b95403785..10d9a2e0d`

| 目录 | 文件数 | +/− 行（约） |
| --- | --- | --- |
| `packages/` | 18 | +6k / −1k |
| `src/lib/` | 148 | +21k / −4k |
| `src/components/agent/` | 597 | +60k / −15k |
| `ember-rs/` | 1178 | +97k / −46k |
| `electron/` | 28 | +7k / −5k |
| `scripts/` | 160 | +21k / −13k |

**主题**：Plugin Marketplace、Claw composer 插件激活、Soul/风格、Workspace 模块化。

### Batch C：`10d9a2e0d..56e4e7d9a`

| 目录 | 文件数 | +/− 行（约） |
| --- | --- | --- |
| `packages/` | 114 | +36k / −5k |
| `src/lib/` | 238 | +35k / −18k |
| `src/components/agent/` | 742 | +73k / −30k |
| `ember-rs/` | 1298 | +113k / **−370k** |
| `electron/` | 13 | +0.8k / −0.1k |
| `scripts/` | 240 | +61k / −7k |

**主题**：Aster 下线、Agent Runtime 收口、Codex Thread/Turn/Item。**净删最大批次。**

### Batch D：`56e4e7d9a..d1ddadf5f`

| 目录 | 文件数 | +/− 行（约） |
| --- | --- | --- |
| `packages/` | 39 | +2k / −2k |
| `src/lib/` | 123 | +7k / −4k |
| `src/components/agent/` | 443 | +9k / −13k |
| `ember-rs/` | 408 | +76k / −34k |
| `electron/` | 4 | +0.5k / −0.03k |
| `scripts/` | 66 | +6k / −3k |

**主题**：canonical Item lifecycle、session_hydration 删除、Approval/read-model 统一。

## Ember 冻结区（Lime 侧零变更）

以下路径在 Lime `2cf98aa..HEAD` **无任何提交**：

- `perf_trace` / `test_case` / `device_flow`（Rust + schema）
- `src/features/device-automation/`
- `src/features/test-case-management/`
- `electron/deviceAutomation/`

证明：测试平台为 Ember fork 后 100% 独有增量。

## 合入命令模板

```bash
LIME=/Users/lisq/project/agent/lime
EMBER=/Users/lisq/ai/testplatform/ember_pc
MANIFEST=$EMBER/docs/exec-plans/lime-framework-upgrade-freeze-manifest.json

# 例：Batch A 文件清单
git -C "$LIME" diff --name-only 2cf98aa..b95403785 -- packages/ src/lib/

# 例：导出 patch（合入前排除 freeze 路径）
git -C "$LIME" diff 2cf98aa..b95403785 -- packages/ > /tmp/batch-a-packages.patch
npm run lime-framework:export-patch -- --batch A --check

# 路径映射：ember-rs → ember-rs（合入后手工替换路径与 crate 名）
# 品牌：@embercloud → @embercloud，Lime → Ember/熠测（保留 freeze-manifest brandKeep）
```

## ember-rs → ember-rs 映射（ADR-08）

| Lime | Ember | 动作 |
| --- | --- | --- |
| `ember-rs/Cargo.toml` | `ember-rs/Cargo.toml` | 合入后保留 `ember-rs` 路径，合并 workspace members |
| `ember-rs/crates/*` | `ember-rs/crates/*` | 目录对齐合入 |
| crate 名 `lime_*` | `ember_*` 或现有 crate 名 | 以 Ember `Cargo.toml` 为准，禁止引入 `@embercloud` |
| 测试模块 | `perf_trace` / `test_cases` / `device_flow` | **跳过 lime diff**，合入后 restore + 重挂 `mod.rs` |

## 合入后必查注册点（测试 Rust）

```
ember-rs/crates/app-server/src/lib.rs
ember-rs/crates/app-server/src/processor/mod.rs
ember-rs/crates/app-server/src/local_data_source/mod.rs
ember-rs/crates/app-server-protocol/src/protocol/v0/mod.rs
```

## 下一步

1. 完成 [M0.5 Host 接线审计](./lime-framework-upgrade-host-wiring-audit.md) 实施
2. Layer 2 tarball 备份（路径见 freeze-manifest）
3. 执行 Batch A 合入
