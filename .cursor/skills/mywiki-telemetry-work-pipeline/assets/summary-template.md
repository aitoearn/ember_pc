---
type: meta
title: "工作总结 {{DATE}}"
window: "{{WINDOW}}"
created: {{DATE}}
updated: {{DATE}}
tags: [meta, telemetry, work-summary]
status: evergreen
a_executed: {{A_EXECUTED}}
---

# 工作总结 · {{WINDOW}}

> 由 L2 Pipeline（A 分析 → B 落盘）生成。人读版，机读版见 `work-summary-{{MONTH}}.jsonl`。

## 一句话概括

{{ONE_LINER}}

## 量化统计

| 指标 | 值 |
| --- | --- |
| 总 skill 调用 | {{TOTAL}} |
| 触发率（估计） | {{TRIGGER_RATE}} |
| skills_unknown | {{SKILLS_UNKNOWN}} |
| 主归因项目 | {{SCOPE_PROJECT}} |

### 各 skill 明细

| skill | 调用 | success | partial | fail |
| --- | --- | --- | --- | --- |
{{SKILL_ROWS}}

## Skill 体系结论（来自 A）

- 建议补 trigger 样例：{{ADD_TRIGGER}}
- 建议优化既有 skill：{{OPTIMIZE_SKILL}}
- 建议新建 skill：{{NEW_SKILL}}
- 原因：{{REASON}}
- 涉及 skill：{{INVOLVED_SKILLS}}

## 叙事（narrative）

{{NARRATIVE}}

## 下一步

{{NEXT_STEPS}}

---

<!-- 若 a_executed=false，B-only 模式：本总结未经 A 分析，统计可能不完整。 -->
