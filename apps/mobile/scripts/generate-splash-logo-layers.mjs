#!/usr/bin/env node
/**
 * Slices docs/branding/taybah-nabawi-logo.png into PNG layers for the animated splash.
 * Each layer is pasted on a full 1254×1254 canvas (no seam gaps between bands).
 * Crop rects must match apps/mobile/src/shared/ui/splash-logo-raster-layers.ts
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

/** [width, height, x, y] — overlapping vertical bands avoid missing pixels between layers */
const LAYERS = [
  ['minaret-left.png', 'gold', [440, 610, 48, 52]],
  ['minaret-right.png', 'gold', [440, 610, 766, 52]],
  ['dome.png', 'green', [CANVAS, 600, 0, 52]],
  ['arabic.png', 'green', [CANVAS, 420, 0, 548]],
  ['english.png', 'green', [CANVAS, 340, 0, 868]],
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
const gold = path.join(out, '.gold.tmp.png');
const green = path.join(out, '.green.tmp.png');

magick(src, '-fuzz', '6%', '-transparent', '#F9F7F2', '-transparent', '#f9f7f2', nobg);

magick(
  nobg,
  '(',
  '-clone',
  '0',
  '-alpha',
  'off',
  '-fuzz',
  '24%',
  '-fill',
  'black',
  '-opaque',
  '#c9a961',
  '-fill',
  'black',
  '-opaque',
  '#C9A961',
  '-fill',
  'black',
  '-opaque',
  '#bc8e45',
  '-fill',
  'black',
  '-opaque',
  '#B58E4F',
  '+opaque',
  'white',
  '-negate',
  ')',
  '-alpha',
  'off',
  '-compose',
  'CopyOpacity',
  '-composite',
  gold,
);

magick(
  nobg,
  '(',
  '-clone',
  '0',
  '-alpha',
  'off',
  '-fuzz',
  '20%',
  '-fill',
  'black',
  '-opaque',
  '#1f4d40',
  '-fill',
  'black',
  '-opaque',
  '#1F4D40',
  '-fill',
  'black',
  '-opaque',
  '#1d5d44',
  '-fill',
  'black',
  '-opaque',
  '#1D5D44',
  '+opaque',
  'white',
  '-negate',
  ')',
  '-alpha',
  'off',
  '-compose',
  'CopyOpacity',
  '-composite',
  green,
);

for (const [file, maskKind, crop] of LAYERS) {
  pasteCrop(maskKind === 'gold' ? gold : green, crop, path.join(out, file));
}

fs.unlinkSync(nobg);
fs.unlinkSync(gold);
fs.unlinkSync(green);

console.log('Splash logo layers written to', out);
