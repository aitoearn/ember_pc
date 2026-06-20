import { describe, expect, it } from "vitest";

import {
  CURRENT_FLOW_FORMAT_VERSION,
  type Locator,
  type TestFlow,
  inferAppPackageFromFlowSteps,
  isFlowFormatCompatible,
  isFlowOp,
  isLocatorDeterministic,
  isLocatorKind,
  isLocatorRequiredOp,
  sortLocatorsByPriority,
  validateFlow,
} from "./flowFormat";

function makeFlow(overrides: Partial<TestFlow> = {}): TestFlow {
  return {
    id: "flow-1",
    workspaceId: "ws-1",
    name: "登录冒烟",
    appPackage: "com.example.app",
    platform: "android",
    formatVersion: CURRENT_FLOW_FORMAT_VERSION,
    source: "vlm_recorded",
    selfHealingEnabled: true,
    steps: [
      { index: 0, op: "launch_app", args: { package: "com.example.app" } },
      {
        index: 1,
        op: "tap",
        locators: [{ kind: "resource_id", value: "btn_login" }],
      },
    ],
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("flowFormat 类型守卫", () => {
  it("isFlowOp 识别合法/非法操作类型", () => {
    expect(isFlowOp("tap")).toBe(true);
    expect(isFlowOp("scroll_until_visible")).toBe(true);
    expect(isFlowOp("fly")).toBe(false);
    expect(isFlowOp(123)).toBe(false);
  });

  it("isLocatorKind 识别合法/非法定位策略", () => {
    expect(isLocatorKind("resource_id")).toBe(true);
    expect(isLocatorKind("vlm_anchor")).toBe(true);
    expect(isLocatorKind("xpath")).toBe(false);
  });

  it("isLocatorDeterministic 仅 vlm_anchor 为非确定性", () => {
    expect(isLocatorDeterministic("resource_id")).toBe(true);
    expect(isLocatorDeterministic("ui_tree_path")).toBe(true);
    expect(isLocatorDeterministic("vlm_anchor")).toBe(false);
  });

  it("isLocatorRequiredOp 区分需要定位的操作", () => {
    expect(isLocatorRequiredOp("tap")).toBe(true);
    expect(isLocatorRequiredOp("input_text")).toBe(true);
    expect(isLocatorRequiredOp("launch_app")).toBe(false);
    expect(isLocatorRequiredOp("back")).toBe(false);
    expect(isLocatorRequiredOp("wait")).toBe(false);
  });
});

describe("isFlowFormatCompatible", () => {
  it("接受 1..当前版本，拒绝更高或非法版本", () => {
    expect(isFlowFormatCompatible(1)).toBe(true);
    expect(isFlowFormatCompatible(CURRENT_FLOW_FORMAT_VERSION)).toBe(true);
    expect(isFlowFormatCompatible(CURRENT_FLOW_FORMAT_VERSION + 1)).toBe(false);
    expect(isFlowFormatCompatible(0)).toBe(false);
    expect(isFlowFormatCompatible(1.5)).toBe(false);
  });
});

describe("sortLocatorsByPriority", () => {
  it("按 selector → ui_tree_path → vlm_anchor 排序且稳定", () => {
    const input: Locator[] = [
      { kind: "vlm_anchor", value: "登录按钮", vlmAnchor: { xNorm: 500, yNorm: 900 } },
      { kind: "ui_tree_path", value: "/root/btn" },
      { kind: "text", value: "登录" },
      { kind: "resource_id", value: "btn_login" },
    ];
    const sorted = sortLocatorsByPriority(input);
    expect(sorted.map((l) => l.kind)).toEqual([
      "resource_id",
      "text",
      "ui_tree_path",
      "vlm_anchor",
    ]);
    // 不改原数组
    expect(input[0].kind).toBe("vlm_anchor");
  });
});

describe("inferAppPackageFromFlowSteps", () => {
  it("优先从 launch_app 步骤读取 package", () => {
    const pkg = inferAppPackageFromFlowSteps([
      { index: 0, op: "tap", locators: [{ kind: "text", value: "Wi-Fi" }] },
      {
        index: 1,
        op: "launch_app",
        args: { package: "com.android.settings" },
      },
    ]);
    expect(pkg).toBe("com.android.settings");
  });

  it("无 launch_app 时回退到任意步骤 args.package", () => {
    const pkg = inferAppPackageFromFlowSteps([
      {
        index: 0,
        op: "tap",
        args: { package: "com.example.app" },
      },
    ]);
    expect(pkg).toBe("com.example.app");
  });
});

describe("validateFlow", () => {
  it("合法流校验通过", () => {
    expect(validateFlow(makeFlow()).ok).toBe(true);
  });

  it("名称与包名为空时报错", () => {
    const result = validateFlow(makeFlow({ name: "  ", appPackage: "" }));
    expect(result.ok).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("flow.name.empty");
    expect(codes).toContain("flow.appPackage.empty");
  });

  it("不兼容格式版本报错", () => {
    const result = validateFlow(
      makeFlow({ formatVersion: CURRENT_FLOW_FORMAT_VERSION + 1 }),
    );
    expect(result.issues.map((i) => i.code)).toContain(
      "flow.formatVersion.incompatible",
    );
  });

  it("步骤序号非连续报错", () => {
    const result = validateFlow(
      makeFlow({
        steps: [
          { index: 0, op: "back" },
          { index: 5, op: "back" },
        ],
      }),
    );
    expect(result.issues.map((i) => i.code)).toContain("step.index.nonSequential");
  });

  it("需要定位的操作缺少 locators 报错", () => {
    const result = validateFlow(
      makeFlow({ steps: [{ index: 0, op: "tap", locators: [] }] }),
    );
    expect(result.issues.map((i) => i.code)).toContain("step.locators.missing");
  });

  it("确定性定位排在 vlm_anchor 之后报错", () => {
    const result = validateFlow(
      makeFlow({
        steps: [
          {
            index: 0,
            op: "tap",
            locators: [
              { kind: "vlm_anchor", value: "按钮", vlmAnchor: { xNorm: 1, yNorm: 1 } },
              { kind: "resource_id", value: "btn" },
            ],
          },
        ],
      }),
    );
    expect(result.issues.map((i) => i.code)).toContain("step.locators.priorityOrder");
  });

  it("vlm_anchor 缺少坐标、确定性定位 value 为空分别报错", () => {
    const result = validateFlow(
      makeFlow({
        steps: [
          {
            index: 0,
            op: "tap",
            locators: [
              { kind: "resource_id", value: "  " },
              { kind: "vlm_anchor", value: "按钮" },
            ],
          },
        ],
      }),
    );
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("locator.value.empty");
    expect(codes).toContain("locator.vlmAnchor.missing");
  });

  it("空步骤草稿流不报错", () => {
    expect(validateFlow(makeFlow({ steps: [] })).ok).toBe(true);
  });
});
