/**
 * 探索压测（Kea2 对齐）：工作区规则与配置。
 * 与确定性流共用 HardAssertion 语义，见 flow/domain/flowFormat.ts。
 */

import type { HardAssertionExpr } from "../flow/domain/flowFormat";

/** 对齐 Kea2：invariant 每步必检；property 前置条件满足才检。 */
export type ExploreRuleKind = "invariant" | "property";

export interface ExploreRule {
  id: string;
  name: string;
  kind: ExploreRuleKind;
  enabled: boolean;
  /** property 专用：前置 hard 断言。 */
  precondition?: HardAssertionExpr;
  assertion: HardAssertionExpr;
}

export interface ExploreConfig {
  /** Activity 白名单（一行一个 activity 类名，对齐 awl.strings）。 */
  actWhitelist: string[];
  /** Activity 黑名单（对齐 abl.strings）。 */
  actBlacklist: string[];
  /** 对齐 widget.block：按 XPath 屏蔽控件。 */
  blockWidgetXpaths: string[];
  /** 对齐 block_tree：按 XPath 屏蔽子树。 */
  blockTreeXpaths: string[];
}

export interface DeviceExploreProfile {
  workspaceId: string;
  rules: ExploreRule[];
  config: ExploreConfig;
  updatedAt: string;
}

export const EMPTY_EXPLORE_CONFIG: ExploreConfig = {
  actWhitelist: [],
  actBlacklist: [],
  blockWidgetXpaths: [],
  blockTreeXpaths: [],
};

export interface ExploreRuleCheckResult {
  ruleId: string;
  ruleName: string;
  kind: ExploreRuleKind;
  state: "pass" | "fail" | "error";
  reason?: string;
  startStepsCount: number;
}

/** 探索压测一次运行留痕（App Server `device_explore_runs`）。 */
export interface ExploreRun {
  id: string;
  workspaceId: string;
  sessionId: string;
  deviceId: string;
  packageName: string;
  engineMode: "system" | "fastbot";
  startedAt: string;
  finishedAt?: string;
  conclusion: string;
  eventCount: number;
  throttleMs: number;
  runningMinutes: number;
  seed?: number;
  eventsInjected: number;
  crashCount: number;
  anrCount: number;
  exploreRulesCount: number;
  ruleFailuresCount: number;
  localResultDir?: string;
  bugReportPath?: string;
  stepsLogPath?: string;
  stepsSummary?: import("../monkey/types").MonkeyStepsLogSummary;
  summary: string;
}
