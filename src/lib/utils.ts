import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 验证代理 URL 格式
 * 支持的格式：
 * - http://host:port
 * - https://host:port
 * - socks5://host:port
 * - http://user:pass@host:port（带认证）
 */
export function validateProxyUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // 空值允许
  const pattern = /^(https?|socks5?):\/\/[^\s]+$/i;
  return pattern.test(url.trim());
}
