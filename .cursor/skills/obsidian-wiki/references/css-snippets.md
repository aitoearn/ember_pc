# 自定义 callout（CSS 片段）

`obsidian-config/snippets/vault-colors.css` 定义 4 种语义化 callout。在 Obsidian 设置 → 外观 → CSS 代码片段中启用 `vault-colors`。未启用时回退默认样式，页面仍可读。

| callout | 语义 | 用法 |
| --- | --- | --- |
| `contradiction` | 矛盾冲突 | 新旧信息冲突时双向标注 |
| `gap` | 知识空白 | 标记待补全的内容 |
| `key-insight` | 关键洞察 | 高价值结论 |
| `stale` | 过时内容 | lint 标记的过期页 |

## 示例

```markdown
> [!contradiction] 与 [[新来源]] 冲突
> [[既有页]] 称 X，[[新来源]] 说 Y。

> [!gap] 待补全
> 缺少关于 X 的一手来源。

> [!key-insight] 关键洞察
> 知识库的复利来自写后闭环纪律。

> [!stale] 可能过时
> 本页 updated 已超过 180 天，需复核。
```
