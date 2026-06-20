# 移动端性能监控 Tab · 设计 Spec

- 日期：2026-06-17
- 模块：移动端测试 → 性能监控（`device-automation` / `performance` Tab）
- 状态：设计已确认；实现计划见 `specs/002-device-performance-monitor/plan.md`

## 1. 背景与目标

Ember「移动端测试」工作台已注册 `performance` Tab，当前仍为占位页（`DeviceAutomationPlaceholderPanel`）。本设计在 Tab 内交付 **Android 首期可用的性能监控闭环**，并为 iOS / HarmonyOS 预留能力矩阵与协议扩展点。

**参考材料（不直接复用代码）：**

| 来源 | 用途 |
| --- | --- |
| `docs/测试加_文章/20260601_AutoPilot性能监控：三端实时数据采集的设计与实现.md` | 产品流程、指标定义、PerfCollector 模式、会话模型 |
| `/Users/lisq/ai/testplatform/perf/MobiPerf` | WebSocket 会话生命周期、图表缓冲、Android 采集细节 |
| `/Users/lisq/ai/testplatform/perf/SoloX` | 指标勾选 UX、平台差异表 |
| `/Users/lisq/ai/testplatform/perf/app_performance` | FPS/jank 算法参考（P2） |

**与仓库约束对齐：**

- 设备通道（ADB）在 **Electron `deviceAutomation`**（C1），与现有 `device_automation_*` 一致
- 会话持久化在 **App Server + SQLite（`ember.db`）**，按 workspace 隔离
- 生产路径禁止 mock；i18n 首期仅 **zh-CN + en-US**
- Electron 不新增第二套 Python sidecar

## 2. 已确认的关键决策

| 决策点 | 结论 | 代号 |
| --- | --- | --- |
| 首期交付范围 | UI 完整布局 + 协议契约；**Android 仅 CPU / 内存 / FPS**；iOS/Harmony 展示能力矩阵 + 未支持提示 | **A** |
| 持久化粒度 | SQLite 仅存 **会话元数据 + `summary_json`（AVG/MAX/MIN）**；**不存**逐秒时序 | **A2** |
| 采集执行层 | **Electron `PerfCollector`**（ADB fast path）；App Server 负责会话 CRUD | **C1** |
| 设备/应用选择 | Tab **自包含工具栏**；进入 Tab 拉设备列表，不强制先在「设备管理」选设备 | **D1** |
| 实时推送 | Electron IPC 事件 `device_automation_perf_frame`；非轮询、非独立 WebSocket | **方案 1** |

### Spec Kit Clarify（2026-06-17，见 `specs/002-device-performance-monitor/spec.md`）

| 决策点 | 结论 |
| --- | --- |
| 离开性能 Tab | **自动停止**采集并写摘要（FR-011） |
| 历史删除 | **P1 不支持** |
| 应用列表 | **仅第三方已安装应用**（`pm list packages -3`） |
| 布局 | **上图表、下历史**（底部面板可折叠） |
| 采集间隔 | 下拉 **0.5s / 1s / 2s / 5s**，默认 1s |

## 3. 架构分层

```text
Renderer (src/features/device-automation/performance/)
  ├─ PerformanceMonitorPanel
  ├─ usePerformanceMonitor          // 状态机 + 120 点滑动窗口
  ├─ safeListen(DEVICE_AUTOMATION_PERF_FRAME_EVENT)
  ├─ safeInvoke(device_automation_perf_*)   // 采集控制
  └─ AppServerClient.request(perfMonitor/session/*)

Electron Main (electron/deviceAutomation/)
  ├─ performanceMonitor.ts          // PerfCollector + summary 聚合
  ├─ runtime.ts 扩展                // listApps / start / stop / 广播帧
  └─ scrcpyAdbFastPath 复用           // execAdbSync / spawnAdb

App Server (ember-rs/crates/app-server*)
  └─ perf_monitor_session DAO       // performance_sessions 表
      └─ rusqlite → ember.db
```

**数据流（采集中）：**

```text
PerfCollector.collect()
  → runtime 广播 device_automation_perf_frame
  → Renderer 更新内存缓冲（≤120 点/序列）
  → SVG 图表重绘
```

**数据流（停止时）：**

```text
用户点击停止
  → Electron stop：停 timer、算 summary
  → Renderer 调用 perfMonitor/session/save（summary + stopped_at）
  → 刷新历史列表
```

## 4. 首期范围与 YAGNI

### 4.1 P1 必须交付

1. 替换 performance Tab 占位页为 `PerformanceMonitorPanel`
2. 工具栏：设备、刷新应用（**仅第三方应用**）、目标应用、指标勾选（CPU/内存/FPS）、采集间隔下拉（**0.5/1/2/5s，默认 1s**）、开始/停止
3. Android 在线设备：三指标实时曲线，滑动窗口 **120 点**；**上方主区图表 + 下方可折叠历史面板**
4. 停止后会会话写入 SQLite；历史列表 + 摘要 Modal（AVG/MAX/MIN）；**P1 不可删除历史**
5. iOS / Harmony 设备：能力矩阵表 + 采集禁用与说明文案
6. **离开性能 Tab 自动停止**采集（等同手动停止）
7. Electron / App Server / 前端契约与守卫（ipcChannels、commandPolicy、contracts 测试）

### 4.2 P1 明确不做

- `performance_data` 时序表、历史曲线回放、CSV 导出、**历史会话删除/清空**
- iOS / Harmony 真实采集（含 iOS 17+ tunnel）
- GPU、网络、电池、磁盘、Jank 等扩展指标
- 与 UI 自动化执行时间轴对齐
- 独立 Python sidecar 或 MobiPerf 式 WebSocket 服务
- 截图/录屏/打点 marker（MobiPerf 能力，P2+）

### 4.3 P1 验收场景

1. **Given** 已连接 Android 在线设备，**When** 进入性能 Tab → 选设备 → 刷新应用 → 选包名 → 开始采集，**Then** CPU/内存/FPS 三张图每秒更新，窗口最多 120 点。
2. **Given** 采集进行中，**When** 点击停止，**Then** 历史列表出现新会话，详情展示各指标 AVG/MAX/MIN。
3. **Given** 已有历史会话，**When** 重启应用再进入性能 Tab，**Then** 历史列表仍可加载（SQLite 持久化）。
4. **Given** 选中 iOS 或 Harmony 设备，**When** 查看性能 Tab，**Then** 显示平台能力矩阵，开始采集禁用并说明「首期仅支持 Android」。
5. **Given** 设备 A 正在采集，**When** 对设备 A 再次开始新会话，**Then** 旧会话自动停止并写入 summary（同设备互斥）。
6. **Given** 采集进行中，**When** 用户切换到其他 Tab，**Then** 采集自动停止且摘要进入历史列表。

## 5. 数据模型（SQLite）

仅一张会话表（A2）；不建 `performance_data`。

```sql
CREATE TABLE IF NOT EXISTS performance_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_platform TEXT NOT NULL,       -- android | ios | harmony
  package_name TEXT NOT NULL,
  metrics_json TEXT NOT NULL DEFAULT '[]',
  interval_ms INTEGER NOT NULL DEFAULT 1000,
  status TEXT NOT NULL DEFAULT 'running', -- running | stopped | failed
  started_at INTEGER NOT NULL,
  stopped_at INTEGER,
  summary_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_perf_sessions_workspace_started
  ON performance_sessions(workspace_id, started_at DESC);
```

**`metrics_json`：** `["cpu","memory","fps"]` 子集。

**`summary_json` 结构：**

```json
{
  "cpu_app": { "avg": 12.3, "max": 45.6, "min": 2.1 },
  "cpu_sys": { "avg": 38.0, "max": 72.0, "min": 15.0 },
  "mem_total": { "avg": 256.4, "max": 310.2, "min": 198.0 },
  "fps": { "avg": 58.2, "max": 60.0, "min": 42.0 }
}
```

停止时在 Electron 侧根据内存缓冲计算；未采集到的指标键可省略。

## 6. 协议面

### 6.1 Electron Host 命令

| 命令 | 参数 | 返回 |
| --- | --- | --- |
| `device_automation_perf_list_apps` | `{ platform, deviceId }` | `{ apps: { packageName, label? }[] }` |
| `device_automation_perf_start` | `{ platform, deviceId, packageName, metrics, intervalMs }` | `{ sessionId, startedAt }` |
| `device_automation_perf_stop` | `{ sessionId }` | `{ summary, stoppedAt }` |
| `device_automation_perf_get_status` | — | `{ activeSessionId?, deviceId?, metrics? }` |

**行为约束：**

- 仅 `platform === "android"` 且设备在线时允许 `start`
- 同一 `deviceId` 互斥：新 `start` 自动 `stop` 旧 session
- `list_apps`：**仅返回第三方应用**（Android `pm list packages -3`）
- `intervalMs` 仅允许 **500 / 1000 / 2000 / 5000**
- `sessionId` 由 Electron 生成 UUID；前端停止后负责 `perfMonitor/session/save`

同步注册：`electron/ipcChannels.ts`、`electron/hostCommands.ts`、`src/lib/dev-bridge/commandPolicy.ts`。

### 6.2 IPC 事件

```typescript
// src/features/device-automation/performance/events.ts
export const DEVICE_AUTOMATION_PERF_FRAME_EVENT =
  "device_automation_perf_frame";

export type DeviceAutomationPerfMetricKey =
  | "cpu_app"
  | "cpu_sys"
  | "mem_total"
  | "fps";

export type DeviceAutomationPerfFramePayload = {
  sessionId: string;
  ts: number;
  data: Partial<Record<DeviceAutomationPerfMetricKey, number>>;
};
```

广播由 main 进程 `broadcast()` 发出，与 `device_automation_inventory_changed` 同模式。

### 6.3 App Server JSON-RPC

Wire 命名 camelCase，Rust 常量 `METHOD_PERF_MONITOR_SESSION_*`。

| 方法 | 参数 | 返回 |
| --- | --- | --- |
| `perfMonitor/session/save` | 完整会话记录（upsert） | `{ id }` |
| `perfMonitor/session/list` | `{ workspaceId, limit?, offset? }` | `{ sessions: [...] }` |
| `perfMonitor/session/read` | `{ id }` | `{ session }` |

类型在 `app-server-protocol` 定义 camelCase 结构，与前端 `types.ts` 对齐。

## 6.1 采集技术方案（APM vs Perfetto）

> **完整版**（各指标 adb 命令、降级策略、Perfetto 文件 pull/落盘、SmartPerfetto 集成）：  
> [`specs/002-device-performance-monitor/collection-architecture.md`](../../specs/002-device-performance-monitor/collection-architecture.md)

| 层级 | P1 | 说明 |
| --- | --- | --- |
| **实时 APM** | ✅ | adb 轮询标量 → IPC 推帧 → 内存 120 点；**不生成** `.perfetto-trace` |
| **Perfetto trace** | ❌ P2+ | 录制 → pull → workspace artifact；与 SmartPerfetto **外链**分析，非 P1 曲线数据源 |

## 7. Android 采集（PerfCollector）

实现位置：`electron/deviceAutomation/performanceMonitor.ts`。

| 指标键 | 采集手段 | 备注 |
| --- | --- | --- |
| `cpu_app` | `adb shell top -n 1 -b \| grep <pkg>` 解析 `%CPU` | 失败则本帧跳过 |
| `cpu_sys` | `cat /proc/stat` 首行差分 | 缓存上一帧 total/idle |
| `mem_total` | `pidof` → `dumpsys meminfo <pid>` 解析 TOTAL PSS → MB | PSS 优于 RSS |
| `fps` | `dumpsys gfxinfo <pkg> framestats` | P1 不做 Jank；SurfaceFlinger 降级可 P1.1 |

**调度：**

```text
while (!stopEvent) {
  start = now()
  data = {}
  for collector in enabledCollectors:
    data.merge(collector.collect())
  if data: emitFrame({ ts, data })
  wait(max(0, intervalMs - (now() - start)))
}
```

**错误：** 连续失败 ≥10 次自动 stop，`status=failed`，仍尝试写已有 summary。

## 8. 前端 UI

### 8.1 入口

`DeviceAutomationWorkspace.tsx`：当 `activeTab === "performance"` 渲染 `PerformanceMonitorPanel`，替换 placeholder。

进入 Tab 时调用 `listDeviceAutomationDevices`（与 D1 一致）；不依赖 devices Tab 预选中。

### 8.2 布局

```text
┌─ PerformanceMonitorToolbar ─────────────────────────────────┐
│ 设备 | 刷新应用 | 应用 | ☑CPU ☑内存 ☑FPS | 间隔▼ | 开始/停止 │
├─ PerformanceLiveCharts（主区，Android 采集中）───────────────┤
│ CPU 图（cpu_app + cpu_sys）| 内存图 | FPS 图                  │
├─ PerformancePlatformMatrix（iOS/Harmony 或未支持时）──────────┤
├─ PerformanceSessionHistory（底部可折叠面板）─────────────────┤
│ 会话卡片列表 → PerformanceSessionSummaryModal（仅查看）     │
└──────────────────────────────────────────────────────────────┘
```

**Tab 生命周期：** `usePerformanceMonitor` 在组件卸载或 `activeTab !== "performance"` 时调用 stop（Clarify：离开 Tab 自动停止）。

### 8.3 图表

- 轻量 **SVG polyline**，不引入 echarts/recharts
- 纯函数：`appendPerfPoint(buffer, point, maxPoints=120)`、`computePerfSummary(buffer)` 
- 单元测试：`perfBuffer.unit.test.ts`

### 8.4 i18n

namespace：`deviceAutomation` 下新增 `deviceAutomation.performance.*` 键；仅 **zh-CN**、**en-US**。

### 8.5 平台能力矩阵（静态配置）

| 指标 | Android | iOS | HarmonyOS |
| --- | --- | --- | --- |
| CPU | ✅ P1 | 规划中 | 规划中 |
| 内存 PSS | ✅ P1 | 规划中 | 部分（Monkey） |
| FPS | ✅ P1 | 规划中 | 规划中 |

文案引用 AutoPilot 文章差异表，iOS/Harmony 行标注「首期不可用」。

## 9. 错误处理

| 场景 | 行为 |
| --- | --- |
| 无设备 / 全离线 | 工具栏空态，引导连接设备 |
| 非 Android 选开始 | 按钮禁用 + 矩阵说明 |
| adb 单帧失败 | 跳过该帧，不中断 |
| adb 连续失败 | toast + 自动 stop，`status=failed` |
| 采集中设备断开 | stop + toast；summary 按已缓冲数据写入 |
| 采集中离开性能 Tab | **自动 stop** + 写 summary |
| App Server save 失败 | toast 保留本地 summary，提示重试保存 |

## 10. 测试策略

| 层级 | 入口 |
| --- | --- |
| 纯函数 | `perfBuffer.unit.test.ts` — 120 点窗口、summary 聚合 |
| Electron | `performanceMonitor.test.ts` — CPU 解析、互斥、summary |
| 组件 | `PerformanceMonitorPanel.test.tsx` — 工具栏、禁用态、历史空态 |
| 集成 | `DeviceAutomationWorkspace.test.tsx` — performance Tab 非 placeholder |
| 契约 | `npm run test:contracts` — 新增命令注册四侧一致 |

收尾：`npm run verify:local`；涉及 GUI 主路径时 `npm run verify:gui-smoke`。

## 11. 文件落点（实现计划输入）

```text
electron/deviceAutomation/
  performanceMonitor.ts
  performanceMonitor.test.ts
  runtime.ts                    # 扩展 perf 方法

src/features/device-automation/
  performance/
    types.ts
    events.ts
    constants/metrics.ts
    constants/platformMatrix.ts
    domain/perfBuffer.ts
    domain/perfBuffer.unit.test.ts
    hooks/usePerformanceMonitor.ts
    components/PerformanceMonitorPanel.tsx
    components/PerformanceMonitorToolbar.tsx
    components/PerformanceMetricChart.tsx
    components/PerformanceLiveCharts.tsx
    components/PerformanceSessionHistory.tsx
    components/PerformanceSessionSummaryModal.tsx
    components/PerformancePlatformMatrix.tsx
  DeviceAutomationWorkspace.tsx  # 接线

src/lib/api/deviceAutomationPerformance.ts

ember-rs/crates/app-server-protocol/   # PerfMonitorSession 类型
ember-rs/crates/app-server/            # session handlers + DAO
ember-rs/crates/core/                  # migration SQL

src/i18n/resources/{zh-CN,en-US}/deviceAutomation.json
```

## 12. 后续路线

| 阶段 | 内容 |
| --- | --- |
| **P2** | **Perfetto trace 录制/pull + 三档分析（L0 UI / L1 模板 SQL / L2 SmartPerfetto）** — 见 [`specs/002-device-performance-monitor/p2-perfetto-trace-analysis-design.md`](../../specs/002-device-performance-monitor/p2-perfetto-trace-analysis-design.md)；`performance_data` 窄表/CSV 另列 |
| **P3** | iOS tidevice / iOS 17+ pymobiledevice3 tunnel；Harmony 采集 |
| **P4** | 与 UI 自动化时间轴对齐；评估采集器迁移 App Server（Rust adb） |

## 13. 方案对比记录（brainstorming）

| 方案 | 结论 |
| --- | --- |
| 方案 1：Electron 采集 + IPC 帧事件 + App Server 会话 | **P1 采用** |
| 方案 2：渲染层 1s 轮询 invoke | 不采用（延迟与开销） |
| 方案 3：采集全迁 App Server | P4 评估 |

---

**Brainstorming 决策链：** A（范围）→ A2（持久化）→ C1（采集层）→ D1（工具栏）→ 方案 1（推送）→ **用户批准 2026-06-17**
