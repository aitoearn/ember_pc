# Implementation Plan: 移动端性能监控 Tab

**Branch**: `feature/device-performance-monitor` | **Date**: 2026-06-17 | **Design**: [design spec](../../docs/superpowers/specs/2026-06-17-device-performance-monitor-design.md)

**Input**: 设计 Spec + 功能 Spec + **P2 Clarify（2026-06-17）**：`specs/002-device-performance-monitor/spec.md`、`p2-perfetto-trace-analysis-design.md`

## Summary

**P1（已交付）**：Android CPU/内存/FPS 实时曲线、Electron ADB 采集 + IPC 推帧、App Server 会话摘要、历史列表。

**P2（计划）**：在性能 Tab 增加 **深度 Trace** 产品线（SegmentedControl 切换）：**P2a** Perfetto 录制/pull + artifact 管理 + 外链 Perfetto UI；**P2b** Tab 内 L1 模板分析（卡顿/启动/CPU）+ `trace_processor_shell` 按需下载。**P2c SmartPerfetto 深度分析首版不做。**

## Technical Context

**Language/Version**: TypeScript 5.x（React renderer + Electron main）+ Rust（App Server，`lime-rs/Cargo.toml`）

**Primary Dependencies (P1)**: React + i18next；rusqlite；`scrcpyAdbFastPath.execAdbSync`；`AppServerClient`；`safeInvoke` / `safeListen`

**Primary Dependencies (P2)**: 设备侧 `perfetto` CLI（adb）；`trace_processor_shell` prebuilt（按需下载，HTTP protobuf RPC）；Perfetto stdlib SQL；可选参考 `perf/SmartPerfetto` skill SQL vendoring

**Storage (P1)**: SQLite `performance_sessions`（summary only）

**Storage (P2)**: SQLite `performance_trace_artifacts` + `performance_trace_analyses`；文件 `{workspaceId}/performance-traces/*.perfetto-trace`（手动删除，无自动清理）

**Testing**: Vitest（P1 + P2 UI/hook）；Electron（`perfTraceCapture.test.ts`、`traceProcessorRunner.test.ts`）；Rust `perf_trace` DAO；SmartPerfetto test-traces 回归 L1；`npm run test:contracts`

**Target Platform**: Electron 桌面（macOS + Windows）

**Constraints**: 生产禁 mock；i18n 仅 zh-CN/en-US；Electron 采集/trace 分析 spawn + App Server 元数据持久化；协议四侧同步；**不**内嵌 SmartPerfetto Node 后端（P2c 延后）

## Constitution Check

| 治理门 | P1 | P2 | 说明 |
| --- | --- | --- | --- |
| 持久化走 App Server | PASS | PASS | trace/analysis 元数据 CRUD；采集与 TP spawn 在 Electron |
| 协议四侧 + `test:contracts` | PASS | 计划纳入 | 新增 trace host 命令 + `perfMonitor/trace/*` |
| 生产禁 mock | PASS | PASS | |
| i18n 双语 | PASS | PASS | `deviceAutomation.performance.trace.*` |
| 前端测试分层 | PASS | PASS | 模板 SQL / runner 单测 + 组件接线 |
| 代码体量 | PASS | 计划 | `perfTraceCapture.ts` / `traceProcessorRunner.ts` 独立模块 |
| exec-plan | PASS | 计划更新 | `device-performance-monitor-plan.md` |

## Project Structure

### Documentation

```text
specs/002-device-performance-monitor/
├── plan.md                 # 本文件
├── spec.md                 # P1 + P2 FR/Clarify
├── research.md             # P1/P2 决策
├── data-model.md           # P1 会话
├── p2-data-model.md        # P2 artifact/analysis
├── contracts/
│   ├── json-rpc-methods.md
│   ├── electron-host-commands.md
│   ├── p2-electron-host-commands.md
│   └── p2-json-rpc-methods.md
├── quickstart.md
├── collection-architecture.md
├── p2-perfetto-trace-analysis-design.md
├── tasks.md                # P1 勾选
└── p2-tasks.md             # P2 勾选
```

### Source Code（P2 增量）

```text
electron/deviceAutomation/
  perfTraceCapture.ts
  perfTraceCapture.test.ts
  perfTrace/
    presets/*.txt
  traceProcessorRunner.ts
  traceProcessorDownload.ts
  analysisTemplates/*.ts
  runtime.ts                  # trace_* 委托

src/features/device-automation/performance/
  components/PerformanceModeSwitch.tsx
  components/PerfTracePanel.tsx
  components/PerfTraceAnalysisView.tsx
  hooks/usePerformanceTrace.ts

lime-rs/crates/
  app-server-protocol/.../perf_trace.rs
  core/.../dao/perf_trace_dao.rs
  app-server/.../perf_trace.rs
```

## Phase 概览

| Phase | 目标 | 状态 |
| --- | --- | --- |
| **0–4** | P1 闭环 | ✅ 完成 |
| **5** | P2 领域 + 契约冻结 | ✅ 完成 |
| **6** | App Server trace/analysis 表 + JSON-RPC | ✅ 完成 |
| **7** | Electron P2a 录制/pull + progress | ✅ 完成（真机待验） |
| **8** | Electron P2b trace_processor + L1 模板 | ✅ 完成（`-Q` CLI 模式） |
| **9** | 前端 SegmentedControl + Trace UI + 离开 Tab 确认 | ✅ 完成 |
| **10** | 契约、quickstart、exec-plan 守门 | ⬜ 自动化通过；真机 quickstart 待验 |

详细勾选见 [`p2-tasks.md`](./p2-tasks.md)。

## 风险与缓解（P2）

| 风险 | 缓解 |
| --- | --- |
| 厂商 ROM 无 perfetto | 录制前探测 + 明确 i18n 错误；不阻塞 P1 |
| trace 文件过大 pull 慢 | progress 事件 + 可 cancel |
| trace_processor 下载失败 | FR-P2-004 引导 + `PERFETTO_TRACE_PROCESSOR_PATH` |
| Electron 模块膨胀 | capture / runner / download 分文件；>800 行预警 |
| P1/P2 离开 Tab 行为混淆 | 确认对话框 + 文档 + 单测 |

## 进度日志

| 日期 | 状态 | 备注 |
| --- | --- | --- |
| 2026-06-17 | P1 完成 | Phase 0–4 + adb smoke |
| 2026-06-17 | P2 Clarify 完成 | 5 项 → spec.md FR-P2-* |
| 2026-06-17 | P2 Plan | research.md + p2-tasks.md + plan 扩展 |
| 2026-06-17 | P2 实现 | commit `4a76a16e` P2a；Phase 4 US5 L1 分析 + Phase 5 守门（工作区未提交） |
| 2026-06-17 | P2 自动化验证 | vitest perf/trace/analysis；`cargo test perf_trace`；契约脚本 ✅ |
