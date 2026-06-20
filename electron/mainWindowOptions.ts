import type { BrowserWindowConstructorOptions } from "electron";

export type MainWindowChromeOptions = Pick<
  BrowserWindowConstructorOptions,
  "titleBarStyle" | "trafficLightPosition"
>;

export type MainWindowStartupOptions = Pick<
  BrowserWindowConstructorOptions,
  "backgroundColor" | "show"
>;

// 主窗口先隐藏并使用与启动画面一致的底色，等渲染页面首帧可绘制（ready-to-show）后再显示，
// 避免启动期白屏。启动画面由渲染页面 index.html 内置的 overlay 承担，主进程不再单独拼装。
export function buildMainWindowStartupOptions(): MainWindowStartupOptions {
  return {
    backgroundColor: "#f7fbf4",
    show: false,
  };
}

export function buildMainWindowChromeOptions(
  platform: NodeJS.Platform = process.platform,
): MainWindowChromeOptions {
  if (platform !== "darwin") {
    return {};
  }

  return {
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 18, y: 18 },
  };
}
