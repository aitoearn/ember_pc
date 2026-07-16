# 测试用例管理 实施计划

> 状态：US1+US2+US3 MVP 全部落地（待提交）
> 规格目录：`specs/001-test-case-management/`（spec.md / plan.md / research.md / data-model.md / contracts/ / tasks.md）
> 前端特性目录：`src/features/test-case-management/`
> 更新时间：2026-06-17

## 1. 目标

在 Ember 桌面端新增「测试用例管理」页，分三期增量交付：

- **US1（P1，MVP）**：模块树 + 用例 CRUD + 多维筛选/搜索 + 批量操作 + App Server SQLite 持久化。
- **US2（P2）**：多来源输入 → 模型生成用例草稿 → 预览编辑 → 批量入库。
- **US3（P3）**：单条用例 → 自然语言指令 → 设备 VLM 智能体执行 → 判定回写 + 执行历史追溯。

## 2. 架构决策（冻结，详见 research.md）

| ID | 决策 |
| --- | --- |
| R1 | 持久化走 App Server SQLite（`ember.db`），照 workspaces 表惯例，`steps`/`tags` 用 JSON 列 |
| R2 | 数据访问层在 `core` 建 `test_case_dao.rs`（含 `#[cfg(test)]` in-memory 单测） |
| R3 | 协议走 JSON-RPC `testCase/*`、`testCaseModule/*`、`testCaseRun/*`，五层贯通 + 四侧同步 |
| R4 | `caseId` 工作区内唯一（FR-002a，唯一索引 + 保存校验冲突）；删模块仅空模块可删（FR-001a） |
| R5 | AI 一次性生成走 `AppServerClient.request` 直连 LLM（照 `themeContextSearch.ts`） |
| R6 | 执行走设备 VLM ReAct（`ui_agent_start`），用例 `expected` 转「通过条件」做软断言自评 |
| R7 | 筛选/分组/统计为前端纯函数 ViewModel，不落库；复杂逻辑用 `*.unit.test.ts` 覆盖 |

## 3. 阶段与任务

任务清单见 `specs/001-test-case-management/tasks.md`（T001–T055）。

- **Phase 1 Setup**：T001（本文件）、T002（types.ts 补 Run 类型）
- **Phase 2 Foundational**：T003–T009（页面/导航/i18n 壳 + 协议骨架 + api 骨架 + 契约脚手架）
- **Phase 3 US1（MVP）**：T010–T030
- **Phase 4 US2**：T031–T039
- **Phase 5 US3**：T040–T051
- **Phase 6 Polish**：T052–T055

## 4. 进度日志

- 2026-06-17：完成 spec-kit 全套设计工件（spec/clarify/plan/tasks），commit `ddf85f6e`。
- 2026-06-17：进入 `/speckit-implement`，实现 MVP（Setup + Foundational + US1）。
- 2026-06-17：US1 Rust 后端全链路打通（schema/DAO/协议/local_data_source/runtime/processor），Rust 测试 5 DAO + 4 集成全绿。
- 2026-06-17：US1 前端落地——
  - Foundational：`page.ts` 加 `test-case-management`、`AppPageContent` 分发、`sidebarNav`/`AppSidebar.constants` 入口、五语言 `testCaseManagement.json` + `navigation.json` 增项、`bundledNamespaceParts`/`types.d.ts` 注册命名空间。
  - client：`api.ts`（7 方法照 project.ts）、`commandPolicy` 加入 7 方法。
  - ViewModel：`filterCases`/`computeStats`/`groupByModule`/`validateCase` 纯函数 + 单测 11 例。
  - UI：`useTestCaseStore` hook、`ModuleTree`/`TestCaseTable`/`TestCaseDetailDrawer`/`TestCaseManagementPage` + feature `index.ts`。
  - 验证：前端 19 测全绿、`test:contracts` 的 client/command 契约通过、本特性 `tsc --noEmit` 无错误。
- **US1（MVP）完成度 100%**；剩余 US2（AI 生成）/US3（执行追溯）按计划增量推进。
- 2026-06-17：对标 AutoPilot 系列文章后做需求优化——
  - **数据模型调整**：`TestCase` 新增独立 `assertions: string[]`（断言/通过条件，与 `steps` 分离），贯穿五层：前端 `types.ts`、Rust 协议 `test_cases.rs`、`schema.rs`（建表列 + 历史库 `ALTER TABLE` 幂等补列 `assertions_json`）、`test_case_dao`（记录字段 + SQL 读写 + row 映射）、`local_data_source`（JSON↔protocol 双向映射）；重生 schema fixtures + `protocol-types.ts`（无漂移）。
  - **UI**：详情抽屉新增「断言/通过条件」动态列表区块；`createBlankCase` 补 `assertions: []`；`filterCases` 关键词搜索纳入断言；五语言文案补 `field.assertions*` / `assertion.*`。
  - **测试**：DAO 加 `assertions_json_round_trips`、集成测试 `case_round_trip_preserves_steps_assertions_and_timestamps` 断言往返、前端单测加断言关键词匹配；Rust（DAO 6 / 集成 4 / 协议 21+fixtures）全绿，前端单测 20 全绿，命令/客户端契约通过，本特性 `tsc` 无错。
  - **spec**：`data-model.md` 增 `assertions` 字段与 schema 列；`research.md` 增 R8（步骤/断言分离决策）与 Future 段（DAG 工作流 / 企业连接器 / 严格模式 / 双模型断言 为退出条件，Kernel/坐标/脚本编译/Monkey/性能/抓包 归 device-automation 范围外）。
  - 备注：`test:contracts` 中 `governance:electron-release-workflow` 失败为工作树既有 Electron 改动所致，与本特性无关。
- 2026-06-17：US2（AI 辅助生成用例）落地——
  - **容错解析（T031/T032）**：`viewModel/aiDraftParse.ts` 把 LLM 原始文本尽力解析为 `TestCase` 草稿数组（含 `assertions`）：剥离 Markdown 围栏、截取首个 JSON 数组/对象、支持 `{cases:[...]}` 包裹与字段别名、步骤可为字符串或对象、缺 `caseId` 自动生成占位编号、未知枚举回落默认值、空/非 JSON 返回可读 warning 且永不抛异常；草稿默认 `source=AI生成` / `status=草稿`。单测 7 例覆盖正常/围栏/前后噪声/别名/缺字段/空输入/空数组。
  - **生成调用（T035）**：`aiGeneration.ts` 复用 `themeContextSearch.ts` 的辅助会话模式（startSession→startTurn→readSession 取 assistant 文本），不新增后端 LLM 方法；`buildGenerationSystemPrompt`（测试设计专家角色）+ `buildGenerationPrompt`（严格 JSON 数组 schema、强调步骤/断言分离、可选数量/类型注入，FR-008a）抽为纯函数。
  - **面板（T036/T037）**：`components/AiGenerationPanel.tsx` 右侧滑出——`ModelSelector` 选模型 + 输入源（粘贴文本 / 上传 .md·.txt·.json 直读）+ 生成草稿 → 逐条勾选/编辑标题与编号/删除 → 批量入库；接 `useTestCaseStore.saveCase` 循环落库（来源=AI生成、状态=草稿）。页面头部加「AI 生成」入口按钮。
  - **i18n（T039）**：五语言补 `ai.*` 文案（入口/标题/模型/输入/上传/生成/入库/草稿计数/摘要/空结果等）。
  - **降级登记（T033/T034，us2-defer）**：docx/pdf 引库解析与 URL 抓取本期降级，仅支持 md/txt/json 文本直读与粘贴正文；面板 `uploadHint` 已对用户明示。退出条件：出现真实 docx/pdf/URL 接入需求时再引 `mammoth`/`pdfjs-dist` 或新增 App Server 轻量抓取方法（research R5 Future）。
  - **验证**：本特性前端测试 29 例全绿（含 `aiDraftParse.unit` 7 + `AiGenerationPanel.test` 2）；`npm run typecheck` 中本特性零错误（残留报错全在 `device-automation`/`lib/api/uiAgent.ts` 等既有文件）；`i18n:check` 中 `testCaseManagement` 命名空间 100% 覆盖（缺失键仅 `agentHome` 既有）。US2 未改协议，无需 `generate:protocol-types`。
- **US2 完成度 100%**；剩余 US3（执行追溯）按计划推进。整体（US1+US2+US3）完成度约 67%。
- 2026-06-17：US3（用例执行与追溯）落地——
  - **指令拼装（T040/T046）**：`viewModel/buildInstruction.ts` 把用例（标题/前置条件/编号步骤/断言）转成 VLM 智能体可执行的自然语言指令，断言作为通过条件；4 例单测覆盖空段落/空白过滤/空标题回落。
  - **持久化（T041/T042/T043）**：`schema.rs` 新增 `test_case_runs` / `test_case_run_steps` 两表 + 索引；`test_case_dao.rs` 增 `TestCaseRunRecord`/`TestCaseRunStepRecord` 与 `start_run`/`append_run_step`/`complete_run`/`list_runs`/`read_run`，往返测 `run_start_step_complete_and_read_round_trips` 通过。
  - **协议四侧（T044）**：新增 `TestCaseRun`/`TestCaseRunStep` 实体与 `testCaseRun/save`、`testCaseRun/list` 方法，同步 protocol（types/method_names/catalog/schema_types/registry/catalog 测试）→ `write_schema_fixtures` → `generate:protocol-types`（478 类型 0 失败）→ 前端 `protocol.ts`/`commandPolicy.ts`/`api.ts`。
  - **后端链路（T045）**：`local_data_source/test_cases.rs` 增 run 映射（RFC3339↔毫秒、save 走 start+append+complete 复用已测 DAO、list 倒序），并补全 `runtime.rs`（trait/Noop 默认实现/RuntimeCore 方法）、`processor`（handler + dispatch）、测试桩（session_archive_jsonrpc、runtime/tests）。
  - **执行编排 + 抽屉（T047/T048/T049）**：`viewModel/executionReducer.ts` 纯函数折叠 UI Agent 事件流（thought/action/screenshot/result/done/error/exit）→ 执行状态机，派生判定结果（通过/失败/阻塞）与可落库 `TestCaseRun`（剥离实时截图）；`components/ExecutionDrawer.tsx` 右侧滑出——选设备 + 选模型 Provider → buildInstruction → `ui_agent_start` 实时展示逐步过程与截图 → 终态落库 `testCaseRun/save` + 回写用例 `execResult` + 刷新历史时间线；`TestCaseTable` 增「执行」行操作列，页面接 `onExecute`/`onRunComplete`。
  - **i18n（T050）**：五语言补 `exec.*` 与 `table.actions` 文案。
  - **验证（T051）**：本特性前端测试 41+2 例全绿（新增 `executionReducer.unit` 8 + `api.test` run 2）；`ember-core` `test_case_dao` 7 例全绿；`app-server` / `app-server-protocol` 编译通过、catalog 测试通过；`check-app-server-client-contract`（263 检查）+ `check-command-contracts` 通过；`npm run typecheck` 本特性零错误（残留全在既有 `device-automation`/`uiAgent.ts`）；`i18n:check` 中 `testCaseManagement` 100% 覆盖。
  - **降级登记**：执行过程截图当前仅作实时预览（data URI），`screenshotPath` 落库为空串（无 Host 存盘方法）；逐步 `ts` 暂用结束时间。退出条件：出现截图归档需求时新增 App Server 截图落盘方法。
- **US3 完成度 100%**；US1+US2+US3 MVP 全部落地，整体完成度约 100%。
