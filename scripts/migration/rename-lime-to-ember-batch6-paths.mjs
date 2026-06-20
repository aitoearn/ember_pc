#!/usr/bin/env node
/**
 * Lime → Ember 路径与文件名重命名（batch6）
 * 必须在 batch5-full 之后运行；使用磁盘上的旧路径作为 git mv 源。
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");

function gitMv(fromRel, toRel) {
  if (fromRel === toRel) return;
  const from = path.join(ROOT, fromRel);
  const to = path.join(ROOT, toRel);
  if (!fs.existsSync(from)) {
    console.log(`跳过（不存在）: ${fromRel}`);
    return;
  }
  if (fs.existsSync(to)) {
    console.log(`跳过（目标已存在）: ${toRel}`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  execSync(`git mv "${fromRel}" "${toRel}"`, { cwd: ROOT, stdio: "inherit" });
  console.log(`重命名: ${fromRel} -> ${toRel}`);
}

function renameInName(rootRel, renamer) {
  if (!fs.existsSync(path.join(ROOT, rootRel))) return;
  const entries = [];
  function collect(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === ".git" || name === "target") continue;
        collect(full);
      } else {
        entries.push(full);
      }
    }
  }
  collect(path.join(ROOT, rootRel));
  for (const full of entries.sort((a, b) => b.length - a.length)) {
    const base = path.basename(full);
    const nextBase = renamer(base);
    if (nextBase !== base) {
      gitMv(path.relative(ROOT, full), path.relative(ROOT, path.join(path.dirname(full), nextBase)));
    }
  }
}

const DIR_MOVES = [
  ["lime-rs", "ember-rs"],
  ["extensions/lime-chrome", "extensions/ember-chrome"],
  ["packages/lime-cli-npm", "packages/ember-cli-npm"],
  ["tools/lime-cli", "tools/ember-cli"],
];

for (const [from, to] of DIR_MOVES) {
  gitMv(from, to);
}

gitMv("ember-rs/crates/lime-cli", "ember-rs/crates/ember-cli");
gitMv("homebrew/Casks/lime.rb", "homebrew/Casks/ember.rb");
gitMv("packages/ember-cli-npm/bin/lime", "packages/ember-cli-npm/bin/ember");

const FILE_MOVES = [
  ["src/features/agent-app/runtime-profile/LimeRuntimeProfile.ts", "src/features/agent-app/runtime-profile/EmberRuntimeProfile.ts"],
  ["src/components/agent/chat/utils/limeTaskProtocolNoise.ts", "src/components/agent/chat/utils/emberTaskProtocolNoise.ts"],
  ["src/components/agent/chat/utils/limeTaskProtocolNoise.test.ts", "src/components/agent/chat/utils/emberTaskProtocolNoise.test.ts"],
  ["src/components/agent/chat/hooks/useLimeSkills.ts", "src/components/agent/chat/hooks/useEmberSkills.ts"],
  ["src/components/agent/chat/hooks/useLimeSkills.test.tsx", "src/components/agent/chat/hooks/useEmberSkills.test.tsx"],
  ["src/lib/oemLimeHubProvider.ts", "src/lib/oemEmberHubProvider.ts"],
  ["src/lib/oemLimeHubProvider.test.ts", "src/lib/oemEmberHubProvider.test.ts"],
  ["src/hooks/useOemLimeHubProviderSync.ts", "src/hooks/useOemEmberHubProviderSync.ts"],
  ["src/hooks/useOemLimeHubProviderSync.test.tsx", "src/hooks/useOemEmberHubProviderSync.test.tsx"],
  ["src/icons/providers/lime.svg", "src/icons/providers/ember.svg"],
  ["src/icons/providers/lime-hub.svg", "src/icons/providers/ember-hub.svg"],
  ["ember-rs/crates/skills/src/lime_llm_provider.rs", "ember-rs/crates/skills/src/ember_llm_provider.rs"],
];

for (const [from, to] of FILE_MOVES) {
  gitMv(from, to);
}

renameInName("internal", (name) =>
  name.replace(/lime/gi, (m) => (m === "Lime" ? "Ember" : m === "LIME" ? "EMBER" : "ember")).replace(/devlime/gi, "devember"),
);

renameInName("src/assets/entry-surface", (name) => name.replace(/-lime\./g, "-ember."));

console.log("Ember 迁移 batch6-paths 完成");
