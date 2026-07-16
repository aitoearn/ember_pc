import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 常见 Android 竖屏比例（宽/高），连接 scrcpy 后会由真实分辨率覆盖。 */
export const DEFAULT_DEVICE_MIRROR_ASPECT_RATIO = 9 / 19.5;

export function resolveDeviceMirrorAspectRatio(aspectRatio?: number): number {
  return Number.isFinite(aspectRatio) && (aspectRatio ?? 0) > 0
    ? (aspectRatio as number)
    : DEFAULT_DEVICE_MIRROR_ASPECT_RATIO;
}

interface DeviceMirrorViewportProps {
  children: ReactNode;
  /** 设备屏幕宽/高；未连接前使用默认竖屏比例。 */
  aspectRatio?: number;
  className?: string;
  screenClassName?: string;
}

/**
 * 居中展示设备屏幕：容器严格匹配设备宽高比，视频铺满无黑边。
 */
export function DeviceMirrorViewport({
  children,
  aspectRatio = DEFAULT_DEVICE_MIRROR_ASPECT_RATIO,
  className,
  screenClassName,
}: DeviceMirrorViewportProps) {
  const safeRatio = resolveDeviceMirrorAspectRatio(aspectRatio);

  const frameStyle: CSSProperties = {
    aspectRatio: `${safeRatio}`,
    maxHeight: "100%",
    maxWidth: "100%",
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl",
        "bg-gradient-to-b from-neutral-50 via-white to-neutral-100/90",
        "p-2 sm:p-3",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-[1.75rem]",
          "shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)] ring-1 ring-neutral-200/90",
          screenClassName,
        )}
        style={frameStyle}
        data-testid="device-mirror-frame"
      >
        {children}
      </div>
    </div>
  );
}
