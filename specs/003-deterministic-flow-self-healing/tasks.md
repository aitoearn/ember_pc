# Tasks: 确定性可复现测试流与自愈回放

**Input**: 设计文档 `specs/003-deterministic-flow-self-healing/`（plan.md / spec.md / research.md / data-model.md / contracts/ / quickstart.md）

**Prerequisites**: plan.md（技术栈/结构）、spec.md（US1-3 + FR-001~020）、data-model.md（实体与 4 张表）、contracts/（JSON-RPC + Electron Host 命令）

**Tests 说明**: 本功能涉及协议四侧改动与设备运行时，按 `AGENTS.md` 工程硬规则，契约测试（`test:contracts`）、Rust DAO 单测、前端 projection/VM 单测为**强制项**，已作为任务列入对应 Phase（非可选）。

**Organization**: 任务按用户故事分组，US1（录制）为 MVP，可独立交付与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: US1 / US2 / US3；Setup/Foundational/Polish 无 Story 标签
- 每个任务含明确文件路径

## Path Conventions

- 前端：`src/features/device-automation/flow/`、`src/lib/api/`、`src/i18n/resources/{zh-CN,en-US}/`
- Electron Host：`electron/deviceAutomation/`、`electron/{runtime,ipcChannels,preload,main}`
- App Server（Rust）：`lime-rs/crates/{app-server-protocol,core,app-server}/`
- Client：`packages/app-server-client/src/`

---

## Phase 1: Setup（共享基建）

**Purpose**: 登记长任务计划、建模块骨架

- [x] T001 在 `docs/exec-plans/deterministic-flow-self-healing-plan.md` 新建执行计划（登记 Phase 2-7 目标、进度日志、代码体量与拆分 blocker 退出条件入口）
- [x] T002 [P] 创建前端特性域目录骨架 `src/features/device-automation/flow/{domain,hooks,components}/`（按 plan.md「Source Code（增量）」结构占位）
- [x] T003 [P] 在 `src/i18n/resources/zh-CN/deviceAutomation.json` 与 `src/i18n/resources/en-US/deviceAutomation.json` 增加 `flow.*` 顶层节点骨架（仅 zh-CN/en-US，遵循规则 05）

---

## Phase 2: Foundational（阻塞性前置：持久化 + 共享领域 + 协议四侧）

**Purpose**: 流/运行/修订持久化（App Server + SQLite）、共享流格式类型、回放事件通道。这些是 US1/US2/US3 的共同底座。

**⚠️ CRITICAL**: 本 Phase 完成前，任何 User Story 不能开始。

### 共享领域类型（纯）

- [x] T004 [P] 定义结构化流 wire 类型与纯校验 `src/features/device-automation/flow/domain/flowFormat.ts`（`TestFlow` / `FlowStep` / `Locator` / `Assertion` / `WaitPolicy` / `FlowRun` / `FlowRunStep` / `HealingRevision`，camelCase，含 op/locator 枚举与优先级序约束）
- [x] T005 [P] `src/features/device-automation/flow/domain/flowFormat.unit.test.ts`（覆盖 name/appPackage 非空、formatVersion、locator 多策略优先级、断言 hard/soft 结构）

### SQLite 表 + DAO（Rust，data-model.md 为表事实源：4 张表，steps 内联 `steps_json`）

- [x] T006 在 `lime-rs/crates/core/src/database/schema.rs` 新增 4 张表 `device_flows` / `device_flow_runs` / `device_flow_run_steps` / `device_flow_healing_revisions` 及索引（`(workspace_id)`、`(workspace_id,name)`、`(flow_id)`、`(run_id)`、`(status)`）
- [x] T007 实现 `lime-rs/crates/core/src/database/dao/device_flow_dao.rs`（flows/runs/run_steps/healing_revisions 的 CRUD + 级联删除），并在 `lime-rs/crates/core/src/database/dao/mod.rs` 注册
- [x] T008 [P] `device_flow_dao` Rust 单测（CRUD round-trip + 级联删除 + workspace 隔离）

### 协议（app-server-protocol，四侧之协议侧）

- [x] T009 [P] 新增 `lime-rs/crates/app-server-protocol/src/protocol/v0/device_flow.rs`（实体 Rust struct + serde camelCase + 请求/响应类型）
- [x] T010 在 `lime-rs/crates/app-server-protocol/src/protocol/v0/method_names.rs` 增加 `METHOD_DEVICE_FLOW_{LIST,READ,SAVE,DELETE}` / `METHOD_DEVICE_FLOW_RUN_{SAVE,LIST,READ}` / `METHOD_DEVICE_FLOW_HEALING_{LIST,SAVE,RESOLVE}` 常量
- [x] T011 在 `catalog.rs` 注册以上方法，并补 `schema_types.rs` / `schema_export/registry.rs` 的 deviceFlow schema 导出
- [x] T012 更新 `lime-rs/crates/app-server-protocol/src/protocol/v0/tests/catalog.rs` 断言新方法已登记

### App Server 实现（local_data_source + processor）

- [x] T013 实现 `lime-rs/crates/app-server/src/local_data_source/device_flow.rs` 并在 `local_data_source.rs`、`runtime.rs` 接线
- [x] T014 实现 `lime-rs/crates/app-server/src/processor/device_flow.rs`（10 个方法 handler，含 `deviceFlowHealing/resolve` 的 accepted 并入 locators 顶部 / flagged_defect 保留原流逻辑），并在 `processor/mod.rs` 注册
- [x] T015 deviceFlow 集成测试（local_data_source 端到端 protocol↔DAO 往返：save→read→list→delete、run save/read、healing save/resolve 状态转移；`pub(crate)` 函数以 crate 内 `#[cfg(test)]` 覆盖）

### Client + DevBridge（四侧之前端/策略侧）

- [x] T016 在 `packages/app-server-client/src/protocol.ts` 增加 deviceFlow `METHOD_*` 常量与 `APP_SERVER_METHODS` 登记（`index.ts` 经 `export *` 透传；类型由 generated 提供）
- [x] T017 新建 `src/features/device-automation/flow/api.ts` 封装 deviceFlow CRUD / run / healing client（复用 `AppServerClient.request` + 协议 METHOD 常量，对齐 test-case-management/api.ts）
- [x] T018 在 `src/lib/dev-bridge/commandPolicy.ts` 的 `APP_SERVER_CURRENT_METHODS` 登记 `deviceFlow/*`、`deviceFlowRun/*`、`deviceFlowHealing/*`
- [x] T019 运行 `npm run generate:protocol-types` 刷新 `generated/protocol-types.ts`，并在 `scripts/check-app-server-client-contract.mjs` 增加 deviceFlow 跨文件 spec（264 checks 通过）
- [x] T020 [P] 在 `src/features/device-automation/events.ts` 追加 `deviceFlowReplayEventChannel(runId)` 与 `DeviceFlowReplayEvent` 联合类型（见 contracts/electron-host-commands.md）

**Checkpoint**: 持久化与协议四侧打通，`npm run test:contracts` 含 deviceFlow 通过 → User Story 可开工。

---

## Phase 3: User Story 1 - 把一次 AI/手动执行录制为确定性流 (Priority: P1) 🎯 MVP

**Goal**: 把一次成功的 VLM 自然语言执行轨迹或手动投屏操作，转写为结构化确定性流并持久化、可命名/查看/编辑/删除。

**Independent Test**: 自然语言执行 3-5 步操作后「保存为流」，重启应用流仍在、步骤完整含定位信息（spec US1 Independent Test）。

### 录制投影（纯，FR-003）

- [x] T021 [P] [US1] `src/features/device-automation/flow/domain/recordingProjection.ts`：`UiAgentEvent`（thought/action/screenshot/result）→ `FlowStep[]`，按操作类型与定位信息提取多策略 locator + intent
- [x] T022 [P] [US1] `src/features/device-automation/flow/domain/recordingProjection.unit.test.ts`（tap/input/swipe/launch/back 各类事件投影 + intent 填充）

### 手动录制运行时（Electron Host，FR-004）

- [x] T023 [US1] 新增 `electron/deviceAutomation/deviceFlowRecord.ts`（`device_flow_record_manual_start/stop`：记录手动点击/输入/滑动/导航 → `FlowStep[]` 草稿），并在 `electron/runtime.ts`、`electron/ipcChannels.ts`、`electron/preload.ts`、`electron/main.ts` 注册命令
- [x] T024 [US1] `src/lib/api/deviceFlow.ts` 增加手动录制 client（start/stop）；更新 `electron/ipcChannels.test.ts`、`electron/preload.test.ts` 断言新命令在白名单

### 流管理 hook + UI（FR-005）

- [x] T025 [P] [US1] `src/features/device-automation/flow/hooks/useFlowRecorder.ts`（消费 ui_agent 事件或手动录制 → 草稿流 → 保存）
- [x] T026 [P] [US1] `src/features/device-automation/flow/hooks/useFlowLibrary.ts`（流 CRUD，调 `flow/api.ts`）
- [x] T027 [US1] `src/features/device-automation/flow/components/FlowLibraryPanel.tsx`（流列表 / 命名 / 重命名 / 删除）
- [x] T028 [US1] `src/features/device-automation/flow/components/FlowEditor.tsx`（流详情 / 步骤增删改 / 查看每步 op+定位策略+断言，FR-006 硬/软断言编辑）
- [x] T029 [US1] 在「UI 自动测试」工作台接入「保存为流」入口（绑定 `useFlowRecorder`），并补 `flow.record.*` / `flow.library.*` i18n（zh-CN/en-US）
- [x] T030 [US1] `FlowLibraryPanel`/`FlowEditor` 接线测试 `*.test.tsx`（渲染 + 保存/删除事件，业务逻辑已由 T021/T026 纯化覆盖）

**Checkpoint**: US1 可独立工作——能录、能存、能看、能编辑，重启不丢。

---

## Phase 4: User Story 2 - 确定性回放（不调大模型） (Priority: P1)

**Goal**: 选中流 + 设备「回放」，按 selector→UI 树定位执行、自动等待、硬断言判定，产出通过/失败/阻塞结论与逐步截图；UI 不变时多次结论一致、token=0。

**Independent Test**: 对 US1 流回放两次，UI 未变结论一致、截图齐全、未触发大模型（spec US2 Independent Test，SC-002/SC-003）。

### 定位与等待（Electron Host / sidecar，FR-007/008）

- [x] T031 [P] [US2] `electron/deviceAutomation/flowLocator.ts`：按 `locators` 顺序尝试 resource_id/text/accessibility_id/ui_tree_path 确定性定位（不调模型），返回命中策略或失配
- [x] T032 [P] [US2] `electron/deviceAutomation/flowLocator.test.ts`（多策略命中顺序、全失配返回）
- [x] T033 [P] [US2] `electron/deviceAutomation/flowWaiter.ts`：自动等待至 UI 沉降（`stabilizeMs`）或超时（`timeoutMs`），区分「超时未现 vs 已稳定」
- [x] T034 [P] [US2] `electron/deviceAutomation/flowWaiter.test.ts`

### 回放运行时 + 命令 + 事件桥（FR-009/010/011/017/018）

- [x] T035 [US2] `electron/deviceAutomation/deviceFlowReplay.ts`：`device_flow_replay_start/cancel` + 运行时循环（wait→locate→执行 op→assert，无 LLM），按 `DeviceFlowReplayEvent` 流式发射（依赖 T031/T033）
- [x] T036 [US2] 在 `electron/runtime.ts`、`electron/ipcChannels.ts`、`electron/preload.ts`、`electron/main.ts` 注册 `device_flow_replay_*` 并转发 `deviceFlow:replay:event:*` 事件桥；更新 `ipcChannels.test.ts`、`preload.test.ts`
- [x] T037 [US2] 设备互斥（FR-017）：`device_flow_replay_start` 与 `ui_agent_start` 共享设备锁，同设备已有任一在跑则拒绝并返回可读错误
- [x] T038 [US2] 平台门禁（FR-018）：仅在线 Android 允许，其它平台命令返回 `unsupported_platform`
- [x] T039 [P] [US2] `src/features/device-automation/flow/domain/replayProjection.ts` + `replayProjection.unit.test.ts`（回放事件 → 步骤时间轴/结论投影，纯）

### 回放前端 + 落库（FR-010）

- [x] T040 [US2] `src/lib/api/deviceFlow.ts` 增加回放 client（`device_flow_replay_start/cancel` + `safeListen` 订阅事件，先订阅后启动）
- [x] T041 [P] [US2] `src/features/device-automation/flow/hooks/useFlowReplay.ts`（启动/取消 + 消费事件 → replayProjection 状态）
- [x] T042 [US2] `src/features/device-automation/flow/components/FlowReplayView.tsx`（逐步过程 + 定位结果 + 断言结论 + 截图 + 整体结论）
- [x] T043 [US2] 回放 `done` 后组装 `FlowRun + FlowRunStep[]` 调 `deviceFlowRun/save` 落库 + 历史回看接线；补 `flow.replay.*` i18n（zh-CN/en-US）
- [x] T044 [US2] `electron/deviceAutomation/deviceFlowReplay.test.ts`（selector 命中执行、自动等待、纯回放 `llmTokenUsed===0` 断言、UI 不变两次结论一致）

**Checkpoint**: US1+US2 均可独立工作——可录可放，回归稳定廉价。

---

## Phase 5: User Story 3 - 自愈：失配自动降级 VLM 重导并回写 (Priority: P2)

**Goal**: 回放某步失配时降级 VLM 重导续跑，成功后生成「待确认修订」回写，由用户判定预期变更/缺陷；仍失败则记失败/阻塞不静默通过。

**Independent Test**: 改动被测页面后回放，失配步触发 VLM 重导续跑、生成待确认修订、接受后再回放不再触发（spec US3 Independent Test，SC-004）。

### 自愈运行时（Electron Host / sidecar，FR-012/015）

- [x] T045 [P] [US3] `electron/deviceAutomation/flowHealer.ts`：失配 → 截图 + `step.intent` + 期望喂 `ui_agent` 单步 VLM 重导 → 新定位；含重试与中止策略（避免无限重试）
- [x] T046 [P] [US3] `electron/deviceAutomation/flowHealer.test.ts`（降级成功/重试上限/中止）
- [x] T047 [US3] 在 `deviceFlowReplay.ts` runner 集成自愈分支：`selfHealingEnabled` 时失配降级，发射 `healing`/`healed`，`status=healed`，累计 `llmTokenUsed`；超限记 `failed/blocked`（依赖 T045，扩展 T035）
- [x] T048 [US3] `healed` 步 → 调 `deviceFlowHealing/save` 生成 `status=pending` 修订（原定位 vs 新定位 + 证据截图）接线

### 修订确认前端（FR-013/014/016）

- [x] T049 [P] [US3] `src/features/device-automation/flow/components/HealingRevisionDialog.tsx`（展示原/新定位差异 + 接受（预期变更）/ 标记缺陷）
- [x] T050 [P] [US3] `src/features/device-automation/flow/hooks/useFlowHealing.ts`（`deviceFlowHealing/list` + `resolve`）
- [x] T051 [US3] 接入 `deviceFlowHealing/resolve`：accepted 并入流并刷新、flagged_defect 保留原流并生成缺陷线索记录；补 `flow.healing.*` i18n（zh-CN/en-US）
- [x] T052 [US3] 自愈开关 UI（流 / 工作台层级，FR-016）：关闭时失配步直接判失败并提示「建议开启自愈或重录」
- [x] T053 [US3] 频繁自愈聚合提示：同一流多步反复失配 → 「疑似大幅过时，建议整条重录」（spec Edge Case）

**Checkpoint**: US1+US2+US3 全部可独立工作——录制、确定性回放、自愈闭环完整。

---

## Phase 6: 跨切面整合（前端集成 / 平台矩阵 / i18n / 兼容）

**Purpose**: 把 flow 模块整合进工作台并收口跨故事关注点

- [x] T054 在 device-automation 工作台新增「测试流」入口/Tab，整合 FlowLibrary/Editor/Replay/HealingRevision 视图
- [x] T055 平台能力矩阵 UI：iOS/Harmony 展示「后续支持」且不可误启动录制/回放（FR-018 前端侧，SC-006）
- [x] T056 i18n `flow.*` 完整性核对：zh-CN/en-US 成对、结构一致（规则 05），错误场景给可读中文提示（FR-020，SC-007）
- [x] T057 旧流 `formatVersion` 加载迁移/不兼容提示（spec Edge Case，避免静默损坏）

---

## Phase 7: Polish & 验证

**Purpose**: 全量校验与 quickstart 端到端验证

- [x] T058 [P] 运行 `npm run test:contracts` 全量通过（`deviceFlow/*` + `device_flow_*` 命令名 + 事件通道契约）— `check-app-server-client-contract` 264 checks 通过；全量 `test:contracts` 受 unrelated release-workflow-guard 阻塞
- [x] T059 [P] 运行 `cargo test --manifest-path "lime-rs/Cargo.toml"` 受影响 crate（core / app-server）通过
- [x] T060 [P] 运行前端 `vitest`（projection/VM 单测 + 组件接线测试）通过
- [ ] T061 按 `specs/003-deterministic-flow-self-healing/quickstart.md` 三场景端到端验证（录制 / 确定性回放 / 自愈）— 需真机 Android + Ember GUI
- [x] T062 更新 `docs/exec-plans/deterministic-flow-self-healing-plan.md` 进度日志；残留拆分项登记 tech-debt-tracker
- [ ] T063 运行 `npm run verify:local` 与 `npm run verify:gui-smoke`（高风险 GUI 改动最小冒烟）— 待 T061 真机验证后收口

---

## Dependencies & Execution Order

### Phase 依赖

- **Setup (P1)**: 无依赖，立即开始
- **Foundational (P2)**: 依赖 Setup；**阻塞所有 User Story**
- **US1 (P3)** / **US2 (P4)** / **US3 (P5)**: 均依赖 Foundational
  - 优先级顺序：US1 → US2 → US3（US2 回放消费 US1 录制的流；US3 自愈扩展 US2 runner）
  - 严格说 US1 可独立交付为 MVP；US2 在 US1 有流数据后验证最自然；US3 依赖 US2 runner（T047 扩展 T035）
- **Phase 6 整合**: 依赖目标 US 完成
- **Phase 7 Polish**: 依赖全部目标 US 完成

### User Story 间依赖

- **US1**: Foundational 后即可开工，无对其它故事依赖
- **US2**: Foundational 后可开工；独立测试可用自研最小流，不强依赖 US1 UI
- **US3**: 依赖 US2 的回放 runner（T047 在 T035 基础上加自愈分支），排最后

### 故事内顺序

- 纯领域/投影（flowFormat/recordingProjection/replayProjection）先于消费它们的 hook/runtime
- 定位/等待（T031/T033）先于回放 runner（T035）
- 自愈 healer（T045）先于 runner 自愈集成（T047）
- 落库 wiring 在 runtime 事件就绪后

### 并行机会

- Setup：T002/T003 并行
- Foundational：T004/T005（领域）、T008（DAO 测）、T009（协议类型）、T020（事件）可与各侧并行；但 method_names/catalog/processor/client 链路存在文件依赖需串行收口至 T019 契约测试
- US1：T021/T022（投影）、T025/T026（hooks）并行
- US2：T031/T032、T033/T034、T039 并行；runner（T035）汇聚
- US3：T045/T046、T049/T050 并行

---

## Parallel Example: User Story 2（Foundational 完成后）

```bash
# 定位与等待模块可并行起步：
Task: "flowLocator.ts 多策略确定性定位 (electron/deviceAutomation/flowLocator.ts)"
Task: "flowWaiter.ts 自动等待 (electron/deviceAutomation/flowWaiter.ts)"
Task: "replayProjection.ts 回放事件投影 (src/features/device-automation/flow/domain/replayProjection.ts)"
# 三者就绪后汇聚到 deviceFlowReplay.ts runner（T035）
```

---

## Implementation Strategy

### MVP First（仅 US1）

1. 完成 Phase 1 Setup
2. 完成 Phase 2 Foundational（**关键，阻塞所有故事**）
3. 完成 Phase 3 US1（录制底座）
4. **STOP 并验证**：US1 独立测试（录制→保存→重启仍在）
5. 可演示「把 AI/手动执行固化为流」

### 增量交付

1. Setup + Foundational → 底座就绪
2. US1（录制）→ 独立验证 → 演示（MVP）
3. US2（确定性回放）→ 独立验证 → 演示（稳定廉价回归）
4. US3（自愈）→ 独立验证 → 演示（独占壁垒）
5. Phase 6/7 整合与全量校验收口

### MVP 范围建议

**User Story 1（录制为确定性流）** 即首个可演示增量；US2 为核心增量价值（确定性回归），建议 US1+US2 合并为首个对外里程碑，US3 自愈作为差异化第二里程碑。

---

## Notes

- [P] = 不同文件、无未完成依赖
- 协议四侧（协议/实现/client/DevBridge）改动须同步并经 `npm run test:contracts`（FR / AGENTS.md 硬规则）
- 生产路径禁 mock；mock 仅测试夹具
- i18n 仅 zh-CN/en-US 成对（规则 05），不动 zh-TW/ja-JP/ko-KR
- 设备 IO / 回放运行时在 Electron Host（agent-device sidecar），持久化在 App Server，Electron 不承接业务后端
- 每个 checkpoint 可停下独立验证对应故事
