# Feature Specification: 移动端性能监控

**Feature Branch**: `feature/device-performance-monitor`

**Created**: 2026-06-17

**Status**: Draft

**Input**: 在「移动端测试 → 性能监控」Tab 交付 Android 首期可用的性能采集闭环：实时 CPU/内存/FPS 曲线、会话摘要持久化、历史列表；iOS/Harmony 展示能力说明。设计详见 `docs/superpowers/specs/2026-06-17-device-performance-monitor-design.md`。

## Clarifications

### Session 2026-06-17（Brainstorming）

- Q: 首期交付边界？ → A: UI + 协议 + **Android 仅 CPU/内存/FPS**；iOS/Harmony 仅能力矩阵与未支持提示。
- Q: 会话持久化粒度？ → A: **仅会话元数据 + 指标摘要（AVG/MAX/MIN）**；不存逐秒时序、不做历史曲线回放。
- Q: 采集执行位置？ → A: **桌面端设备通道负责采集**；**服务端数据库负责会话持久化**（产品级分工，见 Assumptions）。
- Q: 设备与应用如何选择？ → A: **Tab 内自包含工具栏**，进入 Tab 即可选设备/应用，不强制先在「设备管理」选设备。

### Session 2026-06-17（Clarify）

- Q: 采集中离开「性能监控」Tab 时如何处理？ → A: **离开 Tab 自动停止**当前会话，写入摘要并出现在历史列表（等同用户点击停止）。
- Q: P1 历史会话是否支持删除？ → A: **不支持**；仅查看列表与摘要，删除/清理能力延后。
- Q: 「刷新应用」列表包含范围？ → A: **仅第三方已安装应用**（用户安装的应用，不含系统预装包）。
- Q: 历史会话与实时图表布局？ → A: **下方分栏** — 上方工具栏 + 实时图表为主区，历史会话在**底部可折叠面板**。
- Q: 采集间隔 UI 如何配置？ → A: **固定档位下拉**：0.5s / 1s / 2s / 5s，**默认 1s**。

### Session 2026-06-17（P2 Clarify）

- Q: P2 首版交付边界（P2a/b/c）？ → A: **P2a + P2b** — Perfetto 录制/pull + artifact 管理 + Tab 内 L1 模板分析（卡顿/启动/CPU）；**P2c SmartPerfetto 深度分析首版不做**。
- Q: `trace_processor_shell` 获取方式？ → A: **按需下载** prebuilt（首次 L1 分析触发，版本 pin 对齐 SmartPerfetto）；支持 `PERFETTO_TRACE_PROCESSOR_PATH` 环境变量覆盖；P2a 录制/pull 不依赖。
- Q: P2 在性能 Tab 内的 UI 入口方式？ → A: **SegmentedControl 切换**（「实时 APM」/「深度 Trace」）；两模式共用设备/应用工具栏，切换后主区内容替换。
- Q: trace 文件存储位置与清理策略？ → A: **工作区专属目录**（`workspaces/{workspaceId}/performance-traces/`）+ **手动删除**；首版不做 TTL/配额自动清理。
- Q: Trace 录制中离开性能 Tab 的行为？ → A: **离开 Tab 时弹窗确认**：继续后台录制 / 停止并 pull；**默认「继续」**（与 P1 离开 Tab 自动 stop 区分）。
- Q: `trace_processor_shell` 获取方式？ → A: **按需下载** — 首次 L1「快速分析」时下载 prebuilt（版本 pin）；支持 `PERFETTO_TRACE_PROCESSOR_PATH` 手动覆盖。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Android 实时性能采集 (Priority: P1)

测试人员在「性能监控」Tab 选择一台在线 Android 设备，刷新并选择目标应用，勾选 CPU、内存、FPS 指标，设置采集间隔后点击「开始采集」。系统每秒更新实时曲线（滑动窗口展示最近约 2 分钟数据），测试人员可观察应用运行时的性能变化；点击「停止」后会话结束。

**Why this priority**: 这是性能监控的核心价值——在测试或探索应用时即时看到 CPU、内存与帧率变化。无此能力则 Tab 无交付意义。

**Independent Test**: 连接一台 Android 设备，完成一次完整采集中止流程，三条曲线均有数据更新，即可独立验证。

**Acceptance Scenarios**:

1. **Given** 已连接在线 Android 设备，**When** 用户选择设备与应用并开始采集，**Then** CPU（应用/系统）、内存、FPS 曲线按设定间隔更新。
2. **Given** 采集进行中，**When** 用户点击停止，**Then** 采集立即停止，曲线不再更新。
3. **Given** 同一设备已在采集，**When** 用户对同一设备再次开始采集，**Then** 旧会话先结束再开始新会话（同设备不并行采集）。
4. **Given** 采集间隔设为 1 秒，**When** 持续采集超过 2 分钟，**Then** 图表仍流畅展示且仅保留最近约 120 个数据点的滑动窗口。
5. **Given** 采集进行中，**When** 用户切换到其他 Tab（离开性能监控），**Then** 采集自动停止、摘要写入历史，曲线停止更新。

---

### User Story 2 - 会话摘要与历史列表 (Priority: P1)

测试人员停止采集后，系统在本地持久化本次会话的元信息（设备、应用、指标、起止时间）及各指标的 **平均值/最大值/最小值** 摘要。用户在页面**底部历史面板**（可折叠）中看到按时间倒序的会话列表，点开可查看摘要详情。

**Why this priority**: 没有摘要与历史，停止采集后数据即丢失，无法做回归对比或留档；与「仅摘要、不存时序」的 P1 范围一致。

**Independent Test**: 完成一次采集并停止后，历史列表出现新条目且摘要含 AVG/MAX/MIN；重启应用后列表仍可加载。

**Acceptance Scenarios**:

1. **Given** 用户刚停止一次采集，**When** 查看历史列表，**Then** 出现新会话卡片，含设备、应用、时间与状态。
2. **Given** 历史列表中有会话，**When** 用户打开摘要详情，**Then** 展示各已采集指标的 AVG/MAX/MIN。
3. **Given** 已有历史会话，**When** 用户重启应用并进入性能 Tab，**Then** 历史列表仍可加载（持久化成功）。
4. **Given** 采集因设备断开或连续失败而异常结束，**When** 会话写入历史，**Then** 状态标记为失败，仍尽可能展示已采集部分的摘要。

---

### User Story 3 - 非 Android 平台说明 (Priority: P1)

测试人员选择 iOS 或 HarmonyOS 设备时，性能 Tab 展示平台能力矩阵，说明首期仅 Android 支持实时采集；「开始采集」不可用，并给出简短原因说明。

**Why this priority**: 避免用户在非支持平台误操作；与三端产品路线图一致，且可独立验收。

**Independent Test**: 选中 iOS 或 Harmony 设备，确认矩阵展示且无法开始采集。

**Acceptance Scenarios**:

1. **Given** 用户选中 iOS 设备，**When** 查看性能 Tab，**Then** 显示能力矩阵且开始采集禁用，并说明首期仅支持 Android。
2. **Given** 用户选中 HarmonyOS 设备，**When** 查看性能 Tab，**Then** 行为与 iOS 一致（矩阵 + 禁用 + 说明）。

---

### User Story 4 - Perfetto Trace 录制与管理 (Priority: P2a)

测试人员在「深度 Trace」模式下选择 Android 设备与应用，选择录制预设（滑动卡顿 / 冷启动 / CPU 调度等），点击「开始录制」；操作完成后停止，系统将 `.perfetto-trace` pull 到工作区并在 Trace 列表中展示；可在外部 Perfetto UI 中打开浏览。

**Independent Test**: 真机完成 录制 → 停止 → 列表出现 artifact → 文件可在外部 UI 打开。

**Acceptance Scenarios**:

1. **Given** 在线 Android 设备，**When** 用户开始并停止 Trace 录制，**Then** 工作区 Trace 列表出现新条目且 `sizeBytes > 0`。
2. **Given** Trace 已就绪，**When** 用户点击「在 Perfetto UI 打开」，**Then** trace 可在时间轴视图中浏览。
3. **Given** 同设备已有 Trace 录制中，**When** 用户再次开始录制，**Then** 旧录制先结束再开始新录制（同设备 Trace 互斥）。
4. **Given** Trace 录制进行中，**When** 用户离开性能 Tab 或切换 SegmentedControl 至「实时 APM」，**Then** 弹出确认：继续后台录制（默认）或停止并 pull；选继续则录制不中断，回到 Tab 可见进度。

---

### User Story 5 - Trace 模板化性能分析 (Priority: P2b)

用户对已 pull 的 trace 点击「快速分析」，选择 **卡顿摘要 / 启动摘要 / CPU 四象限** 之一；系统在 Tab 内展示结构化分析结果（无需 LLM、无需 SmartPerfetto 服务）。

**Independent Test**: 对标准测试 trace 或真机 trace，30 秒内返回对应 `result_json` 字段并在 UI 展示。

**Acceptance Scenarios**:

1. **Given** 就绪 trace artifact，**When** 用户选择「卡顿摘要」分析，**Then** 展示 jank 帧数、P99 帧耗时等字段。
2. **Given** 分析完成，**When** 用户再次打开该 artifact，**Then** 可查看历史分析记录（持久化于 `performance_trace_analyses`）。

---

### Edge Cases

- 无在线设备：工具栏展示空态，引导连接设备。
- 未选择应用即开始：阻止开始并提示选择应用。
- 应用列表为空（设备无第三方应用）：提示安装或使用其他设备。
- 未勾选任何指标即开始：阻止开始并提示至少选择一项指标。
- 采集中 ADB/设备通道单帧失败：跳过该帧，不中断整个会话。
- 采集中连续多次采集失败：自动停止会话，标记失败并保留已有摘要。
- 采集中设备断开：停止采集并提示；已缓冲数据写入摘要（可能不完整）。
- 采集中离开性能 Tab（切换至其他 Tab）：**自动停止**采集，写入摘要并进入历史列表。
- 会话持久化失败：提示用户保存失败，保留屏幕上的摘要供重试（若实现重试入口）。
- 用户切换工作区：历史列表仅展示当前工作区会话。
- **P2** 设备无 `perfetto` 或厂商禁用 trace：录制失败并提示，不阻塞 P1 实时 APM。
- **P2** trace pull 中断或磁盘不足：标记 `failed`，保留错误信息，不损坏已有 artifact。
- **P2** L1 分析超时或 `trace_processor` 不可用：提示**下载失败或配置 `PERFETTO_TRACE_PROCESSOR_PATH`**，不静默失败。
- **P2** trace artifact **支持用户手动删除**（与 P1 会话不可删区分）；删除同时移除本地文件；首版无自动清理。
- **P2** Trace 录制中离开 Tab 或切回「实时 APM」：**弹窗确认**（默认继续后台录制）；**不**沿用 P1 离开 Tab 自动 stop。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在「性能监控」Tab 提供自包含工具栏：设备选择、应用列表刷新、目标应用选择、指标勾选（CPU/内存/FPS）、采集间隔、开始/停止。应用列表 MUST **仅展示第三方已安装应用**（不含系统预装应用）。
- **FR-002**: 系统 MUST 在用户进入性能 Tab 时加载设备列表（与设备管理同源），且不要求用户预先在设备管理 Tab 选中设备。
- **FR-003**: 系统 MUST 仅对 **在线 Android 设备** 允许开始采集；iOS/Harmony 设备 MUST 禁用采集并展示能力矩阵。
- **FR-004**: 系统 MUST 在采集期间实时展示 CPU（应用占比与系统负载）、内存（应用 PSS，MB）、FPS 曲线，滑动窗口最多约 **120** 个数据点。
- **FR-005**: 采集间隔 MUST 通过**固定档位下拉**配置，可选 **0.5s / 1s / 2s / 5s**，默认 **1s**（P1 不支持自由输入或其他档位）。
- **FR-005a**: 页面布局 MUST 为：**上方**工具栏与实时图表主区，**下方**历史会话面板（支持折叠/展开）。
- **FR-006**: 系统 MUST 对同一设备互斥：新开始采集时自动结束该设备上的既有采集会话。
- **FR-007**: 系统 MUST 在停止采集时计算并持久化各指标的 **AVG/MAX/MIN** 摘要，以及会话元数据（设备、平台、应用、指标、起止时间、状态）。
- **FR-008**: 系统 MUST **不**在 P1 持久化逐秒时序数据；**不**提供历史曲线回放、CSV 导出或**历史会话删除**。
- **FR-009**: 系统 MUST 按当前**工作区**隔离历史会话列表。
- **FR-010**: 用户可见文案 MUST 支持 **简体中文与英文**（见项目 i18n 规则）。
- **FR-011**: 采集中用户**离开性能监控 Tab**（切换至工作台内其他 Tab）时，系统 MUST **自动停止**采集、计算摘要并持久化会话（行为等同手动停止）。
- **FR-012**: P1 实时采集 MUST 走 **ADB 轮询标量 APM 路径**（`top` / `/proc/stat` / `dumpsys meminfo` / `dumpsys gfxinfo framestats`），**不得**依赖 Perfetto trace 文件；单帧解析失败跳过该帧，连续 ≥10 帧无有效数据自动停止并标记 `failed`。技术细节见 [`collection-architecture.md`](./collection-architecture.md)。

### P2 功能需求（Perfetto · 首版 P2a+P2b）

- **FR-P2-001**: 系统 MUST 在性能 Tab 顶部提供 **SegmentedControl**（「实时 APM」/「深度 Trace」）模式切换；两模式共用设备/应用选择工具栏，主区内容按模式替换；P2 能力不替代 P1 曲线。
- **FR-P2-002**: P2a MUST 支持 Android 在线设备上的 Perfetto trace **录制、停止、pull、artifact 列表**；预设至少包含滑动卡顿、冷启动、CPU 调度。
- **FR-P2-003**: P2a MUST 支持在 **外部 Perfetto UI**（本地或 ui.perfetto.dev）打开 trace；首版 **不**要求内嵌 SmartPerfetto（P2c 延后）。
- **FR-P2-004**: P2b MUST 在 Tab 内对就绪 trace 提供 L1 **模板分析**：`jank_summary`、`startup_summary`、`cpu_quadrant` 三类，结果持久化并可回看。L1 依赖 `trace_processor_shell`，首次使用时**按需下载** prebuilt；支持 `PERFETTO_TRACE_PROCESSOR_PATH` 自定义路径；未下载时禁用 L1 并给出下载引导。
- **FR-P2-004a**: L1 分析 MUST 在 **首次使用时按需下载** `trace_processor_shell` prebuilt；用户 MUST 可通过 `PERFETTO_TRACE_PROCESSOR_PATH` 覆盖路径；P2a 录制/pull **不得**依赖该二进制。
- **FR-P2-005**: P2 trace artifact MUST 按 **工作区** 隔离，文件落盘于该工作区 `performance-traces/` 目录（经 workspace 路径 API 解析，禁止硬编码平台路径）；**允许手动删除** trace 及关联分析记录；首版 **不**做 TTL 或磁盘配额自动清理。
- **FR-P2-006**: P2 可选 `linkedSessionId` 关联 P1 会话；不强制绑定。
- **FR-P2-007**: P2 首版 **不包含** SmartPerfetto Agent/Skill 深度分析（P2c）、不包含 trace 逐帧回放进 Ember SVG 图表。
- **FR-P2-008**: Trace 录制进行中，用户**离开性能 Tab** 或 SegmentedControl 切至「实时 APM」时，系统 MUST **弹窗确认**（继续后台录制 / 停止并 pull）；**默认「继续」**；不得静默沿用 P1 的离开 Tab 自动 stop。

### Key Entities

- **PerformanceSession（性能会话）**: 一次采集的元数据与摘要；含设备、平台、应用包名、勾选指标、间隔、状态（进行中/已停止/失败）、起止时间、summary（各指标 avg/max/min）。
- **PerformanceLiveFrame（实时帧）**: 采集中内存态数据点；停止后不持久化逐帧数据。
- **PerformanceTraceArtifact（P2）**: Perfetto trace 文件元数据；见 [`p2-data-model.md`](./p2-data-model.md)。
- **PerformanceTraceAnalysis（P2）**: 对 artifact 的 L1 模板分析结果。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 测试人员可在 **3 分钟内** 完成一次 Android 采集全流程（选设备 → 选应用 → 开始 → 观察曲线 → 停止 → 查看摘要）。
- **SC-002**: 采集期间曲线更新延迟用户可感知为 **约 1–2 个采集间隔** 内（默认约 1–2 秒）。
- **SC-003**: 停止采集后 **5 秒内** 历史列表出现新会话且摘要字段完整（对已采集指标）。
- **SC-004**: 重启应用后 **100%** 可加载已持久化的历史会话列表（同工作区）。
- **SC-005**: 非 Android 平台 **0 次** 误启动采集（开始按钮不可用）。

### P2 可度量结果

- **SC-P2-01**: 测试人员可在 **5 分钟内** 完成 Trace 录制全流程（选预设 → 录制 → 停止 → 列表可见）。
- **SC-P2-02**: L1「卡顿摘要」对标准测试 trace 在 **30 秒内** 返回可展示结果。
- **SC-P2-03**: P2 首版 **不依赖** SmartPerfetto 本地服务即可验收 P2b。

## Assumptions

- 目标用户为使用 Ember「移动端测试」工作台的测试/开发人员。
- P1 仅 Android 真实采集；iOS/Harmony 采集能力在后续版本交付。
- 采集依赖现有桌面端设备连接能力（ADB 等）；无独立外部性能 SaaS。
- 会话持久化使用应用既有本地数据库，按工作区隔离。
- 实时数据通过桌面端事件推送到界面，而非用户手动刷新。
- P1 不包含：GPU/网络/电池/Jank、与 UI 自动化时间轴对齐、截图/录屏/打点、**历史会话删除/清空**。
- **P2 首版（P2a+P2b）**：Perfetto trace 录制/pull、artifact 管理、Tab 内 L1 模板分析；**不含** SmartPerfetto 深度分析（P2c）。详见 [`p2-perfetto-trace-analysis-design.md`](./p2-perfetto-trace-analysis-design.md)。
- 设计文档 `docs/superpowers/specs/2026-06-17-device-performance-monitor-design.md` 为实现参考，本 spec 以用户可验收行为为准。
- **采集技术方案**（P1 APM vs P2+ Perfetto 分线、各指标命令与降级策略）以 [`collection-architecture.md`](./collection-architecture.md) 为事实源；实现不得与 spec 中 FR-004/FR-007/FR-012 冲突。
