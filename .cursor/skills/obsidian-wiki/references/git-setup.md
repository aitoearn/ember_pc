# Git 版本管理建议

wiki 是高价值人工资产，建议纳入 git 版本管理。

## .gitignore 建议

```
# Obsidian 工作区状态（机器相关，不入库）
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/cache

# 遥测原始数据可选忽略（含交互内容，注意隐私）
# wiki/meta/telemetry/*.jsonl
```

## 提交粒度

- 入库一个源 → 一个提交（含 raw/ + 产出页 + index/log/hot）。
- 沉淀一条结论 → 一个提交。
- 提交信息用中文，说明「做了什么 + 为什么」。

## 注意

- `raw/` 中可能含受版权或隐私内容，公开仓库前先审查。
- 不要把 `.cursor/runtime-profile.json` 中的绝对路径泄漏到公开仓库（含本机用户名）。
