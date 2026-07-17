/**
 * 鸿蒙投屏播放器：对齐 lmweb DeviceVideo —— jmuxer + MSE + Annex-B 直喂。
 * 触控/导航经 WebSocket 文本回传 Electron → Java wrapper stdin。
 *
 * 注意：jmuxer.onReady 仅表示 MediaSource 打开，此时尚无画面；
 * 必须等 video 真正出帧后再摘掉「连接中」遮罩，否则会白屏。
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import JMuxer from "jmuxer";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  startHarmonyScrcpy,
  stopHarmonyScrcpy,
} from "@/lib/api/deviceAutomation";
import type { DeviceAutomationCardModel } from "../types";
import {
  DEFAULT_DEVICE_MIRROR_ASPECT_RATIO,
  DeviceMirrorViewport,
} from "./DeviceMirrorViewport";

const MOTION_THROTTLE_MS = 50;

/** 将 video 播放头追到缓冲末尾，降低 MSE 累积延迟（对齐 lmweb）。 */
function catchUpVideoLatency(video: HTMLVideoElement | null | undefined): void {
  if (!video || video.readyState < 2) {
    return;
  }
  try {
    const ranges = video.buffered;
    if (ranges.length === 0) {
      return;
    }
    const end = ranges.end(ranges.length - 1);
    const lag = end - video.currentTime;
    if (lag > 0.12) {
      video.currentTime = Math.max(0, end - 0.02);
    }
  } catch {
    // MediaSource 切换中可能抛错
  }
}

interface HarmonyScrcpyPlayerProps {
  device: DeviceAutomationCardModel;
}

export type HarmonyScrcpyPlayerHandle = {
  sendNavigation: (action: "back" | "home") => boolean;
};

type StreamStatus = "connecting" | "connected" | "error";

export const HarmonyScrcpyPlayer = forwardRef<
  HarmonyScrcpyPlayerHandle,
  HarmonyScrcpyPlayerProps
>(function HarmonyScrcpyPlayer({ device }, ref) {
  const { t } = useTranslation("deviceAutomation");
  const videoRef = useRef<HTMLVideoElement>(null);
  const jmuxerRef = useRef<JMuxer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const deviceSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastMoveRef = useRef(0);
  const muxerRecoveryCountRef = useRef(0);
  const lastMuxerErrAtRef = useRef(0);
  const sawFrameRef = useRef(false);
  const feedCountRef = useRef(0);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_DEVICE_MIRROR_ASPECT_RATIO);
  const [decodeGeneration, setDecodeGeneration] = useState(0);

  const markConnectedIfPlaying = useCallback(() => {
    const video = videoRef.current;
    if (!video || sawFrameRef.current) {
      return;
    }
    if (video.videoWidth > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      sawFrameRef.current = true;
      setStatus("connected");
      console.info(
        `[harmony-scrcpy] 首帧已出画 ${video.videoWidth}x${video.videoHeight} feeds=${feedCountRef.current}`,
      );
    }
  }, []);

  const sendControl = useCallback((line: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(line);
      return true;
    }
    return false;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      sendNavigation(action: "back" | "home") {
        return sendControl(`nav ${action}`);
      },
    }),
    [sendControl],
  );

  const mapToDeviceCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const video = videoRef.current;
      const { width, height } = deviceSizeRef.current;
      if (!video || width <= 0 || height <= 0) {
        return null;
      }
      const rect = video.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        return null;
      }
      const relativeX = (clientX - rect.left) / rect.width;
      const relativeY = (clientY - rect.top) / rect.height;
      return {
        x: Math.round(relativeX * width),
        y: Math.round(relativeY * height),
      };
    },
    [],
  );

  // jmuxer 绑定到 <video>；解码失败时 bump generation 重建管道（对齐 lmweb）。
  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video || !device.id) {
      return;
    }

    let muxer: JMuxer | null = null;
    try {
      muxer = new JMuxer({
        node: video,
        mode: "video",
        flushingTime: 0,
        fps: 60,
        debug: false,
        onError: (err: unknown) => {
          const now = Date.now();
          if (now - lastMuxerErrAtRef.current < 250) {
            return;
          }
          lastMuxerErrAtRef.current = now;
          if (muxerRecoveryCountRef.current >= 8) {
            console.warn("[harmony-scrcpy] jmuxer 连续解码失败，停止自动恢复", err);
            return;
          }
          muxerRecoveryCountRef.current += 1;
          console.warn("[harmony-scrcpy] jmuxer 解码错误，重建管道:", err);
          try {
            muxer?.destroy();
          } catch {
            // ignore
          }
          jmuxerRef.current = null;
          sawFrameRef.current = false;
          setStatus("connecting");
          video.srcObject = null;
          video.removeAttribute("src");
          video.load();
          sendControl("idr");
          setDecodeGeneration((g) => g + 1);
        },
      });
      jmuxerRef.current = muxer;
    } catch (error) {
      console.warn("[harmony-scrcpy] jmuxer 初始化失败:", error);
      setDecodeGeneration((g) => g + 1);
    }

    const onVideoSignal = () => markConnectedIfPlaying();
    video.addEventListener("loadeddata", onVideoSignal);
    video.addEventListener("playing", onVideoSignal);
    video.addEventListener("resize", onVideoSignal);

    return () => {
      video.removeEventListener("loadeddata", onVideoSignal);
      video.removeEventListener("playing", onVideoSignal);
      video.removeEventListener("resize", onVideoSignal);
      try {
        muxer?.destroy();
      } catch {
        // ignore
      }
      jmuxerRef.current = null;
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [device.id, decodeGeneration, sendControl, markConnectedIfPlaying]);

  useEffect(() => {
    muxerRecoveryCountRef.current = 0;
    sawFrameRef.current = false;
    feedCountRef.current = 0;
  }, [device.id]);

  // WebSocket / hoscrcpy 会话仅随设备变化；解码重建不重启 sidecar。
  useEffect(() => {
    let cancelled = false;
    let frameLogAt = 0;

    async function connect() {
      try {
        const session = await startHarmonyScrcpy({ deviceId: device.id });
        if (cancelled) {
          void stopHarmonyScrcpy();
          return;
        }
        deviceSizeRef.current = {
          width: session.width,
          height: session.height,
        };
        if (session.width > 0 && session.height > 0) {
          setAspectRatio(session.width / session.height);
        }
        console.info(
          `[harmony-scrcpy] 会话已建立 ${session.width}x${session.height} ws=${session.wsUrl}`,
        );

        const ws = new WebSocket(session.wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        ws.onopen = () => {
          sendControl("idr");
        };
        ws.onmessage = (event) => {
          if (!(event.data instanceof ArrayBuffer)) {
            return;
          }
          const nalData = new Uint8Array(event.data);
          const muxer = jmuxerRef.current;
          if (!muxer || nalData.byteLength === 0) {
            return;
          }
          feedCountRef.current += 1;
          const now = Date.now();
          if (feedCountRef.current <= 3 || now - frameLogAt > 2000) {
            frameLogAt = now;
            const head = Array.from(nalData.subarray(0, Math.min(8, nalData.length)))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join(" ");
            console.info(
              `[harmony-scrcpy] feed#${feedCountRef.current} len=${nalData.byteLength} head=${head}`,
            );
          }
          try {
            muxer.feed({ video: nalData });
            const video = videoRef.current;
            if (video?.paused) {
              void video.play().catch(() => {
                // autoplay 策略拒绝时忽略，muted+playsInline 通常可过
              });
            }
            catchUpVideoLatency(video);
            markConnectedIfPlaying();
          } catch (error) {
            console.warn("[harmony-scrcpy] jmuxer feed 失败:", error);
            try {
              muxer.destroy();
            } catch {
              // ignore
            }
            jmuxerRef.current = null;
            sawFrameRef.current = false;
            setStatus("connecting");
            sendControl("idr");
            setDecodeGeneration((g) => g + 1);
          }
        };
        ws.onerror = () => {
          if (!cancelled) {
            setStatus("error");
          }
        };
        ws.onclose = () => {
          if (!cancelled && !sawFrameRef.current) {
            setStatus("error");
          }
        };
      } catch (error) {
        console.error("[harmony-scrcpy] 启动投屏失败:", error);
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
      void stopHarmonyScrcpy();
    };
  }, [device.id, sendControl, markConnectedIfPlaying]);

  const handlePointerDown = (event: MouseEvent<HTMLDivElement>) => {
    if (status !== "connected") {
      return;
    }
    const coords = mapToDeviceCoordinates(event.clientX, event.clientY);
    if (!coords) {
      return;
    }
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    sendControl(`touch down ${coords.x} ${coords.y}`);
  };

  const handlePointerMove = (event: MouseEvent<HTMLDivElement>) => {
    if (status !== "connected" || !dragStartRef.current) {
      return;
    }
    const now = Date.now();
    if (now - lastMoveRef.current < MOTION_THROTTLE_MS) {
      return;
    }
    lastMoveRef.current = now;
    const coords = mapToDeviceCoordinates(event.clientX, event.clientY);
    if (coords) {
      sendControl(`touch move ${coords.x} ${coords.y}`);
    }
  };

  const handlePointerUp = (event: MouseEvent<HTMLDivElement>) => {
    if (status !== "connected" || !dragStartRef.current) {
      return;
    }
    dragStartRef.current = null;
    const coords = mapToDeviceCoordinates(event.clientX, event.clientY);
    if (coords) {
      sendControl(`touch up ${coords.x} ${coords.y}`);
    }
  };

  return (
    <DeviceMirrorViewport aspectRatio={aspectRatio}>
      <div
        className="relative h-full w-full overflow-hidden bg-black [&>video]:!h-full [&>video]:!w-full [&>video]:!object-contain"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        <video
          key={`harmony-scrcpy-${device.id}-${decodeGeneration}`}
          ref={videoRef}
          className="block h-full w-full bg-black object-contain"
          autoPlay
          muted
          playsInline
        />
        {status !== "connected" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-neutral-900/90 text-neutral-200">
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
