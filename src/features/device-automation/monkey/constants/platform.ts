export function isAndroidMonkeySupported(platform: string | undefined): boolean {
  return platform?.trim().toLowerCase() === "android";
}
