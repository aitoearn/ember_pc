package com.lime.harmonyscrcpy;

import com.huawei.hosscrcpy.api.HosRemoteConfig;
import com.huawei.hosscrcpy.api.HosRemoteDevice;
import com.huawei.hosscrcpy.api.ScreenCapCallback;
import com.huawei.hosscrcpy.api.Size;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

/**
 * HarmonyOS 投屏 wrapper（Ember 侧自研），包装华为 hoscrcpy SDK。
 *
 * 协议（供 Electron 父进程消费）：
 *   stdout：二进制 H.264 流，逐帧 [4 字节大端长度][H264 数据]。
 *   stderr：日志与结构化事件行，前缀标记：
 *           @@META@@ {"width":W,"height":H,"scale":S}  设备分辨率
 *           @@READY@@                                   视频流就绪（需触发画面变动）
 *           @@ERROR@@ <message>                         致命错误
 *   stdin：控制指令行（空格分隔，避免 JSON 依赖）：
 *           touch <down|move|up> <x> <y>
 *           nav <back|home>       （用手势模拟，HarmonyOS 无直接按键 API）
 *           idr                   （强制关键帧，供新连接的播放器解码）
 *           shell <command...>    （透传 hdc shell，预留）
 *
 * 说明：默认 scale=1，使视频像素与设备像素一致，触控坐标直接透传，无需换算。
 */
public final class HarmonyScrcpyWrapper {

  private static final Object OUT_LOCK = new Object();
  private static OutputStream rawOut;
  private static volatile int screenWidth = 0;
  private static volatile int screenHeight = 0;

  private HarmonyScrcpyWrapper() {}

  public static void main(String[] args) {
    String sn = null;
    String hdc = null;
    int scale = 1;
    int bitRate = -1;
    int frameRate = -1;

    for (int i = 0; i < args.length; i++) {
      String key = args[i];
      switch (key) {
        case "--sn":
          sn = safeNext(args, ++i);
          break;
        case "--hdc":
          hdc = safeNext(args, ++i);
          break;
        case "--scale":
          scale = parseIntOr(safeNext(args, ++i), 1);
          break;
        case "--bitrate":
          bitRate = parseIntOr(safeNext(args, ++i), -1);
          break;
        case "--framerate":
          frameRate = parseIntOr(safeNext(args, ++i), -1);
          break;
        default:
          break;
      }
    }

    if (sn == null || sn.isEmpty()) {
      event("@@ERROR@@ 缺少 --sn 参数");
      System.exit(2);
      return;
    }

    rawOut = new BufferedOutputStream(System.out, 1 << 20);

    HosRemoteConfig config = new HosRemoteConfig(sn);
    if (hdc != null && !hdc.isEmpty()) {
      config.setHdcPath(hdc);
    }
    if (scale > 1) {
      config.setScale(scale);
    }
    if (bitRate > 0) {
      config.setBitRate(bitRate);
    }
    if (frameRate > 0) {
      config.setFrameRate(frameRate);
    }

    final HosRemoteDevice device = new HosRemoteDevice(config);

    Thread controlThread = new Thread(() -> readControlLoop(device), "harmony-scrcpy-control");
    controlThread.setDaemon(true);
    controlThread.start();

    try {
      Size size = device.getScreenSize(true);
      if (size != null) {
        screenWidth = size.width;
        screenHeight = size.height;
        event("@@META@@ {\"width\":" + size.width + ",\"height\":" + size.height
            + ",\"scale\":" + scale + "}");
      }
    } catch (Throwable t) {
      event("@@WARN@@ getScreenSize 失败: " + t.getMessage());
    }

    try {
      device.startCaptureScreen(new ScreenCapCallback() {
        @Override
        public void onData(ByteBuffer byteBuffer) {
          writeFrame(byteBuffer);
        }

        @Override
        public void onException(Throwable throwable) {
          event("@@ERROR@@ " + String.valueOf(throwable.getMessage()));
        }

        @Override
        public void onReady() {
          event("@@READY@@");
          // 对齐 lmdeviceagent HosScrcpyManager：促发画面变动以产出首帧。
          triggerFirstFrame(device);
        }
      });
    } catch (Throwable t) {
      event("@@ERROR@@ startCaptureScreen 失败: " + t.getMessage());
      System.exit(1);
      return;
    }

    // 阻塞主线程，直到 stdin 关闭（父进程退出）或收到 stop。
    try {
      Thread.currentThread().join();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private static void writeFrame(ByteBuffer byteBuffer) {
    if (byteBuffer == null) {
      return;
    }
    int len = byteBuffer.remaining();
    if (len <= 0) {
      return;
    }
    byte[] data = new byte[len];
    byteBuffer.get(data);
    byte[] header = new byte[] {
        (byte) (len >>> 24),
        (byte) (len >>> 16),
        (byte) (len >>> 8),
        (byte) len,
    };
    try {
      synchronized (OUT_LOCK) {
        rawOut.write(header);
        rawOut.write(data);
        rawOut.flush();
      }
    } catch (IOException e) {
      // stdout 关闭代表父进程已退出，直接结束。
      System.exit(0);
    }
  }

  private static void readControlLoop(HosRemoteDevice device) {
    try (BufferedReader reader =
        new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        handleControl(device, line.trim());
      }
    } catch (IOException e) {
      // 忽略：stdin 关闭即退出。
    }
    // stdin 关闭，父进程已退出。
    try {
      device.stopCaptureScreen();
    } catch (Throwable ignored) {
      // ignore
    }
    System.exit(0);
  }

  private static void handleControl(HosRemoteDevice device, String line) {
    if (line.isEmpty()) {
      return;
    }
    String[] parts = line.split("\\s+");
    try {
      switch (parts[0]) {
        case "touch":
          handleTouch(device, parts);
          break;
        case "nav":
          handleNav(device, parts.length > 1 ? parts[1] : "");
          break;
        case "idr":
          device.requestIDRFrame();
          break;
        case "stop":
          device.stopCaptureScreen();
          System.exit(0);
          break;
        default:
          event("@@WARN@@ 未知控制指令: " + parts[0]);
          break;
      }
    } catch (Throwable t) {
      event("@@WARN@@ 控制指令执行失败(" + line + "): " + t.getMessage());
    }
  }

  /**
   * 轻微小幅触控，促使编码器吐出首帧（参考 lmdeviceagent triggerMouseMove）。
   */
  private static void triggerFirstFrame(HosRemoteDevice device) {
    try {
      int x = screenWidth > 0 ? Math.min(500, screenWidth / 2) : 500;
      int y = screenHeight > 0 ? Math.min(500, screenHeight / 2) : 500;
      device.onTouchDown(x, y);
      device.onTouchMove(x + 2, y + 2);
      device.onTouchUp(x + 2, y + 2);
      device.requestIDRFrame();
      event("@@INFO@@ 已触发首帧触控 + IDR");
    } catch (Throwable t) {
      event("@@WARN@@ 触发首帧失败: " + t.getMessage());
    }
  }

  private static void handleTouch(HosRemoteDevice device, String[] parts) {
    if (parts.length < 4) {
      return;
    }
    String action = parts[1];
    int x = parseIntOr(parts[2], -1);
    int y = parseIntOr(parts[3], -1);
    if (x < 0 || y < 0) {
      return;
    }
    switch (action) {
      case "down":
        device.onTouchDown(x, y);
        break;
      case "move":
        device.onTouchMove(x, y);
        break;
      case "up":
        device.onTouchUp(x, y);
        break;
      default:
        break;
    }
  }

  /** HarmonyOS 无直接返回/主页按键 API，用系统手势导航模拟。 */
  private static void handleNav(HosRemoteDevice device, String action) {
    int w = screenWidth;
    int h = screenHeight;
    if (w <= 0 || h <= 0) {
      event("@@WARN@@ 无分辨率，跳过导航手势");
      return;
    }
    if ("back".equals(action)) {
      // 从左边缘向右滑：系统返回手势。
      swipe(device, 2, h / 2, (int) (w * 0.45), h / 2, 6);
    } else if ("home".equals(action)) {
      // 从底部中间向上滑：回到主页手势。
      swipe(device, w / 2, h - 2, w / 2, (int) (h * 0.4), 6);
    }
  }

  private static void swipe(HosRemoteDevice device, int x1, int y1, int x2, int y2, int steps) {
    device.onTouchDown(x1, y1);
    for (int i = 1; i <= steps; i++) {
      int x = x1 + (x2 - x1) * i / steps;
      int y = y1 + (y2 - y1) * i / steps;
      device.onTouchMove(x, y);
      sleep(12);
    }
    device.onTouchUp(x2, y2);
  }

  private static void sleep(long ms) {
    try {
      Thread.sleep(ms);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private static void event(String message) {
    System.err.println(message);
    System.err.flush();
  }

  private static String safeNext(String[] args, int index) {
    return index < args.length ? args[index] : null;
  }

  private static int parseIntOr(String value, int fallback) {
    if (value == null) {
      return fallback;
    }
    try {
      return Integer.parseInt(value.trim());
    } catch (NumberFormatException e) {
      return fallback;
    }
  }
}
