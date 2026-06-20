import type { ExpertCatalog } from "./types";

export const SEEDED_EXPERT_CATALOG_VERSION =
  "client-seed-2026-06-16-experts-test-platform";
export const SEEDED_EXPERT_CATALOG_TENANT_ID = "local-seeded";
export const SEEDED_EXPERT_CATALOG_SYNCED_AT = "2026-06-16T00:00:00.000Z";

export const SEEDED_EXPERT_CATALOG: ExpertCatalog = {
  version: SEEDED_EXPERT_CATALOG_VERSION,
  tenantId: SEEDED_EXPERT_CATALOG_TENANT_ID,
  syncedAt: SEEDED_EXPERT_CATALOG_SYNCED_AT,
  categories: [
    { key: "all", title: "全部", sort: 0 },
    { key: "test-strategy", title: "测试策略", sort: 10 },
    { key: "test-design", title: "用例设计", sort: 20 },
    { key: "automation", title: "自动化测试", sort: 30 },
    { key: "performance", title: "性能测试", sort: 40 },
    { key: "security", title: "安全测试", sort: 50 },
    { key: "quality", title: "质量分析", sort: 60 },
  ],
  rankings: [
    {
      key: "personal_picks",
      title: "为你推荐",
      summary: "适合多数测试团队先添加的专家。",
      items: ["marketing-strategist", "knowledge-organizer", "code-literature"],
      generatedAt: SEEDED_EXPERT_CATALOG_SYNCED_AT,
    },
    {
      key: "popular_now",
      title: "热门精选",
      summary: "本地种子目录中的高频测试专家。",
      items: ["short-video-scriptwriter", "data-analyst", "contract-reviewer"],
      generatedAt: SEEDED_EXPERT_CATALOG_SYNCED_AT,
    },
    {
      key: "fresh_releases",
      title: "最近上新",
      summary: "最近补充的非功能与质量分析专家。",
      items: ["data-analyst", "contract-reviewer", "code-literature"],
      generatedAt: SEEDED_EXPERT_CATALOG_SYNCED_AT,
    },
  ],
  items: [
    {
      id: "marketing-strategist",
      slug: "marketing-strategist",
      title: "测试策略专家",
      summary: "拆版本范围、定测试策略、排回归优先级，适合测试负责人和发布经理。",
      avatar: { kind: "emoji", value: "🧭" },
      category: "test-strategy",
      tags: ["regression", "strategy", "release"],
      source: "seeded_fallback",
      stats: {
        usageCount: 9700,
        likeCount: 461,
        hotScore: 0.91,
        freshReleasedAt: "2026-05-01T00:00:00.000Z",
      },
      release: {
        releaseId: "rel-marketing-strategist-20260515",
        version: "1.0.0",
        personaRef: "expert-persona:marketing-strategist@1.0.0",
        personaHash: "sha256:seeded-marketing-strategist",
        memoryTemplateRef: "memory-template:marketing-strategist@1.0.0",
        skillRefs: ["service-skill:daily-trend-briefing"],
        workflowRefs: ["workflow:regression-test-plan"],
        readiness: { requiresModel: true, requiresProject: true },
        releasedAt: "2026-05-15T00:00:00.000Z",
      },
      promptStarters: [
        "帮我整理 v2.3 发布的回归测试范围",
        "按核心模块给出这周的测试优先级",
      ],
      showcase: [
        {
          title: "回归策略卡",
          body: "输出版本范围、核心链路、风险模块和下一步验证动作。",
        },
      ],
    },
    {
      id: "knowledge-organizer",
      slug: "knowledge-organizer",
      title: "用例设计专家",
      summary: "把需求、接口契约和边界条件整理成结构化用例与断言清单。",
      avatar: { kind: "emoji", value: "📝" },
      category: "test-design",
      tags: ["testcase", "api", "requirements"],
      source: "seeded_fallback",
      stats: { usageCount: 8300, likeCount: 392, hotScore: 0.86 },
      release: {
        releaseId: "rel-knowledge-organizer-20260515",
        version: "1.0.0",
        personaRef: "expert-persona:knowledge-organizer@1.0.0",
        personaHash: "sha256:seeded-knowledge-organizer",
        memoryTemplateRef: "memory-template:knowledge-organizer@1.0.0",
        skillRefs: ["service-skill:short-video-script-replication"],
        workflowRefs: ["workflow:test-case-design"],
        readiness: { requiresModel: true, requiresProject: true },
      },
      promptStarters: [
        "按这份 PRD 整理功能测试用例",
        "围绕订单接口补正常、边界和异常用例",
      ],
      showcase: [
        {
          title: "用例结构",
          body: "按前置条件、步骤、输入、期望结果和断言点整理。",
        },
      ],
    },
    {
      id: "code-literature",
      slug: "code-literature",
      title: "自动化测试专家",
      summary: "帮你设计 E2E 主路径、补断言点并维护可执行的自动化方案。",
      avatar: { kind: "emoji", value: "🤖" },
      category: "automation",
      tags: ["e2e", "automation", "regression"],
      source: "seeded_fallback",
      stats: { usageCount: 55000, likeCount: 6700, hotScore: 0.94 },
      release: {
        releaseId: "rel-code-literature-20260515",
        version: "1.0.0",
        personaRef: "expert-persona:code-literature@1.0.0",
        personaHash: "sha256:seeded-code-literature",
        skillRefs: ["service-skill:story-video-suite"],
        workflowRefs: ["workflow:e2e-automation-plan"],
        readiness: { requiresModel: true, requiresProject: true },
      },
      promptStarters: [
        "把登录到下单这条主路径编排成 E2E 方案",
        "帮我补这条自动化链路的断言和数据准备",
      ],
      showcase: [
        {
          title: "E2E 执行清单",
          body: "输出主路径、分支路径、数据依赖和断言检查点。",
        },
      ],
    },
    {
      id: "short-video-scriptwriter",
      slug: "short-video-scriptwriter",
      title: "性能测试专家",
      summary: "围绕 SLA、负载目标和关键接口，整理可执行的性能测试方案。",
      avatar: { kind: "emoji", value: "⚡" },
      category: "performance",
      tags: ["performance", "load", "sla"],
      source: "seeded_fallback",
      stats: { usageCount: 22000, likeCount: 1700, hotScore: 0.9 },
      release: {
        releaseId: "rel-short-video-scriptwriter-20260515",
        version: "1.0.0",
        personaRef: "expert-persona:short-video-scriptwriter@1.0.0",
        personaHash: "sha256:seeded-short-video-scriptwriter",
        skillRefs: ["service-skill:cloud-video-dubbing"],
        workflowRefs: ["workflow:performance-test-plan"],
        readiness: { requiresModel: true, requiresProject: true },
      },
      promptStarters: [
        "给首页接口做并发 500 的性能测试方案",
        "整理这条链路的压测指标和停止条件",
      ],
      showcase: [
        {
          title: "性能方案",
          body: "输出负载模型、关键指标阈值、监控项和回归建议。",
        },
      ],
    },
    {
      id: "contract-reviewer",
      slug: "contract-reviewer",
      title: "安全测试专家",
      summary: "快速梳理威胁面、攻击路径和鉴权/越权相关的验证点。",
      avatar: { kind: "emoji", value: "🛡️" },
      category: "security",
      tags: ["security", "auth", "risk"],
      source: "seeded_fallback",
      stats: { usageCount: 4100, likeCount: 287, hotScore: 0.78 },
      release: {
        releaseId: "rel-contract-reviewer-20260515",
        version: "1.0.0",
        personaRef: "expert-persona:contract-reviewer@1.0.0",
        personaHash: "sha256:seeded-contract-reviewer",
        skillRefs: ["service-skill:article-to-slide-video-outline"],
        workflowRefs: ["workflow:security-test-review"],
        readiness: { requiresModel: true, requiresProject: true },
      },
      promptStarters: [
        "围绕登录与权限模块整理安全测试提纲",
        "列出这份 API 清单的高风险验证点",
      ],
      showcase: [
        {
          title: "安全验证清单",
          body: "按威胁面、攻击路径、验证步骤和优先级输出。",
        },
      ],
    },
    {
      id: "data-analyst",
      slug: "data-analyst",
      title: "质量分析专家",
      summary: "把缺陷、稳定性指标和版本质量信号整理成可跟进的分析结论。",
      avatar: { kind: "emoji", value: "📊" },
      category: "quality",
      tags: ["quality", "stability", "metrics"],
      source: "seeded_fallback",
      stats: {
        usageCount: 64000,
        likeCount: 5400,
        hotScore: 0.92,
        freshReleasedAt: "2026-05-10T00:00:00.000Z",
      },
      release: {
        releaseId: "rel-data-analyst-20260515",
        version: "1.0.0",
        personaRef: "expert-persona:data-analyst@1.0.0",
        personaHash: "sha256:seeded-data-analyst",
        skillRefs: ["service-skill:account-performance-tracking"],
        workflowRefs: ["workflow:quality-insight-report"],
        readiness: { requiresModel: true, requiresProject: true },
      },
      promptStarters: [
        "分析这版发布的缺陷分布和回归风险",
        "帮我整理核心服务的稳定性观察指标",
      ],
      showcase: [
        {
          title: "质量复盘",
          body: "输出关键变化、风险模块、验证建议和下一步动作。",
        },
      ],
    },
  ],
};

export function getSeededExpertCatalog(): ExpertCatalog {
  return JSON.parse(JSON.stringify(SEEDED_EXPERT_CATALOG)) as ExpertCatalog;
}
