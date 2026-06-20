# Phase 1 · 数据模型：确定性可复现测试流与自愈回放

> 实体来自 spec.md「Key Entities」。持久化为 SQLite，经 App Server DAO；`workspaceId` 隐含作用域。Wire 类型 camelCase，与 `deviceFlow/*` 契约一致。

## 实体关系

```
TestFlow (1) ──< FlowStep (N，有序)
TestFlow (1) ──< FlowRun (N)
FlowRun (1) ──< FlowRunStep (N，有序)
TestFlow (1) ──< HealingRevision (N)   # 关联到具体 stepIndex
```

## 1. TestFlow（测试流）

一条可确定性回放的结构化用例。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string (uuid) | 主键 |
| `workspaceId` | string | 工作区隔离 |
| `name` | string | 流名称，非空 |
| `appPackage` | string | 目标应用包名 |
| `platform` | `'android'` | 首期固定 android |
| `formatVersion` | number | 流格式版本（迁移用，初始 1） |
| `source` | `'vlm_recorded' \| 'manual_recorded' \| 'imported'` | 来源 |
| `selfHealingEnabled` | boolean | 自愈开关（默认 true） |
| `steps` | FlowStep[] | 有序步骤（随流读写；存储可内联 JSON 或子表，见下） |
| `createdAt` / `updatedAt` | string (ISO) | 时间戳 |

**校验**：`name` 非空；`appPackage` 非空；同 workspace 内 `name` 建议唯一（冲突给可读提示，非强制硬唯一）。

## 2. FlowStep（流步骤）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `index` | number | 步骤序号（从 0/1 起，连续） |
| `op` | enum | `launch_app` / `tap` / `input_text` / `swipe` / `scroll_until_visible` / `back` / `assert` / `wait` |
| `locators` | Locator[] | **多策略定位，按优先级**（仅定位类 op 需要） |
| `args` | object | op 参数（如 `input_text.text`、`swipe.direction`、`launch_app.package`） |
| `assert` | Assertion? | 该步断言（可选） |
| `wait` | WaitPolicy? | 等待覆盖（可选，缺省用全局策略） |
| `intent` | string? | 自然语言意图（自愈时喂给 VLM；录制自 VLM 轨迹时填充） |

### Locator（定位策略）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `kind` | `'resource_id' \| 'text' \| 'accessibility_id' \| 'ui_tree_path' \| 'vlm_anchor'` | 策略类型 |
| `value` | string | 选择子值（id 串 / 文案 / 路径 / 视觉描述） |
| `match` | `'exact' \| 'contains'`? | 文本匹配方式（text/accessibility 适用） |
| `vlmAnchor` | `{ xNorm: number; yNorm: number }`? | 归一化坐标（vlm_anchor，0–1000 体系，与既有归一化坐标一致） |

> 回放按 `locators` 数组顺序尝试；selector/ui_tree_path 为确定性级，vlm_anchor 为自愈级。

### Assertion（断言）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | `'hard' \| 'soft'` | 硬断言（selector/文案匹配）/ 软断言（VLM 自评） |
| `expr` | object | 硬断言：`{ locatorKind, value, match, present: boolean }`；软断言：`{ description: string }` |

### WaitPolicy（等待策略）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `stabilizeMs` | number | UI 稳定判定窗口 |
| `timeoutMs` | number | 该步最大等待 |

## 3. FlowRun（回放记录）

一次确定性回放的留痕。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string (uuid) | 主键 |
| `flowId` | string | 关联流 |
| `workspaceId` | string | 工作区 |
| `deviceId` | string | 目标设备 |
| `startedAt` / `finishedAt` | string (ISO) | 起止 |
| `conclusion` | `'passed' \| 'failed' \| 'blocked'` | 整体结论 |
| `healingTriggered` | boolean | 本次是否触发过自愈 |
| `llmTokenUsed` | number | 大模型 token 消耗（纯确定性回放应为 0；自愈步另计） |
| `summary` | string | 结论摘要 |

## 4. FlowRunStep（回放步骤留痕）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `runId` | string | 关联 run |
| `index` | number | 步骤序号 |
| `op` | string | 操作类型 |
| `locatorUsed` | `{ kind, value }`? | 实际命中的定位策略 |
| `status` | `'passed' \| 'failed' \| 'blocked' \| 'healed'` | 该步结果（`healed`=经自愈完成） |
| `assertResult` | `{ ok: boolean; reason?: string }`? | 断言结论 |
| `screenshotPath` | string? | 该步截图 |
| `durationMs` | number | 耗时 |

## 5. HealingRevision（自愈修订）

一次自愈产生的待确认变更。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string (uuid) | 主键 |
| `flowId` | string | 关联流 |
| `stepIndex` | number | 失配步序号 |
| `runId` | string | 触发的回放 |
| `originalLocators` | Locator[] | 原定位 |
| `healedLocator` | Locator | VLM 重导得到的新定位 |
| `evidenceScreenshotPath` | string? | 差异证据截图 |
| `status` | `'pending' \| 'accepted' \| 'flagged_defect'` | 状态 |
| `createdAt` | string (ISO) | 生成时间 |

**状态转移**：
```
pending ──(用户接受：预期变更)──> accepted     # healedLocator 并入 TestFlow 对应步骤 locators 顶部
pending ──(用户标记缺陷)────────> flagged_defect # 原流不变，保留证据作缺陷线索
```

## SQLite 表（DAO）

| 表 | 主要列 | 索引 |
| --- | --- | --- |
| `device_flows` | id, workspace_id, name, app_package, platform, format_version, source, self_healing_enabled, steps_json, created_at, updated_at | (workspace_id), (workspace_id, name) |
| `device_flow_runs` | id, flow_id, workspace_id, device_id, started_at, finished_at, conclusion, healing_triggered, llm_token_used, summary | (flow_id), (workspace_id) |
| `device_flow_run_steps` | run_id, idx, op, locator_used_json, status, assert_result_json, screenshot_path, duration_ms | (run_id) |
| `device_flow_healing_revisions` | id, flow_id, step_index, run_id, original_locators_json, healed_locator_json, evidence_screenshot_path, status, created_at | (flow_id), (status) |

> `FlowStep[]` 首期以 `steps_json`（流内联 JSON）存储于 `device_flows`，避免步骤子表的读写放大；若后续需按步查询再拆 `device_flow_steps` 子表。`run_steps` 因需独立追溯单列成表。

## 与既有模型衔接

- **spec 001 TestCase / TestCaseStep**：结构化步骤可作为 FlowStep 的导入来源（`source='imported'`）；反向，录制的流也可回填用例库。
- **spec 002 PerformanceSession**：回放期间可联动性能采集，性能片段经统一报告（P1-1）关联 FlowRun，本 spec 不强制。
- **ui_agent `UiAgentEvent`**：录制时 `action`/`screenshot`/`thought` 事件 → 投影为 FlowStep（见 `recordingProjection.ts`）。
