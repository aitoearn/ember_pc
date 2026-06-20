/**
 * 探索压测工作区 API（deviceExplore/*、deviceExploreRun/*）。
 * 调用风格对齐 `src/features/device-automation/flow/api.ts`。
 */

import { AppServerClient } from "@/lib/api/appServer";
import type {
  DeviceExploreProfile,
  ExploreConfig,
  ExploreRule,
  ExploreRun,
} from "@/features/device-automation/explore/types";
import { EMPTY_EXPLORE_CONFIG } from "@/features/device-automation/explore/types";
import {
  METHOD_DEVICE_EXPLORE_READ,
  METHOD_DEVICE_EXPLORE_SAVE,
  METHOD_DEVICE_EXPLORE_RUN_LIST,
  METHOD_DEVICE_EXPLORE_RUN_READ,
  METHOD_DEVICE_EXPLORE_RUN_SAVE,
} from "../../../packages/app-server-client/src/protocol";

type ExploreAppServerClient = Pick<AppServerClient, "request">;

type DeviceExploreReadResponse = {
  profile?: {
    workspaceId: string;
    rules: ExploreRule[];
    config: ExploreConfig;
    updatedAt: string;
  } | null;
};

type DeviceExploreSaveResponse = {
  profile: DeviceExploreProfile;
};

type DeviceExploreRunSaveResponse = {
  runId: string;
};

type DeviceExploreRunListResponse = {
  runs?: ExploreRun[] | null;
};

type DeviceExploreRunReadResponse = {
  run?: ExploreRun | null;
};

async function requestExploreAppServer<T>(
  method: string,
  params: unknown,
  client: ExploreAppServerClient = new AppServerClient(),
): Promise<T> {
  const response = await client.request<T>(method, params);
  return response.result;
}

export async function readDeviceExploreProfile(
  workspaceId: string,
  client?: ExploreAppServerClient,
): Promise<DeviceExploreProfile | null> {
  const response = await requestExploreAppServer<DeviceExploreReadResponse>(
    METHOD_DEVICE_EXPLORE_READ,
    { workspaceId },
    client,
  );
  const profile = response.profile;
  if (!profile) {
    return null;
  }
  return {
    workspaceId: profile.workspaceId,
    rules: profile.rules ?? [],
    config: profile.config ?? EMPTY_EXPLORE_CONFIG,
    updatedAt: profile.updatedAt,
  };
}

export async function saveDeviceExploreProfile(
  profile: DeviceExploreProfile,
  client?: ExploreAppServerClient,
): Promise<DeviceExploreProfile> {
  const response = await requestExploreAppServer<DeviceExploreSaveResponse>(
    METHOD_DEVICE_EXPLORE_SAVE,
    {
      profile: {
        workspaceId: profile.workspaceId,
        rules: profile.rules,
        config: profile.config,
        updatedAt: profile.updatedAt,
      },
    },
    client,
  );
  return response.profile;
}

export async function saveDeviceExploreRun(
  run: ExploreRun,
  client?: ExploreAppServerClient,
): Promise<string> {
  const response = await requestExploreAppServer<DeviceExploreRunSaveResponse>(
    METHOD_DEVICE_EXPLORE_RUN_SAVE,
    { run },
    client,
  );
  return response.runId;
}

export async function listDeviceExploreRuns(
  workspaceId: string,
  options?: { limit?: number; offset?: number },
  client?: ExploreAppServerClient,
): Promise<ExploreRun[]> {
  const response = await requestExploreAppServer<DeviceExploreRunListResponse>(
    METHOD_DEVICE_EXPLORE_RUN_LIST,
    {
      workspaceId,
      limit: options?.limit,
      offset: options?.offset,
    },
    client,
  );
  return response.runs ?? [];
}

export async function readDeviceExploreRun(
  runId: string,
  client?: ExploreAppServerClient,
): Promise<ExploreRun | null> {
  const response = await requestExploreAppServer<DeviceExploreRunReadResponse>(
    METHOD_DEVICE_EXPLORE_RUN_READ,
    { runId },
    client,
  );
  return response.run ?? null;
}
