#!/usr/bin/env node
/**
 * Taybah brand PNGs for iOS and Android.
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

fs.copyFileSync(logoSrc, path.join(brand, 'taybah-nabawi-logo.png'));
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

// Widget / watch extension icons (1024 PNG; @bacons/apple-targets `icon` in expo-target.config.js).
const extensionIconDir = path.join(mobileRoot, 'targets/_assets');
fs.mkdirSync(extensionIconDir, { recursive: true });
magick(logoSrc, '-resize', '1024x1024', path.join(extensionIconDir, 'widget-icon.png'));
magick(logoSrc, '-resize', '1024x1024', path.join(extensionIconDir, 'watch-icon.png'));

console.log('Brand assets written to', out);
console.log('Widget/watch extension icons:', extensionIconDir);
console.log('Play feature graphic:', featureGraphic);
