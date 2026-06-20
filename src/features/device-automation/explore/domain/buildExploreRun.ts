import type { MonkeyLogLine, MonkeySessionSummary } from "../../monkey/types";
import type { ExploreRun } from "../types";

export function countExploreRuleFailures(
  logs: MonkeyLogLine[],
  stepsSummary?: MonkeySessionSummary["stepsSummary"],
): number {
  if (stepsSummary && stepsSummary.scriptInfoCount > 0) {
    return stepsSummary.scriptInfoCount;
  }
  let count = 0;
  for (const line of logs) {
    if (
      (line.type === "error" || line.type === "crash") &&
      (line.message.includes("[invariant]") || line.message.includes("[property]"))
    ) {
      count += 1;
    }
  }
  return count;
}

export function buildExploreRunSummary(
  summary: MonkeySessionSummary,
  ruleFailuresCount: number,
): string {
  const conclusion = summary.conclusion ?? "completed";
  const events = summary.eventsInjected ?? 0;
  const parts = [
    conclusion,
    `${events} 步`,
    `CRASH ${summary.crashCount}`,
    `ANR ${summary.anrCount}`,
  ];
  if (ruleFailuresCount > 0) {
    parts.push(`规则失败 ${ruleFailuresCount}`);
  }
  return parts.join(" · ");
}

export function buildExploreRunFromMonkeySession(
  workspaceId: string,
  summary: MonkeySessionSummary,
  logs: MonkeyLogLine[],
  exploreRulesCount: number,
): ExploreRun {
  const ruleFailuresCount = countExploreRuleFailures(logs, summary.stepsSummary);
  return {
    id: summary.sessionId,
    workspaceId,
    sessionId: summary.sessionId,
    deviceId: summary.deviceId,
    packageName: summary.packageName,
    engineMode: summary.mode,
    startedAt: summary.startedAt,
    finishedAt: summary.stoppedAt,
    conclusion: summary.conclusion ?? "completed",
    eventCount: summary.eventCount,
    throttleMs: summary.throttleMs,
    runningMinutes: summary.runningMinutes,
    seed: summary.seed,
    eventsInjected: summary.eventsInjected ?? 0,
    crashCount: summary.crashCount,
    anrCount: summary.anrCount,
    exploreRulesCount,
    ruleFailuresCount,
    localResultDir: summary.localResultDir,
    bugReportPath: summary.bugReportPath,
    stepsLogPath: summary.stepsLogPath,
    stepsSummary: summary.stepsSummary,
    summary: buildExploreRunSummary(summary, ruleFailuresCount),
  };
}
