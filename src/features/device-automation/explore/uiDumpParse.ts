/** UI Automator dump XML 解析（与 flowLocator 语义一致，供纯函数规则引擎使用）。 */

export interface UiDumpNode {
  resourceId: string;
  text: string;
  contentDesc: string;
  bounds: { left: number; top: number; right: number; bottom: number };
}

const NODE_TAG_RE = /<node\b[^>]*>/g;

export function parseUiDumpNodes(xml: string): UiDumpNode[] {
  const nodes: UiDumpNode[] = [];
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
