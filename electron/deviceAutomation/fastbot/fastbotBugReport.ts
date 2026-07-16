import { writeFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  type FastbotStepLogEntry,
  readStepsLogFile,
  resolveStepsLogInOutputTree,
  summarizeStepsLog,
} from "./stepsLogParser";
import {
  readCrashDumpFromOutputTree,
  type CrashDumpAnrEvent,
  type CrashDumpCrashEvent,
} from "./crashDumpParser";
import { generateWidgetCoverageReport, type WidgetCoverageSummary } from "./widgetCoverage";

export interface FastbotBugReportMeta {
  sessionId: string;
  packageName: string;
  startedAt: string;
  stoppedAt: string;
  conclusion: string;
  logicViolationCount?: number;
}

export interface FastbotBugReportResult {
  reportPath: string;
  stepsLogPath: string | null;
  summary: ReturnType<typeof summarizeStepsLog>;
  crashDumpPath: string | null;
  crashEvents: CrashDumpCrashEvent[];
  anrEvents: CrashDumpAnrEvent[];
  widgetCoverage: WidgetCoverageSummary;
}

/** 基于 steps.log + crash-dump.log 生成 HTML 报告（Kea2 对齐 + Ember 兜底）。 */
export function generateFastbotBugReport(
  localOutputDir: string,
  meta: FastbotBugReportMeta,
  options?: { profilePeriod?: number },
): FastbotBugReportResult {
  const stepsLogPath =
    resolveStepsLogInOutputTree(localOutputDir) ??
    (existsSync(path.join(localOutputDir, "steps.log"))
      ? path.join(localOutputDir, "steps.log")
      : null);
  const entries = stepsLogPath ? readStepsLogFile(stepsLogPath) : [];
  const summary = summarizeStepsLog(entries);
  const coverageSnippet = readCoverageSnippet(localOutputDir);
  const crashDump = readCrashDumpFromOutputTree(localOutputDir);
  const widgetCoverage = generateWidgetCoverageReport(
    localOutputDir,
    options?.profilePeriod ?? 10,
  );

  const reportPath = path.join(localOutputDir, "bug_report.html");
  const html = buildHtml(
    meta,
    entries,
    summary,
    coverageSnippet,
    stepsLogPath,
    crashDump,
    widgetCoverage,
  );
  writeFileSync(reportPath, html, "utf8");

  return {
    reportPath,
    stepsLogPath,
    summary,
    crashDumpPath: crashDump.sourcePath,
    crashEvents: crashDump.crashEvents,
    anrEvents: crashDump.anrEvents,
    widgetCoverage,
  };
}

function readCoverageSnippet(localOutputDir: string): string {
  const candidates = ["coverage.log", "widget_coverage.log"];
  for (const name of candidates) {
    const filePath = findFileInTree(localOutputDir, name);
    if (!filePath) {
      continue;
    }
    try {
      const content = readFileSync(filePath, "utf8").trim();
      const lines = content.split(/\r?\n/).filter(Boolean);
      return lines.slice(-5).join("\n");
    } catch {
      continue;
    }
  }
  return "";
}

function findFileInTree(root: string, filename: string, depth = 0): string | null {
  if (depth > 4) {
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

function buildHtml(
  meta: FastbotBugReportMeta,
  entries: FastbotStepLogEntry[],
  summary: ReturnType<typeof summarizeStepsLog>,
  coverageSnippet: string,
  stepsLogPath: string | null,
  crashDump: ReturnType<typeof readCrashDumpFromOutputTree>,
  widgetCoverage: WidgetCoverageSummary,
): string {
  const timeline = entries
    .slice(-80)
    .map((entry) => formatTimelineRow(entry))
    .join("\n");
  const crashRows = crashDump.crashEvents
    .map(
      (event) =>
        `<tr><td>${escapeHtml(event.time)}</td><td>${escapeHtml(String(event.stepsCount ?? "-"))}</td><td>${escapeHtml(event.exceptionType)}</td><td>${escapeHtml(event.process)}</td><td>${escapeHtml(event.crashScreen ?? "-")}</td></tr>`,
    )
    .join("\n");
  const anrRows = crashDump.anrEvents
    .map(
      (event) =>
        `<tr><td>${escapeHtml(event.time)}</td><td>${escapeHtml(String(event.stepsCount ?? "-"))}</td><td>${escapeHtml(event.reason)}</td><td>${escapeHtml(event.process)}</td><td>${escapeHtml(event.crashScreen ?? "-")}</td></tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Ember Fastbot 压测报告 — ${escapeHtml(meta.packageName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.25rem; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 0.85rem; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; }
    pre { background: #f4f4f5; padding: 12px; overflow: auto; font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>Fastbot Monkey 压测报告（Kea2 对齐）</h1>
  <div class="meta">
    <p>包名：${escapeHtml(meta.packageName)}</p>
    <p>会话：${escapeHtml(meta.sessionId)}</p>
    <p>开始：${escapeHtml(meta.startedAt)} · 结束：${escapeHtml(meta.stoppedAt)}</p>
    <p>结论：${escapeHtml(meta.conclusion)}</p>
    <p>逻辑违反（invariant/property）：${meta.logicViolationCount ?? 0}</p>
    <p>steps.log：${escapeHtml(stepsLogPath ?? "未找到")}</p>
    <p>crash-dump.log：${escapeHtml(crashDump.sourcePath ?? "未找到")}</p>
  </div>
  <h2>摘要</h2>
  <table>
    <tr><th>Monkey 事件行</th><td>${summary.monkeyStepCount}</td></tr>
    <tr><th>ScriptInfo 行</th><td>${summary.scriptInfoCount}</td></tr>
    <tr><th>CRASH 标记</th><td>${summary.crashCount}</td></tr>
    <tr><th>ANR 标记</th><td>${summary.anrCount}</td></tr>
    <tr><th>crash-dump CRASH</th><td>${crashDump.crashEvents.length}</td></tr>
    <tr><th>crash-dump ANR</th><td>${crashDump.anrEvents.length}</td></tr>
    <tr><th>Widget 覆盖（唯一）</th><td>${widgetCoverage.uniqueWidgetCount}</td></tr>
    <tr><th>重启应用次数</th><td>${summary.killAppsCount}</td></tr>
    <tr><th>最后 Monkey 步</th><td>${summary.lastMonkeyStep ?? "-"}</td></tr>
  </table>
  <h2>Crash 事件（crash-dump.log）</h2>
  <table>
    <thead><tr><th>时间</th><th>步</th><th>异常</th><th>进程</th><th>截图</th></tr></thead>
    <tbody>${crashRows || "<tr><td colspan=\"5\">无</td></tr>"}</tbody>
  </table>
  <h2>ANR 事件（crash-dump.log）</h2>
  <table>
    <thead><tr><th>时间</th><th>步</th><th>原因</th><th>进程</th><th>截图</th></tr></thead>
    <tbody>${anrRows || "<tr><td colspan=\"5\">无</td></tr>"}</tbody>
  </table>
  ${coverageSnippet ? `<h2>覆盖率日志（末尾）</h2><pre>${escapeHtml(coverageSnippet)}</pre>` : ""}
  ${widgetCoverage.triggeredWidgets.length > 0 ? `<h2>Widget 覆盖（前 30）</h2><pre>${escapeHtml(widgetCoverage.triggeredWidgets.slice(0, 30).join("\n"))}</pre>` : ""}
  <h2>时间轴（最近 ${Math.min(entries.length, 80)} 条）</h2>
  <table>
    <thead><tr><th>步</th><th>类型</th><th>信息</th><th>截图</th></tr></thead>
    <tbody>${timeline || "<tr><td colspan=\"4\">无 steps.log 数据</td></tr>"}</tbody>
  </table>
</body>
</html>`;
}

function formatTimelineRow(entry: FastbotStepLogEntry): string {
  const step = entry.monkeyStepsCount ?? "-";
  const info =
    typeof entry.info === "string"
      ? entry.info
      : JSON.stringify(entry.info ?? "");
  const shot = entry.screenshot ?? "";
  return `<tr>
    <td>${escapeHtml(String(step))}</td>
    <td>${escapeHtml(entry.type)}</td>
    <td>${escapeHtml(info.slice(0, 200))}</td>
    <td>${escapeHtml(shot)}</td>
  </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
