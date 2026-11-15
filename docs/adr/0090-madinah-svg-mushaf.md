# 0090 — The Madinah mushaf pages from quran-svg replace the flowed Mushaf; a mushaf picker replaces the font picker

Date: 2026-11-12 (renumbered from 0088 on 15 Nov 2026, after `main` took 0088 and 0089) · Status: **accepted** (developer, 12 Nov 2026: "accepted") · Supersedes ADR 0048 decisions 1, 2 (Scheherazade New), 4–6, 10 (Mushaf part) and 11. Retires the unused QCF page path of ADR 0011. Amends spec §4 («Mushaf page sizing»), §5/§6 (new mushaf tables), §12 («Mushaf rendering»), §14 and §16, and `docs/content-plan.md` (a new source row). Plan: `docs/plans/madinah-svg-mushaf.md`.

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
