/**
 * 自愈：定位失配时降级 VLM 单步重导，产出新 vlm_anchor（FR-012）。
 */

import type { FlowStep, Locator } from "../../src/features/device-automation/flow/domain/flowFormat";

export interface FlowHealParams {
  step: FlowStep;
  screenshotBase64: string;
  mediaType: string;
  screen: { width: number; height: number };
  baseUrl: string;
  apiKey: string;
  model: string;
  /** 注入 fetch 便于单测。 */
  fetchImpl?: typeof fetch;
}

export interface FlowHealSuccess {
  ok: true;
  healedLocator: Locator;
  tokenUsed: number;
}

export interface FlowHealFailure {
  ok: false;
  reason: string;
  tokenUsed: number;
}

export type FlowHealResult = FlowHealSuccess | FlowHealFailure;

const MAX_HEAL_ATTEMPTS = 2;

function resolveChatUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(trimmed)) {
    return trimmed;
  }
  if (/\/v\d+$/.test(trimmed)) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function parsePointFromVlm(content: string): { xNorm: number; yNorm: number } | null {
  const pointMatch = content.match(/(\d+(?:\.\d+)?)\s*[,，]\s*(\d+(?:\.\d+)?)/);
  if (!pointMatch) {
    return null;
  }
  const xNorm = Math.round(Number(pointMatch[1]));
  const yNorm = Math.round(Number(pointMatch[2]));
  if (!Number.isFinite(xNorm) || !Number.isFinite(yNorm)) {
    return null;
  }
  return { xNorm, yNorm };
}

export async function healFlowStep(params: FlowHealParams): Promise<FlowHealResult> {
  const intent = params.step.intent?.trim() || `执行操作 ${params.step.op}`;
  const fetchImpl = params.fetchImpl ?? fetch;
  let tokenUsed = 0;

  for (let attempt = 0; attempt < MAX_HEAL_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImpl(resolveChatUrl(params.baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `你是 Android UI 自愈助手。根据截图与意图，返回目标元素中心点归一化坐标（0-1000），格式：point=x,y。意图：${intent}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${params.mediaType};base64,${params.screenshotBase64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0,
          max_tokens: 256,
        }),
      });
      if (!response.ok) {
        continue;
      }
      const data = (await response.json()) as {
        usage?: { total_tokens?: number };
        choices?: Array<{ message?: { content?: string } }>;
      };
      tokenUsed += Number(data.usage?.total_tokens ?? 0);
      const content = String(data.choices?.[0]?.message?.content ?? "");
      const point = parsePointFromVlm(content);
      if (!point) {
        continue;
      }
      const healedLocator: Locator = {
        kind: "vlm_anchor",
        value: `${point.xNorm},${point.yNorm}`,
        vlmAnchor: point,
      };
      return { ok: true, healedLocator, tokenUsed };
    } catch {
      /* 重试 */
    }
  }

  return {
    ok: false,
    reason: "VLM 自愈未能在重试上限内产生有效坐标",
    tokenUsed,
  };
}
