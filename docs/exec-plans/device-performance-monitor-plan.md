# 移动端性能监控 · 执行计划

> 关联 spec：`specs/002-device-performance-monitor/`  
> 设计：`docs/superpowers/specs/2026-06-17-device-performance-monitor-design.md`  
> P2 设计：`specs/002-device-performance-monitor/p2-perfetto-trace-analysis-design.md`  
> 更新时间：2026-06-17

## 目标

在「移动端测试 → 性能监控」Tab 交付：

- **P1**：Android CPU/内存/FPS 实时曲线、Electron ADB 采集 + IPC 推帧、App Server SQLite 会话摘要、历史列表
- **P2a**：Perfetto trace 录制/pull + artifact 管理 + 外链 Perfetto UI
- **P2b**：Tab 内 L1 模板分析（卡顿/启动/CPU）+ `trace_processor` 按需下载

## P1 阶段状态

| Phase | 内容 | 状态 |
| --- | --- | --- |
| 0–4 | 领域 + App Server + Electron + UI | ✅ 完成 |

**P1 完成度：** 98%（真机 ADB 冒烟已通过；Electron Tab 全流程建议再验一次）

## P2 阶段状态

| Phase | 内容 | 状态 |
| --- | --- | --- |
| 5 | 领域 + P2 契约四侧 | ✅ 完成 |
| 6 | App Server trace/analysis SQLite + JSON-RPC | ✅ 完成 |
| 7 | Electron P2a 录制/pull + progress | ✅ 代码完成；⬜ 真机 quickstart 待验 |
| 8 | Electron P2b trace_processor + L1 模板 | ✅ 完成（`-Q` CLI 批处理） |
| 9 | SegmentedControl + Trace/Analysis UI | ✅ 完成 |
| 10 | 契约守门 + 文档同步 | ✅ 自动化；⬜ 真机验收 |

**P2 完成度：** 92%（代码与自动化测试就绪；真机录制 + L1 分析待人工走 quickstart § P2）

## 进度日志

### 2026-06-17 · P1

- Phase 0–4 交付；commit `4a13ad0b` / `e686b3ea`（ADB 冒烟）
- host 白名单变更需 `npm run electron:build:host:dev` + 完全重启 Electron

### 2026-06-17 · P2 设计与实现

- Clarify 5 项 → spec FR-P2-*；plan + p2-tasks + contracts
- **P2a** commit `4a76a16e`：契约四侧、perfTraceCapture、APM/Trace 模式、artifact 列表
- **P2b**（工作区）：traceProcessorDownload/Runner、analysisTemplates、PerfTraceAnalysisView
- Speckit tasks T001–T038 ✅；T039 真机待验；T040 文档已同步

## P2 自动化验证（2026-06-17）

| 检查 | 结果 |
| --- | --- |
| `cargo test -p ember-core perf_trace_dao` | ✅ |
| `npx vitest run electron/deviceAutomation/perfTraceCapture.test.ts` | ✅ |
| `npx vitest run electron/deviceAutomation/traceProcessorRunner.test.ts` | ✅ |
| `npx vitest run src/features/device-automation/performance/` | ✅ |
| `node scripts/check-command-contracts.mjs` | ✅ |
| `node scripts/check-app-server-client-contract.mjs` | ✅ |

## P2 真机验收清单（T039 · 待人工）

**前置**：`npm run electron:build:host:dev` → 完全重启 Electron；Android 设备 online。

### P2a 录制

- [ ] 性能 Tab → **深度 Trace** → 预设「滑动卡顿」→ 开始录制 → 操作 App → 停止
- [ ] 列表出现 artifact，`sizeBytes > 0`
- [ ] 「打开 Perfetto UI」可打开浏览器

### P2b L1 分析

- [ ] 选中就绪 trace → **卡顿摘要**（首次触发 trace_processor 下载或设置 `PERFETTO_TRACE_PROCESSOR_PATH`）
- [ ] 30 秒内展示 jank/P99 等结果卡片
- [ ] 历史分析可回看

### 交互

- [ ] SegmentedControl 切换 APM ↔ Trace
- [ ] Trace 录制中切 Tab → 确认对话框（默认继续后台录制）
- [ ] 重启应用后 artifact 列表仍可加载

## 剩余缺口

| 项 | 说明 |
| --- | --- |
| 真机 quickstart § P2 | 见上表，需 Electron + 真机 |
| `verify:local` | i18n 五语言结构 vs 双语策略（规则 05） |
| `npm run test:contracts` 全量 | 既有 governance 检查可能失败 |

## 验证入口

```bash
npm run test -- src/features/device-automation/performance/
npm run test -- electron/deviceAutomation/perfTraceCapture.test.ts electron/deviceAutomation/traceProcessorRunner.test.ts
cargo test -p ember-core perf_trace_dao
node scripts/check-app-server-client-contract.mjs
node scripts/check-command-contracts.mjs
npx tsx scripts/device-automation/perf-monitor-adb-smoke.mjs [deviceId]
npm run electron:build:host:dev   # IPC 白名单变更后
```

## 关键文件索引

- P1 前端：`src/features/device-automation/performance/`
- P2 Electron：`electron/deviceAutomation/perfTraceCapture.ts`、`traceProcessorRunner.ts`、`analysisTemplates/`
- App Server：`ember-rs/crates/core/src/database/dao/perf_trace_dao.rs`
- Spec/tasks：`specs/002-device-performance-monitor/tasks.md`、`p2-tasks.md`
