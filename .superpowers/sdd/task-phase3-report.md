# Phase 3–4 守门报告 · 稳定性保障

- **分支**: `feature/stability-assurance`（base `a8831f8`）
- **日期**: 2026-07-16
- **范围**: i18n 守门、定向测试、文档收口

## 状态

**完成** — Phase 3–4 守门项已落地；P1 功能链（Phase 0–2）已在先前提交完成，本提交仅质量与文档收口。

## 变更摘要

### Phase 3 · i18n

- 核对 `deviceAutomation.stability.*` 与 `deviceAutomation.tabs.stability-assurance`：组件所用 key 在 zh-CN / en-US 成对存在，结构一致。
- 压测（monkey）文案稳定性语境微调：
  - zh-CN：`monkey.subtitle` 补充 CRASH/ANR →「分析崩溃」指引。
  - en-US：`monkey.title` → Android stress test；start/openReport/platform/errors 对齐稳定性保障语境；subtitle 补充分析崩溃指引。

### Phase 3 · 测试

| 套件 | 结果 |
| --- | --- |
| `DeviceAutomationTabNav.test.tsx` | ✅ 3/3 |
| `stabilityAnalysisProjection.unit.test.ts` | ✅ 4/4 |
| `stabilityAnalysis.test.ts` | ✅ 4/4 |
| `ipcChannels.test.ts` | ✅ 5/5 |
| `preload.test.ts` | ✅ 13/13（修复 `__EMBER_ELECTRON__` 断言） |
| `node scripts/check-command-contracts.mjs` | ✅ 通过 |
| `npm run test:contracts`（全量） | ❌ 失败（无关） |

**未执行**: `npm run verify:local`（按任务说明跳过全量校验）。

### Phase 4 · 文档

- `quickstart.md`：去除本机 `file://` 硬编码路径，改为通用 sa-agent 前置说明。
- `tasks.md`：Phase 0–4 全部勾选完成。
- `plan.md`：进度日志追加 Phase 0–2、Phase 3–4 条目。
- 需求 Spec `2026-07-15-stability-assurance-design.md` 状态已为「设计已确认；实现计划见 plan.md」（无需再改）。

## test:contracts 失败说明（无关）

全量 `npm run test:contracts` 在 `check-app-server-client-contract` 阶段失败，与稳定性保障改动无关：

- 契约脚本引用 `lime-rs/crates/...` 路径，本仓库为 `ember-rs/crates/...`。
- 缺失 `docs/prd/next/implementation-roadmap.md` 等 Agent UI Runtime 文档引用。

**稳定性相关子检查已通过**：`check-command-contracts.mjs`（含 6 个 stability host 命令 + event）。

## 关注点

1. **全量 test:contracts / verify:local** 仍受仓库级契约漂移阻塞，合并前建议单独治理 `app-server-client-contract` 的 `lime-rs` 路径别名。
2. **GUI 冒烟** 本轮未跑；稳定性保障 Tab 需 Electron + 真机/sa-agent 手测验收。
3. **i18n** 仅 zh-CN / en-US（符合规则 05）；未改 zh-TW / ja-JP / ko-KR。
4. **preload 测试** 修复为 `__EMBER_ELECTRON__` 属品牌迁移遗留，非稳定性业务逻辑。

## 提交

见 git log 本条 commit message：`Phase 3-4 守门`。
