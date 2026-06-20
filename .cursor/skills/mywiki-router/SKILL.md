---
name: mywiki-router
description: "MyWiki 知识沉淀路由器。判断一条结论该落在 central（跨项目）还是 projects/<id>（项目专属），并选择正确的页面类型与目录。触发词：这个该放哪、沉淀到知识库、归档这个结论、放 central 还是 project、route to wiki。"
---

# mywiki-router：知识沉淀路由器

回答一个问题：**这块知识该落在哪？** 它是 `obsidian-save` 和入库流程的落点判定大脑。

## 判定一：central vs projects

| 信号 | 落点 |
| --- | --- |
| 通用方法/模式/概念，换个项目仍成立 | `wiki/central/` |
| 通用工具用法、行业知识、可复用经验 | `wiki/central/` |
| 绑定本项目的决策、配置、踩坑 | `wiki/projects/<project-id>/` |
| 提到具体项目名/路径/私有约定 | `wiki/projects/<project-id>/` |

`<project-id>`：取当前项目目录名，或 runtime-profile 中记录的项目标识。

## 判定二：页面类型

| 内容形态 | 目录 / 模板 |
| --- | --- |
| 一个思想/框架/方法 | `concepts/`（concept.md） |
| 一个人/组织/产品/仓库 | `entities/`（entity.md） |
| 一份外部源的摘要 | `sources/`（source.md） |
| 一问一答 | `questions/`（question.md） |
| A vs B 对比 | `comparisons/`（comparison.md） |
| 不确定 | `meta/inbox.md`，待 refine |

## 输出

返回三元组：`{scope: central|project, project_id?, target_path, template}`，交给调用方（save/ingest）去写页面。

## 边界

router **只判定不写入**（与 L2 的分层解耦原则一致）。写入与写后闭环由调用方完成。
