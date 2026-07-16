import { describe, expect, it } from "vitest";
import { buildInstruction } from "./buildInstruction";
import type { TestCase } from "../types";

function makeCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: "id-1",
    caseId: "TC-001",
    title: "登录成功",
    moduleId: "",
    priority: "P1",
    caseType: "功能",
    status: "草稿",
    source: "手工",
    precondition: "已安装应用并停留在登录页",
    steps: [
      { stepNo: 1, action: "输入账号密码", expected: "按钮可点击" },
      { stepNo: 2, action: "点击登录", expected: "进入首页" },
    ],
    assertions: ["首页展示用户昵称", "登录态保持"],
    tags: [],
    execResult: "未执行",
    remark: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("buildInstruction", () => {
  it("包含标题、前置条件、编号步骤与通过条件", () => {
    const text = buildInstruction(makeCase());
    expect(text).toContain("「登录成功」");
    expect(text).toContain("前置条件：");
    expect(text).toContain("已安装应用并停留在登录页");
    expect(text).toContain("1. 输入账号密码");
    expect(text).toContain("2. 点击登录");
    expect(text).toContain("通过条件");
    expect(text).toContain("1. 首页展示用户昵称");
    expect(text).toContain("2. 登录态保持");
    expect(text).toContain("通过 / 失败 / 阻塞");
  });

  it("无前置条件/无断言时跳过对应段落但仍非空", () => {
    const text = buildInstruction(
      makeCase({ precondition: "  ", assertions: [], steps: [{ stepNo: 1, action: "打开应用", expected: "" }] }),
    );
    expect(text).not.toContain("前置条件：");
    expect(text).not.toContain("通过条件");
    expect(text).toContain("1. 打开应用");
    expect(text.length).toBeGreaterThan(0);
  });

  it("过滤空白步骤与空白断言", () => {
    const text = buildInstruction(
      makeCase({
        steps: [
          { stepNo: 1, action: "  ", expected: "" },
          { stepNo: 2, action: "点我", expected: "" },
        ],
        assertions: ["  ", "唯一断言"],
      }),
    );
    expect(text).toContain("1. 点我");
    expect(text).not.toContain("2. 点我");
    expect(text).toContain("1. 唯一断言");
    expect(text).not.toContain("2. 唯一断言");
  });

  it("空标题回落为通用措辞", () => {
    const text = buildInstruction(makeCase({ title: "   " }));
    expect(text).toContain("请在当前设备上完成以下测试用例");
  });
});
