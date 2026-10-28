# Step 1 — Audio data on the device

Follow [README.md](README.md). Needs Phase 2 steps 12–13 (catalogue, `installResource`).

**Goal:** the app can list reciters, find a surah's audio file and its timings, and install a reciter's pack on demand.

- `src/features/audio/data/` repositories over `content.db`:
  - `listReciters(db)`: from `catalog_resources` (group `chapter_recitations`) joined with installed recitation packs → `{ resourceId, name, nameAr, installed, hasTimings, hasWordSegments }`.
  - `chapterAudio(db, recitationId, chapterId)` → `{ url, durationMs, sizeBytes, format }` from `chapter_audio_files`.
  - `timingsFor(db, audioFileId)` → sorted `{ verseId, startMs, endMs, segments }[]` (≤ 286 rows), rejecting a file whose timings overlap or have `startMs ≥ endMs` (spec §12: fall back to no highlight).
- Default reciter (D2): the reader setting `reciterId` (MMKV, like `reader.settings`), defaulting to Afasy's resource when installed or in the catalogue.
- Installing a reciter: `installResource(resourceId)` from Phase 2 step 13.
- Tests: each repository on a fixture `content.db`; invalid timings rejected; default reciter fallback.
