/**
 * 用例保存前校验纯函数。
 *
 * 返回错误消息数组（空数组表示通过）。caseId 工作区内唯一为前端预校验，
 * 与后端唯一索引（FR-002a）形成双保险。
 */

import type { TestCase } from "../types";

/** 校验单条用例是否可保存。`existingCases` 为同工作区现有用例（含自身）。 */
export function validateCase(
  testCase: TestCase,
  existingCases: readonly TestCase[],
): string[] {
  const errors: string[] = [];

  const title = testCase.title.trim();
  if (!title) {
    errors.push("用例标题不能为空");
  }

  const caseId = testCase.caseId.trim();
  if (!caseId) {
    errors.push("用例编号不能为空");
  } else {
    const duplicated = existingCases.some(
      (other) => other.id !== testCase.id && other.caseId.trim() === caseId,
    );
    if (duplicated) {
      errors.push(`用例编号 ${caseId} 在当前工作区已存在`);
    }
  }

  const hasStep = testCase.steps.some(
    (step) => step.action.trim() !== "" || step.expected.trim() !== "",
  );
  if (!hasStep) {
    errors.push("至少需要一个有效测试步骤");
  }

  return errors;
}
