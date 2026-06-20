# Phase 0 · Research：测试用例管理

本文件汇总实现前的关键技术决策。每项含 Decision / Rationale / Alternatives。无遗留 NEEDS CLARIFICATION（需求歧义已在 spec `## Clarifications` 解决）。

## R1 · 数据持久化方式

- **Decision**：App Server + SQLite（`ember.db`），按 `workspace_id` 隔离；新增结构化表 + DAO。
- **Rationale**：符合 AGENTS.md「新后端能力默认走 App Server」「生产路径禁止 mock」；与 `workspace` / `gallery_material` 既有模式一致，可照模板画瓢；SQLite 路径经 `ember_core::app_paths` 系统 API 解析，天然双平台。
- **Alternatives**：
  - localStorage/IndexedDB（纯前端）：出 UI 快，但违背 App Server 规则、需二次迁移，已否决。
  - 单列整包 JSON 快照：实现省事，但失去按字段查询/过滤的数据库能力；仅 `steps`/`tags` 这类小数组用 JSON 列，主体仍结构化表。

## R2 · 新增领域 store 的落地模式

- **Decision**：五层链路 protocol（类型/method_names/catalog/schema）→ processor（dispatch + handler）→ runtime（AppDataSource trait + RuntimeCore）→ local_data_source（protocol↔core 映射）→ DAO（rusqlite SQL）。
- **Rationale**：与现有 `workspace`（local_data_source 内联 SQL）和 `gallery_material`（独立 DAO）一致；持久化照 `gallery_material_dao` 用独立 DAO 模块，避免 core 中心文件膨胀（AGENTS.md #21）。
- **Alternatives**：把 SQL 直接写进 processor —— 破坏分层、难测，否决。

## R3 · 协议四侧同步点

- **Decision**：每个新 JSON-RPC 方法同步：Rust 协议（method_names/catalog/protocol type/schema_types/registry）、Rust 实现（schema 建表/DAO/local_data_source/runtime/processor）、前端 client（protocol.ts/index.ts/appServer.ts）、DevBridge（commandPolicy.ts）、类型生成（`generate:protocol-types`）、契约（check-app-server-client-contract.mjs）。
- **Rationale**：Electron 已有 `app_server_handle_json_lines` 通用桥，无需 per-method channel；契约测试守住四侧一致。
- **Alternatives**：为新方法加 Electron IPC channel —— 与现有 App Server 传输模型重复，否决。

## R4 · AI 生成的 LLM 调用方式

- **Decision**：复用 `themeContextSearch.ts` 的一次性 `AppServerClient.request` 调用模式 + `ModelSelector`/`useConfiguredProviders` 选模型，`workspaceId` 取 `requireDefaultProjectId()`。
- **Rationale**：能复用则复用，不新增后端 LLM 方法；与现有主题上下文搜索同构，模型/供应商配置统一。
- **Alternatives**：新建专用 `testCase/generate` 后端方法 —— 增加协议面与维护成本，本期不需要，否决（如后续要服务端缓存/审计再引入）。

## R5 · AI 生成输入源与文件解析

- **Decision**：md/txt 前端直读纯文本；docx/pdf 前端引库（`mammoth` / `pdfjs-dist`）；URL 抓取走 App Server。生成结果以 JSON 数组约定，前端 `aiDraftParse.ts` 容错解析。
- **Rationale**：纯文本/轻文本零依赖最稳；URL 跨域受限且抓取属后端边界；解析失败有可读提示（spec FR-013）。
- **Alternatives**：全部走后端解析 —— 重，本期 md/txt/docx/pdf 前端可解决；URL 抓取若成本过高则降级为「贴正文」（spec Edge Cases 退出条件）。

## R6 · 执行模型（软断言）

- **Decision**：用例 → 自然语言指令（前置 + 步骤 + 「通过条件」），调 `uiAgent.ui_agent_start`，消费 `UiAgentEvent` 事件流，由 VLM 智能体自评判定 通过/失败/阻塞，回写 `test_cases.exec_result` 并落 `test_case_runs(+ run_steps)`。
- **Rationale**：现有设备自动化是 VLM ReAct，无原生硬断言；软断言是与该能力对齐的唯一可行路径，已与需求方确认接受。
- **Alternatives**：等待/新建结构化步骤执行 + 硬断言引擎 —— 超出现有能力与本期范围，否决；本期仅单条执行（spec Clarifications），批量/并发延后。

## R7 · 前端状态与测试分层

- **Decision**：业务逻辑（筛选/分组/统计/校验/草稿解析/指令拼装）抽 `viewModel/` 纯函数，`*.unit.test.ts` 覆盖；`useTestCaseStore` 管加载与乐观更新；`*.test.tsx` 只测渲染与接线；`api.test.ts` mock `AppServerClient.request`。
- **Rationale**：符合 AGENTS.md「前端新代码先守住测试分层」，纯函数易测、组件测试轻。
- **Alternatives**：把筛选/统计塞进组件 —— 违反测试分层，否决。

## R8 · 用例建模：步骤与断言分离（2026-06-17 对标调整）

- **背景**：阅读对标产品 AutoPilot 系列文章（`/Users/lisq/obsidian/wexin/MP_WXS_3878181083/测试加_文章`，含「AI 驱动平台」「AI vs 传统」「Agent 框架」「Prompt 工程」）后，发现行业 AI 测试用例一致采用「步骤列表（操作序列）+ 断言列表（独立验证项）」分离建模，断言在执行末尾被独立判定。
- **Decision**：`TestCase` 新增 `assertions: string[]`（与 `steps` 并列，JSON 列 `assertions_json`），贯穿 types/协议/schema/local_data_source/抽屉五层。`step.expected` 降级为步内即时观察，用例最终判定以 `assertions` 为准。
- **Rationale**：US1 刚落地、无存量数据，此时加字段迁移成本最低；US3 执行判定（R6 软断言）天然需要一组结构化断言作为判定输入，越晚改迁移越贵。
- **Alternatives**：保留每步 `expected`、执行时聚合为断言 —— 语义弱、丢失「整体通过条件」表达，否决。

## Future · 对标 AutoPilot 的后续对齐项（退出条件，落地时采纳）

以下为本期 MVP 暂未纳入、但已确认方向的增强项，作为 US2/US3 及后续迭代的退出条件登记，不在本期推翻既有 MVP 取舍：

- **AI 生成工作流（增强 R4）**：现为一次性 LLM 调用；目标为多节点 DAG（需求解析→测试点提取→去重→用例生成→**评审→覆盖率分析→缺口填充**）+ 断点恢复 + Token 统计。退出条件：US2 落地后评估是否引入服务端 `testCase/generate` 编排方法。
- **AI 生成输入源（增强 R5）**：现为文本/文件/URL；目标补企业协作平台连接器（飞书文档 / Confluence / 语雀）。退出条件：出现真实企业源接入需求时引入。
- **执行严格模式（增强 R6）**：现为「用例 → 一段自然语言指令」；目标为严格模式（按 `step_idx/total_steps` 注入逐步约束，禁跳步/合并），贴合回归语义。退出条件：`ui_agent` 暴露分步约束能力后采纳。
- **双模型断言（增强 R6）**：现为单 VLM 软断言自评；目标为执行模型 + 独立轻量断言模型二次验证（避免「自评」偏差），断言模型输出 `{result, reason}`。退出条件：设备自动化提供独立断言模型接入点后采纳。
- **范围外（归 device-automation 路线图，不进本 spec）**：混合 Kernel（XML+Vision）、归一化坐标（0-1000）、YAML 脚本编译（推理一次/回放多次）、任务预处理器（规则拦截系统级指令）、Monkey 稳定性 / 性能监控 / 网络抓包 / 启动耗时等平台模块。
