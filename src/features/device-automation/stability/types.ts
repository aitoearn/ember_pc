/** LLM 配置（read / save 共用） */
export type StabilityLlmConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
  provider: "openai" | "deepseek" | "zhipu_bigmodel";
  configured: boolean;
};

export type StabilityAnalysisEventLine = {
  ts: number;
  type: "log" | "stderr" | "progress" | "done" | "error";
  message: string;
  reportDir?: string;
  primaryArtifactPath?: string;
};
