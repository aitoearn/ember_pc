import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidKeyEventMeta,
  type ScrcpyControlMessageWriter,
} from "@yume-chan/scrcpy";

const NAVIGATION_KEY_CODES = {
  back: AndroidKeyCode.AndroidBack,
  home: AndroidKeyCode.AndroidHome,
} as const;

/** 对齐 aya scrcpy 控制通道：injectKeyCode Down/Up（与 Toolbar adb keyevent 语义一致）。 */
export async function sendScrcpyNavigation(
  writer: ScrcpyControlMessageWriter,
  action: "back" | "home",
): Promise<void> {
  const keyCode = NAVIGATION_KEY_CODES[action];
  await writer.injectKeyCode({
    action: AndroidKeyEventAction.Down,
    keyCode,
    repeat: 0,
    metaState: AndroidKeyEventMeta.None,
  });
  await writer.injectKeyCode({
    action: AndroidKeyEventAction.Up,
    keyCode,
    repeat: 0,
    metaState: AndroidKeyEventMeta.None,
  });
}
