# Phase 1 · Data Model：性能监控会话

实体与前端 `src/features/device-automation/performance/types.ts` 对齐；Rust 侧在 `app-server-protocol/src/protocol/v0/perf_monitor.rs` 定义 camelCase 类型。

**采集与落盘分线**：实时帧字段（`cpu_app` / `cpu_sys` / `mem_total` / `fps`）的采集命令、Perfetto 边界与失败策略见 [`collection-architecture.md`](./collection-architecture.md)；本文件只描述会话实体与 SQLite 持久化，**不存逐秒时序**。

## 实体

### PerformanceSession（性能采集会话）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (UUID) | 主键；Electron `start` 生成 |
| workspaceId | string | 工作区隔离 |
| deviceId | string | 设备 UDID |
| devicePlatform | enum | `android` \| `ios` \| `harmony` |
| packageName | string | 目标应用包名 |
| metrics | string[] | 勾选指标：`cpu` \| `memory` \| `fps` |
| intervalMs | number | 采集间隔，默认 1000，最小 500 |
| status | enum | `running` \| `stopped` \| `failed` |
| startedAt | string (RFC3339) | 开始时间 |
| stoppedAt | string \| null | 结束时间 |
| summary | PerfMetricSummaryMap \| null | 停止后写入 |

### PerfMetricSummary（单指标摘要）

| 字段 | 类型 |
| --- | --- |
| avg | number |
| max | number |
| min | number |

### PerfMetricSummaryMap（summary_json）

键为采集帧字段名：

| 键 | 说明 |
| --- | --- |
| cpu_app | 应用 CPU % |
| cpu_sys | 系统 CPU % |
| mem_total | 内存 MB (PSS) |
| fps | 帧率 |

### PerformanceLiveFrame（实时帧，仅内存，不落库）

| 字段 | 类型 |
| --- | --- |
| sessionId | string |
| ts | number | Unix ms |
| data | Partial\<Record\<PerfMetricKey, number\>\> |

`PerfMetricKey` = `cpu_app` \| `cpu_sys` \| `mem_total` \| `fps`

### PerformanceInstalledApp（应用列表项）

| 字段 | 类型 |
| --- | --- |
| packageName | string |
| label | string? | 显示名，可选 |

## SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS performance_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_platform TEXT NOT NULL,
  package_name TEXT NOT NULL,
  metrics_json TEXT NOT NULL DEFAULT '[]',
  interval_ms INTEGER NOT NULL DEFAULT 1000,
  status TEXT NOT NULL DEFAULT 'running',
  started_at INTEGER NOT NULL,
  stopped_at INTEGER,
  summary_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_perf_sessions_workspace_started
  ON performance_sessions(workspace_id, started_at DESC);
```

**不创建** `performance_data` 表（P2）。

## 内存缓冲（Renderer）

```typescript
type PerfSeriesBuffer = Record<PerfMetricKey, Array<{ ts: number; value: number }>>;
const PERF_MAX_POINTS = 120;
```

由 `appendPerfPoint` / `computePerfSummary` 管理（见 `domain/perfBuffer.ts`）。
