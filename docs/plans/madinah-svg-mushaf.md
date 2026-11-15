# Madinah SVG mushaf (plan)

Status: accepted (developer, 12 Nov 2026), step 0 in progress · Branch: `main` (moved from the worktree branch `ft/madinah-svg-mushaf` on 15 Nov 2026, developer) · ADR: `docs/adr/0090-madinah-svg-mushaf.md` (proposed) · Spike scripts: `docs/plans/madinah-svg-mushaf/spike/` (throwaway; the method is described in the ADR)

## Rests on

- Root `CLAUDE.md` non-negotiables #1 (text never altered), #2 (hosts), #3 (no QF data in the binary), #4 (offline-first), #5 (window class), #7 (i18n).
- `apps/mobile/CLAUDE.md` («Quran rendering rules», «Releasing»).
- ADRs 0011, 0023, 0037, 0039, 0048, 0049, 0068, 0069–0073, 0087.
- Spec §4, §5, §6, §7, §12, §14 and §16.
- Code read: `apps/mobile/src/features/reader/{HafsMushafList,word-follow,useWordFollow,recited-text,settings,settings-model}.ts(x)`, `components/HafsMushafPage.tsx`, `screens/ReaderSettingsSheet.tsx`, `features/onboarding/screens/OnboardingScriptScreen.tsx`, and the `word_layouts` table.

## Rules

- **Nothing ships until it is complete.** No riwayah ships before its import checks (A1–A3) pass. A4 was done by the developer (12 Nov 2026). Hafs also needs the word-box gate (W1–W6) to pass on all 604 pages. Until both hold, the current Mushaf stays.
- **Quran artwork is never edited.** Recolouring the fill is a theme, not an edit: the paths are drawn as received.
- **`word_layouts` stays on the server.** Only the derived boxes reach devices, in packs.
- **No Quran text in fixtures, frames or reports.** Use keys, counts and coordinates only. Frames use placeholders, as Phase 7 does.
- **One step at a time.** Each step is small enough to review. Implementation goes to a Haiku subagent with a brief; the orchestrator reviews the result against this plan and the frames.

## Steps

### 0. Record the source

- Add a quran-svg row to `docs/content-plan.md`, covering:
  - version v1.1.1;
  - per-file SHA-256 from `docs/PROVENANCE.md` and the manifest;
  - the Complex's terms and the CC BY 4.0 polygon licence;
  - the «as is» warning.
- **Exit:** the content-plan row is written and the real sizes are known.
- **Done (12 Nov 2026):**
  - The content-plan row is written.
  - Pin v1.1.1, tag commit `3ff27b46cecb0c0519d77531d9c868a579d1f623` (main was at `b4155f07` on 12 Nov 2026). Step 2 puts the pin in the API config.
  - Real sizes for the 604 pages, from the GitHub tree:

    | Riwayah | brotli | raw |
    | --- | --- | --- |
    | Hafs | 63 MB | 373 MB |
    | Warsh | 73 MB | 346 MB |
    | Qalun | 78 MB | 308 MB |
    | Shu'bah | 69 MB | 311 MB |
    | al-Duri | 67 MB | 304 MB |

  - The repo also holds 118 split files per riwayah (`NNN-surahK`) for pages that hold two surahs. They are not needed, because the full page has both surahs.
  - The CDN's `manifest.json` and `latest.json` return 404. For A1, step 2 compares each file's git blob SHA with the tree at the pinned commit.

### 0b. Spec edits (right after acceptance): done (12 Nov 2026)

- Edit spec §4, §5/§6 (the new tables), §12, §14 and §16 to match ADR 0090, in the same change as the acceptance (root `CLAUDE.md`).
- Step 10 keeps only the edits that remove the old code.

### 1. Device spike: rendering speed (go/no-go)

- Throwaway screen, not committed. Render Hafs pages 3, 50 and 300 with `react-native-svg` on:
  - the iPhone 17 simulator;
  - the Android emulator with a low-end profile.
- Measure:
  - first render time per page;
  - scroll fps over 20 pages;
  - memory;
  - recolouring to the dark theme;
  - decompressing one page as it scrolls in (pages stay compressed on the device: Hafs is 373 MB raw).
- **Exit:**
  - 60 fps and under 100 ms first render means go with `react-native-svg`.
  - Otherwise, a short ADR note picks Skia, which means a store build and a content-plan row.
- **Model:** stronger model (Opus).
- **Done on iOS (12 Nov 2026):** Skia passes at 60 fps (longest frame 17–24 ms), while `react-native-svg` fails (about 50 fps, with 222–312 ms stalls). Skia is chosen (ADR 0090 decision 8). The Android emulator run is dropped: the developer said device checks use the iOS simulator only (12 Nov 2026). The throwaway screen `app/dev-svg-spike.tsx` and `assets/dev-spike/` were deleted on 15 Nov 2026.

### 2. API: tables and import

Add three tables (spec §5 and §7, written in step 0b). The names carry an `svg_` prefix, because the QF mirror already has `mushafs` and `mushaf_pages`:

| Table | Columns |
| --- | --- |
| `svg_mushafs` | key, riwayah, edition year, source version, page count |
| `svg_mushaf_pages` | edition, page, svg path, sha256, bytes |
| `svg_mushaf_ayah_regions` | edition, page, surah, ayah, polygon |

- An artisan command, `mushaf:import {edition}`:
  1. downloads the pinned files to the source cache volume (ADR 0068);
  2. checks the SHA-256 (A1);
  3. fills the tables;
  4. runs A2.
- **Tests:** Pest with a small fixture page. The fixture's coordinates are placeholders, and it holds no Quran artwork.

### 3. API: Hafs word boxes and gate

- **Table:** `svg_mushaf_word_boxes` (edition, page, line, surah, ayah, word position, x0, y0, x1, y1).
- **Command:** `mushaf:build-word-boxes hafs` ports the spike's method:
  1. path-order contours per line;
  2. per-line counts from `word_layouts`;
  3. the dynamic-program split;
  4. small marks attached to their word.
- **Gate:** checks W1–W6 run in the same command. They write a report: counts, flagged lines, and an HTML review sheet with an overlay per flagged line.
- **Tests:**
  - parser and split unit tests on synthetic paths;
  - one gate test per check.
- **Exit:**
  - the run is clean on all 604 pages;
  - the developer signs off the review sheet;
  - W7: the developer reviews at least 30 random whole pages that nothing flagged, and finds zero word errors.
- **Model:** stronger model (Opus).

### 4. Artwork check (A4): done

- **Done.** The developer verified the artwork (12 Nov 2026).
- A1–A3 run inside step 2 on every import.

### 5. Packs and contract

- **New resource group:** `svg_mushafs`, one resource per riwayah.
- **A dedicated writer** builds a SQLite file holding:
  - `pages` (page INTEGER PRIMARY KEY, svgz BLOB, the stored `.svg.gz` bytes);
  - `regions`;
  - `word_boxes`, Hafs only, and only when its status is `approved`.
- **The file is served as is,** with no outer gzip, because the blobs are already compressed.
- **On the device,** content sync downloads it to `documentDirectory/packs/svg-mushaf-{key}-{version}.db`, checks its SHA-256 and opens it read-only. It is never attached to `content.db`. The old version is deleted after the switch.

- Build one mushaf pack per edition:
  - pages;
  - polygons;
  - word boxes, for Hafs only.
- Add the packs to the manifest and serve them like the other packs.
- Run `npm run generate -w @quran/api-contract` and commit `openapi.json` and `schema.d.ts`.

### 6. Frames (ADR 0087)

Draw or redraw these frames:

- `Mushaf`: the printed page and its highlight layers, with the artwork's surah title unframed. Pages scroll vertically, as they do today.
- `ReaderSettings`: the mushaf picker replaces the font picker.
- The onboarding script frame becomes the mushaf picker, where the reader picks a mushaf on first install.
- `LoadingMushaf`: the download progress.

Each new caption carried «(بانتظار الموافقة)» until approval. **Approved by the developer, 12 Nov 2026** («ok for frames»). The ReaderSettings sheet is drawn at its large detent so the five cards fit, and «حجم خط المصحف» stays: it sets the Quran text size for Reading and Focus, while Mushaf pages always fit the width.

### 7. App: page and list

Components, each with a colocated test:

- `MushafSvgPage`: the artwork, the polygon layers and the word box.
- `MushafSvgList`: FlashList, keeping today's anchor and exact-place rules (ADR 0073).

Behaviour:

- Ayah hit-test opens the options (ADR 0072).
- Word follow reads the boxes for the active word position. It reuses `useWordFollow`'s comfort band, with lines taken from the boxes.
- Dark mode works through the fill token.
- Accessibility labels are as decided in ADR 0090 §10.

### 8. App: settings and picker

- `settings-model`: add `mushaf` and drop `quranFont`, with a test for the migration.
- `ReaderSettingsSheet`, Settings › Reading and `OnboardingScriptScreen` list the five editions.
- Remove Scheherazade New: its registry entry, asset and i18n keys.

### 9. App: other riwayat

- Edition switch.
- Per-edition pack download.
- Marks kept per riwayah (ADR 0090 decision 4): colours, bookmarks, notes and the reading place. This is the `user.db` schema change and migration (spec §6), with sync-safe keys.
- Ayah labels for screen readers: surah name and number (decision 10).
- Tafsir, audio and the shared current ayah stay Hafs-only.
- Reading and Focus switch to Hafs automatically while a non-Hafs mushaf is chosen (ADR 0090 «Decided» 5). The place carries over by surah and ayah number, or falls back to the surah start.
- **Model:** stronger model (Opus) for the schema and migration brief.

### 9b. Audio follows the reciter's riwayah (ADR 0090 decision 12)

- Add `riwayah` to the reciter data:
  - QF reciters are Hafs;
  - MP3Quran and Way2Quran recordings take it from their source.
- Show the riwayah in the reciters list.
- While a recitation plays in Mushaf mode, show and follow that reciter's riwayah. Today that is always Hafs.
- When playback stops, return to the chosen mushaf.
- **Later, under its own ADR (not in this plan):** non-Hafs reciters. They need a text source, timings and word boxes for each riwayah.

### 10. Cleanup and docs

- Remove the old Mushaf code:
  - `HafsMushafList` and `HafsMushafPage`;
  - the per-font Mushaf alignment;
  - the QCF path.
- Remove what is left of the old Mushaf from the spec.
- Reword «يفتح المصحف فورًا دون إنترنت» on the website.
- Fix the copy in `website/features.html` and add credits to `website/sources.html`.
- Add the Sources credit and i18n strings in the app: the King Fahd Complex for the pages, noting they were checked against the printed mushaf, and quran.ws for the polygons. The developer confirms the copy.

### 11. Release

- **Production:** the coordinator runs `mushaf:import` for each riwayah, then `mushaf:publish` (developer, 12 Nov 2026). Only after approval. Runbook entry in `docs/runbooks/`.

- Run the mobile and API gates.
- Compare the fingerprint with `npx eas-cli fingerprint:compare`: OTA if it matches, a store build if Skia came in.

## Open

None. Waiting for the developer to accept ADR 0090.
