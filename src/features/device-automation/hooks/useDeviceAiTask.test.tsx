import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureDeviceAutomationAiSidecar } from "@/lib/api/deviceAutomation";
import { useDeviceAiTask } from "./useDeviceAiTask";
import type { DeviceAutomationCardModel } from "../types";

vi.mock("@/lib/api/deviceAutomation", () => ({
  cancelDeviceAutomationAiTask: vi.fn(),
  ensureDeviceAutomationAiSidecar: vi.fn(),
  pollDeviceAutomationAiTask: vi.fn(),
  prepareDeviceAutomationAiSession: vi.fn(),
  submitDeviceAutomationAiTask: vi.fn(),
}));

const onlineAndroidDevice: DeviceAutomationCardModel = {
  id: "emulator-5554",
  serial: "emulator-5554",
  name: "Pixel",
  brand: "Google",
  model: "Pixel",
  system: "Android",
  resolution: "1080x1920",
  group: "",
  space: "",
  status: "online",
  platform: "android",
  agentPlatform: "android",
  connectionType: "usb",
};

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

function HookProbe({ device }: { device: DeviceAutomationCardModel | null }) {
  const state = useDeviceAiTask(device);
  return <div data-ai-ready={String(state.aiReady)}>{state.error}</div>;
}

describe("useDeviceAiTask", () => {
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
    vi.clearAllMocks();
  });

  it("Android 调试页不再预热 AutoGLM sidecar", async () => {
    await act(async () => {
      root.render(<HookProbe device={onlineAndroidDevice} />);
    });

    expect(ensureDeviceAutomationAiSidecar).not.toHaveBeenCalled();
    expect(container.firstElementChild?.getAttribute("data-ai-ready")).toBe(
      "false",
    );
  });
});
