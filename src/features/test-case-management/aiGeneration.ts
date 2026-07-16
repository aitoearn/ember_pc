/**
 * AI 用例生成：prompt 拼装 + App Server 一次性 LLM 调用（US2，research R4）。
 *
 * 复用 `themeContextSearch.ts` 的辅助会话调用模式（startSession → startTurn →
 * readSession 取 assistant 文本），不新增后端 LLM 方法。输出约定为严格 JSON 数组，
 * 由 `viewModel/aiDraftParse.ts` 容错解析。prompt 拼装抽成纯函数便于单测。
 */

import {
  APP_SERVER_METHOD_AGENT_SESSION_EVENT,
  AppServerClient,
  type AppServerAgentSessionReadResponse,
  type AppServerJsonRpcNotification,
} from "@/lib/api/appServer";
import { TEST_CASE_TYPES, type TestCaseType } from "./types";

const GENERATION_SESSION_PREFIX = "__ember_test_case_generate__";
const DEFAULT_APP_ID = "desktop";

export interface GenerateTestCasesOptions {
  workspaceId: string;
  providerType: string;
  model: string;
  /** 需求/描述正文（粘贴文本或文件读出的纯文本） */
  requirementText: string;
  /** 期望生成数量（可选，FR-008a） */
  count?: number;
  /** 期望用例类型（可选，约束生成聚焦的场景维度） */
  types?: TestCaseType[];
}

type GenerationAppServerClient = Pick<
  AppServerClient,
  "startSession" | "startTurn" | "readSession"
>;

/** 生成用例的系统提示词：固定测试设计专家角色 + 仅输出 JSON。 */
export function buildGenerationSystemPrompt(): string {
  return [
    "你是资深测试用例设计专家。",
    "你的任务是把需求/功能描述拆解为结构化、可执行的测试用例。",
    "只输出调用方要求的 JSON 数组，不要输出任何解释或 Markdown 代码块。",
  ].join("\n");
}

/** 生成用例的用户提示词：约束输出 schema（含 assertions）+ 可选数量/类型。 */
export function buildGenerationPrompt(options: {
  requirementText: string;
  count?: number;
  types?: TestCaseType[];
}): string {
  const { requirementText, count, types } = options;
  const typeHint =
    types && types.length > 0
      ? `优先覆盖以下用例类型：${types.join("、")}。`
      : `合理覆盖功能、边界、异常等类型（取值范围：${TEST_CASE_TYPES.join("、")}）。`;
  const countHint =
    count && count > 0
      ? `生成约 ${count} 条用例。`
      : "根据需求复杂度生成合适数量的用例（建议 5-12 条）。";

  return [
    "请根据下面的需求/功能描述设计测试用例。",
    countHint,
    typeHint,
    "你必须返回且仅返回一个 JSON 数组，数组每个元素是一条用例对象，结构如下：",
    JSON.stringify(
      {
        caseId: "用例编号，如 TC-LOGIN-001；不确定可留空",
        title: "用例标题（必填，简洁概括验证点）",
        priority: "P0 | P1 | P2 | P3",
        caseType: TEST_CASE_TYPES.join(" | "),
        precondition: "前置条件",
        steps: [{ action: "操作描述", expected: "该步预期（可选）" }],
        assertions: ["用例最终应满足的可验证结论（与步骤分离，必填至少一条）"],
        tags: ["可选标签"],
      },
      null,
      0,
    ),
    "字段要求：",
    "1. title 必填、非空；priority 只能取 P0/P1/P2/P3。",
    "2. steps 为操作序列；assertions 为与步骤分离的独立验证项，是判定用例通过与否的依据，必须至少一条。",
    "3. 不要编造与需求无关的功能；信息不足时在 assertions 中给出可验证的最小结论。",
    "",
    "需求/功能描述：",
    requirementText.trim(),
  ].join("\n");
}

function randomIdSegment(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/**
 * 调 App Server 一次性生成用例，返回模型原始文本（交由 parseAiDrafts 解析）。
 */
export async function generateTestCases(
  options: GenerateTestCasesOptions,
  appServerClient: GenerationAppServerClient = new AppServerClient(),
): Promise<string> {
  const workspaceId = options.workspaceId.trim();
  const providerType = options.providerType.trim();
  const model = options.model.trim();
  const requirementText = options.requirementText.trim();

  if (!workspaceId) {
    throw new Error("缺少 workspaceId，无法生成用例");
  }
  if (!providerType || !model) {
    throw new Error("当前未选择可用模型，无法生成用例");
  }
  if (!requirementText) {
    throw new Error("输入内容为空，请粘贴需求文本或上传文件");
  }

  const sessionId = `${GENERATION_SESSION_PREFIX}-${randomIdSegment()}`;
  const turnId = `turn-test-case-generate-${randomIdSegment()}`;
  const prompt = buildGenerationPrompt({
    requirementText,
    count: options.count,
    types: options.types,
  });
  const systemPrompt = buildGenerationSystemPrompt();
  const metadata = {
    hiddenFromUserRecents: true,
    source: "test_case_generate",
  };

  await appServerClient.startSession({
    sessionId,
    appId: DEFAULT_APP_ID,
    workspaceId,
    businessObjectRef: {
      kind: "agent.session",
      id: `test-case-generate:${workspaceId}:${Date.now()}`,
      title: "AI 用例生成",
      metadata: {
        ...metadata,
        title: "AI 用例生成",
        executionStrategy: "react",
        providerSelector: providerType,
        modelName: model,
      },
    },
  });

  const turnResult = await appServerClient.startTurn({
    sessionId,
    turnId,
    input: { text: prompt },
    runtimeOptions: {
      stream: true,
      providerPreference: providerType,
      modelPreference: model,
      metadata,
      hostOptions: {
        asterChatRequest: {
          message: prompt,
          session_id: sessionId,
          workspace_id: workspaceId,
          provider_preference: providerType,
          model_preference: model,
          system_prompt: systemPrompt,
          turn_id: turnId,
          metadata,
          turn_config: {
            provider_preference: providerType,
            model_preference: model,
            system_prompt: systemPrompt,
            metadata,
          },
        },
      },
    },
    queueIfBusy: false,
    skipPreSubmitResume: true,
  });

  const readResult = await appServerClient.readSession({ sessionId });
  const rawResponse =
    extractAssistantTextFromReadResponse(readResult.result, turnId) ||
    extractAssistantTextFromNotifications(turnResult.notifications, turnId);

  if (!rawResponse) {
    throw new Error("App Server 用例生成未返回 assistant 输出");
  }
  return rawResponse;
}

// ---------------------------------------------------------------------------
// assistant 文本提取（与 themeContextSearch 同构的最小实现）
// ---------------------------------------------------------------------------

function extractAssistantTextFromReadResponse(
  response: AppServerAgentSessionReadResponse,
  turnId: string,
): string {
  const detail = asRecord(response.detail);
  const messages = Array.isArray(detail?.messages) ? detail.messages : [];
  // 优先返回与本轮 turnId 匹配的 assistant 输出；本会话为一次性专用会话，
  // 实时持久化的消息 id 不一定以 turnId 开头（可能是消息 UUID 或序列号），
  // 因此在无 turnId 匹配时回退到最新一条非空 assistant 消息，避免误判“无输出”。
  let fallbackText = "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = asRecord(messages[index]);
    if (!message || message.role !== "assistant") {
      continue;
    }
    const text = readMessageText(message).trim();
    if (!text) {
      continue;
    }
    const messageId = typeof message.id === "string" ? message.id : "";
    if (!messageId || messageId.startsWith(turnId)) {
      return text;
    }
    if (!fallbackText) {
      fallbackText = text;
    }
  }
  return fallbackText;
}

function extractAssistantTextFromNotifications(
  notifications: AppServerJsonRpcNotification[],
  turnId: string,
): string {
  return notifications
    .map((notification) => eventFromNotification(notification))
    .filter((event) => event?.turnId === turnId)
    // 文本增量既可能是逐字 `message.delta`，也可能是批量 `message.delta_batch`
    // （长输出时运行时会合批），两者都需纳入拼接。
    .filter(
      (event) =>
        event?.type === "message.delta" ||
        event?.type === "message.delta_batch",
    )
    .map((event) => readPayloadText(event?.payload))
    .join("")
    .trim();
}

function eventFromNotification(notification?: AppServerJsonRpcNotification) {
  if (notification?.method !== APP_SERVER_METHOD_AGENT_SESSION_EVENT) {
    return null;
  }
  const params = asRecord(notification.params);
  const event = asRecord(params?.event) ?? params;
  if (!event) {
    return null;
  }
  return {
    type: readString(event, "type") || readString(event, "eventType"),
    turnId: readString(event, "turnId") || readString(event, "turn_id"),
    payload: event.payload,
  };
}

function readMessageText(message: Record<string, unknown>): string {
  const content = message.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      const record = asRecord(part);
      return record ? readString(record, "text") || readString(record, "content") : "";
    })
    .join("");
}

function readPayloadText(payload: unknown): string {
  const record = asRecord(payload);
  if (!record) {
    return "";
  }
  const direct =
    readString(record, "text") ||
    readString(record, "delta") ||
    readString(record, "content") ||
    readString(record, "message") ||
    readString(record, "outputText") ||
    readString(record, "output_text");
  if (direct) {
    return direct;
  }
  // RuntimeCore 后端会把原始运行时事件嵌在 payload.runtimeEvent 下，文本在其内层。
  const runtimeEvent = asRecord(record.runtimeEvent);
  return runtimeEvent ? readString(runtimeEvent, "text") : "";
}

function readString(
  record: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
