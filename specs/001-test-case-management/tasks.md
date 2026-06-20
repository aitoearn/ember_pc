---
description: "Task list for 测试用例管理 implementation"
---

# Tasks: 测试用例管理

**Input**: Design documents from `specs/001-test-case-management/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 包含测试任务——仓库治理（AGENTS.md「前端测试分层」「协议改动必须 test:contracts」「Rust 变更先小测」）强制要求。

**Organization**: 按用户故事分组（US1=P1 底座 / US2=P2 AI 生成 / US3=P3 执行追溯），每个故事可独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: US1 / US2 / US3
- 路径基于 plan.md「Source Code」结构

---

## Phase 1: Setup（共享基础）

- [ ] T001 在 `internal/exec-plans/test-case-management.md` 登记三期执行计划与进度日志入口
- [ ] T002 [P] 核对 `src/features/test-case-management/types.ts` 与 `data-model.md` 字段一致，补齐缺失类型（TestCaseRun / TestCaseRunStep）

---

## Phase 2: Foundational（阻塞性前置，所有故事开始前必须完成）

**⚠️ CRITICAL**: 页面壳与协议骨架是三个故事共用的接入点。

- [ ] T003 在 `src/types/page.ts` 的 `Page` 联合类型加入 `"test-case-management"`（及必要 `PageParams`）
- [ ] T004 在 `src/components/AppPageContent.tsx` 增加分发占位页 `TestCaseManagementPage`
- [ ] T005 [P] 在 `src/lib/navigation/sidebarNav.ts` 与 `src/components/app-sidebar/AppSidebar.constants.ts` 增加侧边栏入口
- [ ] T006 [P] i18n 五语言脚手架：新建 `src/i18n/resources/{zh-CN,zh-TW,en-US,ja-JP,ko-KR}/testCaseManagement.json` + 各 `navigation.json` 增项，并登记 `src/i18n/bundledNamespaceParts.ts` 与 `src/i18n/types.d.ts`
- [ ] T007 新建 Rust 协议骨架 `ember-rs/crates/app-server-protocol/src/protocol/v0/test_cases.rs`，并在 `protocol/v0.rs` 注册 `mod test_cases; pub use test_cases::*;`
- [ ] T008 新建前端 `src/features/test-case-management/api.ts` 骨架，并在 `src/lib/api/appServer.ts` 预留 client 方法接线点
- [ ] T009 在 `scripts/check-app-server-client-contract.mjs` 预留 testCase 跨文件 spec 段（先标 TODO 断言，US1 填充）

**Checkpoint**: 页面可空载渲染、五语言入口可见、协议骨架就位。

---

## Phase 3: User Story 1 - 用例结构化管理底座 (P1) 🎯 MVP

**Goal**: 模块树 + 用例 CRUD + 多维筛选/搜索 + 批量操作 + 持久化。

**Independent Test**: 新建模块与用例、改字段、组合筛选、批量改状态、删除，重启后数据仍在；caseId 冲突被拒、删非空模块被拒。

### Tests for User Story 1 ⚠️（先写并确保失败）

- [ ] T010 [P] [US1] Rust DAO 单测 `ember-rs/crates/core/src/database/dao/test_case_dao.rs`（`#[cfg(test)]`，in-memory db，覆盖 upsert/list/delete + caseId 唯一冲突 + 非空模块拒删）
- [ ] T011 [P] [US1] App Server 集成测 `ember-rs/crates/app-server/src/local_data_source/tests.rs`（testCase/testCaseModule 往返）
- [ ] T012 [P] [US1] 前端 ViewModel 单测：`src/features/test-case-management/viewModel/{filterCases,groupByModule,computeStats,validateCase}.unit.test.ts`
- [ ] T013 [P] [US1] `src/features/test-case-management/api.test.ts`（mock `AppServerClient.request`，断言方法名与参数）

### Implementation for User Story 1

- [ ] T014 [US1] `ember-rs/crates/core/src/database/schema.rs` 建表 `test_case_modules` + `test_cases` + `idx_test_cases_workspace_caseid` 唯一索引
- [ ] T015 [US1] 实现 `ember-rs/crates/core/src/database/dao/test_case_dao.rs`（list/save/delete modules & cases）并在 `dao/mod.rs` 导出
- [ ] T016 [US1] 协议补全：`method_names.rs`（`testCase/*`、`testCaseModule/*` 常量）+ `catalog.rs`（APP_SERVER_METHODS）+ `schema_types.rs` + `schema_export/registry.rs`，类型写入 `protocol/v0/test_cases.rs`
- [ ] T017 [US1] `ember-rs/crates/app-server/src/local_data_source/test_cases.rs`（protocol↔core 映射）+ 在 `local_data_source.rs` 注册 mod 与 AppDataSource impl 转发
- [ ] T018 [US1] `ember-rs/crates/app-server/src/runtime.rs` 增 AppDataSource trait 方法 + RuntimeCore pub 方法
- [ ] T019 [US1] `ember-rs/crates/app-server/src/processor/test_cases.rs` handler + `processor/mod.rs` match 接线
- [ ] T020 [US1] 运行 `npm run generate:protocol-types` 同步 `packages/app-server-client/src/generated/protocol-types.ts`
- [ ] T021 [P] [US1] `packages/app-server-client/src/protocol.ts`（METHOD 常量 + APP_SERVER_METHODS）+ `index.ts` client helper
- [ ] T022 [US1] 实现 `src/features/test-case-management/api.ts` 的 testCase/testCaseModule 调用（照 `src/lib/api/project.ts`）
- [ ] T023 [US1] `src/lib/dev-bridge/commandPolicy.ts` 的 `APP_SERVER_CURRENT_METHODS` 加入新方法
- [ ] T024 [P] [US1] 实现 ViewModel 纯函数 `viewModel/{filterCases,groupByModule,computeStats,validateCase}.ts`
- [ ] T025 [US1] `src/features/test-case-management/hooks/useTestCaseStore.ts`（加载/CRUD/乐观更新）
- [ ] T026 [P] [US1] `components/ModuleTree.tsx`（树 + 删非空模块拦截提示）
- [ ] T027 [P] [US1] `components/TestCaseTable.tsx`（筛选/搜索/多选批量）
- [ ] T028 [P] [US1] `components/TestCaseDetailDrawer.tsx`（详情/编辑 + caseId 冲突提示）
- [ ] T029 [US1] `components/TestCaseManagementPage.tsx` 三栏组装并替换 T004 占位
- [ ] T030 [US1] 填充 T009 的契约 spec 并通过 `npm run test:contracts`

**Checkpoint**: US1 可独立交付——能管理用例与模块并持久化。

---

## Phase 4: User Story 2 - AI 辅助生成用例 (P2)

**Goal**: 多来源输入 → 模型生成 → 草稿预览（勾选/编辑/删）→ 批量入库。

**Independent Test**: 粘贴需求文本生成草稿，编辑/删除部分，批量入库，列表出现来源=AI生成的用例。

### Tests for User Story 2 ⚠️

- [ ] T031 [P] [US2] `viewModel/aiDraftParse.unit.test.ts`（正常 JSON、格式错乱、空返回容错）

### Implementation for User Story 2

- [ ] T032 [US2] `viewModel/aiDraftParse.ts`（LLM 输出 → TestCase[] 容错解析）
- [ ] T033 [US2] 文件解析：md/txt 前端直读；docx/pdf 引库（`mammoth`/`pdfjs-dist`，`package.json` 加依赖并 `verify:app-version`）
- [ ] T034 [US2] URL 抓取走 App Server（新增轻量抓取方法）或按退出条件降级为「贴正文」（research R5）
- [ ] T035 [US2] prompt 模板拼装（角色=测试设计专家，输出严格 JSON；可选数量/类型注入，FR-008a）
- [ ] T036 [US2] `components/AiGenerationPanel.tsx`（ModelSelector + 输入源切换 + 可选数量/类型 + 生成触发）
- [ ] T037 [US2] 草稿列表预览（逐条勾选/编辑/删）+ 批量入库接 `testCase/save`（source=AI生成、status=草稿）
- [ ] T038 [P] [US2] `AiGenerationPanel.test.tsx`（渲染 + 入库接线）
- [ ] T039 [US2] 补 AI 生成相关五语言文案到 `testCaseManagement.json`

**Checkpoint**: US1 + US2 均可独立工作。

---

## Phase 5: User Story 3 - 用例执行与结果追溯 (P3)

**Goal**: 单条用例 → 自然语言指令 → 设备 VLM 智能体执行 → 判定回写 + 执行历史。

**Independent Test**: 对一条用例选设备执行，得到通过/失败/阻塞并回写，执行历史出现含截图的记录。

### Tests for User Story 3 ⚠️

- [ ] T040 [P] [US3] `viewModel/buildInstruction.unit.test.ts`（前置+步骤+「通过条件」拼装）
- [ ] T041 [P] [US3] `test_case_dao.rs` / `local_data_source/tests.rs` 扩展 testCaseRun 往返测试

### Implementation for User Story 3

- [ ] T042 [US3] `schema.rs` 建表 `test_case_runs` + `test_case_run_steps`
- [ ] T043 [US3] `dao/test_case_dao.rs` 扩展 run/run_step 的 start/list/read
- [ ] T044 [US3] 协议补 `testCaseRun/*`（method_names/catalog/types/schema/registry）+ 前端 protocol.ts/index.ts/commandPolicy + `generate:protocol-types`
- [ ] T045 [US3] `local_data_source/test_cases.rs`、`runtime.rs`、`processor/test_cases.rs` 增 testCaseRun 链路
- [ ] T046 [US3] `viewModel/buildInstruction.ts`（用例 → 自然语言指令）
- [ ] T047 [US3] 执行编排：`testCaseRun/start` 调 `uiAgent.ui_agent_start`、消费 `UiAgentEvent`、判定 通过/失败/阻塞、落 run(+steps)、回写 `test_cases.exec_result`（阻塞兜底）
- [ ] T048 [US3] `components/ExecutionDrawer.tsx`（选设备发起 + 实时过程 + 历史时间线 + 截图）
- [ ] T049 [P] [US3] `ExecutionDrawer.test.tsx`（渲染 + 接线）
- [ ] T050 [US3] 补执行相关五语言文案
- [ ] T051 [US3] 契约补 `testCaseRun` spec 并 `npm run test:contracts`

**Checkpoint**: 三个故事均可独立运行。

---

## Phase 6: Polish & Cross-Cutting

- [ ] T052 [P] 更新 `internal/exec-plans/test-case-management.md` 进度日志与完成度
- [ ] T053 运行 `npm run verify:local` + 受影响 Rust 定向测试（`cargo test --manifest-path "ember-rs/Cargo.toml"`）
- [ ] T054 运行 `npm run verify:gui-smoke`（GUI 改动）
- [ ] T055 按 `quickstart.md` 跑三期端到端验收回归

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（P1）→ Foundational（P2，阻塞所有故事）→ US1 → US2 → US3 → Polish
- US1 是 MVP；US2/US3 依赖 Foundational 完成，可在 US1 后增量交付。

### Within Each Story

- 测试先写并失败 → schema/DAO（model）→ 协议/local_data_source/runtime/processor（service）→ 前端 client/ViewModel/组件（endpoint/UI）→ 契约 spec。

### Parallel Opportunities

- T005/T006 可并行；US1 测试 T010-T013 可并行；前端组件 T026/T027/T028 可并行；ViewModel T024 与 client T021 可并行。

## Parallel Example: User Story 1

```bash
# 先并行写测试（应失败）：
Task: "Rust DAO 单测 test_case_dao.rs"
Task: "前端 ViewModel 单测 filterCases/groupByModule/computeStats/validateCase"
Task: "api.test.ts mock AppServerClient.request"

# 实现期并行 UI 组件：
Task: "ModuleTree.tsx"
Task: "TestCaseTable.tsx"
Task: "TestCaseDetailDrawer.tsx"
```

## Implementation Strategy

### MVP First（仅 US1）

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & 验证**（quickstart Phase 1a）→ 可演示。

### Incremental Delivery

Setup+Foundational → US1（MVP）→ US2 → US3，每期独立验收，不破坏前期。
