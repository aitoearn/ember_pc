/** macOS / Windows 安装后对用户可见的产品名（中文）。 */
export const PRODUCT_DISPLAY_NAME = "熠测";

/** 内部可执行文件名、Helper 进程前缀与 CI 仍使用英文标识。 */
export const PRODUCT_NAME = "Ember";

/** macOS Forge 输出目录名，例如 `熠测-darwin-arm64`。 */
export function macPackageDirName(arch) {
  return `${PRODUCT_DISPLAY_NAME}-darwin-${arch}`;
}
