import { describe, expect, it } from "vitest";
import { runExploreRuleChecks } from "./exploreRuleEngine";
import type { ExploreRule } from "./types";

const SAMPLE_XML = `
<hierarchy>
  <node resource-id="com.demo:id/login" text="登录" bounds="[0,0][100,100]" />
</hierarchy>
`;

describe("runExploreRuleChecks", () => {
  it("invariant 失败时返回 fail", () => {
    const rules: ExploreRule[] = [
      {
        id: "r1",
        name: "must_have_login",
        kind: "invariant",
        enabled: true,
        assertion: {
          locatorKind: "text",
          value: "不存在文案",
          match: "contains",
          present: true,
        },
      },
    ];
    const results = runExploreRuleChecks(SAMPLE_XML, rules, 3);
    expect(results[0].state).toBe("fail");
  });

  it("property 前置不满足时跳过", () => {
    const rules: ExploreRule[] = [
      {
        id: "r2",
        name: "only_on_settings",
        kind: "property",
        enabled: true,
        precondition: {
          locatorKind: "text",
          value: "设置",
          match: "contains",
          present: true,
        },
        assertion: {
          locatorKind: "text",
          value: "登录",
          match: "contains",
          present: true,
        },
      },
    ];
    expect(runExploreRuleChecks(SAMPLE_XML, rules, 1)).toHaveLength(0);
  });

  it("property 前置满足时执行断言", () => {
    const rules: ExploreRule[] = [
      {
        id: "r3",
        name: "login_visible",
        kind: "property",
        enabled: true,
        precondition: {
          locatorKind: "text",
          value: "登录",
          match: "contains",
          present: true,
        },
        assertion: {
          locatorKind: "resource_id",
          value: "com.demo:id/login",
          match: "contains",
          present: true,
        },
      },
    ];
    const results = runExploreRuleChecks(SAMPLE_XML, rules, 2);
    expect(results).toHaveLength(1);
    expect(results[0].state).toBe("pass");
  });
});
