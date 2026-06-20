import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlowLibraryPanel } from "./FlowLibraryPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

interface MountedPanel {
  container: HTMLDivElement;
  root: Root;
}

const mountedPanels: MountedPanel[] = [];

function renderPanel(props: React.ComponentProps<typeof FlowLibraryPanel>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<FlowLibraryPanel {...props} />);
  });
  mountedPanels.push({ container, root });
  return container;
}

describe("FlowLibraryPanel", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    while (mountedPanels.length > 0) {
      const mounted = mountedPanels.pop();
      if (!mounted) {
        continue;
      }
      await act(async () => {
        mounted.root.unmount();
      });
      mounted.container.remove();
    }
  });

  it("空列表展示 empty 文案", () => {
    const container = renderPanel({
      flows: [],
      loading: false,
      error: "",
      selectedFlowId: null,
      onSelect: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(container.textContent).toContain(
      "deviceAutomation.flow.library.empty",
    );
  });

  it("渲染流名称并响应选择", () => {
    const onSelect = vi.fn();
    const container = renderPanel({
      flows: [
        {
          id: "f1",
          workspaceId: "ws",
          name: "登录冒烟",
          appPackage: "com.example",
          platform: "android",
          formatVersion: 1,
          source: "vlm_recorded",
          selfHealingEnabled: true,
          steps: [{ index: 0, op: "tap" }],
          createdAt: "2026-06-18T00:00:00.000Z",
          updatedAt: "2026-06-18T00:00:00.000Z",
        },
      ],
      loading: false,
      error: "",
      selectedFlowId: null,
      onSelect,
      onDelete: vi.fn(),
    });
    const nameButton = container.querySelector("button");
    expect(nameButton?.textContent).toContain("登录冒烟");
    act(() => {
      nameButton?.click();
    });
    expect(onSelect).toHaveBeenCalledWith("f1");
  });
});
