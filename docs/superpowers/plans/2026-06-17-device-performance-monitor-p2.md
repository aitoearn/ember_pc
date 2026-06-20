# 实现计划 · 性能监控 P2（Perfetto + L1 分析）

**日期**: 2026-06-17  
**Spec**: `specs/002-device-performance-monitor/spec.md`（P2 Clarify）  
**设计**: `specs/002-device-performance-monitor/p2-perfetto-trace-analysis-design.md`  
**勾选清单**: `specs/002-device-performance-monitor/p2-tasks.md`

## 执行顺序

1. Phase 5：types/events + 契约四侧占位（先红后绿）
2. Phase 6：Rust schema + `perfMonitor/trace/*` + 前端 API
3. Phase 7：`perfTraceCapture.ts` + 真机录制 smoke
4. Phase 8：`traceProcessorRunner` + 按需下载 + L1 三模板
5. Phase 9：SegmentedControl + PerfTracePanel + 离开 Tab 确认
6. Phase 10：`test:contracts` + quickstart P2 人工验收

## 关键约束（Clarify 固化）

- 首版 **P2a+P2b**，**无 P2c**
- `trace_processor_shell` **按需下载**
- Trace 存 **工作区目录**，**手动删除**
- 离开 Tab → **弹窗**（默认继续后台录制）

## 验证命令

见 `specs/002-device-performance-monitor/quickstart.md` § P2 验收。
