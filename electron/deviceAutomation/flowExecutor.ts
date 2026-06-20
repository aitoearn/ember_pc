/**
 * 确定性流步骤执行：经 adb 快路径执行 tap/swipe/input 等（不调大模型）。
 */

import type { FlowOp, FlowStep, HardAssertionExpr, Locator } from "../../src/features/device-automation/flow/domain/flowFormat";
import type { FlowLocatorHit } from "./flowLocator";
import { execAdbSync, sendAndroidNavigationFast } from "./scrcpyAdbFastPath";
import { tryLocateLocators } from "./flowLocator";

export async function executeFlowStepOp(params: {
  deviceId: string;
  step: FlowStep;
  hit?: FlowLocatorHit;
  screen: { width: number; height: number };
}): Promise<void> {
  const { deviceId, step, hit, screen } = params;
  switch (step.op) {
    case "tap":
      if (!hit) {
        throw new Error("tap 缺少定位命中点");
      }
      tapAt(deviceId, hit.centerX, hit.centerY);
      return;
    case "swipe": {
      if (!hit) {
        throw new Error("swipe 缺少起点");
      }
      const direction = String(step.args?.direction ?? "up");
      const distance = Number(step.args?.distance ?? 800);
      const { x2, y2 } = swipeEnd(hit.centerX, hit.centerY, direction, distance, screen);
      swipe(deviceId, hit.centerX, hit.centerY, x2, y2);
      return;
    }
    case "input_text": {
      const text = String(step.args?.text ?? "");
      if (hit) {
        tapAt(deviceId, hit.centerX, hit.centerY);
      }
      typeText(deviceId, text);
      return;
    }
    case "launch_app": {
      const pkg = String(step.args?.package ?? "").trim();
      if (!pkg) {
        throw new Error("launch_app 缺少 package");
      }
      execAdbSync(deviceId, [
        "shell",
        "monkey",
        "-p",
        pkg,
        "-c",
        "android.intent.category.LAUNCHER",
        "1",
      ]);
      return;
    }
    case "back":
      sendAndroidNavigationFast({ deviceId, action: "back" });
      return;
    case "wait":
      await sleep(Number(step.args?.durationMs ?? 800));
      return;
    case "scroll_until_visible":
      // 首期：一次向上滑动
      if (!hit) {
        throw new Error("scroll_until_visible 缺少锚点");
      }
      const end = swipeEnd(hit.centerX, hit.centerY, "up", 600, screen);
      swipe(deviceId, hit.centerX, hit.centerY, end.x2, end.y2);
      return;
    case "assert":
      return;
    default:
      throw new Error(`未支持的操作类型：${step.op}`);
  }
}

export function evaluateHardAssertion(
  expr: HardAssertionExpr,
  dumpXml: string,
  screen: { width: number; height: number },
): { ok: boolean; reason?: string } {
  const locator: Locator = {
    kind: expr.locatorKind,
    value: expr.value,
    match: expr.match,
  };
  const result = tryLocateLocators([locator], dumpXml, screen);
  const isPresent = "centerX" in result;
  if (expr.present === isPresent) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: expr.present
      ? `期望元素存在但未找到：${expr.value}`
      : `期望元素不存在但仍可见：${expr.value}`,
  };
}

function tapAt(deviceId: string, x: number, y: number): void {
  execAdbSync(deviceId, ["shell", "input", "tap", String(x), String(y)]);
}

function swipe(deviceId: string, x1: number, y1: number, x2: number, y2: number): void {
  execAdbSync(deviceId, [
    "shell",
    "input",
    "swipe",
    String(x1),
    String(y1),
    String(x2),
    String(y2),
    "300",
  ]);
}

function typeText(deviceId: string, text: string): void {
  if (!text) {
    return;
  }
  const escaped = text.replace(/ /g, "%s").replace(/(['"\\&;|<>$`])/g, "\\$1");
  execAdbSync(deviceId, ["shell", "input", "text", escaped]);
}

function swipeEnd(
  x: number,
  y: number,
  direction: string,
  distance: number,
  screen: { width: number; height: number },
): { x2: number; y2: number } {
  let x2 = x;
  let y2 = y;
  if (direction === "up") {
    y2 = Math.max(0, y - distance);
  } else if (direction === "down") {
    y2 = Math.min(screen.height, y + distance);
  } else if (direction === "left") {
    x2 = Math.max(0, x - distance);
  } else if (direction === "right") {
    x2 = Math.min(screen.width, x + distance);
  }
  return { x2, y2 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
