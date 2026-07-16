# Lime 框架升级 · 进度日志

> 主计划：[`lime-framework-upgrade-plan.md`](./lime-framework-upgrade-plan.md)  
> 分支：`feature/lime-framework-upgrade`  
> Fork 基点：Lime `2cf98aa`（v1.66.0）  
> 目标基线：Lime v1.104.0

## 当前状态摘要

| 项 | 值 |
| --- | --- |
| 整体进度 | **35%**（工作区已覆盖 Lime A–D 63–79%；待冻结区 restore + 验证收口） |
| 当前阶段 | **全批次收口**（非从零 apply） |
| 阻塞项 | Harness 冻结区被触碰；`verify:app-version` 1.0.0 vs 1.104.0 |
| M0.5 | ✅ `lime-framework:m05-smoke` + T5 adb |

---

## 进度记录

### 2026-07-16 · M0.5 验收 + M0 工具补齐

- [x] `deviceAutomationHost.ts` facade（从 `hostCommands`/`main.ts` 抽出 device 段，利于 Batch D 段式合并）
- [x] `lime-framework:m05-smoke` 门禁（vitest + 可选 T5 adb）
- [x] Layer 2 备份：`docs/exec-plans/artifacts/layer2-freeze-2026-07-16.tar.gz`（91 路径，~7.4MB）
- [x] 合入工具：`filter-lime-batch-patch.mjs`、`apply-lime-batch-patch.mjs`、`backup-layer2-freeze.mjs`
- [x] T5 `smoke:perf-monitor-adb` 真机通过（设备 `2NX0225211000873`）
- [x] 工作区盘点：`lime-framework:inventory` → Batch A 78.8% / B 62.3% / C 66.3% / D 73.2% 已覆盖
- [x] Harness 冻结区 restore（35 跟踪文件 + 2 未跟踪删除）
- [x] `lime-framework:check-freeze` 通过（2133 路径）
- [ ] 版本一致性 `verify:app-version`（`package.json` 1.0.0 vs `ember-rs` 1.104.0）
- [ ] `verify:local` 收口

### 2026-07-16 · M0 方案落盘 + 分析修订

- [x] 确认 Fork 基点：`2cf98aa9034e64142e2387b6ce05495277b49919`（Lime v1.66.0）
- [x] 对比 Lime `2cf98aa..HEAD` 变更规模，划定 Layer 2 冻结区
- [x] 编写分批升级计划（Batch A–D）
- [x] 落盘主方案：`docs/exec-plans/lime-framework-upgrade-plan.md`
- [x] 落盘冻结清单：`docs/exec-plans/lime-framework-upgrade-freeze-manifest.json`
- [x] speckit-analyze 风格评审（16 项发现，3 Critical）
- [x] 修订 G2 / ADR-08/09 / M0.5 前置 / 批次 SHA
- [x] 生成差异清单：`lime-framework-upgrade-diff-inventory.md`
- [x] Host 接线审计：`lime-framework-upgrade-host-wiring-audit.md`
- [x] 占位：plugin-mapping、aster-migration 设计页
- [x] 合入对齐脚本：`scripts/lime-framework-upgrade/`（check-freeze + export-patch）
- [ ] Batch A 执行（待工作区收口）

---

## 阶段检查表

### M0.5：Host 接线（Batch A 前置）

| 项 | 状态 |
| --- | --- |
| 审计文档落盘 | ✅ |
| `ipcChannels.ts` 注册 device 命令 | ✅ |
| `deviceAutomationHost.ts` dispatch → runtime | ✅ |
| `commandPolicy.ts` 登记 | ✅ |
| `main.ts` 事件 broadcast + adb watcher | ✅ |
| `lime-framework:m05-smoke` | ✅ |
| T5 perf adb | ✅ |

### Batch A：v1.67 → v1.80

| 项 | 状态 |
| --- | --- |
| M0.5 已完成 | ✅ |
| Layer 2 tarball 备份 | ✅ |
| 过滤/应用脚本就绪 | ✅ |
| 盲 `git apply` 合入 | ⬜ 阻断：工作区已分叉 |
| 版本 `verify:app-version` | ⬜ |
| L1–L2 验证 | ⬜ |
| T1/T2/T6 冒烟 | ⬜ |

### Batch B：v1.80 → v1.90

| 项 | 状态 |
| --- | --- |
| 合入 Plugin UI + content-factory | ⬜ |
| 合入 Agent Chat 局部 + src/lib | ⬜ |
| [`plugin-mapping.md`](./lime-framework-upgrade-plugin-mapping.md) 填完 | ⬜ |
| L1–L5 验证 | ⬜ |
| T1–T9 冒烟 | ⬜ |

### Batch C：v1.90 → v1.100

| 项 | 状态 |
| --- | --- |
| 合入 ember-rs 主体（ember-rs 映射） | ⬜（工作区可能已部分超前） |
| 重挂载测试 Rust 模块 | ⬜ |
| `aiGeneration.ts` aster 迁移 | ⬜ |
| L1–L6 + Rust 单测 | ⬜ |

### Batch D：v1.100 → v1.104

| 项 | 状态 |
| --- | --- |
| Harness 适配 | ⬜ |
| hostCommands 段式合并（保留 device 段） | ⬜ |
| 全量回归 | ⬜ |

---

## 下一刀（自主执行序）

1. **工作区盘点**：`git diff --stat` 按域分类，判定已合入批次边界
2. **版本对齐**：按实际批次将 `package.json` / `forge.config.mjs` / `ember-rs/Cargo.toml` 统一到同一 Release
3. **`lime-framework:check-freeze`**：确认脏改未破坏 Layer 2
4. **`verify:local` 子集**：typecheck + contracts + rust unit
5. **缺失域补合**：对未覆盖的 Batch A 路径做三路合并（非盲 apply）
