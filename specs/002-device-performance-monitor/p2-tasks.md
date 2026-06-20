# P2 任务清单 · Perfetto Trace + L1 分析

> **Speckit 主清单**：[`tasks.md`](./tasks.md)（T001–T040，按 User Story 组织）。  
> 本文件为 Phase 5–10 与 plan.md 的对照勾选表。
> 设计：[`p2-perfetto-trace-analysis-design.md`](./p2-perfetto-trace-analysis-design.md)  
> Clarify：spec.md `Session 2026-06-17（P2 Clarify）`

## Phase 5 · 领域与契约（P2 基础）

- [x] 扩展 `performance/types.ts`：`PerformanceTraceArtifact`、`PerformanceTraceAnalysis`、`PerfTracePresetId`
- [x] 新增 `performance/events.ts` 导出 `DEVICE_AUTOMATION_PERF_TRACE_PROGRESS_EVENT`
- [x] 冻结 [`contracts/p2-electron-host-commands.md`](./contracts/p2-electron-host-commands.md)（P2a 命令；`open_external` 仅 `perfetto_ui`）
- [x] 冻结 [`contracts/p2-json-rpc-methods.md`](./contracts/p2-json-rpc-methods.md)
- [x] `commandPolicy.ts`：trace 命令 + progress 事件前缀
- [x] `ipcChannels.ts` + `hostCommands.ts` 占位注册（守卫测试先红后绿）

## Phase 6 · App Server 持久化（P2a 元数据）

- [x] `schema.rs`：`performance_trace_artifacts` + `performance_trace_analyses`
- [x] `dao/perf_trace_dao.rs` + 单测
- [x] `protocol/v0/perf_trace.rs` + method_names + catalog
- [x] `local_data_source` + `processor` + `runtime` 接线
- [x] `packages/app-server-client` + `deviceAutomationPerformance.ts` 扩展 trace CRUD
- [x] workspace 路径 API：解析 `{workspaceId}/performance-traces/`（Renderer 经 `getProject().rootPath`）

## Phase 7 · Electron 采集（P2a）

- [x] `perfTraceCapture.ts`：start/stop/cancel + preset config push
- [x] `perfTrace/presets/*.txt`：scroll_jank、cold_start、cpu_sched
- [x] `runtime.ts`：trace 方法 + progress 广播
- [x] pull 进度 → `device_automation_perf_trace_progress`
- [x] `perfTraceCapture.test.ts`（mock adb）
- [ ] 真机 smoke：录制 → stop → pull → 文件存在（待 Electron 内人工验收）

## Phase 8 · Electron L1 分析（P2b）

- [x] `traceProcessorRunner.ts`：`-Q` 批处理 SQL（设计为 `--httpd` + protobuf，首版用 CLI 等价实现）
- [x] `traceProcessorDownload.ts`：按需下载 prebuilt（`get.perfetto.dev`）
- [x] `analysisTemplates/`：jank_summary、startup_summary、cpu_quadrant SQL
- [x] `device_automation_perf_trace_analyze` host 命令
- [x] 单测：`traceProcessorRunner.test.ts`（stdout 解析）
- [x] 超时与 kill 清理（runner 30s SIGKILL）

## Phase 9 · 前端 UI（P2a + P2b）

- [x] `PerformanceModeSwitch` SegmentedControl（实时 APM / 深度 Trace）
- [x] `PerfTracePanel`：录制栏 + 列表 + 删除
- [x] `PerfTraceAnalysisView`：L1 结果卡片
- [x] `usePerformanceTrace.ts`：状态机 + 离开 Tab 确认对话框（默认继续）
- [x] `PerformanceMonitorPanel` 组装 + i18n `deviceAutomation.performance.trace.*`
- [x] `PerformanceMonitorPanel.test.tsx` 扩展（模式切换）
- [x] `DeviceAutomationWorkspace.test.tsx` 扩展（性能 Tab 非占位 + 模式切换）
- [ ] 可选：`linkedSessionId` 从当前 P1 session 带入

## Phase 10 · 集成守门

- [x] `node scripts/check-command-contracts.mjs` + `check-app-server-client-contract.mjs`
- [x] 定向 vitest + `cargo test perf_trace`
- [ ] quickstart P2 章节 **真机** 人工验收（自动化单测/契约已通过）
- [x] 更新 `internal/exec-plans/device-performance-monitor-plan.md`

## 明确不做（P2 首版）

- [x] ~~P2c SmartPerfetto upload/Agent~~（延后）
- [x] ~~trace 自动 TTL/配额清理~~
- [x] ~~内嵌 Perfetto UI~~

## 已知缺口（验收时关注）

- [ ] 删除 artifact 时同步删除本地 `.perfetto-trace` 文件
- [ ] `DeviceAutomationWorkspace` 切换 Tab 时调用 `confirmLeaveTab`
- [ ] `npm run test:contracts` 全量（既有 governance 检查可能失败，与 P2 无关）
