/**
 * 模块树与用例分组纯函数。
 *
 * - `buildModuleTree`：把扁平模块列表组装成树（同级按 orderIndex 再按名称排序）。
 * - `countCasesByModule`：统计每个模块直接挂载的用例数。
 * - `groupCasesByModule`：moduleId → 用例数组（无 moduleId 的归入空串键）。
 */

import type { TestCase, TestCaseModule } from "../types";

/** 模块树节点（含子节点与直接用例计数）。 */
export interface TestCaseModuleNode {
  module: TestCaseModule;
  children: TestCaseModuleNode[];
  directCaseCount: number;
}

function sortModules(a: TestCaseModule, b: TestCaseModule): number {
  if (a.orderIndex !== b.orderIndex) {
    return a.orderIndex - b.orderIndex;
  }
  return a.name.localeCompare(b.name);
}

/** moduleId → 直接挂载的用例数。 */
export function countCasesByModule(
  cases: readonly TestCase[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const testCase of cases) {
    const key = testCase.moduleId || "";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** moduleId → 用例数组（无模块归入 "" 键）。 */
export function groupCasesByModule(
  cases: readonly TestCase[],
): Record<string, TestCase[]> {
  const grouped: Record<string, TestCase[]> = {};
  for (const testCase of cases) {
    const key = testCase.moduleId || "";
    (grouped[key] ??= []).push(testCase);
  }
  return grouped;
}

/** 把扁平模块列表组装成树（孤儿节点挂到根）。 */
export function buildModuleTree(
  modules: readonly TestCaseModule[],
  cases: readonly TestCase[] = [],
): TestCaseModuleNode[] {
  const counts = countCasesByModule(cases);
  const nodeById = new Map<string, TestCaseModuleNode>();
  for (const module of modules) {
    nodeById.set(module.id, {
      module,
      children: [],
      directCaseCount: counts[module.id] ?? 0,
    });
  }

  const roots: TestCaseModuleNode[] = [];
  for (const module of modules) {
    const node = nodeById.get(module.id);
    if (!node) {
      continue;
    }
    const parent =
      module.parentId !== null ? nodeById.get(module.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortTree = (nodes: TestCaseModuleNode[]): void => {
    nodes.sort((a, b) => sortModules(a.module, b.module));
    for (const node of nodes) {
      sortTree(node.children);
    }
  };
  sortTree(roots);

  return roots;
}
