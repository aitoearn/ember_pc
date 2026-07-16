import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changeEmberLocale } from "@/i18n/createI18n";

const { mockGenerate } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
}));

vi.mock("@/components/input-kit", () => ({
  ModelSelector: () => <div data-testid="model-selector" />,
}));

vi.mock("../aiGeneration", () => ({
  generateTestCases: mockGenerate,
}));

import { AiGenerationPanel } from "./AiGenerationPanel";
import type { TestCase } from "../types";

interface Mounted {
  container: HTMLDivElement;
  root: Root;
}

const mounted: Mounted[] = [];

function setTextareaValue(el: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickButtonByText(container: HTMLElement, text: string): void {
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(text),
  );
  if (!button) {
    throw new Error(`找不到按钮：${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

beforeEach(async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  mockGenerate.mockReset();
  await changeEmberLocale("zh-CN");
});

afterEach(() => {
  while (mounted.length > 0) {
    const target = mounted.pop();
    if (!target) {
      break;
    }
    act(() => {
      target.root.unmount();
    });
    target.container.remove();
  }
});

function renderPanel(onImport: (drafts: TestCase[]) => void): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <AiGenerationPanel
        open
        workspaceId="ws-1"
        moduleId="m-1"
        onClose={vi.fn()}
        onImport={onImport}
      />,
    );
  });
  mounted.push({ container, root });
  return container;
}

describe("AiGenerationPanel", () => {
  it("生成草稿并把勾选项批量入库", async () => {
    mockGenerate.mockResolvedValue(
      JSON.stringify([
        {
          caseId: "TC-001",
          title: "登录成功",
          priority: "P0",
          steps: [{ action: "输入账号", expected: "可点击" }],
          assertions: ["首页展示昵称"],
        },
      ]),
    );
    const onImport = vi.fn();
    const container = renderPanel(onImport);

    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();
    act(() => {
      setTextareaValue(textarea as HTMLTextAreaElement, "实现登录功能");
    });

    await act(async () => {
      clickButtonByText(container, "生成草稿");
      await Promise.resolve();
    });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate.mock.calls[0][0]).toMatchObject({
      workspaceId: "ws-1",
      requirementText: "实现登录功能",
    });

    const titleInput = Array.from(
      container.querySelectorAll("input"),
    ).find((node) => (node as HTMLInputElement).value === "登录成功");
    expect(titleInput).toBeTruthy();

    await act(async () => {
      clickButtonByText(container, "入库");
      await Promise.resolve();
    });

    expect(onImport).toHaveBeenCalledTimes(1);
    const importedDrafts = onImport.mock.calls[0][0] as TestCase[];
    expect(importedDrafts).toHaveLength(1);
    expect(importedDrafts[0]).toMatchObject({
      caseId: "TC-001",
      source: "AI生成",
      status: "草稿",
      moduleId: "m-1",
    });
  });

  it("生成失败时展示错误且不调用入库", async () => {
    mockGenerate.mockRejectedValue(new Error("模型调用失败"));
    const onImport = vi.fn();
    const container = renderPanel(onImport);

    act(() => {
      setTextareaValue(
        container.querySelector("textarea") as HTMLTextAreaElement,
        "需求文本",
      );
    });

    await act(async () => {
      clickButtonByText(container, "生成草稿");
      await Promise.resolve();
    });

    expect(container.textContent).toContain("模型调用失败");
    expect(onImport).not.toHaveBeenCalled();
  });
});
