#!/usr/bin/env node
/**
 * Slices docs/branding/taybah-nabawi-logo.png into PNG layers for the animated splash.
 * Each layer is pasted on a full 1254×1254 canvas (no seam gaps between bands).
 * Crop rects must match apps/mobile/src/shared/ui/splash-logo-raster-layers.ts
 *
 * The logo is the gold line-art mosque with the gold «طيبة» and "taybah" lettering under it
 * (docs/branding/taybah-mosque-logo.svg, ADR 0088), so every layer is cut from the same mask: the logo
 * with its cream background removed. The splash draws the mosque as pen strokes
 * (splash-mosque-strokes.ts), then fades these layers in: the brush mosque, then each word.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const src = path.resolve(mobileRoot, '../../docs/branding/taybah-nabawi-logo.png');
const out = path.join(mobileRoot, 'assets/images/splash-layers');
const CANVAS = 1254;

/** [width, height, x, y] — overlapping bands avoid missing pixels between layers */
const LAYERS = [
  ['mosque.png', [CANVAS, 720, 0, 72]],
  ['arabic.png', [CANVAS, 290, 0, 790]],
  ['english.png', [CANVAS, 120, 0, 1075]],
];

function magick(...args) {
  execSync(['magick', ...args].map((a) => `"${a}"`).join(' '), { stdio: 'inherit', shell: true });
}

function pasteCrop(fullMask, [w, h, x, y], dest) {
  magick(
    '-size',
    `${CANVAS}x${CANVAS}`,
    'xc:none',
    '(',
    fullMask,
    '-crop',
    `${w}x${h}+${x}+${y}`,
    '+repage',
    ')',
    '-geometry',
    `+${x}+${y}`,
    '-composite',
    dest,
  );
}

if (!fs.existsSync(src)) {
  console.error('Missing', src);
  process.exit(1);
}

fs.mkdirSync(out, { recursive: true });

const nobg = path.join(out, '.nobg.tmp.png');
magick(src, '-fuzz', '6%', '-transparent', '#FBF8F1', '-transparent', '#F9F7F2', nobg);

for (const [file, crop] of LAYERS) {
  pasteCrop(nobg, crop, path.join(out, file));
}

fs.unlinkSync(nobg);

console.log('Splash logo layers written to', out);
