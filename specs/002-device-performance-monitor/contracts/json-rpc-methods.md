# Contracts · JSON-RPC：性能监控会话

App Server 持久化契约。经 `app_server_handle_json_lines` 透传。采集控制走 Electron host 命令（见 `electron-host-commands.md`）。

## perfMonitor/session/save

- **Params**: `{ session: PerformanceSession }`（upsert）
- **Result**: `{ session: PerformanceSession }`
- **校验**: `id`、`workspaceId`、`deviceId`、`packageName` 非空；`status` 合法枚举

## perfMonitor/session/list

- **Params**: `{ workspaceId: string, limit?: number, offset?: number }`
- **Result**: `{ sessions: PerformanceSession[] }`
- **说明**: 按 `started_at` 倒序；默认 `limit=50`

## perfMonitor/session/read

- **Params**: `{ id: string }`
- **Result**: `{ session: PerformanceSession | null }`

## 四侧同步检查表

| 侧 | 文件 |
| --- | --- |
| Rust 协议 | `app-server-protocol`: `protocol/v0/perf_monitor.rs`、`method_names.rs`、`catalog.rs`、`schema_types.rs`、`schema_export/registry.rs`、`protocol/v0.rs` |
| Rust 实现 | `core`: `schema.rs`、`dao/perf_monitor_dao.rs`；`app-server`: `local_data_source/perf_monitor.rs`、`processor/perf_monitor.rs`、`runtime.rs` |
| 前端 client | `packages/app-server-client/src/protocol.ts`；`src/lib/api/deviceAutomationPerformance.ts`（session 部分） |
| DevBridge | `src/lib/dev-bridge/commandPolicy.ts` → `APP_SERVER_CURRENT_METHODS` |

## Electron Host 命令（非 JSON-RPC）

见 [`electron-host-commands.md`](./electron-host-commands.md)。契约测试需同步：

- `electron/ipcChannels.ts` → `ELECTRON_HOST_COMMANDS`
- `electron/hostCommands.ts` → switch case
- `src/lib/dev-bridge/commandPolicy.ts` → `ELECTRON_HOST_CURRENT_COMMANDS`（或等价集合）
