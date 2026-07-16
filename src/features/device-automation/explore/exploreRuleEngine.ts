import type { ExploreRule, ExploreRuleCheckResult } from "./types";
import { evaluateHardAssertionOnUiDump } from "./hardAssertionEval";

/**
 * 单步探索规则检查（对齐 Kea2 主循环：先 invariant 全跑，再 property 按前置条件）。
 */
export function runExploreRuleChecks(
  uiDumpXml: string,
  rules: ExploreRule[],
  stepsCount: number,
): ExploreRuleCheckResult[] {
  const enabled = rules.filter((rule) => rule.enabled);
  const results: ExploreRuleCheckResult[] = [];

  const invariants = enabled.filter((rule) => rule.kind === "invariant");
  const properties = enabled.filter((rule) => rule.kind === "property");

  for (const rule of invariants) {
    results.push(runSingleRule(uiDumpXml, rule, stepsCount));
  }

  for (const rule of properties) {
    if (rule.precondition) {
      const pre = evaluateHardAssertionOnUiDump(uiDumpXml, rule.precondition);
      if (!pre.ok) {
        continue;
      }
    }
    results.push(runSingleRule(uiDumpXml, rule, stepsCount));
  }

  return results;
}

function runSingleRule(
  uiDumpXml: string,
  rule: ExploreRule,
  stepsCount: number,
): ExploreRuleCheckResult {
  try {
    const evalResult = evaluateHardAssertionOnUiDump(uiDumpXml, rule.assertion);
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      kind: rule.kind,
      state: evalResult.ok ? "pass" : "fail",
      reason: evalResult.reason,
      startStepsCount: stepsCount,
    };
  } catch (error) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      kind: rule.kind,
      state: "error",
      reason: error instanceof Error ? error.message : String(error),
      startStepsCount: stepsCount,
    };
  }
}

export function listFailedExploreChecks(
  results: ExploreRuleCheckResult[],
): ExploreRuleCheckResult[] {
  return results.filter((result) => result.state === "fail" || result.state === "error");
}
