# Quickstart · 性能监控 Tab P1

## 前置

- 已连接 **Android** 设备（ADB online）
- `npm run electron:dev` 或打包版 Ember
- agent-device / ADB 路径正常（与设备管理 Tab 一致）

## Phase 0–1 验收（无 UI）

```bash
# 纯函数
npm run test -- src/features/device-automation/performance/domain/perfBuffer.unit.test.ts

# Rust DAO
cargo test --manifest-path lime-rs/Cargo.toml perf_monitor
```

App Server 方法可用 DevTools 或临时脚本：

```typescript
await AppServerClient.request("perfMonitor/session/save", { session: { ... } });
await AppServerClient.request("perfMonitor/session/list", { workspaceId });
```

## Phase 2 验收（Electron 采集）

```bash
npm run test -- electron/deviceAutomation/performanceMonitor.test.ts
npx tsx scripts/device-automation/perf-monitor-adb-smoke.mjs [deviceId]
```

手动：DevTools 调用

```javascript
await window.lime.invoke("device_automation_perf_start", {
  platform: "android",
  deviceId: "<serial>",
  packageName: "com.example.app",
  metrics: ["cpu", "memory", "fps"],
  intervalMs: 1000,
});
// 订阅 device_automation_perf_frame 事件观察推帧
```

## Phase 3–4 验收（完整 Tab）

1. 打开 **移动端测试 → 性能监控**
2. 选择 Android 设备 → **刷新应用** → 选包名
3. 勾选 CPU/内存/FPS → **开始采集** → 三张 SVG 曲线每秒更新
4. **停止** → 右侧/下方历史出现会话卡片 → 点开 Modal 见 AVG/MAX/MIN
5. 重启应用 → 历史仍在
6. 选 iOS 设备 → 能力矩阵显示，开始按钮禁用

## 守门命令

```bash
npm run test:contracts
npm run verify:local
# 若改 GUI 主路径
npm run verify:gui-smoke
```

## 已知限制（P1）

- 无历史曲线回放、无 CSV
- iOS/Harmony 不采集
- FPS 不含 Jank；gfxinfo 单源

---

## P2 验收（深度 Trace · P2a+P2b）

**前置**：P1 可用；Android 设备支持 `adb shell perfetto`（AOSP/userdebug 或厂商开放 trace）。

### Phase 5–6（契约 + App Server）

```bash
cargo test -p lime-core perf_trace
node scripts/check-command-contracts.mjs
node scripts/check-app-server-client-contract.mjs
```

### Phase 7（Electron 录制）

```bash
npm run test -- electron/deviceAutomation/perfTraceCapture.test.ts
```

真机：

1. 性能 Tab → **深度 Trace**
2. 选预设（滑动卡顿）→ **开始录制** → 操作 App → **停止**
3. Trace 列表出现 artifact，`sizeBytes > 0`

### Phase 8（L1 分析）

```bash
npm run test -- electron/deviceAutomation/traceProcessorRunner.test.ts
```

UI：

1. 对就绪 trace → **快速分析** → **卡顿摘要**
2. 30 秒内展示 jank 帧数、P99 等（首次触发 trace_processor 下载）

### Phase 9（完整 Tab）

1. SegmentedControl 切换「实时 APM」/「深度 Trace」
2. Trace 录制中切回「实时 APM」→ **弹窗确认**（默认继续）
3. 手动删除 trace → 文件与 DB 记录移除
4. 重启应用 → artifact 列表仍可加载（同工作区）

## 已知限制（P2 首版）

- 无 SmartPerfetto Agent（P2c）
- 无 trace 自动清理 / 磁盘配额
- 无 trace 内嵌 Perfetto UI
- iOS/Harmony 不录制 trace
