/**
 * 测试用例管理 - 领域类型定义
 *
 * 字段模型综合自多个参考库（ntest / AITestPlatform / tester-skills /
 * SKills-To-TestCase / test-generator 等）的共识最小集 + 运营/追溯扩展。
 *
 * @module features/test-case-management/types
 */

/** 用例优先级（P0 最高） */
export type TestCasePriority = "P0" | "P1" | "P2" | "P3";

/** 用例类型（场景维度 taxonomy） */
export type TestCaseType =
  | "功能"
  | "边界"
  | "异常"
  | "性能"
  | "安全"
  | "兼容"
  | "场景";

/** 用例生命周期状态 */
export type TestCaseStatus = "草稿" | "待评审" | "已评审" | "已废弃";

/** 用例来源 */
export type TestCaseSource = "手工" | "AI生成" | "导入";

/** 执行结果 */
export type TestCaseExecResult = "未执行" | "通过" | "失败" | "阻塞";

/** 结构化测试步骤：步骤号 + 操作 + 预期 */
export interface TestCaseStep {
  /** 步骤序号，从 1 开始 */
  stepNo: number;
  /** 操作描述 */
  action: string;
  /** 该步预期结果 */
  expected: string;
}

/** 单条测试用例 */
export interface TestCase {
  /** 内部唯一标识（UUID） */
  id: string;
  /** 业务用例编号，如 TC-LOGIN-001 */
  caseId: string;
  /** 用例标题 */
  title: string;
  /** 所属模块 id */
  moduleId: string;
  /** 优先级 */
  priority: TestCasePriority;
  /** 用例类型 */
  caseType: TestCaseType;
  /** 生命周期状态 */
  status: TestCaseStatus;
  /** 来源 */
  source: TestCaseSource;
  /** 前置条件 */
  precondition: string;
  /** 结构化步骤（操作序列） */
  steps: TestCaseStep[];
  /**
   * 断言/通过条件（与步骤分离的独立验证项）。
   *
   * 对标行业 AI 测试用例建模（步骤 + 断言分离）：步骤描述「怎么操作」，
   * assertions 描述「最终应满足的可验证结论」，执行阶段对这组断言独立判定。
   */
  assertions: string[];
  /** 标签 */
  tags: string[];
  /** 执行结果 */
  execResult: TestCaseExecResult;
  /** 备注 */
  remark: string;
  /** 创建时间（ISO 字符串） */
  createdAt: string;
  /** 更新时间（ISO 字符串） */
  updatedAt: string;
}

/** 树形模块节点 */
export interface TestCaseModule {
  /** 模块唯一标识 */
  id: string;
  /** 模块名称 */
  name: string;
  /** 父模块 id，根模块为 null */
  parentId: string | null;
  /** 同级排序 */
  orderIndex: number;
}

/** 持久化的整体数据快照 */
export interface TestCaseStoreSnapshot {
  /** 数据结构版本，用于后续迁移 */
  version: number;
  modules: TestCaseModule[];
  cases: TestCase[];
}

/** 单次执行的结果判定（P3 执行追溯） */
export type TestCaseRunResult = "通过" | "失败" | "阻塞";

/** 用例执行过程中的一步观察（P3） */
export interface TestCaseRunStep {
  /** 过程步骤唯一标识 */
  id: string;
  /** 关联的执行记录 id */
  runId: string;
  /** 过程步骤序号 */
  stepNo: number;
  /** 智能体过程观察文本 */
  observation: string;
  /** 截图文件路径，无截图时为空串 */
  screenshotPath: string;
  /** 该步时间戳（ISO 字符串） */
  ts: string;
}

/** 单条用例的一次执行记录（P3） */
export interface TestCaseRun {
  /** 执行记录唯一标识 */
  id: string;
  /** 关联的用例 id（test_cases.id） */
  caseId: string;
  /** 目标设备 id */
  deviceId: string;
  /** 拼装后的自然语言执行指令 */
  instruction: string;
  /** 执行结果判定 */
  result: TestCaseRunResult;
  /** 结论摘要 */
  summary: string;
  /** 开始时间（ISO 字符串） */
  startedAt: string;
  /** 结束时间（ISO 字符串），未结束为空串 */
  finishedAt: string;
  /** 过程观察步骤 */
  steps: TestCaseRunStep[];
}

export const TEST_CASE_RUN_RESULTS: readonly TestCaseRunResult[] = [
  "通过",
  "失败",
  "阻塞",
];

/** 列表筛选条件 */
export interface TestCaseFilter {
  /** 关键词（匹配标题 / 编号 / 步骤 / 标签） */
  keyword: string;
  /** 选中的模块 id，null 表示全部模块 */
  moduleId: string | null;
  /** 优先级筛选，空数组表示不限 */
  priorities: TestCasePriority[];
  /** 类型筛选 */
  caseTypes: TestCaseType[];
  /** 状态筛选 */
  statuses: TestCaseStatus[];
  /** 来源筛选 */
  sources: TestCaseSource[];
  /** 执行结果筛选 */
  execResults: TestCaseExecResult[];
}

/** 统计摘要 */
export interface TestCaseStats {
  total: number;
  byPriority: Record<TestCasePriority, number>;
  byStatus: Record<TestCaseStatus, number>;
  byExecResult: Record<TestCaseExecResult, number>;
}

export const TEST_CASE_PRIORITIES: readonly TestCasePriority[] = [
  "P0",
  "P1",
  "P2",
  "P3",
];

export const TEST_CASE_TYPES: readonly TestCaseType[] = [
  "功能",
  "边界",
  "异常",
  "性能",
  "安全",
  "兼容",
  "场景",
];

export const TEST_CASE_STATUSES: readonly TestCaseStatus[] = [
  "草稿",
  "待评审",
  "已评审",
  "已废弃",
];

export const TEST_CASE_SOURCES: readonly TestCaseSource[] = [
  "手工",
  "AI生成",
  "导入",
];

export const TEST_CASE_EXEC_RESULTS: readonly TestCaseExecResult[] = [
  "未执行",
  "通过",
  "失败",
  "阻塞",
];

/** 空筛选条件 */
export function createEmptyFilter(): TestCaseFilter {
  return {
    keyword: "",
    moduleId: null,
    priorities: [],
    caseTypes: [],
    statuses: [],
    sources: [],
    execResults: [],
  };
}
