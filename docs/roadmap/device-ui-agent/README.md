# Device UI Agent（手机 UI Agent）方案

> 状态：设计稿（2026-06-16）  
> 关联：`docs/aiprompts/device-automation.md`、`docs/exec-plans/device-ui-agent-plan.md`  
> 参考：`ClawMobile`（`/Users/lisq/ai/testplatform/ClawMobile`）、`lmuiagent`（`/Users/lisq/lmcloudtest/lmuiagent`）

## 1. 这份文档回答什么

Ember「端自动化」右侧 **UI Genie** 当前冻结（`useDeviceAiTask.ts` 全 stub）。本方案定义如何用 **共享 AgentRuntime** 恢复自然语言操控手机，并吸收 ClawMobile / lmuiagent 的可复用设计，而不是重启 AutoGLM sidecar 或另造第四类 Agent 进程。

## 2. 产品定位

| 维度 | 结论 |
| --- | --- |
| **是不是独立 Agent runtime** | 否。走 App Server `agentSession/*` + 同一套 AgentRuntime |
| **是不是独立 Agent App** | 第一版否；调试页 Genie 为主入口。后续可包装为 Agent App 独立工作台 |
| **设备执行 owner** | 保持 **agent-device + Electron DeviceAutomation**（current 主链） |
| **AI 推理 owner** | App Server modality `device_control` + `service_models` 模型槽 |
| **ClawMobile 关系** | 借鉴 **工具分层、渐进权限、UI 树/OCR 观测、checkpoint 验证、trace→skill**；不复制 Termux 手机侧 runtime |
| **lmuiagent 关系** | 借鉴 **Step / Explore 双模式、视觉定位子任务、弹窗检测**；模型走 Ember Provider，不单独存 api_key |

```text
用户自然语言指令
  ↓
DeviceAutomationGeniePanel（Renderer）
  ↓ ember.agent / agentSession.submitTurn
App Server AgentRuntime（device_control profile）
  ↓ device_* tools（JSON-RPC）
Electron DeviceAutomation Runtime
  ↓ agent-device daemon / CLI
真实设备（Android / iOS / Harmony）
```

## 3. 参考源对比与取舍

### 3.1 ClawMobile（手机原生 Agent runtime）

**可取：**

- **渐进能力模型**：`android_health` → 按 stage 解锁 observe / input / shell / OCR
- **观测优先于盲截图**：`android_ui_dump` + `dump_id` 复用 → `android_ui_query`；OCR 作为 fallback
- **Checkpoint 验证**：低风险步骤不每步重截图；工具 `ok:false` 不得臆造成功
- **确定性优先**：keyevent / shell / UI query 优先于坐标 tap
- **Trace → Skill**：录制 → 归纳 → fast path batch → 失败 reflection（Phase 3+）

**不取：**

- Termux / OpenClaw 手机侧 gateway（Ember 是 **桌面 Host 遥控设备**）
- 独立 Python/Node 子进程作为主链

### 3.2 lmuiagent（桌面 UI 测试 Agent）

**可取：**

- **RunMode**：`step`（逐步视觉定位 + 执行）与 `explore`（VLM ReAct 自主探索）
- **Vision 子任务拆分**：locate / assert / popup / circle / ui_describe 可映射不同模型槽
- **设备上下文**：platform、serial、screen size、pkg_name
- **重试与弹窗策略**：`retry_count`、`popup_detection`、`popup_auto_dismiss`

**不取：**

- 独立 Pydantic 配置里的 `api_key` / `api_base`（Ember 统一 **AI 服务商 Provider + Model**）
- lmuiagent 作为长期 sidecar 进程

### 3.3 Ember current

**已有：**

- 设备层：`device_automation_*` IPC、`agent-device` 截图/导航/触控/scrcpy
- UI 壳：`DeviceAutomationGeniePanel`、execution mode / perception kernel 枚举
- 架构先例：`browser_control_profile`（modality + tools + service model slot + evidence）

**缺口：**

- App Server 无 `device_control` contract / tools
- `service_models` 无 phone / device 槽位
- `useDeviceAiTask` 未接 AgentRuntime

## 4. 执行模式（对齐现有 UI 枚举）

前端已定义（`workbenchPresentation.ts`）：

| UI 字段 | 值 | 运行时语义 |
| --- | --- | --- |
| `executionMode` | `flexible` | 允许 explore + 中途切换 step 恢复 |
| `executionMode` | `strict` | 仅 step；每步必须 checkpoint 通过 |
| `perceptionKernel` | `ui-tree` | 优先 UIAutomator XML / accessibility 树（ClawMobile 路线） |
| `perceptionKernel` | `vision` | 截图 + VLM 定位（lmuiagent step 路线） |
| `perceptionKernel` | `hybrid` | UI 树命中则 deterministic；miss 再 vision |

**内部 RunMode 映射：**

| 用户模式 | App Server executor | 说明 |
| --- | --- | --- |
| Step + ui-tree | `device:step_ui_tree` | dump → query → tap_text / tap_bounds |
| Step + vision | `device:step_vision` | screenshot → vision locate → tap |
| Explore | `device:explore_react` | 单 reasoning 模型多轮 tool loop（lmuiagent ExploreAgent） |
| Hybrid | `device:step_hybrid` | executor 内部分支，不暴露给用户的第三选项 |

## 5. 工具面设计（App Server → Electron）

原则：**ClawMobile 语义 + agent-device 能力边界**；工具名统一 `device_*` 前缀（非 `android_*`，以支持三端）。

### 5.1 观测类

| Tool | 能力 | Electron / agent-device 映射 | 参考 |
| --- | --- | --- | --- |
| `device_health` | 设备在线、平台、分辨率、可用能力 | `list_devices` + 选中设备 metadata | ClawMobile `android_health` |
| `device_screenshot` | PNG/base64 + 尺寸 | `device_automation_capture_screenshot` | 共有 |
| `device_ui_dump` | UI 树 XML + 压缩 keyword index + `dump_id` | **新增** agent-device 或 adb uiautomator dump | ClawMobile `android_ui_dump` |
| `device_ui_query` | 按 text/id/class/desc 查节点 bounds | 读缓存 dump 或 fresh dump | ClawMobile `android_ui_query` |
| `device_app_state` | 前台 package / activity | **新增** `dumpsys window` 或 agent-device | ClawMobile batch assert |

Android Phase 1 可先实现 ui_dump/query；iOS/Harmony 按 agent-device 能力 **fail-soft** 回退 vision-only。

### 5.2 动作类

| Tool | 能力 | 映射 |
| --- | --- | --- |
| `device_navigate` | `back` / `home` | `device_automation_send_navigation` |
| `device_tap` | 坐标点击 | `device_automation_send_tap` |
| `device_swipe` | 坐标滑动 | `device_automation_send_swipe` |
| `device_type` | 向焦点输入（Android IME） | **新增** adb input / agent-device |
| `device_keyevent` | ENTER / BACK 等 | **新增** keyevent |
| `device_launch_app` | 按 package 启动 | **新增** monkey / am start |

### 5.3 辅助类（Phase 2+）

| Tool | 说明 |
| --- | --- |
| `device_resolve_text` | OCR 或 UI query 组合定位（ClawMobile `android_resolve_text_queries` 简化版） |
| `device_wait` | 带超时的 checkpoint 等待 |
| `device_signal_complete` | 任务完成信号（桌面 toast + Genie 步骤收口） |

### 5.4 Session 绑定

每个 Genie turn 必须在 metadata 绑定：

```json
{
  "device_control": {
    "platform": "android",
    "device_id": "...",
    "serial": "...",
    "execution_mode": "flexible",
    "perception_kernel": "hybrid",
    "screen_width": 1080,
    "screen_height": 2400
  }
}
```

工具执行器从 session context 取设备，**禁止** LLM 自由切换未授权设备。

## 6. Modality 与 service_models

新增 execution profile（对齐 `browser_control_profile`）：

```json
{
  "profile_key": "device_control_profile",
  "supported_contracts": ["device_control"],
  "model_role_slots": [
    "device_reasoning_model",
    "device_vision_locate_model",
    "device_vision_assert_model"
  ],
  "permission_profile_keys": [
    "device_control",
    "ask_user_question"
  ],
  "executor_adapter_keys": [
    "device:step_ui_tree",
    "device:step_vision",
    "device:step_hybrid",
    "device:explore_react"
  ],
  "artifact_policy": {
    "write_mode": "runtime_observation_trace",
    "artifact_kinds": ["device_session", "device_step_trace"],
    "viewer_surfaces": ["device_automation_debug"]
  }
}
```

### 6.1 service_models 槽位（设置 → 服务模型）

| 槽位 key | 用途 | lmuiagent 映射 | 推荐 taskFamilies |
| --- | --- | --- | --- |
| `device_reasoning` | Explore ReAct 主循环 | `explore.base_model` | reasoning, vision_understanding |
| `device_vision_locate` | 元素定位 / 点击候选 | `vision.locate_model` | vision_understanding |
| `device_vision_assert` | 断言、弹窗、完成判定 | `vision.assert_model_large` | vision_understanding, reasoning |
| `device_vision_describe` | 屏幕描述（可选） | `vision.ui_describe_model` | vision_understanding |

**不单独存 api_key**：与现有 `ServiceModelPreferenceConfig` 一致，只选 Provider + Model + 可选 prompt。

### 6.2 设置页 UX

在「服务模型」增加 **手机操控** 分组（可与「服务模型」同级或子 Tab）：

- 主推理模型（Explore / 复杂 Step）
- 视觉定位模型
- 视觉断言模型
- 默认 execution mode / perception kernel（同步到调试页默认值）

## 7. Genie UI 与 AgentRuntime 桥接

### 7.1 重写 `useDeviceAiTask`

替换 AutoGLM poll 链：

1. `ensureDeviceAutomationRuntime` + 选中设备校验
2. `agentSession.create` / `submitTurn`（contract: `device_control`）
3. 订阅 turn events → 投影到 `DeviceAutomationGenieStep[]`（复用 `aiTaskProjection` 模式）
4. `cancel` → `agentSession.cancelTurn`

`aiReady` 条件：设备在线 + App Server 可达 + `device_reasoning` 或 step 所需 vision 槽已配置。

### 7.2 步骤 UI

保留现有 Genie 面板结构：

- ExecutionBar：mode / kernel
- 步骤流：thought / action / observation / checkpoint
- 示例 prompt（已有 i18n keys）

Evidence 走 Harness：`agent_runtime_export_evidence_pack` 关联 session/thread/turn。

## 8. Agent 策略（system prompt 要点）

吸收 ClawMobile `AGENTS.mobile.md` + lmuiagent 策略：

1. 任务开始调用 `device_health`（或 session 已注入则跳过）
2. **观测阶梯**：tool result → app_state → ui_query → ui_dump → screenshot → vision
3. 坐标 tap 仅在 query/vision 给出 bounds 后使用
4. 不得在未调用工具时声称已完成
5. 弹窗：先 `device_vision_assert` 或 ui_query 检测，再 dismiss
6. 完成后 `device_signal_complete` + 自然语言摘要

## 9. 分阶段交付

详见 `docs/exec-plans/device-ui-agent-plan.md`。

| 阶段 | 目标 | 用户可见结果 |
| --- | --- | --- |
| **P0** | schema + 设置页 + profile 注册 | 可配置手机操控模型，尚不可执行 |
| **P1** | device tools 最小集 + step/vision + Genie 接 Agent | 自然语言「打开设置 / 连 WiFi」类短流程 |
| **P2** | ui-tree + hybrid + explore | 复杂 App 内探索 |
| **P3** | trace 录制 + skill fast path | ClawMobile 式演示学习（可选） |

## 10. 非目标

1. 重启 `AutoGLM-GUI` sidecar 或 `device_automation_submit_ai_task` 主路径
2. 在 Ember 内嵌 Termux / OpenClaw 手机 gateway（那是 ClawMobile 产品形态）
3. 独立 Python lmuiagent 子进程作为长期 owner
4. Phase 1 不做跨设备 skill 迁移保证（ClawMobile 亦标注为 preview）

## 11. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| iOS/Harmony 无 UIAutomator | hybrid 自动降级 vision；工具返回 `capability_unavailable` |
| 逐步截图成本高 | checkpoint 策略 + dump_id 复用（ClawMobile） |
| 坐标系与 scrcpy 缩放 | 工具层统一 logical 坐标，executor 按 screen_width/height 转换 |
| 误触高风险操作 | `ember.review` 门禁 + 设置开关「执行前确认」 |
| 协议四侧漂移 | `npm run test:contracts` + modality profile guard |

## 12. 后续可选：Agent App 形态

当 P1 稳定后，可注册 **Device UI Agent App**：

- 独立入口：设备列表 + 任务历史 + skill 库
- Capabilities：`ember.agent` + `ember.automation` + 只读 `ember.media`（截图 artifact）
- 仍 **不** 自带 runtime；与调试页 Genie 共享同一 modality

## 13. 文档索引

| 文档 | 说明 |
| --- | --- |
| [device-ui-agent-plan.md](../../exec-plans/device-ui-agent-plan.md) | 分阶段实施计划与验收 |
| [device-automation.md](../../aiprompts/device-automation.md) | 端自动化 current 事实源 |
| [modalityExecutionProfiles.json](../../../src/lib/governance/modalityExecutionProfiles.json) | profile 注册 |
| ClawMobile `TOOLS.mobile.md` | 工具语义参考 |
| lmuiagent `uiagent/config.py` | Step/Explore 与 vision 槽参考 |
