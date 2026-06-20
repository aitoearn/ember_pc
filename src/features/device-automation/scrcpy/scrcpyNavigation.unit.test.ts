import { describe, expect, it, vi } from "vitest";
import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidKeyEventMeta,
} from "@yume-chan/scrcpy";
import { sendScrcpyNavigation } from "./scrcpyNavigation";

describe("sendScrcpyNavigation", () => {
  it("返回键注入 AndroidBack Down/Up", async () => {
    const writer = {
      injectKeyCode: vi.fn(async () => {}),
    };

    await sendScrcpyNavigation(writer as never, "back");

    expect(writer.injectKeyCode).toHaveBeenCalledWith({
      action: AndroidKeyEventAction.Down,
      keyCode: AndroidKeyCode.AndroidBack,
      repeat: 0,
      metaState: AndroidKeyEventMeta.None,
    });
    expect(writer.injectKeyCode).toHaveBeenCalledWith({
      action: AndroidKeyEventAction.Up,
      keyCode: AndroidKeyCode.AndroidBack,
      repeat: 0,
      metaState: AndroidKeyEventMeta.None,
    });
  });

  it("主页键注入 AndroidHome Down/Up", async () => {
    const writer = {
      injectKeyCode: vi.fn(async () => {}),
    };

    await sendScrcpyNavigation(writer as never, "home");

    expect(writer.injectKeyCode).toHaveBeenCalledWith({
      action: AndroidKeyEventAction.Down,
      keyCode: AndroidKeyCode.AndroidHome,
      repeat: 0,
      metaState: AndroidKeyEventMeta.None,
    });
    expect(writer.injectKeyCode).toHaveBeenCalledWith({
      action: AndroidKeyEventAction.Up,
      keyCode: AndroidKeyCode.AndroidHome,
      repeat: 0,
      metaState: AndroidKeyEventMeta.None,
    });
  });
});
