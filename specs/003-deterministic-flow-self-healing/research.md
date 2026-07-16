# Phase 0 · 研究与决策：确定性可复现测试流与自愈回放

> 解决 plan.md Technical Context 中的待决项与关键技术选择。格式：Decision / Rationale / Alternatives。

## R1. 流存储格式：自研结构化 JSON

- **Decision**：首期以**自研结构化 JSON 流**为唯一事实源；步骤为有序数组，每步含 `op`（操作类型）、`locators`（多策略定位，按优先级）、`assert`（可选）、`wait`（可选）。预留 `exportFormat` 扩展点用于后续导出 Maestro YAML / Appium。
- **Rationale**：
  - 与 spec 001 的结构化用例步骤同构，可互相导入/复用，落地最快。
  - 自研 JSON 可承载「多策略定位 + VLM 视觉锚点 + 自愈修订」等 Maestro YAML 原生不表达的字段。
  - Panto AI 同样自建专有框架并对外导出 Maestro/Appium，验证「自研事实源 + 导出互通」是主流且低风险路线。
- **Alternatives**：
  - 直接采用 Maestro YAML 为事实源 → 受其 selector 模型约束，难承载 VLM 锚点与自愈元数据；引入外部 runner 依赖。后续作为**导出目标**而非事实源。
  - 采用 Appium 脚本 → 偏代码、门槛高，与 Ember「零门槛」定位冲突。

## R2. 回放定位策略：selector → UI 树 → VLM 视觉（多级降级）

- **Decision**：每步按优先级尝试 `resource-id` / `text` / `accessibility-id` selector → UI 树结构路径匹配 → VLM 视觉锚点（坐标/描述）。前两级为确定性、不调模型；第三级仅在前两级失配且自愈开启时进入（即 US3）。
- **Rationale**：与现有「UI 树 / Vision / 混合感知」感知内核一致（见 `deviceAutomation.debug.perception.*`）；selector/UI 树通过 `uiautomator dump` 即可获得，确定且廉价。
- **Alternatives**：纯坐标回放 → 跨分辨率/机型脆弱，否决；纯 VLM → 即现状，非确定且烧 token，正是本功能要改进的。

## R3. 回放运行时落点：agent-device sidecar（与 ui_agent 平行）

- **Decision**：确定性回放运行时实现在 **agent-device sidecar**（与 `ui_agent` 同源），由新 Electron Desktop Host 命令 `device_flow_replay_start` / `device_flow_replay_cancel` 启动，步骤事件经事件桥 `deviceFlow:replay:event:<runId>` 流式回传渲染层。
- **Rationale**：
  - 回放需要设备 IO（截图、`uiautomator dump`、tap/input）+ 可选 VLM——这些能力 `ui_agent` sidecar 已具备，复用最省。
  - 符合 AGENTS.md：新 runtime 走 App Server/sidecar，Electron 只做 Host bridge；不新增 `lime-rs/src/commands/**` 旧 wrapper。
  - 与 `ui_agent_start` 的「先订阅事件再启动」模式一致，前端心智统一。
- **Alternatives**：
  - 回放逻辑放 App Server Rust → App Server 无设备通道，需反向调 Electron，链路绕。
  - 回放逻辑放 Electron main 进程内 → 与既有 sidecar 模式割裂，且设备 IO 已在 sidecar，重复造轮子。

## R4. 自愈降级：复用 ui_agent 单步 VLM 重导

- **Decision**：回放某步 selector/UI 树全部失配且自愈开启时，回放运行时**对该步发起一次受限的 VLM 调用**（输入：当前截图 + 该步意图描述 + 期望结果），让 VLM 输出新的定位（坐标/可推导的 selector）；成功则继续，并把「原定位→新定位」记为待确认修订。自愈调用复用 `ui_agent` 的 VLM Provider/模型链路。
- **Rationale**：自愈本质是「定位失配 → 用视觉理解重新对齐」，与 ui_agent 单步能力完全重合；Ember 同时拥有确定性流 + VLM，是天然自愈引擎（Panto/Kobiton 均以自愈为卖点）。
- **Alternatives**：自愈用模糊 selector 重试（如 text 近似匹配）→ 能力弱、误命中风险高；保留为 VLM 之前的轻量尝试，但不作为主自愈手段。

## R5. 自动等待（Zero-Wait）：稳定性轮询而非固定 sleep

- **Decision**：每步判定前轮询 UI 树/截图直到「稳定」（连续 N 次 dump 无变化或目标元素出现）或达到超时；区分「超时未现」（失败）与「断言不符」（失败，但原因不同）。借鉴 Maestro Zero-Wait Intelligence。
- **Rationale**：消除手写 sleep，降低 flaky；确定性回放可靠性的基石（FR-008）。
- **Alternatives**：固定 sleep → 慢且脆，否决。

## R6. 自愈回写：默认「待确认修订」，不静默覆盖

- **Decision**：自愈成功的修正生成 `HealingRevision`（状态 `pending`），不自动并入主流；用户选择「接受（预期变更）→ 并入流」或「标记为缺陷 → 保留原流 + 生成缺陷线索证据」。
- **Rationale**：避免自愈悄悄把「真缺陷」当「UI 改动」吸收掉，保留人类裁决（FR-013/014）。
- **Alternatives**：自动并入 → 可能掩盖回归，否决；从不回写 → 丧失「自我维护」价值，否决。

## R7. 持久化：App Server JSON-RPC `deviceFlow/*` + SQLite，按工作区隔离

- **Decision**：流/步骤/回放记录/修订全部经 App Server `deviceFlow/*` JSON-RPC + rusqlite DAO，`workspaceId` 隐含作用域，遵循 spec 001/002 既有四侧同步与 `test:contracts`。
- **Rationale**：AGENTS.md 强约束「持久化走 App Server」；与既有 testCase/perfMonitor 模式一致。
- **Alternatives**：renderer 本地存储 → 违反持久化约束且无法跨入口复用，否决。

## R8. 平台范围：Android 优先

- **Decision**：录制与回放首期仅在线 Android（复用 ADB / scrcpy / uiautomator）；iOS/Harmony 在能力矩阵标注「后续」，不可误启动（FR-018）。
- **Rationale**：与 spec 002 平台分期一致，复用现有 Android 链路最快闭环。
- **Alternatives**：三端同时 → WDA/HDC 的 UI 树与定位差异大，超出首期。

## 未决/后续（不阻塞首期）

- 导出 Maestro YAML / Appium 的具体映射（FR-019 扩展点，后续项）。
- 与统一报告/趋势/门禁（P1-1）、CLI/CI（P2-1/2）、自主爬取（P2-8）的对接——属独立需求。
- iOS/Harmony 回放定位策略。
