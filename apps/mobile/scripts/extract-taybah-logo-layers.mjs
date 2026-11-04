#!/usr/bin/env node
/**
 * Traces taybah-nabawi-logo.png into SVG paths for the animated launch splash.
 * Requires one-off: npm install potrace jimp svg-path-properties (not a workspace dependency).
 *
 * Usage (from apps/mobile):
 *   npx potrace jimp svg-path-properties  # if not installed globally
 *   node scripts/extract-taybah-logo-layers.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// One-off script: install with `npm i --no-save potrace svg-path-properties` before running it.
// eslint-disable-next-line import/no-unresolved
import potrace from 'potrace';
// One-off script: install with `npm i --no-save potrace svg-path-properties` before running it.
// eslint-disable-next-line import/no-unresolved
import { svgPathProperties } from 'svg-path-properties';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const logo = path.resolve(mobileRoot, '../../docs/branding/taybah-nabawi-logo.png');
const outFile = path.join(mobileRoot, 'src/shared/ui/taybah-logo-layers.ts');
const tmp = fs.mkdtempSync(path.join(mobileRoot, '.tmp-logo-'));

function magick(...args) {
  execSync(['magick', ...args].map((a) => `"${a}"`).join(' '), { stdio: 'inherit', shell: true });
}

function tracePng(pngPath) {
  return new Promise((resolve, reject) => {
    potrace.trace(
      pngPath,
      { threshold: 128, turdSize: 15, optTolerance: 0.35, background: 'transparent' },
      (err, svg) => {
        if (err) {
          reject(err);
          return;
        }
        const match = svg.match(/ d="([^"]+)"/);
        resolve(match ? match[1] : '');
      },
    );
  });
}

function pathLength(d) {
  return Math.round(new svgPathProperties(d).getTotalLength());
}

const nobg = path.join(tmp, 'nobg.png');
magick(logo, '-fuzz', '8%', '-fill', 'white', '-opaque', '#F9F7F2', nobg);

const goldMask = path.join(tmp, 'gold.png');
const greenMask = path.join(tmp, 'green.png');
magick(nobg, '-alpha', 'off', '-fuzz', '12%', '-fill', 'black', '-opaque', '#c9a961', '-fill', 'white', '+opaque', 'black', goldMask);
magick(nobg, '-alpha', 'off', '-fuzz', '12%', '-fill', 'black', '-opaque', '#1F4D40', '-fill', 'white', '+opaque', 'black', greenMask);

const crops = [
  ['minaretLeft', goldMask, '350x900+150+180', 150, 180, 0, 0.32],
  ['minaretRight', goldMask, '350x900+754+180', 754, 180, 0.12, 0.38],
  ['dome', greenMask, '1254x520+0+0', 0, 0, 0.28, 0.58],
  ['wordmark', greenMask, '1254x734+0+520', 0, 520, 0.52, 1],
];

async function main() {
const layers = [];
for (const [id, src, crop, tx, ty, t0, t1] of crops) {
  const cropped = path.join(tmp, `${id}.png`);
  magick(src, '-crop', crop, '+repage', cropped);
  const d = await tracePng(cropped);
  layers.push({ id, d, length: pathLength(d), translate: [tx, ty], segment: [t0, t1] });
  console.log(id, pathLength(d));
}

const body = JSON.stringify(layers, null, 2);
const source = `// Generated from docs/branding/taybah-nabawi-logo.png — run scripts/extract-taybah-logo-layers.mjs to refresh.
// Do not edit by hand.

export const TAYBAH_LOGO_VIEWBOX = 1254 as const;

export type TaybahLogoLayer = {
  id: string;
  d: string;
  length: number;
  translate: readonly [number, number];
  /** Inclusive draw window on the global 0→1 splash progress. */
  segment: readonly [number, number];
};

export const taybahLogoLayers = ${body} as const satisfies readonly TaybahLogoLayer[];
`;

fs.writeFileSync(outFile, source);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Wrote', outFile);
}

void main();
