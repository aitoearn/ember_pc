import { describe, expect, it, vi } from "vitest";
import { APP_SERVER_METHOD_AGENT_SESSION_EVENT } from "@/lib/api/appServer";
import { generateTestCases } from "./aiGeneration";

const RAW_JSON = JSON.stringify([
  {
    caseId: "TC-001",
    title: "登录成功",
    priority: "P1",
    caseType: "功能",
    steps: [{ action: "输入账号密码并登录", expected: "进入首页" }],
    assertions: ["首页展示用户昵称"],
  },
]);

interface MockShapeOptions {
  /** readSession 返回的 assistant 消息 id（默认不以 turnId 开头，贴合实时形状） */
  assistantMessageId?: (turnId: string) => string;
  /** startTurn 返回的事件通知（默认仅生命周期事件，无 message.delta） */
  turnNotifications?: (turnId: string) => unknown[];
  /** readSession detail.messages（覆盖默认 assistant 文本消息） */
  detailMessages?: (turnId: string) => unknown[];
}

function appServerClientMock(options: MockShapeOptions = {}) {
  const client = {
    startSession: vi.fn(),
    startTurn: vi.fn(),
    readSession: vi.fn(),
  };

  client.startSession.mockResolvedValue({
    id: 1,
    result: {},
    response: { id: 1, result: {} },
    notifications: [],
    messages: [],
  });

  client.startTurn.mockImplementation(async (params) => ({
    id: 2,
    result: { turn: { turnId: params.turnId, status: "completed" } },
    response: { id: 2, result: {} },
    notifications: options.turnNotifications
      ? options.turnNotifications(params.turnId)
      : [
          {
            method: APP_SERVER_METHOD_AGENT_SESSION_EVENT,
            params: {
              event: { type: "turn.completed", turnId: params.turnId, payload: {} },
            },
          },
        ],
    messages: [],
  }));

  client.readSession.mockImplementation(async () => {
    const turnId = client.startTurn.mock.calls[0]?.[0]?.turnId ?? "turn-1";
    const messages = options.detailMessages
      ? options.detailMessages(turnId)
      : [
          {
            // 关键：实时持久化的 assistant 消息 id 通常不以我们的 turnId 开头
            id: options.assistantMessageId
              ? options.assistantMessageId(turnId)
              : "msg-7f3a9c",
            role: "assistant",
            content: [{ type: "text", text: RAW_JSON }],
          },
        ];
    return {
      id: 3,
      result: { detail: { messages } },
      response: { id: 3, result: {} },
      notifications: [],
      messages: [],
    };
  });

  return client;
}

const baseOptions = {
  workspaceId: "ws-1",
  providerType: "openai-compatible",
  model: "gpt-test",
  requirementText: "用户可以用账号密码登录",
};

describe("generateTestCases 提取 assistant 输出", () => {
  it("assistant 消息 id 不以 turnId 开头时仍能取回输出（一次性专用会话）", async () => {
    const client = appServerClientMock();
    const raw = await generateTestCases(baseOptions, client as never);
    expect(raw).toContain("登录成功");
  });

  it("readSession 为空时回退到 message.delta 通知", async () => {
    const client = appServerClientMock({
      detailMessages: () => [],
      turnNotifications: (turnId) => [
        {
          method: APP_SERVER_METHOD_AGENT_SESSION_EVENT,
          params: {
            event: {
              type: "message.delta",
              turnId,
              payload: { text: RAW_JSON },
            },
          },
        },
      ],
    });
    const raw = await generateTestCases(baseOptions, client as never);
    expect(raw).toContain("登录成功");
  });

  it("回退支持 message.delta_batch 批量增量", async () => {
    const client = appServerClientMock({
      detailMessages: () => [],
      turnNotifications: (turnId) => [
        {
          method: APP_SERVER_METHOD_AGENT_SESSION_EVENT,
          params: {
            event: {
              type: "message.delta_batch",
              turnId,
              payload: { text: RAW_JSON },
            },
          },
        },
      ],
    });
    const raw = await generateTestCases(baseOptions, client as never);
    expect(raw).toContain("登录成功");
  });

  it("优先返回 turnId 匹配的 assistant 消息而非历史消息", async () => {
    const client = appServerClientMock({
      detailMessages: (turnId) => [
        { id: "old-msg", role: "assistant", content: [{ type: "text", text: "旧的无关输出" }] },
        {
          id: `${turnId}:assistant`,
          role: "assistant",
          content: [{ type: "text", text: RAW_JSON }],
        },
      ],
    });
    const raw = await generateTestCases(baseOptions, client as never);
    expect(raw).toContain("登录成功");
    expect(raw).not.toContain("旧的无关输出");
  });

  it("确实无任何 assistant 输出时抛出可读错误", async () => {
    const client = appServerClientMock({
      detailMessages: () => [],
      turnNotifications: () => [],
    });
    await expect(generateTestCases(baseOptions, client as never)).rejects.toThrow(
      /未返回 assistant 输出/,
    );
  });
});
