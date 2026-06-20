---
name: obsidian-autoresearch
description: "MyWiki 自动研究：发现知识空白后，外联搜索/抓取补全，再写回知识库。把 lint 或 query 发现的 gap 转成新的 wiki 页。触发词：自动研究、补全这块知识、研究一下 X、autoresearch、深入调研并入库。"
---

# obsidian-autoresearch：自动研究（外联补洞写库）

当知识库存在空白（gap）时，本技能驱动一轮有边界的研究：搜索 → 抓取 → 综合 → 写回。
完整研究协议见 `references/program.md`。

## 触发来源

- `obsidian-wiki-lint` 报告的 gap。
- `obsidian-wiki-query` 回答时发现的覆盖不足。
- 用户直接说「研究一下 X 并入库」。

## 流程（有边界）

1. **明确研究问题**：把 gap 转成 1–3 个可回答的具体问题。与用户确认范围。
2. **检索现状**：先查知识库已有什么（避免重复），用 `obsidian-wiki-query` Quick 模式。
3. **外联**：用 WebSearch / WebFetch 找 2–5 个高质量源。优先一手来源。
4. **抓取并入库源**：把每个源走 `obsidian-wiki-ingest` URL 流程（落 `raw/articles/`）。
5. **综合**：跨源写出概念/对比页，标注矛盾。
6. **写后闭环**：index → 域索引 → log → hot。
7. **报告**：「研究 X，入库 N 源，新建 M 页，仍存在的空白：...」。

## 防失控（rabbit hole）

- 单轮最多 5 个源；超出先与用户确认。
- 同一失败检索不重试超过 1 次，换关键词或换策略。
- 遇登录墙/验证码/付费墙 → 停下报告，不硬闯。

## 议程控制（agenda control）

不替用户决定「研究什么」。无明确 topic 时，从 lint 的 gap 列表给出候选，让用户选/改/拒。
