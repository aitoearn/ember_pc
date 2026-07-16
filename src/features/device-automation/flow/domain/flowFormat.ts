// 确定性可复现测试流的结构化格式与纯校验逻辑。
// 事实源：specs/003-deterministic-flow-self-healing/data-model.md。
// 本模块不做任何 I/O，仅定义 wire 类型（camelCase）与可单测的纯函数。

/** 当前流格式版本，加载更高版本时按不兼容处理。 */
export const CURRENT_FLOW_FORMAT_VERSION = 1;

/** 首期仅 Android 真实可用。 */
export type FlowPlatform = "android";

/** 流来源：VLM 轨迹录制 / 手动投屏录制 / 从用例库导入。 */
export type FlowSource = "vlm_recorded" | "manual_recorded" | "imported";

/** 步骤操作类型。 */
export type FlowOp =
  | "launch_app"
  | "tap"
  | "input_text"
  | "swipe"
  | "scroll_until_visible"
  | "back"
  | "assert"
  | "wait";

export const FLOW_OPS: readonly FlowOp[] = [
  "launch_app",
  "tap",
  "input_text",
  "swipe",
  "scroll_until_visible",
  "back",
  "assert",
  "wait",
];

/** 需要定位元素的操作（缺少 locators 视为非法）。 */
export const LOCATOR_REQUIRED_OPS: readonly FlowOp[] = [
  "tap",
  "input_text",
  "swipe",
  "scroll_until_visible",
];

/** 定位策略类型，按确定性强弱排序。 */
export type LocatorKind =
  | "resource_id"
  | "text"
  | "accessibility_id"
  | "ui_tree_path"
  | "vlm_anchor";

export const LOCATOR_KINDS: readonly LocatorKind[] = [
  "resource_id",
  "text",
  "accessibility_id",
  "ui_tree_path",
  "vlm_anchor",
];

/**
 * 定位策略优先级：数值越小越优先。
 * selector（resource_id/text/accessibility_id）→ UI 树路径 → VLM 视觉锚点兜底。
 */
const LOCATOR_PRIORITY: Record<LocatorKind, number> = {
  resource_id: 0,
  text: 1,
  accessibility_id: 2,
  ui_tree_path: 3,
  vlm_anchor: 4,
};

export type TextMatch = "exact" | "contains";

/** 归一化视觉锚点坐标（0–1000 体系，与既有 UI Agent 归一化坐标一致）。 */
export interface VlmAnchor {
  xNorm: number;
  yNorm: number;
}

export interface Locator {
  kind: LocatorKind;
  value: string;
  match?: TextMatch;
  vlmAnchor?: VlmAnchor;
}

export type AssertionType = "hard" | "soft";

/** 硬断言：基于 selector / 文案的精确或包含匹配。 */
export interface HardAssertionExpr {
  locatorKind: LocatorKind;
  value: string;
  match: TextMatch;
  present: boolean;
}

/** 软断言：交 VLM 自评。 */
export interface SoftAssertionExpr {
  description: string;
}

export type Assertion =
  | { type: "hard"; expr: HardAssertionExpr }
  | { type: "soft"; expr: SoftAssertionExpr };

export interface WaitPolicy {
  /** UI 稳定判定窗口（毫秒）。 */
  stabilizeMs: number;
  /** 该步最大等待（毫秒）。 */
  timeoutMs: number;
}

export interface FlowStep {
  /** 步骤序号，从 0 起连续。 */
  index: number;
  op: FlowOp;
  /** 多策略定位，按优先级排列（仅定位类 op 需要）。 */
  locators?: Locator[];
  /** op 参数（如 input_text.text、swipe.direction、launch_app.package）。 */
  args?: Record<string, unknown>;
  assert?: Assertion;
  /** 等待覆盖；缺省用全局策略。 */
  wait?: WaitPolicy;
  /** 自然语言意图，自愈时喂给 VLM；录制自 VLM 轨迹时填充。 */
  intent?: string;
}

export interface TestFlow {
  id: string;
  workspaceId: string;
  name: string;
  appPackage: string;
  platform: FlowPlatform;
  formatVersion: number;
  source: FlowSource;
  selfHealingEnabled: boolean;
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}

export type FlowRunConclusion = "passed" | "failed" | "blocked";

export type FlowRunStepStatus = "passed" | "failed" | "blocked" | "healed";

export interface FlowRun {
  id: string;
  flowId: string;
  workspaceId: string;
  deviceId: string;
  startedAt: string;
  finishedAt: string | null;
  conclusion: FlowRunConclusion;
  healingTriggered: boolean;
  /** 大模型 token 消耗；纯确定性回放应为 0，自愈步另计。 */
  llmTokenUsed: number;
  summary: string;
}

export interface FlowRunStep {
  runId: string;
  index: number;
  op: string;
  locatorUsed?: { kind: LocatorKind; value: string };
  status: FlowRunStepStatus;
  assertResult?: { ok: boolean; reason?: string };
  screenshotPath?: string;
  durationMs: number;
}

export type HealingStatus = "pending" | "accepted" | "flagged_defect";

export interface HealingRevision {
  id: string;
  flowId: string;
  stepIndex: number;
  runId: string;
  originalLocators: Locator[];
  healedLocator: Locator;
  evidenceScreenshotPath?: string;
  status: HealingStatus;
  createdAt: string;
}

// ---- 类型守卫 ----

export function isFlowOp(value: unknown): value is FlowOp {
  return typeof value === "string" && (FLOW_OPS as readonly string[]).includes(value);
}

export function isLocatorKind(value: unknown): value is LocatorKind {
  return (
    typeof value === "string" && (LOCATOR_KINDS as readonly string[]).includes(value)
  );
}

/** 确定性定位（不调大模型）：除 vlm_anchor 外均为确定性级。 */
export function isLocatorDeterministic(kind: LocatorKind): boolean {
  return kind !== "vlm_anchor";
}

/** op 是否需要定位元素。 */
export function isLocatorRequiredOp(op: FlowOp): boolean {
  return (LOCATOR_REQUIRED_OPS as readonly FlowOp[]).includes(op);
}

/** 加载兼容性：不接受高于当前实现的格式版本。 */
export function isFlowFormatCompatible(formatVersion: number): boolean {
  return (
    Number.isInteger(formatVersion) &&
    formatVersion >= 1 &&
    formatVersion <= CURRENT_FLOW_FORMAT_VERSION
  );
}

function readPackageFromStepArgs(
  args: Record<string, unknown> | undefined,
): string {
  if (!args || typeof args.package !== "string") {
    return "";
  }
  return args.package.trim();
}

/** 从步骤草稿推断目标应用包名（优先 `launch_app` 的 package 参数）。 */
export function inferAppPackageFromFlowSteps(steps: FlowStep[]): string {
  for (const step of steps) {
    if (step.op === "launch_app") {
      const pkg = readPackageFromStepArgs(step.args);
      if (pkg) {
        return pkg;
      }
    }
  }
  for (const step of steps) {
    const pkg = readPackageFromStepArgs(step.args);
    if (pkg) {
      return pkg;
    }
  }
  return "";
}

/**
 * 按优先级排序定位策略（稳定排序，不改原数组）。
 * selector → ui_tree_path → vlm_anchor。
 */
export function sortLocatorsByPriority(locators: Locator[]): Locator[] {
  return locators
    .map((locator, originalIndex) => ({ locator, originalIndex }))
    .sort((a, b) => {
      const delta =
        LOCATOR_PRIORITY[a.locator.kind] - LOCATOR_PRIORITY[b.locator.kind];
      return delta !== 0 ? delta : a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.locator);
}

// ---- 校验（返回稳定错误码，UI 侧映射 i18n） ----

export interface FlowValidationIssue {
  /** 稳定错误码，便于测试与 i18n 映射。 */
  code: string;
  /** 定位路径，如 `steps[2].locators[0]`。 */
  path: string;
  /** 中文开发态说明。 */
  message: string;
}

export interface FlowValidationResult {
  ok: boolean;
  issues: FlowValidationIssue[];
}

function validateLocator(locator: Locator, path: string): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  if (!isLocatorKind(locator.kind)) {
    issues.push({
      code: "locator.kind.invalid",
      path,
      message: `非法定位策略类型：${String(locator.kind)}`,
    });
  }
  if (locator.kind === "vlm_anchor") {
    if (!locator.vlmAnchor) {
      issues.push({
        code: "locator.vlmAnchor.missing",
        path,
        message: "vlm_anchor 定位缺少归一化坐标 vlmAnchor",
      });
    }
  } else if (typeof locator.value !== "string" || locator.value.trim() === "") {
    issues.push({
      code: "locator.value.empty",
      path,
      message: "确定性定位的 value 不能为空",
    });
  }
  return issues;
}

function validateStep(step: FlowStep, position: number): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  const path = `steps[${position}]`;

  if (!isFlowOp(step.op)) {
    issues.push({
      code: "step.op.invalid",
      path,
      message: `非法操作类型：${String(step.op)}`,
    });
  }

  const locators = step.locators ?? [];
  if (isFlowOp(step.op) && isLocatorRequiredOp(step.op) && locators.length === 0) {
    issues.push({
      code: "step.locators.missing",
      path,
      message: `操作 ${step.op} 需要至少一个定位策略`,
    });
  }

  locators.forEach((locator, locatorIndex) => {
    issues.push(...validateLocator(locator, `${path}.locators[${locatorIndex}]`));
  });

  // 优先级序：确定性定位必须排在 vlm_anchor 之前。
  const firstVlmIndex = locators.findIndex((l) => l.kind === "vlm_anchor");
  if (firstVlmIndex >= 0) {
    const hasDeterministicAfterVlm = locators
      .slice(firstVlmIndex + 1)
      .some((l) => isLocatorDeterministic(l.kind));
    if (hasDeterministicAfterVlm) {
      issues.push({
        code: "step.locators.priorityOrder",
        path,
        message: "确定性定位策略必须排在 vlm_anchor 之前",
      });
    }
  }

  return issues;
}

/**
 * 校验整条流：名称/包名非空、格式版本兼容、步骤序号从 0 连续、每步定位合法且优先级有序。
 * 空步骤的草稿流允许存在（不报错）。
 */
export function validateFlow(flow: TestFlow): FlowValidationResult {
  const issues: FlowValidationIssue[] = [];

  if (typeof flow.name !== "string" || flow.name.trim() === "") {
    issues.push({ code: "flow.name.empty", path: "name", message: "流名称不能为空" });
  }
  if (typeof flow.appPackage !== "string" || flow.appPackage.trim() === "") {
    issues.push({
      code: "flow.appPackage.empty",
      path: "appPackage",
      message: "目标应用包名不能为空",
    });
  }
  if (!isFlowFormatCompatible(flow.formatVersion)) {
    issues.push({
      code: "flow.formatVersion.incompatible",
      path: "formatVersion",
      message: `不兼容的流格式版本：${String(flow.formatVersion)}`,
    });
  }

  const steps = flow.steps ?? [];
  steps.forEach((step, position) => {
    if (step.index !== position) {
      issues.push({
        code: "step.index.nonSequential",
        path: `steps[${position}]`,
        message: `步骤序号应从 0 起连续，期望 ${position} 实为 ${String(step.index)}`,
      });
    }
    issues.push(...validateStep(step, position));
  });

  return { ok: issues.length === 0, issues };
}
