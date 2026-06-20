import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseOemCloudAccess, mockApiKeyProviderSection } = vi.hoisted(() => ({
  mockUseOemCloudAccess: vi.fn(),
  mockApiKeyProviderSection: vi.fn(),
}));

vi.mock("@/components/api-key-provider", () => ({
  ApiKeyProviderSection: (props: { className?: string }) => {
    mockApiKeyProviderSection(props);
    return (
      <div
        data-testid="api-key-provider-stub"
        className={props.className}
      >
        API Key Provider 设置占位
      </div>
    );
  },
}));

vi.mock("@/hooks/useOemCloudAccess", () => ({
  useOemCloudAccess: () => mockUseOemCloudAccess(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dictionary: Record<string, string> = {
        "settings.tab.providers": "AI 服务商",
      };
      return dictionary[key] ?? key;
    },
  }),
}));

import { CloudProviderSettings } from ".";

interface Mounted {
  container: HTMLDivElement;
  root: Root;
}

const mounted: Mounted[] = [];

function createAccessState(overrides: Record<string, unknown> = {}) {
  return {
    errorMessage: null,
    infoMessage: null,
    ...overrides,
  };
}

function renderPage() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<CloudProviderSettings initialView="cloud" />);
  });

  mounted.push({ container, root });
  return container;
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  mockUseOemCloudAccess.mockReturnValue(createAccessState());
});

afterEach(() => {
  vi.clearAllMocks();

  while (mounted.length > 0) {
    const current = mounted.pop();
    if (!current) {
      break;
    }
    act(() => {
      current.root.unmount();
    });
    current.container.remove();
  }
});

describe("CloudProviderSettings", () => {
  it("应只渲染 Provider 主区，不再暴露桌宠工作区", () => {
    const container = renderPage();
    const text = container.textContent ?? "";

    expect(container.querySelector("h1")?.textContent).toBe("AI 服务商");
    expect(
      container.querySelector('[data-testid="api-key-provider-stub"]')
        ?.className,
    ).toContain("h-[calc(100vh-280px)]");
    expect(
      container.querySelector('[data-testid="provider-workspace-switcher"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="companion-provider-card"]'),
    ).toBeNull();
    expect(text).toContain("API Key Provider 设置占位");
    expect(text).not.toContain("桌宠");
    expect(text).not.toContain("Companion");
    expect(text).not.toContain("Ember Pet");
  });

  it("不应再向 Provider 主区透传 Ember Hub 登录提示", () => {
    mockUseOemCloudAccess.mockReturnValue(
      createAccessState({
        runtime: { baseUrl: "https://cloud.example.test" },
        session: null,
      }),
    );

    renderPage();

    const providerProps = mockApiKeyProviderSection.mock.calls.at(-1)?.[0] as
      | Record<string, unknown>
      | undefined;

    expect(providerProps?.exposeOemLoginPrompt).toBeUndefined();
    expect(providerProps?.onOemLogin).toBeUndefined();
  });
});
