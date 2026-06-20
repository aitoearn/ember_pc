---
name: obsidian-wiki
description: "初始化与定义 MyWiki 知识库架构（scaffold）。新建 vault 骨架、解释目录结构、frontmatter 规范、写后闭环，并把请求路由到子技能（ingest/query/lint/save）。触发词：初始化知识库、建 wiki、scaffold、新建知识库、wiki 架构是什么、setup wiki。"
---

# obsidian-wiki：知识库脚手架与架构（router + scaffold）

本技能负责两件事：**初始化新 wiki 骨架** 与 **解释/定义知识库架构**，并在用户意图明确时路由到具体子技能。

## 路由到子技能

| 用户想做 | 读取 |
| --- | --- |
| 入库一个源 | `obsidian-wiki-ingest/SKILL.md` |
| 提问 / 查询 | `obsidian-wiki-query/SKILL.md` |
| 保存会话结论 | `obsidian-save/SKILL.md` |
| 健康检查 | `obsidian-wiki-lint/SKILL.md` |
| 自动研究补洞 | `obsidian-autoresearch/SKILL.md` |
| 沉淀（该放 central 还是 projects） | `mywiki-router/SKILL.md` |

## 初始化骨架

若目标 wiki 目录尚无 `index.md`：

- vault / 外挂 vault：复制 `kit/wiki-scaffold/*` 到 `$MYWIKI_ROOT/wiki/`。
- project-local：运行 `bash <kit>/scripts/init-project-local.sh`。

已存在 `index.md` 则**跳过**，不覆盖已有知识。

## 目录架构

```
wiki/
├── index.md      全局索引（Agent 检索第一站）
├── log.md        操作日志（append-only，新条目置顶）
├── hot.md        热缓存（≤500字，会话快速入口）
├── overview.md   全景概览
├── raw/          原始文件（不可变）+ .manifest.json
│   ├── articles/  images/  documents/
├── sources/      源摘要页（含 ![[raw/...]] 链接原文）
├── concepts/     概念页
├── entities/     实体页（人/组织/产品/仓库）
├── domains/      主题域
├── comparisons/  对比分析
├── questions/    问答存档
├── central/      跨项目可复用知识
├── projects/<id>/ 项目专属知识
└── meta/         inbox、lint 报告、telemetry
```

## Frontmatter 规范

扁平 YAML（flat YAML）。详见 `references/frontmatter.md`。核心字段：`type`、`title`、`created`、`updated`、`tags`、`status`、`related`、`sources`。

## 关键约定

1. **`raw/` 不可变**：源是只读的。
2. **会话开始先读 `hot.md`**（若存在）。
3. **内部引用用双链** `[[页面名]]`。
4. **`log.md` 只追加**，不改历史。
5. **`hot.md` 是缓存**，会话收尾时覆盖重写。

## 写后闭环（纪律）

改 wiki 正文后必须：`index.md` → 域 `_index.md` → `log.md` → `hot.md`。缺任一步导致孤岛或死链。

## 参考文件（references/）

- `frontmatter.md` — frontmatter 字段规范
- `css-snippets.md` — 4 种自定义 callout
- `git-setup.md` — 版本管理建议
- `mcp-setup.md` — Obsidian MCP 接入（可选）
- `modes.md` — vault / project-local / 外挂 vault 模式
- `plugins.md` — 推荐 Obsidian 插件
- `wikilink-embed.md` — 源页链接原文的写法
