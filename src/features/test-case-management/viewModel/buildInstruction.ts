/**
 * 用例 → 自然语言执行指令（US3，research R6 软断言）。
 *
 * 把结构化用例（前置条件 + 操作步骤 + 断言）拼装成一段自然语言指令，交设备 VLM
 * ReAct 智能体执行。断言以「通过条件」呈现，作为执行末尾独立判定的依据（步骤描述
 * 「怎么操作」，断言描述「最终应满足的可验证结论」）。纯函数，由单测覆盖。
 */

import type { TestCase } from "../types";

function cleanLines(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

/**
 * 拼装用例执行指令。无步骤且无断言时仍返回标题段，保证指令非空。
 */
export function buildInstruction(testCase: TestCase): string {
  const blocks: string[] = [];

  const title = testCase.title.trim();
  blocks.push(
    title ? `请在当前设备上完成测试用例「${title}」。` : "请在当前设备上完成以下测试用例。",
  );

  const precondition = testCase.precondition.trim();
  if (precondition) {
    blocks.push(`前置条件：\n${precondition}`);
  }

  const steps = testCase.steps
    .map((step) => step.action.trim())
    .filter((action) => action.length > 0);
  if (steps.length > 0) {
    const numbered = steps.map((action, index) => `${index + 1}. ${action}`).join("\n");
    blocks.push(`操作步骤：\n${numbered}`);
  }

  const assertions = cleanLines(testCase.assertions);
  if (assertions.length > 0) {
    const numbered = assertions
      .map((assertion, index) => `${index + 1}. ${assertion}`)
      .join("\n");
    blocks.push(
      `通过条件（请在执行结束后逐条判定是否满足，全部满足才算通过）：\n${numbered}`,
    );
  }

  blocks.push(
    "完成后请明确给出判定结论：通过 / 失败 / 阻塞，并简要说明依据；无法继续操作时判定为「阻塞」。",
  );

  return blocks.join("\n\n");
}
