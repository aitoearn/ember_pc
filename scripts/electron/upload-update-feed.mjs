#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildElectronUpdateFeedUploadPlan,
  DEFAULT_UPDATE_BASE_URL,
  parseCliArgs,
} from "./update-feed-core.mjs";

function uniqueByKey(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (seen.has(item.key)) {
      continue;
    }
    seen.add(item.key);
    result.push(item);
  }
  return result;
}

function runCommand(command, args, { dryRun = false } = {}) {
  const printable = [command, ...args].join(" ");
  if (dryRun) {
    console.log(`[dry-run] ${printable}`);
    return { status: 0 };
  }
  console.log(`[upload] ${printable}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`command failed (${result.status}): ${printable}`);
  }
  return result;
}

function uploadWithScp(items, { dryRun, remoteRoot, sshTarget }) {
  if (!sshTarget) {
    throw new Error(
      "SCP 模式需要 EMBER_UPDATES_SSH_TARGET，例如 root@1.2.3.4",
    );
  }
  const normalizedRoot = remoteRoot.replace(/\/+$/, "");
  for (const item of items) {
    const remoteDir = `${normalizedRoot}/${path.posix.dirname(item.remotePath)}`;
    const remoteFile = `${normalizedRoot}/${item.remotePath}`;
    runCommand(
      "ssh",
      [sshTarget, `mkdir -p '${remoteDir.replace(/'/g, `'\\''`)}'`],
      { dryRun },
    );
    runCommand("scp", [item.file, `${sshTarget}:${remoteFile}`], { dryRun });
  }
}

function uploadWithOssutil(items, { dryRun, bucket }) {
  if (!bucket) {
    throw new Error("OSS 模式需要 EMBER_RELEASES_OSS_BUCKET");
  }
  for (const item of items) {
    const objectKey = `oss://${bucket}/${item.key}`;
    runCommand(
      "ossutil",
      [
        "cp",
        item.file,
        objectKey,
        "--meta",
        `Cache-Control:${item.cacheControl}`,
        "--meta",
        `Content-Type:${item.contentType}`,
        "-f",
      ],
      { dryRun },
    );
  }
}

function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === "true";
  const mode = (args.mode || process.env.EMBER_UPDATES_UPLOAD_MODE || "scp")
    .trim()
    .toLowerCase();
  const version =
    args.version || process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;
  const plan = uniqueByKey(
    buildElectronUpdateFeedUploadPlan({
      assetsDir: args["assets-dir"] || "release-assets",
      bucket:
        args.bucket ||
        process.env.EMBER_RELEASES_OSS_BUCKET ||
        process.env.EMBER_RELEASES_R2_BUCKET ||
        "lmtest-updates",
      channel: args.channel || process.env.EMBER_RELEASE_CHANNEL || "stable",
      version,
    }),
  );

  console.log(
    `[update-feed] 目标基址 ${DEFAULT_UPDATE_BASE_URL}，共 ${plan.length} 个对象`,
  );

  if (mode === "oss") {
    uploadWithOssutil(plan, {
      dryRun,
      bucket:
        args.bucket ||
        process.env.EMBER_RELEASES_OSS_BUCKET ||
        process.env.EMBER_RELEASES_R2_BUCKET ||
        "lmtest-updates",
    });
  } else if (mode === "scp") {
    uploadWithScp(plan, {
      dryRun,
      remoteRoot:
        args["remote-root"] ||
        process.env.EMBER_UPDATES_REMOTE_ROOT ||
        "/www/wwwroot/updates.aiearn.me",
      sshTarget: args["ssh-target"] || process.env.EMBER_UPDATES_SSH_TARGET,
    });
  } else {
    throw new Error(`unsupported upload mode: ${mode} (expected scp or oss)`);
  }

  console.log("[update-feed] 上传完成");
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  main();
}

export { uploadWithScp, uploadWithOssutil, uniqueByKey };
