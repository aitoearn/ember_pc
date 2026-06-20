# Implementation Plan: 确定性可复现测试流与自愈回放

**Branch**: `feature/deterministic-flow-self-healing` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: 功能 Spec `specs/003-deterministic-flow-self-healing/spec.md`（竞品分析 TestMu AI / Maestro / Kobiton / Panto AI 后规划，来源 `docs/竞品分析-TestMuAI-借鉴需求文档.md` 之 P0-2 + P1-7 + P1-6）

## Summary

在 Ember「UI 自动测试」既有 **VLM 自然语言执行**（`ui_agent_start`，非确定性）之外，新增**确定性可复现测试流**三段闭环：

1. **录制（US1）**：把一次成功的 VLM 执行轨迹或手动投屏操作，转写为结构化 JSON 流（多策略定位 + 断言）。
2. **确定性回放（US2）**：新 sidecar 运行时按 selector → UI 树定位执行，**默认不调大模型**，内置自动等待，硬断言判定。
3. **自愈（US3）**：某步定位失配 → 降级 VLM 重导该步 → 生成「待确认修订」回写流。

**架构落点**：沿用既有分层——**设备 IO / 回放运行时在 Electron Desktop Host（agent-device sidecar）**，**流/运行/修订持久化在 App Server JSON-RPC + SQLite**；前端在 device-automation 特性域新增录制/流管理/回放/修订 UI。

## Technical Context

**Language/Version**: TypeScript 5.x（React renderer + Electron main）+ Rust（App Server，`lime-rs/Cargo.toml`）；sidecar 运行时复用 agent-device（与 `ui_agent` 同源）

**Primary Dependencies**: 既有 `ui_agent` sidecar（VLM + 截图 + tap）；`scrcpyAdbFastPath.execAdbSync`（adb tap/input/uiautomator dump）；UI 树/可访问性 dump（`uiautomator dump` / accessibility）；`AppServerClient` + `safeInvoke`/`safeListen`；`apiKeyProvider`（VLM Provider/模型）；rusqlite（DAO）

**Storage**: SQLite —— `device_flows`、`device_flow_steps`、`device_flow_runs`、`device_flow_run_steps`、`device_flow_healing_revisions`（按 `workspaceId` 隔离）

**Testing**: Vitest（流投影/录制转写 `*.unit.test.ts`、回放 ViewModel、组件接线）；Electron（回放运行时 selector 匹配 / 自动等待 / VLM 降级单测）；Rust DAO 单测；`npm run test:contracts`（新增 `deviceFlow/*` 跨四侧 spec）

**Target Platform**: Electron 桌面（macOS + Windows）；被测端首期 **Android 在线设备**（ADB）

**Project Type**: 桌面应用（desktop-app）：renderer + Electron Host + App Server 后端

**Performance Goals**: 确定性回放（未触发自愈）**0 token**；同流程回放耗时 ≤ 等价 VLM 执行的 50%（SC-003）；UI 不变时连续两次回放结论 100% 一致（SC-002）

**Constraints**: 生产禁 mock；i18n 仅 zh-CN/en-US；持久化必经 App Server，设备 IO 在 Electron/sidecar；协议四侧同步 + `test:contracts`；自愈仅修「定位失配」，不掩盖断言失败；同设备「确定性回放」与「VLM 执行」互斥

**Scale/Scope**: 单工作区数百条流；每条流数十步；首期单设备、单流回放（批量/并发延后）

## Constitution Check

> 项目 constitution 模板未填，以 `AGENTS.md` 仓库工程规则为事实治理基线。

| 治理门 | 判定 | 说明 |
| --- | --- | --- |
| 新 Agent/runtime 能力走 App Server / sidecar，Electron 只做 Host bridge | PASS | 持久化走 App Server `deviceFlow/*`；回放运行时为 agent-device sidecar，Electron 仅 `device_flow_*` 命令 + 事件桥转发 |
| 持久化经 App Server JSON-RPC | PASS | 流/运行/修订 CRUD 全部 App Server + SQLite DAO |
| 协议四侧同步 + `test:contracts` | PASS（计划） | 新增 `deviceFlow/*` JSON-RPC + `device_flow_*` host 命令，纳入契约测试 |
| 生产禁 mock | PASS | 真实 adb/sidecar/VLM；mock 仅测试夹具 |
| i18n 双语 zh-CN/en-US | PASS | `deviceAutomation.flow.*` 新 key |
| 前端测试分层（VM/projection 优先纯化） | PASS | 录制转写、流投影、回放状态机抽 `*.unit.test.ts`；`*.test.tsx` 仅接线 |
| 代码体量边界（<800 预警，<1000 拆分） | PASS（计划） | 回放运行时按 `locator / waiter / healer / runner` 分模块；前端按组件/hook/projection 拆 |
| 长任务落 exec-plan | PASS（计划） | 新建 `internal/exec-plans/deterministic-flow-self-healing-plan.md` |
| 不扩展旧 Tauri command / legacy facade | PASS | 不新增 `lime-rs/src/commands/**`；能力落 App Server crates + Electron Host |

无违反项，Complexity Tracking 留空。

## Project Structure

### Documentation (this feature)

```text
specs/003-deterministic-flow-self-healing/
├── plan.md              # 本文件
├── spec.md              # 功能 Spec（US1-3 + FR-001~020）
├── research.md          # Phase 0 决策
├── data-model.md        # Phase 1 实体与表
├── contracts/
│   ├── json-rpc-methods.md       # App Server deviceFlow/* 持久化契约
│   └── electron-host-commands.md # device_flow_* 回放/录制运行时 + 事件
├── quickstart.md        # Phase 1 验证指南
└── tasks.md             # Phase 2 输出（/speckit-tasks，本命令不创建）
```

### Source Code（增量）

```text
# 前端（renderer）
src/features/device-automation/flow/
  domain/flowFormat.ts                 # 结构化流类型 + 校验（纯）
  domain/recordingProjection.ts        # UiAgentEvent / 手动操作 → FlowStep（纯）
  domain/recordingProjection.unit.test.ts
  domain/replayProjection.ts           # 回放事件 → 步骤时间轴（纯）
  domain/replayProjection.unit.test.ts
  hooks/useFlowRecorder.ts             # 录制：消费 ui_agent 事件 / 手动操作 → 草稿流
  hooks/useFlowReplay.ts               # 回放：device_flow_replay_* + 事件
  hooks/useFlowLibrary.ts              # 流 CRUD（App Server）
  components/FlowLibraryPanel.tsx      # 流列表/命名/删除
  components/FlowEditor.tsx            # 流详情/步骤编辑
  components/FlowReplayView.tsx        # 回放过程 + 结论 + 截图
  components/HealingRevisionDialog.tsx # 待确认修订（接受/标记缺陷）
  api.ts                               # deviceFlow/* client 封装
events.ts                              # 追加 deviceFlowReplayEventChannel + DeviceFlowReplayEvent

# Electron Desktop Host（设备 IO / 运行时桥）
electron/deviceAutomation/
  deviceFlowReplay.ts                  # device_flow_replay_start/cancel 命令 → sidecar
  deviceFlowReplay.test.ts
  flowLocator.ts                       # selector / UI 树定位（含降级判定）
  flowWaiter.ts                        # 自动等待（网络/动画/UI 沉降）
  flowHealer.ts                        # 失配 → 调 ui_agent 单步 VLM 重导
  runtime.ts                           # device_flow_* 委托接线

# App Server（持久化）
lime-rs/crates/
  app-server-protocol/.../device_flow.rs   # 协议类型 + method_names + catalog + schema
  core/.../database/schema.rs               # 5 张表
  core/.../database/dao/device_flow_dao.rs  # DAO
  app-server/.../local_data_source/device_flow.rs
  app-server/.../processor/device_flow.rs
```

**Structure Decision**: 复用 spec 001/002 既有的「renderer 特性域 + Electron deviceAutomation Host + App Server crates 三段式」。回放运行时作为 agent-device sidecar 的新模式（与 `ui_agent` 平行），通过 `device_flow_replay_*` Host 命令启动并经事件桥流式回传，自愈时复用 `ui_agent` 的单步 VLM 能力。

## Phase 概览

| Phase | 目标 | 对应 US/FR | 状态 |
| --- | --- | --- | --- |
| **0** | 研究决策（流格式、定位/等待策略、自愈降级、运行时落点） | 全部 | ✅ research.md |
| **1** | 领域模型 + 契约冻结（data-model + JSON-RPC + Host 命令 + quickstart） | 全部 | ✅ 本次产出 |
| **2** | App Server：5 表 + `deviceFlow/*` DAO/processor + 协议四侧 | FR-005/010/013/014 | 待 /speckit-tasks |
| **3** | 录制：ui_agent 轨迹 / 手动操作 → 结构化流（前端投影 + 保存） | US1 / FR-001~006 | 待 |
| **4** | 确定性回放运行时：locator + waiter + runner（无 LLM）+ 事件桥 | US2 / FR-007~011 | 待 |
| **5** | 自愈：失配降级 VLM 重导 + 待确认修订回写 + 确认 UI | US3 / FR-012~016 | 待 |
| **6** | 前端整合：流库/编辑/回放/修订 UI + 互斥 + 平台矩阵 + i18n | FR-017/018/020 | 待 |
| **7** | 契约测试、quickstart 验证、exec-plan 守门 | — | 待 |

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| Android UI 树 dump 不稳/无 resource-id（WebView/Canvas/Compose） | 多策略定位 + UI 树兜底 + VLM 视觉锚点；失配交自愈（US3） |
| 自愈频繁触发掩盖真实回归 | 自愈仅修定位、不碰业务断言；聚合「疑似大幅过时」提示引导重录（Edge Case） |
| 确定性回放误判通过 | 硬断言为主 + 自动等待区分「超时未现 vs 断言不符」；run 记录 token=0 校验 |
| 回放运行时模块膨胀 | locator/waiter/healer/runner 分文件，>800 行预警 |
| 同设备并发抢占 | FR-017 互斥；回放与 ui_agent 共享设备锁 |
| 流格式演进破坏旧流 | flow `formatVersion` 字段 + 加载期迁移/不兼容提示（Edge Case） |

## 进度日志

| 日期 | 状态 | 备注 |
| --- | --- | --- |
| 2026-06-17 | Spec Draft | spec.md（US1-3 + FR-001~020 + Clarifications 已定） |
| 2026-06-17 | Plan / Phase 0-1 | research.md + data-model.md + contracts + quickstart |
