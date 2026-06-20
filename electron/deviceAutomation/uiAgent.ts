import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { app } from "electron";
import { resolveAdbPath } from "./deviceInventoryWatcher";
import { resolveNodeSpawn } from "./resolveNodeSpawn";

/** 事件发射器签名，与 ElectronHostCommands 的 #emit 一致。 */
export type UiAgentEventEmitter = (event: string, payload?: unknown) => void;

/** 渲染层下发的启动参数（不含模型凭证，凭证由 Host 注入）。 */
export interface StartUiAgentParams {
  taskId: string;
  deviceId: string;
  serial: string;
  instruction: string;
  /** OpenAI 兼容 baseUrl（来自 provider api_host）。 */
  baseUrl: string;
  /** 明文 API Key（由 Host 经 modelProviderKey/next 解析后注入）。 */
  apiKey: string;
  model: string;
  maxSteps?: number;
  memoryWindow?: number;
  packageName?: string;
  userNote?: string;
}

interface UiAgentTask {
  taskId: string;
  child: ChildProcess;
}

/** 事件桥前缀，渲染层 safeListen(`uiAgent:event:<taskId>`) 订阅。 */
export function uiAgentEventChannel(taskId: string): string {
  return `uiAgent:event:${taskId}`;
}

/**
 * 解析 sidecar 入口路径：env override > 打包资源目录 > 开发态 appPath。
 */
function resolveSidecarPath(): string {
  const override = process.env.UI_AGENT_SIDECAR_PATH?.trim();
  if (override && existsSync(override)) {
    return override;
  }
  const resourcesRoot =
    typeof process.resourcesPath === "string" ? process.resourcesPath : "";
  const candidates = [
    resourcesRoot
      ? path.join(resourcesRoot, "scripts", "ui-agent", "index.mjs")
      : "",
    path.join(app.getAppPath(), "scripts", "ui-agent", "index.mjs"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  // 兜底返回开发态路径，spawn 失败时由事件流报告错误
  return path.join(app.getAppPath(), "scripts", "ui-agent", "index.mjs");
}

/**
 * UI Agent 运行时：管理 sidecar 子进程生命周期，把 stdout 事件桥接到渲染层。
 *
 * 与 scrcpy 投屏链路并行：sidecar 自带 adb 截图与执行，不经 App Server。
 */
class UiAgentRuntime {
  readonly #tasks = new Map<string, UiAgentTask>();

  /** 启动一个 UI Agent 任务，返回 taskId。 */
  start(params: StartUiAgentParams, emit: UiAgentEventEmitter): { taskId: string } {
    const { taskId } = params;
    if (!taskId) {
      throw new Error("ui_agent_start 需要 taskId");
    }
    if (this.#tasks.has(taskId)) {
      throw new Error(`UI Agent 任务已存在：${taskId}`);
    }

    const channel = uiAgentEventChannel(taskId);
    const sidecarPath = resolveSidecarPath();
    const adbPath = resolveAdbPath(process.env) ?? "adb";
    const { command, env } = resolveNodeSpawn();

    const child = spawn(command, [sidecarPath], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    this.#tasks.set(taskId, { taskId, child });

    // stdout：逐行 JSON 事件 → 事件桥
    const rl = readline.createInterface({ input: child.stdout! });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      try {
        const event = JSON.parse(trimmed) as Record<string, unknown>;
        emit(channel, { taskId, ...event });
      } catch {
        // 非 JSON 行作为诊断日志透传
        emit(channel, { taskId, type: "log", message: trimmed });
      }
    });

    // stderr：诊断日志（中文）
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8").trim();
      if (text) {
        console.log(`[ui-agent:${taskId}] ${text}`);
      }
    });

    child.on("error", (error) => {
      emit(channel, {
        taskId,
        type: "error",
        message: `UI Agent 进程启动失败：${error.message}`,
      });
      this.#tasks.delete(taskId);
    });

    child.on("close", (code) => {
      rl.close();
      // 进程异常退出且未发过 done 事件时，补发一个失败终止
      if (code !== 0 && code !== null) {
        emit(channel, {
          taskId,
          type: "exit",
          code,
        });
      }
      this.#tasks.delete(taskId);
    });

    // 下发 task JSON 到 stdin
    const taskJson = JSON.stringify({
      taskId,
      instruction: params.instruction,
      adbPath,
      serial: params.serial,
      baseUrl: params.baseUrl,
      apiKey: params.apiKey,
      model: params.model,
      maxSteps: params.maxSteps,
      memoryWindow: params.memoryWindow,
      packageName: params.packageName,
      userNote: params.userNote,
    });
    child.stdin?.write(`${taskJson}\n`);
    child.stdin?.end();

    return { taskId };
  }

  /** 取消任务：向 sidecar 发 SIGTERM。 */
  cancel(taskId: string): { cancelled: boolean } {
    const task = this.#tasks.get(taskId);
    if (!task) {
      return { cancelled: false };
    }
    try {
      task.child.kill("SIGTERM");
    } catch {
      /* 进程可能已退出 */
    }
    this.#tasks.delete(taskId);
    return { cancelled: true };
  }

  /** 停止全部任务（应用退出时调用）。 */
  stopAll(): void {
    for (const task of this.#tasks.values()) {
      try {
        task.child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
    this.#tasks.clear();
  }
}

export const uiAgentRuntime = new UiAgentRuntime();
