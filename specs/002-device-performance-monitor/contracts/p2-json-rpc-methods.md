# P2 · App Server JSON-RPC 契约

> Wire 命名 camelCase；Rust 常量前缀 `METHOD_PERF_MONITOR_TRACE_*`。状态：**Planned**（P2a+P2b）。

## perfMonitor/trace/save

Upsert artifact 元数据（pull 完成后由 Renderer 调用）。

**Params**

```typescript
{
  artifact: PerformanceTraceArtifact; // 见 p2-data-model.md
}
```

**Result** `{ id: string }`

## perfMonitor/trace/list

**Params** `{ workspaceId: string; limit?: number; offset?: number }`

**Result** `{ artifacts: PerformanceTraceArtifact[] }`

## perfMonitor/trace/read

**Params** `{ id: string }`

**Result** `{ artifact: PerformanceTraceArtifact }`

## perfMonitor/trace/delete

**Params** `{ id: string }`

**Result** `{ deleted: true }`

**行为**：删除 DB 行 + 请求 Electron 删除本地文件（或通过 Host 命令 `device_automation_perf_trace_delete_local`）

## perfMonitor/traceAnalysis/save

**Params**

```typescript
{
  analysis: PerformanceTraceAnalysis;
}
```

**Result** `{ id: string }`

## perfMonitor/traceAnalysis/list

**Params** `{ artifactId: string; limit?: number }`

**Result** `{ analyses: PerformanceTraceAnalysis[] }`
