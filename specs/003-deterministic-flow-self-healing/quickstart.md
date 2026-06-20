# Quickstart · 确定性可复现测试流与自愈回放（验证指南）

> 端到端验证场景，证明功能可用。实现细节见 [plan.md](./plan.md)、[data-model.md](./data-model.md)、[contracts/](./contracts/)。本文不含实现代码。

## 前置条件

- Ember 桌面应用本地可运行（`npm run electron:dev`）。
- 一台在线 **Android** 设备（真机或模拟器），已安装被测应用（如 Wikipedia / 设置）。
- 至少配置一个可用模型 Provider（用于录制时的 VLM 执行与自愈降级；纯回放不需要）。
- 进入「移动端测试 → UI 自动测试」工作台并选中该设备。

## 场景 1：录制为确定性流（US1 / FR-001~006）

1. 在 UI 自动测试用自然语言执行一段操作：`启动设置 → 打开 Wi-Fi 开关`，等待执行成功。
2. 点击「保存为流」，命名 `wifi-toggle`，确认目标应用包名。
3. **预期**：流库出现 `wifi-toggle`；打开详情可见有序步骤（`launch_app` / `tap` …），每步带 `locators`（resource_id/text）与可选断言。
4. 重启应用进入工作台。**预期**：`wifi-toggle` 仍在（App Server `deviceFlow/list` 持久化）。

验证命令（开发期）：
```bash
npm run test:contracts        # deviceFlow/* 四侧契约
# 单测：录制投影
npx vitest run src/features/device-automation/flow/domain/recordingProjection.unit.test.ts
```

## 场景 2：确定性回放（US2 / FR-007~011）

1. 选中 `wifi-toggle` 与在线 Android 设备，点击「回放」。
2. **预期**：
   - 各步按 selector/UI 树定位执行，过程时间轴展示 `locating → result`，**不出现 VLM 思考事件**。
   - 自动等待生效（无需手写 sleep），结束给出 `passed/failed/blocked` 结论。
   - 回放记录 `llmTokenUsed = 0`（未触发自愈）。
3. 在 UI 未改动的前提下连续回放两次。**预期**：两次结论一致（SC-002 确定性）。
4. 查看执行历史。**预期**：可见逐步定位结果、断言结论、截图。

验证命令：
```bash
# 回放运行时定位/等待单测
npx vitest run electron/deviceAutomation/deviceFlowReplay.test.ts
# 回放状态机投影
npx vitest run src/features/device-automation/flow/domain/replayProjection.unit.test.ts
```

## 场景 3：自愈（US3 / FR-012~016）

1. 人为改动被测页面（如把目标按钮文案改名、或换一版应用），确保某步 selector 失配。
2. 对 `wifi-toggle` 回放（`selfHealingEnabled = true`）。
3. **预期**：
   - 失配步触发 `healing` 事件 → 降级 VLM 重新定位 → `healed` → 回放继续完成。
   - 该流出现一条「待确认修订」（`HealingRevision.status = pending`），展示原定位 vs 新定位 + 证据截图。
   - 该步 `FlowRunStep.status = healed`，`llmTokenUsed > 0`（仅自愈步计入）。
4. 对修订选择「接受（预期变更）」。**预期**：新定位并入流顶部；再次回放该步不再触发自愈（`deviceFlowHealing/resolve` → accepted）。
5. 另一条修订选择「标记为缺陷」。**预期**：原流不变，生成带证据的缺陷线索（status = flagged_defect）。
6. 关闭自愈再回放失配流。**预期**：失配步直接判失败并提示「建议开启自愈或重录」（FR-016）。

## 场景 4：边界与平台（FR-017/018）

1. 选中 iOS / HarmonyOS 设备。**预期**：录制/回放不可用，展示能力矩阵与「首期仅 Android」说明（0 次误启动，SC-006）。
2. 同一设备已在 VLM 执行时发起回放（或反之）。**预期**：被互斥拒绝并提示先结束其一（FR-017）。
3. 回放时设备掉线。**预期**：当前步记失败/阻塞，保留已产生过程信息，不静默通过。

## 验收对应

| 场景 | 覆盖 User Story | 关键 SC |
| --- | --- | --- |
| 1 | US1 录制 | SC-001 |
| 2 | US2 确定性回放 | SC-002 / SC-003 / SC-005 |
| 3 | US3 自愈 | SC-004 / SC-005 |
| 4 | 边界/平台/互斥 | SC-006 |

> i18n：上述所有用户可见文案需 zh-CN / en-US 双语（`deviceAutomation.flow.*`，SC-007）。
