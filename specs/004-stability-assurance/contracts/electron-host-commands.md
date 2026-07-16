# Contracts · Electron Host：稳定性崩溃分析

崩溃分析执行在 Electron main（spawn sa-agent）；报告落本地 `userData`；**P1 不走 App Server**。

## TypeScript 类型汇总

```typescript
/** LLM 配置（read / save 共用） */
export type StabilityLlmConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
  provider: "openai" | "deepseek" | "zhipu_bigmodel";
  configured: boolean;
};

export type StabilityAnalysisGetToolStatusParams = Record<string, never>;

export type StabilityAnalysisGetToolStatusResult = {
  available: boolean;
  toolRoot?: string;
  cliEntry?: string;
  pythonCommand?: string;
  error?: string;
};

export type StabilityAnalysisStartParams = {
  crashLogPath?: string;
  crashLogContent?: string;
  libraryDir?: string;
  codeRoots?: string[];
  scope?: "full" | "parse_stack_only"; // P1 默认 full
  promptMode?: "analysis"; // P1 固定 analysis；host 层拒绝 fix
  outputFormat?: "markdown" | "json" | "text";
};

export type StabilityAnalysisStartResult = {
  runId: string;
  startedAt: string;
  toolRoot: string;
  reportRoot: string;
};

export type StabilityAnalysisCancelParams = {
  runId: string;
};

export type StabilityAnalysisCancelResult = {
  runId: string;
  status: "canceled";
  stoppedAt: string;
};

export type StabilityAnalysisGetStatusParams = Record<string, never>;

export type StabilityAnalysisGetStatusResult = {
  activeRunId?: string;
  startedAt?: string;
};

export type StabilityLlmConfigSaveResult = {
  ok: true;
};

export type StabilityAnalysisEventLine = {
  ts: number;
  type: "log" | "stderr" | "progress" | "done" | "error";
  message: string;
  reportDir?: string;
  primaryArtifactPath?: string;
};

export type StabilityAnalysisEventPayload = {
  runId: string;
  line: StabilityAnalysisEventLine;
};
```

## device_automation_stability_analysis_get_tool_status

- **Params**: `{}`
- **Result**:
  ```typescript
  {
    available: boolean;
    toolRoot?: string;
    cliEntry?: string;
    pythonCommand?: string;
    error?: string;
  }
  ```
- **行为**: 解析 `STABILITY_ANALYSIS_AGENT_ROOT` / sibling；检查 `cli/main.py` 存在

## device_automation_stability_analysis_start

- **Params**:
  ```typescript
  {
    crashLogPath?: string;
    crashLogContent?: string;
    libraryDir?: string;
    codeRoots?: string[];
    scope?: "full" | "parse_stack_only"; // P1 默认 full
    promptMode?: "analysis";             // P1 固定 analysis；host 层拒绝 fix
    outputFormat?: "markdown" | "json" | "text";
  }
  ```
- **Result**: `{ runId: string; startedAt: string; toolRoot: string; reportRoot: string }`
- **行为**:
  - `promptMode !== "analysis"` → 抛错（P1）
  - `scope=full` 且无有效 LLM config → 抛错（不得伪根因）
  - spawn sa-agent；stdout/stderr → `device_automation_stability_analysis_event`
  - 单 run 互斥

## device_automation_stability_analysis_cancel

- **Params**: `{ runId: string }`
- **Result**: `{ runId: string; status: "canceled"; stoppedAt: string }`

## device_automation_stability_analysis_get_status

- **Params**: `{}`
- **Result**: `{ activeRunId?: string; startedAt?: string }`

## device_automation_stability_llm_config_read

- **Params**: `{}`
- **Result**:
  ```typescript
  {
    baseUrl: string;
    model: string;
    apiKey: string;
    provider: "openai" | "deepseek" | "zhipu_bigmodel";
    configured: boolean;
  }
  ```
- **行为**: 从 `{userData}/device-automation/stability-analysis/agent_config.local.json` 读取；apiKey 可掩码返回（仅末 4 位）

## device_automation_stability_llm_config_save

- **Params**: 同 read（apiKey 明文仅 invoke 传输）
- **Result**: `{ ok: true }`

## device_automation_stability_analysis_event（emit）

- **Payload**:
  ```typescript
  {
    runId: string;
    line: {
      ts: number;
      type: "log" | "stderr" | "progress" | "done" | "error";
      message: string;
      reportDir?: string;
      primaryArtifactPath?: string;
    };
  }
  ```

## 与 monkey 命令关系

现有 `device_automation_monkey_*` **不变**。`MonkeyStopResult` 扩展：

```typescript
{
  // ...existing
  crashLogPath?: string;
}
```
