# HarmonyOS 投屏（hoscrcpy）接入设计

**Feature**: 设备自动化 · 鸿蒙投屏
**日期**: 2026-07-16
**状态**: 已实现（真机验证视频流通；触控/导航待真机确认）

## 实现结论（2026-07-16 更新）

- **SDK jar**：`hosScrcpy-1.0.15-beta.jar`（fat jar，内置 fastjson/grpc/netty 与设备侧 `libscrcpy/*.so`、`uitest_agent_*.so`；**无 ffmpeg**，故我方无需 ffmpeg）。放于 `resources/device-automation/hoscrcpy/`。
- **范围**：投屏 + 触控 + 导航（导航用手势模拟，HarmonyOS 无返回/主页按键 API）。
- **解码**：**jmuxer + MSE**（与 lmweb `DeviceVideo` / 官方 web_demo 一致）。Annex-B H.264 二进制帧直喂 `jmuxer.feed({ video })`。因 pnpm 私有包阻塞，jmuxer 以 `src/vendor/jmuxer/` 本地 vendor + Vite alias 引入（来源 lmweb 的 `jmuxer@2.1.0`）。
- **传输**：Java wrapper stdout `[4字节长度][H264 Annex-B]` → Electron `ws` 桥接 → renderer 二进制消息喂 jmuxer；控制经 ws 文本回传 → wrapper stdin。
- **首帧/新观看者**（对齐 lmdeviceagent `HosScrcpyManager`）：`@@READY@@` 后 wrapper 小幅触控 + `requestIDRFrame`；Electron 缓存 SPS/PPS/IDR，新 WS 连接先发缓存关键帧再 `idr`。
- **真机验证**：wrapper 对真机成功输出 `@@META@@` / `@@READY@@` 与持续 H264；jmuxer 端到端画面待重启后确认。

## 已落地文件

| 层 | 文件 |
| --- | --- |
| Java wrapper | `electron/deviceAutomation/harmonyScrcpy/java/com/lime/harmonyscrcpy/HarmonyScrcpyWrapper.java` |
| 构建 | `scripts/device-automation/ensure-hoscrcpy.mjs`（校验 jar + javac 编译 wrapper.jar）；接入 `electron:build:host:dev` 与打包 staging |
| Electron | `harmonyScrcpy.ts`（spawn+ws 桥接+解帧+关键帧缓存）、`harmonyScrcpyPaths.ts`、runtime / host 命令 |
| Renderer | `components/HarmonyScrcpyPlayer.tsx`（jmuxer）、`src/vendor/jmuxer/`、`DeviceAutomationDebugPage.tsx` 平台分流、API、i18n |

---

## （原设计草案）
**参考**: HOScrcpy 官方仓库 <https://gitcode.com/OpenHarmonyToolkitsPlaza/HOScrcpy> · `hoscrcpy API介绍.md`

---

## 1. 背景与目标

现状：投屏（scrcpy）仅支持 Android。选中鸿蒙设备时，Debug 页显示
`deviceAutomation.debug.scrcpyUnsupportedPlatform`（"当前平台暂不支持 scrcpy 投屏，请使用 Android 设备"）。

目标：选中鸿蒙设备时走 **hoscrcpy** 实现投屏与远程控制（H.264 视频流 + 触控/按键注入）。

---

## 2. 现有 Android scrcpy 链路（为何不能直接复用）

| 层 | 实现 | 是否可复用于鸿蒙 |
| --- | --- | --- |
| Renderer 解码/控制 | `DeviceScrcpyPlayer.tsx` 用 `@yume-chan/scrcpy`（scrcpy 私有协议）+ `ScrcpyDirectClient` 拿视频流/控制通道，WebCodecs 解码 | ❌ 协议不同 |
| 传输 | adb reverse + scrcpy server jar + TCP socket（`scrcpyAdbFastPath.ts`） | ❌ adb/scrcpy 强耦合 |
| 控制 | `ScrcpyControlMessageWriter.injectTouch`（scrcpy 控制协议） | ❌ |
| 视口 UI | `DeviceMirrorViewport.tsx`、指针事件 → 设备坐标映射 | ✅ 可复用 |

结论：鸿蒙需要 **另起一条并行链路**，仅复用视口 UI 与坐标映射思路。

---

## 3. hoscrcpy SDK 能力（来自官方 API 文档）

- **形态**：Java jar（`hosscrcpy-1.0.x-beta.jar`，类在 `com.huawei.hosscrcpy.api`）。**不在仓库内，需向华为申请获取**（`liguangjie1@huawei.com` 等）。
- **依赖**：JRE 8+（本机已有 Java 17）；ffmpeg 原生库（bytedeco，需 `macosx-x86_64` / `windows-x86_64` classifier）；hdc（`HosRemoteConfig.setHdcPath`）。
- **核心类**：
  - `HosRemoteDevice(sn)` / `HosRemoteDevice(HosRemoteConfig)`
  - `startCaptureScreen(ScreenCapCallback)` → 回调 `onData(ByteBuffer)` 吐 **H.264 流**；`onReady()` 提示需触发画面变动；`onException()`
  - 控制：`onTouchDown/Up/Move(x,y)`、`onMouse*`、`setRotationHorizontal/Vertical()`
  - 其它：`getScreenSize(bool)`→`Size{width,height}`、`getLayout()`→UI 树 json、`executeShellCommand(cmd,timeout)`
  - `HosRemoteConfig`：`setScale/setBitRate/setPort(默认5000)/setFrameRate(默认120)/setHdcPath/setIFrameInterval`
- **官方 demo（web_demo）**：Java 起 WebSocket 服务包装 `HosRemoteDevice`，把 H264 推浏览器；网页用 `jmuxer` + MSE 渲染。

---

## 4. 建议架构：Java sidecar + 本地流 + Renderer 解码

对齐 Ember「桥接/采集在 Electron 侧、渲染在 renderer」范式，参考官方 web_demo：

```text
┌──────── Renderer ────────────────────────────────────┐
│ HarmonyScrcpyPlayer.tsx                               │
│   - 连接本地 WebSocket/TCP（Electron 分配端口）        │
│   - H.264 解码：WebCodecs VideoDecoder 或 jmuxer/MSE   │
│   - 指针事件 → 设备坐标 → 控制 JSON 发回 sidecar        │
│   - 复用 DeviceMirrorViewport 视口                     │
└───────────────┬──────────────────────────────────────┘
                │ 本地 WS（视频下行 + 控制上行）
┌───────────────▼──────────────────────────────────────┐
│ Electron Main                                         │
│   HarmonyScrcpyService（spawn Java sidecar）           │
│     java -cp <hosscrcpy.jar>:<wrapper> Wrapper \       │
│       --sn <serial> --hdc <path> --port <p> ...       │
│     生命周期：start/stop/端口分配/进程清理             │
└───────────────┬──────────────────────────────────────┘
                │ 调用 SDK
┌───────────────▼──────────────────────────────────────┐
│ Java Wrapper（我们写的小程序，~类似 MyWebSocket）      │
│   HosRemoteDevice + HosRemoteConfig(setHdcPath)       │
│   startCaptureScreen → 把 onData(ByteBuffer) 经 WS 下发 │
│   接收控制 JSON → onTouchDown/Up/Move / 导航           │
└───────────────┬──────────────────────────────────────┘
                │ hdc fport + 设备侧服务
┌───────────────▼──────────────────────────────────────┐
│ HarmonyOS 设备（SDK 自动拉起设备侧投屏服务）           │
└───────────────────────────────────────────────────────┘
```

**为什么用 Java sidecar**：hoscrcpy 只有 Java SDK，Electron/Node 无法直接调用；必须以子进程方式承载，通过本地 WS/TCP 桥接给 renderer（与官方 web_demo 一致，风险最低）。

### 4.1 组件清单（预估）

| 层 | 新增/改动 |
| --- | --- |
| 资源 | `resources/device-automation/hoscrcpy/hosscrcpy-<ver>.jar` + 我们的 wrapper jar；`scripts/device-automation/ensure-hoscrcpy.mjs` 校验存在 |
| Java wrapper | 新工程（Maven，含 ffmpeg macos/win classifier）编译出 wrapper jar |
| Electron | `electron/deviceAutomation/harmonyScrcpy.ts`（spawn java、端口分配、生命周期）+ host 命令 `device_automation_harmony_scrcpy_*` + runtime 委托 |
| Renderer | `HarmonyScrcpyPlayer.tsx`（WS 连接 + H264 解码 + 控制）；`DeviceAutomationDebugPage.tsx` 平台分支：harmony → HarmonyScrcpyPlayer，android → 现有 DeviceScrcpyPlayer |
| i18n | zh-CN/en-US 投屏状态/错误文案 |

---

## 5. 关键决策（待确认）

1. **SDK jar 获取**：hoscrcpy jar 不公开，需人工申请。放置路径建议 `resources/device-automation/hoscrcpy/`（对齐 scrcpy.jar）。→ 需你提供 jar。
2. **Java 运行时**：本机已有 Java 17。生产是否要求系统 Java / 打包 JRE？（Fastbot 走 python venv，暂无内置 JRE）
3. **投屏范围**：先「只读投屏」验证链路，还是一步到位「投屏 + 触控 + 导航」？
4. **解码方案**：WebCodecs `VideoDecoder`（与现有 Android 一致，需自行拆 H264 NALU/SPS-PPS）vs `jmuxer` + MSE（与官方 demo 一致，接入快）。
5. **桥接协议**：本地 WebSocket（demo 同款）vs Electron IPC + 本地 TCP（与现有 scrcpy 桥接更一致）。

---

## 6. 阻塞项

- **P0**：`hosscrcpy-1.0.x-beta.jar` 未获取——无此 jar 无法编译 wrapper、无法联调。
- **P1**：ffmpeg 原生库需按平台（macOS/Windows）打包，跨平台产物体积与签名需评估。
- **P1**：设备侧投屏服务由 SDK 自动拉起，需真机验证权限（开发者模式 + USB 调试）。

---

## 7. 未决 → 落地顺序（拟）

1. 获取 jar → 建 Java wrapper 工程（Maven）→ 本地 `java -jar` 单测投屏可用
2. Electron sidecar 接入（spawn + 端口 + 生命周期）
3. Renderer HarmonyScrcpyPlayer（解码 + 视口）
4. 控制注入（touch/nav）
5. Debug 页平台分支 + i18n + 真机 quickstart
