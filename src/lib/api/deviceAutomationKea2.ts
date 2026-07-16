import { safeInvoke } from "@/lib/dev-bridge/safeInvoke";

export type Kea2ToolStatus = {
  available: boolean;
  toolRoot?: string;
  pythonCommand?: string;
  kea2Module?: string;
  version?: string;
  error?: string;
};

export async function getKea2ToolStatus(): Promise<Kea2ToolStatus> {
  return await safeInvoke<Kea2ToolStatus>("device_automation_kea2_get_tool_status", {});
}
