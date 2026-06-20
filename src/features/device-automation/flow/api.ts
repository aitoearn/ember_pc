/**
 * 确定性可复现测试流与自愈回放 API
 *
 * 经 App Server JSON-RPC（deviceFlow/* / deviceFlowRun/* / deviceFlowHealing/*）
 * 完成流 CRUD、回放记录读写、自愈修订列举与处置。调用风格对齐
 * `src/features/test-case-management/api.ts`：复用 `AppServerClient.request`
 * 泛型方法 + 协议包 METHOD 常量。
 */

import { AppServerClient } from "@/lib/api/appServer";
import {
  METHOD_DEVICE_FLOW_DELETE,
  METHOD_DEVICE_FLOW_HEALING_LIST,
  METHOD_DEVICE_FLOW_HEALING_RESOLVE,
  METHOD_DEVICE_FLOW_HEALING_SAVE,
  METHOD_DEVICE_FLOW_LIST,
  METHOD_DEVICE_FLOW_READ,
  METHOD_DEVICE_FLOW_RUN_LIST,
  METHOD_DEVICE_FLOW_RUN_READ,
  METHOD_DEVICE_FLOW_RUN_SAVE,
  METHOD_DEVICE_FLOW_SAVE,
} from "../../../../packages/app-server-client/src/protocol";
import type {
  HealingRevision,
  HealingStatus,
  TestFlow,
  FlowRun,
  FlowRunStep,
} from "./domain/flowFormat";

type FlowAppServerClient = Pick<AppServerClient, "request">;

type DeviceFlowListResponse = { flows?: TestFlow[] | null };
type DeviceFlowReadResponse = { flow?: TestFlow | null };
type DeviceFlowSaveResponse = { flow: TestFlow };
type DeviceFlowDeleteResponse = { deleted?: number | null };
type DeviceFlowRunSaveResponse = { runId: string };
type DeviceFlowRunListResponse = { runs?: FlowRun[] | null };
type DeviceFlowRunReadResponse = {
  run?: FlowRun | null;
  steps?: FlowRunStep[] | null;
};
type DeviceFlowHealingListResponse = { revisions?: HealingRevision[] | null };
type DeviceFlowHealingSaveResponse = { id: string };
type DeviceFlowHealingResolveResponse = {
  revision: HealingRevision;
  flow?: TestFlow | null;
};

/** 自愈处置动作：接受为预期变更 / 标记为被测缺陷。 */
export type HealingResolution = "accepted" | "flagged_defect";

async function requestFlowAppServer<T>(
  method: string,
  params: unknown,
  client: FlowAppServerClient = new AppServerClient(),
): Promise<T> {
  const response = await client.request<T>(method, params);
  return response.result;
}

/** 列出工作区下全部测试流。 */
export async function listDeviceFlows(
  workspaceId: string,
  client?: FlowAppServerClient,
): Promise<TestFlow[]> {
  const response = await requestFlowAppServer<DeviceFlowListResponse>(
    METHOD_DEVICE_FLOW_LIST,
    { workspaceId },
    client,
  );
  return response.flows ?? [];
}

/** 按内部 id 读取单条流。 */
export async function readDeviceFlow(
  id: string,
  client?: FlowAppServerClient,
): Promise<TestFlow | null> {
  const response = await requestFlowAppServer<DeviceFlowReadResponse>(
    METHOD_DEVICE_FLOW_READ,
    { id },
    client,
  );
  return response.flow ?? null;
}

/** upsert 一条流（后端回填 id 与时间戳）。 */
export async function saveDeviceFlow(
  flow: TestFlow,
  client?: FlowAppServerClient,
): Promise<TestFlow> {
  const response = await requestFlowAppServer<DeviceFlowSaveResponse>(
    METHOD_DEVICE_FLOW_SAVE,
    { flow },
    client,
  );
  return response.flow;
}

/** 批量删除流（级联删除其回放与自愈修订），返回实际删除条数。 */
export async function deleteDeviceFlows(
  ids: string[],
  client?: FlowAppServerClient,
): Promise<number> {
  const response = await requestFlowAppServer<DeviceFlowDeleteResponse>(
    METHOD_DEVICE_FLOW_DELETE,
    { ids },
    client,
  );
  return response.deleted ?? 0;
}

/** 落库一次回放记录（含逐步留痕），返回后端回写的 runId。 */
export async function saveDeviceFlowRun(
  run: FlowRun,
  steps: FlowRunStep[],
  client?: FlowAppServerClient,
): Promise<string> {
  const response = await requestFlowAppServer<DeviceFlowRunSaveResponse>(
    METHOD_DEVICE_FLOW_RUN_SAVE,
    { run, steps },
    client,
  );
  return response.runId;
}

/** 按流内部 id 列出历史回放记录（后端按开始时间倒序，可分页）。 */
export async function listDeviceFlowRuns(
  flowId: string,
  options?: { limit?: number; offset?: number },
  client?: FlowAppServerClient,
): Promise<FlowRun[]> {
  const response = await requestFlowAppServer<DeviceFlowRunListResponse>(
    METHOD_DEVICE_FLOW_RUN_LIST,
    { flowId, ...options },
    client,
  );
  return response.runs ?? [];
}

/** 读取单次回放及其逐步留痕。 */
export async function readDeviceFlowRun(
  runId: string,
  client?: FlowAppServerClient,
): Promise<{ run: FlowRun | null; steps: FlowRunStep[] }> {
  const response = await requestFlowAppServer<DeviceFlowRunReadResponse>(
    METHOD_DEVICE_FLOW_RUN_READ,
    { runId },
    client,
  );
  return { run: response.run ?? null, steps: response.steps ?? [] };
}

/** 列出某流的自愈修订（可按状态过滤）。 */
export async function listDeviceFlowHealing(
  flowId: string,
  status?: HealingStatus,
  client?: FlowAppServerClient,
): Promise<HealingRevision[]> {
  const response =
    await requestFlowAppServer<DeviceFlowHealingListResponse>(
      METHOD_DEVICE_FLOW_HEALING_LIST,
      status ? { flowId, status } : { flowId },
      client,
    );
  return response.revisions ?? [];
}

/** 保存一条待确认自愈修订，返回后端回写的 id。 */
export async function saveDeviceFlowHealing(
  revision: HealingRevision,
  client?: FlowAppServerClient,
): Promise<string> {
  const response = await requestFlowAppServer<DeviceFlowHealingSaveResponse>(
    METHOD_DEVICE_FLOW_HEALING_SAVE,
    { revision },
    client,
  );
  return response.id;
}

/**
 * 处置自愈修订：accepted 并入定位并回传更新后的流；
 * flagged_defect 保留原流、不回传新流。
 */
export async function resolveDeviceFlowHealing(
  id: string,
  resolution: HealingResolution,
  client?: FlowAppServerClient,
): Promise<{ revision: HealingRevision; flow: TestFlow | null }> {
  const response =
    await requestFlowAppServer<DeviceFlowHealingResolveResponse>(
      METHOD_DEVICE_FLOW_HEALING_RESOLVE,
      { id, resolution },
      client,
    );
  return { revision: response.revision, flow: response.flow ?? null };
}
