import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";

/** steps.log 单条记录（JSON 行，对齐 Kea2 bug_report_generator）。 */
export interface FastbotStepLogEntry {
  type: string;
  monkeyStepsCount?: number;
  screenshot?: string;
  info?: string | Record<string, unknown>;
  raw: string;
}

export interface FastbotStepsLogSummary {
  totalLines: number;
  monkeyStepCount: number;
  scriptInfoCount: number;
  crashCount: number;
  anrCount: number;
  killAppsCount: number;
  lastMonkeyStep?: number;
}

export function parseStepsLogLine(line: string): FastbotStepLogEntry | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const stepData = JSON.parse(trimmed) as Record<string, unknown>;
    const type = String(stepData.Type ?? "");
    if (!type) {
      return null;
    }
    let info: string | Record<string, unknown> | undefined;
    const rawInfo = stepData.Info;
    if (typeof rawInfo === "string") {
      const stripped = rawInfo.trim();
      if (stripped.startsWith("{") || stripped.startsWith("[")) {
        try {
          info = JSON.parse(stripped) as Record<string, unknown>;
        } catch {
          info = rawInfo;
        }
      } else {
        info = rawInfo;
      }
    } else if (rawInfo && typeof rawInfo === "object") {
      info = rawInfo as Record<string, unknown>;
    }
    const monkeyStepsRaw = stepData.MonkeyStepsCount;
    const monkeyStepsCount =
      typeof monkeyStepsRaw === "number"
        ? monkeyStepsRaw
        : typeof monkeyStepsRaw === "string" && monkeyStepsRaw.trim()
          ? Number(monkeyStepsRaw)
          : undefined;
    return {
      type,
      monkeyStepsCount:
        monkeyStepsCount !== undefined && Number.isFinite(monkeyStepsCount)
          ? monkeyStepsCount
          : undefined,
      screenshot:
        typeof stepData.Screenshot === "string" ? stepData.Screenshot : undefined,
      info,
      raw: trimmed,
    };
  } catch {
    return null;
  }
}

export function parseStepsLogContent(content: string): FastbotStepLogEntry[] {
  const entries: FastbotStepLogEntry[] = [];
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseStepsLogLine(line);
    if (parsed) {
      entries.push(parsed);
    }
  }
  return entries;
}

export function readStepsLogFile(stepsLogPath: string): FastbotStepLogEntry[] {
  if (!existsSync(stepsLogPath)) {
    return [];
  }
  return parseStepsLogContent(readFileSync(stepsLogPath, "utf8"));
}

export function summarizeStepsLog(
  entries: FastbotStepLogEntry[],
): FastbotStepsLogSummary {
  let monkeyStepCount = 0;
  let scriptInfoCount = 0;
  let crashCount = 0;
  let anrCount = 0;
  let killAppsCount = 0;
  let lastMonkeyStep: number | undefined;

  for (const entry of entries) {
    if (entry.type === "Monkey") {
      monkeyStepCount += 1;
      if (entry.info === "kill_apps") {
        killAppsCount += 1;
      }
      if (entry.monkeyStepsCount !== undefined) {
        lastMonkeyStep = Math.max(
          lastMonkeyStep ?? 0,
          entry.monkeyStepsCount,
        );
      }
    }
    if (entry.type === "ScriptInfo") {
      scriptInfoCount += 1;
      const info =
        typeof entry.info === "object" && entry.info
          ? entry.info
          : undefined;
      const state = info?.state;
      if (state === "fail" || state === "error") {
        scriptInfoCount += 0;
      }
    }
    const infoText =
      typeof entry.info === "string"
        ? entry.info.toUpperCase()
        : JSON.stringify(entry.info ?? "").toUpperCase();
    if (infoText.includes("CRASH")) {
      crashCount += 1;
    }
    if (infoText.includes("ANR")) {
      anrCount += 1;
    }
  }

  return {
    totalLines: entries.length,
    monkeyStepCount,
    scriptInfoCount,
    crashCount,
    anrCount,
    killAppsCount,
    lastMonkeyStep,
  };
}

export function findStepsLogPath(localOutputDir: string): string | null {
  const direct = `${localOutputDir}/steps.log`;
  if (existsSync(direct)) {
    return direct;
  }
  // adb pull 目录时可能多一层 output_* 子目录
  return null;
}

export function resolveStepsLogInOutputTree(localOutputDir: string): string | null {
  const candidates: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 4) {
      return;
    }
    const steps = `${dir}/steps.log`;
    if (existsSync(steps)) {
      candidates.push(steps);
    }
    try {
      for (const name of readdirSync(dir)) {
        const full = `${dir}/${name}`;
        if (statSync(full).isDirectory()) {
          walk(full, depth + 1);
        }
      }
    } catch {
      // 忽略不可读目录
    }
  };
  walk(localOutputDir, 0);
  return candidates[0] ?? null;
}
