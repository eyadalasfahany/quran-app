# 0090 — The Madinah mushaf pages from quran-svg replace the flowed Mushaf; a mushaf picker replaces the font picker

Date: 2026-11-12 (renumbered from 0088 on 15 Nov 2026, after `main` took 0088 and 0089) · Status: **accepted** (developer, 12 Nov 2026: "accepted") · Supersedes ADR 0048 decisions 1, 2 (Scheherazade New), 4–6, 10 (Mushaf part) and 11. Retires the unused QCF page path of ADR 0011. Amends spec §4 («Mushaf page sizing»), §5/§6 (new mushaf tables), §12 («Mushaf rendering»), §14 and §16, and `docs/content-plan.md` (a new source row). Plan: `docs/plans/madinah-svg-mushaf.md`. Amended 15 Nov 2026 (large text, no frame), 24 Nov 2026 (compact page format) and 26 Nov 2026 (items 1 to 11 of the last amendment, among them: zoom re-wraps the printed word shapes with no sideways scroll, word boxes first for the other riwayat, and a pointer to draft ADR 0100 on Reading and Focus text).

## Context

Mushaf mode today is Tanzil text flowed in the chosen Quran font (ADR 0048). A page holds the same ayahs as the printed page, but its line breaks depend on the font, so it is not the printed page. The website's features page says «سطرًا سطرًا كما طُبع», which is not true today.

The developer wants the printed Madinah pages, with the recited word followed on them, and a mushaf choice in place of the font choice (12 Nov 2026).

**The source: quran-ws/quran-svg, v1.1.1** (read 12 Nov 2026; `https://github.com/quran-ws/quran-svg`, CDN `https://cdn.quran.ws/svg/pages/v1.1.1/`):

- **Artwork.** One SVG per page, traced from the King Fahd Glorious Qur'an Printing Complex's «Digital Mushaf master files» (Illustrator, one `.ai` per page): Hafs 1441H, Warsh 1442H, Qalun, Shu'bah and al-Duri 1443H. The decorative frame, running header and printed page number are dropped. The surah title calligraphy and the basmala are in the artwork (seen on Hafs page 50).
- **Format.** `viewBox 0 0 345 550`. A page's text is one compound path (Hafs page 3: 1,354 contours) filled `#231f20`. Ayah-end ornaments are a separate group. Each page has a JSON file of ayah polygons in page coordinates (one rectangle per line, or one rectangle over several full lines). There is **no word-level data**.
- **Size.** About 600 KB per page raw, 145 KB gzip, 100 KB brotli (4 Hafs pages measured). Hafs is roughly 60 MB brotli; the estimate comes from 4 pages, because the CDN's `manifest.json` returned an HTML page.
- **Terms.**
  - The repository licenses its polygons and metadata under CC BY 4.0, with attribution waived inside a product, and its tools under MIT.
  - The artwork is not under those licences. Its terms are the Complex's statement, reproduced in the repository's `LICENSE` and `NOTICE.md`. The Complex's free digital copy may be used free of charge for personal, business, government and institutional work, print, digital publishing, media, websites and software, inside and outside Saudi Arabia. Printing mushafs for commercial sale is reserved to the Complex. The statement is silent on recolouring and on hosting copies.
  - quran.ws gives the material «as is», with no warranty, and asks publishers to verify the text against an authorised printed mushaf.
  - A Libyan Qalun edition (non-commercial only) is named in `NOTICE.md` but is not in the repository.

**The word data we already have.** The local `word_layouts` table (mushaf 1, «QCF V2», described by its source as the King Fahd Complex Mushaf 1441H print) holds 83,665 rows over 604 pages × 15 lines: each word's page, line and position in the line. The app's recited-word index is the Tanzil Uthmani letter tokens counted 1-based, which equals QF's word positions (`apps/mobile/src/features/reader/recited-text.ts`).

**Spike (12 Nov 2026, scratchpad only; Hafs pages 3, 50, 300 and 604).**

1. Splitting at the widest gaps between contours, with Tanzil's word count per ayah, put most boxes right. But every page had merged words, split words and slivers, because the Madinah calligraphy overlaps neighbouring words and leaves gaps inside words.
2. The SVG's text lines matched `word_layouts`' lines on every sample page: 15/15, 13/13, 15/15 and 9/9. With exact per-line word counts, every line could be separated.
3. **A line's contours are contiguous in the path, and in path order they cluster by word.** Each line's contours, in path order, were split into the line's known number of groups by a dynamic program that minimises the groups' summed width.
   - **Page 300, the only overlay examined closely:** most words were right, including the merges and splits that step 1 got wrong.
   - **The slivers that remain mean merges elsewhere.** Some small marks still came out as a «word» of their own. The count per line is fixed, so every such sliver means two real words on the same line were merged.
   - **Pages 3, 50 and 300:** the run reported 16, 12 and 13 overlapping box pairs. These were not examined.
   - The method is promising. It is not proven.
4. Not measured yet: all 604 pages, the other four riwayat, and rendering speed on a device.

The spike scripts are kept in `docs/plans/madinah-svg-mushaf/spike/` for step 3 to port. They contain no Quran text, and none of the downloaded pages or layout data is committed.

## Decisions

1. **Mushaf mode renders the quran-svg pages** (developer, 12 Nov 2026). The flowed Tanzil Mushaf (`HafsMushafList`, `HafsMushafPage`) is removed once the new view ships, and so is the unused QCF path of ADR 0011 (`MushafList`, `MushafListPage`, `useMushafPageFont`, the `qcfV2` cache). Reading and Focus modes keep the Tanzil text.

2. **A mushaf picker replaces the font picker. It lists all five riwayat now** (developer, 12 Nov 2026):

   | Key | Arabic | Edition |
   | --- | --- | --- |
   | `hafs` | حفص عن عاصم | 1441H |
   | `warsh` | ورش عن نافع | 1442H |
   | `qalun` | قالون عن نافع | 1443H |
   | `shubah` | شعبة عن عاصم | 1443H |
   | `duri` | الدوري عن أبي عمرو | 1443H |

   - **The reader picks a mushaf on first install** (developer, 12 Nov 2026), on the onboarding screen that today picks the font. It can be changed later in the reader settings sheet and Settings › Reading.
   - Hafs is the default selection. The choice is stored as `mushaf` in the `reader.settings` MMKV JSON. A missing or unknown value reads `hafs`. The old `quranFont` value is ignored.
   - The picker is the same `radiogroup` of `OnboardingRadioCard`s. It sits in the reader settings sheet, in Settings › Reading, and on the onboarding screen that today picks the font.

3. **Amiri Quran is the only Quran font** (developer, 12 Nov 2026). It is used for Reading, Focus, and every other place that shows Quran text. Scheherazade New and its picker are removed. Its file is loaded at runtime, not by a config plugin, so removing it is not a native change.

4. **Hafs ships only with word by word** (developer, 12 Nov 2026), and only after the word-box gate (decision 6) and the artwork check (decision 7) pass on all 604 pages. Until then the current Mushaf stays.
   - The other four riwayat ship with Hafs. No reciters of those riwayat exist in the app, so they have no audio and no follow.
   - The developer accepted the cost of supporting them fully (12 Nov 2026). Colours, bookmarks, notes and the reading place are kept per riwayah: a `user.db` schema change, a migration and a spec §6 edit, in plan step 9.

5. **Word boxes are built by the API, not on the device.**
   - An artisan command reads the pinned quran-svg files (checked against their git blob SHA-1 and size, decision 7) and `word_layouts`.
   - It writes word boxes for Hafs: page, line, ayah, word position and rectangle in page coordinates.
   - Algorithm:
     1. Take each line's contours in path order.
     2. Split them into the line's known word count by the dynamic program of the spike.
     3. Attach small marks to the neighbouring word.
   - The boxes go into the Hafs mushaf pack. `word_layouts` itself never reaches the device; only the derived boxes do, through a pack (non-negotiable 3).

6. **Word-box gate.** Hafs is released only if every check passes on all 604 pages. A failure holds the whole Hafs mushaf back (the developer's "nothing less" rule):
   - **W1.** Every page's SVG text line count equals its `word_layouts` line count.
   - **W2.** Every word group holds at least one full-height contour, and its centre lies inside its own ayah's span on that line. The span comes from the ayah polygons, which the split never sees as an answer key, only as a constraint.
   - **W3.** Every line's path runs left to right: its first group lies left of its last. Overlapping boxes are not an error, because Madinah calligraphy overlaps neighbouring words.
   - **W4 (flag).** A box narrower than a calibrated minimum goes to the review sheet.
   - **W5 (flag).** A box whose width is implausible for its word's letter count (from the Tanzil token) goes to the review sheet.
   - **W6.** Each page's ayah set equals the `word_layouts` ayah set for that page. Both are the 1441H print. (Amended 12 Nov 2026: the first version compared with Tanzil's `quran-data` page table. That table is an older print and differs on 36 pages, for example 5:77 and 55:17–18, while the artwork and `word_layouts` agree on all 604 pages.)
   - **Consequence for the app.** The Mushaf takes its page↔ayah mapping from the pack's own regions, never from the `page` column, because the two differ on those 36 pages. Bookmarks and the reading place in Mushaf mode use the pack's pages.

   W1, W2, W3, W6 and W7 must pass outright. W4 and W5 only send lines to review.

   The words of a line are ordered by (verse, position in verse), not by `word_layouts.position_in_line`. The local copy of that column is wrong for some words: on page 604, line 7, the first word of 113:1 sits at position 6.

   **First full run (12 Nov 2026, step 3): failed, as the gate intends.**
   - W1 failed on 48 pages:
     - 35 of them sit around 18 surah starts, where `word_layouts` puts the surah title at the foot of page N and the artwork puts it at the top of N+1. So `word_layouts` is not the artwork's line layout there.
     - On the other 13, the estimated line height was wrong.
   - W3 failed on 95 lines: four pages run right to left, and on 36 lines a stray contour comes first.
   - W7 found an unflagged split and merge on a sampled page (183, line 1).
   - The method is being revised (plan step 3, v8). Per-line counts from `word_layouts` become a cross-check only. Words are counted per ayah from the app's own word positions, the line height is global, run order is normalised, and a letter-width prior is added.

   **Second source (12 Nov 2026): quran-text replaces `word_layouts`.** [quran-ws/quran-text](https://github.com/quran-ws/quran-text) is pinned at `7bdefdea`. It comes from the same publisher as quran-svg, and its per-word page and line data is built from KFGQPC's own 2026 packages.
   - **Hafs.** Its lines match the artwork on all 604 pages, including the 36 surah-start pages, where `word_layouts` is wrong. Of the 222 lines where the two count differently, quran-text is the one that matches the artwork.
   - **Warsh, Qalun, Shu'bah and al-Duri.** Its lines match the SVG pages everywhere except page 1 of Warsh, Qalun and al-Duri. There the basmala sits on its own line without a region, which is expected.
   - **Numbering.** It equals the app's word numbering everywhere except 15:7, where it prints the app's words 1 and 2 as one word.
   - **QF is gone from the word boxes.** The boxes now derive only from quran-svg and quran-text, and are committed as `apps/api/resources/svg-mushaf/word-boxes-hafs.json`, which credits quran-ws: «derived … (CC BY 4.0), modified». The server needs neither Tanzil nor `word_layouts` to build packs.
   - **Licence.** CC BY 4.0, with attribution waived inside a product; republishing the data needs the credit. The text itself is used under the Complex's terms. The data is marked «Beta», and lines are «reconstructed», so the gate still applies.
   - **Method v7r.** v7 with a global line height and normalised run order, now using quran-text's line counts: W1 0 pages, W2 162 words.
   - **Path-order limit.** Where neighbouring words' contours interleave in the path (183:1), no contiguous split exists. **W8 (flag)** marks nested or non-contiguous groups, and a reviewed corrections file, `word-box-overrides-hafs.json`, holds the explicit contour groups for lines that need them.

   **Port (12 Nov 2026, real run).**
   - W1, W3 and W6: 0 failures. W2: 14 words. W8: 207 lines flagged.
   - 77,433 boxes, keyed by the app's word positions. For 15:7, the app's words 1 and 2 share the printed word's box.
   - `base_height_share` is 0.25. At 0.30, 96 real short words had no full-height contour (ratios 0.25–0.30).
   - W4 and W5 were recalibrated (`min_width` 6.0, ratio 0.17–3.3), and W5's letter counts come from quran-text's `rasm_imlai` length, read as a count only.
   - **Status stays `failed`** until the 14 W2 lines have reviewed overrides, the W8 lines are checked, and the developer signs off the sheet (W7).

   **Correction pass (15 Nov 2026).**
   - **Result:**
     - status `pending_review`, digest `8944a6b3…`;
     - W1, W2, W3 and W6 are 0;
     - W8 is 6 (flags only): 5 lines fixed by their override, and 1:1;
     - 214 lines reviewed: 212 corrected, 1 correct as built, 1 left to the developer (1:1).
   - **The overrides file gains three entry kinds:**
     - `loose`: contours that belong to no word, such as a mark from a neighbouring line or the hizb ornament. Groups and loose together must cover every contour of the line exactly once.
     - `needs_developer`: `"page:line"` → note. A key can't also be overridden.
     - `word_lines`: `"surah:ayah:position"` → `page`, `from`, `to` and a reason. It moves a word that quran-text puts on the wrong line of the artwork (74:53:3, page 577, line 3 → 4). If the word is not on `page:from`, the build fails, so a new quran-text pin can't apply the correction to the wrong word.
   - **Short words:** an applied override is exempt from W2's «no full-height contour» reason, because 58 reviewed words have no tall letter. Both ayah-span W2 checks still apply to overrides.

   **Spike measure after these rules (12 Nov 2026):** on pages 3, 50, 300 and 604, 2 of 452 words broke W2, both on page 3. Page 300 was word-for-word correct by eye.

   - The tolerances are calibrated on the sample pages and recorded with the run.
   - Lines flagged by W3–W5 go into a visual review sheet (an HTML overlay like the spike's), and the developer signs off the sheet.
   - **W7. Unflagged pages.** W1–W6 check the boxes only against each other, so a sliver beside a merge can pass them. The developer also reviews a random sample of whole pages that nothing flagged (at least 30, spread across the mushaf), and zero word errors are allowed. One error fails the run.

7. **Artwork check before any riwayah ships.**
   - **A1.** Each file's size and git blob SHA-1 match the pinned manifest `apps/api/resources/svg-mushaf/quran-svg-v1.1.1.json`, which was generated from the GitHub tree at the tag commit. The CDN's own manifest returns 404.
   - **A2.** Each riwayah's ayah polygon count equals its ayah count: 6,236 for Hafs, with the others taken from their own numbering.
   - **A3. Hafs:** W1 and W6.
   - **A4.** The developer has verified the artwork against an authorised source (12 Nov 2026). The Sources credit says the pages are verified (decision 11).

   A1–A3 still run on every import, so a changed or corrupted file is caught.

8. **Rendering.**
   - The page's text path and the ayah-end ornaments, including the ayah numbers, are drawn with **Skia** (`@shopify/react-native-skia` 2.14.0; chosen by the step 1 result below). They are filled from the theme's `ink` token, so the page follows light and dark mode. The first version of this decision named `react-native-svg`, which failed step 1.
   - Layers under the text, from the bottom:
     1. reader colours and the saved green (ADR 0070, 0073), as ayah polygons;
     2. the recited ayah's wash;
     3. the recited word's box.
   - Taps hit-test the ayah polygons and open the options (ADR 0072).
   - Page width stays `min(window − gutters, 600)`, with the height from the 345 × 550 box.
   - If plan step 1 shows that `react-native-svg` cannot hold 60 fps, the fallback is `@shopify/react-native-skia`. That is a new native package, so the release becomes a store build, and it needs its own content-plan version row.
   - **Step 1 result (12 Nov 2026, iPhone 17 Pro simulator, dev build, Hafs pages 3, 50 and 300, a 20-page animated scroll):**
     - `react-native-svg` held about 50 fps, with stalls of 222–312 ms whenever a page first drew. It fails the 60 fps target.
     - **Skia holds 60.2–60.3 fps, with a longest frame of 16.7–23.9 ms.** Each page's paths go through `PathBuilder.addPath(path, matrix)` into one path, recorded into an `SkPicture` (about 4 ms per page warm, 15 ms the first time) and drawn by `<Picture>` scaled to the page width. Changing the theme re-records the picture with the new fill.
     - Inflating a page (`fflate` gunzip) took about 62 ms in the dev build. It is done once per page and cached.
     - **Decision: Skia renders the pages.** `@shopify/react-native-skia` 2.14.0 is the SDK 58 pin. The release that ships the new Mushaf is therefore a store build.

9. **Delivery.**
   - Each riwayah is one mushaf pack (pages, ayah polygons, and word boxes for Hafs), built and served by the API like the other packs.
   - **On the device the pack stays its own SQLite file,** kept as downloaded and never copied into `content.db`. This was decided by the coordinator on 12 Nov 2026, because pack columns are only integer or text, and copying would store each page raw or as base64. In the file:
     - each page is a gzip BLOB, inflated per page with `fflate`, which is already a dependency;
     - regions and word boxes are plain tables.
   - **Download size.** Hafs is about 88 MB of gzip-compressed pages. The 63 MB brotli figure is not reachable, because the API's PHP has no brotli. The real size is recorded at step 5.
   - Nothing is added to the binary, and no new host is added (non-negotiable 2 unchanged).
   - The Hafs pack downloads when the Mushaf is first opened, with progress shown (the `LoadingMushaf` frame). Reading and Focus work offline before the download.

10. **Accessibility.** Each ayah polygon is an accessible element.
    - In Hafs its label is the ayah's Imla'i text plus its number, as today.
    - The other riwayat have no text source, so their label is the surah name and ayah number. This is an approved difference from the `apps/mobile/CLAUDE.md` labelling rule (developer, 12 Nov 2026, accepting the costs in «Decided» 1).

11. **Credit.** Settings › Sources and `website/sources.html` credit:
    - the King Fahd Complex for the page artwork, noting that the pages were checked against the printed mushaf (developer, 12 Nov 2026);
    - quran.ws for the ayah polygons.

    The credit carries no permission wording. The exact Arabic and English copy is confirmed by the developer in plan step 10.

12. **The reciter's riwayah decides the mushaf shown while audio follows** (developer, 12 Nov 2026). A Hafs reciter is followed on Hafs pages and a Warsh reciter on Warsh pages, and the same for each riwayah.
    - **Today every reciter in the app is Hafs.** So while a recitation plays in Mushaf mode, the Hafs pages are shown and followed, even when the reader chose another mushaf.
    - **When playback stops**, the view returns to the chosen mushaf. The place carries over as in «Decided» 5. (This is the coordinator's call; the developer may change it.)
    - **Each reciter records its riwayah:** QF reciters are Hafs, and MP3Quran and Way2Quran recordings carry theirs from their source. The reciters list shows the riwayah.
    - **Non-Hafs reciters come later, under their own ADR.** Each riwayah needs:
      - a word-level text source with a clear licence, because Tanzil is Hafs only;
      - timings made against that text by the recitation pipeline (ADR 0060, 0077);
      - word boxes on that riwayah's pages, which need per-line word counts for its print (`word_layouts` covers Hafs only).

## Decided (developer, 12 Nov 2026)

1. **The other four riwayat:** the developer accepted their cost.
   - The reader picks a mushaf on first install.
   - Marks are kept per riwayah (decision 4).
   - Non-Hafs ayahs are labelled by surah name and number (decision 10).
   - Tafsir, audio and the shared current ayah stay Hafs-only.
2. **Artwork:** the developer has verified it. The Sources credit says so (decisions 7 and 11).
3. **Surah titles:** the artwork's title stands alone, with no cartouche band.
4. **Page movement:** pages keep today's vertical scroll.

5. **Reading and Focus while a non-Hafs mushaf is chosen:** those modes switch to Hafs automatically. They show the Tanzil Hafs text with Hafs numbering, while the Mushaf mode keeps the chosen riwayah.
   - **Carrying the place across** (proposed, not yet confirmed by the developer): moving from a non-Hafs page to Reading lands on the same surah and ayah number when that ayah exists in Hafs, and otherwise on the start of the surah. Ayah numbering differs between riwayat, so an exact place needs an ayah map between them. That map waits until a source with a clear licence is found.

## Consequences

- The Mushaf matches the printed Madinah page line for line. The features page's claim becomes true, and its copy changes with this ADR.
- **Downloads.** Real sizes for the 604 pages, read from the repository tree on 12 Nov 2026: Hafs 63 MB brotli (373 MB raw), Warsh 73 (346), Qalun 78 (308), Shu'bah 69 (311), al-Duri 67 (304). Each riwayah is its own download.
- **Pages stay compressed on the device.** Stored raw, Hafs alone would take about 373 MB. Plan step 1 measures the cost of decompressing a page as it scrolls in.
- **Pack traffic.** Packs are served by the API for now, so a full Hafs download is about 63 MB from Railway per reader. Moving packs to R2 stays deferred (plan D16 of Phase 7) unless that traffic becomes a problem.
- **Offline on a fresh install.** A new install with no internet can no longer open the Mushaf until it downloads. Reading mode is the default on first launch (`settings-model.ts`, `mode: 'reading'`), and it still works offline from the bundled Tanzil text.
  - The claim «يفتح المصحف فورًا دون إنترنت» on the website and in the blog post becomes untrue for the Mushaf view when this ships, and is reworded then.
- Search results open the page with the ayah washed. The text inside the page is not selectable.
- Readers who chose Scheherazade New move to Amiri Quran silently.
- The decision to remove the old Mushaf code is made here, and the code goes once the new view ships.
- The change is a JavaScript and asset change plus packs, so it can ship as an OTA update, unless the Skia fallback of decision 8 is needed.

## Amendment, 15 Nov 2026 (developer)

- **Bigger text reflows.** In Mushaf mode, a font size above 1× (the reader settings stepper, or a pinch on the page) shows the flowed Tanzil Mushaf (`HafsMushafList`): justified Amiri Quran text that wraps freely, grouped by page with its dividers, ignoring the printed lines. At 1× and below, the printed SVG page shows. A pinch changes the same `fontScale` setting, snapped to its 0.1 steps between 0.8 and 1.6, and the ayah at the top of the screen stays in place across the switch. This replaces the part of decision 1 that removed the flowed Mushaf: it stays, as the large-text view. The text is Tanzil Hafs, so a non-Hafs riwayah keeps its printed pages at every size.
  - Why: the developer wanted the Mushaf text larger than a page can be on a phone. Making the printed page wider than the screen would need sideways scrolling on every line. Cutting words out of the artwork could clip a mark that sits over a neighbouring word.
- **No decorative frame on the SVG page.** The gold double frame around each page is removed, so the artwork takes its width: 358 pt instead of 321.5 pt on a 390 pt window. The `Mushaf` frame in `screens/` is updated to match once the developer confirms the look.

## Amendment, 24 Nov 2026 (developer): compact pages, TQP1 with LZMA

**Partly superseded by the amendment of 26 Nov 2026 below:** the LZMA compression and `lzma1` decoder (decisions 3 and 4, the decoder table, the store-build consequence), the 1/16 grid (decisions 1 and 3, the fidelity section, the 27 MB estimate) and open questions 1 and 3. The rest stands.

Status: **proposed** until the developer accepts it in the review of plan step 12. Amends decision 8 («drawn as received»), decision 9 («Delivery»), «Download size» and «Pages stay compressed on the device». Plan: `docs/plans/madinah-svg-mushaf/step-12-compact-pages.md`. Spec §7, §12, §14, §16 and `docs/content-plan.md` are edited with it.

**Decision (developer, 24 Nov 2026): «I want the lowest size possible.»**

### Why

- **Measured, 24 Nov 2026 (pinned commit `3ff27b46`).** A page is about 600 KB of SVG. About 90% is one `#content` path (relative `m c l s h v z`, three decimals); about 9% is the ayah ornaments (mostly `Q`). There are no arcs and no repeated contours (calligraphy, not font glyphs), so de-duplication does not help.
- **The 88 MB figure in «Download size» was an estimate.** Per-page gzip -9 over all 604 Hafs pages is **95 MB**.
- **Prototype codec** (`docs/plans/madinah-svg-mushaf/spike/tqp.py`, exact round trip asserted on all 604 Hafs pages). Every piece's transform chain is baked into viewBox coordinates, `H V S T` are expanded, coordinates are snapped to a 1/N grid and stored as deltas, then split into byte planes and compressed. Hafs pages only, deflate body:

  | Grid N | Size |
  | --- | --- |
  | 1000 (near lossless) | 70.2 MB |
  | **16** | **33.7 MB** |
  | 8 | 29.5 MB |

  LZMA on the same body is about 0.80 of deflate, so **N = 16 with LZMA is about 27 MB** (estimated from a 31-page sample; on Hafs pages 3, 50, 300 and 604 the LZMA blobs are 43.0, 44.5, 45.0 and 27.4 KB against 53.0, 56.5, 55.1 and 35.3 KB deflate). The other four riwayat are extrapolated. Plan step 12 part C measures all five, with the `regions` and `word_boxes` tables included, and the table goes below.
- Ayah ornaments are about 7.9% of the encoded size. Drawing them once per pack was **not chosen**; it stays a possible later step.

### Decisions

1. **The page artwork is stored baked and quantised.** In the pack, a page is no longer the SVG. It is the page's drawn paths (the `#content` paths and the `ayah-mark` paths, exactly the scope `parseSvgPage` draws) with each piece's transform chain applied in viewBox space, a zero origin (pages 1 and 2 are shifted), and every point snapped to a **1/16 viewBox unit** grid. This reverses «drawn as received» and step 5's «never alter» for the **pack's render geometry only**.
2. **What does not change.**
   - **The cached raw SVG stays byte for byte as downloaded.** A1 (size and git blob SHA-1) runs on it on every import and on every pack build.
   - **Word boxes are still built from the raw SVG** (`WordBoxBuilder` reads `SvgMushafDownloader::bytes`). The approved digest `8944a6b3…` and the sign-off do not change. Boxes and pages share the page's zero-origin coordinates, as before.
   - Polygons, ayah labels and the word-box tables are untouched.
   - **Non-negotiable 1 holds.** The Quran text in the artwork is a drawing; the project's text (Tanzil) is not touched. What is quantised is the derived drawing in the pack, below visibility (next section). The source stays checkable: anyone can re-derive every pack page from the pinned raw file.
3. **Format «TQP1»** (byte layout in step 12): an 18-byte header (`TQP1`, N, command count, value count, escape count), then **one LZMA-alone stream** (`xz --format=lzma`, dictionary 512 KiB, `lc=0 lp=0 pb=0`) of the body: command bytes (`M L Q C Z`), the low bytes of all zigzag deltas, the high bytes, and a `uint32` escape list for deltas of 0xFFFF or more. Every point is a delta from the current point at the start of its segment, which is SVG's relative `q`/`c` meaning, so the device builds the page path without rebuilding absolute points. Rounding is `floor(v * N + 0.5)` (never `round()`; languages disagree on ties).
4. **LZMA, not deflate, not brotli** (developer, 24 Nov 2026), accepting a store build and a server-side encoder.
   - **Server.** PHP has neither xz nor brotli. The API builds packs with the `xz` command (`xz-utils` in the API image; plan step 12 A4) through Symfony `Process`, with the fixed flags above. The pack builder never runs it on anything but the encoded page.
   - **Device decoder: `lzma1` 0.8.0** (see the research below).
   - **Fallback, stated plainly:** if the decoder fails the Hermes check or the 60 fps gate (plan step 12 part 0.2 and C2), the format falls back to **deflate at N = 16 (33.7 MB), which `fflate` already decodes and an OTA update can carry**. The container does not change; only the compression and the dependency do.
5. **Pack schema 2.** SVG packs get their own version, `PackSchema::SVG_MUSHAF_VERSION = 2` (the global `PackSchema::VERSION` stays 1, because `content-sync.ts` checks it for every other pack). The pack's `meta` gains `page_format = tqp1-lzma-n16`, `pages.svgz` becomes `pages.tqp`, and `SvgMushafPackReader.verify()` requires schema `2` and that format. A client that expects gzip pages therefore fails `verify` and keeps what it has; a TQP page can never reach the gzip inflater. The publisher's fingerprint is over the **uncompressed** container digest (`tqp_sha256`) and the format tag, so an `xz` or `zlib` upgrade never bumps a pack version and re-downloads 27 MB.
6. **The renderer is unchanged in kind.** The decoder returns the existing `SvgPageModel` shape with one piece (an integer-grid path and a `1/16` scale matrix); `page-picture.ts` still builds one Skia path and one `SkPicture` per page. Whether the path is made by one `MakeFromSVGString` call or by about 16,000 `PathBuilder` calls a page is decided by the timed check.
7. **A4 is redone.** The developer's artwork check (12 Nov 2026) covered the received pages, not 1/16-grid pages. The developer verifies a sample of the changed geometry before this ships (sheet in plan step 12 part C3). Until then A4 does not cover the packs, and this amendment does not ship.

### Fidelity (what «below visibility» rests on)

- Pages were rendered in headless Chrome (Skia) at 1290 px wide (430 pt × 3, the widest a phone draws a page), no supersampling, raw against baked. Chrome's anti-aliasing has a noise floor (1/60000 against 1/59999 changed 609 px by up to 18%), so peak pixel difference means nothing. The judgement is by crops and by a **contour-area scan over all 604 Hafs pages** (`tqp_degen.py`):
  - at N = 16 no contour with area above 0.05 unit² changes area by more than 8.5% (worst: page 1);
  - 8 contours collapse to a point, all with reference area of 0.0003 unit² or less (invisible);
  - N = 4 visibly wobbles the ornament hairlines; **N = 8 is the visual floor; N = 16 has twice that margin.**
- **Widest page.** §4 caps a page at 600 pt, not 430 pt, so a tablet or foldable at density 3.5 draws 2,100 px. The largest move of a vertex is half a step on each axis: √2 / 32 = 0.044 unit, which is 0.27 px at 2,100 px and 0.17 px at 1,290 px. That is below N = 8 at 1,290 px (0.33 px), the measured visual floor, but it was not rendered at 2,100 px. The A4 sheet includes 2,100 px crops, and the check in plan step 12 part C5 is repeated for all five riwayat.

### Decoder choice (researched 24 Nov 2026, npm registry and local benchmark)

Needs: pure JS on Hermes (no WASM, no native module), a release in the last 12 months (content-plan rule), a compatible licence, acceptable decode time for 27–45 KB a page while scrolling.

| Package | Last release | Licence | Pure JS | Verdict |
| --- | --- | --- | --- | --- |
| **`lzma1` 0.8.0** | 2026-11-04 (repo created 2023-02; 8 releases since 2026-10-16) | MIT OR Apache-2.0 | yes, no dependencies, decodes `.lzma` and raw LZMA1/2 (not `.xz`) | **chosen** |
| `brotli` 2.1.0 | 2026-10-10 (no release 2022-06 to 2026-10; ESM rewrite) | MIT | yes, decoder hand-ported; adds a 740 KB dictionary file to the JS bundle | measured alternative (developer decision: LZMA) |
| `lzma` 2.3.2, `lzma-purejs` 0.9.3, `js-lzma` 0.1.0, `xzwasm` 0.1.2 | 2022 | MIT/BSD | yes (`xzwasm`: WASM) | fail the 12-month rule |
| `xz-decompress` 0.2.3, `lzma-wasm` 1.0.7, `brotli-dec-wasm` 2.3.2 | 2025–2026 | MIT, Apache | no: WASM | not used (Hermes runs no WASM) |
| `lzma-web` 4.0.0 | 2026-08-06 | MIT | wrapper of the 2018 LZMA-JS around a worker | not used (worker API) |

- **Benchmark** (Node 24, V8 JIT, four Hafs bodies at N = 16, round trip byte-exact in both): `lzma1` 5–8 ms a page; brotli 1.2–2.5 ms; native inflate 0.2–0.4 ms. Sizes: LZMA 27.4–45.0 KB, brotli 29.3–46.4 KB (about 4% more), deflate 35.3–56.5 KB. Hermes has no JIT, so the real cost is the simulator timing in step 12 (baseline: step 1's 62 ms gunzip plus parse).
- **`lzma1` risks, stated.** It is 0.x with one maintainer and many recent releases: **pin it exactly** and review its changelog on every bump. It is ESM only (jest needs `transformIgnorePatterns`). Its `utf8.js` creates a `TextEncoder` and `TextDecoder` at import time, so it needs those globals; Expo's `winter` runtime already assumes `TextDecoder`, and step 12 part 0.2 proves it on the simulator before anything is built on it. Its `TransformStream` use is guarded. Its decoder allocates up to the header's dictionary size, which is why the format fixes it at 512 KiB and the decoder rejects more than 1 MiB.
- Content-plan table row (added with this amendment): `lzma1` 0.8.0, 2026-11-04, MIT OR Apache-2.0, decodes the LZMA-alone page streams of the SVG mushaf packs. A new package in `apps/mobile`, so a **store build**.

### Consequences

- **Download size.** Hafs falls from 95 MB (gzip, measured) to about 27 MB (estimate); the other four riwayat are extrapolated (an earlier table: Warsh 73, Qalun 78, Shu'bah 69, al-Duri 67 MB brotli of raw). **Replace with the measured sizes at step 12 C1: Hafs ___ MB, Warsh ___, Qalun ___, Shu'bah ___, al-Duri ___.** The **Pack traffic** line becomes about 27 MB from Railway per Hafs reader.
- **On the device** a page is still a compressed blob in the pack's own SQLite file, decoded once per page and cached (8 pages). No raw page is stored.
- **Build cost on the server.** Import encodes each page once to record its digest (a few minutes a riwayah), and the pack build encodes and runs `xz` again. The volume cache is unchanged (raw SVG plus the old `.svg.gz`, now unused; dropping `gz_sha256` and `gz_bytes` and the gzip files is a separate, destructive cleanup for the developer to approve).
- **Release.** Needs a store build (`lzma1` is a new package). Skia already needed one.
- **No build downloads SVG packs yet** (developer, 26 Nov 2026: «not shipped yet»). No released build or EAS Update reads `svg_mushafs` packs, so the SVG pack schema bump is enough and the API can publish whenever.

### Open questions for the developer

1. ~~Has any released build, or any EAS Update, read `svg_mushafs` packs?~~ **Answered (developer, 26 Nov 2026): not shipped yet.** The schema bump is enough; no download gate is needed.
2. **A4 re-sign-off** on the changed geometry (sheet at 1,290 and 2,100 px).
3. **Brotli instead of LZMA?** It is about 4% larger, three to four times faster in a JIT, and needs no `xz` on the server image, but its package was dormant for four years. The developer's decision was LZMA; this is only recorded because the Hermes result may change the trade.
4. **Fixtures with real artwork?** Step 12 uses synthetic pages because step 5 and the agent rules forbid artwork in fixtures. The developer may allow three tiny real pages instead.
5. **Dropping the gzip digests and files** (`gz_sha256`, `gz_bytes`, `svg/NNN.svg.gz`): destructive, left for later.

## Amendment, 26 Nov 2026 (developer): raw deflate, a 1/32 grid, page zoom instead of reflow

Status: **proposed** until the developer accepts it with plan step 12 (items 1 and 2) and plan step 13 (item 3). Supersedes parts of the 24 Nov 2026 amendment (marked there) and the 15 Nov 2026 item «Bigger text reflows». Plans: `docs/plans/madinah-svg-mushaf/step-12-compact-pages.md`, `step-13-page-zoom.md`.

### 1. Compression is raw deflate, not LZMA (developer: «yes switch to deflate»)

- **Measured on the device after Part 0.2** (iPhone 17 Pro simulator, dev build, Hermes, the same Hafs page-3 body of 218,649 bytes at grid 1/64):

  | Decoder | Time per page |
  | --- | --- |
  | `lzma1` 0.8.0 | about 263 ms (258–266 ms, 10 runs); decoded correctly |
  | `fflate.inflateSync` on raw deflate | about 23 ms (22.3–26.1 ms) |

  LZMA is about 11 times slower, which would stutter on page turns. The 5–8 ms Node figure of the 24 Nov research did not carry over to Hermes, as that amendment warned.
- **Framing:** `blob = 18-byte TQP1 header || raw deflate level 9 of the body`. The server uses PHP's `gzdeflate($body, 9)`; the app uses `fflate.inflateSync`. The decoder checks that the inflated length equals `ncmds + 2*nvals + 4*nesc` exactly and caps the inflate output (no dictionary-size check applies). The `meta.page_format` is `tqp1-deflate-n32`.
- **Consequences:** no new package (`lzma1` is not installed), no `transformIgnorePatterns` change, no `xz` on the server (the API image and CI are unchanged). The 24 Nov decoder table stays as the record of what was researched. `brotli` was not tried on the device.
- **Release.** The change adds no native layer, so by itself it can ship as an OTA update. What is true today (`docs/runbooks/railway-release.md`): the viewer needs `@shopify/react-native-skia`, which came after the 1.0.3 store build, and no released build is known to carry it. So the first release with the printed pages is a store build, and this change rides in it; if `npx eas-cli fingerprint:compare` shows the latest store build already has Skia, the page-format change alone is an EAS Update.
- **Answer to open question 1 (developer, 26 Nov 2026):** nothing that has shipped reads `svg_mushafs` packs. The pack schema bump to `2` is therefore enough; no download gate and no second pack format are needed. The runbook's «harmless to older apps» line is true again.

### 2. The grid is 1/32 viewBox unit (N = 32), because of zoom

- The page can now be drawn up to 2× larger (item 3). The widest real render is about **2,580 px** on a phone (430 pt × 3 × 2) and up to about **4,200 px** on the densest Android tablets (600 pt × density 3.5 × 2).
- The largest move of a vertex at 1/32 is √2 / 64 = 0.022 viewBox unit: **0.16 px at 2,580 px** (the same margin 1/16 had at 1,290 px) and **0.27 px at 4,200 px**, still below the measured visual floor (1/8 at 1,290 px, which is 0.33 px, judged identical at 6× zoom).
- The contour-area scan was run at 1/16 (no contour with area above 0.05 unit² changes by more than 8.5%). 1/32 is finer, so it is at least as good; plan step 12 part C5 reruns it at 1/32 on all five riwayat. The A4 re-sign-off sheet (24 Nov, decision 7) now includes 2,580 and 4,200 px crops.
- **Measured sizes, 1/32 with raw deflate 9** (the coordinator, 26 Nov 2026; all 604 pages of each riwayah, exact round trip on every page; pages only, `regions` and `word_boxes` not included; no arcs or unsupported transforms in any riwayah):

  | Riwayah | Per-page gzip today | TQP1, 1/32, deflate 9 |
  | --- | --- | --- |
  | Hafs | 94.98 MB | **38.19 MB** |
  | Warsh | 106.56 MB | **41.90 MB** |
  | Qalun | 101.41 MB | **43.55 MB** |
  | Shu'bah | 94.87 MB | **39.83 MB** |
  | al-Duri | 91.86 MB | **38.65 MB** |

  For the record, Hafs: 1/16 deflate 33.71 MB, 1/64 deflate 42.44 MB. The 27 MB figure of the 24 Nov amendment (LZMA at 1/16) no longer applies. A Hafs reader downloads about 38 MB (plus the `regions` and `word_boxes` tables, measured at step 12 C1); Railway pack traffic is about 38 MB per Hafs reader.

### 3. Page zoom replaces the re-flowed large-text view (developer, 26 Nov 2026)

**Amended the same day by item 9 below: zoom no longer pans.** The page does not become wider than the screen; the printed word shapes re-wrap into shorter lines instead. Read items 9 and 10; the «must pan» and open-question text in this item is superseded.

- **Reverses the 15 Nov 2026 item «Bigger text reflows».** In Mushaf mode there is no switch to the flowed Tanzil Mushaf (`HafsMushafList`) when text gets bigger. **The printed page itself zooms, up to 2×.** 100% is the printed page exactly as now (fit width, capped at 600 pt). Lines always stay the printed lines. A pinch and the reader-settings text-size control both drive the page zoom in Mushaf mode.
- **Unchanged:** Reading and Focus modes keep their font-size behaviour. The «No decorative frame» item of 15 Nov stands. «Why» of the 15 Nov item (the developer wanted the text larger than a page can be) is now met by zoom, with the cost that a page wider than the screen must pan.
- **What this retires once built:** `mushafView()`'s `flowed` result, the `HafsMushafList` branch in `ReaderScreen`, and the per-riwayah pinch cap (a non-Hafs riwayah now zooms too, since zoom needs no flowed text). Until plan step 13 is built, the 15 Nov behaviour stays. The component and its use in Reading are kept or removed in step 13, after the developer decides.
- **Needs a design first** (ADR 0087): this is a new interaction, so it is drawn in `screens/frames/` and approved before code. Questions for the developer are in «Open questions» below.

### 4. One download per riwayah stays (developer, 26 Nov 2026)

The developer considered a per-juz download and kept one pack per riwayah (decision 9).

### 5. The chosen riwayah downloads by itself (developer, 26 Nov 2026)

«The app should download Hafs by default, and on onboarding, we should download the riwayah user chooses immediately.» This extends decision 9, which started the download only when Mushaf mode was first opened.

- **Onboarding:** «متابعة» on the mushaf step saves the choice and starts that riwayah's download at once, in the background. Onboarding never waits for it.
- **Every launch and foreground, after onboarding:** if the selected riwayah (Hafs unless the reader chose another) has no installed pack and no download is running, the download starts. This covers readers who skipped onboarding and readers updating from a build without the Madinah pages.
- **Only the selected riwayah** downloads by itself. Others download when chosen.
- **The Wi-Fi-only setting still applies** (on unless the reader turned it off): on mobile data the download waits, and the next foreground on Wi-Fi starts it. A failed download is not retried in a loop: at most once per launch or foreground.
- Opening Mushaf mode still starts it too (decision 9), so nothing changes for a reader who opens it first.

### 6. Fix: the reader did not show the page after a download finished (found 26 Nov 2026)

On the simulator, the download card stayed on «تنزيل» after the pack had installed, until the reader was reopened. Cause: the React Compiler (`reactCompiler: true`) memoises plain function calls in a component or hook by their arguments. `useSvgMushafPack` subscribes to the install revision and the catalogue version but discards both values, and reads the installed record with `readInstalled(key)`, so the compiler cached that read by `key` alone. The same pattern is in `useReciterCatalogue`, `useIdleReciter` and `useAudioAvailable`. Fix: these hooks opt out of the compiler with the `'use no memo'` directive, so their reads run on every render as their comments intend. Confirmed on the iPhone 17 Pro simulator: after the pack was deleted, the app downloaded it again on launch, and the open reader switched to the page without a reopen.

### 7. Landscape phone: the page takes the full width (developer, 26 Nov 2026)

«Please fix alignment and make it take the full screen» (the reader on the iPhone 17 Pro simulator, rotated). In a short window (under 480 pt high, ADR 0036) the 600 pt cap left the page centred with about 140 pt empty on each side. Now, in a short window only, the page width is the window width minus the left and right safe-area insets (the Dynamic Island side) and the usual gutters, with no 600 pt cap; the page is taller than the screen and scrolls. Tall windows keep `min(window − gutters, 600)`. The rotate-keeps-your-place rule (`useReadingAnchor`) is unchanged. Widest render: 874 pt − 124 − 32 ≈ 718 pt × 3 ≈ 2,150 px, inside the 1/32 grid's margin (item 2). The mini player covering about a third of a short window is a separate finding, raised with the developer.

**Extended the same day (developer): «should be full width on iPads as well».** The 600 pt cap is dropped everywhere: the page always takes the full width of the reader's column (the window minus the safe-area insets, the gutters, and the sidebar or docked panel when they show), measured from the list's own layout, not the window. Phones in portrait are unchanged (their column is already under 600 pt). Widest render: a 13-inch iPad in landscape beside the 300 pt sidebar, about 1,034 pt × 2 ≈ 2,070 px, or about 4,140 px at 2× zoom, inside the 4,200 px the 1/32 grid was sized for. This supersedes «cap 600 pt» in item 3 and spec §4 «Mushaf page sizing».

### 8. Landscape: the mini player collapses to a small pill (developer, 26 Nov 2026)

In a short window (landscape phone) the mini player covered about a third of the screen, over the page. Developer: «In landscape, collapse it to a small pill at the bottom corner.» It reuses the existing collapsed capsule (`MiniPlayerCapsule`, frame `#ReadingMiniCollapsed`: a 64 × 24 glass pill in an 88 × 44 hit area, with the gold progress line while playing; a tap or a drag up expands it). In a short window the reader's mini player starts collapsed and the capsule sits in the bottom trailing corner above the safe area, instead of centred. A tap expands the bar as today; it collapses again on the next scroll. Tall windows keep the current behaviour. The pill is drawn as a frame in `screens/` (ADR 0087) and approved before it ships.

### 9. Zoom re-wraps the printed word shapes; it never scrolls sideways (developer, 26 Nov 2026)

Developer: «I don't want scroll X.. I want when zooming we may show less words per line so words are bigger.» **This supersedes item 3's «a page wider than the screen must pan», its «the page itself zooms» and its open questions 1 to 5.** Plan: `docs/plans/madinah-svg-mushaf/step-13-page-zoom.md` (rewritten the same day).

- **100% is the exact printed page** (the TQP1 path drawn as today; lines end as printed).
- **Above 100%, up to 200% in 25% steps,** the page's **own word shapes** (the contours of the artwork, not a font) are laid out again in bigger, shorter lines on the same page width: same calligraphy, re-wrapped. There is **no horizontal scroll** at any zoom. Page boundaries, dividers and page numbers stay; a page becomes taller.
- **A word is the set of page contours the word-box builder assigned to it.** Rectangles are not enough, because printed marks and letters overlap neighbouring words' boxes, and clipping by rectangle would cut a mark or pull in a fragment of a neighbour. The pack therefore carries two small tables, `word_contours` (each word's runs of TQP subpath indices, no bounds) and `contour_blocks` (title and basmala blocks, ayah marks and sajda lines, with bounds), built by the API from the builder's own groups; about 1.5 MB for Hafs (a first 14-column design measured 5.8 MB and was rejected). The approved word boxes and their digest `8944a6b3…` do not change; the contour data has its own digest and its own developer approval. Titles and the basmala flow as centred blocks on their own lines, an ayah ornament stays after its ayah's last word, a mark between words stays with the word the builder gave it.
- **No artwork is edited:** a word moves as a rigid piece (a translation; only a title block is scaled, to fit the line). The raw SVG and the quantised geometry are untouched, and the Quran text is not involved (non-negotiable 1).
- **Justification:** the print justifies with kashida, which a re-wrap cannot do, so lines are balanced by minimum raggedness and gaps stretch up to a cap; a line that would need more stays right-aligned. The cap is a default for the developer to confirm (step 13 open question 1).
- **Persistence and control:** one global `mushafZoom` (default 1, clamped to [1, 2], steps of 0.25) in the `reader.settings` MMKV JSON, kept across pages, riwayat and sessions. A pinch (step-wise) and the reader-settings text-size control (a separate `MushafZoomStepper` in Mushaf mode, showing a percentage) both drive it. `fontScale` stays for Reading and Focus. Reduce Motion: no animated step. The ayah polygons (re-laid at zoom, as the union of an ayah's re-placed word rectangles per line) stay the accessible elements; the recited-word pill follows the word's new rectangle; `useReadingAnchor` keeps the top ayah across a zoom change, as for rotation.
- **Frames** are pre-approved (ADR 0087, developer 26 Nov 2026): the Mushaf at 150% and 200% (Hafs, compact), the settings stepper showing a percentage, and the «zoom needs word data» state. Captions end «Approved by the developer, 26 Nov 2026».
- **Retires, once built:** `mushafView()`'s use of `fontScale` (the flowed Tanzil Mushaf is no longer a large-text view; `HafsMushafList` stays only as the fallback while a riwayah's pack is not available), the per-riwayah pinch cap (replaced by «zoom available»).

### 10. Word boxes come first for the other riwayat; no zoom without word data (developer, 26 Nov 2026)

The developer chose, over «no zoom» and «sideways scroll», to build word boxes for **Warsh, Qalun, Shu'bah and al-Duri first**. Until a riwayah has **approved word boxes and an approved contour map**, its page stays at 100% and **zoom is unavailable there**: the stepper is disabled and says (proposed copy, the developer confirms in the frame review) «التكبير متاح للروايات التي تتوفر بياناتها كلمةً كلمة. هذه الرواية ستدعمه لاحقًا.» / "Zoom is available for riwayat that have word-by-word data. This riwayah will get it later." Plan: `docs/plans/madinah-svg-mushaf/step-14-riwayah-word-boxes.md` (research, source, gates, publish order).

- **Source:** quran-ws/quran-text at the pinned `7bdefdea` has per-word page and line text for all four (planner's check, 26 Nov 2026), CC BY 4.0 over the Complex's text; its ayah sets equal the artwork's polygons on all 604 pages for Warsh, Qalun and Shu'bah.
- **al-Duri is blocked on the developer:** the artwork counts 31 ayahs in surah 67 (6,218; it equals quran-text's Sūsī count), quran-text's al-Duri counts 30 (6,217, measured from the 2022 document); W6 fails on pages 562 to 564 until the numbering is decided. The «6,205 Basran» figure in the task statement matches neither source and is not used.
- **Code that contradicts these decisions today** (not yet changed): `WordBoxBuilder` (`KEY = 'hafs'` and its guard and docblock), `config/mushaf.php` (`expected_ayahs` null for the four), `ReaderScreen.tsx` (the pinch cap of 1× for non-Hafs, which already matches item 10), spec §4 («a page wider than the window pans») and §12 («capped at 600 pt») and the 15 Nov 2026 amendment (the flowed large-text view, withdrawn by item 9).

### 11. Reading and Focus in the other riwayat: a separate draft (developer instruction, 26 Nov 2026)

«words of each riwayah should also be shown on reading and focus modes, not only on quran.» This reverses «Decided» 5 (Reading and Focus switch to Hafs) and may change decision 3 (Amiri Quran only). It is large enough for its own ADR: **`docs/adr/0100-riwayah-text-in-reading-and-focus.md`** (proposed) and plan step 15. Findings that matter here: Amiri Quran cannot render Warsh, Qalun or al-Duri (15,469, 13,508 and 1,806 words with a missing glyph); the Complex's own riwayah fonts can, and their EULA grants Use, Copy and Distribute but forbids Modify and Reproduce (a legal reading for the developer); Scheherazade New 4.500 (OFL) covers every codepoint but draws Mashriqi fa and qaf for Warsh and Qalun, where the print has the Maghribi dotting. Nothing in this item is decided.

### 12. Answers, 26 Nov 2026 (developer)

- **al-Duri is hidden for now.** quran-svg's «douri» artwork matches quran-text's al-Sūsī file on every page (6,218 ayahs), not its al-Duri file (6,217; pages 562–564 differ), so the artwork may be al-Sūsī's mushaf. Until that is settled, al-Duri is removed from every mushaf picker (onboarding, reader settings, Settings › Reading); a saved `duri` choice reads as `hafs`; its pack is not published in production. Word boxes, zoom and Reading/Focus text for it wait.
- **Sajda lines and hizb ornaments re-wrap as printed** (step 13): the words under a sajda line stay one unit with their line; each hizb ornament is its own block in its printed place.
- **Fonts for Reading and Focus in Warsh, Qalun (and al-Duri later):** the King Fahd Complex's qira'at fonts, unmodified, without asking the Complex first (the developer's reading of the EULA's grant to use, copy and distribute). Recorded in ADR 0100.

### 13. The selected riwayah's pack updates by itself; ayah actions off on non-Hafs pages (developer, 26 Nov 2026)

- **Updates** («yes, auto-update the selected riwayah pack»). Before, an installed pack changed only when the reader downloaded it again, and no screen offered that, so every device holding Hafs v2 (no word contours) would never get zoom once v3 is published. Now the rule of item 5 also starts a download when the catalogue has a newer version of the **selected** riwayah, at launch, on each foreground and after a content sync changes the catalogue. The Wi-Fi-only setting applies, as in item 5. The update runs in the background: the installed version stays readable and on screen (the pack status stays «installed», no download card), the new file replaces it only once verified (the installer's existing rule), and the reader re-opens the new version without a restart. Other riwayat update when chosen.
- **Ayah actions on non-Hafs pages** (developer chose «disable for now»). A tap on a Warsh or Qalun page carried the riwayah's own ayah number into the ayah sheet, which read it as Hafs: in al-Baqarah, where Warsh counts no «الم» ayah, play, the text, tafsir and marks all landed one ayah early (found on the iPad). Until the ayah map (step 15 D7) and per-riwayah marks (step 9) exist, an ayah tapped on a non-Hafs page opens a sheet (or the side panel) with only its reference, the riwayah's name and a note, with no tabs or actions: frame `AyahSheetRiwayahUnavailable`. Hafs pages, Reading and Focus are unchanged.

### 14. The C0 review found split errors; a revised split and keep-together runs (developer, 26 Nov 2026)

- **Finding.** The step 13 C0 review sheet (the device's `layoutPage` at 200% on all 604 pages) failed on the approved word boxes (`8944a6b3…`): a detached letter (a leading و, a final ا or ر, an إ) often went to the neighbouring word, 181 lines had every label shifted by one (the path draws a word ahead of its place), and some marks followed path order rather than their letter. At 100% this only nudges a highlight; at 200% it breaks words across lines. 886 words read out of sequence on 467 pages.
- **Revised split** (`WordBoxBuilder`, `WordSplitter`; config `mushaf.word_boxes.body_penalty` and the settings beside it). Each printed word's letter-body count comes from quran-text (a body starts after every letter that does not join the next); a group whose letter-body count differs costs extra. A contour counts as a letter body when it is full height, or at least 20% of the line and crossing the zone just above the baseline. A line whose groups come out of left-to-right order is split again over its contours sorted by x. Marks stay with the word the split gives them: every geometric rule tried for moving a mark to another word (boxes, nearest outline, the letter straight under it) moved more correct marks than wrong ones (a sample of 16 moves: 14 wrong), because short letters and tall neighbouring strokes mislead them. Off (`body_penalty` 0) the builder gives the approved digests unchanged.
- **Neighbouring words stay as printed** (developer, 27 Nov 2026: «the neighbouring words should be next to each other whatever the case is»; 1:1 had shown the alif of the last word after it). `KeepTogether` joins two words of one ayah on one line into a run when a line break or a gap between them could show a letter or a mark away from its word: their letters interleave in print; one box lies mostly inside another (any two words, every word between them joins); one has fewer letter bodies than its text and the other more; or they share an unclear mark (a mark sits, straight above or below, within 3 units of the other word's letter and no more than twice as far from it as from its own word's: 6:6, the round sign over the alif of «يروا» with the kaf of «كم» under it). Hafs: 3,261 runs on 591 pages, 3,091 of two words, the longest five. A separate check in the review script (the app's own layout code) confirms on all 604 pages that neighbours whose letters interleave always move as one.
- **Keep-together runs** (developer: «yes never break the line»). Where the artwork draws two neighbouring words as one shape (their outlines touch: «يوما من» at 40:49, «ومن حيث» at 2:150), no split can part them. The builder emits a `contour_blocks` row of **kind 5** per run (surah, ayah, `first` app position, `count` positions; bounds the union of the boxes) for neighbouring words of one ayah on one line when one box lies inside the other, or when one is narrow for its letters (≤ 0.7 × the page median per letter) with fewer letter bodies than its text and the other wide (≥ 1.4 ×). The zoomed layout makes each run one unbreakable piece that keeps its printed offsets, as it does under a sajda line. Each word keeps its own box, so word follow is unchanged; where a shape is shared, the shared part highlights with one of the two words, as before. Additive: the pack schema, `PackSchema::VERSION` and `SVG_MUSHAF_VERSION` do not change.
- **Result at weight 6:** on all 604 pages at 200%, 0 words read out of sequence (from 886), 0 neighbours with interleaved letters moved apart (from 625), 6:6 and 1:1 read as printed; all hard gates pass. About 12,000 word boxes change, so both the word boxes and the contour map need a new developer approval. Known limit: where a run joins two words, the shared part (a joined shape or an unclear mark) highlights with one of them during audio, as before.

### 15. Zoom: centred lines, 100% to 300% (developer, 27 Nov 2026)

- Each zoomed line is centred on the page, with the words' printed spacing (the developer's reference screenshot). This replaces right-aligned and justified zoomed lines (step 13 open question 1).
- Zoom runs from 100% (the exact printed page, the minimum) to 300% in 25% steps; at 300% about two words a line.
- No tajweed colours: the Mushaf draws the printed artwork, which has none.
- Frames `MushafZoom150` and `MushafZoom200` are redrawn and `MushafZoom300` is new, all «(بانتظار الموافقة)»; the layout code (`rewrap-layout.ts`, `MUSHAF_ZOOM_MAX`) changes after the developer approves them.

### 16. Word boxes and contour maps for Shu'bah, Warsh and Qalun (developer, 27 Nov 2026: «this should be done to all riwayahs»)

- **Built with the same rules as Hafs** (items 14 and 15), from the pinned quran-svg pages (imported and A1-checked; A2 now expects 6,236 for Shu'bah and 6,214 for Warsh and Qalun) and the pinned quran-text words. `WordBoxBuilder` takes any riwayah listed in `mushaf.word_box_riwayat`; Hafs keeps its settings in `word_boxes` and gives its approved digests unchanged. The other riwayat have the letter-body rules on from their first build (`body_penalty` 6 in their entry), no position splits, their W5 letter count from the printed text (quran-text has no imlāʾī spelling for them), and a debris rule (a contour of at most 0.03 unit either way is attached to the nearest word, never shaping a box).
- **What the other riwayat needed that Hafs did not** (each is a no-op for Hafs):
  - *Subpaths that draw nothing* (Qalun and Shu'bah empty movetos, a moveto closed at once) need no owner (W10), and a title split only by them is one run.
  - *A title drawn in several runs*: the source interleaves the surah title with the text lines in path order. The first run stays the block's kind 1 row; each further run is a kind 6 row naming its block (`ayah` = the block's ord), joined into one unit by the app.
  - *Contours outside the page's viewBox* (Warsh page 300: 8 contours at x −77 to −59, never seen in print) are left out of the split and need no owner.
  - *A star after the ayah ornament* (Shu'bah and Qalun): the ayah's last word reaches over it to the next ayah's first word. Such a pair is kept together across the mark by a kind 7 row («keep this word with the next word»), since a kind 5 run holds one ayah.
  - *The split*: each contour drawn in another ayah's span costs the split 50; a group needs a letter body (full height or short on the baseline), not only a full-height contour; the split in x order replaces the path-order one whenever it costs less (a path drawn out of place can give an in-order split shifted by a word); and a line that still breaks a hard rule is split again with other body weights, keeping the first split that breaks none (in order, W3, every letter in its ayah's span, every mark near a letter of its word).
- **Corrections:** none for Warsh and Qalun. Shu'bah keeps one, copied from Hafs because it is a quran-text line fact, not a contour index: 74:53:3 is drawn at the start of page 577's line 4. Hafs's contour-index overrides cannot be copied: the other sources draw the same lines in a different path order.
- **Result:** every hard gate (W1, W2, W3, W6, W9, W10, W11 for Hafs) passes for all three, with no failed line; the review script's 200% check (the app's own layout code) finds no word out of order, no interleaved neighbours apart, no shape lost and no word outside the column on all 604 pages of each.
- **What the checks cannot see:** a split shifted by a letter where the letter counts still balance, so each word holds a neighbour's letter but stays in order and inside its ayah (seen on the final data: Shu'bah 3:185:20–21 on page 74, «إ» with «الدنيا»; Qalun 2:113–114 on page 18, «ٱلَّذِ|ينَ» and «يُذۡ|كَرَ»). The builder's flags for the final data: Shu'bah W4 143, W5 63, W8 745 lines; Warsh W4 272, W5 198, W8 64; Qalun W4 1,408, W5 975, W8 703 (W5 still uses Hafs' width-per-letter bounds; the plan calibrates them per riwayah). The developer's visual review finds these, as Hafs's did (212 reviewed lines); the builder's flags (W4 narrow box, W5 width per letter, W8 nested or out-of-order line) point at the lines to look at first. A riwayah's zoom stays off until its digests are approved, so none of this reaches a reader before that review. Sajda lines: 15 on 15 pages in Shu'bah; 0 in Warsh and Qalun, whose prints mark the sajda without the overline. Both digests of each riwayah are `pending_review`: the developer approves them as for Hafs.
- **al-Duri** is imported (6,218 ayah regions) and not built: its artwork counts 31 ayahs in al-Mulk and quran-text's al-Duri text 30 (step 14 RB-A). It is left out of `word_box_riwayat` until the developer decides.

### Open questions for the developer

1. **Page zoom justification** (step 13 Q1), the **no-pack fallback** (Q2), **pages 1 and 2** centred at zoom (Q3), and the **copy** (Q4).
2. **al-Duri's numbering** (step 14 a, b, c), and the publish order and review load for the four riwayat (step 14 Q2, Q3).
3. **Reading and Focus text** (ADR 0100 and step 15): font, orthography, the Complex's EULA reading, text sign-off, labels, place across riwayat, search scope, tafsir.
4. From the 24 Nov list, still open: the A4 re-sign-off (now at 1,290, 2,580 and 4,200 px); real-artwork fixtures (step 12 uses synthetic pages); dropping the `gz_sha256`, `gz_bytes` and `.svg.gz` leftovers (destructive, later). Closed: «has anything shipped read the packs» (no), brotli (not needed), and the old zoom questions 1 to 5 (panning, persistence, stepper, accessibility, frames: answered by item 9).
