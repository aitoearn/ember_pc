/**
 * Monkey 稳定性测试 API（Electron Host 命令）。
 */

import { safeInvoke } from "@/lib/dev-bridge/safeInvoke";
import type { MonkeyEngineMode, MonkeySessionConclusion } from "@/features/device-automation/monkey/types";

export type StartMonkeyTestParams = {
  deviceId: string;
  packageName: string;
  mode?: MonkeyEngineMode;
  eventCount?: number;
  throttleMs?: number;
  seed?: number;
  runningMinutes?: number;
  ignoreCrashes?: boolean;
  ignoreTimeouts?: boolean;
  profilePeriod?: number;
  takeScreenshots?: boolean;
  fastbotAgent?: "double-sarsa" | "sarsa";
  deviceOutputRoot?: string;
  exploreRules?: import("@/features/device-automation/explore/types").ExploreRule[];
  exploreConfig?: import("@/features/device-automation/explore/types").ExploreConfig;
};

export type StartMonkeyTestResult = {
  sessionId: string;
  startedAt: string;
  mode: MonkeyEngineMode;
};

export type StopMonkeyTestResult = {
  conclusion: MonkeySessionConclusion;
  stoppedAt: string;
  eventsInjected?: number;
  localResultDir?: string;
  bugReportPath?: string;
  stepsLogPath?: string;
  stepsSummary?: {
    totalLines: number;
    monkeyStepCount: number;
    scriptInfoCount: number;
    crashCount: number;
    anrCount: number;
    killAppsCount: number;
    lastMonkeyStep?: number;
  };
};

export type MonkeyTestStatus = {
  activeSessionId?: string;
  deviceId?: string;
  packageName?: string;
  startedAt?: string;
  mode?: MonkeyEngineMode;
};

export async function startMonkeyTest(
  params: StartMonkeyTestParams,
): Promise<StartMonkeyTestResult> {
  return await safeInvoke<StartMonkeyTestResult>(
    "device_automation_monkey_start",
    params,
  );
}

export async function stopMonkeyTest(
  sessionId: string,
): Promise<StopMonkeyTestResult> {
  return await safeInvoke<StopMonkeyTestResult>("device_automation_monkey_stop", {
    sessionId,
  });
}

export async function getMonkeyTestStatus(): Promise<MonkeyTestStatus> {
  return await safeInvoke<MonkeyTestStatus>(
    "device_automation_monkey_get_status",
    {},
  );
}
