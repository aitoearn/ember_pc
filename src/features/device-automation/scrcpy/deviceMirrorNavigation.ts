import { sendDeviceAutomationNavigation } from "@/lib/api/deviceAutomation";

/**
 * 镜像区工具栏返回/主页：对齐 aya Toolbar 的 main.inputKey。
 * Android 在 runtime 内走 adb shell input keyevent 3/4 快路径；iOS 等回退 agent-device。
 */
export async function sendAyaStyleMirrorNavigation(params: {
  action: "back" | "home";
  platform: string;
  deviceId: string;
}): Promise<{ ok: true }> {
  return await sendDeviceAutomationNavigation(params);
}
