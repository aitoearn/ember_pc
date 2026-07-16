import { autoGlmSidecar } from "./autoGlmSidecar";

export type AutoGlmTaskSession = {
  id: string;
  kind: string;
  mode: string;
  device_id: string;
  device_serial: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AutoGlmTaskRun = {
  id: string;
  status: string;
  input_text: string;
  final_message?: string | null;
  error_message?: string | null;
  step_count: number;
};

export type AutoGlmTaskEvent = {
  task_id: string;
  seq: number;
  event_type: string;
  role: string;
  payload: Record<string, unknown>;
  created_at: string;
};

function appendQuery(path: string, query: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function getAutoGlmSidecarStatus() {
  return await autoGlmSidecar.ensure();
}

export async function createAutoGlmTaskSession(params: {
  deviceId: string;
  deviceSerial: string;
  mode?: "classic" | "layered";
}): Promise<AutoGlmTaskSession> {
  const response = (await autoGlmSidecar.fetchApi("/api/task-sessions", {
    method: "POST",
    body: {
      device_id: params.deviceId,
      device_serial: params.deviceSerial,
      mode: params.mode ?? "classic",
    },
  })) as AutoGlmTaskSession;
  return response;
}

export async function submitAutoGlmTaskSessionTask(params: {
  sessionId: string;
  message: string;
}): Promise<AutoGlmTaskRun> {
  const response = (await autoGlmSidecar.fetchApi(
    `/api/task-sessions/${encodeURIComponent(params.sessionId)}/tasks`,
    {
      method: "POST",
      body: { message: params.message, attachments: [] },
    },
  )) as AutoGlmTaskRun;
  return response;
}

export async function getAutoGlmTask(taskId: string): Promise<AutoGlmTaskRun> {
  return (await autoGlmSidecar.fetchApi(
    `/api/tasks/${encodeURIComponent(taskId)}`,
  )) as AutoGlmTaskRun;
}

export async function listAutoGlmTaskEvents(params: {
  taskId: string;
  afterSeq?: number;
}): Promise<AutoGlmTaskEvent[]> {
  const path = appendQuery(
    `/api/tasks/${encodeURIComponent(params.taskId)}/events`,
    { after_seq: params.afterSeq ?? 0 },
  );
  const response = (await autoGlmSidecar.fetchApi(path)) as {
    events?: AutoGlmTaskEvent[];
  };
  return Array.isArray(response.events) ? response.events : [];
}

export async function cancelAutoGlmTask(taskId: string): Promise<AutoGlmTaskRun> {
  const response = (await autoGlmSidecar.fetchApi(
    `/api/tasks/${encodeURIComponent(taskId)}/cancel`,
    { method: "POST", body: {} },
  )) as { task?: AutoGlmTaskRun };
  if (!response.task) {
    throw new Error("取消 AI 任务失败");
  }
  return response.task;
}

