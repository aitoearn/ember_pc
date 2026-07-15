# Quickstart · 稳定性保障

## 前置条件

1. Ember 运行在 Electron Desktop（非浏览器 preview）
2. Android 设备在线（压测）
3. **stability-analysis-agent**（sa-agent）可用：
   - 设置 `STABILITY_ANALYSIS_AGENT_ROOT=/path/to/stability-analysis-agent`，或
   - 将仓库放在 Ember 同级目录 `stability-analysis-agent/`
4. Python 3.9+（推荐 3.10–3.12），可通过 `DEVICE_AUTOMATION_PYTHON` 指定
5. LLM：OpenAI 兼容 API Key（崩溃分析 full 模式必需）

## 压测 → 根因分析

1. 打开 **移动端测试 → 稳定性保障**
2. **压测运行**：选设备、应用，开始 Fastbot / System Monkey
3. 若 CRASH/ANR：结果目录生成 `crash-logcat.txt`，日志面板点 **分析崩溃**
4. **崩溃分析**：
   - 确认崩溃日志路径
   - 选择 **符号库目录**（`library_dir`，如 `.so` / mapping 所在目录）
   - 选择 **源码根目录**（`code_root`，被测 App 工程）
   - 配置 LLM（base URL / model / API Key）并保存
5. 点击 **开始根因分析**，等待流式日志完成
6. 阅读 `final_output.md`（根因 + 文字修复建议），或打开报告目录

## 仅符号化（无 LLM）

未配置 API Key 时，可使用 **仅符号化** 降级：等价 `--scope parse_stack_only`，产出 `02_add2line_resolver.json`。

## 报告路径

`{userData}/device-automation/stability-analysis/cli_reports/<session>/`

macOS 示例：`~/Library/Application Support/Ember/device-automation/stability-analysis/cli_reports/`

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 工具未就绪 | 检查 `STABILITY_ANALYSIS_AGENT_ROOT` 与 `cli/main.py` |
| 分析按钮灰掉 | 补全 crash log + LLM Key（full 模式） |
| 根因质量差 | 补 `code_root`；确认 `library_dir` 与构建产物匹配 |
| LLM 超时/失败 | 查看事件流 stderr；换 model 或检查 base_url |
