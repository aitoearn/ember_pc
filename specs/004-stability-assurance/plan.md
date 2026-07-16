# Implementation Plan: 稳定性保障（压测 + 崩溃根因分析）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Branch**: `feature/stability-assurance` | **Date**: 2026-07-16 | **Design**: [需求 Spec](../../docs/superpowers/specs/2026-07-15-stability-assurance-design.md)

**Goal:** 将「Monkey 测试」升级为「稳定性保障」Tab：保留 Android 压测闭环，并集成 sa-agent 输出 **根因 + 文字修复建议**（`full` + `prompt_mode=analysis`）。

**Architecture:** Renderer 二级模式（压测 | 崩溃分析）；压测仍走现有 `monkeyTest.ts`；崩溃分析由 Electron spawn sa-agent CLI（一次性子进程 + IPC 事件流）；报告落 `userData/device-automation/stability-analysis/cli_reports/`；LLM 配置由 Ember UI 写入运行时临时 `agent_config.local.json` 或 env。

**Tech Stack:** TypeScript (React + Electron main)、Python sa-agent (`stability-analysis-agent`)、Vitest、现有 DevBridge (`safeInvoke` / `safeListen`)

## Global Constraints

- i18n **仅** `zh-CN` + `en-US`（`deviceAutomation.stability.*`）
- 生产路径禁止 mock fallback；测试夹具显式 mock
- P1 **不** App Server 持久化分析 run（D6-A）
- P1 **不** `prompt_mode=fix` / 自动改码（D3b 已确认仅文字）
- sa-agent 路径：`STABILITY_ANALYSIS_AGENT_ROOT` 或 sibling `stability-analysis-agent`（`resolveToolRoot`）
- 协议四侧同步：新增 host 命令须更新 `ipcChannels.ts`、`commandPolicy.ts`、`preload.test.ts`、`ipcChannels.test.ts`
- 默认校验：`npm run verify:local`；Host 命令改动加 `npm run test:contracts`

---

## 已确认决策（2026-07-16）

| 项 | 结论 |
| --- | --- |
| D1 | `monkey-test` → `stability-assurance`，旧 tab alias |
| D2 | Tab 内二级：压测运行 \| 崩溃分析 |
| D3 | `scope=full` + LLM |
| D3b | `prompt_mode=analysis`（仅文字） |
| D3c | Ember 面板配置 LLM |
| D4 | Electron spawn CLI（非常驻 Daemon） |
| D5 | logcat + 预填，用户确认后再调 LLM |
| D6 | 报告仅 userData |
| D7 | 手动选 library_dir / code_root |

---

## Project Structure

### Documentation

```text
specs/004-stability-assurance/
├── plan.md                          # 本文件
├── tasks.md                         # 勾选进度
└── contracts/
    └── electron-host-commands.md      # Host 契约
```

### Source Code（P1 增量）

```text
src/features/device-automation/
├── constants/workspaceTabs.ts       # stability-assurance + alias
├── DeviceAutomationWorkspace.tsx
├── stability/
│   ├── types.ts
│   ├── events.ts
│   ├── domain/stabilityAnalysisProjection.ts
│   ├── domain/stabilityAnalysisProjection.unit.test.ts
│   ├── hooks/useCrashAnalysis.ts
│   ├── hooks/useStabilityLlmConfig.ts
│   └── components/
│       ├── StabilityAssurancePanel.tsx
│       ├── StabilityModeSwitch.tsx
│       ├── CrashAnalysisPanel.tsx
│       ├── CrashAnalysisToolbar.tsx
│       ├── CrashAnalysisResultPanel.tsx
│       └── StabilityLlmConfigSection.tsx
├── monkey/                          # 薄改：log 面板「分析崩溃」、crashLogPath
src/lib/api/
├── deviceStabilityAnalysis.ts
├── stabilityLlmConfig.ts            # userData 读写（Electron host 或 localStorage 策略见 Task 4）
src/types/page.ts

electron/deviceAutomation/
├── captureDeviceLogcat.ts
├── stabilityAnalysis.ts
├── stabilityAnalysis.test.ts
├── stabilityLlmConfig.ts            # 写临时 agent_config + env 注入
├── monkeyTest.ts                    # finalize 时 logcat + crashLogPath
├── runtime.ts
electron/
├── hostCommands.ts
├── ipcChannels.ts
├── main.ts                          # results root + event broadcast
src/i18n/resources/{zh-CN,en-US}/deviceAutomation.json
```

---

## Phase 概览

| Phase | 目标 | 预估 |
| --- | --- | --- |
| **0** | 契约冻结 + Tab 路由重命名 | 0.5d |
| **1** | Electron：logcat + sa-agent spawn + LLM config | 1.5d |
| **2** | Renderer：稳定性保障壳 + 崩溃分析 UI | 1.5d |
| **3** | 压测联动 + i18n + 守卫测试 | 1d |
| **4** | 文档 / quickstart + verify | 0.5d |

详细勾选见 [`tasks.md`](./tasks.md)。

---

## Phase 0 · 契约与路由

### Task 0.1: Host 命令契约

**Files:**
- Create: `specs/004-stability-assurance/contracts/electron-host-commands.md`
- Modify: `electron/ipcChannels.ts`
- Modify: `src/lib/dev-bridge/commandPolicy.ts`

**Interfaces — 新增命令:**

| 命令 | Params | Result |
| --- | --- | --- |
| `device_automation_stability_analysis_get_tool_status` | `{}` | `{ available, toolRoot?, cliEntry?, pythonCommand?, error? }` |
| `device_automation_stability_analysis_start` | 见 contracts | `{ runId, startedAt, reportRoot }` |
| `device_automation_stability_analysis_cancel` | `{ runId }` | `{ runId, status: "canceled", stoppedAt }` |
| `device_automation_stability_analysis_get_status` | `{}` | `{ activeRunId?, startedAt? }` |
| `device_automation_stability_llm_config_read` | `{}` | `StabilityLlmConfig` |
| `device_automation_stability_llm_config_save` | `StabilityLlmConfig` | `{ ok: true }` |

**Event（emit，非 invoke）:** `device_automation_stability_analysis_event` → `{ runId, line }`

- [ ] 写入 `contracts/electron-host-commands.md` 完整 TypeScript 类型
- [ ] 注册 6 个 invoke + 1 个 event 到 `ipcChannels.ts` / `commandPolicy.ts`
- [ ] 更新 `electron/preload.test.ts`、`electron/ipcChannels.test.ts` 白名单断言

### Task 0.2: Tab 路由重命名

**Files:**
- Modify: `src/types/page.ts` — `DeviceAutomationWorkspaceTab` 含 `stability-assurance`
- Modify: `src/features/device-automation/constants/workspaceTabs.ts` — 替换 `monkey-test` + `LEGACY_TAB_ALIASES`
- Modify: `src/features/device-automation/DeviceAutomationWorkspace.tsx` — 渲染 `StabilityAssurancePanel`
- Modify: `src/features/device-automation/components/DeviceAutomationTabNav.test.tsx`

- [ ] Tab id 为 `stability-assurance`；`resolveDeviceAutomationWorkspaceTab("monkey-test")` → `stability-assurance`
- [ ] i18n key：`deviceAutomation.tabs.stability-assurance`
- [ ] 单测：TabNav data-testid 与 onTabChange 参数更新

---

## Phase 1 · Electron 执行层

### Task 1.1: logcat 采集

**Files:**
- Create: `electron/deviceAutomation/captureDeviceLogcat.ts`
- Modify: `electron/deviceAutomation/monkeyTest.ts`
- Modify: `src/features/device-automation/monkey/types.ts`

**Interfaces:**
- `captureAndroidLogcat({ deviceId, outputDir, packageName?, maxLines? }): string | undefined`
- `MonkeyStopResult` / `MonkeySessionSummary` 增加 `crashLogPath?: string`
- `finalizeSession`：当 `conclusion ∈ {crashed, anr}` 或检测到 crash/anr 时调用 logcat，写入 `{outputDir}/crash-logcat.txt`

- [ ] 实现 adb `logcat -d -v threadtime`，按包名 + FATAL/ANR 关键词过滤
- [ ] done 事件与 stop result 携带 `crashLogPath`
- [ ] 单元测试：mock spawnSync 验证过滤逻辑（可选 pure function 抽取）

### Task 1.2: sa-agent 子进程 runner

**Files:**
- Create: `electron/deviceAutomation/stabilityAnalysis.ts`
- Create: `electron/deviceAutomation/stabilityAnalysis.test.ts`
- Modify: `electron/deviceAutomation/runtime.ts`
- Modify: `electron/hostCommands.ts`
- Modify: `electron/main.ts`

**Interfaces:**
- `setStabilityAnalysisResultsRoot(root: string | null)`
- `setStabilityAnalysisEventEmitter(emitter | null)`
- `getStabilityAnalysisToolStatus(): StabilityAnalysisToolStatus`
- `startStabilityAnalysis(params: StabilityAnalysisStartParams): StabilityAnalysisStartResult`
- `cancelStabilityAnalysis(runId: string): StabilityAnalysisStopResult`

**spawn 参数（固定 P1）:**
```bash
python3 -u {toolRoot}/cli/main.py \
  --crash-log {path} \
  --library-dir {libraryDir} \
  --code-root {codeRoot} ... \
  --scope full \
  --prompt-mode analysis \
  --engine sequential \
  --no-interactive \
  --output-format markdown
```

**环境:**
- `cwd`: `{userData}/device-automation/stability-analysis`
- `STABILITY_AGENT_REPORT_DIR`: `{userData}/.../cli_reports`
- `PYTHONUNBUFFERED=1`
- LLM：Task 1.3 注入的 env 或 `--config {tempConfigPath}`

**完成判定:**
- stdout/stderr 逐行 → `device_automation_stability_analysis_event`
- 进程结束 → done 事件含 `reportDir`、`primaryArtifactPath`（优先 `final_output.md`，其次 `round_0/06_ai_gen_res.md`）
- 单设备/单 run 互斥（已有 activeRun 则拒绝）

- [ ] `stabilityAnalysis.test.ts`：mock spawn，验证 CLI argv 含 `--scope full --prompt-mode analysis`
- [ ] `main.ts` 注册 event emitter + `setStabilityAnalysisResultsRoot`

### Task 1.3: LLM 配置持久化

**Files:**
- Create: `electron/deviceAutomation/stabilityLlmConfig.ts`
- Modify: `electron/hostCommands.ts`（read/save 命令）

**Interfaces:**
```typescript
type StabilityLlmConfig = {
  baseUrl: string;
  model: string;
  apiKey: string; // 读写时不在日志/event 中明文打印
  provider?: "openai" | "deepseek" | "zhipu_bigmodel";
};
```

**策略:**
- 持久化路径：`{userData}/device-automation/stability-analysis/agent_config.local.json`
- 格式对齐 sa-agent `llm_config.providers[active_provider]` 子集
- `startStabilityAnalysis` 前：若 UI 传入 config，合并写入临时 config；或通过 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` env 注入（与 sa-agent 兼容优先读 config）

- [ ] save 后 spawn 前验证 `_build_llm_config_from_agent_config` 等价非空（可 subprocess dry-run `--scope parse_log_only` 或本地 JSON 校验）
- [ ] Renderer API：`src/lib/api/stabilityLlmConfig.ts`

---

## Phase 2 · Renderer UI

### Task 2.1: 稳定性保障壳

**Files:**
- Create: `src/features/device-automation/stability/components/StabilityAssurancePanel.tsx`
- Create: `src/features/device-automation/stability/components/StabilityModeSwitch.tsx`
- Modify: `src/features/device-automation/DeviceAutomationWorkspace.tsx`

- [ ] 顶部标题 + `StabilityModeSwitch`（`stress-test` | `crash-analysis`）
- [ ] 压测模式挂载现有 `MonkeyTestPanel`（props 增加 `onOpenCrashAnalysis`）
- [ ] 崩溃分析模式挂载 `CrashAnalysisPanel`

### Task 2.2: 崩溃分析面板

**Files:**
- Create: `src/features/device-automation/stability/types.ts`
- Create: `src/features/device-automation/stability/events.ts`
- Create: `src/features/device-automation/stability/domain/stabilityAnalysisProjection.ts`
- Create: `src/features/device-automation/stability/domain/stabilityAnalysisProjection.unit.test.ts`
- Create: `src/features/device-automation/stability/hooks/useCrashAnalysis.ts`
- Create: `src/features/device-automation/stability/hooks/useStabilityLlmConfig.ts`
- Create: `src/features/device-automation/stability/components/CrashAnalysisPanel.tsx`
- Create: `src/features/device-automation/stability/components/CrashAnalysisToolbar.tsx`
- Create: `src/features/device-automation/stability/components/CrashAnalysisResultPanel.tsx`
- Create: `src/features/device-automation/stability/components/StabilityLlmConfigSection.tsx`
- Create: `src/lib/api/deviceStabilityAnalysis.ts`

**UX 要点:**
- 工具未就绪 / 无 API Key → 禁用「开始根因分析」，展示配置指引
- 可选「仅符号化」降级按钮：`scope=parse_stack_only`（无 LLM，单独 start 参数）
- 结果区：Markdown 渲染 `final_output` 预览（可用现有 markdown 组件或 pre 块 P1）
- 文件选择：`plugin-dialog.open`（crash log / library_dir / code_root）

- [ ] `useCrashAnalysis` 订阅 `DEVICE_AUTOMATION_STABILITY_ANALYSIS_EVENT`
- [ ] projection 单测：append done/error 状态机

### Task 2.3: 压测 → 分析联动

**Files:**
- Modify: `src/features/device-automation/monkey/components/MonkeyTestLogPanel.tsx`
- Modify: `src/features/device-automation/monkey/components/MonkeyTestPanel.tsx`
- Modify: `src/features/device-automation/monkey/hooks/useMonkeyTest.ts` — 传递 `crashLogPath` 到 summary

- [ ] CRASH/ANR 时展示「分析崩溃」→ 切换 `crash-analysis` 并 prefill `{ crashLogPath, localResultDir }`
- [ ] **不**自动调用 LLM（D5-A）

---

## Phase 3 · i18n 与守卫

### Task 3.1: i18n

**Files:**
- Modify: `src/i18n/resources/zh-CN/deviceAutomation.json`
- Modify: `src/i18n/resources/en-US/deviceAutomation.json`

**Key 前缀:** `deviceAutomation.tabs.stability-assurance`、`deviceAutomation.stability.*`（mode / crash / llm / errors）

- [ ] 更新 `monkey.*` 文案为稳定性语境（toolbar 可保留 monkey 引擎名）
- [ ] **不**改 zh-TW / ja-JP / ko-KR（规则 05）

### Task 3.2: 测试与契约

- [ ] `DeviceAutomationTabNav.test.tsx` — stability-assurance tab
- [ ] `stabilityAnalysisProjection.unit.test.ts`
- [ ] `electron/deviceAutomation/stabilityAnalysis.test.ts`
- [ ] `npm run test:contracts`
- [ ] `npm run verify:local`

---

## Phase 4 · 文档

### Task 4.1: quickstart

**Files:**
- Create: `specs/004-stability-assurance/quickstart.md`

内容：
1. 安装 sa-agent sibling 或设置 `STABILITY_ANALYSIS_AGENT_ROOT`
2. 配置 LLM（面板或 env）
3. Android 压测 → crash → 分析崩溃 → 查看报告
4. 常见问题（无 symbol、无 code_root、LLM 失败）

- [ ] 更新需求 Spec 状态为「设计已确认；实现计划见 plan.md」

---

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| sa-agent 分析耗时长 | IPC 流式日志 + 可 cancel |
| API Key 泄露 | 不写 stderr；config 文件权限；UI password input |
| Markdown 报告过大 | 结果区截断 + 「在文件夹中打开」 |
| monkey 模块命名遗留 | P1 保留 `monkey/` 目录，仅 Tab/产品名升级 |

---

## 进度日志

| 日期 | 状态 | 备注 |
| --- | --- | --- |
| 2026-07-16 | Plan | 需求 Spec D1–D7 整包采纳；待实现 |
| 2026-07-16 | Phase 0–2 | Host 契约、Tab 路由、Electron logcat/sa-agent/LLM、Renderer 稳定性保障 UI 与压测联动 |
| 2026-07-16 | Phase 3–4 | i18n 双语校对、monkey 压测文案稳定性语境、定向 vitest + command-contracts 守门；quickstart/tasks 勾选收口 |
| 2026-07-16 | Kea2 侧车接入 | `python -m kea2 run` 引擎模式、工作区工程、Explore→Python codegen、工具状态 API |
