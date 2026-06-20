/**
 * 对齐 aya ScrcpyClient：licia/strHash(deviceId) % 999999 + localabstract 零填充。
 */

/** 对齐 aya licia/strHash */
export function strHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

/** 对齐 aya：options.value.scid = toStr(strHash(deviceId) % 999999) */
export function deriveAyaScrcpyScid(deviceId: string): string {
  return String(Math.abs(strHash(deviceId.trim())) % 999_999);
}

/** 对齐 aya：localabstract:scrcpy_${lpad(scid, 8, '0')} */
export function buildScrcpyReverseRemote(deviceId: string): string {
  return `localabstract:scrcpy_${deriveAyaScrcpyScid(deviceId).padStart(8, "0")}`;
}
