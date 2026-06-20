---
name: mywiki-today-work-summary
description: "今日总结入口。把'今天干了什么/今日总结/工作总结'请求转交给 L2 Pipeline（mywiki-telemetry-work-pipeline）按 A→B 执行，禁止直接手写总结正文。触发词：今日总结、今天干了什么、工作总结、日报、today summary、本周总结。"
---

# mywiki-today-work-summary：今日总结入口

这是面向用户的友好入口。它**不自己写总结**，而是转交给 L2 编排层。

## 行为

1. 识别窗口：默认今天；用户说「本周」「昨天」「某日期」则相应调整。
2. **强制路由**：Read `mywiki-telemetry-work-pipeline/SKILL.md`，按其 A → B 顺序执行。
3. 不得跳过 Pipeline 直接凭记忆写总结正文（规则 `00-mywiki-routing` 的硬约束）。

## 为什么不直接写

直接手写总结会：

- 丢失量化依据（trigger rate、skills_unknown 等指标）。
- 不产出机读 JSONL，L4 优化无数据可用。
- 破坏「数据驱动进化」原则。

## degraded 提示

若今日 telemetry 数据为空（Cursor 无 hooks），先提示：

> 今天还没有遥测数据。要先用「补录今天的遥测」记录本会话用过的 skill 吗？补录后总结才有量化依据。
