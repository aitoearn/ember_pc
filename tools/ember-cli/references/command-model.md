# 命令模型

## 主命令

- `ember task create <domain> ...`
- `ember task status <task-id>`
- `ember task list`
- `ember task retry <task-id>`
- `ember task cancel <task-id>`
- `ember task result <task-id>`
- `ember skill list`
- `ember skill show <name>`
- `ember doctor`

## 输出约定

- 标准输出默认 JSON
- 标准错误默认结构化错误 JSON
- 所有任务命令都应返回 `task_id`、`task_type`、`status`、`path`

## 兼容入口

- 保留 `ember media image|cover|video generate` 作为兼容别名
- 新主线统一收敛到 `ember task create ...`
