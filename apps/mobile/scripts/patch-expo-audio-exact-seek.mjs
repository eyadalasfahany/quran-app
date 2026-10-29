// Runs on postinstall. Makes expo-audio's AudioPlaylist seek exactly on iOS (developer, 29 Oct 2026).
//
// expo-audio 58's AudioPlaylist.seekTo calls `AVQueuePlayer.seek(to:)` with no tolerance, so iOS seeks
// approximately and, on streamed MP3, can land before the requested time. «تشغيل من هنا» then started in the
// tail of the previous ayah. AudioPlayer already takes tolerances; this gives the playlist zero tolerance.
// Android's ExoPlayer seeks exactly by default.
//
// Fails the install if expo-audio's source no longer matches, so an upgrade can't silently drop the fix.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const audioDir = dirname(require.resolve('expo-audio/package.json'));

const file = 'ios/AudioPlaylist.swift';
const from = `      ref.seek(to: time) { [weak self] _ in\n`;
const to = `      ref.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in\n`;

const path = join(audioDir, file);
let source;
try {
  source = readFileSync(path, 'utf8');
} catch {
  throw new Error(`patch-expo-audio-exact-seek: ${file} not found. Check whether this expo-audio release seeks the playlist exactly and update the script.`);
}

if (!source.includes(to)) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`patch-expo-audio-exact-seek: ${file} changed upstream (${count} matches). Check whether this expo-audio release seeks the playlist exactly and update the script.`);
  }
  writeFileSync(path, source.replace(from, to));
  console.log(`patch-expo-audio-exact-seek: patched ${file}`);
}
