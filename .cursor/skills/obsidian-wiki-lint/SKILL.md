---
name: obsidian-wiki-lint
description: "MyWiki 知识库健康检查（lint）。扫描孤岛页、死链、知识空白、过时页、frontmatter 缺陷，产出报告到 meta/。触发词：健康检查、查死链、查孤岛、知识库体检、lint、wiki lint、检查知识库质量。"
allowed-tools: Read Glob Grep
---

# obsidian-wiki-lint：知识库健康检查

定期体检，防止知识图谱腐烂。只读分析 + 产出报告，不自动改页面（修复由用户确认后进行）。

## 检查项

| 项目 | 定义 | 严重度 |
| --- | --- | --- |
| **孤岛页（orphan）** | 没有任何其他页用双链指向它 | 中 |
| **死链（dead link）** | `[[X]]` 指向不存在的页面 | 高 |
| **知识空白（gap）** | index 提到但无内容、或 questions 标记未答 | 中 |
| **过时页（stale）** | `updated` 超过阈值（默认 180 天）且 status 非 evergreen | 低 |
| **frontmatter 缺陷** | 缺 `type`/`title`/`status`，或非法 YAML | 中 |
| **闭环漏洞** | 新页未登记进 index，或日志缺失 | 高 |

## 流程

1. 定位 wiki：`python3 <kit>/scripts/mywiki_storage.py wiki-dir`。
2. 用 Glob 列出 `wiki/**/*.md`。
3. 用 Grep 收集所有双链 `\[\[[^\]]+\]\]`，构建链接图。
4. 比对：哪些页无入链（孤岛）、哪些链接目标不存在（死链）。
5. 扫 frontmatter：缺字段、非法 YAML。
6. 按 `updated` 找过时页。
7. 产出报告到 `wiki/meta/lint-report-YYYY-MM-DD.md`，并把摘要写入 `meta/inbox.md` 的「知识库健康」段。

## 报告格式

```markdown
# Lint 报告 YYYY-MM-DD

- 总页数：N ｜ 孤岛：a ｜ 死链：b ｜ 空白：c ｜ 过时：d

## 死链（高）
- [[源页]] → [[不存在的页]]

## 孤岛（中）
- [[孤岛页]]（建议：从 index 或相关页加双链）

## 知识空白（中）
- index 提到 [[X]] 但无对应文件

## 过时（低）
- [[页]]（updated: YYYY-MM-DD，已 N 天）
```

## 修复建议

报告里给建议，但**不自动改**。高危项（死链、闭环漏洞）提示用户优先处理。
contradiction/gap 用对应 callout 在页面标注（见 `obsidian-wiki/references/css-snippets.md`）。

## 遥测（degraded）

补录 skill-usage：`skill="obsidian-wiki-lint"`、`outcome`、报告路径写入 `artifacts`。
