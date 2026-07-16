/**
 * 确定性流定位：按 locators 优先级在 UI dump 中匹配（不调大模型）。
 */

import type { Locator, LocatorKind, TextMatch } from "../../src/features/device-automation/flow/domain/flowFormat";

export interface FlowLocatorHit {
  kind: LocatorKind;
  value: string;
  centerX: number;
  centerY: number;
}

export interface FlowLocatorMiss {
  ok: false;
  reason: string;
}

export type FlowLocatorResult = FlowLocatorHit | FlowLocatorMiss;

interface ParsedNode {
  resourceId: string;
  text: string;
  contentDesc: string;
  bounds: { left: number; top: number; right: number; bottom: number };
}

const NODE_TAG_RE = /<node\b[^>]*>/g;

function parseUiDumpNodes(xml: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  let match: RegExpExecArray | null;
  while ((match = NODE_TAG_RE.exec(xml)) !== null) {
    const tag = match[0];
    const resourceId = extractAttr(tag, "resource-id") ?? "";
    const text = extractAttr(tag, "text") ?? "";
    const contentDesc = extractAttr(tag, "content-desc") ?? "";
    const boundsRaw = extractAttr(tag, "bounds");
    if (!boundsRaw) {
      continue;
    }
    const boundsMatch = boundsRaw.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!boundsMatch) {
      continue;
    }
    nodes.push({
      resourceId,
      text,
      contentDesc,
      bounds: {
        left: Number(boundsMatch[1]),
        top: Number(boundsMatch[2]),
        right: Number(boundsMatch[3]),
        bottom: Number(boundsMatch[4]),
      },
    });
  }
  return nodes;
}

function extractAttr(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}="([^"]*)"`);
  const m = tag.match(re);
  return m?.[1];
}

function centerOf(bounds: ParsedNode["bounds"]): { x: number; y: number } {
  return {
    x: Math.round((bounds.left + bounds.right) / 2),
    y: Math.round((bounds.top + bounds.bottom) / 2),
  };
}

function textMatches(nodeText: string, value: string, match: TextMatch): boolean {
  const a = nodeText.trim();
  const b = value.trim();
  if (!a || !b) {
    return false;
  }
  return match === "exact" ? a === b : a.includes(b) || b.includes(a);
}

function matchLocatorOnNodes(
  locator: Locator,
  nodes: ParsedNode[],
  screen: { width: number; height: number },
): FlowLocatorHit | null {
  switch (locator.kind) {
    case "resource_id":
      for (const node of nodes) {
        if (node.resourceId === locator.value || node.resourceId.endsWith(`/${locator.value}`)) {
          const c = centerOf(node.bounds);
          return { kind: locator.kind, value: locator.value, centerX: c.x, centerY: c.y };
        }
      }
      return null;
    case "text":
      const matchMode = locator.match ?? "contains";
      for (const node of nodes) {
        if (
          textMatches(node.text, locator.value, matchMode) ||
          textMatches(node.contentDesc, locator.value, matchMode)
        ) {
          const c = centerOf(node.bounds);
          return { kind: locator.kind, value: locator.value, centerX: c.x, centerY: c.y };
        }
      }
      return null;
    case "accessibility_id":
      for (const node of nodes) {
        if (node.contentDesc === locator.value) {
          const c = centerOf(node.bounds);
          return { kind: locator.kind, value: locator.value, centerX: c.x, centerY: c.y };
        }
      }
      return null;
    case "ui_tree_path":
      // 首期：将 path 视为 resource-id 全匹配或包含
      for (const node of nodes) {
        if (node.resourceId.includes(locator.value)) {
          const c = centerOf(node.bounds);
          return { kind: locator.kind, value: locator.value, centerX: c.x, centerY: c.y };
        }
      }
      return null;
    case "vlm_anchor": {
      const anchor = locator.vlmAnchor;
      if (!anchor) {
        return null;
      }
      const x = Math.round((anchor.xNorm * screen.width) / 1000);
      const y = Math.round((anchor.yNorm * screen.height) / 1000);
      return {
        kind: locator.kind,
        value: locator.value,
        centerX: x,
        centerY: y,
      };
    }
    default:
      return null;
  }
}

/** 按 locators 顺序尝试定位，返回首个命中或失配原因。 */
export function tryLocateLocators(
  locators: Locator[],
  dumpXml: string,
  screen: { width: number; height: number },
): FlowLocatorResult {
  if (locators.length === 0) {
    return { ok: false, reason: "无可用定位策略" };
  }
  const nodes = parseUiDumpNodes(dumpXml);
  for (const locator of locators) {
    const hit = matchLocatorOnNodes(locator, nodes, screen);
    if (hit) {
      return hit;
    }
  }
  return { ok: false, reason: "全部定位策略均未命中" };
}
