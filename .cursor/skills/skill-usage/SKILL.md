---
name: skill-usage
description: "Pintail 兼容壳（compatibility shim）。把通用的 skill-usage 遥测查询/记录请求映射到 MyWiki 的 telemetry 体系。仅作兼容入口，实际逻辑委托给 mywiki-session-telemetry-fallback 与 mywiki-skill-telemetry-health。触发词：skill usage、skill 使用统计、记录 skill 调用、pintail。"
---

# skill-usage：Pintail 兼容壳

本技能是一个**兼容壳**，存在的目的是让习惯 Pintail / 通用 `skill-usage` 命名的工作流也能触发 MyWiki 的遥测体系，避免命名鸿沟。

## 它不做实事，只转发

| 用户意图 | 委托给 |
| --- | --- |
| 记录/补录 skill 调用 | `mywiki-session-telemetry-fallback/SKILL.md`（L1 补录） |
| 查询/分析 skill 使用统计 | `mywiki-skill-telemetry-health/SKILL.md`（L2 A） |
| 生成使用总结 | `mywiki-telemetry-work-pipeline/SKILL.md`（L2 C） |

## 数据格式对齐

MyWiki 的 skill-usage JSONL schema 见 `mywiki-session-telemetry-fallback/SKILL.md`。本壳不引入新格式，确保单一数据契约（single source of truth）。

## 为什么保留

- 降低迁移成本：从其他 skill-usage 生态迁来的用户无需改口令。
- 隔离命名差异：把「兼容」这件事集中到一个壳里，不污染核心技能。
