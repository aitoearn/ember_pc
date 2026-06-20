---
name: mywiki-skill-telemetry-health
description: "L2 组件 A：MyWiki 遥测健康检查与分析（数据分析师角色）。读 skill-usage JSONL，产出量化统计 + Skill 体系优化建议。只分析不写入。由 mywiki-telemetry-work-pipeline 编排调用。触发词：分析 skill 使用、遥测健康检查、telemetry health、skill 体系诊断。"
allowed-tools: Read Glob Grep
---

# mywiki-skill-telemetry-health（L2 · A）：数据分析师

**角色**：数据分析师。**硬性约束：只分析不写入**（不碰 wiki 正文，不落盘文档；产出物是返回给 B 的结构化报告）。

把原始 skill-usage JSONL（可能数千行）压缩成可决策的量化结论 + 3 个布尔建议。

## 输入

- `$WIKI_DIR/meta/telemetry/skill-usage-*.jsonl`（L1 采集 / degraded 补录）
- 可选窗口参数：默认「今天」，可指定日期范围。

## 分析步骤

1. 读取窗口内所有 skill-usage 记录。
2. 计算量化统计：
   - 各 skill 调用次数、success/partial/fail 占比
   - `skills_unknown`：用户意图本应触发某 skill 却没触发的疑似漏触发数
   - trigger rate 估计（成功触发 / 应触发）
   - scope_project 分布
3. 识别问题：
   - 哪些 skill 频繁 fail/partial（需优化）
   - 哪些意图反复漏触发（需补 trigger 样例）
   - 是否出现「用户做了某类事但无对应 skill」（需新建 skill）

## 核心输出（返回给 B，不落盘）

```markdown
## Skill 体系结论（skill-creator 总结模式）
- 是否建议补 trigger 样例：是 / 否
- 是否建议优化既有 skill：是 / 否
- 是否建议新建 skill：是 / 否
- 原因：（trigger / 优化 / 新建 可分段陈述）
- scope_project：（本轮窗口主归因）
- 涉及 skill：（带可打开路径，如 .cursor/skills/obsidian-wiki-query/SKILL.md）

## 量化统计
- 总记录数：N
- 各 skill：query×a（success a1/partial a2/fail a3）, ingest×b, ...
- skills_unknown：c
- trigger rate（估计）：xx%
```

## 失败语义

| 场景 | 处理 |
| --- | --- |
| 无 telemetry 文件 | 返回「无数据」结论，建议先用 `mywiki-session-telemetry-fallback` 补录 |
| JSONL 部分行损坏 | 跳过坏行并在报告中计数，**不静默丢弃** |
| 窗口内 0 条记录 | 明确返回空窗口，不编造统计 |

## 与 Pipeline 的契约

- A **不知道 B 的存在**，只产出标准格式报告。
- A 的数字是 B 的输入；B 必须校验 A 的数字（见 B 的 SKILL）。
- A 失败不影响 B 的独立性（B 可降级 B-only 运行）。
