/**
 * UI dump 启发式检测（Kea2 invariant 思路 + RN 空白页扩展）。
 */

import { parseUiDumpNodes } from "../uiDumpParse";
import type { ExploreRuleCheckResult } from "../types";

export type Kea2HeuristicId =
  | "empty_ui_tree"
  | "no_visible_content"
  | "rn_blank_heuristic";

export interface Kea2HeuristicOptions {
  /** 是否启用 RN 空白页启发式（ReactRootView 稀疏树）。 */
  rnBlankHeuristic?: boolean;
}

const RN_ROOT_MARKERS = [
  "ReactRootView",
  "com.facebook.react",
  "react_native",
  "RNGestureHandlerRootView",
];

/** Kea2 对齐：每步 invariant 启发式（弥补 Kea2 无内置白屏检测）。 */
export function runKea2UiDumpHeuristics(
  uiDumpXml: string,
  stepsCount: number,
  options: Kea2HeuristicOptions = {},
): ExploreRuleCheckResult[] {
  const results: ExploreRuleCheckResult[] = [];
  const xml = uiDumpXml.trim();

  if (!xml) {
    results.push(failHeuristic("empty_ui_tree", "UI 树为空", stepsCount));
    return results;
  }

  const nodes = parseUiDumpNodes(xml);
  if (nodes.length === 0) {
    results.push(failHeuristic("empty_ui_tree", "UI 树无有效节点", stepsCount));
    return results;
  }

  const visibleTextNodes = nodes.filter(
    (node) => node.text.trim().length >= 1 || node.contentDesc.trim().length >= 1,
  );
  if (visibleTextNodes.length === 0) {
    results.push(
      failHeuristic(
        "no_visible_content",
        "页面无可读 text/content-desc（疑似空白或纯图标页）",
        stepsCount,
      ),
    );
  }

  if (options.rnBlankHeuristic !== false && isLikelyRnBlankScreen(nodes)) {
    results.push(
      failHeuristic(
        "rn_blank_heuristic",
        "检测到 RN 根视图且缺少可见文案（疑似 RN 白屏）",
        stepsCount,
      ),
    );
  }

  return results;
}

function isLikelyRnBlankScreen(
  nodes: ReturnType<typeof parseUiDumpNodes>,
): boolean {
  if (nodes.length === 0 || nodes.length > 20) {
    return false;
  }
  const hasRnRoot = nodes.some((node) =>
    RN_ROOT_MARKERS.some(
      (marker) =>
        node.resourceId.includes(marker) ||
        node.contentDesc.includes(marker) ||
        node.text.includes(marker),
    ),
  );
  if (!hasRnRoot) {
    return false;
  }
  const hasVisibleText = nodes.some(
    (node) => node.text.trim().length >= 2 || node.contentDesc.trim().length >= 2,
  );
  return !hasVisibleText;
}

function failHeuristic(
  id: Kea2HeuristicId,
  reason: string,
  stepsCount: number,
): ExploreRuleCheckResult {
  const nameMap: Record<Kea2HeuristicId, string> = {
    empty_ui_tree: "Kea2/空 UI 树",
    no_visible_content: "Kea2/无可见文案",
    rn_blank_heuristic: "Kea2/RN 空白页",
  };
  return {
    ruleId: `kea2-builtin-${id}`,
    ruleName: nameMap[id],
    kind: "invariant",
    state: "fail",
    reason,
    startStepsCount: stepsCount,
  };
}
