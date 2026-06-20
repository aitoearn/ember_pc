#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRODUCT_DISPLAY_NAME,
} from "./productIdentity.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const outputDir = path.join(repoRoot, "resources/electron");

const script = `
from PIL import Image, ImageDraw, ImageFont

W, H = 520, 340
ICON_Y = 160
TITLE = ${JSON.stringify(PRODUCT_DISPLAY_NAME)}
SUB = "将 ${PRODUCT_DISPLAY_NAME} 拖移到 Applications 文件夹以安装"
BG = (247, 251, 244)
TITLE_COLOR = (15, 23, 42)
SUB_COLOR = (100, 116, 139)
ARROW = (148, 163, 184)
PANEL = (236, 242, 238)
ICON_HALF = 52
LABEL = 22
PANEL_TOP = ICON_Y - ICON_HALF - 10
PANEL_BOTTOM = ICON_Y + ICON_HALF + LABEL + 10

def load_font(size, bold=False):
    for path in [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]:
        try:
            return ImageFont.truetype(path, size, index=1 if bold else 0)
        except Exception:
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def make(path, scale=1):
    w, h = W * scale, H * scale
    icon_y = ICON_Y * scale
    img = Image.new('RGB', (w, h), BG)
    draw = ImageDraw.Draw(img)
    title_font = load_font(int(24 * scale), bold=True)
    sub_font = load_font(int(13 * scale))

    draw.text((w // 2, int(38 * scale)), TITLE, fill=TITLE_COLOR, font=title_font, anchor='mm')
    draw.text((w // 2, int(62 * scale)), SUB, fill=SUB_COLOR, font=sub_font, anchor='mm')

    draw.rounded_rectangle(
        [int(48 * scale), int(PANEL_TOP * scale), int(472 * scale), int(PANEL_BOTTOM * scale)],
        radius=int(14 * scale),
        fill=(255, 255, 255),
        outline=PANEL,
        width=max(1, scale),
    )

    cy = int(icon_y)
    draw.polygon([
        (int(248 * scale), cy - int(14 * scale)),
        (int(272 * scale), cy),
        (int(248 * scale), cy + int(14 * scale)),
    ], fill=ARROW)

    img.save(path)

make(${JSON.stringify(path.join(outputDir, "dmg-background.png"))}, 1)
make(${JSON.stringify(path.join(outputDir, "dmg-background@2x.png"))}, 2)
`;

const result = spawnSync("python3", ["-c", script], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

console.log(`[electron-dmg-background] 已生成 ${outputDir}/dmg-background.png`);
