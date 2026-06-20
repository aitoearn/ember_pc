---
name: mywiki-session-telemetry-fallback
description: "MyWiki degraded 模式遥测补录（L1）。Cursor 无 hooks 自动采集，本技能在会话收尾时手动把本会话用过的 skill 补录成 skill-usage JSONL。触发词：补录今天的遥测、记录这次会话、补录 skill 使用、telemetry fallback、手动采集。"
---

# mywiki-session-telemetry-fallback：遥测补录（L1 degraded）

Cursor 没有 `afterAgentResponse` hook，L1 的自动静默采集不可用。本技能让用户在会话收尾时**手动补录**，给 L2 Pipeline 喂数据。

## 原则

- **无损、诚实**：只记录真实发生过的 skill 调用，**禁止伪造**。
- **静默友好**：补录是一条 append，不打断主线工作。
- **degraded 自觉**：数据量必然小于 full 模式，这是已知取舍。

## 流程

1. 定位 telemetry 目录：`$WIKI_DIR/meta/telemetry/`（不存在则创建）。
2. 回顾本会话真实用过哪些 MyWiki skill（query/ingest/save/lint/router/autoresearch/...）。
3. 为每次 skill 调用生成一条 JSONL 记录（schema 见下）。
4. append 到 `skill-usage-YYYY-MM.jsonl`（按月分文件）。
5. 报告：「已补录 N 条 skill-usage 记录到 <文件>」。

## skill-usage 记录 schema

```json
{
  "schema_version": 1,
  "record_type": "skill_usage",
  "event_id": "su-20260101-001",
  "ts": "2026-01-01T23:15:00+08:00",
  "session_id": "<会话标识或日期>",
  "skill": "obsidian-wiki-query",
  "trigger": "用户原话的简短摘要",
  "outcome": "success",
  "scope_project": "<project-id 或 central>",
  "artifacts": ["wiki/questions/xxx.md"],
  "notes": "补充说明",
  "collection_mode": "degraded-fallback"
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `schema_version` | 是 | 当前为 1 |
| `record_type` | 是 | 固定 `skill_usage` |
| `event_id` | 是 | `su-<日期>-<序号>`，全局唯一 |
| `ts` | 是 | ISO8601 带时区 |
| `skill` | 是 | skill 名（与目录名一致） |
| `outcome` | 是 | `success`/`partial`/`fail`/`skipped` |
| `scope_project` | 是 | 本次归因的项目，跨项目用 `central` |
| `trigger` | 否 | 触发该 skill 的用户意图摘要 |
| `artifacts` | 否 | 产出/改动的文件路径列表 |
| `collection_mode` | 是 | `degraded-fallback`（标明是补录的） |

## 与 L2 的契约

L2 A（`mywiki-skill-telemetry-health`）会读这些 JSONL 做统计。补录质量直接决定 L2 分析上限——**这是「数据采集层质量决定系统上限」原则的体现**。

## 不要做的事

- 不补录没真正发生的调用。
- 不修改历史记录（append-only）。
- 不把敏感内容原文塞进 `trigger`/`notes`（只放摘要）。
