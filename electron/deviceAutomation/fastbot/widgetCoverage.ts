/**
 * Widget 覆盖率分析（对齐 Kea2 report/widget_coverage.py）。
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  parseStepsLogLine,
  resolveStepsLogInOutputTree,
} from "./stepsLogParser";

export interface WidgetCoverageRecord {
  stepsCount: number;
  coverage: number;
}

export interface WidgetCoverageSummary {
  uniqueWidgetCount: number;
  records: WidgetCoverageRecord[];
  triggeredWidgets: string[];
  widgetCoverageLogPath: string | null;
  widgetCoverageReportPath: string | null;
}

export function generateWidgetCoverageReport(
  localOutputDir: string,
  profilePeriod = 10,
): WidgetCoverageSummary {
  const stepsLogPath = resolveStepsLogInOutputTree(localOutputDir);
  if (!stepsLogPath) {
    return emptyWidgetCoverageSummary();
  }

  const content = readFileSync(stepsLogPath, "utf8");
  const triggeredWidgets = new Set<string>();
  const records: WidgetCoverageRecord[] = [];
  let lastRecordedStep = -1;
  let finalStepsCount = 0;

  for (const line of content.split(/\r?\n/)) {
    const entry = parseStepsLogLine(line);
    if (!entry) {
      continue;
    }
    if (entry.type === "Monkey") {
      const widgetRepr = getWidgetRepr(entry.info);
      if (widgetRepr) {
        triggeredWidgets.add(widgetRepr);
      }
    }
    const stepsCount = entry.monkeyStepsCount ?? 0;
    finalStepsCount = stepsCount;
    if (profilePeriod > 0 && stepsCount > 0 && stepsCount % profilePeriod === 0) {
      records.push({ stepsCount, coverage: triggeredWidgets.size });
      lastRecordedStep = stepsCount;
    }
  }

  if (finalStepsCount > 0 && finalStepsCount !== lastRecordedStep) {
    records.push({ stepsCount: finalStepsCount, coverage: triggeredWidgets.size });
  }

  const outputDir = path.dirname(stepsLogPath);
  const widgetList = [...triggeredWidgets].sort();
  let widgetCoverageLogPath: string | null = null;
  let widgetCoverageReportPath: string | null = null;

  if (widgetList.length > 0 || records.length > 0) {
    widgetCoverageLogPath = path.join(outputDir, "widget_coverage.log");
    writeFileSync(
      widgetCoverageLogPath,
      `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
      "utf8",
    );
    widgetCoverageReportPath = path.join(outputDir, "widget_coverage_report.txt");
    writeFileSync(
      widgetCoverageReportPath,
      widgetList.map((widget) => `${widget}\n`).join(""),
      "utf8",
    );
  }

  return {
    uniqueWidgetCount: triggeredWidgets.size,
    records,
    triggeredWidgets: widgetList,
    widgetCoverageLogPath,
    widgetCoverageReportPath,
  };
}

function getWidgetRepr(info: string | Record<string, unknown> | undefined): string | null {
  if (!info || typeof info === "string") {
    return null;
  }
  const act = typeof info.act === "string" ? info.act : "";
  const pos = info.pos;
  if (!act || !pos || typeof pos !== "object") {
    return null;
  }
  const posRecord = pos as Record<string, unknown>;
  const resourceId =
    typeof posRecord.resourceId === "string" ? posRecord.resourceId : "<AUTO>";
  const text = typeof posRecord.text === "string" ? posRecord.text : "";
  const desc = typeof posRecord.desc === "string" ? posRecord.desc : "";
  const activity =
    typeof posRecord.activity === "string" ? posRecord.activity : "unknown";
  return `${activity}::${resourceId}::${text}::${desc}::${act}`;
}

function emptyWidgetCoverageSummary(): WidgetCoverageSummary {
  return {
    uniqueWidgetCount: 0,
    records: [],
    triggeredWidgets: [],
    widgetCoverageLogPath: null,
    widgetCoverageReportPath: null,
  };
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
