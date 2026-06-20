import { describe, expect, it } from "vitest";
import { parseAiDrafts } from "./aiDraftParse";

const idFactory = (() => {
  let seq = 0;
  return () => `draft-${(seq += 1)}`;
})();

describe("parseAiDrafts", () => {
  it("解析标准 JSON 数组并补默认来源/状态", () => {
    const raw = JSON.stringify([
      {
        caseId: "TC-LOGIN-001",
        title: "登录成功",
        priority: "P0",
        caseType: "功能",
        precondition: "已注册账号",
        steps: [{ action: "输入账号密码", expected: "按钮可点击" }],
        assertions: ["首页展示用户昵称", "登录态保持"],
        tags: ["冒烟"],
      },
    ]);
    const { drafts, warning } = parseAiDrafts(raw, { moduleId: "m1" });
    expect(warning).toBe("");
    expect(drafts).toHaveLength(1);
    const draft = drafts[0];
    expect(draft.caseId).toBe("TC-LOGIN-001");
    expect(draft.source).toBe("AI生成");
    expect(draft.status).toBe("草稿");
    expect(draft.moduleId).toBe("m1");
    expect(draft.priority).toBe("P0");
    expect(draft.assertions).toEqual(["首页展示用户昵称", "登录态保持"]);
    expect(draft.steps[0].stepNo).toBe(1);
  });

  it("剥离 Markdown 代码块围栏", () => {
    const raw = "```json\n[{\"title\":\"用例A\"}]\n```";
    const { drafts, warning } = parseAiDrafts(raw, { idFactory });
    expect(warning).toBe("");
    expect(drafts[0].title).toBe("用例A");
  });

  it("容忍前后多余说明文本，截取首个 JSON 数组", () => {
    const raw = '好的，这是结果：[{"title":"用例B","assertions":"只展示一条"}] 以上。';
    const { drafts } = parseAiDrafts(raw);
    expect(drafts[0].title).toBe("用例B");
    // 字符串断言被规整为单元素数组
    expect(drafts[0].assertions).toEqual(["只展示一条"]);
  });

  it("支持 {cases:[...]} 包裹结构与字段别名", () => {
    const raw = JSON.stringify({
      cases: [
        {
          name: "改密码",
          level: "P1",
          type: "异常",
          actions: ["打开设置", { operation: "点保存", expectedResult: "提示成功" }],
          expectedResults: ["弹出成功提示"],
        },
      ],
    });
    const { drafts } = parseAiDrafts(raw);
    expect(drafts[0].title).toBe("改密码");
    expect(drafts[0].priority).toBe("P1");
    expect(drafts[0].caseType).toBe("异常");
    expect(drafts[0].steps).toHaveLength(2);
    expect(drafts[0].steps[1].expected).toBe("提示成功");
    expect(drafts[0].assertions).toEqual(["弹出成功提示"]);
  });

  it("缺失 caseId 时生成占位编号，未知枚举回落默认值", () => {
    const raw = JSON.stringify([{ title: "无编号用例", priority: "紧急", type: "未知" }]);
    const { drafts } = parseAiDrafts(raw, { idFactory });
    expect(drafts[0].caseId).toMatch(/^AI-\d{8}-001$/);
    expect(drafts[0].priority).toBe("P2");
    expect(drafts[0].caseType).toBe("功能");
  });

  it("空输入与非 JSON 输入返回可读 warning 且不抛异常", () => {
    expect(parseAiDrafts("")).toEqual({ drafts: [], warning: "模型未返回任何内容" });
    const bad = parseAiDrafts("这不是 JSON");
    expect(bad.drafts).toHaveLength(0);
    expect(bad.warning).toContain("无法解析");
  });

  it("JSON 合法但无用例条目时给出提示", () => {
    const { drafts, warning } = parseAiDrafts("[]");
    expect(drafts).toHaveLength(0);
    expect(warning).toContain("可识别的用例");
  });
});
