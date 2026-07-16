# 稳定性保障 · 需求设计 Spec

- 日期：2026-07-15
- 分支：`feature/stability-assurance`
- 模块：移动端测试 → **稳定性保障**（原 `monkey-test` Tab 升级）
- 状态：**设计已确认**（2026-07-16）；实现计划见 [`specs/004-stability-assurance/plan.md`](../../specs/004-stability-assurance/plan.md)

## 1. 背景与目标

Ember「移动端测试」工作台当前有 **Monkey 测试** Tab（`monkey-test`），已实现 Android 双引擎压测（Fastbot 逐步 + System Monkey）、探索规则校验与运行历史留痕。产品命名与能力边界需升级：

| 现状 | 目标 |
| --- | --- |
| Tab 名「Monkey 测试」，能力≈随机压测 | Tab 名 **「稳定性保障」**，覆盖 **压测 + 崩溃事后分析** 闭环 |
| 压测 crash 后仅本地报告 / steps.log | 可一键进入 **崩溃分析**，输出 **根因推断 + 修复建议**（LLM，见 D3） |
| 与外部工具无集成 | 参考并对接 **`stability-analysis-agent`（sa-agent）** |

**参考材料（不直接整仓拷贝）：**

| 来源 | 用途 |
| --- | --- |
| 本仓库 `src/features/device-automation/monkey/**` | 现有压测 UI / Electron 执行 / Explore 联动 |
| `/Users/lisq/ai/testplatform/perf/stability-analysis-agent` | 崩溃解析、符号化、报告协议、Daemon/CLI |
| `docs/superpowers/specs/2026-06-17-device-performance-monitor-design.md` | Tab 内子模式、Electron + App Server 分层惯例 |

**与仓库约束对齐：**

- 设备 IO（ADB / logcat 采集）在 **Electron `deviceAutomation`**，命令前缀 `device_automation_*`
- **压测执行**继续走 Electron Host（现状不变）；**崩溃分析报告**首期可仅落本地 `userData`，P2 再考虑 App Server 持久化
- 生产路径禁止 mock；i18n 首期仅 **zh-CN + en-US**
- sa-agent 作为 **可选 Python 工具链**（环境变量 / sibling 目录解析，对齐 `resolveToolRoot` + AutoGLM 模式），**不**在 P1 引入第二套常驻 sidecar（除非评审选用方案 B）

## 2. 已确认的关键决策（2026-07-16）

| # | 决策点 | 结论 |
| --- | --- | --- |
| D1 | Tab 标识迁移 | **A** `stability-assurance` + `monkey-test` alias |
| D2 | Tab 内信息架构 | **A** 压测运行 \| 崩溃分析 |
| D3 | sa-agent 集成深度 | **C** `full` + LLM 根因/修复建议 |
| D3b | LLM 输出模式 | **analysis**（仅文字，不自动改码） |
| D3c | LLM 配置入口 | **A** Ember 面板配置 |
| D4 | 调用方式 | **A** Electron spawn CLI |
| D5 | 压测 crash 后 | **A** logcat + 预填，用户确认后调 LLM |
| D6 | 报告持久化 | **A** 仅 userData |
| D7 | code_root | **A** 手动选择 |

<!-- 原选项表归档于 git history；实现细节见 plan.md -->

## 3. 用户故事（需求层）

### US-1 命名与入口

作为测试工程师，我在「移动端测试」工作台看到 **「稳定性保障」** Tab（而非 Monkey 测试），理解该模块负责 App 稳定性验证与问题分析。

### US-2 压测（保留并归属）

作为测试工程师，我可在 **压测运行** 子模式下继续使用 Fastbot / System Monkey、探索规则与运行历史，行为与现网一致（Android 首期）。

### US-3 崩溃根因分析与修复建议（D3=C）

作为测试工程师，压测出现 CRASH/ANR 后，我可在 **崩溃分析** 子模式发起分析：在配置 `library_dir`、可选 `code_root` 与 LLM 密钥后，获得 **根因说明、证据链、修复建议**（Markdown 报告，对应 sa-agent `final_output.md` / `round_*/06_ai_gen_res.md`），并可查看前置结构化产物（`01` 解析、`02` 符号化、`03` 源码上下文）。

**不包含（P1）**：自动把 patch 写入被测 App 源码仓库（`prompt_mode=fix` + `fix_code_applier`）。

### US-4 工具链可发现性

当本机未安装 / 未配置 sa-agent 时，界面给出明确提示（环境变量 `STABILITY_ANALYSIS_AGENT_ROOT`、sibling 目录约定），而不是 silent fail。

### US-5 与 Explore 历史衔接（P2 候选）

崩溃分析 run 与 `device_explore_runs` 关联展示（从某次压测 run 跳转分析）。**P1 不做**，仅预留 `crashLogPath` 字段扩展点。

## 4. 能力范围（YAGNI）

### 4.1 P1 必须交付（推荐包）

1. Tab 重命名与路由：`stability-assurance` + 旧 alias
2. `StabilityAssurancePanel`：二级模式切换（压测 \| 崩溃分析）
3. 压测子模式：复用现有 `MonkeyTestPanel` 能力，文案调整为稳定性语境
4. 崩溃分析子模式：
   - 选择崩溃日志 / 符号库目录 / 可选 code_root
   - **LLM 配置**（OpenAI 兼容端点；可写入 sa-agent 运行时 env 或临时 config）
   - scope：**`full`**，`prompt_mode`：**`analysis`**（根因 + 修复建议，不自动改码）
   - 启动 / 取消分析，实时日志流，展示 **AI 分析报告** + 打开 `cli_reports` 目录
5. Electron：`device_automation_stability_analysis_*` 命令 + sa-agent spawn（`--scope full --prompt-mode analysis`）
6. 压测异常结束：自动采集 logcat（Android）+「分析崩溃」快捷入口（预填路径，**需用户确认再调 LLM**）
7. i18n（zh-CN / en-US）、TabNav / workspace 守卫测试更新

**sa-agent P1 工具链（随 D3=C）：**

```text
01 crash_log_parser → 02 add2line_resolver → 03 code_content_provider
  → LLM（analysis）→ final_output.md / 06_ai_gen_res.md
（跳过 07 apply_ai_fixes）
```

### 4.2 P1 明确不做

- iOS / Harmony Monkey 压测（维持现状提示）
- sa-agent **`prompt_mode=fix` 自动改码**、`fix_code_applier`、Git 备份回滚（→ P2 / 单独开关）
- RAG / ChromaDB / torch 依赖链（可选 `[rag]`，P2）
- 常驻 sa-agent Daemon sidecar（除非 D4 改选 B）
- App Server 持久化分析历史（除非 D6 改选 B）
- ANR/OOM 专用工作流（sa-agent roadmap 项，后续单独立项）
- **无 API Key 时的「伪根因」**：未配置 LLM 时不得假装完成分析；可降级展示 `parse_stack_only` 并明确提示「需配置模型才能生成根因建议」

### 4.3 P2 候选

- `prompt_mode=fix` + 可选自动落盘 patch（需二次确认与备份策略）
- App Server `stabilityAnalysisRun` CRUD + 与 explore run 关联
- RAG 相似案例、`bug-platform-fetcher` / `automation-testing` Skill 对接
- iOS crash (.ips/.crash) 日志拉取与解析
- crash 后自动触发 full 分析（D5=C）

## 5. 架构草案（需求级，细节见实现计划）

```text
Renderer (src/features/device-automation/stability/)
  ├─ StabilityAssurancePanel          // Tab 内容根
  ├─ StabilityModeSwitch              // 压测 | 崩溃分析
  ├─ [压测] MonkeyTestPanel（现有，薄包装）
  ├─ [分析] CrashAnalysisPanel
  │    ├─ useCrashAnalysis
  │    └─ safeListen(stability_analysis_event)
  └─ safeInvoke(device_automation_stability_analysis_*)

Electron Main (electron/deviceAutomation/)
  ├─ monkeyTest.ts（现有，增强 logcat 采集）
  ├─ stabilityAnalysis.ts（新增，spawn sa-agent CLI）
  ├─ captureDeviceLogcat.ts（新增）
  └─ resolveToolRoot(STABILITY_ANALYSIS_AGENT_ROOT)

External (可选)
  └─ stability-analysis-agent/cli/main.py
       → cli_reports/{session}/01..07 + final_output.md
```

**数据流（压测 → 分析）：**

```text
Fastbot/System Monkey 结束 (crashed/anr)
  → Electron 采集 logcat → userData/.../crash-logcat.txt
  → Renderer 展示「分析崩溃」
  → 用户确认 library_dir / code_root / LLM
  → spawn sa-agent (--scope full --prompt-mode analysis)
  → IPC 事件流 + 展示 final_output.md（根因 + 修复建议）
```

## 6. 验收场景（P1）

1. **Given** 工作台打开，**When** 查看 Tab 列表，**Then** 显示「稳定性保障」，旧链接 `tab=monkey-test` 仍可进入同一页。
2. **Given** 已配置 sa-agent 且 Android 设备在线，**When** 压测运行至 CRASH 并结束，**Then** 结果目录含 `crash-logcat.txt`，可一键进入崩溃分析且路径已预填。
3. **Given** 已配置 sa-agent + LLM + 有效 crash log / library_dir / code_root，**When** 执行「根因分析」，**Then** 生成含根因与修复建议的 `final_output.md`（或 `06_ai_gen_res.md`），UI 可阅读全文并打开报告目录。
4. **Given** 未配置 sa-agent 或 LLM Key，**When** 进入崩溃分析，**Then** 显示配置指引；无 Key 时不可发起 full 分析（可选手动仅看 `parse_stack_only` 降级）。
5. **Given** 分析进行中，**When** 用户取消，**Then** 子进程终止，UI 恢复 idle。

## 7. 风险与依赖

| 风险 | 缓解 |
| --- | --- |
| sa-agent 未安装 / Python 环境不一致 | `get_tool_status` 预检 + 文档说明；支持 `DEVICE_AUTOMATION_PYTHON` |
| logcat 体积大 / 无有效栈 | 按包名 + FATAL/ANR 关键词过滤；保留完整 log 文件路径供手动重选 |
| sa-agent 与 Ember 报告目录 cwd 差异 | 统一 `STABILITY_AGENT_REPORT_DIR` 指向 `userData` |
| LLM 费用 / 密钥安全 | Key 存 userData 加密或 OS keychain；分析前展示预估；默认不自动触发 |
| code_root 未配导致根因质量差 | UI 强提示；analysis 模式允许「证据不足」结论（sa-agent 原生支持） |
| 范围膨胀（自动改码） | P1 锁 `prompt_mode=analysis`；fix 落盘单独立项 |

## 8. 评审检查清单

- [x] D1–D7、D3b、D3c 已确认（2026-07-16）
- [x] 实现计划：`specs/004-stability-assurance/plan.md`
- [ ] P1 范围无遗漏/无镀金
- [ ] 与 `001/002/003` spec 边界清晰（不进用例管理 / 确定性流主线）
- [ ] 参考仓库路径与 env 约定已认可

---

**下一步：**

1. ~~需求 Spec 确认~~ ✅
2. ~~技术实现计划~~ → [`specs/004-stability-assurance/plan.md`](../../specs/004-stability-assurance/plan.md)
3. 按计划 Phase 0 开始编码（分支 `feature/stability-assurance`）
