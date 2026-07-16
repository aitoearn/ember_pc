/**
 * 对齐 Kea2：Fastbot 启动后、check_alive 前初始化 uiautomator2（设备端 9008）。
 * --agent-u2 模式依赖设备上 u2 HTTP 服务，否则 Monkey 进程内会反复 ping 127.0.0.1:9008 失败。
 */

import * as childProcess from "node:child_process";
import { resolveFastbotPythonCommand } from "./resolveFastbotPython";

const BOOTSTRAP_TIMEOUT_MS = 120_000;

export type U2BootstrapLogFn = (message: string) => void;

/** 通过本机 Python uiautomator2 包连接设备并预热（与 Kea2 U2ScriptDriver.getInstance 一致）。 */
export function bootstrapUiautomator2ForFastbot(
  deviceId: string,
  onLog?: U2BootstrapLogFn,
): void {
  const trimmedDeviceId = deviceId.trim();
  if (!trimmedDeviceId) {
    throw new Error("deviceId 不能为空");
  }

  const log = (message: string) => {
    onLog?.(message);
  };

  log("正在初始化 uiautomator2（Kea2 对齐：u2.connect → proxy 8090）…");

  const script = `
import sys, time
try:
    import uiautomator2 as u2
except ImportError:
    print("missing_uiautomator2", flush=True)
    sys.exit(2)
serial = ${JSON.stringify(trimmedDeviceId)}
print("[u2] connecting to", serial, flush=True)
d = u2.connect(serial)
time.sleep(5)
d._device_server_port = 8090
print("u2_bootstrap_ok", flush=True)
`;

  const python = resolveFastbotPythonCommand();
  const result = childProcess.spawnSync(python, ["-c", script], {
    encoding: "utf8",
    timeout: BOOTSTRAP_TIMEOUT_MS,
    env: process.env,
    windowsHide: true,
  });

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  if (result.status === 0 && combined.includes("u2_bootstrap_ok")) {
    log("uiautomator2 已就绪");
    return;
  }

  if (
    result.status === 2 ||
    combined.includes("missing_uiautomator2") ||
    combined.includes("No module named 'uiautomator2'")
  ) {
    throw new Error(
      "Fastbot 需要 uiautomator2。请执行：npm run electron:ensure:fastbot-python" +
        "（或 pip install uiautomator2 / 设置 DEVICE_AUTOMATION_PYTHON）。",
    );
  }

  if (result.error) {
    throw new Error(`uiautomator2 初始化超时或启动失败：${result.error.message}`);
  }

  throw new Error(
    `uiautomator2 初始化失败（exit ${result.status ?? "unknown"}）：${combined || "无输出"}`,
  );
}
