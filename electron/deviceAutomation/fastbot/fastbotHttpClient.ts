import { execAdbSync } from "../scrcpyAdbFastPath";

/** 与设备 Fastbot HTTP 服务端口一致，避免 session 哈希端口与 u2 默认 9008 混淆。 */
export const FASTBOT_HTTP_LOCAL_PORT = 8090;

export class FastbotHttpClient {
  readonly #deviceId: string;
  readonly #localPort: number;
  #forwarded = false;

  constructor(deviceId: string, localPort = FASTBOT_HTTP_LOCAL_PORT) {
    this.#deviceId = deviceId;
    this.#localPort = localPort;
  }

  get localPort(): number {
    return this.#localPort;
  }

  setupForward(): void {
    if (this.#forwarded) {
      return;
    }
    execAdbSync(this.#deviceId, [
      "forward",
      "--remove",
      `tcp:${this.#localPort}`,
    ]);
    const result = execAdbSync(this.#deviceId, [
      "forward",
      `tcp:${this.#localPort}`,
      "tcp:8090",
    ]);
    if (result.exitCode !== 0) {
      throw new Error(
        `adb forward tcp:${this.#localPort}→tcp:8090 失败：${result.stderr || result.stdout}`,
      );
    }
    this.#forwarded = true;
  }

  removeForward(): void {
    if (!this.#forwarded) {
      return;
    }
    execAdbSync(this.#deviceId, ["forward", "--remove", `tcp:${this.#localPort}`]);
    this.#forwarded = false;
  }

  async ping(): Promise<void> {
    await this.request("GET", "/ping");
  }

  async init(body: {
    takeScreenshots: boolean;
    preFailureScreenshots: number;
    postFailureScreenshots: number;
    logStamp: string;
    deviceOutputRoot: string;
  }): Promise<string> {
    const text = await this.requestText("POST", "/init", body);
    const match = text.match(/outputDir:(.+)/);
    return match?.[1]?.trim() ?? text.trim();
  }

  async stepMonkey(body: {
    steps_count: number;
    block_widgets: unknown[];
    block_trees: unknown[];
  }): Promise<string> {
    const json = await this.requestJson<{ result?: string }>(
      "POST",
      "/stepMonkey",
      body,
    );
    return json.result ?? "";
  }

  async stopMonkey(): Promise<string> {
    return await this.requestText("GET", "/stopMonkey");
  }

  /** 对齐 Kea2 FastbotManager.logScript → steps.log ScriptInfo。 */
  async logScript(body: {
    propName: string;
    startStepsCount: number;
    kind: string;
    state: string;
  }): Promise<string> {
    return await this.requestText("POST", "/logScript", body);
  }

  async waitForPing(
    maxAttempts = 30,
    delayMs = 2000,
    initialDelayMs = 3000,
  ): Promise<void> {
    this.setupForward();
    if (initialDelayMs > 0) {
      await sleep(initialDelayMs);
    }
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.ping();
        return;
      } catch {
        if (attempt === maxAttempts) {
          const forwards = execAdbSync(this.#deviceId, ["forward", "--list"]);
          const forwardHint =
            forwards.stdout.trim() || forwards.stderr.trim() || "（无 forward 记录）";
          throw new Error(
            `无法连接设备 Fastbot HTTP 服务（本机 ${this.#localPort} → 设备 8090）。` +
              `请确认 Fastbot 进程未崩溃，且本机已 pip install uiautomator2。adb forward：${forwardHint}`,
          );
        }
        await sleep(delayMs);
      }
    }
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    this.setupForward();
    const url = `http://127.0.0.1:${this.#localPort}${path}`;
    const init: RequestInit = {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    };
    const response = await fetch(url, init);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Fastbot HTTP ${method} ${path} 失败：${text}`);
    }
    return response;
  }

  private async requestText(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<string> {
    const response = await this.request(method, path, body);
    return await response.text();
  }

  private async requestJson<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await this.request(method, path, body);
    return (await response.json()) as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
