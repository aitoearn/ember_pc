# 测试用例管理页面 · 设计 Spec

- 日期：2026-06-17
- 分支：`feature/test-case-management`
- 状态：设计已确认，待写实现计划（writing-plans）

## 1. 背景与目标

为 ember 桌面端新增「测试用例管理」页面，提供测试用例的结构化管理、AI 辅助生成、以及与现有设备自动化（VLM ReAct Agent）联动的「软断言」执行能力。字段模型综合自多个参考库（ntest / AITestPlatform / tester-skills / SKills-To-TestCase / test-generator 等）的共识最小集。

设计参考库目录（仅参考字段模型与交互，不直接复用代码）：
`ai-case-generator-demo`、`testpoint-testcases_generate_skill`、`AI-driven-test-automation-platform`、`ntest`、`AITestPlatform`、`SKills-To-TestCase`、`tester-skills`、`AIGenerateTestCase`、`test-generator`、`AITestingAgent`、`Smart-AI-Bot`。

## 2. 已确认的关键决策

| 决策点 | 结论 |
| --- | --- |
| 持久化 | **App Server / Rust + SQLite（`ember.db`）**，按 workspace 隔离；不用 localStorage |
| 用例组织 | **树形模块（项目→模块→子模块）+ 标签** |
| AI 生成输入源 | **纯文本粘贴 + 本地 md/txt + 本地 docx/pdf + URL 链接**（不含图片、不含知识库） |
| AI 生成入库流程 | **生成 → 草稿列表预览（逐条勾选/编辑/删）→ 批量入库** |
| 执行模型 | **软断言**：结构化用例转自然语言指令，交设备 VLM ReAct Agent 自评，无原生硬断言 |
| 实施路径 | **方案 B · 分期纵切**：1a 后端底座+CRUD/树 → 1b AI 生成 → 1c 执行桥+历史 |
| 第一可交付范围 | CRUD+模块树+筛选/搜索/批量、AI 生成、执行桥、执行结果回写+历史；**导入/导出（Excel/JSON）延后** |

## 3. 架构分层

```
前端 React (src/features/test-case-management/)
  └─ AppServerClient.request(method, params)
      └─ app_server_handle_json_lines (统一 IPC 桥，无需新增 channel)
          └─ App Server JSON-RPC (ember-rs/crates/app-server*)
              └─ rusqlite → ember.db (ember-rs/crates/core)
```

新增领域 store 照现成模板画瓢：持久化层照 `gallery_material`（DAO + local_data_source），协议注册照 `workspace` / `voiceInstruction`，前端照 `project.ts` / `asrProvider.ts`。Electron 侧无需为新方法加 IPC channel（已有 `app_server_handle_json_lines` 通用桥）。

## 4. 数据模型（SQLite）

复用 `src/features/test-case-management/types.ts` 既有类型。Rust 侧在 `app-server-protocol` 定义对齐的 camelCase 类型。

```sql
-- Phase 1a
CREATE TABLE IF NOT EXISTS test_case_modules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,            -- 业务编号 TC-{模块缩写}-{序号}，可手改
  title TEXT NOT NULL,
  module_id TEXT,
  priority TEXT NOT NULL DEFAULT 'P2',
  case_type TEXT NOT NULL DEFAULT '功能',
  status TEXT NOT NULL DEFAULT '草稿',
  source TEXT NOT NULL DEFAULT '手工',
  precondition TEXT DEFAULT '',
  steps_json TEXT NOT NULL DEFAULT '[]',  -- TestCaseStep[]
  tags_json TEXT NOT NULL DEFAULT '[]',   -- string[]
  exec_result TEXT NOT NULL DEFAULT '未执行',
  remark TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Phase 1c
CREATE TABLE IF NOT EXISTS test_case_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,            -- 关联 test_cases.id
  device_id TEXT,
  instruction TEXT,                 -- 拼装出的自然语言指令
  result TEXT NOT NULL DEFAULT '阻塞',  -- 通过/失败/阻塞
  summary TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS test_case_run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,             -- 关联 test_case_runs.id
  step_no INTEGER NOT NULL,
  observation TEXT,
  screenshot_path TEXT,
  ts INTEGER NOT NULL
);
```

设计说明：
- `steps` / `tags` 用 JSON 列整存整取（查询少），照 `workspaces.settings_json` 惯例。
- 所有表带 `workspace_id`，用例与模块按当前 workspace 隔离。
- `caseId` 自动生成、可手改；`exec_result` 存「最近一次结果」，完整历史在 `test_case_runs`。

## 5. JSON-RPC 方法面

Wire 命名 camelCase `domain/action`，Rust 常量 `METHOD_{DOMAIN}_{ACTION}`。

```
Phase 1a
  testCase/list           // workspaceId + 可选 moduleId
  testCase/read           // id
  testCase/save           // upsert（id 存在则更新）
  testCase/delete         // id（支持批量：ids[]）
  testCaseModule/list     // workspaceId
  testCaseModule/save     // upsert
  testCaseModule/delete   // id（级联策略：子模块上提/拒绝删非空，实现时定）

Phase 1c
  testCaseRun/start       // caseId + deviceId → 拼指令、调 uiAgent、落 run
  testCaseRun/list        // caseId → 历史列表
  testCaseRun/read        // runId → 含 run_steps
```

复杂筛选/分组/统计放前端 ViewModel 纯函数，后端只做按 workspace/module 的粗过滤。

## 6. 前端结构

```
src/features/test-case-management/
  types.ts                       已有
  api.ts                         封装 testCase/* / testCaseModule/* / testCaseRun/* 调用
  viewModel/
    filterCases.ts               关键词 + 多维筛选纯函数
    groupByModule.ts             按模块树分组
    computeStats.ts              统计摘要
    validateCase.ts              保存前校验
    aiDraftParse.ts              1b：LLM 输出 → TestCase[] 解析/容错
    buildInstruction.ts          1c：用例 → 自然语言指令拼装
  hooks/
    useTestCaseStore.ts          加载/CRUD/乐观更新
  components/
    TestCaseManagementPage.tsx   页面骨架（三栏布局）
    ModuleTree.tsx               左：模块树
    TestCaseTable.tsx            中：表格 + 批量操作
    TestCaseDetailDrawer.tsx     右：详情/编辑
    AiGenerationPanel.tsx        1b：生成面板
    ExecutionDrawer.tsx          1c：执行 + 历史
```

测试分层（遵循 AGENTS.md「前端新代码先守住测试分层」）：
- 业务逻辑（筛选/分组/统计/校验/解析/指令拼装）抽 ViewModel 纯函数，`*.unit.test.ts` 覆盖。
- `*.test.tsx` 只测渲染、事件接线、关键回归。

## 7. 页面接线

- `src/types/page.ts`：`Page` 联合类型加 `"test-case-management"`，必要时加 `PageParams`。
- `src/components/AppPageContent.tsx`：分发到 `TestCaseManagementPage`。
- `src/lib/navigation/sidebarNav.ts` + `AppSidebar.constants.ts`：加侧边栏项。
- i18n 五语言（`zh-CN / zh-TW / en-US / ja-JP / ko-KR`）：`navigation.json` 加导航文案 + 新建 `testCaseManagement.json` namespace（页面内文案），登记 `bundledNamespaceParts.ts` 与 `types.d.ts`。

## 8. AI 生成契约（Phase 1b）

- 模型选择：复用 `ModelSelector` + `useConfiguredProviders`，`workspaceId` 取 `requireDefaultProjectId()`。
- LLM 调用：复用 `themeContextSearch.ts` 的一次性 `AppServerClient.request` 模式（不引新后端方法，能复用则复用）。
- 流程：输入源 → 拼 prompt 模板（角色=资深测试设计专家，要求输出严格 JSON 数组）→ LLM → `aiDraftParse.ts` 容错解析为 `TestCase[]` 草稿 → 草稿列表预览（逐条勾选/编辑/删）→ 批量 `testCase/save`（`source=AI生成`，`status=草稿`）。
- 文件解析取舍：
  - md / txt：前端直读纯文本。
  - docx / pdf：前端引库（`mammoth` / `pdfjs-dist`）。
  - URL 抓取：优先走 App Server（前端跨域受限、且符合后端边界）。**待定细节**：若 URL 抓取实现成本过高，1b 降级为「先贴正文文本」，URL 入口移到后续阶段（实现计划中给出明确退出条件）。

## 9. 执行桥契约（Phase 1c · 软断言）

设备执行能力沿用现有 `device-automation`：自然语言驱动的 VLM ReAct Agent，无原生结构化步骤执行与硬断言。

指令拼装（`buildInstruction.ts`）：

```
前置条件：{precondition}

请依次执行以下操作：
1. {steps[0].action}
2. {steps[1].action}
...

通过条件（请逐项自检并说明是否满足）：
1. {steps[0].expected}
2. {steps[1].expected}
...
```

执行流：`testCaseRun/start`(caseId, deviceId) → 拼指令 → 调 `uiAgent.ui_agent_start` → 消费 `UiAgentEvent` 事件流（截图落 `test_case_run_steps.screenshot_path`）→ Agent 自评判定 通过/失败/阻塞 → 落 `test_case_runs` + 回写 `test_cases.exec_result`。

局限（写入 spec 以管理预期）：软断言由 VLM 自评，非确定性，结果可解释但不保证逐字符精确；阻塞态用于设备/Agent 异常。

## 10. 协议四侧同步（新增方法的改动点）

每个新 JSON-RPC 方法需同步：
1. Rust 协议：`app-server-protocol` 的 `protocol/v0/test_cases.rs`（类型）+ `method_names.rs` + `catalog.rs` + `schema_types.rs` + `schema_export/registry.rs`。
2. Rust 实现：`core` 的 `schema.rs`（建表）+ `dao/test_case_dao.rs`；`app-server` 的 `local_data_source/test_cases.rs` + `local_data_source.rs` + `runtime.rs` + `processor/test_cases.rs` + `processor/mod.rs`（match arm）。
3. 前端 client：`packages/app-server-client/src/protocol.ts`（METHOD 常量 + `APP_SERVER_METHODS`）+ `index.ts` + `src/lib/api/appServer.ts`。
4. DevBridge 策略：`src/lib/dev-bridge/commandPolicy.ts` 的 `APP_SERVER_CURRENT_METHODS`。
5. 类型生成：`npm run generate:protocol-types`。
6. 契约测试：`scripts/check-app-server-client-contract.mjs` 加 testCase 跨文件 spec。

Electron 侧（`preload.ts` / `main.ts` / `ipcChannels.ts`）无需改动——复用 `app_server_handle_json_lines` 通用桥。

## 11. 测试策略

- Rust：`test_case_dao.rs` 内 `#[cfg(test)]`（in-memory db）+ `local_data_source/tests.rs` 集成测，照 `gallery_material_dao` / 现有 `tests.rs`。
- 契约：`npm run test:contracts`（含新增 testCase spec）。
- 前端：ViewModel `*.unit.test.ts`；`api.test.ts` mock `AppServerClient.request`（照 `project.test.ts`）；页面路由注册测试。
- 收尾：`npm run verify:local` + 受影响 Rust 定向测试；GUI 改动跑 `npm run verify:gui-smoke`。

## 12. 分期交付边界与验收

| 阶段 | 内容 | 可交付（验收点） |
| --- | --- | --- |
| 1a | 表+DAO+CRUD 方法+协议四侧+client+CRUD/树/筛选/批量 UI+路由+i18n | 能建/查/改/删用例与模块，刷新后持久化 |
| 1b | AI 生成面板（文本/文件/URL → 草稿预览 → 入库） | 从需求输入生成草稿并批量入库 |
| 1c | 执行桥 + 执行结果回写 + 历史 | 选设备跑用例、回写结果、查看历史与截图 |

每阶段独立落 `docs/exec-plans/`，超过一轮的实现持续更新进度日志。

## 13. 明确不做（YAGNI / 延后）

- 导入/导出（Excel / JSON）：延后到 1a–1c 之后。
- 图片截图作为 AI 输入源、知识库作为输入源：本期不做。
- 硬断言 / 结构化步骤逐步执行：受执行模型限制，本期只做软断言。
- 多人协作、评审流转工作流：本期只保留 `status` 字段，不做流程引擎。
