/**
 * 测试用例管理 API
 *
 * 经 App Server JSON-RPC（testCase/* 与 testCaseModule/*）完成用例与模块的
 * 列表 / 读取 / upsert / 删除。调用风格对齐 `src/lib/api/project.ts`：
 * 复用 `AppServerClient.request` 泛型方法 + 协议包 METHOD 常量。
 */

import { AppServerClient } from "@/lib/api/appServer";
import {
  METHOD_TEST_CASE_DELETE,
  METHOD_TEST_CASE_LIST,
  METHOD_TEST_CASE_MODULE_DELETE,
  METHOD_TEST_CASE_MODULE_LIST,
  METHOD_TEST_CASE_MODULE_SAVE,
  METHOD_TEST_CASE_READ,
  METHOD_TEST_CASE_RUN_LIST,
  METHOD_TEST_CASE_RUN_SAVE,
  METHOD_TEST_CASE_SAVE,
} from "../../../packages/app-server-client/src/protocol";
import type { TestCase, TestCaseModule, TestCaseRun } from "./types";

type TestCaseAppServerClient = Pick<AppServerClient, "request">;

type TestCaseListResponse = { cases?: TestCase[] | null };
type TestCaseReadResponse = { case?: TestCase | null };
type TestCaseSaveResponse = { case: TestCase };
type TestCaseDeleteResponse = { deleted?: number | null };
type TestCaseModuleListResponse = { modules?: TestCaseModule[] | null };
type TestCaseModuleSaveResponse = { module: TestCaseModule };
type TestCaseModuleDeleteResponse = { deleted?: boolean | null };
type TestCaseRunSaveResponse = { run: TestCaseRun };
type TestCaseRunListResponse = { runs?: TestCaseRun[] | null };

async function requestTestCaseAppServer<T>(
  method: string,
  params: unknown,
  client: TestCaseAppServerClient = new AppServerClient(),
): Promise<T> {
  const response = await client.request<T>(method, params);
  return response.result;
}

/** 列出工作区用例（可选叠加模块粗过滤）。 */
export async function listTestCases(
  workspaceId: string,
  moduleId?: string,
  client?: TestCaseAppServerClient,
): Promise<TestCase[]> {
  const response = await requestTestCaseAppServer<TestCaseListResponse>(
    METHOD_TEST_CASE_LIST,
    moduleId ? { workspaceId, moduleId } : { workspaceId },
    client,
  );
  return response.cases ?? [];
}

/** 按内部 id 读取单条用例。 */
export async function readTestCase(
  id: string,
  client?: TestCaseAppServerClient,
): Promise<TestCase | null> {
  const response = await requestTestCaseAppServer<TestCaseReadResponse>(
    METHOD_TEST_CASE_READ,
    { id },
    client,
  );
  return response.case ?? null;
}

/** upsert 一条用例（caseId 冲突由后端拒绝）。 */
export async function saveTestCase(
  workspaceId: string,
  testCase: TestCase,
  client?: TestCaseAppServerClient,
): Promise<TestCase> {
  const response = await requestTestCaseAppServer<TestCaseSaveResponse>(
    METHOD_TEST_CASE_SAVE,
    { workspaceId, case: testCase },
    client,
  );
  return response.case;
}

/** 批量删除用例，返回实际删除条数。 */
export async function deleteTestCases(
  ids: string[],
  client?: TestCaseAppServerClient,
): Promise<number> {
  const response = await requestTestCaseAppServer<TestCaseDeleteResponse>(
    METHOD_TEST_CASE_DELETE,
    { ids },
    client,
  );
  return response.deleted ?? 0;
}

/** 列出工作区的全部测试模块。 */
export async function listTestCaseModules(
  workspaceId: string,
  client?: TestCaseAppServerClient,
): Promise<TestCaseModule[]> {
  const response =
    await requestTestCaseAppServer<TestCaseModuleListResponse>(
      METHOD_TEST_CASE_MODULE_LIST,
      { workspaceId },
      client,
    );
  return response.modules ?? [];
}

/** upsert 一个测试模块。 */
export async function saveTestCaseModule(
  workspaceId: string,
  module: TestCaseModule,
  client?: TestCaseAppServerClient,
): Promise<TestCaseModule> {
  const response =
    await requestTestCaseAppServer<TestCaseModuleSaveResponse>(
      METHOD_TEST_CASE_MODULE_SAVE,
      { workspaceId, module },
      client,
    );
  return response.module;
}

/** 删除模块（仅空模块可删，后端校验）。 */
export async function deleteTestCaseModule(
  workspaceId: string,
  id: string,
  client?: TestCaseAppServerClient,
): Promise<boolean> {
  const response =
    await requestTestCaseAppServer<TestCaseModuleDeleteResponse>(
      METHOD_TEST_CASE_MODULE_DELETE,
      { workspaceId, id },
      client,
    );
  return response.deleted ?? false;
}

/** 落库一次执行记录（含逐步观察），返回后端回写后的完整 run。 */
export async function saveTestCaseRun(
  workspaceId: string,
  run: TestCaseRun,
  client?: TestCaseAppServerClient,
): Promise<TestCaseRun> {
  const response = await requestTestCaseAppServer<TestCaseRunSaveResponse>(
    METHOD_TEST_CASE_RUN_SAVE,
    { workspaceId, run },
    client,
  );
  return response.run;
}

/** 按用例内部 id 列出历史执行记录（后端按开始时间倒序）。 */
export async function listTestCaseRuns(
  workspaceId: string,
  caseId: string,
  client?: TestCaseAppServerClient,
): Promise<TestCaseRun[]> {
  const response = await requestTestCaseAppServer<TestCaseRunListResponse>(
    METHOD_TEST_CASE_RUN_LIST,
    { workspaceId, caseId },
    client,
  );
  return response.runs ?? [];
}
