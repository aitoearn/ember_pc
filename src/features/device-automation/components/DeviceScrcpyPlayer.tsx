import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type MouseEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AndroidMotionEventAction,
  AndroidMotionEventButton,
  ScrcpyControlMessageWriter,
} from "@yume-chan/scrcpy";
import {
  sendDeviceAutomationSwipe,
  sendDeviceAutomationTap,
} from "@/lib/api/deviceAutomation";
import {
  isScrcpyDirectClientClosedError,
  ScrcpyDirectClient,
} from "../scrcpy/ScrcpyDirectClient";
import { readScrcpyDecoderSurface } from "../scrcpy/scrcpyDecoderSurface";
import type { DeviceAutomationCardModel } from "../types";
import {
  DEFAULT_DEVICE_MIRROR_ASPECT_RATIO,
  DeviceMirrorViewport,
} from "./DeviceMirrorViewport";

const MOTION_THROTTLE_MS = 50;
const MIN_SWIPE_PX = 8;
const SCRCPY_CONNECT_TIMEOUT_MS = 30_000;

interface DeviceScrcpyPlayerProps {
  device: DeviceAutomationCardModel;
  /** 由 DebugPage 级 session store 提供，对齐 aya store.scrcpyClient。 */
  directClient: ScrcpyDirectClient | null;
}

export type DeviceScrcpyPlayerHandle = {
  sendNavigation: (action: "back" | "home") => Promise<boolean>;
};

type StreamStatus = "connecting" | "connected" | "error";

type VideoSurface = HTMLCanvasElement | HTMLVideoElement;

/**
 * 对齐 aya Screencast.tsx：useEffect 只负责 getVideo() + mount 元素，不 start/close/pipe。
 */
export const DeviceScrcpyPlayer = forwardRef<
  DeviceScrcpyPlayerHandle,
  DeviceScrcpyPlayerProps
>(function DeviceScrcpyPlayer({ device, directClient }, ref) {
  const { t } = useTranslation("deviceAutomation");
  const controlWriterRef = useRef<ScrcpyControlMessageWriter | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<VideoSurface | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const lastMoveRef = useRef(0);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_DEVICE_MIRROR_ASPECT_RATIO);

  const syncAspectRatioFromSurface = useCallback((surface: VideoSurface | null) => {
    if (!surface) {
      return;
    }
    const width =
      surface instanceof HTMLVideoElement ? surface.videoWidth : surface.width;
    const height =
      surface instanceof HTMLVideoElement ? surface.videoHeight : surface.height;
    if (width > 0 && height > 0) {
      setAspectRatio(width / height);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      async sendNavigation(action: "back" | "home") {
        const writer = controlWriterRef.current;
        if (!writer || status !== "connected") {
          return false;
        }
        try {
          const { sendScrcpyNavigation } = await import("../scrcpy/scrcpyNavigation");
          await sendScrcpyNavigation(writer, action);
          return true;
        } catch (error) {
          console.error("Scrcpy 导航失败:", error);
          return false;
        }
      },
    }),
    [status],
  );

  const mapToDeviceCoordinates = useCallback((clientX: number, clientY: number) => {
    const surface = surfaceRef.current;
    if (!surface) {
      return null;
    }
    const width =
      surface instanceof HTMLVideoElement ? surface.videoWidth : surface.width;
    const height =
      surface instanceof HTMLVideoElement ? surface.videoHeight : surface.height;
    if (width <= 0 || height <= 0) {
      return null;
    }
    const rect = surface.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;
    return {
      x: Math.round(relativeX * width),
      y: Math.round(relativeY * height),
    };
  }, []);

  const mountVideoSurface = useCallback((element: VideoSurface) => {
    surfaceRef.current = element;
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.objectFit = "cover";
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (element.parentElement !== container) {
      element.parentElement?.removeChild(element);
      container.appendChild(element);
    }
  }, []);

  useEffect(() => {
    if (!directClient) {
      setStatus("connecting");
      return;
    }

    let cancelled = false;
    let removeMetadataListener: (() => void) | undefined;
    const connectTimeoutTimer = window.setTimeout(() => {
      if (!cancelled) {
        setStatus("error");
      }
    }, SCRCPY_CONNECT_TIMEOUT_MS);

    const client = directClient;

    async function startLikeAyaScreencast() {
      const video = await client.getVideo();
      if (cancelled) {
        return;
      }
      // 对齐 aya Screencast.tsx：pipeTo → appendChild(renderer.element)
      void video.stream.pipeTo(video.decoder.writable as never);
      const surface = readScrcpyDecoderSurface(video.decoder);
      mountVideoSurface(surface);
      syncAspectRatioFromSurface(surface);
      if (surface instanceof HTMLVideoElement) {
        const onMetadata = () => {
          syncAspectRatioFromSurface(surface);
        };
        surface.addEventListener("loadedmetadata", onMetadata);
        surface.addEventListener("resize", onMetadata);
        removeMetadataListener = () => {
          surface.removeEventListener("loadedmetadata", onMetadata);
          surface.removeEventListener("resize", onMetadata);
        };
      }
      setStatus("connected");
      window.clearTimeout(connectTimeoutTimer);
      console.info("[scrcpy] 视频 surface 已挂载到 DOM");

      void client
        .getControl()
        .then((control) => {
          if (cancelled) {
            return;
          }
          controlWriterRef.current = control.controller;
          console.info("[scrcpy] 控制通道就绪");
        })
        .catch((controlError: unknown) => {
          if (cancelled || isScrcpyDirectClientClosedError(controlError)) {
            return;
          }
          console.warn("Scrcpy 控制 socket 未就绪:", controlError);
        });

      return removeMetadataListener;
    }

    void startLikeAyaScreencast().then((cleanupMetadata) => {
      if (typeof cleanupMetadata === "function") {
        removeMetadataListener = cleanupMetadata;
      }
    }).catch((scrcpyError) => {
      if (cancelled || isScrcpyDirectClientClosedError(scrcpyError)) {
        return;
      }
      console.error("Scrcpy 投屏初始化失败:", scrcpyError);
      if (!cancelled) {
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(connectTimeoutTimer);
      removeMetadataListener?.();
      controlWriterRef.current = null;
      surfaceRef.current = null;
    };
  }, [directClient, mountVideoSurface, syncAspectRatioFromSurface]);

  const handlePointerDown = (event: MouseEvent<HTMLDivElement>) => {
    if (status !== "connected") {
      return;
    }
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    movedRef.current = false;
    void injectTouch(event, AndroidMotionEventAction.Down);
  };

  const handlePointerUp = async (event: MouseEvent<HTMLDivElement>) => {
    if (status !== "connected" || !dragStartRef.current) {
      return;
    }
    const start = dragStartRef.current;
    dragStartRef.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.hypot(dx, dy);
    const startCoords = mapToDeviceCoordinates(start.x, start.y);
    const endCoords = mapToDeviceCoordinates(event.clientX, event.clientY);
    if (!startCoords || !endCoords) {
      return;
    }
    if (controlWriterRef.current) {
      const sent = await injectTouch(event, AndroidMotionEventAction.Up);
      if (sent) {
        return;
      }
    }
    try {
      if (distance >= MIN_SWIPE_PX) {
        await sendDeviceAutomationSwipe({
          platform: device.agentPlatform,
          deviceId: device.id,
          x1: startCoords.x,
          y1: startCoords.y,
          x2: endCoords.x,
          y2: endCoords.y,
        });
      } else {
        await sendDeviceAutomationTap({
          platform: device.agentPlatform,
          deviceId: device.id,
          x: startCoords.x,
          y: startCoords.y,
        });
      }
    } catch (touchError) {
      console.error("Scrcpy 触控失败:", touchError);
    }
  };

  const handlePointerMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) {
      return;
    }
    const now = Date.now();
    if (now - lastMoveRef.current < MOTION_THROTTLE_MS) {
      return;
    }
    lastMoveRef.current = now;
    const dx = event.clientX - dragStartRef.current.x;
    const dy = event.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > MIN_SWIPE_PX) {
      movedRef.current = true;
      void injectTouch(event, AndroidMotionEventAction.Move);
    }
  };

  const injectTouch = async (
    event: MouseEvent<HTMLDivElement>,
    action: AndroidMotionEventAction,
  ): Promise<boolean> => {
    const writer = controlWriterRef.current;
    if (!writer) {
      return false;
    }
    const coords = mapToDeviceCoordinates(event.clientX, event.clientY);
    const surface = surfaceRef.current;
    if (!coords || !surface) {
      return false;
    }
    const screenWidth =
      surface instanceof HTMLVideoElement ? surface.videoWidth : surface.width;
    const screenHeight =
      surface instanceof HTMLVideoElement ? surface.videoHeight : surface.height;
    try {
      await writer.injectTouch({
        action,
        pointerId: BigInt(0),
        screenWidth,
        screenHeight,
        pointerX: coords.x,
        pointerY: coords.y,
        pressure: action === AndroidMotionEventAction.Up ? 0 : 1,
        actionButton: AndroidMotionEventButton.Primary,
        buttons: action === AndroidMotionEventAction.Up ? 0 : 1,
      });
      return true;
    } catch (error) {
      console.error("Scrcpy 触控注入失败:", error);
      return false;
    }
  };

  return (
    <DeviceMirrorViewport aspectRatio={aspectRatio}>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden [&>canvas]:!h-full [&>canvas]:!w-full [&>canvas]:!object-cover [&>video]:!h-full [&>video]:!w-full [&>video]:!object-cover"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={(event) => {
          void handlePointerUp(event);
        }}
      >
        {status !== "connected" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-neutral-100/95 text-neutral-600">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">
              {status === "error"
                ? t("deviceAutomation.debug.scrcpyError")
                : t("deviceAutomation.debug.scrcpyConnecting")}
            </p>
          </div>
        ) : null}
      </div>
    </DeviceMirrorViewport>
  );
});
