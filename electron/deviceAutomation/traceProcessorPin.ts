/** trace_processor_shell 版本钉版（对齐 SmartPerfetto scripts/trace-processor-pin.env v57.2）。 */

export const TRACE_PROCESSOR_PIN = {
  version: "v57.2",
  urlBase: "https://commondatastorage.googleapis.com/perfetto-luci-artifacts",
  sha256ByPlatform: {
    "linux-amd64":
      "55ba613fc6d4f71df81eee2dbfc293020063655c241b3e314bff75345b802684",
    "linux-arm64":
      "1dcc1d9aaff2eb92e8bc58f1957e4e445600294bd61dbc09345c1018c5ff0868",
    "mac-amd64":
      "c0f61397901da47cbe1bb9a0843624f7c2038ac92176ce15e3736ce9aa0afef0",
    "mac-arm64":
      "98a41b80e9f60da0373d64aff6455681f8c26b7c391ae5736324a5b11e3dacc2",
    "windows-amd64":
      "100334b6091596fbc97f872556849a5747bf47a7f7190c485ba8cea8d2409c7b",
  },
} as const;

export type TraceProcessorPlatformKey = keyof typeof TRACE_PROCESSOR_PIN.sha256ByPlatform;

export function detectTraceProcessorPlatform(): TraceProcessorPlatformKey {
  const osPart = (() => {
    switch (process.platform) {
      case "darwin":
        return "mac";
      case "linux":
        return "linux";
      case "win32":
        return "windows";
      default:
        throw new Error(
          `当前系统不支持自动下载 trace_processor_shell: ${process.platform}。请设置 PERFETTO_TRACE_PROCESSOR_PATH。`,
        );
    }
  })();

  const archPart = (() => {
    switch (process.arch) {
      case "x64":
        return "amd64";
      case "arm64":
        return "arm64";
      default:
        throw new Error(
          `当前 CPU 架构不支持自动下载 trace_processor_shell: ${process.arch}。请设置 PERFETTO_TRACE_PROCESSOR_PATH。`,
        );
    }
  })();

  return `${osPart}-${archPart}` as TraceProcessorPlatformKey;
}

export function resolveTraceProcessorDownloadUrl(platform: TraceProcessorPlatformKey): string {
  const exactUrl = process.env.PERFETTO_TRACE_PROCESSOR_DOWNLOAD_URL?.trim();
  if (exactUrl) {
    return exactUrl;
  }

  const urlBase =
    process.env.PERFETTO_TRACE_PROCESSOR_DOWNLOAD_BASE?.trim() ||
    TRACE_PROCESSOR_PIN.urlBase;
  const executableName = platform.startsWith("windows-")
    ? "trace_processor_shell.exe"
    : "trace_processor_shell";
  return `${urlBase.replace(/\/+$/, "")}/${TRACE_PROCESSOR_PIN.version}/${platform}/${executableName}`;
}
