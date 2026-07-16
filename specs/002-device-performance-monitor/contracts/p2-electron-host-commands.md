# P2 · Electron Host 命令契约

> 状态：**Planned**（P2a+P2b）。采集仍走 Electron Desktop Host，**不**迁 App Server JSON-RPC。  
> Clarify 2026-06-17：首版不含 `smartperfetto` 外链（P2c 延后）。

## device_automation_perf_trace_start

**参数**

```typescript
{
  deviceId: string;
  packageName: string;
  presetId: "scroll_jank" | "cold_start" | "cpu_sched" | "custom";
  configOverride?: string;      // custom 时完整 perfetto text config
  linkedSessionId?: string;   // 可选 P1 会话 ID
}
```

**返回**

```typescript
{ captureId: string; startedAt: string }
```

**行为**

- 仅 `android` + 设备 online
- 同设备仅一个 active trace capture
- 异步广播 `device_automation_perf_trace_progress`

## device_automation_perf_trace_stop

**参数** `{ captureId: string }`

**返回**

```typescript
{
  localPath: string;
  sizeBytes: number;
  durationMs: number;
  remotePath?: string;
}
```

**行为**：stop perfetto → pull → 清理设备临时文件 → progress `done`

## device_automation_perf_trace_cancel

**参数** `{ captureId: string }`

**返回** `{ cancelled: true }`

**行为**：stop 且不 pull；status `failed` 或丢弃

## device_automation_perf_trace_get_status

**返回**

```typescript
{
  activeCaptureId?: string;
  deviceId?: string;
  presetId?: string;
  phase?: PerfTraceProgressPayload["phase"];
}
```

## device_automation_perf_trace_analyze（P2b）

**参数**

```typescript
{
  localPath: string;
  analysisType: "jank_summary" | "startup_summary" | "cpu_quadrant";
  packageName: string;
  timeRange?: { startNs: number; endNs: number };
}
```

**返回** `{ result: Record<string, unknown> }` — 结构见设计 doc §7.2

**行为**：Electron 内 spawn `trace_processor_shell`，跑模板 SQL；**不**写 SQLite（Renderer 调 App Server save）

## device_automation_perf_trace_open_external（P2a）

**参数**

```typescript
{
  localPath: string;
  target: "perfetto_ui"; // P2c 扩展 smartperfetto
}
```

**返回** `{ opened: boolean; url?: string }`

**行为**：打开系统浏览器至 ui.perfetto.dev 或本地 Perfetto UI；首版 **不**实现 SmartPerfetto deep link。

## device_automation_perf_trace_delete_local（P2a）

**参数** `{ localPath: string }`

**返回** `{ deleted: boolean }`

**行为**：删除 workspace 内 `.perfetto-trace` 本地文件；文件不存在时返回 `{ deleted: false }` 且不抛错。

## IPC 事件 · device_automation_perf_trace_progress

见 [p2-perfetto-trace-analysis-design.md](../p2-perfetto-trace-analysis-design.md) §5.4
