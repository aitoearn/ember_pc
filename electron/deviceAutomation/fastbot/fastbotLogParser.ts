/**
 * Fastbot stdout 日志解析（对齐 Kea2 logWatcher.py）。
 */

import type { MonkeyLogLine } from "../../../src/features/device-automation/monkey/types";

/** Kea2 LogWatcher 尾部缓冲，避免跨 chunk 截断标记。 */
export const FASTBOT_LOG_TAIL_SIZE = 4096;

const PATTERN_EXCEPTION =
  /\[Fastbot\].+Internal\serror\n(?<exception_body>[\s\S]*)/;
const PATTERN_ANR =
  /(?:\[Fastbot\]\*\*\* ERROR \*\*\* NOT RESPONDING: (?<pkg>[\w.]+) \(pid \d+\)\n)?\[Fastbot\]\*\*\* ERROR \*\*\* ANR in (?<anr_pkg>[\w.]+) \((?<activity>[^)]+)\)/;
const PATTERN_CRASH =
  /\[Fastbot\]\*\*\* ERROR \*\*\* \/\/ CRASH: (?<crash_pkg>[\w.]+) \(pid \d+\) .*/;
const PATTERN_CRASH_AND_ANR =
  /App appears\s+(?<crash>\d+)\s+crash,\s+(?<anr>\d+)\s+anr/;

export interface FastbotLogParserState {
  tailBuffer: string;
  crashDetected: boolean;
  anrDetected: boolean;
  crashCount: number;
  anrCount: number;
  statisticPrinted: boolean;
}

export function createFastbotLogParserState(): FastbotLogParserState {
  return {
    tailBuffer: "",
    crashDetected: false,
    anrDetected: false,
    crashCount: 0,
    anrCount: 0,
    statisticPrinted: false,
  };
}

export interface FastbotLogParseCallbacks {
  onLogLine: (line: MonkeyLogLine) => void;
  onInternalError?: (message: string) => void;
}

/** 解析 Fastbot 日志片段（含跨 chunk 尾部拼接）。 */
export function appendAndParseFastbotLog(
  chunk: string,
  state: FastbotLogParserState,
  callbacks: FastbotLogParseCallbacks,
): void {
  const parseBuffer = state.tailBuffer + chunk;
  parseFastbotLogContent(parseBuffer, state, callbacks);
  state.tailBuffer = parseBuffer.slice(-FASTBOT_LOG_TAIL_SIZE);
}

function parseFastbotLogContent(
  content: string,
  state: FastbotLogParserState,
  callbacks: FastbotLogParseCallbacks,
): void {
  if (!content || !content.includes("[Fastbot]")) {
    return;
  }

  if (content.includes("Internal error")) {
    const exceptionMatch = PATTERN_EXCEPTION.exec(content);
    if (exceptionMatch?.groups?.exception_body?.trim()) {
      const message =
        `[Fastbot] Internal error:\n${exceptionMatch.groups.exception_body.trim()}`;
      callbacks.onLogLine({ ts: Date.now(), type: "error", message });
      callbacks.onInternalError?.(message);
    }
  }

  if (content.includes("[Fastbot]*** ERROR *** ANR")) {
    const anrMatch = PATTERN_ANR.exec(content);
    if (anrMatch) {
      const pkg =
        anrMatch.groups?.anr_pkg || anrMatch.groups?.pkg || "unknown";
      const activity = anrMatch.groups?.activity || "unknown";
      state.anrDetected = true;
      state.anrCount += 1;
      callbacks.onLogLine({
        ts: Date.now(),
        type: "anr",
        message: `[Fastbot] ANR: package=${pkg}, activity=${activity}`,
      });
    }
  }

  if (content.includes("[Fastbot]*** ERROR *** // CRASH:")) {
    const crashMatch = PATTERN_CRASH.exec(content);
    if (crashMatch) {
      const crashPkg = crashMatch.groups?.crash_pkg || "unknown";
      state.crashDetected = true;
      state.crashCount += 1;
      callbacks.onLogLine({
        ts: Date.now(),
        type: "crash",
        message: `[Fastbot] CRASH: package=${crashPkg}`,
      });
    }
  }

  if (!state.statisticPrinted && content.includes("Monkey is over!")) {
    const crashAnrMatch = PATTERN_CRASH_AND_ANR.exec(content);
    if (crashAnrMatch) {
      const crashCount = Number(crashAnrMatch.groups?.crash ?? 0);
      const anrCount = Number(crashAnrMatch.groups?.anr ?? 0);
      if (crashCount > 0) {
        state.crashDetected = true;
        state.crashCount = Math.max(state.crashCount, crashCount);
      }
      if (anrCount > 0) {
        state.anrDetected = true;
        state.anrCount = Math.max(state.anrCount, anrCount);
      }
      state.statisticPrinted = true;
      callbacks.onLogLine({
        ts: Date.now(),
        type: "log",
        message: `[Fastbot] 统计：crash=${crashCount}, anr=${anrCount}`,
      });
    }
  }
}

/** 按行解析 Fastbot 子进程 stdout/stderr（供 fastbotRunner 使用）。 */
export function parseFastbotProcessLine(
  raw: string,
  state: FastbotLogParserState,
  onLogLine: (line: MonkeyLogLine) => void,
): void {
  const line = raw.trim();
  if (!line) {
    return;
  }
  appendAndParseFastbotLog(`${line}\n`, state, { onLogLine });
}
