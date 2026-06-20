# Obsidian MCP 接入（可选）

默认情况下，Agent 用文件系统工具（Read/Write/Edit）直接读写 wiki，**始终可用**，无需额外配置。

若希望走 Obsidian 原生能力（如 Obsidian 内置搜索排序、属性 API），可接入 Obsidian MCP server：

## 传输优先级（transport fallback）

```
mcp-obsidian（若已配置）→ filesystem（始终可用的兜底）
```

- **mcp-obsidian**：通过 MCP 工具读写笔记、调用 Obsidian 搜索。需安装对应 MCP server 并在 Cursor 中启用。
- **filesystem**：Cursor 的 Read/Write/Edit，用 vault 相对路径。最终兜底，永远可用。

## 建议

对个人知识库，filesystem 模式已足够。仅当你重度使用 Obsidian 的高级搜索/插件 API 时才值得接 MCP。本 kit 的所有技能都以 filesystem 为默认实现，MCP 为可选增强。
