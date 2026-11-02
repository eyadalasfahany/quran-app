#!/usr/bin/env node
/**
 * Taybah brand PNGs for iOS, Android, website, and store listing.
 *
 * Source of truth: docs/branding/taybah-nabawi-logo.png
 * (identical to repo-root `image (93).png`). Never hand-edit outputs.
 *
 * Android launcher (Expo prebuild from one foreground PNG):
 *   - Adaptive foreground: 1024×1024; keep logo in center ~66% (432dp safe zone on 108dp canvas).
 *   - Legacy mipmaps: generated at 48dp baseline (mdpi 48px … xxxhdpi 192px).
 *
 * Android splash (withAndroidFullBleedSplash at prebuild):
 *   - Portrait buckets: 360×780 dp baseline × density (mdpi 1× … xxxhdpi 4×).
 *   - Landscape: 780×360 dp baseline × density.
 *   - Tablet sw600dp: uses tablet PNGs at nodpi (2048×2732 / 2732×2048 sources).
 *
 * iOS: icon 1024; full-screen splash posters (legacy imageset at prebuild).
 *
 * Google Play: feature graphic 1024×500 (docs/branding/app-store-assets/).
 * Website: taybah-logo, favicon-32, apple-touch-icon, feature graphic copy.
 * Repo root: logo.png (same bytes as the Nabawi source).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '../..');
const src = path.join(repoRoot, 'docs/branding/taybah-nabawi-logo.png');
const fallbackSrc = path.join(repoRoot, 'image (93).png');
const logoSrc = fs.existsSync(src) ? src : fallbackSrc;
const out = path.join(mobileRoot, 'assets/images');
const brand = path.join(repoRoot, 'docs/branding');
const websiteImages = path.join(repoRoot, 'website/assets/images');
const bg = '#F9F7F2';

function magick(...args) {
  execSync(['magick', ...args].map((a) => `"${a}"`).join(' '), {
    stdio: 'inherit',
    shell: true,
  });
}

if (!fs.existsSync(logoSrc)) {
  console.error('Missing logo source:', logoSrc);
  process.exit(1);
}

fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(brand, { recursive: true });
fs.mkdirSync(websiteImages, { recursive: true });

// Canonical copies (byte-identical to the Nabawi source).
function syncCopy(dest) {
  if (path.resolve(logoSrc) === path.resolve(dest)) {
    return;
  }
  fs.copyFileSync(logoSrc, dest);
}
syncCopy(path.join(brand, 'taybah-nabawi-logo.png'));
syncCopy(path.join(repoRoot, 'logo.png'));
syncCopy(path.join(websiteImages, 'taybah-logo.png'));
syncCopy(fallbackSrc);

// Shared store / iOS icon
magick(logoSrc, '-resize', '1024x1024', path.join(out, 'icon.png'));

// Android adaptive foreground — logo ~66% for circular mask
magick(
  '-size',
  '1024x1024',
  `xc:${bg}`,
  '(',
  logoSrc,
  '-resize',
  '672x672',
  ')',
  '-gravity',
  'center',
  '-composite',
  path.join(out, 'android-adaptive-foreground.png'),
);

magick(logoSrc, '-resize', '1024x1024', path.join(out, 'taybah-splash-logo.png'));

const posters = [
  ['taybah-vertical-splash-screen.png', 1440, 3120, 1420],
  ['taybah-landscape-splash-screen.png', 3120, 1440, 3000],
  ['taybah-tablet-portrait-splash-screen.png', 2048, 2732, 2000],
  ['taybah-tablet-landscape-splash-screen.png', 2732, 2048, 2680],
];

for (const [name, w, h, logoSize] of posters) {
  magick(
    '-size',
    `${w}x${h}`,
    `xc:${bg}`,
    '(',
    logoSrc,
    '-resize',
    `${logoSize}x${logoSize}`,
    ')',
    '-gravity',
    'center',
    '-composite',
    path.join(out, name),
  );
  fs.copyFileSync(path.join(out, name), path.join(brand, name));
}

magick(logoSrc, '-resize', '512x512', path.join(out, 'splash-icon.png'));

// Android notification small icon and themed-icon (Android 13+) monochrome layer: the same logo as a white
// silhouette on transparent (Android tints both; an opaque icon would show as a white square).
const logoBg = '#FBF8F1';
magick(
  logoSrc,
  '-fuzz',
  '8%',
  '-transparent',
  logoBg,
  '-fill',
  'white',
  '-colorize',
  '100',
  '-resize',
  '96x96',
  path.join(out, 'notification-icon.png'),
);
magick(
  '-size',
  '1024x1024',
  'xc:none',
  '(',
  logoSrc,
  '-fuzz',
  '8%',
  '-transparent',
  logoBg,
  '-fill',
  'white',
  '-colorize',
  '100',
  '-resize',
  '672x672',
  ')',
  '-gravity',
  'center',
  '-composite',
  path.join(out, 'android-adaptive-monochrome.png'),
);

const featureGraphic = path.join(brand, 'app-store-assets/taybah-google-play-feature-graphic.png');
fs.mkdirSync(path.dirname(featureGraphic), { recursive: true });
magick(
  '-size',
  '1024x500',
  `xc:${bg}`,
  '(',
  logoSrc,
  '-resize',
  'x440',
  ')',
  '-gravity',
  'center',
  '-composite',
  featureGraphic,
);
fs.copyFileSync(featureGraphic, path.join(websiteImages, 'google-play-feature-graphic.png'));

// Website favicons from the same mark.
magick(logoSrc, '-resize', '180x180', path.join(websiteImages, 'apple-touch-icon.png'));
magick(logoSrc, '-resize', '32x32', path.join(websiteImages, 'favicon-32.png'));

// Widget / watch extension icons (1024 PNG; @bacons/apple-targets `icon` in expo-target.config.js).
const extensionIconDir = path.join(mobileRoot, 'targets/_assets');
fs.mkdirSync(extensionIconDir, { recursive: true });
magick(logoSrc, '-resize', '1024x1024', path.join(extensionIconDir, 'widget-icon.png'));
magick(logoSrc, '-resize', '1024x1024', path.join(extensionIconDir, 'watch-icon.png'));

console.log('Brand assets written to', out);
console.log('Website images:', websiteImages);
console.log('Root logo.png synced from Nabawi source');
console.log('Widget/watch extension icons:', extensionIconDir);
console.log('Play feature graphic:', featureGraphic);
