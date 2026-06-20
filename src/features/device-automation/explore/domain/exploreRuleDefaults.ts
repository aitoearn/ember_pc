import type { HardAssertionExpr, LocatorKind, TextMatch } from "../../flow/domain/flowFormat";
import { LOCATOR_KINDS } from "../../flow/domain/flowFormat";
import type { ExploreRule, ExploreRuleKind } from "../types";

export type ExploreLocatorKind = Exclude<LocatorKind, "vlm_anchor">;

/** 探索规则可用的定位类型（不含 vlm_anchor）。 */
export const EXPLORE_LOCATOR_KINDS: ExploreLocatorKind[] = LOCATOR_KINDS.filter(
  (kind): kind is ExploreLocatorKind => kind !== "vlm_anchor",
);

export function createEmptyExploreRule(kind: ExploreRuleKind = "invariant"): ExploreRule {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `rule-${Date.now()}`,
    name: kind === "invariant" ? "新不变量" : "新属性",
    kind,
    enabled: true,
    assertion: defaultHardAssertion(),
  };
}

export function defaultHardAssertion(): HardAssertionExpr {
  return {
    locatorKind: "text",
    value: "",
    match: "contains",
    present: true,
  };
}

export function parseLineList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatLineList(lines: string[]): string {
  return lines.join("\n");
}

export function isTextMatch(value: string): value is TextMatch {
  return value === "exact" || value === "contains";
}

export function isExploreLocatorKind(value: string): value is ExploreLocatorKind {
  return (EXPLORE_LOCATOR_KINDS as readonly string[]).includes(value);
}
