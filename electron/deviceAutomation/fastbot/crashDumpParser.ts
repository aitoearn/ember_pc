/**
 * crash-dump.log 解析（对齐 Kea2 report/mixin.py CrashAnrMixin）。
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const CRASH_BLOCK_PATTERN =
  /(?:StepsCount:\s*(\d+)\s*\nCrashScreen:\s*([^\n]*)\s*\n)?(\d{14})\ncrash:\n([\s\S]*?)\n\/\/ crash end/g;
const ANR_BLOCK_PATTERN =
  /(?:StepsCount:\s*(\d+)\s*\nCrashScreen:\s*([^\n]+)\s*\n)?(\d{14})\nanr:\n([\s\S]*?)\nanr end/g;

export interface CrashDumpEventBase {
  stepsCount: number | null;
  crashScreen: string | null;
  time: string;
}

export interface CrashDumpCrashEvent extends CrashDumpEventBase {
  kind: "crash";
  exceptionType: string;
  process: string;
  stackTrace: string;
}

export interface CrashDumpAnrEvent extends CrashDumpEventBase {
  kind: "anr";
  reason: string;
  process: string;
  trace: string;
}

export type CrashDumpEvent = CrashDumpCrashEvent | CrashDumpAnrEvent;

export interface CrashDumpParseResult {
  crashEvents: CrashDumpCrashEvent[];
  anrEvents: CrashDumpAnrEvent[];
  sourcePath: string | null;
}

export function parseCrashDumpContent(
  content: string,
  screenshotsDir?: string | null,
): { crashEvents: CrashDumpCrashEvent[]; anrEvents: CrashDumpAnrEvent[] } {
  const crashEvents: CrashDumpCrashEvent[] = [];
  const anrEvents: CrashDumpAnrEvent[] = [];

  for (const match of content.matchAll(CRASH_BLOCK_PATTERN)) {
    const stepsCount = parseOptionalInt(match[1]);
    let crashScreen = match[2]?.trim() || null;
    const timestampRaw = match[3] ?? "";
    const crashContent = match[4] ?? "";
    if (!crashScreen && stepsCount != null && screenshotsDir) {
      crashScreen = resolveScreenshotForStep(screenshotsDir, stepsCount);
    }
    crashEvents.push({
      kind: "crash",
      stepsCount,
      crashScreen,
      time: formatCrashDumpTimestamp(timestampRaw),
      ...extractCrashInfo(crashContent),
    });
  }

  for (const match of content.matchAll(ANR_BLOCK_PATTERN)) {
    const stepsCount = parseOptionalInt(match[1]);
    let crashScreen = match[2]?.trim() || null;
    const timestampRaw = match[3] ?? "";
    const anrContent = match[4] ?? "";
    if (!crashScreen && stepsCount != null && screenshotsDir) {
      crashScreen = resolveScreenshotForStep(screenshotsDir, stepsCount);
    }
    anrEvents.push({
      kind: "anr",
      stepsCount,
      crashScreen,
      time: formatCrashDumpTimestamp(timestampRaw),
      ...extractAnrInfo(anrContent),
    });
  }

  return { crashEvents, anrEvents };
}

export function readCrashDumpFromOutputTree(
  localOutputDir: string,
): CrashDumpParseResult {
  const crashDumpPath = findFileInTree(localOutputDir, "crash-dump.log");
  if (!crashDumpPath) {
    return { crashEvents: [], anrEvents: [], sourcePath: null };
  }
  const screenshotsDir = findScreenshotsDir(path.dirname(crashDumpPath));
  const content = readFileSync(crashDumpPath, "utf8");
  const parsed = parseCrashDumpContent(content, screenshotsDir);
  return {
    ...parsed,
    sourcePath: crashDumpPath,
  };
}

function extractCrashInfo(crashContent: string): {
  exceptionType: string;
  process: string;
  stackTrace: string;
} {
  const lines = crashContent.trim().split("\n");
  let exceptionType = "Unknown";
  let process = "Unknown";
  const stackLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("// CRASH:")) {
      const pidMatch = line.match(/\(pid\s+(\d+)\)/);
      if (pidMatch) {
        process = pidMatch[1];
      }
    } else if (line.startsWith("// Long Msg:")) {
      const exceptionMatch = line.match(/\/\/ Long Msg:\s+([^:]+)/);
      if (exceptionMatch) {
        exceptionType = exceptionMatch[1].trim();
      }
    }
    if (line.startsWith("//")) {
      const cleanLine = line.startsWith("// ") ? line.slice(3) : line.slice(2);
      stackLines.push(cleanLine);
    }
  }

  return {
    exceptionType,
    process,
    stackTrace: stackLines.join("\n"),
  };
}

function extractAnrInfo(anrContent: string): {
  reason: string;
  process: string;
  trace: string;
} {
  const lines = anrContent.trim().split("\n");
  let reason = "Unknown";
  let process = "Unknown";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("// ANR:")) {
      const pidMatch = line.match(/\(pid\s+(\d+)\)/);
      if (pidMatch) {
        process = pidMatch[1];
      }
    } else if (line.startsWith("Reason:")) {
      const reasonMatch = line.match(/Reason:\s+(.+)/);
      if (reasonMatch) {
        reason = simplifyAnrReason(reasonMatch[1].trim());
      }
    }
  }

  return {
    reason,
    process,
    trace: anrContent,
  };
}

function simplifyAnrReason(fullReason: string): string {
  const parenIndex = fullReason.indexOf("(");
  if (parenIndex > 0) {
    return fullReason.slice(0, parenIndex).trim();
  }
  return fullReason;
}

function formatCrashDumpTimestamp(raw: string): string {
  if (!/^\d{14}$/.test(raw)) {
    return raw;
  }
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.slice(8, 10);
  const minute = raw.slice(10, 12);
  const second = raw.slice(12, 14);
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function parseOptionalInt(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveScreenshotForStep(
  screenshotsDir: string,
  stepsCount: number,
): string | null {
  if (!existsSync(screenshotsDir)) {
    return null;
  }
  const prefix = `screenshot-${stepsCount}-`;
  for (const name of readdirSync(screenshotsDir)) {
    if (name.startsWith(prefix) && name.endsWith(".png")) {
      return name;
    }
  }
  return null;
}

function findScreenshotsDir(outputDir: string): string | null {
  const direct = path.join(outputDir, "screenshots");
  if (existsSync(direct)) {
    return direct;
  }
  return findDirInTree(outputDir, "screenshots");
}

function findFileInTree(root: string, filename: string, depth = 0): string | null {
  if (depth > 5) {
    return null;
  }
  const direct = path.join(root, filename);
  if (existsSync(direct)) {
    return direct;
  }
  try {
    for (const name of readdirSync(root)) {
      const full = path.join(root, name);
      if (statSync(full).isDirectory()) {
        const found = findFileInTree(full, filename, depth + 1);
        if (found) {
          return found;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

function findDirInTree(root: string, dirname: string, depth = 0): string | null {
  if (depth > 5) {
    return null;
  }
  const direct = path.join(root, dirname);
  if (existsSync(direct) && statSync(direct).isDirectory()) {
    return direct;
  }
  try {
    for (const name of readdirSync(root)) {
      const full = path.join(root, name);
      if (!statSync(full).isDirectory()) {
        continue;
      }
      const nested = findDirInTree(full, dirname, depth + 1);
      if (nested) {
        return nested;
      }
    }
  } catch {
    return null;
  }
  return null;
}
