/**
 * 压测期间保持 uiautomator2 Python 会话存活（设备端 9008）。
 * u2.connect 脚本退出后华为等设备上 u2 可能不可达，Fastbot --agent-u2 会 ping 9008 失败并秒退。
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { resolveFastbotPythonCommand } from "./resolveFastbotPython";

const SESSION_READY_MARKER = "u2_session_ready";
const START_TIMEOUT_MS = 120_000;

export type U2SessionLogFn = (message: string) => void;

export class FastbotU2Session {
  #child: ChildProcessWithoutNullStreams | null = null;

  async start(deviceId: string, onLog?: U2SessionLogFn): Promise<void> {
    const trimmedDeviceId = deviceId.trim();
    if (!trimmedDeviceId) {
      throw new Error("deviceId 不能为空");
    }
    if (this.#child) {
      return;
    }

    onLog?.("正在初始化 uiautomator2（保持会话至压测结束）…");

    const script = `
import sys, time
try:
    import uiautomator2 as u2
except ImportError:
    print("missing_uiautomator2", flush=True)
    sys.exit(2)
serial = ${JSON.stringify(trimmedDeviceId)}
d = u2.connect(serial)
time.sleep(5)
d._device_server_port = 8090
print("${SESSION_READY_MARKER}", flush=True)
try:
    sys.stdin.read()
except Exception:
    pass
`;

    const python = resolveFastbotPythonCommand();
    const child = spawn(python, ["-c", script], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.#child = child;

    let settled = false;
    const ready = await new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("uiautomator2 会话启动超时（120s）"));
        }
      }, START_TIMEOUT_MS);

      const fail = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      };

      child.once("error", (error) => {
        fail(error);
      });

      child.once("exit", (code, signal) => {
        if (code === 2) {
          fail(
            new Error(
              "Fastbot 需要 uiautomator2。请执行：npm run electron:ensure:fastbot-python",
            ),
          );
          return;
        }
        fail(
          new Error(
            `uiautomator2 会话意外退出（code=${code ?? "null"} signal=${signal ?? "null"}）`,
          ),
        );
      });

      const rl = createInterface({ input: child.stdout });
      rl.on("line", (line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return;
        }
        if (trimmed === SESSION_READY_MARKER) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            rl.close();
            resolve(true);
          }
          return;
        }
        if (trimmed.includes("missing_uiautomator2")) {
          return;
        }
        onLog?.(`[u2] ${trimmed}`);
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        const text = chunk.toString().trim();
        if (text) {
          onLog?.(`[u2 stderr] ${text}`);
        }
      });
    });

    if (!ready) {
      throw new Error("uiautomator2 会话未就绪");
    }

    onLog?.("uiautomator2 已就绪");
  }

  stop(): void {
    const child = this.#child;
    if (!child) {
      return;
    }
    this.#child = null;
    try {
      child.stdin?.end();
    } catch {
      // 忽略
    }
    child.kill("SIGTERM");
  }
}
