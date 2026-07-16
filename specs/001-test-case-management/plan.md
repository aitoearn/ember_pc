# Implementation Plan: 测试用例管理

**Branch**: `feature/test-case-management` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-test-case-management/spec.md`

**技术输入**: 复用既有技术设计 `docs/superpowers/specs/2026-06-17-test-case-management-design.md` 与探查结论（App Server 持久化模式）。

## Summary

为 ember 桌面端新增「测试用例管理」页面，分三期纵切交付：P1 用例管理底座（CRUD + 模块树 + 筛选/搜索/批量），P2 AI 辅助生成，P3 执行与结果追溯（软断言）。持久化走 App Server + SQLite（`ember.db`），按 workspace 隔离；前端走 React + ViewModel 纯函数分层；执行复用现有设备自动化（VLM ReAct）能力，把结构化用例转自然语言指令交智能体自评。

## Technical Context

**Language/Version**: TypeScript 5.x（前端 React）+ Rust（App Server，workspace manifest `ember-rs/Cargo.toml`）

**Primary Dependencies**: 前端 React + shadcn/Radix + i18next；后端 rusqlite（SQLite）；LLM 调用复用 `AppServerClient.request` + `themeContextSearch` 模式 + `ModelSelector`；执行复用 `uiAgent`（`ui_agent_start` / `UiAgentEvent`）；P2 文件解析候选 `mammoth`（docx）/`pdfjs-dist`（pdf）

**Storage**: SQLite（`ember.db`，路径经 `ember_core::app_paths` 系统 API 解析，macOS/Windows 双平台）；新增表 `test_case_modules` / `test_cases`（P1）、`test_case_runs` / `test_case_run_steps`（P3）

**Testing**: 前端 Vitest（`*.unit.test.ts` ViewModel 纯函数 + `*.test.tsx` 渲染接线 + `api.test.ts` mock `AppServerClient.request`）；Rust `cargo test`（DAO in-memory db + local_data_source 集成测）；契约 `npm run test:contracts`；收尾 `npm run verify:local` + `npm run verify:gui-smoke`

**Target Platform**: Electron 桌面应用（macOS + Windows 双平台）

**Project Type**: desktop-app（前端 renderer + Rust App Server 后端 + Electron host bridge）

**Performance Goals**: 数千条用例下筛选/分组/统计可感知等待 < 1s（SC-002）；复杂筛选在前端 ViewModel 内存计算

**Constraints**: 生产路径禁止 mock；协议改动四侧同步；用户可见文案五语言（zh-CN/zh-TW/en-US/ja-JP/ko-KR）；Electron 仅作 host bridge，新后端能力落 App Server crates；非生成代码文件接近 800 行预警、超 1000 行必拆

**Scale/Scope**: 单工作区数千条用例；3 期、约 28 个文件跨 5 个 crate + 前端 + 契约（详见 data-model.md / contracts/）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 为未填充模板，本功能治理约束以仓库 `AGENTS.md` 为事实源。对应硬规则的合规判断：

| 治理门（AGENTS.md） | 合规状态 | 说明 |
| --- | --- | --- |
| 新增 Agent/后端能力默认走 App Server（#11） | PASS | 持久化与方法落 `ember-rs/crates/app-server*` + `core`，Electron 不加业务 |
| 协议改动同步四侧 + `test:contracts`（工程硬规则#3） | PASS（计划纳入） | data-model/contracts 已列全部同步点，Phase 2 任务含契约 spec |
| 生产路径禁止 mock（#3） | PASS | 走真实 `AppServerClient.request`；mock 仅测试夹具 |
| 用户可见文案五语言（#10） | PASS（计划纳入） | 新建 `testCaseManagement` namespace + navigation 五语言 |
| 前端测试分层（工程硬规则#9） | PASS | 业务逻辑抽 ViewModel 纯函数 `*.unit.test.ts` |
| 代码体量边界（#3 基础约束） | PASS | 页面拆 ModuleTree/Table/Drawer/Panel 子组件，ViewModel 拆纯函数文件 |
| Rust crate 抗膨胀（#21） | PASS | 新建 `dao/test_case_dao.rs` + `local_data_source/test_cases.rs` 独立模块，不平铺进 core 中心文件 |
| Rust 构建走 workspace manifest（工程硬规则#13） | PASS | 所有 cargo 命令带 `--manifest-path "ember-rs/Cargo.toml"` |
| 长任务落执行计划（执行与路线图#6） | PASS（计划纳入） | 登记 `docs/exec-plans/`，分期进度日志 |

无未豁免违规，门通过。

## Project Structure

### Documentation (this feature)

```text
specs/001-test-case-management/
├── plan.md              # 本文件
├── research.md          # Phase 0：技术决策与备选
├── data-model.md        # Phase 1：实体 + SQLite schema + 方法面
├── quickstart.md        # Phase 1：分期验收/验证指引
├── contracts/           # Phase 1：JSON-RPC 方法契约
│   └── json-rpc-methods.md
├── checklists/
│   └── requirements.md  # 需求质量清单（specify/clarify 产出）
└── tasks.md             # Phase 2（/speckit-tasks 产出，本命令不创建）
```

### Source Code (repository root)

```text
# 前端（renderer）
src/features/test-case-management/
├── types.ts                      # 已有：领域类型
├── api.ts                        # testCase*/testCaseModule*/testCaseRun* 调用封装
├── viewModel/
│   ├── filterCases.ts            # 筛选纯函数（+ .unit.test.ts）
│   ├── groupByModule.ts          # 模块分组
│   ├── computeStats.ts           # 统计
│   ├── validateCase.ts           # 保存校验（含 caseId 唯一性提示）
│   ├── aiDraftParse.ts           # P2：LLM 输出 → TestCase[] 容错解析
│   └── buildInstruction.ts       # P3：用例 → 自然语言指令
├── hooks/useTestCaseStore.ts     # 加载/CRUD/乐观更新
└── components/
    ├── TestCaseManagementPage.tsx
    ├── ModuleTree.tsx
    ├── TestCaseTable.tsx
    ├── TestCaseDetailDrawer.tsx
    ├── AiGenerationPanel.tsx      # P2
    └── ExecutionDrawer.tsx        # P3

# 前端接线
src/types/page.ts                 # Page 联合类型加项
src/components/AppPageContent.tsx # 分发
src/lib/navigation/sidebarNav.ts + components/app-sidebar/AppSidebar.constants.ts
src/i18n/resources/<lang>/navigation.json + testCaseManagement.json（五语言）
src/i18n/bundledNamespaceParts.ts + types.d.ts

# 前端 client / 策略
packages/app-server-client/src/protocol.ts + index.ts
src/lib/api/appServer.ts
src/lib/dev-bridge/commandPolicy.ts

# Rust 协议
ember-rs/crates/app-server-protocol/src/protocol/v0/test_cases.rs（新）
ember-rs/crates/app-server-protocol/src/protocol/v0.rs / method_names.rs / catalog.rs / schema_types.rs
ember-rs/crates/app-server-protocol/src/schema_export/registry.rs

# Rust 持久化
ember-rs/crates/core/src/database/schema.rs（建表）
ember-rs/crates/core/src/database/dao/test_case_dao.rs（新）+ dao/mod.rs

# Rust App Server 实现
ember-rs/crates/app-server/src/local_data_source/test_cases.rs（新）+ local_data_source.rs
ember-rs/crates/app-server/src/runtime.rs
ember-rs/crates/app-server/src/processor/test_cases.rs（新）+ processor/mod.rs

# 契约测试
scripts/check-app-server-client-contract.mjs

# 执行计划
docs/exec-plans/<test-case-management>.md
```

**Structure Decision**: 沿用 ember 既有 feature-first 前端结构 + App Server 五层后端（protocol → processor → runtime → local_data_source → DAO/SQLite）。Electron host 复用 `app_server_handle_json_lines` 通用桥，无需新增 IPC channel。

## Complexity Tracking

> 无 Constitution 违规需豁免。下列为高复杂度区登记（非违规，仅风险提示）：

| 复杂点 | 风险 | 缓解 |
| --- | --- | --- |
| 协议四侧 + Rust 五层同步 | 漏改一侧导致契约测试红 | data-model/contracts 列全清单；Phase 2 任务逐侧拆分 + `test:contracts` 守门 |
| docx/pdf 解析、URL 抓取（P2） | 引库体积/跨域/解析失败 | md/txt 前端直读优先；URL 抓取走 App Server；失败降级为「贴正文」（spec Edge Cases 已含退出条件） |
| 执行软断言非确定性（P3） | 结果不稳定、用户预期偏差 | spec Assumptions 已明确软断言取舍；阻塞态兜底；保留过程观察与截图 |
