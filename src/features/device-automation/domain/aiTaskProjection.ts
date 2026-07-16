import type {
  DeviceAutomationAiTaskEvent,
  DeviceAutomationGenieStep,
} from "../types";

const TERMINAL_TASK_STATUSES = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "TIMEOUT",
]);

export function isTerminalAiTaskStatus(status: string): boolean {
  return TERMINAL_TASK_STATUSES.has(status.trim().toUpperCase());
}

function readPayloadString(
  payload: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function projectGenieStepsFromEvents(
  events: DeviceAutomationAiTaskEvent[],
): DeviceAutomationGenieStep[] {
  const steps: DeviceAutomationGenieStep[] = [];
  for (const event of events) {
    if (event.event_type !== "step") {
      continue;
    }
    const payload = event.payload ?? {};
    const stepIndex =
      typeof payload.step === "number"
        ? payload.step
        : steps.length + 1;
    const thought = readPayloadString(payload, [
      "thinking",
      "thought",
      "reasoning",
    ]);
    const action = readPayloadString(payload, ["action", "message", "result"]);
    const desc =
      readPayloadString(payload, ["summary", "description", "message"]) ??
      action ??
      thought ??
      `Step ${stepIndex}`;
    steps.push({
      index: stepIndex,
      desc,
      status: "completed",
      thought,
      action,
    });
  }
  return steps;
}

export function markRunningGenieStep(
  steps: DeviceAutomationGenieStep[],
): DeviceAutomationGenieStep[] {
  if (steps.length === 0) {
    return steps;
  }
  return steps.map((step, index) => ({
    ...step,
    status: index === steps.length - 1 ? "running" : "completed",
  }));
}
