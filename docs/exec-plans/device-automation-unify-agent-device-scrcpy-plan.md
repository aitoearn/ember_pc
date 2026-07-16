# 端自动化统一：agent-device + scrcpy（去 AutoGLM sidecar）

> 状态：进行中（P1/P2/P3 最小链路已推进，待真实设备联调与打包收口）  
> 更新时间：2026-06-15  
> 主文档：`internal/aiprompts/device-automation.md`  
> 进度日志：`internal/exec-plans/device-automation-unify-agent-device-scrcpy-progress.md`  
> 背景：`docs/20260608_三端统一：AndroidiOSHarmonyOS设备抽象层的设计与实现.md`

## 1. 目标

在 **不包含 AutoGLM 内置 Phone Agent（Genie）** 的前提下，把 Ember「端自动化」调试页的 Android 投屏与触控，从 **AutoGLM-GUI Python sidecar** 迁到 **agent-device 设备主链**，实现：

```text
Ember Renderer
  -> Electron DeviceAutomation Runtime
  -> agent-device daemon（长连）
       ├─ devices / screenshot / press / swipe / back / home（已有）
       └─ scrcpy bootstrap（adb reverse + server 启动，新增）
```

**成功标准（可交付）：**

1. Android 调试页 scrcpy 投屏、坐标 tap/swipe、back/home **不再依赖** `AutoGLM-GUI` 进程。
2. 设备列表、iOS/Harmony 截图与触控 **仍只走 agent-device**（架构单轨）。
3. 打开设备 / 刷新列表 **不再** 每次 `spawnSync` 新 Node CLI（daemon 长连或等价 RPC）。
4. Release 安装包可声明依赖：`agent-device` + `scrcpy-server`（+ 平台 adb），**不要求**用户自装 Python AutoGLM。
5. 参考 `aya`，渲染端直接使用 `@yume-chan/scrcpy` 解析 scrcpy 原生 video/audio/control socket，避免在 agent-device 中二次转发 H.264 包。

**明确不在本计划内（可另开计划）：**

- Genie 自然语言 Phone Agent（原 AutoGLM `task-sessions` / `tasks` / `events`）。
- AutoGLM 产品能力：WiFi 配对、mDNS、远程设备、设备分组 UI。
- iOS 实时视频投屏（WDA 视频流）；本计划 iOS 仍截图模式。

## 2. 现状与差距

| 能力 | 当前 owner | 目标 owner |
| --- | --- | --- |
| 设备列表 | agent-device CLI（慢） | agent-device daemon + 缓存 |
| Android scrcpy | AutoGLM Socket.IO | agent-device bootstrap + Renderer 原生 scrcpy client |
| Android 触控（scrcpy 模式） | AutoGLM `/api/control/*` | Renderer `ScrcpyControlMessageWriter` 原生 control socket |
| Android 导航（sidecar ready） | AutoGLM control | agent-device back/home |
| Android 截图 fallback | AutoGLM `/api/screenshot` 或 CLI | agent-device screenshot |
| Genie | AutoGLM task API | **本计划移除或冻结** |
| 打包 | 未 bundle 任一侧车 | bundle agent-device + scrcpy 资源 |

**参考实现：**

- `aya/src/main/lib/adb/scrcpy.ts` — 主进程 push `scrcpy.jar` 并用 `app_process` 启动 scrcpy server。
- `aya/src/main/lib/adb/base.ts` — `reverseTcp(deviceId, localabstract:...)`，复用已有 reverse 时直接返回本地端口。
- `aya/src/renderer/screencast/lib/ScrcpyClient.ts` — Renderer 先建本地 TCP server，再调用主进程启动 scrcpy；video/audio/control 三条 socket 由 `@yume-chan/scrcpy` 原生解析。
- `aya/script/scrcpy.mjs` / `aya/script/adb.mjs` / `aya/script/pack.mjs` — 下载 `scrcpy.jar` / 平台 adb，并通过 `extraResources` 打包。
- AutoGLM 只作为历史对照：它把 scrcpy 原始流包装成 Socket.IO `video-data`，Ember 新路线不采用这层包装。

**agent-device 现状：** 无 scrcpy bootstrap / ADB reverse API；已有 Android `press/swipe/back/home/screenshot` 与 daemon HTTP RPC。

## 3. 架构决策（冻结）

### AD-1：scrcpy 启动与资源归属 agent-device daemon

scrcpy server 资源、adb push、adb reverse、`app_process com.genymobile.scrcpy.Server` 启动归属 **agent-device**。这样设备层仍单轨，且 release 只需要 bundle agent-device + Android 工具链。

### AD-2：采用 `aya` 的原生 scrcpy client 形态

不在 agent-device 中实现 Socket.IO `video-data` 二次封装。Renderer 参考 `aya`：

1. 生成稳定 `scid`，调用 agent-device `reverseTcp` / `startScrcpy`。
2. 在 Renderer 侧建立本地 TCP server 接收 scrcpy 反向连接。
3. 第一条 socket 作为 video；后续 socket 通过 scrcpy audio metadata 探测区分 audio/control。
4. 使用 `ScrcpyOptions3_1`、`parseVideoStreamMetadata`、`createMediaStreamTransformer`、`ScrcpyControlMessageWriter` 完成解码与触控。

这比 Socket.IO 包装更低延迟，也避免 agent-device 维护媒体包协议。

### AD-3：Genie 与设备层解耦

本计划完成后，端自动化调试页 **不再启动** `AutoGLM-GUI`。Genie 若保留，改接 **App Server / RuntimeCore Agent**（另计划）；否则 UI 隐藏或标注「后续版本」。

### AD-4：打包只 bundle 设备层

`forge.config.mjs` `extraResource` 增加 `agent-device`、`scrcpy.jar` 和平台 adb 资源；**不** bundle AutoGLM Python 环境（本计划完成后可从 release 移除）。`aya` 的 `resources` 目录整体进入 `extraResources` 是可参考模式。

### AD-5：平台路径

`resolveToolRoot` 在 `app.isPackaged` 时指向 `process.resourcesPath` 下资源；开发态仍支持 sibling `../agent-device`。

## 4. 阶段计划

### P0 — 范围冻结与守卫（Ember）

**状态：** `进行中`

**内容：**

1. 更新 `internal/aiprompts/device-automation.md`：标明 AutoGLM 为 **过渡辅链**，本计划为 current 目标。
2. 在调试页增加 feature flag（如 `DEVICE_AUTOMATION_STREAM_BACKEND=agent-device|autoglm`，默认 autoglm 直至 P3 完成）便于 A/B。
3. 登记 `tech-debt-tracker.md`：`DA-001` 双 backend 并行债务与退出条件。

**退出条件：**

- 计划 + progress 文件入仓，README 索引可发现。
- 无代码行为变更或 flag 默认不改变生产路径。

---

### P1 — agent-device daemon 长连（Ember 性能前置）

**状态：** `进行中`

**问题：** 每次 IPC 触发 `spawnSync` → 新 Node → CLI，单次 ~2–3s。

**内容（Ember `electron/deviceAutomation/`）：**

1. 新增 `agentDeviceDaemonClient.ts`：启动/连接 agent-device HTTP daemon（复用 `AGENT_DEVICE_DAEMON_SERVER_MODE=http`）。
2. `listDevices` / `captureScreenshot` / 导航 / 触控 **优先走 daemon RPC**，CLI 仅 fallback。
3. 参考 `aya` 的设备发现方式，为 Android 增加常驻 watcher：
   - `aya/src/main/lib/adb.ts` 使用 `@devicefarmer/adbkit` `client.trackDevices()` 监听 `add/remove`。
   - 事件发生后延迟 2s 发送 `changeDevice`，Renderer 收到后再 `getDevices()`。
   - Ember 可在 Electron 或 agent-device daemon 里暴露 `device_inventory_changed` 事件，Renderer 订阅后刷新列表。
4. 进程内缓存设备列表（TTL 3–5s）+ `force` 刷新；Android 列表可选 `--platform android` 减少扫描。
5. Android fast path：已知只展示 Android 时，直接用 adb/daemon 缓存，不触发 iOS/Linux 全平台 inventory；三端列表需要时再合并。
6. 单测：mock daemon 响应，断言不再 `spawnSync` 多次；mock watcher 断言 add/remove 事件触发一次刷新。

**退出条件：**

- 列表刷新单次 < 1s（本机 adb 可见 1 台 Android 时）。
- 新插入/拔出 Android 设备后，列表在 2–3s 内自动更新（无需手点刷新）。
- `npm run typecheck:electron` + 定向 vitest 通过。

---

### P2 — agent-device：scrcpy bootstrap 与 ADB reverse（sibling 仓库）

**状态：** `进行中`

**建议落点：** `agent-device/src/platforms/android/scrcpy.ts` + daemon inventory/control handler，或 `src/daemon/handlers/session-scrcpy.ts`

**内容：**

1. **资源定位：** 支持 `SCRCPY_SERVER_PATH`，否则从 packaged `resources/scrcpy.jar` 或 agent-device bundle 中解析；参考 `aya/script/scrcpy.mjs` 下载 `scrcpy-server-v3.1` 后命名为 `scrcpy.jar`。
2. **ADB reverse API：** 新增 daemon 方法：`android.reverse_tcp(deviceId, remote)`，语义对齐 `aya`：如果已有 reverse 指向同一 `localabstract:scrcpy_<scid>`，直接返回本地端口；否则申请空闲端口并 `adb reverse`。
3. **Start API：** 新增 daemon 方法：`android.start_scrcpy(deviceId, args[])`，执行：
   ```bash
   adb -s <device> push <scrcpy.jar> /data/local/tmp/ember/scrcpy.jar
   adb -s <device> shell CLASSPATH=/data/local/tmp/ember/scrcpy.jar app_process /system/bin com.genymobile.scrcpy.Server 3.1 <args...>
   ```
   shell 输出只记录日志，不参与媒体流转发。
4. **生命周期：** 每个 device/scid 最多一个活跃启动；Renderer 断开本地 TCP server 后允许下次重启；必要时提供 `android.stop_scrcpy(deviceId, scid)`。
5. **命令面（可选公开 CLI）：** `agent-device scrcpy start --serial <id> --scid <id>` 用于联调；Ember 正式路径走 daemon RPC。
6. **测试：** fake adb 断言 push、reverse、shell 参数；reverse 复用；scrcpy.jar 缺失错误中文提示。

**退出条件：**

- 独立启动 agent-device daemon 后，Ember/最小 Renderer client 可通过 `reverse_tcp + start_scrcpy` 接收到 video socket。
- Android 物理机或 emulator 手动冒烟通过（macOS + Windows 各 1 次）。

---

### P3 — Ember 切换 stream backend（去 AutoGLM 投屏）

**状态：** `进行中`

**内容：**

1. 新增 Renderer `AgentDeviceScrcpyClient`（参考 `aya/src/renderer/screencast/lib/ScrcpyClient.ts`）：
   - `ScrcpyOptions3_1({ audio, videoBitRate, maxSize, clipboardAutosync, stayAwake })`
   - `main/deviceAutomation.reverseTcp(deviceId, localabstract:scrcpy_<scid>)`
   - `node.createServer(...)` 接收 video/audio/control socket
   - `@yume-chan/scrcpy-decoder-webcodecs` 渲染 video
   - `ScrcpyControlMessageWriter` 注入 touch / key / scroll
2. `DeviceScrcpyPlayer` 不再使用 `socket.io-client`，改为挂载原生 client 返回的 video element/canvas。
3. Electron API 增加：
   - `device_automation_scrcpy_reverse_tcp`
   - `device_automation_scrcpy_start`
   - 可选 `device_automation_scrcpy_stop`
4. `DeviceAutomationDebugPage`：Android scrcpy backend 从 AutoGLM `baseUrl` 改为 agent-device native client。
5. `useDeviceAiTask`：**移除** Android 进页 warm `AutoGLM sidecar`（Genie 未迁移前，Genie 面板 disabled + 文案）。
6. scrcpy 模式 touch/scroll/key 直接写 scrcpy control socket；非 scrcpy 模式继续 agent-device `press/swipe`。
7. 导航：Android 统一 agent-device `back/home` 或 scrcpy control `injectKeyCode(AndroidKeyCode.Back/Home)`，二选一后固定。
8. 截图 fallback：去掉 `tryCaptureAutoGlmScreenshot`，只保留 agent-device + daemon。
9. Feature flag 默认切到 `agent-device-native-scrcpy`；保留 1 个版本 autoglm fallback 后删除。

**删除/deprecated（P3 末尾）：**

- `electron/deviceAutomation/autoGlmSidecar.ts`
- `electron/deviceAutomation/autoGlmApi.ts` 中与 device automation 相关的 control/screenshot/task（若 Genie 未迁完，task 部分可暂留到 P5）
- IPC：`device_automation_ensure_ai_sidecar` 等 **仅服务投屏** 的命令

**退出条件：**

- Android 调试页全程无 AutoGLM 进程（`ps` 验证）。
- `npm run verify:gui-smoke` 端自动化路径通过。
- scrcpy 失败仍回退截图模式（agent-device）。
- Touch move / wheel / clipboard / screen power mode 至少保留可扩展接口；首版可只交付 pointer touch + back/home。

---

### P4 — Genie 处置（二选一，计划内必须定案）

**状态：** `todo`

**选项 A — 冻结 Genie（推荐先做）：**

- 隐藏或禁用 `DeviceAutomationGeniePanel` 提交入口，保留 UI 占位与 i18n「即将支持」。
- 删除 Ember 对 AutoGLM task API 的 IPC 与 `useDeviceAiTask` 提交链。

**选项 B — 迁到 App Server Agent：**

- 新计划：`device-automation-genie-app-server-plan.md`
- 调试页 Genie 走 `safeInvoke` → App Server JSON-RPC → RuntimeCore Agent turn。
- 本计划 P3 可并行，但 **不得** 再依赖 AutoGLM sidecar。

**退出条件：**

- 产品确认 A 或 B；文档与 UI 一致；无「半连接 AutoGLM」死代码。

---

### P5 — Release 打包

**状态：** `todo`

**内容：**

1. 构建脚本：`scripts/device-automation/stage-agent-device.mjs`（build agent-device + copy dist/bin）。
2. 构建脚本：`scripts/device-automation/stage-scrcpy-resources.mjs`（copy `scrcpy.jar`，平台 adb 策略文档化；参考 `aya/script/scrcpy.mjs` 与 `aya/script/adb.mjs`）。
3. `forge.config.mjs` `extraResource` 增加 staged 目录。
4. `resolveToolRoot.ts`：`app.isPackaged` → `path.join(process.resourcesPath, 'agent-device')`。
5. 启动时确保 daemon 使用包内 Node（`DEVICE_AUTOMATION_NODE`）与 stateDir（userData）。
6. 签名/notarization：extraResource 内二进制纳入 macOS/Windows 签名策略说明。

**退出条件：**

- 干净机器安装 Ember release 后，无 sibling 仓库、无 Python，端自动化 Android 可列表 + scrcpy。
- `npm run verify:app-version` + 打包冒烟 checklist 完成。

---

### P6 — 清理与文档收口

**状态：** `todo`

1. 删除 AutoGLM 相关 env 文档中的 **current** 表述（改为 historical / Genie 专用若 B）。
2. 更新 MyWiki / `device-automation.md` 架构图为单 backend。
3. 移除 `commandPolicy` / `ipcChannels` 中 dead AutoGLM device 命令。
4. `tech-debt-tracker.md` 关闭 `DA-001`。

## 5. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| scrcpy-server/adb 平台差异 | P2 双平台冒烟；资源路径可配置 |
| Renderer 直接使用 Node `net` 能力的安全边界 | 通过 preload 暴露窄 API 或由 Electron 主进程代建 TCP server；禁止暴露通用 socket 能力 |
| scrcpy 原生 socket 顺序与音频/control 识别 | 参考 `aya`：第一条 video，后续先读 4 字节 audio metadata，1s 内未识别则当 control |
| 打包体积增大 | scrcpy-server 单版本；adb 可选系统 PATH |
| Genie 功能回退 | P4 产品定案；App Server 路线单独里程碑 |
| agent-device 与 Ember 版本耦合 | stage 脚本锁 agent-device git tag / submodule 版本 |

## 6. 验证清单

```bash
# Ember
npm run typecheck:electron
npx vitest run src/features/device-automation electron/ipcChannels.test.ts
npm run verify:gui-smoke

# agent-device（P2 后）
cd ../agent-device && pnpm test
# 手动：daemon + reverseTcp + startScrcpy + Renderer native client 冒烟
```

## 7. 建议实施顺序（下一刀）

1. **P1**（Ember only，无 sibling 阻塞）— 立刻改善列表/截图慢。  
2. **P2**（agent-device）— 先补 `reverse_tcp + start_scrcpy`，不做媒体转发。  
3. **P3** — 参考 `aya` 改造 Ember Renderer 原生 scrcpy client。  
4. **P4** — Genie 定案。  
5. **P5** — 打包。

**整体目标完成度口径：** P3 + P5 完成 = 主线 100%（Genie 另计）。

## 8. aya 参考结论（2026-06-15）

`/Users/lisq/ai/testplatform/aya` 提供了更适合 Ember 的实现路线：

1. **主进程不转发媒体包**：只用 `@devicefarmer/adbkit` 做 `adb reverse`、push `scrcpy.jar`、shell 启动 `com.genymobile.scrcpy.Server`。
2. **Renderer 原生消费 scrcpy socket**：本地 `node.createServer` 接收设备反向连接，交给 `@yume-chan/scrcpy` 解析 video/audio/control。
3. **触控走 scrcpy control socket**：`ScrcpyControlMessageWriter.injectTouch / injectScroll / injectKeyCode`，比 HTTP tap/swipe 更贴近投屏帧。
4. **资源打包简单**：`resources/scrcpy.jar` + `resources/adb/*` 进 `extraResources`，不需要 Python/AutoGLM。
5. **设备发现是事件驱动**：`aya/src/main/lib/adb.ts` 创建一个长期 `Adb.createClient({ bin })`，调用 `client.trackDevices()` 监听 `add/remove`，收到变化后 2s 延迟广播 `changeDevice`，Renderer 再调用 `getDevices()`。这比 Ember 当前每次 `spawnSync agent-device devices` 快，也比纯 UI 轮询更及时。
6. **设备详情按需补齐**：`getDevices()` 只取 Android `device/emulator`，再并发 `getProperties()` 拼设备名/版本；没有每次扫 iOS/Linux，也没有进入详情前读取性能、存储、网络等重字段。
7. **对 Ember 的修正**：P1 应补 daemon 长连 + Android watcher + 平台 fast path；P2 不应做 Socket.IO `video-data` server；应先让 agent-device 暴露 `reverse_tcp` 与 `start_scrcpy`，P3 再把 `DeviceScrcpyPlayer` 改造成 aya-style native client。
