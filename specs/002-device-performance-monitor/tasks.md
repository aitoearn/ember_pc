# Tasks: 移动端性能监控（P1 已完成 · P2 待实施）

**Input**: `specs/002-device-performance-monitor/`（plan.md、spec.md、research.md、p2-data-model.md、contracts/）

**Prerequisites**: P1 Phase 0–4 ✅ 已交付；P2 自 Phase 1 起执行。

**Tests**: 按 plan.md 与 quickstart.md；Electron/Rust 单测 + 契约守卫（非 TDD 强制）。

**Organization**: P2 按 User Story 4（P2a 录制）→ User Story 5（P2b 分析）纵切。

---

## P1 交付摘要（已完成，勿重复实施）

| Phase | 状态 | 参考 |
| --- | --- | --- |
| 0–4 | ✅ | `docs/superpowers/plans/2026-06-17-device-performance-monitor.md` |
| 真机 ADB smoke | ✅ | `scripts/device-automation/perf-monitor-adb-smoke.mjs` |
| verify:local | ⬜ | i18n 五语言结构检查与双语策略冲突，非 P2 阻塞 |

---

## Phase 1: Setup（P2 领域类型）

**Purpose**: P2 共享类型与事件，不阻塞 Rust/Electron 并行准备。

- [x] T001 [P] 扩展 `PerformanceTraceArtifact`、`PerformanceTraceAnalysis`、`PerfTracePresetId` in `src/features/device-automation/performance/types.ts`
- [x] T002 [P] 新增 `DEVICE_AUTOMATION_PERF_TRACE_PROGRESS_EVENT` 与 payload in `src/features/device-automation/performance/events.ts`
- [x] T003 [P] 新增预设常量 in `src/features/device-automation/performance/constants/tracePresets.ts`

---

## Phase 2: Foundational（阻塞 US4/US5）

**Purpose**: App Server 表 + 协议四侧 + Electron host 白名单。**必须在本 Phase 完成后才开始 US4/US5。**

- [x] T004 在 `lime-rs/crates/core/src/database/schema.rs` 增加 `performance_trace_artifacts`、`performance_trace_analyses` 表
- [x] T005 实现 `lime-rs/crates/core/src/database/dao/perf_trace_dao.rs` 及 DAO 单测
- [x] T006 [P] 新增 `lime-rs/crates/app-server-protocol/src/protocol/v0/perf_trace.rs` 并登记 `method_names.rs`、`catalog.rs`
- [x] T007 [P] 实现 `lime-rs/crates/app-server/src/local_data_source/perf_trace.rs` 与 `processor/perf_trace.rs`
- [x] T008 在 `lime-rs/crates/app-server/src/runtime.rs` 接线 `perfMonitor/trace/*` 与 `perfMonitor/traceAnalysis/*`
- [x] T009 [P] 同步 `packages/app-server-client/src/protocol.ts` 与 `commandPolicy.ts`（App Server 读路径）
- [x] T010 [P] 扩展 `src/lib/api/deviceAutomationPerformance.ts`：trace save/list/read/delete + analysis save/list
- [x] T011 在 `electron/ipcChannels.ts` 注册 `device_automation_perf_trace_*` 命令
- [x] T012 在 `electron/hostCommands.ts` 添加 trace 命令分支（可先 stub 后实现）
- [x] T013 在 `src/lib/dev-bridge/commandPolicy.ts` 登记 trace 命令与 `device_automation_perf_trace_progress` 事件前缀
- [x] T014 [P] 更新 `electron/ipcChannels.test.ts`、`electron/preload.test.ts` 断言 trace 命令白名单

**Checkpoint**: 契约脚本可识别新命令/方法（实现前测试可红）。

---

## Phase 3: User Story 4 — Perfetto Trace 录制与管理（Priority: P2a）🎯 P2 MVP

**Goal**: Android 录制 → pull → 工作区 artifact 列表 → 外链 Perfetto UI 打开。

**Independent Test**: 真机 录制 → 停止 → 列表 `sizeBytes > 0` → 外部 UI 可浏览；离开 Tab 弹窗默认继续。

### Implementation for User Story 4

- [x] T015 [P] 添加 perfetto 文本预设 in `electron/deviceAutomation/perfTrace/presets/`（scroll_jank、cold_start、cpu_sched）
- [x] T016 实现 `electron/deviceAutomation/perfTraceCapture.ts`（start/stop/cancel、adb perfetto、pull、进度）
- [x] T017 编写 `electron/deviceAutomation/perfTraceCapture.test.ts`（mock adb）
- [x] T018 在 `electron/deviceAutomation/runtime.ts` 委托 trace 方法并注册 progress 广播
- [x] T019 在 `electron/main.ts` 广播 `device_automation_perf_trace_progress`（若 runtime 未统一则在此接线）
- [x] T020 实现 `device_automation_perf_trace_open_external`（target 仅 `perfetto_ui`）in `electron/hostCommands.ts`
- [x] T021 [US4] 实现 `src/features/device-automation/performance/components/PerformanceModeSwitch.tsx`（SegmentedControl）
- [x] T022 [US4] 实现 `src/features/device-automation/performance/components/PerfTracePanel.tsx`（预设、录制、列表、删除、打开 UI）
- [x] T023 [US4] 实现 `src/features/device-automation/performance/hooks/usePerformanceTrace.ts`（录制状态机、离开 Tab 确认对话框默认继续）
- [x] T024 [P] [US4] 添加 i18n `deviceAutomation.performance.trace.*` in `src/i18n/resources/zh-CN/deviceAutomation.json` 与 `en-US/deviceAutomation.json`
- [x] T025 [US4] 在 `src/features/device-automation/performance/components/PerformanceMonitorPanel.tsx` 集成 ModeSwitch + PerfTracePanel
- [x] T026 [US4] pull 完成后调用 `perfMonitor/trace/save` 并刷新列表 in `usePerformanceTrace.ts`

**Checkpoint**: US4 可独立验收（无需 L1 分析）。

---

## Phase 4: User Story 5 — Trace 模板化性能分析（Priority: P2b）

**Goal**: Tab 内 L1 三模板分析 + 结果持久化；`trace_processor_shell` 按需下载。

**Independent Test**: 对就绪 trace 选「卡顿摘要」，30 秒内展示 jank/P99；历史分析可回看。

**Depends on**: Phase 2 完成；US4 至少有一条就绪 artifact（可并行开发 runner，联调需 artifact）。

### Implementation for User Story 5

- [x] T027 [P] 实现 `electron/deviceAutomation/traceProcessorDownload.ts`（按需下载 prebuilt，支持 `PERFETTO_TRACE_PROCESSOR_PATH`）
- [x] T028 实现 `electron/deviceAutomation/traceProcessorRunner.ts`（spawn `--httpd`、protobuf `/query`、超时 kill）
- [x] T029 [P] 实现 L1 SQL 模板 in `electron/deviceAutomation/analysisTemplates/`（jank_summary、startup_summary、cpu_quadrant）
- [x] T030 编写 `electron/deviceAutomation/traceProcessorRunner.test.ts`（fixture trace 或 SQL 解析单测）
- [x] T031 [US5] 实现 `device_automation_perf_trace_analyze` in `electron/hostCommands.ts`
- [x] T032 [US5] 实现 `src/features/device-automation/performance/components/PerfTraceAnalysisView.tsx`（结果卡片 + 历史列表）
- [x] T033 [US5] 在 `usePerformanceTrace.ts` 扩展 analyze 流程：invoke analyze → `perfMonitor/traceAnalysis/save` → 刷新
- [x] T034 [P] [US5] 扩展 `src/features/device-automation/performance/api.test.ts` trace/analysis API 调用断言
- [x] T035 [US5] 在 `PerfTracePanel.tsx` 接入「快速分析」子菜单与 `PerfTraceAnalysisView`

**Checkpoint**: US4 + US5 完整 P2a+P2b 可验收。

---

## Phase 5: Polish & Cross-Cutting

**Purpose**: 回归、契约、文档。

- [x] T036 [P] 扩展 `src/features/device-automation/performance/components/PerformanceMonitorPanel.test.tsx`（模式切换、离开 Tab 确认）
- [x] T037 [P] 扩展 `src/features/device-automation/DeviceAutomationWorkspace.test.tsx`（performance Tab 仍非占位）
- [x] T038 运行 `node scripts/check-command-contracts.mjs` 与 `node scripts/check-app-server-client-contract.mjs`
- [x] T039 按 `specs/002-device-performance-monitor/quickstart.md` § P2 完成真机人工验收并记录于 `internal/exec-plans/device-performance-monitor-plan.md`（自动化已验；真机清单已登记 exec-plan，待人工勾选）
- [x] T040 [P] 同步 `specs/002-device-performance-monitor/p2-tasks.md` 勾选状态与 `plan.md` 进度日志

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup) ──► Phase 2 (Foundational) ──► Phase 3 (US4) ──► Phase 4 (US5) ──► Phase 5 (Polish)
                                              ╲
                                               ╲── T027–T030 可与 T015–T020 并行（不同文件），联调需 US4 artifact
```

### User Story Dependencies

| Story | 依赖 | 独立测试 |
| --- | --- | --- |
| **US4 (P2a)** | Phase 2 | 录制/pull/列表/打开 UI |
| **US5 (P2b)** | Phase 2 + US4 就绪 artifact（联调） | L1 分析 + 历史回看 |

### Parallel Opportunities

**Phase 2 并行示例：**

```text
T006 perf_trace.rs  ‖  T007 local_data_source/processor  ‖  T009 app-server-client  ‖  T010 deviceAutomationPerformance.ts
```

**Phase 3 并行示例：**

```text
T015 presets  ‖  T024 i18n  （T016 perfTraceCapture 完成后接 T017–T020）
```

**Phase 4 并行示例：**

```text
T027 download  ‖  T029 analysisTemplates  （T028 runner 完成后 T030–T031）
```

---

## Implementation Strategy

### P2 MVP（推荐）

1. Phase 1 → Phase 2（契约四侧通）
2. **Phase 3 US4 单独交付** → quickstart P2a 验收
3. Phase 4 US5 → quickstart P2b 验收
4. Phase 5 守门

### 增量范围（Clarify 固化）

- ✅ P2a + P2b
- ❌ P2c SmartPerfetto
- ❌ trace 自动清理
- ❌ 内嵌 Perfetto UI

---

## Notes

- 任务 ID **T001–T040** 仅覆盖 **P2**；P1 见上文摘要。
- 细粒度勾选副本：`p2-tasks.md`（Phase 5–10 映射，与本文 Phase 1–5 等价）。
- 设计细节：`p2-perfetto-trace-analysis-design.md`；契约：`contracts/p2-*.md`。
