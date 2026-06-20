import type { HardAssertionExpr, LocatorKind, TextMatch } from "../flow/domain/flowFormat";
import { parseUiDumpNodes, type UiDumpNode } from "./uiDumpParse";

export interface HardAssertionEvalResult {
  ok: boolean;
  reason?: string;
}

function textMatches(nodeText: string, value: string, match: TextMatch): boolean {
  const a = nodeText.trim();
  const b = value.trim();
  if (!a || !b) {
    return false;
  }
  return match === "exact" ? a === b : a.includes(b) || b.includes(a);
}

function nodeMatchesLocator(
  node: UiDumpNode,
  kind: LocatorKind,
  value: string,
  match: TextMatch,
): boolean {
  const v = value.trim();
  if (!v) {
    return false;
  }
  switch (kind) {
    case "resource_id":
      return node.resourceId.includes(v) || v.includes(node.resourceId);
    case "text":
      return textMatches(node.text, v, match);
    case "accessibility_id":
      return textMatches(node.contentDesc, v, match);
    case "ui_tree_path":
      return node.resourceId.includes(v);
    case "vlm_anchor":
      return false;
    default:
      return false;
  }
}

export function evaluateHardAssertionOnNodes(
  nodes: UiDumpNode[],
  expr: HardAssertionExpr,
): HardAssertionEvalResult {
  const match = expr.match ?? "contains";
  const found = nodes.some((node) =>
    nodeMatchesLocator(node, expr.locatorKind, expr.value, match),
  );
  const ok = expr.present ? found : !found;
  if (ok) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: expr.present
      ? `未找到 ${expr.locatorKind}=${expr.value}`
      : `不应存在 ${expr.locatorKind}=${expr.value}`,
  };
}

export function evaluateHardAssertionOnUiDump(
  uiDumpXml: string,
  expr: HardAssertionExpr,
): HardAssertionEvalResult {
  if (!uiDumpXml.trim()) {
    return { ok: false, reason: "UI 树为空" };
  }
  const nodes = parseUiDumpNodes(uiDumpXml);
  return evaluateHardAssertionOnNodes(nodes, expr);
}
