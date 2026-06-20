import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderWithKeysDisplay } from "@/lib/api/apiKeyProvider";
import {
  METHOD_MODEL_PROVIDER_LIST,
  METHOD_MODEL_PROVIDER_UI_STATE_READ,
  METHOD_MODEL_PROVIDER_UI_STATE_WRITE,
} from "../../../packages/app-server-client/src/protocol";

const { mockSafeInvoke } = vi.hoisted(() => ({
  mockSafeInvoke: vi.fn(),
}));

vi.mock("@/lib/dev-bridge", () => ({
  safeInvoke: mockSafeInvoke,
}));

import { invalidateApiKeyProviderCache } from "@/lib/api/apiKeyProvider";
import { ApiKeyProviderSection } from "./ApiKeyProviderSection";

const mountedRoots: Array<{ root: Root; container: HTMLDivElement }> = [];

function createProvider(
  overrides: Partial<ProviderWithKeysDisplay>,
): ProviderWithKeysDisplay {
  return {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    api_host: "https://api.openai.com",
    is_system: true,
    group: "mainstream",
    enabled: true,
    sort_order: 1,
    api_key_count: 0,
    custom_models: [],
    prompt_cache_mode: null,
    created_at: "2026-03-15T00:00:00.000Z",
    updated_at: "2026-03-15T00:00:00.000Z",
    api_keys: [],
    ...overrides,
  };
}

async function flushEffects(times = 6) {
  await act(async () => {
    for (let index = 0; index < times; index += 1) {
      await Promise.resolve();
    }
  });
}

function renderSection() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ApiKeyProviderSection />);
  });

  mountedRoots.push({ root, container });
  return container;
}

describe("ApiKeyProviderSection OEM Hub 边界", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    invalidateApiKeyProviderCache();

    const providers: ProviderWithKeysDisplay[] = [
      createProvider({
        id: "ember-hub",
        name: "Ember Hub",
        api_host: "https://hub.ember.test",
        group: "cloud",
        sort_order: 0,
      }),
      createProvider({
        id: "deepseek",
        name: "DeepSeek",
        api_host: "https://api.deepseek.com",
        sort_order: 1,
        custom_models: ["deepseek-chat"],
        api_key_count: 1,
        api_keys: [
          {
            id: "key-1",
            provider_id: "deepseek",
            api_key_masked: "sk-****1234",
            enabled: true,
            usage_count: 0,
            error_count: 0,
            created_at: "2026-03-15T00:00:00.000Z",
          },
        ],
      }),
    ];

    mockSafeInvoke.mockImplementation(
      async (command: string, payload?: Record<string, unknown>) => {
        switch (command) {
          case "app_server_handle_json_lines":
            return handleAppServerJsonLines(payload, providers);
          default:
            throw new Error(`未处理的 safeInvoke 命令：${command}`);
        }
      },
    );
  });

  afterEach(() => {
    while (mountedRoots.length > 0) {
      const mounted = mountedRoots.pop();
      if (!mounted) {
        break;
      }
      act(() => {
        mounted.root.unmount();
      });
      mounted.container.remove();
    }
    invalidateApiKeyProviderCache();
    vi.clearAllMocks();
  });

  it("AI 服务商设置页不应展示 Ember Hub 登录提示", async () => {
    const container = renderSection();
    await flushEffects();

    expect(
      container.querySelector('[data-testid="provider-login-required"]'),
    ).toBeNull();
    expect(container.textContent ?? "").not.toContain("Ember Hub");
    expect(container.textContent ?? "").toContain("DeepSeek");
    expect(
      container.querySelector('[data-provider-id="ember-hub"]'),
    ).toBeNull();
  });
});

function handleAppServerJsonLines(
  payload: Record<string, unknown> | undefined,
  providers: ProviderWithKeysDisplay[],
): { lines: string[] } {
  const request = payload?.request as { lines?: string[] } | undefined;
  const messages = request?.lines?.map((line) => JSON.parse(line)) ?? [];
  const lines = messages.map((message) => {
    if (message.method === METHOD_MODEL_PROVIDER_LIST) {
      return `${JSON.stringify({
        id: message.id,
        result: { providers },
      })}\n`;
    }
    if (message.method === METHOD_MODEL_PROVIDER_UI_STATE_READ) {
      return `${JSON.stringify({
        id: message.id,
        result: {
          value: message.params?.key === "selected_provider" ? "ember-hub" : null,
        },
      })}\n`;
    }
    if (message.method === METHOD_MODEL_PROVIDER_UI_STATE_WRITE) {
      return `${JSON.stringify({
        id: message.id,
        result: {},
      })}\n`;
    }

    return `${JSON.stringify({
      id: message.id,
      error: {
        code: -32601,
        message: `未处理的 App Server 方法：${message.method}`,
      },
    })}\n`;
  });

  return { lines };
}
