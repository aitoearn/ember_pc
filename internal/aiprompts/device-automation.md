# 端自动化（Device Automation）

## 这份文档回答什么

本文件说明 Ember 桌面端 **「端自动化」** 功能的工程事实源，主要回答：

- 产品入口、架构分层与外部依赖边界
- Electron Desktop Host 命令与前端 API 网关的对应关系
- 本地开发与联调的前置条件
- 当前完成度、已知限制与下一刀

它是 **实现与联调手册**，不是 AutoPilot 产品愿景原文。背景材料见仓库 `docs/20260531_AutoPilot*.md` 与 `docs/20260608_三端统一*.md`。

## 产品入口

| 项 | 说明 |
| --- | --- |
| 侧边栏 | 「端自动化」，位于「新建任务」下方 |
| 页面类型 | `device-automation`（`src/types/page.ts`） |
| 列表视图 | 本机设备卡片、筛选、分页、自动刷新 |
| 调试视图 | 左侧设备预览 + 右侧 UI Genie 指令面板 |

前端模块根目录：`src/features/device-automation/`  
API 网关：`src/lib/api/deviceAutomation.ts`（统一 `safeInvoke`）

## 架构（current）

端自动化 current 主链已经收敛到 **agent-device + Renderer native scrcpy**。`AutoGLM-GUI` 不再承担设备列表、截图、导航、触控或 Android scrcpy；Genie / Phone Agent 能力当前冻结，后续如保留应迁到 App Server / RuntimeCore Agent。

```
┌─────────────────────────────────────────────────────────┐
│  Ember Renderer（device-automation feature）              │
│  ScrcpyDirectClient + scrcpyNode.createServer（aya 架构）│
└───────────────┬─────────────────────────────────────────┘
                │ safeInvoke（reverse / start / prewarm）
                ▼
┌───────────────────────────┐
│  Electron DeviceAutomation │
│  Runtime + adb 快路径        │
└───────────────┬───────────┘
                │ daemon / CLI fallback
                ▼
        ┌───────────────┐
        │  agent-device │◄──── adb reverse ──── Renderer TCP
        │  devices 等主链│              scrcpy server 回连
        └───────────────┘
```

| 层级 | 技术 | 职责 |
| --- | --- | --- |
| **设备层（主链）** | `agent-device` daemon / CLI fallback | 三端设备发现、截图、返回/主页、坐标 press/swipe |
| **投屏层（主链）** | `@yume-chan/scrcpy` + preload `scrcpyNode` | Renderer 内 TCP 监听 adb reverse 回连，WebCodecs + control socket 触控（对齐 aya） |
| **AI 层（冻结）** | AutoGLM-GUI task API（历史） | Genie / Phone Agent 暂不可用；不得再因进入调试页自动启动 |
| **桌面壳** | Electron Desktop Host | agent-device 生命周期、adb reverse/start、jar 预热 |

设计依据：

- `docs/20260608_三端统一*.md` — 设备抽象层应由独立工具承担，上层只消费统一语义
- `docs/20260605_AI自动化Agent框架*.md` — AI 执行与设备执行分离
- 参考 UI：`lmweb` `UIAgent/DeviceDebug`、`CloudDeviceView`

## 代码地图

### Electron（Desktop Host）

| 路径 | 职责 |
| --- | --- |
| `electron/deviceAutomation/runtime.ts` | 统一 facade：`ensure` / 列表 / 截图 / 导航 / 触控 / scrcpy reverse/start |
| `electron/deviceAutomation/agentDeviceCli.ts` | 调用 `agent-device` CLI（`devices` / `screenshot` / `back` / `home` / `press` / `swipe`） |
| `electron/deviceAutomation/agentDeviceDaemonClient.ts` | 调用 agent-device HTTP daemon，优先承接热路径 |
| `electron/deviceAutomation/deviceInventoryWatcher.ts` | `adb track-devices` 事件监听与 Android 快照缓存 |
| `electron/deviceAutomation/scrcpyAdbFastPath.ts` | adb reverse / push / start 快路径与 jar 缓存 |
| `electron/preload/scrcpyNodeBridge.ts` | preload 暴露 `node.createServer`（aya 同款） |
| `electron/deviceAutomation/autoGlmSidecar.ts` | 历史 Genie 依赖；当前调试页不再主动启动 |
| `electron/deviceAutomation/autoGlmApi.ts` | 历史 task API 封装；Genie 冻结期间不应被主路径调用 |
| `electron/deviceAutomation/http.ts` | 历史 sidecar HTTP JSON 工具 |
| `electron/deviceAutomationSidecar.ts` | 对外 re-export（历史文件名保留） |

Host 命令注册：`electron/hostCommands.ts`  
IPC 白名单：`electron/ipcChannels.ts`  
DevBridge policy：`src/lib/dev-bridge/commandPolicy.ts`

### 前端

| 路径 | 职责 |
| --- | --- |
| `DeviceAutomationWorkspace.tsx` | list / debug 路由 |
| `DeviceAutomationListPage.tsx` | 设备列表 UI |
| `DeviceAutomationDebugPage.tsx` | 调试页布局 |
| `components/DeviceScreenshotMirror.tsx` | agent-device 截图轮询 + 触控 fallback |
| `components/DeviceScrcpyPlayer.tsx` | Android native scrcpy（ScrcpyDirectClient + WebCodecs + scrcpyNode 直连） |
| `components/DeviceAutomationGeniePanel.tsx` | UI Genie 冻结态占位与迁移中文案 |
| `hooks/useDeviceAiTask.ts` | 返回 Genie 冻结状态；不再 warm / prepare / submit AutoGLM task |
| `domain/deviceProjection.ts` | agent-device 记录 → 卡片模型 |
| `domain/aiTaskProjection.ts` | 历史 AutoGLM task event → Genie 步骤；待后续 Genie 计划处置 |

## Electron Host 命令

所有命令经 `safeInvoke` 进入，**禁止**生产路径 mock。

| 命令 | 用途 |
| --- | --- |
| `device_automation_ensure_sidecar` | 确保 agent-device 就绪（兼容旧名 sidecar） |
| `device_automation_get_sidecar_status` | 同上，返回 runtime 状态 |
| `device_automation_list_devices` | 列出本机设备 |
| `device_automation_capture_screenshot` | 截图（base64） |
| `device_automation_send_navigation` | `back` / `home` |
| `device_automation_send_tap` | 坐标点击（agent-device） |
| `device_automation_send_swipe` | 坐标滑动（agent-device） |
| `device_automation_inventory_changed` | Android 设备上线/下线事件，Renderer 收到后刷新列表 |
| `device_automation_scrcpy_reverse_tcp` | 为 scrcpy `localabstract:scrcpy_<scid>` 建立 adb reverse |
| `device_automation_scrcpy_start` | 通过 agent-device 启动 Android scrcpy server |
| `device_automation_scrcpy_launch` | reverse + fire-and-forget start（单次 IPC） |
| `device_automation_scrcpy_prewarm` | 后台 push scrcpy.jar（列表/调试页预热，连接热路径跳过 stat/push） |
| `device_automation_ensure_ai_sidecar` | 历史 AutoGLM Genie 入口；当前调试页不再主动调用 |
| `device_automation_prepare_ai_session` | 历史 AutoGLM task session；冻结期间不应被主路径调用 |
| `device_automation_submit_ai_task` | 历史 AutoGLM task 提交；冻结期间不应被主路径调用 |
| `device_automation_poll_ai_task` | 历史 AutoGLM task 轮询；冻结期间不应被主路径调用 |
| `device_automation_cancel_ai_task` | 历史 AutoGLM task 取消；冻结期间不应被主路径调用 |
| `device_automation_stop_sidecar` | 历史 sidecar 停止命令 |

参数契约见 `electron/hostCommands.ts` 中 `read*Params` 辅助函数；类型见 `src/features/device-automation/types.ts`。

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `DEVICE_AUTOMATION_AGENT_DEVICE_ROOT` | packaged `resources/device-automation/agent-device`，开发态同级 `../agent-device`（其次 `../../agent-device`） | agent-device 工程根目录 |
| `DEVICE_AUTOMATION_AGENT_DEVICE_STATE_DIR` | `userData/device-automation/agent-device-state` | CLI state 目录 |
| `DEVICE_AUTOMATION_SCRCPY_SERVER_PATH` | packaged `resources/device-automation/scrcpy.jar`，开发态可指向 `.tmp/device-automation/scrcpy.jar` | scrcpy server jar |
| `DEVICE_AUTOMATION_ADB_DIR` | packaged `resources/device-automation/adb`，开发态可指向 `.tmp/device-automation/adb` | adb 二进制目录 |
| `DEVICE_AUTOMATION_AUTOGLM_ROOT` | 同级 `../AutoGLM-GUI`（其次 `../../AutoGLM-GUI`） | 历史 Genie 依赖；当前主链不需要 |
| `DEVICE_AUTOMATION_AUTOGLM_PORT` | `28766` | 历史 AutoGLM sidecar 端口 |
| `DEVICE_AUTOMATION_PYTHON` | `python3` | 历史 AutoGLM 启动解释器 |

## 本地联调前置

### 1. agent-device（必须）

```bash
cd ../agent-device
pnpm build
```

验证：

```bash
node bin/agent-device.mjs devices --json
```

### 2. scrcpy / adb 资源（打包验收需要）

```bash
npm run electron:download:scrcpy-server
npm run electron:download:adb
npm run electron:build:device-automation-assets
```

开发态也可用环境变量指向临时资源：

```bash
DEVICE_AUTOMATION_SCRCPY_SERVER_PATH=.tmp/device-automation/scrcpy.jar \
DEVICE_AUTOMATION_ADB_DIR=.tmp/device-automation/adb \
npm run electron:build:device-automation-assets
```

### 3. AutoGLM-GUI（仅历史 Genie，不是主链前置）

当前调试页不会因为进入页面自动拉起 AutoGLM。若后续恢复 Genie / Phone Agent，需要另走 App Server / RuntimeCore Agent 计划；不要把 AutoGLM 作为新主链依赖继续扩展。

### 4. 启动 Ember

```bash
cd ember
npm run dev
```

注意：

- Cursor Agent 环境可能设置 `ELECTRON_RUN_AS_NODE=1`，会导致 `app.getPath` 报错。本机终端应确保该变量未设置；若异常：`unset ELECTRON_RUN_AS_NODE && npm run dev`
- Android 设备需 `adb devices` 可见；iOS 需对应工具链

### 5. 验证路径

1. 侧边栏 → **端自动化**
2. 确认设备卡片在线
3. **立即使用** → 调试页
4. Android：优先 native scrcpy；失败回退 agent-device 截图
5. 右侧 Genie：展示迁移中/暂不可用，不应启动 AutoGLM sidecar

## 调试页行为摘要

| 平台 | 左侧预览 | 触控 | 右侧 AI |
| --- | --- | --- | --- |
| Android | native scrcpy → 失败则截图轮询 | scrcpy control socket；fallback 走 agent-device press/swipe | Genie 冻结 |
| iOS | 截图轮询 | agent-device press/swipe | Genie 冻结 |
| Harmony | 截图轮询（能力随 agent-device） | 同上 | Genie 冻结 |

卡片模型字段 `agentPlatform` 保存 agent-device 原始 platform 字符串；UI 展示用 `platform`（android/ios/harmony）。

## 测试与校验

```bash
npm run typecheck:electron
npx vitest run src/features/device-automation electron/ipcChannels.test.ts
```

改动 IPC 或 Host 命令后同步检查：

- `electron/ipcChannels.ts`
- `src/lib/dev-bridge/commandPolicy.ts`
- `src/lib/api/deviceAutomation.ts`

GUI 冒烟（涉及侧边栏入口时）：

```bash
npm run verify:gui-smoke
```

## 交付进度（2026-06-15）

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| P0 | 范围冻结与工程导航 | 进行中，本文件已切到 current 主链 |
| P1 | agent-device daemon 长连、Android `adb track-devices` 自动刷新、列表 fast path | ✅ |
| P2 | agent-device scrcpy reverse/start 最小 daemon 命令 | ✅ 最小链路，待真实设备联调 |
| P3 | Ember native scrcpy backend、Electron socket bridge、Renderer video/control client | ✅ 最小链路，待真实设备联调 |
| P4 | Genie 冻结，不再预热/提交 AutoGLM task | ✅ 冻结态 |
| P5 | Forge `extraResource`、scrcpy/adb 下载脚本、agent-device 最小运行时 staging/verify | 进行中，package-dir 验收中 |
| P6 | 删除 dead IPC / 文档收口 / 真实设备 GUI 冒烟 | ⏳ 未完成 |

Git 提交：

- `8ff57a14` — P1 入口与 AutoGLM sidecar
- `101bf28e` — A′′：agent-device 主链 + P2
- `f0653ad4` — P3 UI Genie + P4 scrcpy

## 已知限制

1. **真实设备联调未完成**：native scrcpy video/control 最小链路已有单测与 build 验证，但仍需 Android emulator / 物理机验证 socket 顺序、首帧、触控坐标和断线恢复。
2. **Genie 仍是冻结态**：当前不会启动 AutoGLM，也不提供自然语言 Phone Agent；若产品保留 Genie，需要新计划迁到 App Server / RuntimeCore Agent。
3. **scrcpy 依赖 WebCodecs**：不支持时自动回退截图模式。
4. **Harmony 完整能力**取决于 agent-device 对该平台的实际支持度。

## 下一刀建议

**Current 主线（去 AutoGLM sidecar）：** 见 `internal/exec-plans/device-automation-unify-agent-device-scrcpy-plan.md`

1. **P5** — 完成 `electron:package:dir` 端到端验收，确认 packaged `resources/device-automation` 被 Forge 带入。
2. **P3/P6** — 真实 Android 设备联调 native scrcpy 首帧、触控、断线回退，并补 GUI 冒烟证据。
3. **P6** — 清理冻结后不再需要的 AutoGLM IPC / API dead path，或为 Genie 新计划明确 owner 与退出条件。

**后续（本计划外）：**

1. lmweb 对齐：指令库、Assistant 配置、探索模式
2. iOS WDA 投屏或稳定截图帧率优化
3. **UI Genie 恢复** — 见 `internal/roadmap/device-ui-agent/README.md` 与 `internal/exec-plans/device-ui-agent-plan.md`（App Server `device_control` + 服务模型，参考 ClawMobile / lmuiagent；不恢复 AutoGLM sidecar）

## 相关文档

- `internal/roadmap/device-ui-agent/README.md` — Device UI Agent 方案（自然语言操控手机）
- `internal/exec-plans/device-ui-agent-plan.md` — UI Agent 分阶段实施计划
- `internal/exec-plans/device-automation-unify-agent-device-scrcpy-plan.md` — 统一 agent-device + scrcpy 执行计划
- `internal/exec-plans/device-automation-unify-agent-device-scrcpy-progress.md` — 进度日志

- `docs/20260531_AutoPilot：AI驱动的移动端自动化测试平台.md` — 产品背景
- `docs/20260608_三端统一：AndroidiOSHarmonyOS设备抽象层的设计与实现.md` — 设备层设计
- `docs/20260605_AI自动化Agent框架：移动端UI测试的架构设计与模式选择.md` — Agent 架构
- `commands.md` — Electron Host 通用边界（端自动化命令细节以本文为准）
- `playwright-e2e.md` — GUI 续测（端自动化 GUI 冒烟可复用 electron:dev 流程）
