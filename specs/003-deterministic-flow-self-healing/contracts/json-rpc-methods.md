# Contracts · JSON-RPC 方法面：确定性测试流持久化（App Server）

App Server 对外契约。Wire 名 camelCase `domain/action`，Rust 常量 `METHOD_DEVICE_FLOW_{ACTION}`，经统一桥 `app_server_handle_json_lines` 透传。所有方法以当前 workspace 为隐含作用域（参数显式带 `workspaceId`）。类型见 [data-model.md](../data-model.md)。

## 流 CRUD（US1 / FR-005）

### deviceFlow/list
- Params: `{ workspaceId: string }`
- Result: `{ flows: TestFlow[] }`（不含完整 steps 亦可，按需返回轻量列表 + `stepCount`）

### deviceFlow/read
- Params: `{ id: string }`
- Result: `{ flow: TestFlow | null }`（含 steps）

### deviceFlow/save（upsert）
- Params: `{ flow: TestFlow }`
- Result: `{ flow: TestFlow }`
- 校验：`name`、`appPackage` 非空；`formatVersion` 兼容；同 workspace `name` 冲突给可读提示（非硬唯一）。

### deviceFlow/delete
- Params: `{ ids: string[] }`
- Result: `{ deleted: number }`
- 行为：级联删除其 runs / run_steps / healing_revisions。

## 回放记录（US2 / FR-010/011）

> 回放执行在 Electron sidecar（见 electron-host-commands.md）；**回放结束后由 Renderer 把结果落库**到 App Server。

### deviceFlowRun/save
- Params: `{ run: FlowRun, steps: FlowRunStep[] }`
- Result: `{ runId: string }`
- 校验：`conclusion ∈ {passed,failed,blocked}`；纯确定性回放 `llmTokenUsed` 应为 0（仅自愈步可 >0）。

### deviceFlowRun/list
- Params: `{ flowId: string, limit?: number, offset?: number }`
- Result: `{ runs: FlowRun[] }`（不含 steps，按时间倒序）

### deviceFlowRun/read
- Params: `{ runId: string }`
- Result: `{ run: FlowRun, steps: FlowRunStep[] }`

## 自愈修订（US3 / FR-013/014）

### deviceFlowHealing/list
- Params: `{ flowId: string, status?: 'pending' | 'accepted' | 'flagged_defect' }`
- Result: `{ revisions: HealingRevision[] }`

### deviceFlowHealing/save（upsert，回放产出 pending 修订时调用）
- Params: `{ revision: HealingRevision }`
- Result: `{ id: string }`

### deviceFlowHealing/resolve
- Params: `{ id: string, resolution: 'accepted' | 'flagged_defect' }`
- Result: `{ revision: HealingRevision, flow?: TestFlow }`
- 行为：
  - `accepted` → 把 `healedLocator` 并入对应 `TestFlow.steps[stepIndex].locators` 顶部，更新流并返回新流；修订状态置 `accepted`。
  - `flagged_defect` → 原流不变，修订状态置 `flagged_defect`，保留证据作缺陷线索。

## 四侧同步检查表（每个方法）

| 侧 | 文件 |
| --- | --- |
| Rust 协议 | `app-server-protocol`: `protocol/v0/device_flow.rs`、`method_names.rs`、`catalog.rs`、`schema_types.rs`、`schema_export/registry.rs` |
| Rust 实现 | `core`: `database/schema.rs`、`database/dao/device_flow_dao.rs`；`app-server`: `local_data_source/device_flow.rs`、`local_data_source.rs`、`runtime.rs`、`processor/device_flow.rs`、`processor/mod.rs` |
| 前端 client | `packages/app-server-client/src/protocol.ts`、`index.ts`；`src/lib/api/appServer.ts`；`src/features/device-automation/flow/api.ts` |
| DevBridge 策略 | `src/lib/dev-bridge/commandPolicy.ts`（`APP_SERVER_CURRENT_METHODS`） |
| 类型生成 | `npm run generate:protocol-types` → `generated/protocol-types.ts` |
| 契约测试 | `scripts/check-app-server-client-contract.mjs`（新增 deviceFlow 跨文件 spec）+ `npm run test:contracts` |

注：持久化方法复用 `app_server_handle_json_lines`，Electron host（preload/main/ipcChannels）无需为持久化改动；**回放运行时**另见 `electron-host-commands.md`。
