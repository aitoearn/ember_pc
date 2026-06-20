---
name: obsidian-wiki-ingest
description: "把源收录进 MyWiki 知识库（L3 写入）。读源、抽取实体与概念、创建/更新 wiki 页、交叉引用、记日志。支持文件、URL、图片、批量。一个源通常触及 8-15 个页面。触发词：入库、收录、处理这个文件、把这个加进知识库、读一下并归档、批量入库、ingest、ingest this url。"
---

# obsidian-wiki-ingest：源入库（L3 写入）

读源、写库、交叉引用一切。一个源通常触及 8–15 个 wiki 页。
所有 Obsidian 语法用 Obsidian Flavored Markdown：双链 `[[页面名]]`、callout `> [!type] 标题`、嵌入 `![[file]]`、属性用 YAML frontmatter。

## 第一步：定位 wiki

```bash
WIKI_DIR=$(python3 <kit>/scripts/mywiki_storage.py wiki-dir)
```

## 防重复入库（delta tracking）

入库前查 `wiki/raw/.manifest.json`，按哈希避免重复处理。

```bash
# macOS
HASH=$(md5 -q "<文件>")
# Linux
# HASH=$(md5sum "<文件>" | cut -d' ' -f1)
```

1. 路径已存在且哈希一致 → 跳过，提示「已入库（未变更）。如需重做说 force」。
2. 缺失或哈希不同 → 继续。

manifest 格式：

```json
{
  "sources": {
    "raw/articles/slug-2026-01-01.md": {
      "hash": "abc123",
      "ingested_at": "2026-01-01",
      "pages_created": ["wiki/sources/slug.md", "wiki/entities/Person.md"],
      "pages_updated": ["wiki/index.md"]
    }
  },
  "address_map": {}
}
```

用户说「force」「重新入库」时跳过 delta 检查。

## 文件类型路由

| 类型 | 落点 |
| --- | --- |
| `.md`、web 抓取 | `wiki/raw/articles/` |
| `.png/.jpg/.jpeg/.gif/.webp/.svg` | `wiki/raw/images/` |
| `.pdf/.docx` | `wiki/raw/documents/` |

## URL 入库

触发：用户给出 `https://` 链接。

1. 用 WebFetch 抓取。
2. 可选清洗：若有 `obsidian-inbox-refine` 或 defuddle 类工具，先去广告/导航。
3. 从 URL 末段派生 slug（小写、空格转连字符、去查询串）。
4. 存到 `wiki/raw/articles/<slug>-<YYYY-MM-DD>.md`，加 frontmatter（`source_url`、`fetched`）。
5. 转入「单源入库」第 2 步。

## 图片 / 视觉入库

触发：用户给出图片路径。

1. 用 Read 读图（可原生处理图像）。
2. 描述内容：OCR 提取文字、识别概念/实体/图表/数据。
3. 存描述到 `wiki/raw/images/<slug>-<YYYY-MM-DD>.md`（frontmatter `source_type: image`、`original_file`）。
4. 转入「单源入库」。

## 单源入库（11 步）

1. **读** 源，完整读，不略读。
2. **讨论** 要点：问「重点强调什么？多细？」用户说「直接入库」则跳过。
3. **创建** `wiki/sources/` 摘要页（按 `_templates/source.md`，含 wikilink-embed 链接原文）。
4. **创建/更新** 实体页：每个人/组织/产品/仓库一页。
5. **创建/更新** 概念页：重要思想与框架。
6. **更新** 相关域页与其 `_index.md`。
7. **更新** `overview.md`（若大局变了）。
8. **更新** `index.md`：登记所有新页面。
9. **刷新** `hot.md`：本次入库上下文。
10. **追加** `log.md`（新条目置顶）：
    ```markdown
    ## [YYYY-MM-DD] ingest | 源标题
    - 源：`raw/articles/filename.md`
    - 摘要：[[源标题]]
    - 新建页：[[页1]]、[[页2]]
    - 更新页：[[页3]]
    - 关键洞察：一句话。
    ```
11. **检查矛盾**：与既有页冲突则两边各加 `> [!contradiction]` callout。

## 批量入库

触发：多个文件或「全部入库」。

1. 列出待处理文件，开工前确认。
2. 逐源处理，跨源交叉引用推迟到第 3 步。
3. 全部完成后做一次交叉引用 pass，找新源之间的连接。
4. 最后一次性更新 index/hot/log（不逐源更新）。
5. 报告：「处理 N 源，新建 X 页，更新 Y 页，关键连接如下」。

30+ 源时每 10 个跟用户确认一次。

## 矛盾处理

新信息与既有页冲突时**不静默覆盖**。既有页加：

```markdown
> [!contradiction] 与 [[新来源]] 冲突
> [[既有页]] 称 X，[[新来源]] 说 Y。需核对日期、上下文与原始来源。
```

新源摘要页加反向引用。让用户裁定。

## 不要做的事

- **`wiki/raw/` 下原文不可变**。只维护 `raw/.manifest.json`。
- 不创建重复页：建页前查 index 与搜索。
- 不跳过 log 条目。
- 不跳过 hot 刷新（它让未来会话更快）。

## 遥测（degraded）

入库后若需总结，补录 skill-usage：`skill="obsidian-wiki-ingest"`、`pages_created`、`pages_updated`、`outcome`。
