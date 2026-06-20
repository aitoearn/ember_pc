# Device UI Agent 实施计划

> 状态：待启动（设计已冻结方向，依赖 agent-device 主链 P5/P6 收口）  
> 设计稿：`internal/roadmap/device-ui-agent/README.md`  
> 主文档：`internal/aiprompts/device-automation.md`  
> 更新时间：2026-06-16

## 1. 目标

用 **App Server AgentRuntime + device_control modality** 恢复端自动化调试页 **UI Genie**，使用户可通过自然语言驱动已连接手机，吸收 ClawMobile 工具分层与 lmuiagent Step/Explore 模式，**不**恢复 AutoGLM sidecar。

**P1 成功标准（可演示）：**

1. Android 调试页 Genie 输入「打开设置」类指令，Agent 通过 tool loop 完成导航并展示步骤流。
2. 模型来自 **设置 → 服务模型 → 手机操控**，无独立 api_key 字段。
3. 取消 / 失败可恢复；evidence 可导出。
4. `npm run test:contracts` 与定向单测通过。

## 2. 架构决策（冻结）

| ID | 决策 |
| --- | --- |
| AD-U1 | AI 执行只走 App Server；Electron 只做 device I/O adapter |
| AD-U2 | 工具命名 `device_*`，session 绑定单设备，禁止跨设备 |
| AD-U3 | 模型配置只走 `workspace_preferences.service_models.*` + Provider 体系 |
| AD-U4 | Phase 1 Android-only 完整 ui-tree；iOS/Harmony vision fallback |
| AD-U5 | 第一入口是 **端自动化调试页**，不是新 Agent App |
| AD-U6 | Trace→Skill（ClawMobile）放到 P3，不阻塞 P1 |

## 3. 阶段划分

### P0 — 配置与契约（无执行）

**写集：**

- `ember-rs/crates/core/src/config/types.rs` — `ServiceModelsConfig` 增加 4 槽
- `src/lib/serviceModels.ts` — normalize / persist
- `src/components/settings-v2/agent/media-services/` 或新 `device-control/` 分组 UI
- `src/lib/governance/modalityExecutionProfiles.json` — `device_control_profile`
- `internal/roadmap/task/task-taxonomy.md` — 槽位映射（如需要）
- i18n 五语言

**槽位：**

- `device_reasoning`
- `device_vision_locate`
- `device_vision_assert`
- `device_vision_describe`（可选，可与 assert 合并 UI）

**验收：**

- 设置页可保存；Rust roundtrip 测试
- profile guard 测试识别新 contract

### P1 — 最小可执行 Genie（Step + Vision）

**App Server（Rust）：**

- contract `device_control`
- tools：`device_health`, `device_screenshot`, `device_navigate`, `device_tap`, `device_swipe`
- executor `device:step_vision` — 单步：截图 → vision locate → action → checkpoint
- permission `device_control`

**Electron：**

- 扩展 `electron/deviceAutomation/runtime.ts`（如需 `type` / `keyevent` 再补 IPC）
- 可选：`device_automation_ui_dump` / `device_automation_ui_query`（adb shell uiautomator）

**Renderer：**

- 重写 `src/features/device-automation/hooks/useDeviceAiTask.ts`
- 更新 `domain/aiTaskProjection.ts` 消费 Agent turn events
- `DeviceAutomationGeniePanel`：`aiReady` / 错误态 / 运行态

**DevBridge：**

- `commandPolicy.ts` — agentSession 与 device 命令超时白名单
- `agentCommandCatalog` / mock 测试夹具同步

**验收：**

- vitest：`useDeviceAiTask.test.tsx`、tool contract tests
- 手动：Android 真机/emulator 至少 2 条 example prompt
- 不启动 AutoGLM 进程

### P2 — UI 树 + Hybrid + Explore

**新增 tools：**

- `device_ui_dump`, `device_ui_query`, `device_app_state`, `device_type`, `device_keyevent`, `device_launch_app`

**Executors：**

- `device:step_ui_tree` — ClawMobile 式 dump → query → deterministic tap
- `device:step_hybrid` — ui-tree miss → vision
- `device:explore_react` — lmuiagent ExploreAgent 等价 loop

**策略：**

- popup detect/dismiss（assert 模型或 ui_query）
- checkpoint 间隔（非每步 screenshot）

**验收：**

- strict / flexible mode 行为差异有单测
- hybrid 在 Android 上 ui-tree 命中时不调用 vision 模型（telemetry 断言）

### P3 — 演示学习与 Skill Fast Path（可选）

**借鉴 ClawMobile trace_induction：**

- 录制：touch + screenshot + app_state（Desktop Host 侧录制，非 Termux getevent）
- 归纳：parameter schema + anchor
- 执行：`device_batch_execute` deterministic replay
- 失败：一次 reflection → fallback explore/step

**非 P1 阻塞；需单独 product 确认。**

## 4. 文件级写集预览

### P0

```
ember-rs/crates/core/src/config/types.rs
src/lib/serviceModels.ts
src/lib/serviceModels.test.ts
src/components/settings-v2/agent/media-services/index.tsx  (或新模块)
src/lib/governance/modalityExecutionProfiles.json
src/locales/*/settings.json
internal/roadmap/task/task-taxonomy.md
```

### P1

```
ember-rs/crates/app-server/**/device_control/**
ember-rs/crates/agent/**/tools/device_*
electron/deviceAutomation/runtime.ts
electron/hostCommands.ts
electron/ipcChannels.ts
src/lib/api/deviceAutomation.ts
src/features/device-automation/hooks/useDeviceAiTask.ts
src/features/device-automation/domain/aiTaskProjection.ts
src/lib/dev-bridge/commandPolicy.ts
packages/app-server-client/**
```

### P2

```
ember-rs/crates/app-server/**/device_ui_*
electron/deviceAutomation/uiAutomator.ts (新)
src/features/device-automation/domain/workbenchPresentation.ts (如需默认 kernel)
```

## 5. 验证命令

```bash
npm run test:contracts
npm run typecheck:electron
npx vitest run src/features/device-automation src/lib/serviceModels.test.ts
cargo test --manifest-path "ember-rs/Cargo.toml" device_control
npm run verify:gui-smoke   # 涉及 Genie 主路径时
```

## 6. 依赖与前置

| 依赖 | 状态 | 说明 |
| --- | --- | --- |
| agent-device 主链 | ✅ 进行中 | P5/P6 打包与真机 scrcpy |
| Genie 冻结清理 | ✅ | AutoGLM 已不自动启动 |
| App Server agentSession | ✅ current | 复用现有 bridge |
| ClawMobile 代码 | 参考 | 工具语义，不 fork 插件 |
| lmuiagent 代码 | 参考 | Step/Explore 算法 port 到 Rust executor |

## 7. 进度日志

| 日期 | 内容 |
| --- | --- |
| 2026-06-16 | 初版方案：README + 本计划；对齐 ClawMobile + lmuiagent + browser_control 先例 |

## 8. 下一刀

**推荐顺序：P0（service_models + profile + 设置 UI）→ P1（4 工具 + step_vision + useDeviceAiTask）**

P0 可与 device-automation P5 打包并行，无硬依赖。
