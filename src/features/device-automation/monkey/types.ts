/** Monkey 稳定性测试会话状态（对齐 Kea2 Options 核心字段的子集）。 */

export type MonkeyEngineMode = "system" | "fastbot";

export type MonkeySessionPhase = "idle" | "running" | "stopping";

export type MonkeySessionConclusion =
  | "completed"
  | "stopped"
  | "crashed"
  | "anr"
  | "timeout"
  | "error";

export interface MonkeyStepsLogSummary {
  totalLines: number;
  monkeyStepCount: number;
  scriptInfoCount: number;
  crashCount: number;
  anrCount: number;
  killAppsCount: number;
  lastMonkeyStep?: number;
}

export interface MonkeySessionSummary {
  sessionId: string;
  deviceId: string;
  packageName: string;
  mode: MonkeyEngineMode;
  eventCount: number;
  throttleMs: number;
  seed?: number;
  runningMinutes: number;
  startedAt: string;
  stoppedAt?: string;
  conclusion?: MonkeySessionConclusion;
  eventsInjected?: number;
  crashCount: number;
  anrCount: number;
  localResultDir?: string;
  bugReportPath?: string;
  stepsLogPath?: string;
  stepsSummary?: MonkeyStepsLogSummary;
}

export interface MonkeyLogLine {
  ts: number;
  type: "log" | "crash" | "anr" | "progress" | "done" | "error";
  message: string;
  eventsInjected?: number;
  localResultDir?: string;
  bugReportPath?: string;
  stepsLogPath?: string;
  stepsSummary?: MonkeyStepsLogSummary;
}
