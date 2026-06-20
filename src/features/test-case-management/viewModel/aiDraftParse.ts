/**
 * AI 生成草稿容错解析（US2）。
 *
 * 大模型输出常带 Markdown 代码块、前后多余说明、字段命名不一致或类型漂移。
 * 本模块把「原始文本」尽力解析为可入库的 `TestCase` 草稿数组（含 assertions），
 * 解析失败或部分字段缺失都不抛异常，而是给出可读 warning + 安全默认值。
 *
 * 纯函数，无副作用，由 `aiDraftParse.unit.test.ts` 覆盖（research R7）。
 */

import {
  TEST_CASE_PRIORITIES,
  TEST_CASE_TYPES,
  type TestCase,
  type TestCasePriority,
  type TestCaseStep,
  type TestCaseType,
} from "../types";

/** 解析结果：草稿数组 + 一句话警告（空串表示无警告）。 */
export interface AiDraftParseResult {
  drafts: TestCase[];
  warning: string;
}

export interface ParseAiDraftsOptions {
  /** 草稿默认归属模块；缺省为根（空串） */
  moduleId?: string;
  /** 生成唯一 id 的工厂，便于测试注入确定值 */
  idFactory?: () => string;
}

function defaultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

/** 去除 Markdown 代码块围栏并截取首个 JSON 数组/对象，尽力得到可解析片段。 */
function extractJsonSlice(raw: string): string {
  let text = raw.trim();
  // 去掉 ```json ... ``` / ``` ... ``` 围栏
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) {
    text = fence[1].trim();
  }
  // 优先取数组，其次取对象
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }
  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    return text.slice(objStart, objEnd + 1);
  }
  return text;
}

/** 把任意 JSON 值规整为「条目数组」：数组直接用；对象支持 {cases:[...]} 或单条对象。 */
function toItemArray(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    return parsed.filter(isRecord);
  }
  if (isRecord(parsed)) {
    const candidates = parsed.cases ?? parsed.testCases ?? parsed.items;
    if (Array.isArray(candidates)) {
      return candidates.filter(isRecord);
    }
    return [parsed];
  }
  return [];
}

function normalizePriority(value: string): TestCasePriority {
  const upper = value.toUpperCase();
  if ((TEST_CASE_PRIORITIES as readonly string[]).includes(upper)) {
    return upper as TestCasePriority;
  }
  // 兜底：把常见中文/高中低映射到 P1
  return "P2";
}

function normalizeType(value: string): TestCaseType {
  if ((TEST_CASE_TYPES as readonly string[]).includes(value)) {
    return value as TestCaseType;
  }
  return "功能";
}

function normalizeSteps(value: unknown): TestCaseStep[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item, index) => {
    if (typeof item === "string") {
      return { stepNo: index + 1, action: item.trim(), expected: "" };
    }
    if (isRecord(item)) {
      return {
        stepNo: index + 1,
        action: readString(item, "action", "operation", "step", "description", "desc"),
        expected: readString(item, "expected", "expectedResult", "expect", "result"),
      };
    }
    return { stepNo: index + 1, action: "", expected: "" };
  });
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : isRecord(item)
            ? readString(item, "text", "content", "assertion", "value")
            : "",
      )
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

function itemToDraft(
  item: Record<string, unknown>,
  index: number,
  options: Required<Pick<ParseAiDraftsOptions, "moduleId" | "idFactory">>,
  nowIso: string,
): TestCase {
  const caseId =
    readString(item, "caseId", "case_id", "id", "number") ||
    `AI-${nowIso.slice(0, 10).replace(/-/g, "")}-${String(index + 1).padStart(3, "0")}`;
  const assertions = normalizeStringList(
    item.assertions ?? item.assertion ?? item.expectedResults ?? item.checks,
  );
  return {
    id: options.idFactory(),
    caseId,
    title: readString(item, "title", "name", "caseName", "summary") || `用例 ${index + 1}`,
    moduleId: options.moduleId,
    priority: normalizePriority(readString(item, "priority", "level")),
    caseType: normalizeType(readString(item, "caseType", "type", "category")),
    status: "草稿",
    source: "AI生成",
    precondition: readString(item, "precondition", "preconditions", "pre", "given"),
    steps: normalizeSteps(item.steps ?? item.actions),
    assertions,
    tags: normalizeStringList(item.tags ?? item.labels),
    execResult: "未执行",
    remark: readString(item, "remark", "note", "comment"),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * 把 LLM 原始文本解析为 TestCase 草稿数组（来源标记为「AI生成」，状态「草稿」）。
 *
 * 永不抛异常：解析失败返回空草稿 + warning；部分字段缺失用安全默认值补齐。
 */
export function parseAiDrafts(
  raw: string,
  options: ParseAiDraftsOptions = {},
): AiDraftParseResult {
  const resolved = {
    moduleId: options.moduleId ?? "",
    idFactory: options.idFactory ?? defaultId,
  };
  const nowIso = new Date().toISOString();

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { drafts: [], warning: "模型未返回任何内容" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonSlice(raw));
  } catch {
    return {
      drafts: [],
      warning: "无法解析模型输出为 JSON，请重试或调整输入",
    };
  }

  const items = toItemArray(parsed);
  if (items.length === 0) {
    return { drafts: [], warning: "模型输出未包含可识别的用例条目" };
  }

  const drafts = items.map((item, index) =>
    itemToDraft(item, index, resolved, nowIso),
  );
  const skipped = items.length - drafts.length;
  return {
    drafts,
    warning: skipped > 0 ? `已跳过 ${skipped} 条无法解析的条目` : "",
  };
}
