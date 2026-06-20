import {
  buildCuratedTaskReferencePromptBlock,
  extractCuratedTaskReferenceMemoryIds,
  getCuratedTaskReferenceCategoryLabel,
  mergeCuratedTaskReferenceEntries,
  normalizeCuratedTaskReferenceMemoryIds,
  type CuratedTaskReferenceEntry,
} from "./curatedTaskReferenceSelection";
import {
  buildCuratedTaskRecommendationSignalsFromReferenceEntries,
  listCuratedTaskRecommendationSignals,
  type CuratedTaskRecommendationSignal,
} from "./curatedTaskRecommendationSignals";
import { formatNumber } from "@/i18n/format";
import { agentZhCNResource as agentSourceResource } from "@/i18n/agentResources";

export interface CuratedTaskTemplateItem {
  id: string;
  title: string;
  summary: string;
  outputHint: string;
  resultDestination: string;
  categoryLabel: string;
  prompt: string;
  requiredInputs: string[];
  requiredInputFields: CuratedTaskInputField[];
  optionalReferences: string[];
  outputContract: string[];
  followUpActions: string[];
  badge: string;
  actionLabel: string;
  statusLabel: string;
  statusTone: "emerald";
  recentUsedAt: number | null;
  isRecent: boolean;
  themeTarget?: string;
  shouldEnableWebSearch?: boolean;
  shouldEnableTeamMode?: boolean;
  shouldLaunchBrowserAssist?: boolean;
  followUpActionTargets?: Record<string, CuratedTaskFollowUpActionTarget>;
}

export type CuratedTaskInputFieldType = "text" | "textarea";

export interface CuratedTaskInputField {
  key: string;
  label: string;
  placeholder: string;
  helperText?: string;
  type: CuratedTaskInputFieldType;
}

export type CuratedTaskInputValues = Record<string, string>;

export interface FeaturedCuratedTaskTemplateItem {
  template: CuratedTaskTemplateItem;
  badgeLabel: string;
  reasonLabel?: string;
  reasonSummary?: string;
}

export interface CuratedTaskFollowUpActionTarget {
  taskId: string;
  promptHint?: string;
}

interface CuratedTaskInputFieldDefinition {
  key: string;
  type: CuratedTaskInputFieldType;
  hasHelperText?: boolean;
}

interface CuratedTaskFollowUpActionTargetDefinition {
  taskId: string;
  hasPromptHint?: boolean;
}

interface CuratedTaskTemplateDefinition {
  id: string;
  prompt: string;
  requiredInputFields: CuratedTaskInputFieldDefinition[];
  optionalReferenceCount: number;
  outputContractCount: number;
  followUpActionCount: number;
  themeTarget?: string;
  shouldEnableWebSearch?: boolean;
  shouldEnableTeamMode?: boolean;
  shouldLaunchBrowserAssist?: boolean;
  followUpActionTargets?: Partial<
    Record<number, CuratedTaskFollowUpActionTargetDefinition>
  >;
}

interface ResolvedCuratedTaskTemplateDefinition {
  id: string;
  title: string;
  summary: string;
  outputHint: string;
  resultDestination: string;
  categoryLabel: string;
  prompt: string;
  requiredInputFields: CuratedTaskInputField[];
  optionalReferences: string[];
  outputContract: string[];
  followUpActions: string[];
  themeTarget?: string;
  shouldEnableWebSearch?: boolean;
  shouldEnableTeamMode?: boolean;
  shouldLaunchBrowserAssist?: boolean;
  followUpActionTargets?: Record<string, CuratedTaskFollowUpActionTarget>;
}

export interface CuratedTaskFollowUpActionCopy {
  label?: string;
  promptHint?: string;
}

export interface CuratedTaskTemplateDefinitionCopy {
  title?: string;
  summary?: string;
  outputHint?: string;
  resultDestination?: string;
  categoryLabel?: string;
  requiredInputFields?: Record<
    string,
    Partial<Pick<CuratedTaskInputField, "label" | "placeholder" | "helperText">>
  >;
  optionalReferences?: string[];
  outputContract?: string[];
  followUpActions?: CuratedTaskFollowUpActionCopy[];
}

export type CuratedTaskRecommendationCategory =
  | "activity"
  | "context"
  | "experience"
  | "identity"
  | "preference";

export interface CuratedTaskRecommendationCopy {
  activeReferenceReasonLabel?: string;
  categoryLabels?: Partial<Record<CuratedTaskRecommendationCategory, string>>;
  currentResultReasonLabel?: string;
  fallbackLabel?: string;
  recentActivityReasonLabel?: string;
  recentContextReasonLabel?: string;
  recentExperienceReasonLabel?: string;
  recentIdentityReasonLabel?: string;
  recentPreferenceReasonLabel?: string;
  recentReviewReasonLabel?: string;
  resultContinuationReasonLabel?: string;
  formatAccountProjectReviewSummary?: (title: string) => string;
  formatDailyTrendBriefingSummary?: (title: string) => string;
  formatSocialPostStarterSummary?: (title: string) => string;
  formatReviewReasonSummary?: (title: string) => string;
  formatSignalReasonSummary?: (categoryLabel: string, title: string) => string;
}

export interface CuratedTaskTemplateCopy {
  actionLabel?: string;
  recentBadgeLabel?: string;
  statusLabel?: string;
  templates?: Record<string, CuratedTaskTemplateDefinitionCopy>;
  recommendation?: CuratedTaskRecommendationCopy;
}

interface CuratedTaskTemplateUsageRecord {
  templateId: string;
  usedAt: number;
  launchInputValues?: CuratedTaskInputValues;
  referenceMemoryIds?: string[];
  referenceEntries?: CuratedTaskReferenceEntry[];
}

const CURATED_TASK_TEMPLATE_USAGE_STORAGE_KEY =
  "ember:curated-task-template-usage:v2";
const MAX_CURATED_TASK_TEMPLATE_USAGE_RECORDS = 12;
export const CURATED_TASK_TEMPLATE_USAGE_CHANGED_EVENT =
  "ember:curated-task-template-usage-changed";

export interface CuratedTaskTemplateLaunchPrefill {
  inputValues?: CuratedTaskInputValues;
  referenceMemoryIds?: string[];
  referenceEntries?: CuratedTaskReferenceEntry[];
  hint?: string;
}

export interface CuratedTaskPresentationCopy {
  requiredPrefix?: string;
  outputPrefix?: string;
  resultDestinationPrefix?: string;
  followUpPrefix?: string;
  recentFilledPrefix?: string;
  recentReferencePrefix?: string;
  recentReferenceFallback?: string;
  itemSeparator?: string;
  segmentSeparator?: string;
  formatFactItems?: (visibleItems: string[], totalCount: number) => string;
  formatRecentReferenceItems?: (
    visibleTitles: string[],
    totalCount: number,
  ) => string;
  formatRecentReferenceFallback?: (totalCount: number) => string;
  formatRecentPrefillHint?: (taskTitle: string) => string;
}

const CURATED_TASK_TEMPLATES: CuratedTaskTemplateDefinition[] = [
  {
    id: "daily-trend-briefing",
    prompt:
      "请先给我做一版冒烟检查清单：围绕当前被测模块梳理今日待测范围、阻塞项、高风险路径、环境依赖，以及最值得立即开工的 3 个测试项。",
    requiredInputFields: [
      {
        key: "theme_target",
        type: "text",
      },
      {
        key: "platform_region",
        type: "text",
      },
    ],
    optionalReferenceCount: 2,
    outputContractCount: 3,
    followUpActionCount: 2,
    shouldEnableWebSearch: true,
  },
  {
    id: "social-post-starter",
    prompt:
      "请先帮我起草一版功能测试用例：明确被测功能、用户场景、前置条件、测试步骤、预期结果和优先级，并给我一版适合继续补充边界与异常场景的用例初稿。",
    requiredInputFields: [
      {
        key: "subject_or_product",
        type: "textarea",
      },
      {
        key: "target_audience",
        type: "text",
      },
    ],
    optionalReferenceCount: 2,
    outputContractCount: 3,
    followUpActionCount: 2,
  },
  {
    id: "viral-content-breakdown",
    prompt:
      "请帮我做缺陷根因分析：归纳缺陷现象、复现条件、影响范围、可能根因和关联模块，并给出修复验证与回归测试建议。",
    requiredInputFields: [
      {
        key: "source_content",
        type: "textarea",
      },
      {
        key: "reuse_goal",
        type: "text",
      },
    ],
    optionalReferenceCount: 2,
    outputContractCount: 3,
    followUpActionCount: 2,
    shouldEnableWebSearch: true,
  },
  {
    id: "longform-multiplatform-rewrite",
    prompt:
      "请把这份需求文档整理成测试用例集：先提炼功能点与验收标准，再给我输出主路径、边界、异常场景用例，以及覆盖缺口建议。",
    requiredInputFields: [
      {
        key: "source_article",
        type: "textarea",
      },
      {
        key: "target_platform",
        type: "text",
      },
    ],
    optionalReferenceCount: 2,
    outputContractCount: 3,
    followUpActionCount: 2,
  },
  {
    id: "script-to-voiceover",
    prompt:
      "请把这份手测步骤整理成自动化脚本骨架：补齐操作步骤、断言点、测试数据、等待策略和可复用的 Page Object 结构建议。",
    requiredInputFields: [
      {
        key: "existing_script",
        type: "textarea",
      },
      {
        key: "voiceover_context",
        type: "text",
      },
    ],
    optionalReferenceCount: 2,
    outputContractCount: 3,
    followUpActionCount: 2,
  },
  {
    id: "account-project-review",
    prompt:
      "请帮我做测试迭代复盘：先明确测试目标、当前执行结果、关键缺陷、哪些模块风险高、哪些覆盖还不足，再给出下一轮最值得执行的测试动作建议。",
    requiredInputFields: [
      {
        key: "project_goal",
        type: "text",
      },
      {
        key: "existing_results",
        type: "textarea",
      },
    ],
    optionalReferenceCount: 2,
    outputContractCount: 3,
    followUpActionCount: 2,
    followUpActionTargets: {
      0: {
        taskId: "daily-trend-briefing",
        hasPromptHint: true,
      },
      1: {
        taskId: "social-post-starter",
        hasPromptHint: true,
      },
    },
    shouldEnableTeamMode: true,
  },
];

export const FEATURED_HOME_CURATED_TASK_TEMPLATE_IDS = [
  "daily-trend-briefing",
  "social-post-starter",
  "viral-content-breakdown",
  "longform-multiplatform-rewrite",
  "script-to-voiceover",
  "account-project-review",
] as const;

const CURATED_TASK_RECOMMENDATION_KEYWORDS: Record<string, string[]> = {
  "daily-trend-briefing": [
    "冒烟",
    "清单",
    "开工",
    "待测",
    "阻塞",
    "smoke",
    "checklist",
    "scope",
    "risk",
    "回归",
  ],
  "social-post-starter": [
    "用例",
    "功能",
    "场景",
    "步骤",
    "预期",
    "验收",
    "case",
    "test",
    "coverage",
    "priority",
  ],
  "viral-content-breakdown": [
    "缺陷",
    "根因",
    "复现",
    "bug",
    "issue",
    "regression",
    "fix",
    "日志",
    "影响",
  ],
  "longform-multiplatform-rewrite": [
    "需求",
    "prd",
    "文档",
    "用例集",
    "边界",
    "异常",
    "requirement",
    "matrix",
    "覆盖",
  ],
  "script-to-voiceover": [
    "自动化",
    "脚本",
    "断言",
    "playwright",
    "appium",
    "pytest",
    "page object",
    "手测",
    "ci",
  ],
  "account-project-review": [
    "复盘",
    "迭代",
    "覆盖率",
    "缺陷",
    "发布",
    "review",
    "scorecard",
    "回归",
    "测试",
    "版本",
  ],
};

const CURATED_TASK_RECOMMENDATION_CATEGORY_WEIGHTS: Record<
  string,
  Partial<Record<CuratedTaskRecommendationCategory, number>>
> = {
  "daily-trend-briefing": {
    context: 9,
    activity: 12,
    experience: 4,
  },
  "social-post-starter": {
    identity: 12,
    preference: 11,
    context: 7,
    experience: 3,
  },
  "viral-content-breakdown": {
    context: 14,
    activity: 13,
    experience: 6,
  },
  "longform-multiplatform-rewrite": {
    context: 10,
    experience: 10,
    preference: 5,
  },
  "script-to-voiceover": {
    identity: 6,
    preference: 7,
    experience: 10,
  },
  "account-project-review": {
    experience: 28,
    context: 5,
    preference: 4,
  },
};

export type CuratedTaskTemplateCopyTranslator = (
  key: string,
  values?: Record<string, number | string>,
) => string;

export function buildCuratedTaskTemplateCopy(
  translate: CuratedTaskTemplateCopyTranslator,
): CuratedTaskTemplateCopy {
  return {
    actionLabel: translate("curatedTask.templates.common.actionLabel"),
    recentBadgeLabel: translate("curatedTask.templates.common.recentBadge"),
    statusLabel: translate("curatedTask.templates.common.statusLabel"),
    recommendation: {
      activeReferenceReasonLabel: translate(
        "curatedTask.templates.recommendation.activeReferenceReasonLabel",
        { categoryLabel: "{{categoryLabel}}" },
      ),
      categoryLabels: {
        activity: translate(
          "curatedTask.templates.recommendation.category.activity",
        ),
        context: translate(
          "curatedTask.templates.recommendation.category.context",
        ),
        experience: translate(
          "curatedTask.templates.recommendation.category.experience",
        ),
        identity: translate(
          "curatedTask.templates.recommendation.category.identity",
        ),
        preference: translate(
          "curatedTask.templates.recommendation.category.preference",
        ),
      },
      currentResultReasonLabel: translate(
        "curatedTask.templates.recommendation.currentResultReasonLabel",
      ),
      fallbackLabel: translate(
        "curatedTask.templates.recommendation.fallbackLabel",
      ),
      recentActivityReasonLabel: translate(
        "curatedTask.templates.recommendation.recentActivityReasonLabel",
      ),
      recentContextReasonLabel: translate(
        "curatedTask.templates.recommendation.recentContextReasonLabel",
      ),
      recentExperienceReasonLabel: translate(
        "curatedTask.templates.recommendation.recentExperienceReasonLabel",
      ),
      recentIdentityReasonLabel: translate(
        "curatedTask.templates.recommendation.recentIdentityReasonLabel",
      ),
      recentPreferenceReasonLabel: translate(
        "curatedTask.templates.recommendation.recentPreferenceReasonLabel",
      ),
      recentReviewReasonLabel: translate(
        "curatedTask.templates.recommendation.recentReviewReasonLabel",
      ),
      resultContinuationReasonLabel: translate(
        "curatedTask.templates.recommendation.resultContinuationReasonLabel",
      ),
      formatAccountProjectReviewSummary: (title) =>
        translate(
          "curatedTask.templates.recommendation.accountProjectReviewSummary",
          { title },
        ),
      formatDailyTrendBriefingSummary: (title) =>
        translate(
          "curatedTask.templates.recommendation.dailyTrendBriefingSummary",
          { title },
        ),
      formatReviewReasonSummary: (title) =>
        translate("curatedTask.templates.recommendation.reviewReasonSummary", {
          title,
        }),
      formatSignalReasonSummary: (categoryLabel, title) =>
        translate("curatedTask.templates.recommendation.signalReasonSummary", {
          categoryLabel,
          title,
        }),
      formatSocialPostStarterSummary: (title) =>
        translate(
          "curatedTask.templates.recommendation.socialPostStarterSummary",
          { title },
        ),
    },
    templates: Object.fromEntries(
      CURATED_TASK_TEMPLATES.map((template) => [
        template.id,
        buildCuratedTaskTemplateDefinitionCopy(template, translate),
      ]),
    ),
  };
}

function buildCuratedTaskTemplateDefinitionCopy(
  template: CuratedTaskTemplateDefinition,
  translate: CuratedTaskTemplateCopyTranslator,
): CuratedTaskTemplateDefinitionCopy {
  const keyPrefix = `curatedTask.templates.${template.id}`;

  return {
    categoryLabel: translate(`${keyPrefix}.categoryLabel`),
    followUpActions: Array.from(
      { length: template.followUpActionCount },
      (_, index) => {
        const target = template.followUpActionTargets?.[index];
        const actionKey = `${keyPrefix}.followUpActions.${index}`;
        return {
          label: translate(actionKey),
          ...(target?.hasPromptHint
            ? {
                promptHint: translate(`${actionKey}.promptHint`),
              }
            : {}),
        };
      },
    ),
    optionalReferences: Array.from(
      { length: template.optionalReferenceCount },
      (_, index) => translate(`${keyPrefix}.optionalReferences.${index}`),
    ),
    outputContract: Array.from(
      { length: template.outputContractCount },
      (_, index) => translate(`${keyPrefix}.outputContract.${index}`),
    ),
    outputHint: translate(`${keyPrefix}.outputHint`),
    requiredInputFields: Object.fromEntries(
      template.requiredInputFields.map((field) => [
        field.key,
        {
          ...(field.hasHelperText !== false
            ? {
                helperText: translate(
                  `${keyPrefix}.fields.${field.key}.helperText`,
                ),
              }
            : {}),
          label: translate(`${keyPrefix}.fields.${field.key}.label`),
          placeholder: translate(
            `${keyPrefix}.fields.${field.key}.placeholder`,
          ),
        },
      ]),
    ),
    resultDestination: translate(`${keyPrefix}.resultDestination`),
    summary: translate(`${keyPrefix}.summary`),
    title: translate(`${keyPrefix}.title`),
  };
}

type AgentSourceResourceKey = keyof typeof agentSourceResource;

function interpolateCuratedTaskSourceTemplate(
  template: string,
  values?: Record<string, number | string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) => {
    const value = values?.[name];
    return value == null ? match : String(value);
  });
}

function translateCuratedTaskSourceKey(
  key: string,
  values?: Record<string, number | string>,
): string {
  const template = agentSourceResource[key as AgentSourceResourceKey] ?? key;
  return interpolateCuratedTaskSourceTemplate(template, values);
}

const SOURCE_CURATED_TASK_TEMPLATE_COPY = buildCuratedTaskTemplateCopy(
  translateCuratedTaskSourceKey,
);

const SOURCE_CURATED_TASK_FACT_ITEM_SEPARATOR = translateCuratedTaskSourceKey(
  "curatedTask.launcher.summary.itemSeparator",
);

const SOURCE_CURATED_TASK_PRESENTATION_COPY: CuratedTaskPresentationCopy = {
  followUpPrefix: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.followUpPrefix",
  ),
  itemSeparator: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.itemSeparator",
  ),
  outputPrefix: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.outputPrefix",
  ),
  recentFilledPrefix: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.recentFilledPrefix",
  ),
  recentReferenceFallback: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.recentReferenceFallback",
    { count: formatNumber(1, { locale: "zh-CN" }) },
  ),
  recentReferencePrefix: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.recentReferencePrefix",
  ),
  requiredPrefix: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.requiredPrefix",
  ),
  resultDestinationPrefix: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.resultDestinationPrefix",
  ),
  segmentSeparator: translateCuratedTaskSourceKey(
    "skills.workspace.curatedTask.segmentSeparator",
  ),
  formatFactItems: (visibleItems, totalCount) => {
    const items = visibleItems.join(SOURCE_CURATED_TASK_FACT_ITEM_SEPARATOR);
    if (visibleItems.length >= totalCount) {
      return items;
    }

    return translateCuratedTaskSourceKey(
      "skills.workspace.curatedTask.factItems.withMore",
      {
        items,
        remaining: formatNumber(totalCount - visibleItems.length, {
          locale: "zh-CN",
        }),
        total: formatNumber(totalCount, { locale: "zh-CN" }),
      },
    );
  },
  formatRecentPrefillHint: (taskTitle) =>
    translateCuratedTaskSourceKey("skills.workspace.curatedTask.prefillHint", {
      title: taskTitle,
    }),
  formatRecentReferenceFallback: (totalCount) =>
    translateCuratedTaskSourceKey(
      "skills.workspace.curatedTask.recentReferenceFallback",
      { count: formatNumber(totalCount, { locale: "zh-CN" }) },
    ),
  formatRecentReferenceItems: (visibleTitles, totalCount) => {
    const items = visibleTitles.join(SOURCE_CURATED_TASK_FACT_ITEM_SEPARATOR);
    if (visibleTitles.length >= totalCount) {
      return items;
    }

    return translateCuratedTaskSourceKey(
      "skills.workspace.curatedTask.referenceItems.withMore",
      {
        items,
        remaining: formatNumber(totalCount - visibleTitles.length, {
          locale: "zh-CN",
        }),
        total: formatNumber(totalCount, { locale: "zh-CN" }),
      },
    );
  },
};

function resolveCuratedTaskPresentationCopy(
  copy?: CuratedTaskPresentationCopy,
): CuratedTaskPresentationCopy {
  return {
    ...SOURCE_CURATED_TASK_PRESENTATION_COPY,
    ...(copy ?? {}),
  };
}

function formatCuratedTaskSourceItemsWithMore(
  key: string,
  visibleItems: string[],
  totalCount: number,
  itemSeparator: string,
): string {
  const items = visibleItems.join(itemSeparator);
  if (visibleItems.length >= totalCount) {
    return items;
  }

  return translateCuratedTaskSourceKey(key, {
    items,
    remaining: formatNumber(totalCount - visibleItems.length, {
      locale: "zh-CN",
    }),
    total: formatNumber(totalCount, { locale: "zh-CN" }),
  });
}

function mergeCuratedTaskFollowUpActionCopies(
  base: CuratedTaskFollowUpActionCopy[] | undefined,
  override: CuratedTaskFollowUpActionCopy[] | undefined,
): CuratedTaskFollowUpActionCopy[] | undefined {
  if (!base && !override) {
    return undefined;
  }

  const length = Math.max(base?.length ?? 0, override?.length ?? 0);
  return Array.from({ length }, (_, index) => ({
    ...(base?.[index] ?? {}),
    ...(override?.[index] ?? {}),
  }));
}

function mergeCuratedTaskTemplateDefinitionCopy(
  base: CuratedTaskTemplateDefinitionCopy | undefined,
  override: CuratedTaskTemplateDefinitionCopy | undefined,
): CuratedTaskTemplateDefinitionCopy {
  return {
    ...(base ?? {}),
    ...(override ?? {}),
    followUpActions: mergeCuratedTaskFollowUpActionCopies(
      base?.followUpActions,
      override?.followUpActions,
    ),
    optionalReferences:
      override?.optionalReferences ?? base?.optionalReferences ?? [],
    outputContract: override?.outputContract ?? base?.outputContract ?? [],
    requiredInputFields: {
      ...(base?.requiredInputFields ?? {}),
      ...(override?.requiredInputFields ?? {}),
    },
  };
}

function resolveCuratedTaskTemplateCopy(
  copy: CuratedTaskTemplateCopy = {},
): CuratedTaskTemplateCopy {
  const templateIds = new Set([
    ...Object.keys(SOURCE_CURATED_TASK_TEMPLATE_COPY.templates ?? {}),
    ...Object.keys(copy.templates ?? {}),
  ]);

  return {
    ...SOURCE_CURATED_TASK_TEMPLATE_COPY,
    ...copy,
    recommendation: {
      ...(SOURCE_CURATED_TASK_TEMPLATE_COPY.recommendation ?? {}),
      ...(copy.recommendation ?? {}),
      categoryLabels: {
        ...(SOURCE_CURATED_TASK_TEMPLATE_COPY.recommendation?.categoryLabels ??
          {}),
        ...(copy.recommendation?.categoryLabels ?? {}),
      },
    },
    templates: Object.fromEntries(
      Array.from(templateIds).map((templateId) => [
        templateId,
        mergeCuratedTaskTemplateDefinitionCopy(
          SOURCE_CURATED_TASK_TEMPLATE_COPY.templates?.[templateId],
          copy.templates?.[templateId],
        ),
      ]),
    ),
  };
}

function resolveTemplateCopyValue(
  value: string | undefined,
  key: string,
): string {
  return value?.trim() || key;
}

function resolveTemplateCopyItems(
  items: string[] | undefined,
  count: number,
  keyPrefix: string,
): string[] {
  return Array.from({ length: count }, (_, index) =>
    resolveTemplateCopyValue(items?.[index], `${keyPrefix}.${index}`),
  );
}

function applyCuratedTaskTemplateCopy(
  template: CuratedTaskTemplateDefinition,
  copy: CuratedTaskTemplateCopy = {},
): ResolvedCuratedTaskTemplateDefinition {
  const resolvedCopy = resolveCuratedTaskTemplateCopy(copy);
  const keyPrefix = `curatedTask.templates.${template.id}`;
  const templateCopy = mergeCuratedTaskTemplateDefinitionCopy(
    resolvedCopy.templates?.[template.id],
    undefined,
  );
  const followUpActionCopies = templateCopy.followUpActions ?? [];
  const followUpActions = Array.from(
    { length: template.followUpActionCount },
    (_, index) =>
      resolveTemplateCopyValue(
        followUpActionCopies[index]?.label,
        `${keyPrefix}.followUpActions.${index}`,
      ),
  );
  const followUpActionTargets = Object.fromEntries(
    Object.entries(template.followUpActionTargets ?? {}).flatMap(
      ([actionIndexText, target]) => {
        if (!target) {
          return [];
        }

        const actionIndex = Number(actionIndexText);
        const localizedAction =
          followUpActions[actionIndex] ??
          `${keyPrefix}.followUpActions.${actionIndex}`;
        const localizedPromptHint =
          followUpActionCopies[actionIndex]?.promptHint?.trim();

        return [
          [
            localizedAction,
            {
              taskId: target.taskId,
              ...(localizedPromptHint
                ? { promptHint: localizedPromptHint }
                : {}),
            },
          ],
        ];
      },
    ),
  );

  return {
    ...template,
    categoryLabel: resolveTemplateCopyValue(
      templateCopy.categoryLabel,
      `${keyPrefix}.categoryLabel`,
    ),
    followUpActions,
    followUpActionTargets,
    optionalReferences: resolveTemplateCopyItems(
      templateCopy.optionalReferences,
      template.optionalReferenceCount,
      `${keyPrefix}.optionalReferences`,
    ),
    outputContract: resolveTemplateCopyItems(
      templateCopy.outputContract,
      template.outputContractCount,
      `${keyPrefix}.outputContract`,
    ),
    outputHint: resolveTemplateCopyValue(
      templateCopy.outputHint,
      `${keyPrefix}.outputHint`,
    ),
    requiredInputFields: template.requiredInputFields.map((field) => {
      const fieldCopy = templateCopy.requiredInputFields?.[field.key];
      return {
        key: field.key,
        type: field.type,
        ...(field.hasHelperText !== false
          ? {
              helperText: resolveTemplateCopyValue(
                fieldCopy?.helperText,
                `${keyPrefix}.fields.${field.key}.helperText`,
              ),
            }
          : {}),
        label: resolveTemplateCopyValue(
          fieldCopy?.label,
          `${keyPrefix}.fields.${field.key}.label`,
        ),
        placeholder: resolveTemplateCopyValue(
          fieldCopy?.placeholder,
          `${keyPrefix}.fields.${field.key}.placeholder`,
        ),
      };
    }),
    resultDestination: resolveTemplateCopyValue(
      templateCopy.resultDestination,
      `${keyPrefix}.resultDestination`,
    ),
    summary: resolveTemplateCopyValue(
      templateCopy.summary,
      `${keyPrefix}.summary`,
    ),
    title: resolveTemplateCopyValue(templateCopy.title, `${keyPrefix}.title`),
  };
}

function isValidUsageRecord(
  value: unknown,
): value is CuratedTaskTemplateUsageRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<CuratedTaskTemplateUsageRecord>;
  return (
    typeof record.templateId === "string" &&
    record.templateId.length > 0 &&
    typeof record.usedAt === "number" &&
    Number.isFinite(record.usedAt)
  );
}

function normalizeCuratedTaskUsageInputValues(
  inputValues?: CuratedTaskInputValues | null,
): CuratedTaskInputValues | undefined {
  if (!inputValues || typeof inputValues !== "object") {
    return undefined;
  }

  const normalizedEntries = Object.entries(inputValues)
    .map(
      ([key, value]) =>
        [
          key.trim(),
          normalizeCuratedTaskInputValue(String(value ?? "")),
        ] as const,
    )
    .filter(
      (entry): entry is [string, string] =>
        entry[0].length > 0 && entry[1].length > 0,
    );

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries);
}

function normalizeCuratedTaskUsageRecord(
  record: CuratedTaskTemplateUsageRecord,
): CuratedTaskTemplateUsageRecord {
  const normalizedReferenceEntries = mergeCuratedTaskReferenceEntries(
    record.referenceEntries ?? [],
  ).slice(0, 3);
  const normalizedReferenceMemoryIds = normalizeCuratedTaskReferenceMemoryIds([
    ...(record.referenceMemoryIds ?? []),
    ...(extractCuratedTaskReferenceMemoryIds(normalizedReferenceEntries) ?? []),
  ]);
  const normalizedLaunchInputValues = normalizeCuratedTaskUsageInputValues(
    record.launchInputValues,
  );

  return {
    templateId: record.templateId.trim(),
    usedAt: record.usedAt,
    ...(normalizedLaunchInputValues
      ? {
          launchInputValues: normalizedLaunchInputValues,
        }
      : {}),
    ...(normalizedReferenceMemoryIds
      ? {
          referenceMemoryIds: normalizedReferenceMemoryIds,
        }
      : {}),
    ...(normalizedReferenceEntries.length > 0
      ? {
          referenceEntries: normalizedReferenceEntries,
        }
      : {}),
  };
}

function listCuratedTaskTemplateUsage(): CuratedTaskTemplateUsageRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      CURATED_TASK_TEMPLATE_USAGE_STORAGE_KEY,
    );
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isValidUsageRecord)
      .map(normalizeCuratedTaskUsageRecord)
      .sort((left, right) => right.usedAt - left.usedAt)
      .slice(0, MAX_CURATED_TASK_TEMPLATE_USAGE_RECORDS);
  } catch {
    return [];
  }
}

function getCuratedTaskTemplateUsageMap(): Map<
  string,
  CuratedTaskTemplateUsageRecord
> {
  return new Map(
    listCuratedTaskTemplateUsage().map((record) => [record.templateId, record]),
  );
}

function emitCuratedTaskTemplateUsageChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CURATED_TASK_TEMPLATE_USAGE_CHANGED_EVENT),
  );
}

export function subscribeCuratedTaskTemplateUsageChanged(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const customEventHandler = () => {
    callback();
  };

  const storageHandler = (event: StorageEvent) => {
    if (event.key !== CURATED_TASK_TEMPLATE_USAGE_STORAGE_KEY) {
      return;
    }

    callback();
  };

  window.addEventListener(
    CURATED_TASK_TEMPLATE_USAGE_CHANGED_EVENT,
    customEventHandler,
  );
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(
      CURATED_TASK_TEMPLATE_USAGE_CHANGED_EVENT,
      customEventHandler,
    );
    window.removeEventListener("storage", storageHandler);
  };
}

export function resolveCuratedTaskTemplateLaunchPrefill(
  task: Pick<CuratedTaskTemplateItem, "id" | "title"> | null,
  copy: CuratedTaskPresentationCopy = {},
): CuratedTaskTemplateLaunchPrefill | null {
  const resolvedCopy = resolveCuratedTaskPresentationCopy(copy);
  if (!task) {
    return null;
  }

  const recentRecord = getCuratedTaskTemplateUsageMap().get(task.id);
  if (!recentRecord) {
    return null;
  }

  const hasPrefill =
    Boolean(recentRecord.launchInputValues) ||
    Boolean(recentRecord.referenceMemoryIds?.length) ||
    Boolean(recentRecord.referenceEntries?.length);
  if (!hasPrefill) {
    return null;
  }

  return {
    inputValues: recentRecord.launchInputValues,
    referenceMemoryIds: recentRecord.referenceMemoryIds,
    referenceEntries: recentRecord.referenceEntries,
    hint:
      resolvedCopy.formatRecentPrefillHint?.(task.title) ??
      `skills.workspace.curatedTask.prefillHint:${task.title}`,
  };
}

function resolveCuratedTaskTemplateBadge(
  template: ResolvedCuratedTaskTemplateDefinition,
  isRecent: boolean,
  copy: CuratedTaskTemplateCopy = {},
): string {
  const resolvedCopy = resolveCuratedTaskTemplateCopy(copy);

  if (isRecent) {
    return (
      resolvedCopy.recentBadgeLabel ??
      "curatedTask.templates.common.recentBadge"
    );
  }

  return template.categoryLabel;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function matchesTemplateQuery(
  query: string,
  template: Pick<
    CuratedTaskTemplateItem,
    | "title"
    | "summary"
    | "outputHint"
    | "resultDestination"
    | "categoryLabel"
    | "prompt"
    | "requiredInputs"
    | "optionalReferences"
    | "outputContract"
    | "followUpActions"
  >,
): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  return [
    template.title,
    template.summary,
    template.outputHint,
    template.resultDestination,
    template.categoryLabel,
    template.prompt,
    ...template.requiredInputs,
    ...template.optionalReferences,
    ...template.outputContract,
    ...template.followUpActions,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function summarizeCuratedTaskFactItems(
  items: string[],
  limit = 2,
  copy: CuratedTaskPresentationCopy = {},
): string {
  const resolvedCopy = resolveCuratedTaskPresentationCopy(copy);
  const normalizedItems = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (normalizedItems.length === 0) {
    return "";
  }

  const visibleItems =
    normalizedItems.length <= limit
      ? normalizedItems
      : normalizedItems.slice(0, limit);

  return (
    resolvedCopy.formatFactItems?.(visibleItems, normalizedItems.length) ?? ""
  );
}

function normalizeCuratedTaskInputValue(value: string | undefined): string {
  return String(value ?? "").trim();
}

export function summarizeCuratedTaskRequiredInputs(
  task: Pick<CuratedTaskTemplateItem, "requiredInputs">,
  limit = 2,
  copy: CuratedTaskPresentationCopy = {},
): string {
  return summarizeCuratedTaskFactItems(task.requiredInputs, limit, copy);
}

export function summarizeCuratedTaskOptionalReferences(
  task: Pick<CuratedTaskTemplateItem, "optionalReferences">,
  limit = 2,
  copy: CuratedTaskPresentationCopy = {},
): string {
  return summarizeCuratedTaskFactItems(task.optionalReferences, limit, copy);
}

export function summarizeCuratedTaskOutputContract(
  task: Pick<CuratedTaskTemplateItem, "outputContract">,
  limit = 2,
  copy: CuratedTaskPresentationCopy = {},
): string {
  return summarizeCuratedTaskFactItems(task.outputContract, limit, copy);
}

export function summarizeCuratedTaskFollowUpActions(
  task: Pick<CuratedTaskTemplateItem, "followUpActions">,
  limit = 2,
  copy: CuratedTaskPresentationCopy = {},
): string {
  return summarizeCuratedTaskFactItems(task.followUpActions, limit, copy);
}

function summarizeCuratedTaskRecentValue(
  value: string,
  maxLength = 36,
): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function buildCuratedTaskRecentUsageDescription(params: {
  task: Pick<CuratedTaskTemplateItem, "requiredInputFields">;
  prefill?: CuratedTaskTemplateLaunchPrefill | null;
  fieldLimit?: number;
  copy?: CuratedTaskPresentationCopy;
}): string {
  const fieldLimit = params.fieldLimit ?? 2;
  const copy = resolveCuratedTaskPresentationCopy(params.copy);
  const itemSeparator =
    copy.itemSeparator ?? "skills.workspace.curatedTask.itemSeparator";
  const formatRecentFactItems = params.copy?.formatFactItems;
  const formatRecentReferenceItems = params.copy?.formatRecentReferenceItems;
  const launchInputSummaryItems = params.task.requiredInputFields
    .map((field) => {
      const rawValue = params.prefill?.inputValues?.[field.key];
      const normalizedValue = normalizeCuratedTaskInputValue(rawValue);
      if (!normalizedValue) {
        return null;
      }

      return `${field.label}=${summarizeCuratedTaskRecentValue(
        normalizedValue,
      )}`;
    })
    .filter((item): item is string => Boolean(item));

  const segments: string[] = [];

  if (launchInputSummaryItems.length > 0) {
    const visibleItems = launchInputSummaryItems.slice(0, fieldLimit);
    segments.push(
      `${
        copy.recentFilledPrefix ??
        "skills.workspace.curatedTask.recentFilledPrefix"
      }${
        formatRecentFactItems?.(visibleItems, launchInputSummaryItems.length) ??
        formatCuratedTaskSourceItemsWithMore(
          "skills.workspace.curatedTask.factItems.withMore",
          visibleItems,
          launchInputSummaryItems.length,
          itemSeparator,
        )
      }`,
    );
  }

  const referenceEntries = mergeCuratedTaskReferenceEntries(
    params.prefill?.referenceEntries ?? [],
  );
  if (referenceEntries.length > 0) {
    const referenceTitles = referenceEntries
      .map((entry) => entry.title.trim())
      .filter((title) => title.length > 0);
    const visibleTitles = referenceTitles.slice(0, fieldLimit);
    segments.push(
      visibleTitles.length > 0
        ? `${
            copy.recentReferencePrefix ??
            "skills.workspace.curatedTask.recentReferencePrefix"
          }${
            formatRecentReferenceItems?.(
              visibleTitles,
              referenceTitles.length,
            ) ??
            formatCuratedTaskSourceItemsWithMore(
              "skills.workspace.curatedTask.referenceItems.withMore",
              visibleTitles,
              referenceTitles.length,
              itemSeparator,
            )
          }`
        : `${
            copy.recentReferencePrefix ??
            "skills.workspace.curatedTask.recentReferencePrefix"
          }${
            copy.formatRecentReferenceFallback?.(referenceEntries.length) ??
            copy.recentReferenceFallback ??
            `skills.workspace.curatedTask.recentReferenceFallback:${referenceEntries.length}`
          }`,
    );
  }

  return segments.join(
    copy.segmentSeparator ?? "skills.workspace.curatedTask.segmentSeparator",
  );
}

export function buildCuratedTaskFollowUpDescription(
  task: Pick<CuratedTaskTemplateItem, "followUpActions">,
  options: {
    limit?: number;
    prefix?: string;
    copy?: CuratedTaskPresentationCopy;
  } = {},
): string {
  const copy = resolveCuratedTaskPresentationCopy(options.copy);
  const summary = summarizeCuratedTaskFollowUpActions(
    task,
    options.limit,
    copy,
  );
  if (!summary) {
    return "";
  }

  return `${
    options.prefix ??
    copy.followUpPrefix ??
    "skills.workspace.curatedTask.followUpPrefix"
  }${summary}`;
}

export function buildCuratedTaskCapabilityDescription(
  task: Pick<
    CuratedTaskTemplateItem,
    | "summary"
    | "requiredInputs"
    | "outputContract"
    | "resultDestination"
    | "followUpActions"
  >,
  options: {
    includeSummary?: boolean;
    requiredLimit?: number;
    outputLimit?: number;
    includeResultDestination?: boolean;
    includeFollowUpActions?: boolean;
    followUpLimit?: number;
    copy?: CuratedTaskPresentationCopy;
  } = {},
): string {
  const segments: string[] = [];
  const copy = resolveCuratedTaskPresentationCopy(options.copy);
  const summary = task.summary.trim();

  if (options.includeSummary !== false && summary.length > 0) {
    segments.push(summary);
  }

  const requiredSummary = summarizeCuratedTaskRequiredInputs(
    task,
    options.requiredLimit,
    copy,
  );
  if (requiredSummary) {
    segments.push(
      `${
        copy.requiredPrefix ?? "skills.workspace.curatedTask.requiredPrefix"
      }${requiredSummary}`,
    );
  }

  const outputSummary = summarizeCuratedTaskOutputContract(
    task,
    options.outputLimit,
    copy,
  );
  if (outputSummary) {
    segments.push(
      `${copy.outputPrefix ?? "skills.workspace.curatedTask.outputPrefix"}${outputSummary}`,
    );
  }

  if (options.includeResultDestination) {
    const resultDestination = task.resultDestination.trim();
    if (resultDestination.length > 0) {
      segments.push(
        `${
          copy.resultDestinationPrefix ??
          "skills.workspace.curatedTask.resultDestinationPrefix"
        }${resultDestination}`,
      );
    }
  }

  if (options.includeFollowUpActions) {
    const followUpSummary = buildCuratedTaskFollowUpDescription(task, {
      copy,
      limit: options.followUpLimit,
    });
    if (followUpSummary) {
      segments.push(followUpSummary);
    }
  }

  return segments.join(
    copy.segmentSeparator ?? "skills.workspace.curatedTask.segmentSeparator",
  );
}

export function getCuratedTaskOutputDestination(
  task: Pick<CuratedTaskTemplateItem, "resultDestination">,
): string {
  return task.resultDestination.trim();
}

export function createEmptyCuratedTaskInputValues(
  task: Pick<CuratedTaskTemplateItem, "requiredInputFields">,
): CuratedTaskInputValues {
  return resolveCuratedTaskInputValues({
    task,
  });
}

export function resolveCuratedTaskInputValues(params: {
  task: Pick<CuratedTaskTemplateItem, "requiredInputFields">;
  inputValues?: CuratedTaskInputValues | null;
}): CuratedTaskInputValues {
  return Object.fromEntries(
    params.task.requiredInputFields.map((field) => [
      field.key,
      String(params.inputValues?.[field.key] ?? ""),
    ]),
  );
}

export function hasFilledAllCuratedTaskRequiredInputs(params: {
  task: Pick<CuratedTaskTemplateItem, "requiredInputFields">;
  inputValues: CuratedTaskInputValues;
}): boolean {
  return params.task.requiredInputFields.every(
    (field) =>
      normalizeCuratedTaskInputValue(params.inputValues[field.key]).length > 0,
  );
}

export function buildCuratedTaskLaunchPrompt(params: {
  task: Pick<
    CuratedTaskTemplateItem,
    "prompt" | "requiredInputFields" | "outputContract"
  >;
  inputValues: CuratedTaskInputValues;
  referenceEntries?: CuratedTaskReferenceEntry[];
}): string {
  const starterFacts = params.task.requiredInputFields
    .map((field) => {
      const value = normalizeCuratedTaskInputValue(
        params.inputValues[field.key],
      );
      if (!value) {
        return null;
      }
      return `- ${field.label}：${value}`;
    })
    .filter((line): line is string => Boolean(line));

  const sections = [params.task.prompt];
  if (starterFacts.length > 0) {
    sections.push(`启动信息：\n${starterFacts.join("\n")}`);
  }
  const referencePromptBlock = buildCuratedTaskReferencePromptBlock(
    params.referenceEntries,
  );
  if (referencePromptBlock) {
    sections.push(referencePromptBlock);
  }
  if (params.task.outputContract.length > 0) {
    sections.push(
      `本轮先优先给我：\n${params.task.outputContract
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
  }
  sections.push(
    "如果信息还不够完整，请先基于现有信息给出可执行首版，再明确指出还缺哪些内容。",
  );

  return sections.join("\n\n");
}

export function replaceCuratedTaskLaunchPromptInInput(params: {
  currentInput: string;
  previousPrompt?: string | null;
  nextPrompt: string;
}): string {
  const { currentInput, previousPrompt, nextPrompt } = params;

  if (!currentInput.trim()) {
    return nextPrompt;
  }

  if (!previousPrompt || !previousPrompt.trim()) {
    return nextPrompt;
  }

  if (currentInput === previousPrompt) {
    return nextPrompt;
  }

  if (currentInput.startsWith(previousPrompt)) {
    return `${nextPrompt}${currentInput.slice(previousPrompt.length)}`;
  }

  return nextPrompt;
}

export function listCuratedTaskTemplates(
  copy: CuratedTaskTemplateCopy = {},
): CuratedTaskTemplateItem[] {
  const usageMap = getCuratedTaskTemplateUsageMap();
  const resolvedCopy = resolveCuratedTaskTemplateCopy(copy);

  return CURATED_TASK_TEMPLATES.map((template, index) => {
    const localizedTemplate = applyCuratedTaskTemplateCopy(
      template,
      resolvedCopy,
    );
    const recentRecord = usageMap.get(template.id);
    const recentUsedAt = recentRecord?.usedAt ?? null;

    return {
      ...localizedTemplate,
      requiredInputs: localizedTemplate.requiredInputFields.map(
        (field) => field.label,
      ),
      badge: resolveCuratedTaskTemplateBadge(
        localizedTemplate,
        typeof recentUsedAt === "number",
        resolvedCopy,
      ),
      actionLabel:
        resolvedCopy.actionLabel ?? "curatedTask.templates.common.actionLabel",
      statusLabel:
        resolvedCopy.statusLabel ?? "curatedTask.templates.common.statusLabel",
      statusTone: "emerald" as const,
      recentUsedAt,
      isRecent: typeof recentUsedAt === "number",
      _sortIndex: index,
    };
  })
    .sort((left, right) => {
      if (left.recentUsedAt && right.recentUsedAt) {
        if (left.recentUsedAt !== right.recentUsedAt) {
          return right.recentUsedAt - left.recentUsedAt;
        }
      } else if (left.recentUsedAt) {
        return -1;
      } else if (right.recentUsedAt) {
        return 1;
      }

      return left._sortIndex - right._sortIndex;
    })
    .map(({ _sortIndex, ...template }) => template);
}

export function filterCuratedTaskTemplates(
  query: string,
  templates: CuratedTaskTemplateItem[] = listCuratedTaskTemplates(),
): CuratedTaskTemplateItem[] {
  return templates.filter((template) => matchesTemplateQuery(query, template));
}

function buildFeaturedTemplateBaseScore(
  template: CuratedTaskTemplateItem,
): number {
  const featuredIndex = FEATURED_HOME_CURATED_TASK_TEMPLATE_IDS.findIndex(
    (templateId) => templateId === template.id,
  );
  if (featuredIndex >= 0) {
    return 72 - featuredIndex * 7;
  }

  const nonFeaturedTemplateIds = CURATED_TASK_TEMPLATES.map(
    (current) => current.id,
  ).filter(
    (templateId) =>
      !FEATURED_HOME_CURATED_TASK_TEMPLATE_IDS.includes(
        templateId as (typeof FEATURED_HOME_CURATED_TASK_TEMPLATE_IDS)[number],
      ),
  );
  const nonFeaturedIndex = nonFeaturedTemplateIds.findIndex(
    (templateId) => templateId === template.id,
  );

  return nonFeaturedIndex >= 0 ? 30 - nonFeaturedIndex * 3 : 24;
}

function buildRecommendationSignalText(
  signal: CuratedTaskRecommendationSignal,
): string {
  return [signal.title, signal.summary, ...signal.tags]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
    .join(" ");
}

function summarizeRecommendationReferenceTitle(
  title: string,
  maxLength = 18,
): string {
  const normalized = title.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function resolveReferenceContinuationMatch(params: {
  template: CuratedTaskTemplateItem;
  referenceEntry: CuratedTaskReferenceEntry;
  copy?: CuratedTaskRecommendationCopy;
}): {
  score: number;
  reasonLabel: string;
  reasonSummary: string;
} | null {
  const { copy = {}, template, referenceEntry } = params;
  if (referenceEntry.category !== "experience") {
    return null;
  }

  if (!referenceEntry.taskPrefillByTaskId?.[template.id]) {
    return null;
  }

  const summarizedTitle = summarizeRecommendationReferenceTitle(
    referenceEntry.title,
  );

  switch (template.id) {
    case "account-project-review":
      return {
        score: 40,
        reasonLabel:
          copy.currentResultReasonLabel ??
          "curatedTask.templates.recommendation.currentResultReasonLabel",
        reasonSummary:
          copy.formatAccountProjectReviewSummary?.(summarizedTitle) ??
          `curatedTask.templates.recommendation.accountProjectReviewSummary:${summarizedTitle}`,
      };
    case "daily-trend-briefing":
      return {
        score: 15,
        reasonLabel:
          copy.resultContinuationReasonLabel ??
          "curatedTask.templates.recommendation.resultContinuationReasonLabel",
        reasonSummary:
          copy.formatDailyTrendBriefingSummary?.(summarizedTitle) ??
          `curatedTask.templates.recommendation.dailyTrendBriefingSummary:${summarizedTitle}`,
      };
    case "social-post-starter":
      return {
        score: 14,
        reasonLabel:
          copy.resultContinuationReasonLabel ??
          "curatedTask.templates.recommendation.resultContinuationReasonLabel",
        reasonSummary:
          copy.formatSocialPostStarterSummary?.(summarizedTitle) ??
          `curatedTask.templates.recommendation.socialPostStarterSummary:${summarizedTitle}`,
      };
    default:
      return null;
  }
}

function resolveRecommendationReasonLabel(
  signal: CuratedTaskRecommendationSignal,
  copy: CuratedTaskRecommendationCopy = {},
): string {
  if (signal.source === "review_feedback") {
    return (
      copy.recentReviewReasonLabel ??
      "curatedTask.templates.recommendation.recentReviewReasonLabel"
    );
  }

  const categoryLabel =
    copy.categoryLabels?.[signal.category] ||
    copy.fallbackLabel ||
    signal.category;

  if (signal.source === "active_reference") {
    return (
      copy.activeReferenceReasonLabel?.replace(
        "{{categoryLabel}}",
        categoryLabel,
      ) ??
      `curatedTask.templates.recommendation.activeReferenceReasonLabel:${categoryLabel}`
    );
  }

  const recentLabelByCategory: Partial<
    Record<CuratedTaskRecommendationCategory, string | undefined>
  > = {
    activity: copy.recentActivityReasonLabel,
    context: copy.recentContextReasonLabel,
    experience: copy.recentExperienceReasonLabel,
    identity: copy.recentIdentityReasonLabel,
    preference: copy.recentPreferenceReasonLabel,
  };

  return (
    recentLabelByCategory[signal.category] ??
    `curatedTask.templates.recommendation.recent:${categoryLabel}`
  );
}

function resolveRecommendationReasonSummary(
  signal: CuratedTaskRecommendationSignal,
  copy: CuratedTaskRecommendationCopy = {},
): string {
  if (signal.source === "review_feedback") {
    const title =
      signal.title.length > 20
        ? `${signal.title.slice(0, 20).trimEnd()}…`
        : signal.title;
    return (
      copy.formatReviewReasonSummary?.(title) ??
      `curatedTask.templates.recommendation.reviewReasonSummary:${title}`
    );
  }

  const categoryLabel =
    copy.categoryLabels?.[signal.category] ??
    getCuratedTaskReferenceCategoryLabel(signal.category);

  const title =
    signal.title.length > 18
      ? `${signal.title.slice(0, 18).trimEnd()}…`
      : signal.title;
  return (
    copy.formatSignalReasonSummary?.(categoryLabel, title) ??
    `curatedTask.templates.recommendation.signalReasonSummary:${categoryLabel}:${title}`
  );
}

function scoreTemplateForRecommendationSignal(params: {
  template: CuratedTaskTemplateItem;
  signal: CuratedTaskRecommendationSignal;
  projectId?: string | null;
  copy?: CuratedTaskRecommendationCopy;
}): {
  score: number;
  reasonLabel: string;
  reasonSummary: string;
} {
  const { copy, template, signal, projectId } = params;
  const categoryWeight =
    CURATED_TASK_RECOMMENDATION_CATEGORY_WEIGHTS[template.id]?.[
      signal.category
    ] ?? 0;
  const normalizedText = buildRecommendationSignalText(signal);
  const keywordScore = (CURATED_TASK_RECOMMENDATION_KEYWORDS[template.id] ?? [])
    .filter((keyword) => normalizedText.includes(keyword.toLowerCase()))
    .slice(0, 3).length;

  const activeReferenceBonus = signal.source === "active_reference" ? 8 : 0;
  const reviewFeedbackBonus = signal.source === "review_feedback" ? 6 : 0;
  const preferredTaskBonus = signal.preferredTaskIds?.includes(template.id)
    ? 30
    : 0;
  const projectMatchBonus =
    projectId && signal.projectId && projectId === signal.projectId ? 4 : 0;
  const recentSignalBonus =
    signal.source === "saved_inspiration" || signal.source === "review_feedback"
      ? Math.max(
          0,
          5 -
            Math.floor((Date.now() - signal.createdAt) / (24 * 60 * 60 * 1000)),
        )
      : 0;

  return {
    score:
      categoryWeight +
      keywordScore * 4 +
      activeReferenceBonus +
      reviewFeedbackBonus +
      preferredTaskBonus +
      projectMatchBonus +
      recentSignalBonus,
    reasonLabel: resolveRecommendationReasonLabel(signal, copy),
    reasonSummary: resolveRecommendationReasonSummary(signal, copy),
  };
}

export function listFeaturedHomeCuratedTaskTemplates(
  templates: CuratedTaskTemplateItem[] = listCuratedTaskTemplates(),
  options: {
    copy?: CuratedTaskTemplateCopy;
    projectId?: string | null;
    referenceEntries?: CuratedTaskReferenceEntry[] | null;
    sessionId?: string | null;
    limit?: number;
  } = {},
): FeaturedCuratedTaskTemplateItem[] {
  const limit = options.limit ?? FEATURED_HOME_CURATED_TASK_TEMPLATE_IDS.length;
  const resolvedCopy = resolveCuratedTaskTemplateCopy(options.copy);
  const referenceEntries = mergeCuratedTaskReferenceEntries(
    options.referenceEntries ?? [],
  );
  const signals = [
    ...buildCuratedTaskRecommendationSignalsFromReferenceEntries(
      referenceEntries,
      {
        projectId: options.projectId,
        sessionId: options.sessionId,
      },
    ),
    ...listCuratedTaskRecommendationSignals({
      projectId: options.projectId,
      sessionId: options.sessionId,
    }),
  ];

  return templates
    .map((template) => {
      const bestSignalMatch = signals.reduce<{
        score: number;
        reasonLabel?: string;
        reasonSummary?: string;
      }>(
        (best, signal) => {
          const current = scoreTemplateForRecommendationSignal({
            template,
            signal,
            projectId: options.projectId,
            copy: resolvedCopy.recommendation,
          });
          if (current.score <= best.score) {
            return best;
          }
          return current;
        },
        { score: 0 },
      );
      const bestReferenceContinuationMatch = referenceEntries.reduce<{
        score: number;
        reasonLabel?: string;
        reasonSummary?: string;
      }>(
        (best, referenceEntry) => {
          const current = resolveReferenceContinuationMatch({
            template,
            referenceEntry,
            copy: resolvedCopy.recommendation,
          });
          if (!current || current.score <= best.score) {
            return best;
          }

          return current;
        },
        { score: 0 },
      );
      const bestReasonMatch =
        bestReferenceContinuationMatch.score > 0
          ? bestReferenceContinuationMatch
          : bestSignalMatch;

      return {
        template,
        badgeLabel: bestReasonMatch.reasonLabel || template.badge,
        reasonLabel: bestReasonMatch.reasonLabel,
        reasonSummary: bestReasonMatch.reasonSummary,
        _continuationPriority: bestReferenceContinuationMatch.score > 0 ? 1 : 0,
        _score:
          buildFeaturedTemplateBaseScore(template) +
          bestReasonMatch.score +
          (bestReasonMatch.score >= 20 ? 24 : 0),
      };
    })
    .sort((left, right) => {
      if (left._continuationPriority !== right._continuationPriority) {
        return right._continuationPriority - left._continuationPriority;
      }
      if (left._score !== right._score) {
        return right._score - left._score;
      }
      return left.template.title.localeCompare(right.template.title, "zh-CN");
    })
    .slice(0, limit)
    .map(
      ({
        _continuationPriority: _ignoredContinuationPriority,
        _score: _ignoredScore,
        ...item
      }) => item,
    );
}

export function findCuratedTaskTemplateById(
  templateId: string,
  copy: CuratedTaskTemplateCopy = {},
): CuratedTaskTemplateItem | null {
  return (
    listCuratedTaskTemplates(copy).find(
      (template) => template.id === templateId,
    ) ?? null
  );
}

export function resolveCuratedTaskFollowUpActionTarget(params: {
  taskId?: string | null;
  action: string;
  copy?: CuratedTaskTemplateCopy;
}): {
  task: CuratedTaskTemplateItem;
  promptHint?: string;
} | null {
  const taskId = params.taskId?.trim();
  const action = params.action.trim();
  if (!taskId || !action) {
    return null;
  }

  const sourceTask = findCuratedTaskTemplateById(taskId, params.copy);
  const target = sourceTask?.followUpActionTargets?.[action];
  if (!target?.taskId) {
    return null;
  }

  const task = findCuratedTaskTemplateById(target.taskId, params.copy);
  if (!task) {
    return null;
  }

  return {
    task,
    ...(target.promptHint?.trim()
      ? {
          promptHint: target.promptHint.trim(),
        }
      : {}),
  };
}

export function recordCuratedTaskTemplateUsage(
  input:
    | string
    | {
        templateId: string;
        usedAt?: number;
        launchInputValues?: CuratedTaskInputValues | null;
        referenceMemoryIds?: string[] | null;
        referenceEntries?: CuratedTaskReferenceEntry[] | null;
      },
): void {
  const normalizedInput =
    typeof input === "string" ? { templateId: input } : input;
  const normalizedReferenceEntries = mergeCuratedTaskReferenceEntries(
    normalizedInput.referenceEntries ?? [],
  ).slice(0, 3);
  const normalizedReferenceMemoryIds = normalizeCuratedTaskReferenceMemoryIds([
    ...(normalizedInput.referenceMemoryIds ?? []),
    ...(extractCuratedTaskReferenceMemoryIds(normalizedReferenceEntries) ?? []),
  ]);
  const normalizedLaunchInputValues = normalizeCuratedTaskUsageInputValues(
    normalizedInput.launchInputValues,
  );
  const nextRecord = normalizeCuratedTaskUsageRecord({
    templateId: normalizedInput.templateId,
    usedAt: normalizedInput.usedAt ?? Date.now(),
    ...(normalizedLaunchInputValues
      ? {
          launchInputValues: normalizedLaunchInputValues,
        }
      : {}),
    ...(normalizedReferenceMemoryIds
      ? {
          referenceMemoryIds: normalizedReferenceMemoryIds,
        }
      : {}),
    ...(normalizedReferenceEntries.length > 0
      ? {
          referenceEntries: normalizedReferenceEntries,
        }
      : {}),
  });

  const nextRecords = [
    nextRecord,
    ...listCuratedTaskTemplateUsage().filter(
      (record) => record.templateId !== nextRecord.templateId,
    ),
  ].slice(0, MAX_CURATED_TASK_TEMPLATE_USAGE_RECORDS);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      CURATED_TASK_TEMPLATE_USAGE_STORAGE_KEY,
      JSON.stringify(nextRecords),
    );
    emitCuratedTaskTemplateUsageChanged();
  } catch {
    // ignore write errors
  }
}
