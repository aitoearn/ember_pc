import { hasDesktopHostInvokeCapability } from "@/lib/desktop-runtime";

const NATIVE_STARTUP_OVERLAY_SELECTOR = "[data-ember-startup-shell]";
const NATIVE_STARTUP_OVERLAY_EXIT_MS = 180;
// 启动 overlay 的最短可见时长（自导航起算）。单段式启动下 overlay 是唯一启动画面，
// 渲染缓存命中时 React 可能瞬间挂载，若不设下限会“一闪而过”甚至看不到；
// 设一个克制的下限保证用户能看到启动画面，又不至于拖长启动感知。
const NATIVE_STARTUP_OVERLAY_MIN_VISIBLE_MS = 480;

export function hasNativeStartupScreen(): boolean {
  return hasDesktopHostInvokeCapability() && hasNativeStartupScreenFlag();
}

export function hideNativeStartupOverlayWhenReady(): void {
  if (!hasNativeStartupScreenFlag() || typeof window === "undefined") {
    return;
  }

  // performance.now() 相对导航起点，直接作为 overlay 已显示时长的近似。
  const elapsedMs =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : NATIVE_STARTUP_OVERLAY_MIN_VISIBLE_MS;
  const remainingMs = Math.max(
    0,
    NATIVE_STARTUP_OVERLAY_MIN_VISIBLE_MS - elapsedMs,
  );

  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const overlay = document.querySelector<HTMLElement>(
          NATIVE_STARTUP_OVERLAY_SELECTOR,
        );
        if (!overlay) {
          return;
        }

        document.documentElement.dataset.emberNativeStartupReady = "1";
        window.setTimeout(() => {
          overlay.remove();
          delete document.documentElement.dataset.emberNativeStartup;
          delete document.documentElement.dataset.emberNativeStartupReady;
        }, NATIVE_STARTUP_OVERLAY_EXIT_MS);
      });
    });
  }, remainingMs);
}

function hasNativeStartupScreenFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("nativeStartup") === "1";
}
