---
name: obsidian-wiki-query
description: "从 MyWiki 知识库回答问题（L3 读取）。先读 hot.md，再读 index.md，再精读相关页，带引用综合作答，高价值答案归档回 questions/。支持 Quick/Standard/Deep 三档。触发词：查一下、问知识库、知识库里有什么、what do you know、query、查询、解释、总结某主题、wiki query。"
allowed-tools: Read Glob Grep
---

# obsidian-wiki-query：查询知识库（L3 读取）

知识库已经做完了综合工作。策略性地读、精确地答、把好答案归档回去，让知识复利。

## 第一步：定位 wiki 目录

```bash
WIKI_DIR=$(python3 .cursor/skills/../../scripts/mywiki_storage.py wiki-dir 2>/dev/null || echo "")
```

若拿不到，按回退顺序探测：`$MYWIKI_ROOT/wiki/` → `./.mywiki/wiki/` → `./wiki/`。

## 三档查询深度

| 模式 | 触发 | 读取范围 | Token | 适用 |
| --- | --- | --- | --- | --- |
| **Quick** | "query quick" 或简单事实问 | hot + index | ~1,500 | "X 是什么"、日期、快速事实 |
| **Standard** | 默认 | hot + index + 3–5 页 | ~3,000 | 多数问题 |
| **Deep** | "deep"、"全面"、"详尽" | 全量 ≤ 12 页（可选 web） | ~8,000+ | 跨页综合、对比、"把 X 讲全" |

## Quick 模式

1. 读 `hot.md`，能答则立即回答。
2. 否则读 `index.md`，扫描描述。
3. 在索引摘要中找到 → 回答，不打开具体页。
4. 找不到 → 说「快速缓存中没有，要按 Standard 查吗？」

Quick 模式不打开单独页面。

## Standard 模式

1. 读 `hot.md`（可能已有答案或直接相关上下文）。
2. 读 `index.md`，定位最相关页面（按标题与描述）。
3. 读那些页面；对关键实体沿双链下钻一层（depth-2），不再深。
4. 综合作答，每条结论标注 `（来源：[[页面名]]）`。
5. 询问是否归档：「这段分析值得保留，存为 `questions/答案名.md` 吗？」
6. 命中空白 → 说「关于 X 我了解不足，要找个源补充吗？」

## Deep 模式

1. 读 `hot.md` 与 `index.md`。
2. 识别所有相关分节（concepts/entities/sources/comparisons）。
3. 逐页精读，不跳过。
4. 覆盖不足时，主动提出 web 搜索补充（转 `obsidian-autoresearch`）。
5. 综合出带完整引用的答案。
6. **务必归档**：Deep 答案太有价值，存回 `wiki/questions/`。

## 查询链纪律

```
hot.md → index.md → 域_index.md（wiki/<域>/_index.md）→ 具体页面
```

仅当用户明确要求「全文搜索」才对整库 grep。

## Token 纪律

| 起点 | 约成本 | 何时停 |
| --- | --- | --- |
| hot.md | ~500 | 已含答案则停 |
| index.md | ~1000 | 能定位 3–5 页则停 |
| 3–5 页 | ~300/页 | 通常足够 |
| 10+ 页 | 昂贵 | 仅全库综合时 |

## 归档答案（写后闭环）

按 `_templates/question.md` 写入 `wiki/questions/`，frontmatter 含 `question`、`answer_quality`、`sources`。
随后：更新 `index.md`（Questions 分节）→ 追加 `log.md` → 刷新 `hot.md`。

## 空白处理

无法从知识库回答时：

1. 明确说「知识库里关于 X 的内容不足以好好回答」。
2. 指出具体空白：「我完全没有 [子主题] 的内容」。
3. 建议：「要找个源补充吗？我可以帮你搜索或入库一份」。
4. **不编造**。涉及本知识库领域的问题，不要用训练数据糊弄。

## 遥测（degraded 模式）

回答完成后，若用户后续要做今日总结，这次查询应被补录为一条 skill-usage 记录（见 `mywiki-session-telemetry-fallback`）：`skill="obsidian-wiki-query"`、`outcome`、`query_depth`。
