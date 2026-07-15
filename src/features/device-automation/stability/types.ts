/** LLM 配置（read / save 共用） */
export type StabilityLlmConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
  provider: "openai" | "deepseek" | "zhipu_bigmodel";
  configured: boolean;
};

export type StabilityAssuranceMode = "stress-test" | "crash-analysis";

export type StabilityAnalysisPhase = "idle" | "running" | "canceling";

export type StabilityAnalysisScope = "full" | "parse_stack_only";

export type CrashAnalysisPrefill = {
  crashLogPath?: string;
  localResultDir?: string;
};

export type StabilityAnalysisToolStatus = {
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
  scope?: StabilityAnalysisScope;
  promptMode?: "analysis";
  outputFormat?: "markdown" | "json" | "text";
};

export type StabilityAnalysisStartResult = {
  runId: string;
  startedAt: string;
  toolRoot: string;
  reportRoot: string;
};

export type StabilityAnalysisEventLine = {
  ts: number;
  type: "log" | "stderr" | "progress" | "done" | "error";
  message: string;
  reportDir?: string;
  primaryArtifactPath?: string;
};

export interface CrashAnalysisFormState {
  crashLogPath: string;
  libraryDir: string;
  codeRoot: string;
}
