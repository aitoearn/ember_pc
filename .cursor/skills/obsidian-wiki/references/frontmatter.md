# Frontmatter 规范

所有 wiki 页用扁平 YAML（flat YAML）frontmatter。禁止嵌套对象（Obsidian 属性面板不友好）。

## 公共字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | string | `concept`/`entity`/`source`/`question`/`comparison`/`meta` |
| `title` | string | 页面标题，与文件名一致 |
| `created` | date | YYYY-MM-DD |
| `updated` | date | YYYY-MM-DD，每次改动更新 |
| `tags` | list | 扁平字符串列表 |
| `status` | string | `seed`/`developing`/`mature`/`evergreen`/`stale` |
| `related` | list | 双链字符串列表 `"[[页面]]"` |
| `sources` | list | 来源页双链列表 |

## type 专属字段

- `concept`：`domain`、`aliases`、`complexity`
- `entity`：`entity_type`（person/organization/product/repo）、`aliases`
- `source`：`source_type`、`source_url`、`author`、`fetched`
- `question`：`question`、`answer_quality`

## 注意

- 日期不加引号或加引号都可，保持全库一致。
- `related`/`sources` 里的双链要加引号：`"[[页面名]]"`，否则 YAML 把 `[[` 解析成嵌套数组。
