# 源页链接原文的写法（wikilink-embed）

source 摘要页需链接回 `raw/` 中的原文。两种写法：

## 1. Obsidian 嵌入（推荐用于图片）

```markdown
![[raw/images/diagram-2026-01-01.png]]
```

直接在 Obsidian 中内嵌渲染图片。

## 2. wikilink-embed HTML（用于文档/文章）

路径需 URL 编码（`/` → `%2F`）：

```html
<wikilink-embed
  class="wikilink-embed"
  data-wikilink-embed-path="raw%2Farticles%2Fexample-2026-01-01.md"
  data-wikilink-embed-text="raw%2Farticles%2Fexample-2026-01-01.md">
</wikilink-embed>
```

## 原则

- 源摘要页是「人读的综合」，原文留在 `raw/`（不可变）。
- 每个 source 页至少有一个指向其原文的链接，保证可追溯（provenance）。
