# 采集技术方案 · 移动端性能监控

**Feature**: `002-device-performance-monitor`  
**日期**: 2026-06-17  
**状态**: 与 P1 spec/plan 对齐；Perfetto 属 **P2+** 扩展层  
**关联**: [design spec](../../docs/superpowers/specs/2026-06-17-device-performance-monitor-design.md) · [spec.md](./spec.md)

---

## 1. 问题：为什么现有文档「像没设计采集」

P1 文档重点写了 **Tab UI、会话 SQLite、IPC 协议**，采集层只写了「Electron PerfCollector + adb」一句话。  
这容易让人以为缺技术方案，或与 **Perfetto / SmartPerfetto** 混为一谈。

实际上参考工程里存在 **两条完全不同的技术线**：

| 技术线 | 代表 | 产出 | 用途 |
| --- | --- | --- | --- |
| **A. 实时 APM 轮询** | SoloX、MobiPerf、AutoPilot 文章 P1 | 每秒 CPU/内存/FPS 标量 + 滑动窗口曲线 | 开发/回归时「看着跑」、会话摘要 |
| **B. Trace 深度剖析** | SmartPerfetto、Perfetto UI、btrace | `.perfetto-trace` / `.pftrace` 文件 + SQL 分析 | 卡顿根因、启动链、Binder、渲染管线 |

**Ember P1 只做 A**；**B 作为 P2 可选「深度 trace」扩展**，不阻塞 P1 闭环。

---

## 2. 总体架构（P1 当前事实源）

```text
┌──────────────── Renderer ────────────────────────────────────────┐
│ PerformanceMonitorPanel                                         │
│   usePerformanceMonitor                                         │
│     safeListen(device_automation_perf_frame)  ← 实时曲线        │
│     safeInvoke(perf_start/stop/list_apps)                       │
│     AppServerClient(perfMonitor/session/save)  ← 停止后摘要     │
└────────────────────────────┬───────────────────────────────────┘
                             │ IPC invoke + event
┌────────────────────────────▼───────────────────────────────────┐
│ Electron Main · PerformanceMonitorService                         │
│   PerfCollector (timer loop, 500–5000ms)                        │
│     AndroidCpuCollector      ─┐                                 │
│     AndroidMemoryCollector    ├─ execAdbSync (现有 fast path)    │
│     AndroidFpsCollector      ─┘                                 │
│   内存缓冲 → computeSummary → perf_stop 返回                    │
│   broadcast(device_automation_perf_frame)                         │
└────────────────────────────┬───────────────────────────────────┘
                             │ adb shell
┌────────────────────────────▼───────────────────────────────────┐
│ Android Device                                                  │
│   top / proc/stat / dumpsys meminfo / SurfaceFlinger|gfxinfo   │
└────────────────────────────────────────────────────────────────┘

┌──────────────── App Server (并行，不参与采集循环) ──────────────┐
│ performance_sessions 表 · perfMonitor/session/*                   │
└─────────────────────────────────────────────────────────────────┘
```

**设计原则（对齐 AutoPilot 文章 + MobiPerf）：**

- **调度器单一**：`PerfCollector` 一个 timer 线程/interval，按 `intervalMs - elapsed` 补偿。
- **采集器拆分**：每指标独立 collector，失败只 skip 本帧。
- **推送与落盘分离**：帧 **立刻 IPC 推送**；摘要 **停止时** 才算 AVG/MAX/MIN 写 SQLite（A2 不存时序）。
- **同设备互斥**：一个 `deviceId` 仅一个 active session（iOS Instruments 通道亦如此）。

---

## 3. P1 · Android 各指标怎么采

实现参考：`perf/MobiPerf/backend/core/android_collector.py`、AutoPilot 文章 §4.2。

### 3.1 CPU

| 字段 | 手段 | 命令 / 数据源 |
| --- | --- | --- |
| `cpu_app` | 进程 CPU 占比 | `adb shell top -n 1 -b`，grep 包名，解析 `%CPU` 列 |
| `cpu_sys` | 系统 CPU | `adb shell cat /proc/stat` 首行，与上一帧 **差分** 算 `(total-idle)/total` |

**注意：**

- `top` 输出因 Android 版本/厂商 ROM 列格式不同 → 独立解析函数 + fixture 单测（`androidCollectors.ts`）。
- 解析失败：**本帧跳过**，不中断 session。

### 3.2 内存

| 字段 | 手段 |
| --- | --- |
| `mem_total` | `pidof <pkg>` → `adb shell dumpsys meminfo <pid>`，解析 **TOTAL PSS**（KB→MB） |

PSS 优于 RSS：与 AutoPilot / PerfDog 口径一致。

### 3.3 FPS

| 优先级 | 手段 | 说明 |
| --- | --- | --- |
| **主路径** | `dumpsys gfxinfo <pkg> framestats` | P1 默认；实现成本低 |
| **降级** | `dumpsys SurfaceFlinger --latency <layer>` | 更准；需 `--list` 找含包名的 layer，窗口切换时重查 |

**P1 不算 Jank**（算法见 AutoPilot §4.2 / MobiPerf `_get_fps_jank`）→ **P1.1** 再加。

**前台判定（可选 P1.1）：** 应用不在前台时 FPS 报 0，避免误导。

### 3.4 应用列表

Clarify 已定：**仅第三方应用**

```bash
adb shell pm list packages -3
```

可选：`cmd package resolve-activity` 解析 label（MobiPerf 简化为包名即可）。

### 3.5 采集间隔

UI 四档：**500 / 1000 / 2000 / 5000 ms**（非 Perfetto 采样率，是 **轮询周期**）。

---

## 4. P1 · iOS / Harmony（不采集，仅说明）

| 平台 | P1 | 后续技术路径（文档预留，不实现） |
| --- | --- | --- |
| **iOS &lt; 17** | 能力矩阵 + 禁用 | tidevice `Performance` → Instruments DTX（AutoPilot §4.3） |
| **iOS 17+** | 同上 | pymobiledevice3：tunneld → RSD → InstrumentServer（AutoPilot §4.4） |
| **HarmonyOS** | 同上 | HDC + 系统 API（AutoPilot 差异表） |

P1 **不启动** 上述链路，避免与 Android P1 争抢工期。

---

## 5. Perfetto：是什么、P1 要不要、怎么处理文件

### 5.1 概念区分

- **Perfetto** = Google 的 **trace 记录与分析框架**（长 trace、纳秒级事件、CPU scheduling、渲染 pipeline）。
- **P1 实时曲线** = 每秒几个 **标量**（CPU%、MB、FPS），**不需要** Perfetto daemon，也 **不产生** `.perfetto-trace` 文件。

SmartPerfetto（`perf/SmartPerfetto`）做的是：

1. 上传/拉取 **已生成的 trace 文件**
2. 用 `trace_processor_shell` 跑 SQL
3. AI 辅助根因分析  

这与 SoloX/MobiPerf 的 **1Hz APM 轮询** 是 **互补关系**，不是替代关系。

### 5.2 P1 明确不做 Perfetto

- 不内置 `perfetto` CLI 打包
- 不拉 trace 文件
- 不在 Tab 内嵌 Perfetto UI

### 5.3 P2 建议方案：「深度 Trace」可选模式

> **完整设计**（三档分析 L0/L1/L2、数据模型、协议、UI、分期）：  
> [`p2-perfetto-trace-analysis-design.md`](./p2-perfetto-trace-analysis-design.md)

与实时采集 **并行产品线**，共享设备/应用选择，**不共用** 1Hz 曲线 buffer。

```text
用户点击「导出 Perfetto Trace」（P2）
  → Electron PerfTraceCaptureService
      1. 写入临时 config（cpu / sched / gfx / mem 等 category）
      2. adb shell perfetto --txt -c /data/local/tmp/ember_perf.cfg \
           -o /data/misc/perfetto-traces/ember_<sessionId>.perfetto-trace
      3. 采集 N 秒或手动 stop
      4. adb pull → workspace 目录（app_paths 解析，双平台）
      5. 元数据写入 performance_trace_artifacts 表（或 session 扩展字段）
  → UI：「在 SmartPerfetto 中打开」/ 复制路径 / 未来内嵌 trace_processor
```

**文件落盘建议（P2 数据模型草案）：**

详见 [`p2-data-model.md`](./p2-data-model.md)（含 `performance_trace_artifacts` / `performance_trace_analyses` 完整 schema）。

**与 SmartPerfetto 集成方式（三选一，P2 决策）：**

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **外链** | 「用 SmartPerfetto 打开」→ 调起本地 SmartPerfetto / 浏览器 | 零嵌入 | 两套产品感 |
| **只管理文件** | Ember 只 pull + 列表 + 用系统默认 Perfetto UI 打开 | 实现最小 | 无 AI 分析 |
| **内嵌 trace_processor** | 复用 SmartPerfetto 后端 HTTP RPC（重量级） | 一体化 | 依赖 Node sidecar，违背 P1「无第二后端」 |

**推荐 P2 先做「pull + 工作区文件 + 外链 SmartPerfetto」**，与 SmartPerfetto 仓库解耦。

### 5.4 btrace / iOS trace

`perf/btrace` 主要为 **iOS 符号化 + 转 Perfetto protobuf**（`btrace/perfetto.py`），属于 **iOS 深度诊断** 路线，与 Android adb 轮询无关；Harmony/iOS trace 统一进 P3 规划，不在 P2 Android Perfetto 范围混写。

---

## 6. 数据形态对照

| 数据 | P1 存储 | 格式 | 生命周期 |
| --- | --- | --- | --- |
| 实时帧 | **仅内存**（Renderer 120 点/序列） | `{ ts, cpu_app, ... }` | stop 或离开 Tab 后丢弃 |
| 会话摘要 | SQLite `performance_sessions.summary_json` | AVG/MAX/MIN | 持久 |
| Perfetto trace | **P1 无**；P2 本地文件 + 可选 DB 元数据 | `.perfetto-trace` | 用户/workspace 清理策略 |

---

## 7. 错误与降级（采集层）

| 场景 | 行为 |
| --- | --- |
| 单帧 adb 失败 | skip frame |
| 连续 ≥10 帧无有效数据 | auto stop，`status=failed` |
| `top` 解析失败 | 仅缺 `cpu_app`；其他指标照常 |
| SF layer 丢失 | FPS 降级 gfxinfo 或本帧 fps=0 |
| Perfetto pull 失败（P2） | 保留 remote 路径 + 错误码，不 corrupt session |

---

## 8. 与参考工程映射

| 能力 | 参考路径 | Ember 采纳 |
| --- | --- | --- |
| Android 轮询调度 | MobiPerf `AndroidCollector._collect_loop` | `performanceMonitor.ts` |
| CPU 解析 | MobiPerf `_parse_cpu_from_top` | `androidCollectors.ts` |
| FPS/SF | MobiPerf `_get_fps_jank` + layer 发现 | P1 gfxinfo；P1.1 SF+jank |
| 实时推送 | AutoPilot WebSocket → 我们 **IPC event** | `device_automation_perf_frame` |
| Trace 分析 | SmartPerfetto `trace_processor_shell` | **P2 外链，不嵌入 P1** |
| iOS 17+ | AutoPilot §4.4 pymobiledevice3 | **P3** |

---

## 9. 分期路线（采集维度）

| 阶段 | 采集能力 | Perfetto |
| --- | --- | --- |
| **P1** | Android CPU/内存/FPS，adb 轮询，IPC 推帧，摘要 SQLite | **无** |
| **P1.1** | Jank、SF 主路径、系统 CPU 双校验 | 无 |
| **P2** | GPU/网络/电池；**可选 Perfetto trace 录制+pull+ artifact 表** | 文件管理 + 外链 SmartPerfetto |
| **P3** | iOS/Harmony 实时采集 | iOS 可考虑 Instruments trace → 转 Perfetto（btrace 路线） |

---

## 10. 对现有 plan 的修正说明

- Phase 2（Electron）任务 **不变**，但实现时必须按 **§3 命令与解析** 落地，而非「模拟曲线」。
- 新增 **Phase 2b（P2）**：`PerfTraceCaptureService` + artifact 表 + 文件 pull（本文件 §5.3）。
- **不要** 在 P1 引入 `trace_processor_shell` 或 SmartPerfetto 依赖。

---

**结论（给产品/研发）：**  
P1 的技术方案是 **「adb 标量轮询 + IPC 实时 + 停止时摘要」**；Perfetto 是 **P2 深度诊断** 的另一条产品能力，处理的是 **trace 文件生命周期**，不是 P1 曲线的数据源。两者并存，不混表、不混推送通道。
