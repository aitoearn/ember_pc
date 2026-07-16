# Lime 框架升级 · Plugin ↔ Agent-App 映射（Batch B 交付）

> 状态：待编写（Batch B 阻塞项）  
> 主计划：[`lime-framework-upgrade-plan.md`](./lime-framework-upgrade-plan.md)

## 目标

在 Lime `plugin` 框架升级后，保持 Ember `agent-app` / `agent-apps` / `agent-app-lab` 品牌入口可用，避免双轨 runtime 分叉。

## 待填映射表

| Ember 路由 / 模块 | Lime 对应 | 运行时 owner | 备注 |
| --- | --- | --- | --- |
| `agent-app` | `plugin` | `src/features/plugin/runtime` | 待核对 page router |
| `agent-apps` | `plugins` | Plugin 列表页 | 待核对 |
| `agent-app-lab` | `plugin-lab` | Lab fixture | 待核对 |
| `src/features/agent-app/**` | — | Ember 品牌适配层 | 保留，消费 lime plugin API |

## 验收

- [ ] 从侧边栏进入 agent-apps 可列出已安装应用
- [ ] agent-app 运行时启动不依赖已删除 aster 路径
- [ ] 与 `plugin` 路由无重复注册冲突

## 下一步

Batch B 合入前由执行者填写上表并链接到具体文件路径。
