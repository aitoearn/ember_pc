/**
 * @file UI Agent API 模块
 * @description 封装 UI Agent（自然语言驱动手机执行）的 Desktop Host 命令与事件桥。
 *
 * 数据链路：渲染层只传 providerId + model；Host 解析 baseUrl/apiKey 注入 sidecar；
 * sidecar 的步骤事件经 `uiAgent:event:<taskId>` 事件桥回传，与 scrcpy 投屏链路并行。
 */

import { safeInvoke, safeListen } from "@/lib/dev-bridge";
import {
  type UiAgentEvent,
  uiAgentEventChannel,
} from "@/features/device-automation/events";

export interface StartUiAgentRequest {
  /** 渲染层生成，先订阅事件再启动，避免漏事件。 */
  taskId: string;
  deviceId: string;
  serial: string;
  instruction: string;
  /** 模型 Provider ID；缺省时 Host 回退默认 Provider。 */
  providerId?: string;
  model: string;
  maxSteps?: number;
  memoryWindow?: number;
  /** open_app 动作的目标包名（可选）。 */
  packageName?: string;
  /** 追加到 System Prompt 的业务规则补充。 */
  userNote?: string;
}

/** 订阅指定任务的 UI Agent 事件流。 */
export function listenUiAgentEvents(
  taskId: string,
  handler: (event: UiAgentEvent) => void,
): Promise<() => void> {
  return safeListen<UiAgentEvent>(uiAgentEventChannel(taskId), (event) => {
    handler(event.payload);
  });
}

/** 启动一个 UI Agent 任务。 */
export async function startUiAgent(
  request: StartUiAgentRequest,
): Promise<{ taskId: string }> {
  return await safeInvoke<{ taskId: string }>(
    "ui_agent_start",
    request as unknown as Record<string, unknown>,
  );
}

/** 取消一个运行中的 UI Agent 任务。 */
export async function cancelUiAgent(
  taskId: string,
): Promise<{ cancelled: boolean }> {
  return await safeInvoke<{ cancelled: boolean }>("ui_agent_cancel", {
    taskId,
  });
}
