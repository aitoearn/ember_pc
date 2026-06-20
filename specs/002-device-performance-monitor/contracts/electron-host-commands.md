# Contracts · Electron Host：性能采集

采集与实时帧推送在 Electron main；会话落库由 Renderer 调 App Server。

## device_automation_perf_list_apps

- **Params**: `{ platform: string, deviceId: string }`
- **Result**: `{ apps: { packageName: string, label?: string }[] }`
- **行为**: Android 用 `adb shell pm list packages -3`（**仅第三方应用**）+ label 解析；iOS/Harmony 返回空数组 + 不报错

## device_automation_perf_start

- **Params**:
  ```typescript
  {
    platform: "android";
    deviceId: string;
    packageName: string;
    metrics: ("cpu" | "memory" | "fps")[];
    intervalMs: number; // 仅允许 500 | 1000 | 2000 | 5000（UI 四档下拉）
  }
  ```
- **Result**: `{ sessionId: string, startedAt: string }`
- **行为**:
  - 非 android → 抛错
  - 同 `deviceId` 已有 session → 先 stop 旧 session（不算 failed）
  - 启动 `PerfCollector` 定时器，广播 `device_automation_perf_frame`

## device_automation_perf_stop

- **Params**: `{ sessionId: string }`
- **Result**:
  ```typescript
  {
    summary: Record<string, { avg: number; max: number; min: number }>;
    stoppedAt: string;
  }
  ```
- **行为**: 停 timer；根据 collector 内存缓冲算 summary；不清除 Renderer 缓冲（由前端 stop 处理）

## device_automation_perf_get_status

- **Params**: `{}`
- **Result**:
  ```typescript
  {
    activeSessionId?: string;
    deviceId?: string;
    packageName?: string;
    metrics?: string[];
  }
  ```

## IPC 事件 · device_automation_perf_frame

- **Payload**:
  ```typescript
  {
    sessionId: string;
    ts: number;
    data: Partial<Record<"cpu_app"|"cpu_sys"|"mem_total"|"fps", number>>;
  }
  ```
- **发射**: main `broadcast()`，与 `device_automation_inventory_changed` 同路径

## 注册点

| 文件 | 动作 |
| --- | --- |
| `src/features/device-automation/performance/events.ts` | 常量 + 类型 |
| `electron/ipcChannels.ts` | 四条命令加入 `ELECTRON_HOST_COMMANDS` |
| `electron/hostCommands.ts` | case 分支 → `deviceAutomationRuntime.*` |
| `src/lib/dev-bridge/commandPolicy.ts` | host 命令白名单 |
| `scripts/check-command-contracts.mjs` | 若 host 命令有独立清单则同步 |
