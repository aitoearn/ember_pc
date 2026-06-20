#!/usr/bin/env node
/**
 * 从 resources/branding/app-icon-source.png 生成全平台应用图标。
 * 依赖：macOS 自带 sips/iconutil，或 ImageMagick（magick/convert）。
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT, "resources/branding/app-icon-source.png");
const ICONS_DIR = path.join(ROOT, "ember-rs/icons");
const PUBLIC_DIR = path.join(ROOT, "public");
const CHROME_ICONS_DIR = path.join(ROOT, "extensions/ember-chrome/icons");
const TRAY_DIR = path.join(ICONS_DIR, "tray");

function resolveMagickCommand() {
  for (const candidate of ["magick", "convert"]) {
    try {
      execFileSync("which", [candidate], { stdio: "pipe" });
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

function resizePng(source, output, size) {
  const magick = resolveMagickCommand();
  if (magick) {
    execFileSync(
      magick,
      [
        source,
        "-filter",
        "Lanczos",
        "-resize",
        `${size}x${size}`,
        "-background",
        "none",
        output,
      ],
      { stdio: "inherit" },
    );
    return;
  }

  execFileSync(
    "sips",
    ["-z", String(size), String(size), source, "--out", output],
    { stdio: "inherit" },
  );
}

function resizeNamedPngs(source, entries) {
  for (const entry of entries) {
    const output = path.join(ICONS_DIR, entry.name);
    resizePng(source, output, entry.size);
    console.log(`✓ ${entry.name} (${entry.size}px)`);
  }
}

function readImageSize(filePath) {
  const magick = resolveMagickCommand();
  if (magick) {
    const output = execFileSync(magick, ["identify", "-format", "%w %h", filePath], {
      encoding: "utf8",
    }).trim();
    const [width, height] = output.split(/\s+/).map(Number);
    return { width, height };
  }

  const output = execFileSync(
    "sips",
    ["-g", "pixelWidth", "-g", "pixelHeight", filePath],
    { encoding: "utf8" },
  );
  const width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0);
  const height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0);
  return { width, height };
}

function walkPngFiles(dir, output = []) {
  if (!existsSync(dir)) {
    return output;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPngFiles(full, output);
      continue;
    }
    if (entry.name.endsWith(".png")) {
      output.push(full);
    }
  }
  return output;
}

function generateIcns(source) {
  const iconsetDir = path.join(ICONS_DIR, "AppIcon.iconset");
  rmSync(iconsetDir, { recursive: true, force: true });
  mkdirSync(iconsetDir, { recursive: true });
  const mappings = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024],
  ];

  try {
    for (const [name, size] of mappings) {
      const target = path.join(iconsetDir, name);
      resizePng(source, target, size);
      // iconutil 对部分带 alpha 的 PNG 较挑剔，统一压成 RGBA PNG
      execFileSync("sips", ["-s", "format", "png", target, "--out", target], {
        stdio: "pipe",
      });
    }
    execFileSync(
      "iconutil",
      ["-c", "icns", iconsetDir, "-o", path.join(ICONS_DIR, "icon.icns")],
      { stdio: "inherit" },
    );
    console.log("✓ icon.icns");
  } finally {
    rmSync(iconsetDir, { recursive: true, force: true });
  }
}

function generateIco(source) {
  const output = path.join(ICONS_DIR, "icon.ico");
  const magick = resolveMagickCommand();
  if (!magick) {
    throw new Error("生成 icon.ico 需要 ImageMagick（magick/convert）");
  }
  execFileSync(
    magick,
    [source, "-define", "icon:auto-resize=256,128,64,48,32,16", output],
    { stdio: "inherit" },
  );
  console.log("✓ icon.ico");
}

function generateTrayIcons(source) {
  mkdirSync(TRAY_DIR, { recursive: true });
  const magick = resolveMagickCommand();

  resizePng(source, path.join(TRAY_DIR, "tray-running.png"), 32);
  console.log("✓ tray/tray-running.png (32px)");

  if (magick) {
    const templatePath = path.join(TRAY_DIR, "trayTemplate.png");
    execFileSync(
      magick,
      [
        source,
        "-resize",
        "22x22",
        "-alpha",
        "on",
        "-colorspace",
        "Gray",
        "-fill",
        "black",
        "-colorize",
        "100",
        templatePath,
      ],
      { stdio: "inherit" },
    );
    resizePng(templatePath, path.join(TRAY_DIR, "trayTemplate@2x.png"), 44);
    console.log("✓ tray/trayTemplate.png + @2x");
  }

  for (const state of ["warning", "error", "stopped"]) {
    const target = path.join(TRAY_DIR, `tray-${state}.png`);
    if (existsSync(target)) {
      resizePng(source, target, 32);
      console.log(`✓ tray/tray-${state}.png (32px)`);
    }
  }
}

function ensureSource() {
  if (!existsSync(SOURCE)) {
    throw new Error(`缺少源图：${SOURCE}`);
  }
  const { width, height } = readImageSize(SOURCE);
  if (width !== height || width < 512) {
    throw new Error(`源图应为正方形且不小于 512px，当前 ${width}x${height}`);
  }
}

function main() {
  console.log(`源图：${SOURCE}\n`);
  ensureSource();

  cpSync(SOURCE, path.join(ICONS_DIR, "icon.png"));
  cpSync(SOURCE, path.join(PUBLIC_DIR, "logo.png"));
  console.log("✓ ember-rs/icons/icon.png");
  console.log("✓ public/logo.png");

  resizeNamedPngs(SOURCE, [
    { name: "32x32.png", size: 32 },
    { name: "64x64.png", size: 64 },
    { name: "128x128.png", size: 128 },
    { name: "128x128@2x.png", size: 256 },
    { name: "Square30x30Logo.png", size: 30 },
    { name: "Square44x44Logo.png", size: 44 },
    { name: "Square71x71Logo.png", size: 71 },
    { name: "Square89x89Logo.png", size: 89 },
    { name: "Square107x107Logo.png", size: 107 },
    { name: "Square142x142Logo.png", size: 142 },
    { name: "Square150x150Logo.png", size: 150 },
    { name: "Square284x284Logo.png", size: 284 },
    { name: "Square310x310Logo.png", size: 310 },
    { name: "StoreLogo.png", size: 50 },
  ]);

  resizePng(SOURCE, path.join(PUBLIC_DIR, "logo-128.png"), 128);
  resizePng(SOURCE, path.join(PUBLIC_DIR, "logo-v6-128-rsvg.png"), 128);
  console.log("✓ public/logo-128.png");
  console.log("✓ public/logo-v6-128-rsvg.png");

  for (const pngPath of walkPngFiles(path.join(ICONS_DIR, "ios"))) {
    const { width, height } = readImageSize(pngPath);
    resizePng(SOURCE, pngPath, Math.max(width, height));
    console.log(`✓ ${path.relative(ROOT, pngPath)}`);
  }

  for (const pngPath of walkPngFiles(path.join(ICONS_DIR, "android"))) {
    const { width, height } = readImageSize(pngPath);
    resizePng(SOURCE, pngPath, Math.max(width, height));
    console.log(`✓ ${path.relative(ROOT, pngPath)}`);
  }

  mkdirSync(CHROME_ICONS_DIR, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    const target = path.join(CHROME_ICONS_DIR, `icon${size}.png`);
    resizePng(SOURCE, target, size);
    console.log(`✓ extensions/ember-chrome/icons/icon${size}.png`);
  }

  generateTrayIcons(SOURCE);
  generateIcns(SOURCE);
  generateIco(SOURCE);

  console.log("\n✅ 应用图标已全部生成");
}

main();
