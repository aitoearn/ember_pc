import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveToolRoot } from "./resolveToolRoot";
import { requestJson } from "./http";

const DEFAULT_PORT = 28766;
const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 45_000;

export type AutoGlmSidecarStatus = {
  running: boolean;
  ready: boolean;
  baseUrl: string;
  port: number;
  pid?: number;
  error?: string;
  rootPath?: string;
};

type SidecarLaunchPlan = {
  cwd: string;
  command: string;
  args: string[];
};

function readConfiguredPort(): number {
  const raw = process.env.DEVICE_AUTOMATION_AUTOGLM_PORT?.trim();
  if (!raw) {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return DEFAULT_PORT;
  }
  return parsed;
}

function resolveAutoGlmRoot(): string | null {
  return resolveToolRoot({
    envVar: "DEVICE_AUTOMATION_AUTOGLM_ROOT",
    siblingDirName: "AutoGLM-GUI",
  });
}

function resolveSidecarLaunchPlan(rootPath: string): SidecarLaunchPlan {
  const uvLockPath = path.join(rootPath, "uv.lock");
  if (existsSync(uvLockPath)) {
    return {
      cwd: rootPath,
      command: "uv",
      args: ["run", "python", "-m", "AutoGLM_GUI"],
    };
  }

  const pythonCandidates = [
    process.env.DEVICE_AUTOMATION_PYTHON?.trim(),
    "python3",
    "python",
  ].filter((value): value is string => Boolean(value?.trim()));

  return {
    cwd: rootPath,
    command: pythonCandidates[0] ?? "python3",
    args: ["-m", "AutoGLM_GUI"],
  };
}

async function fetchHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await requestJson(`${baseUrl}/api/health`);
    return (
      typeof response === "object" &&
      response !== null &&
      (response as { status?: unknown }).status === "healthy"
    );
  } catch {
    return false;
  }
}

async function waitForHealth(baseUrl: string): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < HEALTH_POLL_TIMEOUT_MS) {
    if (await fetchHealth(baseUrl)) {
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, HEALTH_POLL_INTERVAL_MS);
    });
  }
  return false;
}

export class AutoGlmSidecarHost {
  #child: ChildProcess | null = null;
  #port = readConfiguredPort();
  #rootPath: string | null = null;
  #startingPromise: Promise<AutoGlmSidecarStatus> | null = null;
  #lastError: string | undefined;

  getStatus(): AutoGlmSidecarStatus {
    const baseUrl = `http://127.0.0.1:${this.#port}`;
    return {
      running: this.#child !== null && !this.#child.killed,
      ready: false,
      baseUrl,
      port: this.#port,
      pid: this.#child?.pid,
      error: this.#lastError,
      rootPath: this.#rootPath ?? undefined,
    };
  }

  /** 探测 sidecar 是否已在运行，不触发冷启动。 */
  async probeReady(): Promise<AutoGlmSidecarStatus | null> {
    const baseUrl = `http://127.0.0.1:${this.#port}`;
    if (!(await fetchHealth(baseUrl))) {
      return null;
    }
    this.#lastError = undefined;
    return {
      running: true,
      ready: true,
      baseUrl,
      port: this.#port,
      pid: this.#child?.pid,
      rootPath: this.#rootPath ?? undefined,
    };
  }

  async ensure(): Promise<AutoGlmSidecarStatus> {
    const baseUrl = `http://127.0.0.1:${this.#port}`;
    if (await fetchHealth(baseUrl)) {
      this.#lastError = undefined;
      return {
        running: true,
        ready: true,
        baseUrl,
        port: this.#port,
        pid: this.#child?.pid,
        rootPath: this.#rootPath ?? undefined,
      };
    }

    if (this.#startingPromise) {
      return await this.#startingPromise;
    }

    this.#startingPromise = this.#startLocked();
    try {
      return await this.#startingPromise;
    } finally {
      this.#startingPromise = null;
    }
  }

  async #startLocked(): Promise<AutoGlmSidecarStatus> {
    const baseUrl = `http://127.0.0.1:${this.#port}`;
    const rootPath = resolveAutoGlmRoot();
    if (!rootPath) {
      const error =
        "未找到 AutoGLM-GUI 目录。请设置环境变量 DEVICE_AUTOMATION_AUTOGLM_ROOT。";
      this.#lastError = error;
      return {
        running: false,
        ready: false,
        baseUrl,
        port: this.#port,
        error,
      };
    }

    this.#rootPath = rootPath;
    const launchPlan = resolveSidecarLaunchPlan(rootPath);
    const args = [
      ...launchPlan.args,
      "--host",
      "127.0.0.1",
      "--port",
      String(this.#port),
      "--no-browser",
      "--no-log-file",
    ];

    console.info("[device-automation] 正在启动 AutoGLM-GUI sidecar", {
      cwd: launchPlan.cwd,
      command: launchPlan.command,
      args,
    });

    const child = spawn(launchPlan.command, args, {
      cwd: launchPlan.cwd,
      env: {
        ...process.env,
        AUTOGLM_NO_BROWSER: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.#child = child;

    child.stdout.on("data", (chunk) => {
      console.info(`[device-automation][autoglm][stdout] ${String(chunk).trim()}`);
    });
    child.stderr.on("data", (chunk) => {
      console.warn(`[device-automation][autoglm][stderr] ${String(chunk).trim()}`);
    });
    child.on("exit", (code, signal) => {
      console.warn("[device-automation] AutoGLM sidecar 已退出", { code, signal });
      if (this.#child === child) {
        this.#child = null;
      }
    });

    const ready = await waitForHealth(baseUrl);
    if (!ready) {
      const error = "AutoGLM-GUI 服务启动超时，请检查 Python 依赖。";
      this.#lastError = error;
      await this.stop();
      return {
        running: false,
        ready: false,
        baseUrl,
        port: this.#port,
        error,
        rootPath,
      };
    }

    this.#lastError = undefined;
    return {
      running: true,
      ready: true,
      baseUrl,
      port: this.#port,
      pid: child.pid,
      rootPath,
    };
  }

  async stop(): Promise<void> {
    const child = this.#child;
    this.#child = null;
    if (!child || child.killed) {
      return;
    }
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
        resolve();
      }, 3_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async fetchApi(pathname: string, init?: { method?: string; body?: unknown }) {
    const status = await this.ensure();
    if (!status.ready) {
      throw new Error(status.error ?? "AutoGLM 服务尚未就绪");
    }
    const body =
      init?.body === undefined ? undefined : JSON.stringify(init.body);
    return await requestJson(`${status.baseUrl}${pathname}`, {
      method: init?.method,
      body,
    });
  }
}

export const autoGlmSidecar = new AutoGlmSidecarHost();
