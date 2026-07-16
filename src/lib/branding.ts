export const EMBER_BRAND_NAME = "Ember";
export const EMBER_BRAND_NAME_ZH = "熠测";

// 前台品牌默认使用 logo.png 主图；托盘态会在同一底图上额外叠加状态点。
export const EMBER_BRAND_LOGO_SRC = buildPublicAssetUrl("logo.png");

export function resolveEmberBrandDisplayName(locale?: string | null): string {
  const normalized = locale?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("zh")) {
    return EMBER_BRAND_NAME_ZH;
  }
  return EMBER_BRAND_NAME;
}

export function buildPublicAssetUrl(
  fileName: string,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const normalizedBaseUrl = baseUrl.trim() || "/";
  const baseWithSlash = normalizedBaseUrl.endsWith("/")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/`;
  return `${baseWithSlash}${fileName.replace(/^\/+/, "")}`;
}
