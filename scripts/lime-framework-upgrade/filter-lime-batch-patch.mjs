#!/usr/bin/env node
/**
 * 从 Lime batch patch 中剔除 Layer 2 冻结路径，并做 lime-rs → ember-rs 路径改写。
 *
 * 用法：
 *   node scripts/lime-framework-upgrade/filter-lime-batch-patch.mjs \
 *     --input /tmp/lime-batch-a.patch \
 *     --output /tmp/lime-batch-a.filtered.patch
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  findFreezeViolations,
  mapLimePathToEmber,
  normalizeRepoPath,
  parsePatchFilePaths,
} from "./lib/freeze-manifest.mjs";

function parseArgs(argv) {
  const options = {
    input: null,
    output: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input" || arg === "-i") {
      options.input = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }
  return options;
}

function rewriteChunkPaths(chunk) {
  return chunk
    .replace(
      /^diff --git a\/lime-rs\/(.+?) b\/lime-rs\/(.+)$/gm,
      "diff --git a/ember-rs/$1 b/ember-rs/$2",
    )
    .replace(
      /^(---|\+\+\+)\s+[ab]\/lime-rs\//gm,
      (line) => line.replace("/lime-rs/", "/ember-rs/"),
    )
    .replace(/\bcrates\/lime_/g, "crates/ember_")
    .replace(/\blime-rs\b/g, "ember-rs");
}

function chunkPaths(chunk) {
  return parsePatchFilePaths(chunk).map((filePath) =>
    mapLimePathToEmber(filePath),
  );
}

function isChunkFrozen(chunk) {
  const paths = chunkPaths(chunk);
  return findFreezeViolations(paths, { mapLimeRs: false }).violations.length > 0;
}

function splitPatchChunks(patchContent) {
  const lines = patchContent.split(/\r?\n/);
  const chunks = [];
  let current = [];
  for (const line of lines) {
    if (line.startsWith("diff --git ") && current.length > 0) {
      chunks.push(`${current.join("\n")}\n`);
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    chunks.push(`${current.join("\n")}\n`);
  }
  return chunks.filter((chunk) => chunk.trim().length > 0);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.input || !options.output) {
    console.log(`用法:
  node scripts/lime-framework-upgrade/filter-lime-batch-patch.mjs \\
    --input /tmp/lime-batch-a.patch \\
    --output /tmp/lime-batch-a.filtered.patch`);
    process.exit(options.help ? 0 : 1);
  }

  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  const patchContent = fs.readFileSync(inputPath, "utf8");
  const chunks = splitPatchChunks(patchContent);

  const kept = [];
  const dropped = new Set();
  for (const chunk of chunks) {
    const paths = chunkPaths(chunk);
    const { violations } = findFreezeViolations(paths, { mapLimeRs: false });
    if (violations.length > 0) {
      for (const item of violations) {
        dropped.add(normalizeRepoPath(item.path));
      }
      continue;
    }
    kept.push(rewriteChunkPaths(chunk));
  }

  fs.writeFileSync(outputPath, kept.join(""), "utf8");
  console.log(
    `[lime-filter] 输入 ${chunks.length} 段，保留 ${kept.length} 段，剔除 ${dropped.size} 个冻结路径`,
  );
  if (dropped.size > 0) {
    for (const filePath of [...dropped].sort()) {
      console.log(`  - ${filePath}`);
    }
  }
  console.log(`[lime-filter] 输出 → ${outputPath}`);
}

main();
