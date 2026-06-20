# eval-viewer

run_loop 生成的 HTML 评估报告的存放目录。

- 模板：`../assets/eval_review.html`
- 每次 run_loop 在此目录写出一份具体报告：`report-YYYY-MM-DD.html`（占位符已用真实数据填充）。
- 直接在浏览器打开即可查看某次优化的迭代轨迹、得分曲线、失败案例与最优 description。

## 查看

```bash
open eval-viewer/report-2026-01-01.html   # macOS
```

本目录初始为空（仅含本说明）。报告由 skill-creator 在运行时生成。
