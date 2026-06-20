/**
 * 手动投屏操作 → FlowStep 的纯投影（与 Host 侧 deviceFlowRecord 共用）。
 * 坐标为设备像素；经 screen 尺寸转为 vlm_anchor（0–1000）。
 */

import type { FlowOp, FlowStep } from "./flowFormat";
import { sortLocatorsByPriority } from "./flowFormat";

export interface ManualRecordingScreen {
  width: number;
  height: number;
}

const DEFAULT_SCREEN: ManualRecordingScreen = { width: 1080, height: 2400 };

function resolveScreen(screen?: Partial<ManualRecordingScreen>): ManualRecordingScreen {
  const width =
    Number.isFinite(screen?.width) && screen!.width! > 0
      ? screen!.width!
      : DEFAULT_SCREEN.width;
  const height =
    Number.isFinite(screen?.height) && screen!.height! > 0
      ? screen!.height!
      : DEFAULT_SCREEN.height;
  return { width, height };
}

function pixelToNorm(
  x: number,
  y: number,
  screen: ManualRecordingScreen,
): { xNorm: number; yNorm: number } {
  return {
    xNorm: Math.round((x * 1000) / screen.width),
    yNorm: Math.round((y * 1000) / screen.height),
  };
}

function buildVlmAnchorLocator(
  x: number,
  y: number,
  screen: ManualRecordingScreen,
) {
  const { xNorm, yNorm } = pixelToNorm(x, y, screen);
  return {
    kind: "vlm_anchor" as const,
    value: `${xNorm},${yNorm}`,
    vlmAnchor: { xNorm, yNorm },
  };
}

/** 由滑动向量推断方向（与 ui-agent sidecar 语义一致）。 */
export function inferSwipeDirection(dx: number, dy: number): string {
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy < 0 ? "up" : "down";
  }
  return dx < 0 ? "left" : "right";
}

export function buildManualTapStep(
  index: number,
  x: number,
  y: number,
  screen?: Partial<ManualRecordingScreen>,
): FlowStep {
  const resolved = resolveScreen(screen);
  return {
    index,
    op: "tap",
    locators: [buildVlmAnchorLocator(x, y, resolved)],
  };
}

export function buildManualSwipeStep(
  index: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  screen?: Partial<ManualRecordingScreen>,
): FlowStep {
  const resolved = resolveScreen(screen);
  const dx = x2 - x1;
  const dy = y2 - y1;
  return {
    index,
    op: "swipe",
    locators: [buildVlmAnchorLocator(x1, y1, resolved)],
    args: {
      direction: inferSwipeDirection(dx, dy),
      distance: Math.round(Math.hypot(dx, dy)),
    },
  };
}

export function buildManualBackStep(index: number): FlowStep {
  return { index, op: "back" };
}

export function buildManualInputTextStep(
  index: number,
  text: string,
  screen?: Partial<ManualRecordingScreen>,
  point?: { x: number; y: number },
): FlowStep {
  const locators = point
    ? [buildVlmAnchorLocator(point.x, point.y, resolveScreen(screen))]
    : text.trim()
      ? [{ kind: "text" as const, value: text.trim(), match: "contains" as const }]
      : [];
  return {
    index,
    op: "input_text",
    locators: sortLocatorsByPriority(locators),
    args: { text },
  };
}

export function buildManualLaunchAppStep(
  index: number,
  packageName: string,
): FlowStep {
  return {
    index,
    op: "launch_app",
    args: { package: packageName.trim() },
  };
}

/** 重编号步骤 index 为 0..n-1。 */
export function reindexFlowSteps(steps: FlowStep[]): FlowStep[] {
  return steps.map((step, index) => ({ ...step, index }));
}

/** 合并两段步骤并连续重编号。 */
export function mergeFlowStepDrafts(
  primary: FlowStep[],
  secondary: FlowStep[],
): FlowStep[] {
  return reindexFlowSteps([...primary, ...secondary]);
}

/** 导航动作是否映射为 FlowOp。 */
export function mapMirrorNavigationToFlowOp(
  action: "back" | "home",
): FlowOp | null {
  return action === "back" ? "back" : null;
}
