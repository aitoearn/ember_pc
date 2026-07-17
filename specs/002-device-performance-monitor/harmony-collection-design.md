# HarmonyOS 采集技术方案 · 移动端性能监控（P1 增量）

**Feature**: `002-device-performance-monitor`
**日期**: 2026-07-16
**状态**: 已实现（P1 实时 APM 扩展至 HarmonyOS）
**关联**: [collection-architecture.md](./collection-architecture.md) · [spec.md](./spec.md) · [plan.md](./plan.md)
**参考**: 华为 SmartPerf 使用指导 <https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/smartperf-guidelines>

---

## 1. 目标与范围

在既有「Android 实时 APM 轮询」之外，新增 **HarmonyOS 设备的实时性能采集**：当用户在性能 Tab 选中鸿蒙设备时，走鸿蒙原生性能检测能力（华为 SmartPerf 设备端命令行工具 `SP_daemon`），复用现有的 tick 调度、IPC 推帧、会话摘要与持久化管线。

**本期范围（与 Android P1 对齐）**：

| 指标 | 是否支持 | 数据来源 |
| --- | --- | --- |
| CPU（应用 + 整机） | ✅ | `SP_daemon -c` |
| 内存（应用 PSS） | ✅ | `SP_daemon -r` |
| FPS | ✅ | `SP_daemon -f` |

**本期不做（后续增量）**：GPU（`-g`）、温度（`-t`）、功耗（`-p`）、网络（`-net`）、DDR（`-d`）、鸿蒙 htrace/hiperf 深度 Trace（对应 Android P2 Perfetto，鸿蒙走不同技术线，单独规划）。

---

## 2. 为什么选 SP_daemon（SmartPerf Device-daemon）

华为 SmartPerf 提供两种形态：

- **SmartPerf-Device（HAP 可视化）**：有屏设备悬浮窗，人工操作，不适合自动化嵌入。
- **SmartPerf-Daemon（`SP_daemon` 命令行）**：shell 方式，有屏/无屏均可，支持实时打印与 CSV 导出。

Ember 采集在 Electron 主进程以「无人值守」的方式驱动设备，因此选 **`SP_daemon` 命令行**，通过 hdc 调起，与 Android 侧「adb + top/dumpsys」形成对称结构。

---

## 3. 总体架构（与 Android 对称）

```text
┌──────────────── Renderer ────────────────────────────────────────┐
│ usePerformanceMonitor                                            │
│   canCollect = isPerfCollectionSupported(platform)  // android+harmony
│   start({ platform: "harmony", deviceId, packageName, metrics }) │
└────────────────────────────┬───────────────────────────────────┘
                             │ IPC invoke + event（与 Android 同通道）
┌────────────────────────────▼───────────────────────────────────┐
│ Electron Main · performanceMonitor.ts                            │
│   runTick(): session.platform === "harmony"                      │
│     → collectHarmonyPerfSample(execHdcSync, ...)                 │
│   broadcast(device_automation_perf_frame)                        │
└────────────────────────────┬───────────────────────────────────┘
                             │ hdc -t <id> shell
┌────────────────────────────▼───────────────────────────────────┐
│ HarmonyOS Device                                                │
│   SP_daemon -N 1 -PKG <pkg> -c -r -f                            │
└────────────────────────────────────────────────────────────────┘

┌──────────────── App Server（不变） ─────────────────────────────┐
│ performance_sessions 表 · perfMonitor/session/*                  │
│  devicePlatform 存 "harmony"（协议字段已是 string，无需改 Rust）│
└─────────────────────────────────────────────────────────────────┘
```

**关键点**：会话摘要、IPC 事件、SQLite 持久化 **完全复用** Android 管线；平台差异仅收敛在 Electron 采集器与设备通道两处。

---

## 4. hdc 通道（`resolveHdcPath.ts`）

**复用仓库既有的 hdc owner 模块** `electron/deviceAutomation/resolveHdcPath.ts`（agent-device CLI 已依赖它注入 hdc 到子进程环境），不新建重复实现：

- `resolveHdcPath(env)`（既有）路径解析优先级：`DEVICE_AUTOMATION_HDC` → `DEVICE_AUTOMATION_HDC_DIR` / 打包资源 → DevEco / OHOS SDK 环境变量（`DEVECO_SDK_HOME` / `HOS_SDK_HOME` / `OHOS_SDK_HOME` / `OHOS_BASE_SDK_HOME`）下的 `toolchains/hdc` → macOS 常见安装路径（如 `/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc`）→ PATH 中的 `hdc`。
- **新增** `execHdcSync(deviceId, args)`：`hdc -t <deviceId> <args...>`（deviceId 为空省略 `-t`），`spawnSync` 同步执行 + 15s 超时，返回 `{ stdout, stderr, exitCode }`。设备枚举与性能采集共用。

Windows/macOS 均覆盖（`hdc.exe` / `hdc`）。

> 说明：初版曾误新建 `harmonyHdc.ts`，与 `resolveHdcPath.ts` 重复，已删除并统一复用后者（对齐「一个能力一个 owner，不建双轨」）。

---

## 4b. 设备枚举（`harmonyDeviceInventory.ts`）

**前置问题**：设备清单来自两处——Android 走 `adb track-devices` 快速通道；其余走外部 `agent-device` CLI 的 `devices` 命令。而 agent-device 的 `src/platforms/` 只有 `android/ios/linux/macos`，**没有 harmony provider**，因此鸿蒙设备（即便 hdc 可见）不会出现在工作台。

**解决**：在 ember_pc 内新增对称的鸿蒙「快速通道」（不改外部 agent-device）：

- `harmonyDeviceInventory.ts`：`parseHdcTargets(stdout)` 解析 `hdc list targets`（普通/`-v` 详细模式，忽略 `[Empty]`/`[Fail]`），`listHarmonyDevices()` 产出 `platform:"harmony"` 的 `AgentDeviceCliRecord`（`kind:"device"`、`booted:true`）。
- `runtime.ts`：模块级 `harmonyDeviceProvider` + `setHarmonyDeviceProvider()`；在 `buildDeviceListResponse` 阶段按需合并鸿蒙设备（**不写入 deviceListCache**，避免与缓存的 agent 设备互相污染），随后统一过滤/enrich。
- `deviceAutomationHost.ts` bootstrap：`setHarmonyDeviceProvider(() => listHarmonyDevices())`，dispose 时置空。

投影链：`AgentDeviceRecord{platform:"harmony",booted:true}` → `mapPlatform`→"harmony"、`mapConnectionStatus`→"online" → 卡片展示 + 性能 Tab `canCollect`=true。

**当前限制**：暂无鸿蒙热插拔独立 watcher（Android 有 `adb track-devices`）。鸿蒙设备在「进入/刷新设备列表」或任一 inventory 变更事件触发的重取时出现；后续可加 hdc 侧监听实现即插即显。

## 5. 采集器（`performanceMonitor/harmonyCollectors.ts`）

### 5.1 每 tick 单次采样

```bash
hdc -t <id> shell SP_daemon -N 1 -PKG <pkg> [-c] [-r] [-f]
```

- `-N 1`：采集一次（SP_daemon 每秒一次），与现有「每 tick 单次采样」模型天然契合。
- 按用户勾选的指标动态拼装 `-c` / `-r` / `-f` 标志，未勾选不采。
- SP_daemon 单次调用约阻塞 1s；`tickInFlight` 互斥保证不重入，间隔 <1000ms 时自然退化为「一秒一帧」。

### 5.2 输出解析（`order:N key=value` 行式）

SP_daemon 输出样例（真实字段名，来自官方文档）：

```text
order:1 ProcCpuUsage=36.177645     # 应用 CPU%（-PKG + -c）
order:7 TotalcpuUsage=62.500000    # 整机 CPU%（-c）
order:13 pss=422172                # 应用 PSS，单位 KB（-r）
order:1 fps=43                     # 实时 FPS（-f）
```

映射到既有序列键：

| 序列键 | SP_daemon 字段 | 处理 |
| --- | --- | --- |
| `cpu_app` | `ProcCpuUsage` | clamp 到 0–100 |
| `cpu_sys` | `TotalcpuUsage` | clamp 到 0–100 |
| `mem_total` | `pss` | KB → MB（/1024） |
| `fps` | `fps` | clamp 到 0–240 |

**解析防误匹配**：`parseSpDaemonValue` 用 `(?:^|\s)key=` 前缀锚定，避免 `pss` 命中 `nativeHeapPss`/`stackPss`、`fps` 命中 `fpsJitters`/`ohtestfps`、`TotalcpuUsage` 命中 `TotalcpuidleUsage`。多采样块取最后一次值。

**与 Android 的差异（更简单）**：SP_daemon 直接给出整机 CPU 与实时 FPS，**无需** `/proc/stat` 差分或 `gfxinfo` 帧数差分，采集器是 **无状态** 的（不维护 `procStatPrevious`/`gfxFramesPrevious`），启动时也 **不需要** `gfxinfo reset`。

### 5.3 应用列表

```bash
hdc -t <id> shell bm dump -a
```

`parseHarmonyPackages` 解析缩进的 bundle 名列表（跳过 `ID:`、`bundle name list:` 等含空格/冒号的标题行，保留形如 `com.example.app` 的合法包名），去重排序。

> 说明：鸿蒙 `bm dump -a` 无 Android `pm list packages -3` 的「仅第三方」过滤，本期返回全部可解析 bundle；后续如需过滤系统应用，可按前缀白/黑名单增强。

---

## 6. 前端接入

- `platformMatrix.ts`：新增 `isHarmonyPerfCollectionSupported` 与统一门禁 `isPerfCollectionSupported`（android + harmony）；能力矩阵 harmony 的 cpu/memory/fps 由 `planned/partial` 升为 `p1`。
- `usePerformanceMonitor.ts`：`canCollect` 改用 `isPerfCollectionSupported`；`start()` 依据设备平台传 `platform: "harmony" | "android"`。
- `deviceAutomationPerformance.ts`：`startPerformanceCollection` 入参 `platform` 放宽为 `"android" | "harmony"`。
- **P2 Perfetto trace 保持 Android 专属**：`usePerformanceTrace` 仍用 `isAndroidPerfCollectionSupported`，鸿蒙不放开录制。
- i18n（仅 zh-CN / en-US，遵守 05 双语规则）：更新性能 Tab「不支持平台」文案，声明 Android 与 HarmonyOS 均支持实时采集。

---

## 7. 错误与降级

| 场景 | 行为 |
| --- | --- |
| 输出无 `order:` 前缀（无 SP_daemon / 权限不足 / 命令失败） | 本帧返回空数据，计入 empty streak |
| 单帧 hdc 失败 | skip frame（复用现有 tick 容错） |
| 连续 ≥10 帧无有效数据 | auto stop，`status=failed`（复用现有逻辑） |
| 单指标缺失 | 仅缺该序列，其余照常 |
| `bm dump -a` 空/失败 | 应用列表为空，打印中文告警日志 |

---

## 8. 测试

| 层级 | 文件 | 覆盖 |
| --- | --- | --- |
| Electron 单测 | `performanceMonitor/harmonyCollectors.test.ts` | SP_daemon 字段解析（防误匹配）、`bm dump` 解析、按指标拼装标志、不可用降级 |
| Electron 单测 | `performanceMonitor.test.ts` | harmony `listPerfApps`、采集 tick 广播帧、`ohos` 归一化、不支持平台拒绝 |
| 前端 | 既有 `performance/*.test.tsx` 回归通过 | 门禁/矩阵/hook 不回归 |

**真机验证（待补）**：连接鸿蒙真机 + hdc，`SP_daemon --help` 可用后，走 quickstart 手动验收（选设备 → 选应用 → 采集 → 曲线 → 停止 → 摘要落库）。

---

## 9. 未来增量

- GPU / 温度 / 功耗 / 网络（`-g`/`-t`/`-p`/`-net`）：需扩展 `PerfMetricId`/`PerfMetricKey`、曲线、摘要、i18n 与协议持久化。
- 鸿蒙深度 Trace（htrace / hiperf）：对标 Android P2 Perfetto，单独规划技术线。
- `bm dump -a` 第三方应用过滤。
