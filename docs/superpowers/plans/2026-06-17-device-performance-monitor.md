# 移动端性能监控 Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 device-automation 的 performance Tab 交付 Android CPU/内存/FPS 实时采集、IPC 推帧、SQLite 会话摘要与历史列表。

**Architecture:** Electron `PerfCollector`（ADB）采集并广播 `device_automation_perf_frame`；Renderer 维护 120 点缓冲 + SVG 图表；停止时 summary 经 `perfMonitor/session/save` 写入 App Server。

**Tech Stack:** TypeScript React、Electron main、Rust App Server + rusqlite、Vitest、cargo test

**Design Spec:** `docs/superpowers/specs/2026-06-17-device-performance-monitor-design.md`

---

## Phase 0 · 领域类型与 perfBuffer（TDD）

### Task 0.1: 类型与常量

**Files:**
- Create: `src/features/device-automation/performance/types.ts`
- Create: `src/features/device-automation/performance/constants/metrics.ts`
- Create: `src/features/device-automation/performance/constants/platformMatrix.ts`
- Create: `src/features/device-automation/performance/events.ts`

- [ ] **Step 1:** 在 `types.ts` 定义 `PerfMetricKey`、`PerfMetricId`、`PerformanceSession`、`PerfMetricSummary`、`PerformanceLiveFrame`

```typescript
export type PerfMetricKey = "cpu_app" | "cpu_sys" | "mem_total" | "fps";
export type PerfMetricId = "cpu" | "memory" | "fps";
export type PerfSessionStatus = "running" | "stopped" | "failed";

export interface PerfMetricSummary {
  avg: number;
  max: number;
  min: number;
}

export type PerfMetricSummaryMap = Partial<Record<PerfMetricKey, PerfMetricSummary>>;

export interface PerformanceSession {
  id: string;
  workspaceId: string;
  deviceId: string;
  devicePlatform: "android" | "ios" | "harmony";
  packageName: string;
  metrics: PerfMetricId[];
  intervalMs: number;
  status: PerfSessionStatus;
  startedAt: string;
  stoppedAt: string | null;
  summary: PerfMetricSummaryMap | null;
}
```

- [ ] **Step 2:** `metrics.ts` 导出 `PERF_METRIC_OPTIONS`、`PERF_DEFAULT_INTERVAL_MS = 1000`、`PERF_MIN_INTERVAL_MS = 500`、`PERF_MAX_POINTS = 120`

- [ ] **Step 3:** `platformMatrix.ts` 导出静态能力表（对齐 design §8.5）

- [ ] **Step 4:** `events.ts` 导出 `DEVICE_AUTOMATION_PERF_FRAME_EVENT` 与 `DeviceAutomationPerfFramePayload`

---

### Task 0.2: perfBuffer 纯函数

**Files:**
- Create: `src/features/device-automation/performance/domain/perfBuffer.ts`
- Create: `src/features/device-automation/performance/domain/perfBuffer.unit.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from "vitest";
import {
  appendPerfPoint,
  computePerfSummary,
  createEmptyPerfBuffers,
  PERF_MAX_POINTS,
} from "./perfBuffer";

describe("perfBuffer", () => {
  it("滑动窗口最多保留 120 点", () => {
    let buffers = createEmptyPerfBuffers();
    for (let i = 0; i < PERF_MAX_POINTS + 5; i++) {
      buffers = appendPerfPoint(buffers, "fps", { ts: i, value: i });
    }
    expect(buffers.fps).toHaveLength(PERF_MAX_POINTS);
    expect(buffers.fps[0]?.value).toBe(5);
  });

  it("computePerfSummary 计算 avg/max/min", () => {
    const buffers = createEmptyPerfBuffers();
    const withPoints = [10, 20, 30].reduce(
      (acc, value, index) =>
        appendPerfPoint(acc, "cpu_app", { ts: index, value }),
      buffers,
    );
    expect(computePerfSummary(withPoints, "cpu_app")).toEqual({
      avg: 20,
      max: 30,
      min: 10,
    });
  });
});
```

- [ ] **Step 2:** 运行 `npm run test -- src/features/device-automation/performance/domain/perfBuffer.unit.test.ts` → 预期 FAIL

- [ ] **Step 3: 最小实现**

```typescript
import type { PerfMetricKey } from "../types";
import { PERF_MAX_POINTS } from "../constants/metrics";

export { PERF_MAX_POINTS };

export type PerfPoint = { ts: number; value: number };
export type PerfSeriesBuffers = Record<PerfMetricKey, PerfPoint[]>;

export function createEmptyPerfBuffers(): PerfSeriesBuffers {
  return { cpu_app: [], cpu_sys: [], mem_total: [], fps: [] };
}

export function appendPerfPoint(
  buffers: PerfSeriesBuffers,
  key: PerfMetricKey,
  point: PerfPoint,
): PerfSeriesBuffers {
  const next = [...buffers[key], point];
  const trimmed =
    next.length > PERF_MAX_POINTS ? next.slice(-PERF_MAX_POINTS) : next;
  return { ...buffers, [key]: trimmed };
}

export function computePerfSummary(
  buffers: PerfSeriesBuffers,
  key: PerfMetricKey,
) {
  const series = buffers[key];
  if (series.length === 0) return undefined;
  const values = series.map((p) => p.value);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: sum / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  };
}

export function computeAllPerfSummaries(
  buffers: PerfSeriesBuffers,
): Partial<Record<PerfMetricKey, { avg: number; max: number; min: number }>> {
  const keys: PerfMetricKey[] = ["cpu_app", "cpu_sys", "mem_total", "fps"];
  const out: Partial<Record<PerfMetricKey, { avg: number; max: number; min: number }>> = {};
  for (const key of keys) {
    const summary = computePerfSummary(buffers, key);
    if (summary) out[key] = summary;
  }
  return out;
}
```

- [ ] **Step 4:** 运行测试 → 预期 PASS

---

## Phase 1 · App Server 会话 CRUD

> 照 `test_case_dao.rs` / `local_data_source/test_cases.rs` 模式复制，域改为 perf_monitor。

### Task 1.1: SQLite schema + DAO

**Files:**
- Modify: `ember-rs/crates/core/src/database/schema.rs`
- Create: `ember-rs/crates/core/src/database/dao/perf_monitor_dao.rs`
- Modify: `ember-rs/crates/core/src/database/dao/mod.rs`

- [ ] **Step 1:** 在 `schema.rs` migrations 追加 `performance_sessions` DDL（见 `specs/002-device-performance-monitor/data-model.md`）

- [ ] **Step 2:** 实现 `PerfMonitorSessionRecord` + `list_by_workspace` / `read` / `upsert`

- [ ] **Step 3:** `cargo test --manifest-path ember-rs/Cargo.toml perf_monitor_dao` → PASS

---

### Task 1.2: 协议 + processor + runtime

**Files:**
- Create: `ember-rs/crates/app-server-protocol/src/protocol/v0/perf_monitor.rs`
- Modify: `method_names.rs`, `catalog.rs`, `schema_types.rs`, `protocol/v0.rs`, `schema_export/registry.rs`
- Create: `ember-rs/crates/app-server/src/local_data_source/perf_monitor.rs`
- Create: `ember-rs/crates/app-server/src/processor/perf_monitor.rs`
- Modify: `local_data_source.rs`, `processor/mod.rs`, `runtime.rs`

- [ ] **Step 1:** 定义 `PerformanceSession`、`PerfMonitorSessionSaveParams/Response`、`ListParams/Response`、`ReadParams/Response`

- [ ] **Step 2:** 注册三条方法常量：
  - `METHOD_PERF_MONITOR_SESSION_SAVE = "perfMonitor/session/save"`
  - `METHOD_PERF_MONITOR_SESSION_LIST = "perfMonitor/session/list"`
  - `METHOD_PERF_MONITOR_SESSION_READ = "perfMonitor/session/read"`

- [ ] **Step 3:** `processor/perf_monitor.rs` dispatch + `runtime.rs` match 分支

- [ ] **Step 4:** `cargo test --manifest-path ember-rs/Cargo.toml perf_monitor` → PASS

---

### Task 1.3: 前端 App Server client

**Files:**
- Modify: `packages/app-server-client/src/protocol.ts`
- Create: `src/lib/api/deviceAutomationPerformance.ts`（session 部分）
- Create: `src/features/device-automation/performance/api.test.ts`
- Modify: `src/lib/dev-bridge/commandPolicy.ts`

- [ ] **Step 1:** 导出 `METHOD_PERF_MONITOR_SESSION_*` 常量

- [ ] **Step 2:** 实现 `savePerformanceSession`、`listPerformanceSessions`、`readPerformanceSession`

- [ ] **Step 3:** 加入 `APP_SERVER_CURRENT_METHODS`

- [ ] **Step 4:** api.test 断言 wire 方法名 → PASS

---

## Phase 2 · Electron PerfCollector

### Task 2.1: Android 解析单测

**Files:**
- Create: `electron/deviceAutomation/performanceMonitor/androidCollectors.ts`
- Create: `electron/deviceAutomation/performanceMonitor.test.ts`

- [ ] **Step 1:** 导出纯函数：
  - `parseTopCpuApp(output, packageName): number | null`
  - `parseProcStatCpuPercent(prev, curr): number | null`
  - `parseMeminfoPssMb(output): number | null`
  - `parseGfxinfoFps(output): number | null`

- [ ] **Step 2:** 测试夹具使用真实 `top`/`meminfo`/`gfxinfo` 样本片段

- [ ] **Step 3:** `npm run test -- electron/deviceAutomation/performanceMonitor.test.ts` → PASS

---

### Task 2.2: PerfCollector 运行时

**Files:**
- Create: `electron/deviceAutomation/performanceMonitor.ts`
- Modify: `electron/deviceAutomation/runtime.ts`
- Modify: `electron/deviceAutomationSidecar.ts`（若 re-export）

- [ ] **Step 1:** `PerformanceMonitorService` 类：
  - `listApps({ platform, deviceId })`
  - `start(params)` → `{ sessionId, startedAt }`
  - `stop({ sessionId })` → `{ summary, stoppedAt }`
  - `getStatus()`
  - 内部 `Map<sessionId, ActiveSession>`，`Map<deviceId, sessionId>` 互斥

- [ ] **Step 2:** `ActiveSession` 用 `setInterval` 调度；每 tick 调 collectors；调用 `emitFrame(payload)`

- [ ] **Step 3:** 连续 10 tick 无有效数据 → auto stop，`status=failed`

- [ ] **Step 4:** `runtime.ts` 委托 + 注入 `emitFrame`（从 main broadcast）

---

### Task 2.3: Host 命令注册

**Files:**
- Modify: `electron/ipcChannels.ts`
- Modify: `electron/hostCommands.ts`
- Modify: `src/lib/dev-bridge/commandPolicy.ts`
- Modify: `src/lib/api/deviceAutomationPerformance.ts`（host 部分）

- [ ] **Step 1:** 四条命令加入白名单

- [ ] **Step 2:** `hostCommands.ts` case → `deviceAutomationRuntime.perf*`

- [ ] **Step 3:** `main.ts` 确保 `deviceAutomationRuntime.setPerfFrameEmitter((payload) => broadcast(DEVICE_AUTOMATION_PERF_FRAME_EVENT, payload))`

- [ ] **Step 4:** `npm run test:contracts` → PASS（或 Phase 4 统一跑）

---

## Phase 3 · 前端 UI

### Task 3.1: usePerformanceMonitor hook

**Files:**
- Create: `src/features/device-automation/performance/hooks/usePerformanceMonitor.ts`

- [ ] **Step 1:** 状态：`devices`, `selectedDeviceId`, `apps`, `packageName`, `metrics`, `intervalMs`, `buffers`, `activeSession`, `history`, `phase: idle|running|stopping`

- [ ] **Step 2:** `useEffect` 订阅 `DEVICE_AUTOMATION_PERF_FRAME_EVENT` → `appendPerfPoint`

- [ ] **Step 3:** `start()` → invoke start → 本地 `running`；`stop()` → invoke stop → `savePerformanceSession` → reload list

- [ ] **Step 4:** Tab mount 时 `listDeviceAutomationDevices({ force: false })`

---

### Task 3.2: 组件

**Files:**
- Create: `components/PerformanceMetricChart.tsx`
- Create: `components/PerformanceMonitorToolbar.tsx`
- Create: `components/PerformanceLiveCharts.tsx`
- Create: `components/PerformancePlatformMatrix.tsx`
- Create: `components/PerformanceSessionHistory.tsx`
- Create: `components/PerformanceSessionSummaryModal.tsx`
- Create: `components/PerformanceMonitorPanel.tsx`
- Create: `components/PerformanceMonitorPanel.test.tsx`

- [ ] **Step 1:** `PerformanceMetricChart` — SVG viewBox + polyline，props: `series: PerfPoint[]`, `label`, `unit`

- [ ] **Step 2:** `PerformanceMonitorToolbar` — shadcn Select/Checkbox/Button；Android 可开始；非 Android 禁用开始

- [ ] **Step 3:** `PerformanceLiveCharts` — 采集中显示 CPU（双序列）/ 内存 / FPS

- [ ] **Step 4:** `PerformancePlatformMatrix` — 静态表格 + i18n

- [ ] **Step 5:** `PerformanceSessionHistory` — 卡片列表，点击开 Modal

- [ ] **Step 6:** `PerformanceMonitorPanel` 布局 grid；`data-testid="performance-monitor-panel"`

- [ ] **Step 7:** 测试：非 Android 禁用开始、空历史、panel testid 存在

---

### Task 3.3: Workspace 接线

**Files:**
- Modify: `src/features/device-automation/DeviceAutomationWorkspace.tsx`
- Modify: `src/features/device-automation/DeviceAutomationWorkspace.test.tsx`

- [ ] **Step 1:** `activeTab === "performance"` 渲染 `<PerformanceMonitorPanel />`；`shouldLoadDevices` 扩展为 `activeTab === "devices" || activeTab === "performance"`

- [ ] **Step 2:** 更新测试：performance tab 不再出现 `device-automation-placeholder-performance`

---

## Phase 4 · i18n 与守门

### Task 4.1: i18n

**Files:**
- Modify: `src/i18n/resources/zh-CN/deviceAutomation.json`
- Modify: `src/i18n/resources/en-US/deviceAutomation.json`

- [ ] **Step 1:** 增加 `deviceAutomation.performance.*`（toolbar、charts、history、matrix、errors、empty）

---

### Task 4.2: 守门

- [ ] **Step 1:** `npm run test:contracts`

- [ ] **Step 2:** `npm run verify:local`

- [ ] **Step 3:** 创建 `internal/exec-plans/device-performance-monitor-plan.md` 进度日志

- [ ] **Step 4:** 更新 design spec 状态为「P1 实现中/已完成」

---

## Spec 覆盖自检

| Spec 要求 | 任务 |
| --- | --- |
| Android CPU/内存/FPS 实时 120 点 | Task 0.2, 2.2, 3.1, 3.2 |
| SQLite 会话 + summary | Task 1.1–1.3 |
| 历史列表 + Modal | Task 3.2 |
| iOS/Harmony 矩阵 | Task 0.1, 3.2 |
| 同设备互斥 | Task 2.2 |
| IPC 推帧 | Task 2.3, 3.1 |
| 契约四侧 | Task 1.3, 2.3, 4.2 |
| i18n 双语 | Task 4.1 |

无 TBD / 占位项。
