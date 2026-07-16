import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  captureDeviceAutomationScreenshot,
  sendDeviceAutomationSwipe,
  sendDeviceAutomationTap,
} from "@/lib/api/deviceAutomation";
import { sendAyaStyleMirrorNavigation } from "../scrcpy/deviceMirrorNavigation";
import { DeviceMirrorViewport } from "./DeviceMirrorViewport";
import { DeviceMirrorShell } from "./DeviceMirrorShell";
import type { DeviceAutomationCardModel } from "../types";

const SCREENSHOT_POLL_INTERVAL_MS = 2_000;
const MIN_SWIPE_PX = 8;

interface DeviceScreenshotMirrorProps {
  device: DeviceAutomationCardModel;
  loading: boolean;
}

function buildScreenshotDataUrl(base64: string, mediaType: string): string {
  return `data:${mediaType};base64,${base64}`;
}

export function DeviceScreenshotMirror({
  device,
  loading,
}: DeviceScreenshotMirrorProps) {
  const { t } = useTranslation("deviceAutomation");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [mirrorError, setMirrorError] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [navigationPending, setNavigationPending] = useState<
    "back" | "home" | null
  >(null);
  const pollTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const hasScreenshotRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const refreshScreenshot = useCallback(async () => {
    if (device.status !== "online" || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    if (!hasScreenshotRef.current) {
      setMirrorLoading(true);
    }
    try {
      const payload = await captureDeviceAutomationScreenshot({
        platform: device.agentPlatform,
        deviceId: device.id,
      });
      setScreenshotDataUrl(
        buildScreenshotDataUrl(payload.base64, payload.mediaType),
      );
      hasScreenshotRef.current = true;
      setMirrorError(null);
    } catch (error) {
      console.error("设备截图刷新失败:", error);
      setMirrorError(
        error instanceof Error ? error.message : t("deviceAutomation.debug.mirrorError"),
      );
    } finally {
      inFlightRef.current = false;
      setMirrorLoading(false);
    }
  }, [device.agentPlatform, device.id, device.status, t]);

  const mapToDeviceCoordinates = useCallback((clientX: number, clientY: number) => {
    const image = imageRef.current;
    if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return null;
    }
    const rect = image.getBoundingClientRect();
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
      x: Math.round(relativeX * image.naturalWidth),
      y: Math.round(relativeY * image.naturalHeight),
    };
  }, []);

  const handleNavigation = useCallback(
    async (action: "back" | "home") => {
      setNavigationPending(action);
      setNavigationError(null);
      try {
        await sendAyaStyleMirrorNavigation({
          action,
          platform: device.agentPlatform,
          deviceId: device.id,
        });
        await refreshScreenshot();
      } catch (error) {
        console.error("发送导航指令失败:", error);
        setMirrorError(
          error instanceof Error
            ? error.message
            : t("deviceAutomation.debug.navigationError"),
        );
        setNavigationError(
          error instanceof Error
            ? error.message
            : t("deviceAutomation.debug.navigationError"),
        );
      } finally {
        setNavigationPending(null);
      }
    },
    [device.agentPlatform, device.id, refreshScreenshot, t],
  );

  useEffect(() => {
    hasScreenshotRef.current = false;
    if (device.status !== "online") {
      setScreenshotDataUrl(null);
      return;
    }
    void refreshScreenshot();
    pollTimerRef.current = window.setInterval(() => {
      void refreshScreenshot();
    }, SCREENSHOT_POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, [device.status, refreshScreenshot]);

  const handlePointerUp = async (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || device.status !== "online") {
      return;
    }
    const start = dragStartRef.current;
    dragStartRef.current = null;
    const startCoords = mapToDeviceCoordinates(start.x, start.y);
    const endCoords = mapToDeviceCoordinates(event.clientX, event.clientY);
    if (!startCoords || !endCoords) {
      return;
    }
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
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
      await refreshScreenshot();
    } catch (error) {
      console.error("截图模式触控失败:", error);
    }
  };

  const showNavigationControls =
    device.platform === "android" || device.platform === "ios";

  return (
    <DeviceMirrorShell
      device={device}
      refreshPending={mirrorLoading}
      onRefresh={() => {
        void refreshScreenshot();
      }}
      showNavigation={showNavigationControls}
      navigationPending={navigationPending}
      navigationError={navigationError}
      onNavigate={(action) => {
        void handleNavigation(action);
      }}
    >
      <DeviceMirrorViewport>
        <div
          className="relative h-full w-full"
          onMouseDown={(event) => {
            dragStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onMouseUp={(event) => {
            void handlePointerUp(event);
          }}
        >
          {loading || (mirrorLoading && !screenshotDataUrl) ? (
            <div className="flex flex-col items-center gap-2 text-neutral-300">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">{t("deviceAutomation.debug.loadingMirror")}</p>
            </div>
          ) : screenshotDataUrl ? (
            <img
              ref={imageRef}
              src={screenshotDataUrl}
              alt={t("deviceAutomation.debug.mirrorAlt")}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center space-y-2 px-4 text-center">
              <p className="text-sm font-medium text-neutral-700">
                {t("deviceAutomation.debug.mirrorEmptyTitle")}
              </p>
              <p className="text-xs text-neutral-500">
                {mirrorError ?? t("deviceAutomation.debug.mirrorEmptyDescription")}
              </p>
            </div>
          )}
        </div>
      </DeviceMirrorViewport>

      {mirrorError && screenshotDataUrl ? (
        <p className="mt-1 shrink-0 text-xs text-red-600">{mirrorError}</p>
      ) : null}
    </DeviceMirrorShell>
  );
}
