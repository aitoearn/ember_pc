#!/usr/bin/env node
/**
 * 为 Fastbot 准备本机 uiautomator2：项目内 .venv-fastbot + pip install。
 * 开发态 electron:build:host:dev 与 run-dev 会消费返回的 Python 路径。
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const VENV_DIR = path.join(REPO_ROOT, ".venv-fastbot");

function resolveVenvPython() {
  if (process.platform === "win32") {
    return path.join(VENV_DIR, "Scripts", "python.exe");
  }
  return path.join(VENV_DIR, "bin", "python3");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    cwd: REPO_ROOT,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function canImportUiautomator2(pythonPath) {
  const result = run(pythonPath, ["-c", "import uiautomator2"], {
    stdio: "pipe",
  });
  return result.status === 0;
}

function resolveSystemPython() {
  const candidates =
    process.platform === "win32" ? ["python", "py", "-3"] : ["python3", "python"];
  for (const candidate of candidates) {
    const probe = run(candidate, ["--version"], { stdio: "pipe" });
    if (probe.status === 0) {
      return candidate;
    }
  }
  throw new Error("未找到可用的 python3，请先安装 Python 3。");
}

export function ensureFastbotPython() {
  const venvPython = resolveVenvPython();

  if (!existsSync(venvPython)) {
    const systemPython = resolveSystemPython();
    console.log(
      `[device-automation] 正在创建 Fastbot Python 虚拟环境：${VENV_DIR}`,
    );
    const create = run(systemPython, ["-m", "venv", VENV_DIR], {
      stdio: "inherit",
    });
    if (create.status !== 0) {
      throw new Error(
        `创建 .venv-fastbot 失败：${create.stderr?.trim() || create.stdout?.trim()}`,
      );
    }
  }

  if (!canImportUiautomator2(venvPython)) {
    console.log(
      "[device-automation] 正在安装 uiautomator2（Fastbot 依赖）…",
    );
    const install = run(venvPython, ["-m", "pip", "install", "uiautomator2"], {
      stdio: "inherit",
    });
    if (install.status !== 0) {
      throw new Error(
        `pip install uiautomator2 失败：${install.stderr?.trim() || install.stdout?.trim()}`,
      );
    }
  }

  if (!canImportUiautomator2(venvPython)) {
    throw new Error("uiautomator2 安装后仍无法 import，请检查网络与 pip 日志。");
  }

  console.log(`[device-automation] Fastbot Python 就绪：${venvPython}`);
  return venvPython;
}

async function main() {
  const pythonPath = ensureFastbotPython();
  process.stdout.write(`${pythonPath}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
