/**
 * 用例筛选纯函数。
 *
 * 关键词匹配标题 / 编号 / 步骤（操作+预期）/ 断言 / 标签；其余维度（模块、优先级、
 * 类型、状态、来源、执行结果）为多选，空数组表示不限。所有分支无副作用，
 * 便于 `*.unit.test.ts` 覆盖（research R7）。
 */

import type { TestCase, TestCaseFilter } from "../types";

function matchesKeyword(testCase: TestCase, keyword: string): boolean {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }
  const haystack = [
    testCase.title,
    testCase.caseId,
    testCase.remark,
    ...testCase.tags,
    ...testCase.assertions,
    ...testCase.steps.flatMap((step) => [step.action, step.expected]),
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(trimmed);
}

function matchesModule(testCase: TestCase, moduleId: string | null): boolean {
  if (moduleId === null) {
    return true;
  }
  return testCase.moduleId === moduleId;
}

function matchesMulti<T extends string>(value: T, selected: readonly T[]): boolean {
  return selected.length === 0 || selected.includes(value);
}

/** 按筛选条件过滤用例集合（不修改入参）。 */
export function filterCases(
  cases: readonly TestCase[],
  filter: TestCaseFilter,
): TestCase[] {
  return cases.filter(
    (testCase) =>
      matchesKeyword(testCase, filter.keyword) &&
      matchesModule(testCase, filter.moduleId) &&
      matchesMulti(testCase.priority, filter.priorities) &&
      matchesMulti(testCase.caseType, filter.caseTypes) &&
      matchesMulti(testCase.status, filter.statuses) &&
      matchesMulti(testCase.source, filter.sources) &&
      matchesMulti(testCase.execResult, filter.execResults),
  );
}
