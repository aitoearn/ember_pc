export type JankFrameReasonCode =
  | "gc_pause"
  | "binder_ipc"
  | "layout_measure"
  | "draw_render"
  | "lock_contention"
  | "input_processing"
  | "gpu_compositor"
  | "unknown";

export type MainThreadSliceRow = {
  name: string;
  durMs: number;
  count?: number;
  maxMs?: number;
};

export function inferJankFrameRootCause(params: {
  slices: MainThreadSliceRow[];
  jankType: string | null;
  frameMs: number;
}): {
  reasonCode: JankFrameReasonCode;
  primaryCause: string;
  deepReason: string;
  optimizationHint: string;
  confidence: "high" | "medium" | "low";
} {
  const top = params.slices[0];
  const topName = top?.name ?? "";
  const topLower = topName.toLowerCase();
  const jankLower = (params.jankType ?? "").toLowerCase();

  if (/gc|alloc|heap/i.test(topLower)) {
    return {
      reasonCode: "gc_pause",
      primaryCause: "主线程 GC 暂停",
      deepReason: `${topName} 累计 ${top?.durMs ?? 0} ms`,
      optimizationHint: "减少主线程分配、避免在滑动/动画路径触发 GC",
      confidence: "high",
    };
  }

  if (/binder|transaction|ipc/i.test(topLower)) {
    return {
      reasonCode: "binder_ipc",
      primaryCause: "Binder IPC 阻塞",
      deepReason: `${topName} 累计 ${top?.durMs ?? 0} ms`,
      optimizationHint: "将跨进程调用移出关键帧路径或改为异步",
      confidence: "high",
    };
  }

  if (/traversal|measure|layout|inflate/i.test(topLower)) {
    return {
      reasonCode: "layout_measure",
      primaryCause: "布局 / measure 过重",
      deepReason: `${topName} 累计 ${top?.durMs ?? 0} ms`,
      optimizationHint: "扁平化层级、减少 requestLayout、避免滑动中 inflate",
      confidence: "high",
    };
  }

  if (/draw|record|render|hwui|skia|egl/i.test(topLower)) {
    return {
      reasonCode: "draw_render",
      primaryCause: "绘制 / 渲染过重",
      deepReason: `${topName} 累计 ${top?.durMs ?? 0} ms`,
      optimizationHint: "降低 overdraw、拆分复杂 Path、检查 RenderThread 负载",
      confidence: "medium",
    };
  }

  if (/lock|monitor|contention|wait/i.test(topLower)) {
    return {
      reasonCode: "lock_contention",
      primaryCause: "锁竞争 / 等待",
      deepReason: `${topName} 累计 ${top?.durMs ?? 0} ms`,
      optimizationHint: "缩小锁粒度、避免主线程持锁做 IO",
      confidence: "medium",
    };
  }

  if (/input|motion|touch|deliver/i.test(topLower) || /input|touch/.test(jankLower)) {
    return {
      reasonCode: "input_processing",
      primaryCause: "输入处理延迟",
      deepReason: params.jankType
        ? `jank_type=${params.jankType}，主线程热点 ${topName || "—"}`
        : `主线程热点 ${topName || "—"}`,
      optimizationHint: "缩短 onTouch/onScroll 回调、避免输入路径同步 IO",
      confidence: "medium",
    };
  }

  if (/gpu|surfaceflinger|sf_|compositor/.test(jankLower)) {
    return {
      reasonCode: "gpu_compositor",
      primaryCause: "GPU / 合成器延迟",
      deepReason: `FrameTimeline jank_type=${params.jankType ?? "—"}`,
      optimizationHint: "检查 GPU 频率、SurfaceFlinger 队列与 overdraw",
      confidence: "medium",
    };
  }

  if (topName) {
    return {
      reasonCode: "unknown",
      primaryCause: "主线程长耗时 slice",
      deepReason: `${topName} 累计 ${top.durMs} ms（帧 ${params.frameMs.toFixed(1)} ms）`,
      optimizationHint: "在 Perfetto UI 中定位该 slice 的调用栈",
      confidence: "low",
    };
  }

  return {
    reasonCode: "unknown",
    primaryCause: params.frameMs > 32 ? "严重掉帧" : "掉帧",
    deepReason: params.jankType
      ? `jank_type=${params.jankType}，未找到主线程 >1ms slice`
      : "未找到主线程 >1ms slice",
    optimizationHint: "确认 trace 含 gfx/view 类别，并在 Perfetto UI 查看帧窗口",
    confidence: "low",
  };
}
