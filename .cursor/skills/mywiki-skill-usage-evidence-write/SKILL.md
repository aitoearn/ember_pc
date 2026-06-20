---
name: mywiki-skill-usage-evidence-write
description: "L2 组件 B：MyWiki 证据汇总与双轨落盘（病历书写员角色）。接收 A 的分析报告，组装人读 Markdown + 机读 JSONL 两版总结并落盘。只整理不分析。由 mywiki-telemetry-work-pipeline 编排调用。触发词：落盘工作总结、双轨写入、evidence write、生成今日总结文档。"
---

# mywiki-skill-usage-evidence-write（L2 · B）：病历书写员

**角色**：病历书写员。**硬性约束：只整理不分析**（不自己产生统计结论，数字来自 A）。

接收 A 的报告，产出双轨文档：人读 Markdown + 机读 JSONL，保证两轨一致。

## 输入

- A（`mywiki-skill-telemetry-health`）的报告。
- 若用户拒绝提供 A 的交包 → 允许 **B-only 模式**，但落盘文档必须声明「未执行 A」。

## 校验 A 的数字（强制）

落盘前，B 必须复核 A 报告中的关键数字与原始 JSONL 一致（抽查总记录数、各 skill 计数）。不一致则标注「A/B 数字不符」并以原始数据为准。

## 双轨落盘

### 4a 人读（Markdown）

按 `mywiki-telemetry-work-pipeline/assets/summary-template.md` 渲染，写入 daily 目录：
`$WIKI_DIR/meta/telemetry/daily/work-summary-YYYY-MM-DD.md`

包含：表格、状态标记、narrative 段落、A 的三布尔结论与原因。

### 4b 机读（JSONL）

append 到 `$WIKI_DIR/meta/telemetry/work-summary-YYYY-MM.jsonl`：

```json
{
  "schema_version": 1,
  "record_type": "work_summary",
  "event_id": "ws-20260101-001",
  "ts": "2026-01-01T23:30:00+08:00",
  "window": "2026-01-01",
  "stats": { "total": 12, "by_skill": {"query": 5, "ingest": 3}, "skills_unknown": 1, "trigger_rate": 0.83 },
  "recommendations": { "add_trigger": false, "optimize_skill": true, "new_skill": false },
  "reason": "obsidian-wiki-query 多次 partial，建议优化 description",
  "scope_project": "central",
  "artifacts": ["wiki/meta/telemetry/daily/work-summary-2026-01-01.md"],
  "a_executed": true
}
```

## 原子性（atomicity）

**4a 失败则不跑 4b**，保证人读与机读两轨一致。先写 Markdown，成功后再 append JSONL。

## 失败语义

| 场景 | 处理 |
| --- | --- |
| A 成功、B 失败 | 上游（C）返回 A 的结论，标注「B/落盘未完成」 |
| 4a 失败 | 不跑 4b（原子性） |
| B-only（无 A） | 允许，但文档与 JSONL 标注 `a_executed: false` |

## 与 Pipeline 的契约

B 是纯落盘组件。它不决定「要不要优化 skill」（那是 A 的判断），只忠实记录与归档。
