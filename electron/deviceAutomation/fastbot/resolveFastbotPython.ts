import { existsSync } from "node:fs";
import path from "node:path";

/** 解析 Fastbot uiautomator2 引导用的 Python（env → 项目 .venv-fastbot → 系统 python3）。 */
export function resolveFastbotPythonCommand(cwd = process.cwd()): string {
  const fromEnv = process.env.DEVICE_AUTOMATION_PYTHON?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const venvCandidates =
    process.platform === "win32"
      ? [
          path.join(cwd, ".venv-fastbot", "Scripts", "python.exe"),
          path.join(cwd, ".venv-fastbot", "bin", "python3"),
        ]
      : [path.join(cwd, ".venv-fastbot", "bin", "python3")];

  for (const candidate of venvCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === "win32" ? "python" : "python3";
}
