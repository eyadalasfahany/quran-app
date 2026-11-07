# iOS precise seek for variable-bitrate MP3s

Status: **draft, not started** · Waits until the Way2Quran quality plan (`docs/plans/way2quran-quality.md`) reaches Q14 (developer, 7 Nov 2026) · Needs a store build.

## Problem

MP3Quran and Way2Quran files are variable bitrate (e.g. MP3Quran 62 surah 17: 128/160 kbps frames, Xing header; Abadh: ~140–180 kbps). After a seek (tap an ayah, resume, next or previous ayah, scrub), iOS lands slightly off. It estimates the position from the Xing table of contents, which has 100 points across the file (about one per 13 s in a 21-minute surah). The reported time is the requested time, so the word highlight is off by a little. Playing from the start of a surah is exact (developer check, Al-Isra, 7 Nov 2026). QF's Afasy is not affected.

The cause is in `expo-audio` 58.0.11:

- `ios/AudioUtils.swift:94` builds `AVURLAsset(url:options:)` without `AVURLAssetPreferPreciseDurationAndTimingKey`.
- `AudioPlaylist.seekTo(seconds)` seeks with infinite tolerance; our `player.ts` calls it without a tolerance (`seekPlaylist`).

## Options

### A. Patch `expo-audio`: precise timing plus exact seek (recommended)

Use `patch-package` (or the existing patch mechanism, if the repo has one) to set `AVURLAssetPreferPreciseDurationAndTimingKey: true` on the asset options, and seek with `toleranceBefore/After: .zero` on the playlist path.

- **Pros:**
  - It fixes the cause for every VBR file, current and future reciters, streamed and downloaded.
  - No content change, so no re-upload and no re-timing.
  - QF files are unchanged (CBR is exact either way).
- **Cons:**
  - It is a native change, so it needs a store build (fingerprint changes).
  - We carry a patch until Expo upstreams it (re-check on each SDK upgrade).
  - **Speed risk:** with precise timing, AVFoundation may read more of the file before the first seek on a **streamed** VBR file. The worst case is a large file such as Abadh's surah 2 at 130 MB. Exact-tolerance seeks can also take longer to complete than loose ones.

### B. Re-encode VBR files to CBR at ingest

- **Pros:**
  - It is exact with today's player.
  - No app build.
- **Cons:**
  - It breaks the copy-bytes-as-they-are rule (ADR 0061 decision 4, ADR 0074 decision 4).
  - Every MP3Quran and Way2Quran reciter must be re-uploaded and re-checked, because re-encoding shifts audio by tens of ms (encoder delay), so every timing must be re-verified.
  - Some quality loss (a second lossy encode).
  - Larger files at a fixed bitrate means slower downloads.

### C. Re-sync the position in JS after a seek

Seek, wait, read the reported position, compare.

- **Pros:**
  - No native change.
- **Cons:**
  - It can't work. The reported position is the wrong one, so JS has no truth to correct against. Rejected.

## Decision (proposed)

A, gated on speed. Nothing may get slower in a way a user notices:

- **Budgets (spec §12):** audio start < 1 s. Seek-to-sound must be no slower than today on CBR (QF) files, and within 150 ms of today on VBR files.
- **If precise timing is too slow on streamed large files:** enable it only for **downloaded** files (local `file://`, where reading is fast) and keep loose timing for streams. If that is still not exact enough, add exact-tolerance seeks only (without the precise-timing key) and measure again.

## Steps

1. **Measure today.** On the iPhone 17 simulator and one real iPhone, time cold-start-to-sound and seek-to-sound on:
   - QF Afasy surah 2,
   - MP3Quran 62 surah 17 (streamed and downloaded),
   - Way2Quran Abadh surah 2 (130 MB, streamed).

   Also record the highlight error after 10 seeks per file, against the Q0-style ASR check or by ear at known word starts.
2. **Patch.** Asset option plus exact playlist seek. Unit tests where the JS seek call passes its tolerance.
3. **Measure again** with the same table. Apply the fallback rule above if a budget is missed.
4. **Store build** (EAS, fingerprint changes), TestFlight check, then release. Record the result and the decision in an ADR.

## Done when

After seeks, the highlight on VBR reciters is as exact as Afasy, there is no measurable slowdown beyond the budgets, and QF playback is unchanged.
