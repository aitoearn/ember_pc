# Research · 移动端性能监控

**Feature**: `002-device-performance-monitor`  
**日期**: 2026-06-17  
**范围**: P1（已交付）+ P2（Perfetto · 澄清后计划）

---

## P1 决策（已实施，摘要）

| ID | 决策 | 理由 |
| --- | --- | --- |
| R1 | ADB 标量轮询 APM，非 Perfetto | 1Hz 曲线无需 trace 文件；与 SoloX/MobiPerf 同路线 |
| R2 | Electron 采集 + App Server 会话 SQLite | C1 架构；`performance_sessions` 仅 summary |
| R3 | IPC 推帧 `device_automation_perf_frame` | 非 WebSocket、非 renderer 轮询 |
| R4 | 120 点滑动窗口 + 离开 Tab 自动 stop（P1） | 内存可控；FR-011 |

参考：[`collection-architecture.md`](./collection-architecture.md)

---

## P2 决策（Clarify 2026-06-17 + SmartPerfetto 调研）

| ID | 决策 | 理由 | 备选 |
| --- | --- | --- | --- |
| **R-P2-01** | 首版 **P2a + P2b**，**不含 P2c** | 录制 + Tab 内 L1 可独立验收；SmartPerfetto Agent 引入第二后端 | 仅 P2a / 全量 P2c |
| **R-P2-02** | `trace_processor_shell` **按需下载** prebuilt | 不膨胀安装包；P2a 不依赖 | 随包内置 / 仅手动 PATH |
| **R-P2-03** | UI：**SegmentedControl**（实时 APM / 深度 Trace） | 共用设备栏；主区替换；干扰 P1 最小 | 二级 Tab / 同屏并排 |
| **R-P2-04** | Trace 存 **工作区** `performance-traces/` + **手动删除** | 工作区隔离；首版不做 TTL/配额 | 全局目录 / 自动清理 |
| **R-P2-05** | Trace 录制离开 Tab → **弹窗确认**（默认继续） | 长录制不宜静默 stop；与 P1 FR-011 区分 | 同 P1 自动 stop |
| **R-P2-06** | L1 分析在 **Electron** spawn TP；结果 **App Server** 持久化 | 二进制生命周期绑桌面；DB 走现有链 | 全迁 App Server |
| **R-P2-07** | L1 SQL **vendoring** SmartPerfetto skill 片段 | 离线可跑；不依赖 SmartPerfetto Node 在线 | 运行时调 SmartPerfetto API |
| **R-P2-08** | 录制：`adb shell perfetto --txt -c` + pull | 与 collection-architecture §5.3 一致 | in-process perfetto daemon |
| **R-P2-09** | L0 打开 **外部 Perfetto UI**（ui.perfetto.dev 或本地） | 不内嵌 Perfetto UI fork | bundled UI in Ember |
| **R-P2-10** | P2c SmartPerfetto **延后** | 避免 LLM/Express 栈；外链为后续增强 | 首版内嵌 Agent |

---

## 外部参考

| 来源 | 用途 |
| --- | --- |
| `perf/SmartPerfetto` | `trace_processor_shell` HTTP protobuf RPC、YAML Skill SQL、prebuilt pin |
| `collection-architecture.md` §5 | APM vs Perfetto 分线 |
| Perfetto stdlib | `android.frames.timeline`、`android.startup.startups` 等 |
| SmartPerfetto test-traces | L1 回归基准（`*.pftrace`） |

---

## 未决项（计划阶段，非阻塞 Clarify）

| 项 | 说明 | 落点 |
| --- | --- | --- |
| prebuilt 下载 CDN/镜像 URL | 对齐 SmartPerfetto pin 脚本 | P2b Phase 6 实现 |
| perfetto config 预设文本 | scroll_jank / cold_start / cpu_sched；代码生成对齐 `../perf/SmartPerfetto` `captureConfig.ts` | `electron/deviceAutomation/perfTrace/presets/buildPresetConfig.ts` |
| 厂商 ROM 无 perfetto | 错误码与 i18n | P2a Edge Case |
| trace 与 P1 同设备并行 | 允许 + UI 性能提示 | 设计 §5.3 互斥表 |
