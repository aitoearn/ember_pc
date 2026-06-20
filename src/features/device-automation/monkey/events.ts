import type { MonkeyLogLine } from "./types";

export const DEVICE_AUTOMATION_MONKEY_EVENT = "device_automation_monkey_event";

export type DeviceAutomationMonkeyEventPayload = {
  sessionId: string;
  line: MonkeyLogLine;
};
