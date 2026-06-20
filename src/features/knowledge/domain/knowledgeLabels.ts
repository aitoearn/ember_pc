import type { KnowledgePackStatus } from "@/lib/api/knowledge";

export type KnowledgeView =
  | "overview"
  | "import"
  | "detail"
  | "save"
  | "states";
export type DetailTab =
  | "overview"
  | "content"
  | "sources"
  | "runtime"
  | "risks"
  | "runs";

export const STATUS_LABELS: Record<string, string> = {
  draft: "待确认",
  ready: "已可用",
  "needs-review": "待确认",
  stale: "需要补充",
  disputed: "需要补充",
  missing: "需要补充",
  partial: "需要补充",
  failed: "整理失败",
  error: "整理失败",
  archived: "已归档",
};

export const STATUS_CLASS_NAMES: Record<string, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "needs-review": "border-amber-200 bg-amber-50 text-amber-700",
  stale: "border-rose-200 bg-rose-50 text-rose-700",
  disputed: "border-rose-200 bg-rose-50 text-rose-700",
  missing: "border-rose-200 bg-rose-50 text-rose-700",
  partial: "border-rose-200 bg-rose-50 text-rose-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  error: "border-red-200 bg-red-50 text-red-700",
  archived: "border-slate-200 bg-slate-100 text-slate-500",
};

export const PACK_TYPES = [
  {
    value: "personal-ip",
    label: "项目背景",
    description: "项目目标、干系人、协作上下文与历史讨论摘要。",
  },
  {
    value: "brand-product",
    label: "产品信息",
    description: "被测产品范围、功能边界、业务规则与验收口径。",
  },
  {
    value: "organization-knowhow",
    label: "测试规范",
    description: "团队测试流程、质量标准、升级路径与禁止假设。",
  },
  {
    value: "content-operations",
    label: "用例资产",
    description: "历史用例、场景清单、覆盖矩阵与执行复盘。",
  },
  {
    value: "private-domain-operations",
    label: "缺陷回归",
    description: "缺陷库、回归样本、阻塞项与修复验证记录。",
  },
  {
    value: "live-commerce-operations",
    label: "测试环境",
    description: "环境地址、依赖服务、测试账号与部署约束。",
  },
  {
    value: "campaign-operations",
    label: "版本发布",
    description: "版本计划、发布范围、里程碑与测试准入条件。",
  },
  {
    value: "growth-strategy",
    label: "测试策略",
    description: "质量目标、测试分层、风险优先级与退出准则。",
  },
] as const;

export const VIEW_TABS: Array<{
  id: KnowledgeView;
  label: string;
  description: string;
}> = [
  { id: "overview", label: "资料首页", description: "状态和下一步" },
  { id: "import", label: "整理新资料", description: "添加原始资料" },
  { id: "detail", label: "确认资料", description: "检查完整文档" },
  { id: "save", label: "保存到项目资料", description: "把好内容存回来" },
  { id: "states", label: "状态说明", description: "看懂每类状态" },
];

export const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "确认清单" },
  { id: "content", label: "完整资料文档" },
  { id: "sources", label: "原始资料" },
  { id: "runtime", label: "本轮使用摘要" },
  { id: "risks", label: "缺口与风险" },
  { id: "runs", label: "高级信息" },
];

export function resolveStatusLabel(status: KnowledgePackStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function resolveStatusClassName(status: KnowledgePackStatus): string {
  return STATUS_CLASS_NAMES[status] ?? STATUS_CLASS_NAMES.draft;
}

export function getPackTypeLabel(value?: string | null): string {
  const normalized =
    value === "personal-profile"
      ? "personal-ip"
      : value === "custom:ember-growth-strategy"
        ? "growth-strategy"
        : value;
  return (
    PACK_TYPES.find((type) => type.value === normalized)?.label ??
    normalized ??
    "自定义"
  );
}
