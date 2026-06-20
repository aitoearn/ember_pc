import { describe, expect, it, vi } from "vitest";
import type { AppServerClient } from "@/lib/api/appServer";
import {
  deleteTestCaseModule,
  deleteTestCases,
  listTestCaseModules,
  listTestCaseRuns,
  listTestCases,
  readTestCase,
  saveTestCase,
  saveTestCaseModule,
  saveTestCaseRun,
} from "./api";
import type { TestCase, TestCaseModule, TestCaseRun } from "./types";

type TestClient = Pick<AppServerClient, "request">;

function makeClient(result: unknown) {
  const request = vi.fn(async () => ({ result }));
  const client = { request } as unknown as TestClient;
  return { client, request };
}

const sampleCase: TestCase = {
  id: "id-1",
  caseId: "TC-001",
  title: "登录成功",
  moduleId: "m1",
  priority: "P1",
  caseType: "功能",
  status: "草稿",
  source: "手工",
  precondition: "",
  steps: [{ stepNo: 1, action: "点击登录", expected: "进入首页" }],
  assertions: ["首页展示用户昵称"],
  tags: [],
  execResult: "未执行",
  remark: "",
  createdAt: "2026-06-17T00:00:00.000Z",
  updatedAt: "2026-06-17T00:00:00.000Z",
};

const sampleModule: TestCaseModule = {
  id: "m1",
  name: "登录",
  parentId: null,
  orderIndex: 0,
};

const sampleRun: TestCaseRun = {
  id: "run-1",
  caseId: "id-1",
  deviceId: "dev-1",
  instruction: "执行登录",
  result: "通过",
  summary: "全部断言通过",
  startedAt: "2026-06-17T00:00:00.000Z",
  finishedAt: "2026-06-17T00:01:00.000Z",
  steps: [],
};

describe("test-case-management api", () => {
  it("listTestCases 使用 testCase/list 并传 workspaceId", async () => {
    const { client, request } = makeClient({ cases: [sampleCase] });
    const cases = await listTestCases("ws-1", undefined, client);
    expect(request).toHaveBeenCalledWith("testCase/list", { workspaceId: "ws-1" });
    expect(cases).toEqual([sampleCase]);
  });

  it("listTestCases 带 moduleId 时透传", async () => {
    const { client, request } = makeClient({ cases: [] });
    await listTestCases("ws-1", "m1", client);
    expect(request).toHaveBeenCalledWith("testCase/list", {
      workspaceId: "ws-1",
      moduleId: "m1",
    });
  });

  it("readTestCase 使用 testCase/read 并在空返回时给 null", async () => {
    const { client, request } = makeClient({ case: null });
    const result = await readTestCase("id-x", client);
    expect(request).toHaveBeenCalledWith("testCase/read", { id: "id-x" });
    expect(result).toBeNull();
  });

  it("saveTestCase 使用 testCase/save 并包装 case", async () => {
    const { client, request } = makeClient({ case: sampleCase });
    const saved = await saveTestCase("ws-1", sampleCase, client);
    expect(request).toHaveBeenCalledWith("testCase/save", {
      workspaceId: "ws-1",
      case: sampleCase,
    });
    expect(saved).toEqual(sampleCase);
  });

  it("deleteTestCases 使用 testCase/delete 返回删除条数", async () => {
    const { client, request } = makeClient({ deleted: 2 });
    const deleted = await deleteTestCases(["a", "b"], client);
    expect(request).toHaveBeenCalledWith("testCase/delete", { ids: ["a", "b"] });
    expect(deleted).toBe(2);
  });

  it("listTestCaseModules 使用 testCaseModule/list", async () => {
    const { client, request } = makeClient({ modules: [sampleModule] });
    const modules = await listTestCaseModules("ws-1", client);
    expect(request).toHaveBeenCalledWith("testCaseModule/list", {
      workspaceId: "ws-1",
    });
    expect(modules).toEqual([sampleModule]);
  });

  it("saveTestCaseModule 使用 testCaseModule/save", async () => {
    const { client, request } = makeClient({ module: sampleModule });
    const saved = await saveTestCaseModule("ws-1", sampleModule, client);
    expect(request).toHaveBeenCalledWith("testCaseModule/save", {
      workspaceId: "ws-1",
      module: sampleModule,
    });
    expect(saved).toEqual(sampleModule);
  });

  it("deleteTestCaseModule 使用 testCaseModule/delete 并传 workspaceId", async () => {
    const { client, request } = makeClient({ deleted: true });
    const deleted = await deleteTestCaseModule("ws-1", "m1", client);
    expect(request).toHaveBeenCalledWith("testCaseModule/delete", {
      workspaceId: "ws-1",
      id: "m1",
    });
    expect(deleted).toBe(true);
  });

  it("saveTestCaseRun 使用 testCaseRun/save 并包装 run", async () => {
    const { client, request } = makeClient({ run: sampleRun });
    const saved = await saveTestCaseRun("ws-1", sampleRun, client);
    expect(request).toHaveBeenCalledWith("testCaseRun/save", {
      workspaceId: "ws-1",
      run: sampleRun,
    });
    expect(saved).toEqual(sampleRun);
  });

  it("listTestCaseRuns 使用 testCaseRun/list 并传 caseId", async () => {
    const { client, request } = makeClient({ runs: [sampleRun] });
    const runs = await listTestCaseRuns("ws-1", "id-1", client);
    expect(request).toHaveBeenCalledWith("testCaseRun/list", {
      workspaceId: "ws-1",
      caseId: "id-1",
    });
    expect(runs).toEqual([sampleRun]);
  });
});
