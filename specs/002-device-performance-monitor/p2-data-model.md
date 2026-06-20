# P2 · Data Model：Perfetto Trace Artifact 与分析结果

> 前置：P1 见 [data-model.md](./data-model.md)。P2 **不修改** `performance_sessions` 表结构；通过可选外键关联。

## 实体

### PerformanceTraceArtifact（Trace 文件元数据）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (UUID) | 主键；Electron `trace_start` 生成 captureId |
| workspaceId | string | 工作区隔离 |
| linkedSessionId | string \| null | 可选，P1 `performance_sessions.id` |
| deviceId | string | 设备 serial |
| devicePlatform | enum | P2 仅 `android` 可录制 |
| packageName | string | 分析目标包名 |
| presetId | string | `scroll_jank` \| `cold_start` \| `cpu_sched` \| `custom` |
| configJson | string | 录制 config 快照 |
| localPath | string | pull 后本地绝对路径 |
| remotePath | string \| null | 设备侧路径 |
| sizeBytes | number \| null | 文件大小 |
| durationMs | number \| null | 录制时长（停止时计算） |
| status | enum | `recording` \| `ready` \| `failed` |
| errorMessage | string \| null | 失败原因 |
| createdAt | string (RFC3339) | 创建时间 |
| stoppedAt | string \| null | 停止/pull 完成时间 |

### PerformanceTraceAnalysis（分析结果）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (UUID) | 主键 |
| artifactId | string | FK → artifact |
| analysisType | enum | 见 [p2-perfetto-trace-analysis-design.md](./p2-perfetto-trace-analysis-design.md) §7.2 |
| packageName | string | 分析使用的包名 |
| timeRangeJson | string \| null | `{ startNs, endNs }` |
| resultJson | string | 结构化结论 |
| status | enum | `pending` \| `done` \| `failed` |
| createdAt | string (RFC3339) | |

## SQLite Schema（P2 新增）

```sql
CREATE TABLE IF NOT EXISTS performance_trace_artifacts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  linked_session_id TEXT,
  device_id TEXT NOT NULL,
  device_platform TEXT NOT NULL DEFAULT 'android',
  package_name TEXT NOT NULL,
  preset_id TEXT NOT NULL,
  config_json TEXT,
  local_path TEXT,
  remote_path TEXT,
  size_bytes INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'recording',
  error_message TEXT,
  created_at INTEGER NOT NULL,
  stopped_at INTEGER,
  FOREIGN KEY (linked_session_id) REFERENCES performance_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_perf_trace_artifacts_workspace_created
  ON performance_trace_artifacts(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS performance_trace_analyses (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  package_name TEXT NOT NULL,
  time_range_json TEXT,
  result_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (artifact_id) REFERENCES performance_trace_artifacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_perf_trace_analyses_artifact
  ON performance_trace_analyses(artifact_id, created_at DESC);
```

## 本地文件布局（Clarify 2026-06-17：工作区目录 + 手动删除）

```text
{userData}/workspaces/{workspaceId}/performance-traces/
  {artifactId}.perfetto-trace
  {artifactId}.analysis.jank_summary.json   # 可选 sidecar，大结果时 result_json 存路径引用
```

路径解析走 App Server / Electron 已有 **workspace 目录 API**，禁止硬编码平台路径。首版 **不**实现 TTL 或磁盘配额自动清理；用户通过 Trace 列表手动删除。

## 与 P1 实体关系

```text
performance_sessions (0..1) ←── linked_session_id ── (0..*) performance_trace_artifacts
performance_trace_artifacts (1) ──< (0..*) performance_trace_analyses
```

一条 P1 会话可关联 0~N 条 trace（例如多次录制）；一条 trace 可有多条分析历史（重复跑 L1 模板）。
