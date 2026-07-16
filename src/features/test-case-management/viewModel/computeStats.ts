/**
 * 用例统计摘要纯函数：total + byPriority / byStatus / byExecResult。
 */

import {
  TEST_CASE_EXEC_RESULTS,
  TEST_CASE_PRIORITIES,
  TEST_CASE_STATUSES,
  type TestCase,
  type TestCaseExecResult,
  type TestCasePriority,
  type TestCaseStats,
  type TestCaseStatus,
} from "../types";

function zeroCount<T extends string>(keys: readonly T[]): Record<T, number> {
  return keys.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<T, number>,
  );
}

/** 从用例集合计算统计摘要（不修改入参）。 */
export function computeStats(cases: readonly TestCase[]): TestCaseStats {
  const byPriority = zeroCount<TestCasePriority>(TEST_CASE_PRIORITIES);
  const byStatus = zeroCount<TestCaseStatus>(TEST_CASE_STATUSES);
  const byExecResult = zeroCount<TestCaseExecResult>(TEST_CASE_EXEC_RESULTS);

  for (const testCase of cases) {
    if (testCase.priority in byPriority) {
      byPriority[testCase.priority] += 1;
    }
    if (testCase.status in byStatus) {
      byStatus[testCase.status] += 1;
    }
    if (testCase.execResult in byExecResult) {
      byExecResult[testCase.execResult] += 1;
    }
  }

  return {
    total: cases.length,
    byPriority,
    byStatus,
    byExecResult,
  };
}
