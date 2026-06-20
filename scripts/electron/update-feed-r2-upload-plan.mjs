#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildElectronUpdateFeedUploadPlan,
  parseCliArgs,
} from "./update-feed-core.mjs";

function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const plan = buildElectronUpdateFeedUploadPlan({
    assetsDir: args["assets-dir"],
    bucket:
      args.bucket || process.env.EMBER_RELEASES_R2_BUCKET || "lmtest-updates",
    channel: args.channel || process.env.EMBER_RELEASE_CHANNEL || "stable",
    version:
      args.version || process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME,
  });

  const outFile = args.output;
  if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, `${JSON.stringify(plan, null, 2)}\n`);
  } else {
    console.log(JSON.stringify(plan, null, 2));
  }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  main();
}

export { buildElectronUpdateFeedUploadPlan };
