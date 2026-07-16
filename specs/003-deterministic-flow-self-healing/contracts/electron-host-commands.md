# Contracts · Electron Desktop Host 命令面：确定性回放运行时

> 设备 IO 与回放执行在 Electron Host（agent-device sidecar），与 `ui_agent_start` 平行。渲染层经 `safeInvoke` 调命令、`safeListen` 订阅事件桥。命名前缀 `device_flow_*`，与 `ui_agent_*` / `device_automation_*` 一致。**先订阅事件再启动，避免漏事件。**

## 命令

### device_flow_replay_start
启动一次确定性回放（运行时在 sidecar 内执行：定位 → 等待 → 操作 → 断言；失配时按 `selfHealingEnabled` 降级 VLM）。

**Params**
```typescript
{
  runId: string;          // 渲染层生成，用于事件订阅
  flowId: string;
  deviceId: string;
  serial: string;
  flow: TestFlow;         // 直接下发流定义，避免 sidecar 反查 App Server
  selfHealingEnabled: boolean;
  // 自愈降级用的 VLM 配置（复用 ui_agent 链路）；仅在需要自愈时由 Host 注入 baseUrl/apiKey
  providerId?: string;
  model?: string;
}
```
**Result** `{ runId: string }`

### device_flow_replay_cancel
**Params** `{ runId: string }`
**Result** `{ cancelled: boolean }`

### device_flow_record_manual_start / device_flow_record_manual_stop（US1 手动录制，可选并入 ui_agent 链路）
- start: `{ recordId: string, deviceId: string, serial: string }` → `{ recordId: string }`
- stop: `{ recordId: string }` → `{ steps: FlowStep[] }`（把记录的手动操作转写为流步骤草稿）

> 注：**VLM 轨迹录制**不新增命令——直接复用现有 `ui_agent_start` 的 `UiAgentEvent`，由渲染层 `recordingProjection.ts` 投影为 `FlowStep[]`。

## 事件桥

```typescript
// events.ts 追加
export function deviceFlowReplayEventChannel(runId: string): string {
  return `deviceFlow:replay:event:${runId}`;
}

export type DeviceFlowReplayEvent =
  | { runId: string; type: "step"; index: number; op: string; status: "running" }
  | { runId: string; type: "locating"; index: number; locatorKind: string }   // 当前尝试的定位策略
  | { runId: string; type: "screenshot"; index: number; imageBase64: string; mediaType: string }
  | { runId: string; type: "healing"; index: number; reason: string }          // 进入自愈（降级 VLM）
  | { runId: string; type: "healed"; index: number; healedLocator: object }     // 自愈成功，待生成修订
  | { runId: string; type: "assert"; index: number; ok: boolean; reason?: string }
  | { runId: string; type: "result"; index: number; status: "passed" | "failed" | "blocked" | "healed"; durationMs: number }
  | { runId: string; type: "done"; conclusion: "passed" | "failed" | "blocked"; healingTriggered: boolean; llmTokenUsed: number; summary: string }
  | { runId: string; type: "error"; message: string }
  | { runId: string; type: "exit"; code: number };
```

## 回放运行时内部流程（sidecar，非协议但定义行为）

```
for step in flow.steps:
  emit step(running)
  wait until UI stable or timeout            # flowWaiter（FR-008）
  locator = 按 step.locators 顺序尝试         # flowLocator（FR-007）
    - resource_id / text / accessibility_id / ui_tree_path  → 确定性，不调模型
  if 命中:
     执行 op（tap/input/swipe/...）
  elif selfHealingEnabled:                    # flowHealer（FR-012）
     emit healing
     调 ui_agent 单步 VLM（截图 + step.intent + 期望）→ 新定位
     if 成功: 执行 op; emit healed; status=healed; 记 llmTokenUsed
     else: status=blocked/failed; 保留过程
  else:
     status=failed（提示开启自愈或重录）
  if step.assert: 评估（hard 精确/包含；soft VLM 兜底）→ emit assert
  emit result(step)
emit done(conclusion, healingTriggered, llmTokenUsed)
```

- **互斥（FR-017）**：`device_flow_replay_start` 与 `ui_agent_start` 共享设备锁；同设备已有任一在跑则拒绝并返回可读错误。
- **平台（FR-018）**：仅在线 Android 允许；其他平台命令直接返回 `unsupported_platform`。
- **回写**：`done` 后由渲染层组装 `FlowRun + FlowRunStep[]` 调 App Server `deviceFlowRun/save`；`healed` 步对应的修订调 `deviceFlowHealing/save`（status=pending）。

## 四侧同步检查表

| 侧 | 文件 |
| --- | --- |
| Electron Host | `electron/deviceAutomation/deviceFlowReplay.ts`、`runtime.ts`、`ipcChannels.ts`、`preload.ts`、`main.ts`（注册 `device_flow_*` + 事件桥转发） |
| sidecar 运行时 | agent-device：`flowLocator` / `flowWaiter` / `flowHealer` / `runner`（与 ui_agent 同源复用截图/VLM/tap） |
| 前端 client | `src/lib/api/deviceFlow.ts`（`device_flow_replay_start/cancel`、record）；`src/features/device-automation/events.ts`（事件类型/通道） |
| DevBridge 策略 | `src/lib/dev-bridge/commandPolicy.ts`（`device_flow_*` 列入 host 命令白名单） |
| 契约测试 | `npm run test:contracts`（host 命令名 + 事件通道契约）；生产路径禁 mock |
