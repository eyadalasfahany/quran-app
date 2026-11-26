# Madinah SVG mushaf (plan)

Status: accepted (developer, 12 Nov 2026); step 13 Part C next (see «Where things stand») · Branch: `main` (moved from the worktree branch `ft/madinah-svg-mushaf` on 15 Nov 2026, developer) · ADR: `docs/adr/0090-madinah-svg-mushaf.md` (proposed) · Spike scripts: `docs/plans/madinah-svg-mushaf/spike/` (throwaway; the method is described in the ADR)

## Where things stand (26 Nov 2026; read this first)

All of the below is committed on `main` (`03418c75`). A new session starts here, then reads the step file it works on.

**Done and committed (not yet released to production):**
- Steps 0–9b: import, word boxes (Hafs approved, digest `8944a6b3…`), packs, frames, Skia renderer, picker, other riwayat, reciter riwayah.
- Step 12: compact pages (TQP1, 1/32 grid, raw deflate; ADR 0090 amendments 24 and 26 Nov).
- Step 13 Parts 0, A and B: frames, the API word-contour map (`word-contours-hafs.json`, digest `b256ecd9669b7d0731d081d1862270f1d9af50a0ee01fb04e52e4aba16907e36`, status **pending_review**), and the device's zoom (re-wrap 100–200%, no sideways scroll).
- ADR 0090 amendment items 1–13. Item 13 (26 Nov): the selected riwayah's pack updates by itself in the background; an ayah tapped on a non-Hafs page opens only a reference and a note (frame `AyahSheetRiwayahUnavailable`) until the ayah map and per-riwayah marks exist.
- al-Duri is hidden in every picker and not published (`config/mushaf.php`, `publish => false`).

**Next: step 13 Part C** (`step-13-page-zoom.md`, «Part C»):
1. **C0, the developer's review sheet.** Run the device's `layoutPage` on the contour and box data and the decoded pages; draw the printed page beside the 200% re-wrap for at least 30 spread pages plus every page with a loose attachment (48), a sajda line (page 293), a 1:1 or W8 line, and the hizb ornaments (pages 472, 499, 517). Hand it over as a link. **The developer approves; never set `mushaf.approved_word_contours` yourself.**
2. After approval: set `approved_word_contours.hafs` to the digest, re-run `mushaf:build-word-boxes hafs` (the only step that sets the status to `approved`), then C1–C3 (sizes, decode speed on device, baseline).

**Production rules until then:**
- Do not run `mushaf:setup` or `mushaf:publish` in production. Locally the simulator uses a pack built with `mushaf:publish hafs --with-pending-contours` (refused in production).
- Release order after approval: `docs/runbooks/railway-release.md` (re-run `mushaf:import {key}` per riwayah after the compact-format deploy, then publish).
- The app side needs a store build (Skia came after 1.0.3): no `eas update` for this work.

**Environment:** the pipeline needs the local stack (PHP 8.5, MySQL, Node 26, the pinned quran-svg cache). The Claude Code cloud image has PHP 8.3, PostgreSQL and Node 22, so a cloud session would need a setup script and a full re-import before Part C0. Running it locally is the tested path.

**Later, waiting for the developer:**
- Step 14: word boxes (then zoom) for Warsh, Qalun and Shu'bah; al-Duri's numbering (a, b, c).
- Step 15 and ADR 0100 (draft): the riwayah's own text in Reading and Focus. Fonts answered (KFGQPC qira'at fonts, unmodified); D2–D12 open, among them the ayah map (D7) that would bring back play and tafsir from non-Hafs pages.
- ADR 0090 «Open questions» (zoom justification, no-pack fallback, pages 1–2 at zoom, copy).

**Known limits, not yet checked on a device:** a very fast fling can still show a skeleton for a moment (inflating a page costs about 40 ms in a Hermes dev build); the 200% page slices and the Warsh ayah sheet were checked on the iPhone simulator only, not the iPad; the background pack update is covered by tests, not yet watched on a device.

## Rests on

- Root `CLAUDE.md` non-negotiables #1 (text never altered), #2 (hosts), #3 (no QF data in the binary), #4 (offline-first), #5 (window class), #7 (i18n).
- `apps/mobile/CLAUDE.md` («Quran rendering rules», «Releasing»).
- ADRs 0011, 0023, 0037, 0039, 0048, 0049, 0068, 0069–0073, 0087.
- Spec §4, §5, §6, §7, §12, §14 and §16.
- Code read: `apps/mobile/src/features/reader/{HafsMushafList,word-follow,useWordFollow,recited-text,settings,settings-model}.ts(x)`, `components/HafsMushafPage.tsx`, `screens/ReaderSettingsSheet.tsx`, `features/onboarding/screens/OnboardingScriptScreen.tsx`, and the `word_layouts` table.

## Rules

- **Nothing ships until it is complete.** No riwayah ships before its import checks (A1–A3) pass. A4 was done by the developer (12 Nov 2026). Hafs also needs the word-box gate (W1–W6) to pass on all 604 pages. Until both hold, the current Mushaf stays.
- **Quran artwork is never edited.** The cached raw SVG stays byte for byte as downloaded, and word boxes are built from it. Recolouring the fill is a theme, not an edit. **Since the 24 Nov 2026 amendment** (ADR 0090), the pack's render geometry is baked and snapped to a 1/32 grid (below visibility, signed off by the developer in A4's redo); the drawn page is no longer «as received».
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

### 12. Compact pages (ADR 0090 amendments, 24 and 26 Nov 2026): brief `madinah-svg-mushaf/step-12-compact-pages.md`

- TQP1 baked geometry on a 1/32 grid, raw deflate (level 9), pack schema 2, no new package (LZMA was tried and dropped: 263 ms against 23 ms a page on Hermes).
- Parts: 0 checks (scope parity), A API, B device, C real sizes for all five riwayat (pages-only: Hafs 38.19 MB, Warsh 41.90, Qalun 43.55, Shu'bah 39.83, al-Duri 38.65), the timed 60 fps gate, the A4 re-sign-off sheet.
- **Exit:** Hafs pack at about 38 MB (stop above 40 MB), the gate passes, the developer re-signs A4.

### 13. Page zoom by re-wrapping the printed word shapes (ADR 0090 amendment, 26 Nov 2026, items 9 and 10): brief `madinah-svg-mushaf/step-13-page-zoom.md`

- Rewritten 26 Nov 2026 after the developer's «I don't want scroll X»: at 100% the exact printed page; up to 200% in 25% steps the page's own word shapes (each word = the contours the builder assigned to it) are laid out again in shorter lines on the same width. No sideways scroll, no font. Parts: A API (carry contour indexes through the builder, `contour_runs` table, W9 and W10, review sheet, its own approval), B device (layout, word paths, zoom setting, stepper, anchor), C measure and gate. **Implementation-ready; frames pre-approved.**
- **Model:** Haiku for the implementation; Opus for the review of Part A's builder change (digest `8944a6b3…` must not move).

### 14. Word boxes and contour maps for Warsh, Qalun, Shu'bah and al-Duri: plan `madinah-svg-mushaf/step-14-riwayah-word-boxes.md`

- The developer's choice (26 Nov 2026): the other riwayat get word boxes first; until approved, a riwayah stays at 100% with zoom unavailable. Source: quran-ws/quran-text at the pinned commit (per-word page and line). **Not implementation-ready:** al-Duri's numbering (artwork 6,218 against the text's 6,217) is the developer's call; publish order and review load are open.

### 15. The chosen riwayah's own text in Reading and Focus: plan `madinah-svg-mushaf/step-15-riwayah-reading-focus.md` and draft ADR 0100

- The developer's instruction (26 Nov 2026). Needs a font, orthography and licence decision first (Amiri Quran cannot render Warsh, Qalun or al-Duri). **Waiting for the developer.**

### 11. Release

- **Waits for steps 12 and 13.** Download sizes in the table above are superseded by the step 12 measurements. Step 12 adds no native change; the store build is needed for Skia (see the runbook).
- **Production:** the coordinator runs `mushaf:import` for each riwayah, then `mushaf:publish` (developer, 12 Nov 2026). Only after approval. Runbook entry in `docs/runbooks/`.

- Run the mobile and API gates.
- Compare the fingerprint with `npx eas-cli fingerprint:compare`: OTA if it matches, a store build if Skia came in.

## Open

None. Waiting for the developer to accept ADR 0090.
