# Lime 框架升级 · Host 接线审计（M0.5）

> 状态：M0.5 已实施（2026-07-16），待 T1/T2/T5 冒烟确认  
> 关联：[`lime-framework-upgrade-plan.md`](./lime-framework-upgrade-plan.md) · Finding **C1**

## 结论（可执行）

**当前 `device_automation_*` Host 命令在 Electron 生产路径未完整接线。** 框架升级前必须先完成 M0.5 接线补齐，否则 T1–T5 冒烟在真实 Electron 下必然失败。

| 层级 | 预期（specs/002、004） | 现状（2026-07-16 代码库） |
| --- | --- | --- |
| Renderer API | `src/lib/api/device*.ts` 调用 `safeInvoke("device_automation_*")` | ✅ 已实现 |
| Runtime 实现 | `electron/deviceAutomation/runtime.ts` → `deviceAutomationRuntime` | ✅ 已实现 |
| IPC 白名单 | `electron/ipcChannels.ts` → `ELECTRON_HOST_COMMANDS` | ✅ 已注册 41 条 |
| Host dispatch | `electron/deviceAutomationHost.ts` → `deviceAutomationRuntime` | ✅ 已实现 |
| main 路由 | `handleHostInvoke` → `isDeviceAutomationCommand` | ✅ 已接线 |
| 事件广播 | `bootstrapDeviceAutomationHost` + `DeviceInventoryWatcher` | ✅ 已注册 |
| commandPolicy | `src/lib/dev-bridge/commandPolicy.ts` | ✅ 已登记 |
| 契约守卫 | `scripts/check-command-contracts.mjs` | ⚠️ 未覆盖 device host 命令 |

**根因**：`deviceAutomationRuntime` 与 sidecar 模块已存在，但从未挂入 `ElectronHostCommands.invoke` 与 `ELECTRON_HOST_COMMANDS` 白名单。specs 契约文档描述的是目标态，不是当前事实源。

## 命令清单（需接线）

### 设备基础（`src/lib/api/deviceAutomation.ts`）

```
device_automation_ensure_sidecar
device_automation_get_sidecar_status
device_automation_list_devices
device_automation_capture_screenshot
device_automation_send_navigation
device_automation_send_tap
device_automation_send_swipe
device_automation_ensure_ai_sidecar
device_automation_prepare_ai_session
device_automation_submit_ai_task
device_automation_poll_ai_task
device_automation_cancel_ai_task
device_automation_scrcpy_*   # reverse / start / connect 等（见 runtime.ts）
```

### Monkey / Kea2

```
device_automation_monkey_start | _stop | _get_status
device_automation_kea2_get_tool_status
```

### 稳定性

```
device_automation_stability_analysis_get_tool_status
device_automation_stability_analysis_start
device_automation_stability_analysis_cancel
device_automation_stability_analysis_get_status
device_automation_stability_llm_config_read
device_automation_stability_llm_config_save
```

### 性能 / Trace

```
device_automation_perf_list_apps
device_automation_perf_start | _stop | _get_status
device_automation_perf_trace_start | _stop | _cancel | _get_status
device_automation_perf_trace_analyze
device_automation_perf_trace_open_external
device_automation_perf_trace_delete_local
```

### 事件（emit，非 invoke）

```
device_automation_inventory_changed
device_automation_monkey_event
device_automation_perf_frame
device_automation_perf_trace_progress
device_automation_stability_analysis_event
```

## M0.5 实施步骤（Batch A 前置阻塞）

1. **导出权威命令列表**：从 `src/lib/api/device*.ts` + `specs/002`、`specs/004` contracts 生成 manifest（可扩展现有 `freeze-manifest.json` 的 `hostCommandPrefixes`）。
2. **接线四侧**（`AGENTS.md` 硬规则 #3）：
   - `electron/ipcChannels.ts` — 加入 `ELECTRON_HOST_COMMANDS`
   - `electron/hostCommands.ts` — `case` → `deviceAutomationRuntime.*`（或专用 `DeviceAutomationHost` facade）
   - `electron/main.ts` — 确认 perf/monkey/stability 事件 `broadcast` 注册
   - `src/lib/dev-bridge/commandPolicy.ts` — device 命令 `current` 分类
3. **契约同步**：`scripts/check-command-contracts.mjs` 或专用 guard 断言四侧一致。
4. **最小验证**：
   ```bash
   npm run typecheck:electron
   npm run test:contracts
   npm run smoke:perf-monitor-adb   # T5 子集
   ```
5. **记录 commit**：作为 `framework-upgrade/m0.5-host-wiring` 独立提交，便于与 Lime 合入 diff 分离。

## 与框架升级的关系

- **Batch A–D 合入 lime `hostCommands.ts` 时**：采用「段式合并」——先合 lime 非 device 段，再 **append** Ember device 段（本审计产出的接线），禁止覆盖。
- **冻结区不变**：`electron/deviceAutomation/**` 运行时逻辑仍冻结；M0.5 只补 IPC 注册层，不改业务语义。

## 验收标准

- [x] 任意 `device_automation_*` invoke 不再返回 `Electron host command is not supported`
- [x] `ipcChannels.test.ts` 覆盖抽样 device 命令白名单
- [ ] T1（设备列表）、T2（monkey status）、T5（perf adb smoke）在 Electron dev 下可跑通
