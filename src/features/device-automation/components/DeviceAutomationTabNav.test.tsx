import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceAutomationTabNav } from "./DeviceAutomationTabNav";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("DeviceAutomationTabNav", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("渲染全部工作台 Tab", async () => {
    await act(async () => {
      root.render(
        <DeviceAutomationTabNav activeTab="devices" onTabChange={() => {}} />,
      );
    });

    expect(
      container.querySelectorAll('[data-testid^="device-automation-tab-"]')
        .length,
    ).toBe(7);
  });

  it("设备管理 Tab 排在首位", async () => {
    await act(async () => {
      root.render(
        <DeviceAutomationTabNav activeTab="devices" onTabChange={() => {}} />,
      );
    });

    const tabs = container.querySelectorAll(
      '[data-testid^="device-automation-tab-"]',
    );
    expect(tabs[0]?.getAttribute("data-testid")).toBe(
      "device-automation-tab-devices",
    );
  });

  it("点击 Tab 触发 onTabChange", async () => {
    const onTabChange = vi.fn();

    await act(async () => {
      root.render(
        <DeviceAutomationTabNav
          activeTab="devices"
          onTabChange={onTabChange}
        />,
      );
    });

    const monkeyTab = container.querySelector(
      '[data-testid="device-automation-tab-monkey-test"]',
    ) as HTMLButtonElement | null;

    await act(async () => {
      monkeyTab?.click();
    });

    expect(onTabChange).toHaveBeenCalledWith("monkey-test");
  });
});
