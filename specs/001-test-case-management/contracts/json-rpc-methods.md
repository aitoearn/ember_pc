# Contracts · JSON-RPC 方法面：测试用例管理

App Server 对外契约。Wire 名 camelCase `domain/action`，Rust 常量 `METHOD_{DOMAIN}_{ACTION}`，经统一桥 `app_server_handle_json_lines` 透传。所有方法以当前 workspace 为隐含作用域（参数显式带 `workspaceId`）。

## Phase 1a — 用例与模块 CRUD

### testCase/list
- Params: `{ workspaceId: string, moduleId?: string }`
- Result: `{ cases: TestCase[] }`
- 说明：按 workspace（可选叠加 moduleId）粗过滤；细筛在前端 ViewModel。

### testCase/read
- Params: `{ id: string }`
- Result: `{ case: TestCase | null }`

### testCase/save（upsert）
- Params: `{ case: TestCase }`
- Result: `{ case: TestCase }`
- 校验：`caseId` 在 workspace 内唯一，冲突返回错误（FR-002a）；`title` 非空。

### testCase/delete
- Params: `{ ids: string[] }`（支持批量）
- Result: `{ deleted: number }`

### testCaseModule/list
- Params: `{ workspaceId: string }`
- Result: `{ modules: TestCaseModule[] }`

### testCaseModule/save（upsert）
- Params: `{ module: TestCaseModule }`
- Result: `{ module: TestCaseModule }`

### testCaseModule/delete
- Params: `{ id: string }`
- Result: `{ deleted: boolean }`
- 校验：仅空模块可删；非空（含子模块或用例）返回错误并提示（FR-001a）。

## Phase 1c — 执行与历史

### testCaseRun/start
- Params: `{ caseId: string, deviceId: string }`
- Result: `{ run: TestCaseRun }`
- 行为：拼装自然语言指令 → 调 `uiAgent.ui_agent_start` → 消费 `UiAgentEvent` → 自评判定 → 落 `test_case_runs(+ run_steps)` + 回写 `test_cases.exec_result`。本期仅单条（spec Clarifications）。

### testCaseRun/list
- Params: `{ caseId: string }`
- Result: `{ runs: TestCaseRun[] }`（不含 steps，按时间倒序）

### testCaseRun/read
- Params: `{ runId: string }`
- Result: `{ run: TestCaseRun, steps: TestCaseRunStep[] }`

## 四侧同步检查表（每个方法）

| 侧 | 文件 |
| --- | --- |
| Rust 协议 | `app-server-protocol`: `protocol/v0/test_cases.rs`、`method_names.rs`、`catalog.rs`、`schema_types.rs`、`schema_export/registry.rs` |
| Rust 实现 | `core`: `database/schema.rs`、`database/dao/test_case_dao.rs`；`app-server`: `local_data_source/test_cases.rs`、`local_data_source.rs`、`runtime.rs`、`processor/test_cases.rs`、`processor/mod.rs` |
| 前端 client | `packages/app-server-client/src/protocol.ts`、`index.ts`；`src/lib/api/appServer.ts`；`src/features/test-case-management/api.ts` |
| DevBridge 策略 | `src/lib/dev-bridge/commandPolicy.ts`（`APP_SERVER_CURRENT_METHODS`） |
| 类型生成 | `npm run generate:protocol-types` → `generated/protocol-types.ts` |
| 契约测试 | `scripts/check-app-server-client-contract.mjs`（新增 testCase 跨文件 spec）+ `npm run test:contracts` |

注：Electron host（`preload.ts`/`main.ts`/`ipcChannels.ts`）无需改动，复用 `app_server_handle_json_lines`。
