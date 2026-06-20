import { describe, expect, it } from "vitest";
import {
  createEmptyFilter,
  type TestCase,
  type TestCaseFilter,
  type TestCaseModule,
} from "../types";
import { computeStats } from "./computeStats";
import { filterCases } from "./filterCases";
import {
  buildModuleTree,
  countCasesByModule,
  groupCasesByModule,
} from "./groupByModule";
import { validateCase } from "./validateCase";

function makeCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: overrides.id ?? "id-1",
    caseId: overrides.caseId ?? "TC-001",
    title: overrides.title ?? "登录成功",
    moduleId: overrides.moduleId ?? "m1",
    priority: overrides.priority ?? "P1",
    caseType: overrides.caseType ?? "功能",
    status: overrides.status ?? "草稿",
    source: overrides.source ?? "手工",
    precondition: overrides.precondition ?? "",
    steps: overrides.steps ?? [
      { stepNo: 1, action: "输入账号密码", expected: "进入首页" },
    ],
    assertions: overrides.assertions ?? ["首页展示用户昵称"],
    tags: overrides.tags ?? ["smoke"],
    execResult: overrides.execResult ?? "未执行",
    remark: overrides.remark ?? "",
    createdAt: overrides.createdAt ?? "2026-06-17T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-17T00:00:00.000Z",
  };
}

function makeModule(overrides: Partial<TestCaseModule> = {}): TestCaseModule {
  return {
    id: overrides.id ?? "m1",
    name: overrides.name ?? "模块",
    parentId: overrides.parentId ?? null,
    orderIndex: overrides.orderIndex ?? 0,
  };
}

describe("filterCases", () => {
  const cases: TestCase[] = [
    makeCase({ id: "a", caseId: "TC-001", title: "登录成功", priority: "P0" }),
    makeCase({
      id: "b",
      caseId: "TC-002",
      title: "登录失败",
      priority: "P2",
      moduleId: "m2",
      status: "已评审",
      tags: ["regression"],
    }),
    makeCase({
      id: "c",
      caseId: "TC-003",
      title: "退出登录",
      priority: "P1",
      execResult: "通过",
    }),
  ];

  it("空筛选返回全部", () => {
    expect(filterCases(cases, createEmptyFilter())).toHaveLength(3);
  });

  it("关键词匹配标题/编号/标签", () => {
    const byTitle = filterCases(cases, {
      ...createEmptyFilter(),
      keyword: "失败",
    });
    expect(byTitle.map((c) => c.id)).toEqual(["b"]);

    const byTag = filterCases(cases, {
      ...createEmptyFilter(),
      keyword: "regression",
    });
    expect(byTag.map((c) => c.id)).toEqual(["b"]);

    const byCaseId = filterCases(cases, {
      ...createEmptyFilter(),
      keyword: "tc-003",
    });
    expect(byCaseId.map((c) => c.id)).toEqual(["c"]);
  });

  it("关键词匹配断言", () => {
    const cases2: TestCase[] = [
      makeCase({ id: "x", assertions: ["弹出支付成功提示"] }),
      makeCase({ id: "y", assertions: ["展示余额不足"] }),
    ];
    const result = filterCases(cases2, {
      ...createEmptyFilter(),
      keyword: "支付成功",
    });
    expect(result.map((c) => c.id)).toEqual(["x"]);
  });

  it("模块与多选维度叠加", () => {
    const filter: TestCaseFilter = {
      ...createEmptyFilter(),
      moduleId: "m1",
      priorities: ["P0", "P1"],
    };
    expect(filterCases(cases, filter).map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("执行结果筛选", () => {
    const filter: TestCaseFilter = {
      ...createEmptyFilter(),
      execResults: ["通过"],
    };
    expect(filterCases(cases, filter).map((c) => c.id)).toEqual(["c"]);
  });
});

describe("computeStats", () => {
  it("按维度计数且零初始化全部枚举", () => {
    const stats = computeStats([
      makeCase({ id: "a", priority: "P0", status: "草稿", execResult: "通过" }),
      makeCase({ id: "b", priority: "P0", status: "已评审", execResult: "未执行" }),
    ]);
    expect(stats.total).toBe(2);
    expect(stats.byPriority.P0).toBe(2);
    expect(stats.byPriority.P3).toBe(0);
    expect(stats.byStatus["草稿"]).toBe(1);
    expect(stats.byStatus["已评审"]).toBe(1);
    expect(stats.byExecResult["通过"]).toBe(1);
    expect(stats.byExecResult["未执行"]).toBe(1);
  });
});

describe("groupByModule", () => {
  it("countCasesByModule 统计直接挂载", () => {
    const counts = countCasesByModule([
      makeCase({ id: "a", moduleId: "m1" }),
      makeCase({ id: "b", moduleId: "m1" }),
      makeCase({ id: "c", moduleId: "" }),
    ]);
    expect(counts.m1).toBe(2);
    expect(counts[""]).toBe(1);
  });

  it("groupCasesByModule 分组", () => {
    const grouped = groupCasesByModule([
      makeCase({ id: "a", moduleId: "m1" }),
      makeCase({ id: "b", moduleId: "m2" }),
    ]);
    expect(grouped.m1.map((c) => c.id)).toEqual(["a"]);
    expect(grouped.m2.map((c) => c.id)).toEqual(["b"]);
  });

  it("buildModuleTree 组装层级并按 orderIndex 排序", () => {
    const modules: TestCaseModule[] = [
      makeModule({ id: "root", name: "根", orderIndex: 0 }),
      makeModule({ id: "child-b", name: "B", parentId: "root", orderIndex: 1 }),
      makeModule({ id: "child-a", name: "A", parentId: "root", orderIndex: 0 }),
    ];
    const tree = buildModuleTree(modules, [
      makeCase({ id: "x", moduleId: "child-a" }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].module.id).toBe("root");
    expect(tree[0].children.map((n) => n.module.id)).toEqual([
      "child-a",
      "child-b",
    ]);
    expect(tree[0].children[0].directCaseCount).toBe(1);
  });
});

describe("validateCase", () => {
  it("通过有效用例", () => {
    expect(validateCase(makeCase(), [])).toEqual([]);
  });

  it("标题与步骤为空时报错", () => {
    const errors = validateCase(
      makeCase({ title: "  ", steps: [{ stepNo: 1, action: "", expected: "" }] }),
      [],
    );
    expect(errors).toContain("用例标题不能为空");
    expect(errors).toContain("至少需要一个有效测试步骤");
  });

  it("caseId 工作区内重复报错，但与自身同 id 不算冲突", () => {
    const existing = [makeCase({ id: "other", caseId: "TC-001" })];
    const conflict = validateCase(makeCase({ id: "self", caseId: "TC-001" }), existing);
    expect(conflict.some((e) => e.includes("已存在"))).toBe(true);

    const selfSave = validateCase(
      makeCase({ id: "other", caseId: "TC-001" }),
      existing,
    );
    expect(selfSave).toEqual([]);
  });
});
