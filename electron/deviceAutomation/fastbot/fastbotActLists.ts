import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execAdbSync } from "../scrcpyAdbFastPath";

export function pushActListFile(
  deviceId: string,
  lines: string[],
  remotePath: string,
): void {
  const content = lines.map((line) => line.trim()).filter(Boolean).join("\n");
  if (!content) {
    return;
  }
  const localDir = path.join(process.cwd(), ".lime", "fastbot-act-lists");
  mkdirSync(localDir, { recursive: true });
  const localPath = path.join(localDir, path.basename(remotePath));
  writeFileSync(localPath, `${content}\n`, "utf8");
  const result = execAdbSync(deviceId, ["push", localPath, remotePath]);
  if (result.exitCode !== 0) {
    throw new Error(
      `推送 Activity 名单失败：${remotePath} — ${result.stderr || result.stdout}`,
    );
  }
}

export function prepareActListRemotePaths(
  deviceId: string,
  actWhitelist: string[],
  actBlacklist: string[],
): { actWhitelistFile?: string; actBlacklistFile?: string } {
  const whitelist = actWhitelist.map((s) => s.trim()).filter(Boolean);
  const blacklist = actBlacklist.map((s) => s.trim()).filter(Boolean);
  if (whitelist.length > 0 && blacklist.length > 0) {
    throw new Error("Activity 白名单与黑名单不能同时配置（对齐 Kea2）");
  }
  if (whitelist.length > 0) {
    const remote = "/sdcard/ember-act-whitelist.strings";
    pushActListFile(deviceId, whitelist, remote);
    return { actWhitelistFile: remote };
  }
  if (blacklist.length > 0) {
    const remote = "/sdcard/ember-act-blacklist.strings";
    pushActListFile(deviceId, blacklist, remote);
    return { actBlacklistFile: remote };
  }
  return {};
}
