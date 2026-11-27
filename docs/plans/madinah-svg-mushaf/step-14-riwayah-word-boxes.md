# Step 14 — Word boxes and contour maps for Warsh, Qalun, Shu'bah and al-Duri (ADR 0090, amendment of 26 Nov 2026, items 9 and 10)

Status (27 Nov 2026): **Shu'bah, Warsh and Qalun built** on branch `claude/zen-clarke-kf8665` (ADR 0090 item 16): every hard gate passes, both digests `pending_review`, waiting for the developer's approval. **al-Duri is imported and waits for its numbering decision** (RB-A below). Original status: plan, not implementation-ready. Branch `main`; stage and commit nothing. Read `.claude/agent-rules.md`, root `CLAUDE.md` and `apps/api/CLAUDE.md` first. Written 26 Nov 2026 by the planner.

**Why this step exists.** Developer, 26 Nov 2026: the other riwayat get word boxes first, because page zoom (step 13) re-wraps the printed word shapes and cannot work without word data. Until a riwayah has approved word boxes **and** an approved contour map, its page stays at 100% and zoom is unavailable there (ADR 0090 amendment item 10).

**Depends on:** step 13 Part A (`ContourMapBuilder`, `word_contours`, `contour_blocks`, W9, W10, W11, the review sheet). This step reuses it for each riwayah. It also needs Part 0.3 of step 13 (the contour-order check), which already shows that **Qalun and Shu'bah have empty movetos**, so contour indices are always emitted as TQP subpath indices.

## Rests on

- ADR 0090 decisions 5, 6, 7 and the 12 Nov 2026 «Second source» section (quran-text replaces `word_layouts`), the amendment of 26 Nov 2026 items 9 and 10; step 3 (`step-03-word-boxes.md`); `docs/content-plan.md` rows for quran-svg and quran-text (lines 116 and 117); spec §7 «SVG mushafs».
- Code read: `WordBoxBuilder.php` (`KEY = 'hafs'`, the guard, `ATTRIBUTION`, `settings()`, `splits()`, `moveWords`), `QuranTextSource.php` (`words($key, $offline)` already takes any key; it drops ayah 0), `config/mushaf.php` (`editions.*.expected_ayahs` is `null` for the four), `SvgMushafImporter.php` (`assertAyahCounts`, A2), `LineBands.php`, `BuildWordBoxesCommand.php`, `WordBoxApproval.php`, `word-boxes-hafs.json`.

## Research (26 Nov 2026). Read and opened that day: the quran-text repository files, its commits API, the itqan thread, the GitHub API pages for the two KFGQPC data repositories. Marked «seen in search results, not opened»: the others

### What the planner measured

Data from **quran-ws/quran-text at the pinned commit `7bdefdea`** (`data/mushaf/{warsh,qalun,shubah,duri}.csv.gz`, already in `apps/api/resources/svg-mushaf/quran-text-7bdefde.json` with git blob SHA-1 and size, so check A1 already covers them), compared with the quran-svg v1.1.1 polygon files in the local cache (`mushafs/{warsh,qalon,shubah,douri}/kfqc/json/NNN.json`):

| | Hafs (reference) | Warsh | Qalun | Shu'bah | al-Duri |
| --- | --- | --- | --- | --- | --- |
| Rows (words) in quran-text | 77,432 | 77,431 | 77,431 | 77,432 | 77,431 |
| Ayahs in quran-text (ayah 0 excluded) | 6,236 | 6,214 | 6,214 | 6,236 | **6,217** |
| Ayah-0 rows (the Fatiha basmala, unnumbered) | 0 | 4 | 4 | 0 | 4 |
| Polygons (distinct ayahs) in quran-svg | 6,236 | 6,214 | 6,214 | 6,236 | **6,218** |
| Pages where quran-text's ayah set differs from the polygons' (W6) | 0 | **0** | **0** | **0** | **3 (562, 563, 564)** |
| Words quran-text flags `resegmented` | 0 | 0 | 2 | 0 | 10 |
| Printed count (quran-text `docs/format.md`, «Counting») | Kufi | Last Madani | Last Madani | Kufi | First Madani |

- Columns of every file: `position, surah, ayah, position_in_ayah, page, line, juz, number, number_last, text, rasm_imlai, marks, resegmented` (page is read from the source; **line is reconstructed**, `docs/known-issues.md` §6). The ADR's earlier finding stands: quran-text's lines match the SVG pages everywhere except page 1 of Warsh, Qalun and al-Duri, where the basmala has its own line without a region. **The first run of the step re-measures W1 for each riwayah**, because the finding was made on the 12 Nov pin and nothing here replaces the gate.
- **al-Duri is a real blocker.** The artwork counts **31 ayahs in surah 67** (`json/surah.json` ayahCount 31; 6,218 in total). quran-text's al-Duri text counts 30 (6,217), because it was **measured from the 2022 `UthmanicDouri_V20` document**, and its docs say «three KFGQPC Dūrī printings carry two different āyah divisions» and «a later release of it has to be measured again rather than assumed» (`docs/format.md`, Counting). **quran-text's Sūsī file (6,218; 67:9 counted) matches the artwork's ayah set on all 604 pages, with 0 differences.** So the artwork's al-Duri print counts 67:9 the way the Sūsī file does, and quran-text's al-Duri text does not. W6 fails on pages 562–564 as it stands, and an al-Duri Reading text (step 15) would number differently from its pages.
- **«6,205 Basran» does not appear anywhere.** The task description said al-Duri is 6,205 (Basran). Neither source supports it: quran-text prints First Madani (6,217) and says the qāriʾ is «associated with» Basri, with a note that this is a different question from what is printed (`differs_from_association: true`); the artwork is 6,218. Do not adopt 6,205.
- Numbering differences from Hafs: Shu'bah is identical to Hafs (`ayah-map.csv`: 6,236 `same`). Warsh and Qalun differ in 59 splits, 155 merges, 2 shifted, and Fatiha's basmala is unnumbered (`1:0`); al-Duri 57 splits, 141 merges, 1 shifted, and the same unnumbered basmala. This matters for step 15, not for boxes: boxes are keyed by each riwayah's **own** `(surah, ayah, position)`.
- **Newer commits exist:** `quran-ws/quran-text` HEAD was `46462ffa` (19 Nov 2026), and the five `data/mushaf/*.csv.gz` files are **byte-identical to our pin** (checked 26 Nov 2026). Keep the pin `7bdefdea`. Bump only with a new manifest and a re-run of every gate.

### Sources checked (what each contains, licence, reliability, fit)

| Source (URL) | Contains | Licence | Fit |
| --- | --- | --- | --- |
| **quran-ws/quran-text**, `https://github.com/quran-ws/quran-text` (repo and its `LICENSE`, `NOTICE.md`, `docs/sources.md`, `docs/format.md`, `docs/limitations.md`; read 26 Nov 2026) | Seven riwayat, **per word**: surah, ayah, position, **page, line**, Unicode text exactly as the Complex's v3.0 documents print it, plus the KFGQPC font beside each text; an ayah map between riwayat; counting analysis | **CC BY 4.0** for the data, attribution waived inside a product and asked for when the data itself is republished (a pack that serves the text counts as republication, step 15); **the text is the King Fahd Complex's** and stays under the Complex's usage statement (reproduced in the repo's `LICENSE`: free digital use in print, websites and software; mushaf printing for sale is the Complex's). Marked «Beta»; «verify against an authorised printed mushaf» | **Recommended for all four.** Same publisher as the artwork (quran.ws made both), same Complex editions, already pinned and A1-checked |
| quran-svg v1.1.1 polygons, `https://github.com/quran-ws/quran-svg` | Ayah polygons per page (one rectangle per line) | CC BY 4.0 | Already imported. The line geometry for every riwayah |
| quran-text's own note on origin, `docs/sources.md` | The seven v3.0 `.docx` packages (and `UthmanicDouri_V20`) are pinned by name and SHA-256 **but have no recorded URL**: «verifiable but not re-fetchable» | — | A provenance gap to carry into the credit and the report |
| The itqan community thread, `https://community.itqan.dev/d/262` (read 26 Nov 2026) | The quran-svg authors say they extracted riwayah texts «at ayah and word level» from the Complex's releases and would publish them; they also added kashida to spread words because the Complex's Word files space words inconsistently | — | Consistent with quran-text being that publication (same publisher, per ADR 0090 line 91); the thread alone does not prove it |
| King Fahd Complex, `https://qurancomplex.gov.sa/en/category/kfgqpc-quran-qiraat` and `https://qurancomplex.gov.sa/en/?p=2127` (Warsh) (**seen in search results on 26 Nov 2026, not opened**) | The Complex's own qira'at pages, the Warsh and Qalun computer fonts, AI vector files for Hafs, Warsh, Qalon and Douri | The Complex's usage statement | The origin of everything above. The site is geo-restricted outside the Kingdom (`quran-text/docs/sources.md`), so not a build source |
| `ibnhazm/KFGQPC` (`https://github.com/ibnhazm/KFGQPC`; **seen in search results, not opened**), `thetruetruth/quran-data-kfgqpc` (`https://github.com/thetruetruth/quran-data-kfgqpc`; GitHub API read 26 Nov 2026: last push 2022-02-15, no licence field) | Fonts and older ayah text for Hafs, Warsh, Shu'bah, Douri, Soosi, Bazzi, Qunbul | none stated | Not used: older, no licence, no line data |
| Quranic Universal Library (QUL, Tarteel), `https://qul.tarteel.ai/docs/tutorial-mushaf-layout-end-to-end` (**seen in search results, not opened**) | Mushaf layouts (page, line, first and last word ids); the listing seen shows Madinah Hafs 15-line and IndoPak layouts, **no Warsh, Qaloon, Doori or Shuba entry found** | per resource | Not a source for these four as far as the search shows; **the developer or the next agent should confirm on the QUL resources page** (the search tool could not open it) |
| Tanzil | Hafs only, no page or line | CC BY 3.0 | No |
| Quran Foundation | Hafs only (and the app's rule: QF v4 only, never `/qdc`) | QF terms | No |
| `quranpedia/qiraat-ayah-map` (MIT) | Ayah boundaries per counting system | MIT | Already vendored by quran-text; step 15 reads its derived `ayah-map` |
| Hugging Face `benhadjermed/warsh_quran_aligned_processed` (**seen in search results, not opened**) | Warsh, parquet, fields unknown | not checked | Not used |

**Recommendation: quran-text at `7bdefdea` for Warsh, Qalun and Shu'bah (licence: CC BY 4.0 data over the Complex's text, as the Hafs boxes already use), and the same file for al-Duri only after the numbering decision.** No other source gives page and line per word for these four editions, and nothing needs a new licence decision for **boxes** (derived coordinates; the committed output credits quran-ws as the Hafs one does). Serving the **text** is step 15's decision.

## The blocker: al-Duri's numbering (developer, religious numbering and source)

Options, none decided here:

- **(a) Number al-Duri as the artwork prints it (6,218, 67:9 counted).** quran-text's al-Duri text has the same words; surah 67 would need an ayah overlay: the words of its 67:9 split where the print ends the ayah, and later ayahs shift by one (67:10 to 67:31). The split points can be read from quran-text's **Sūsī** file (same count) and verified against the artwork's ayah marks. A numbering overlay is a hand-kept correction file like the word-line overrides (`word-box-overrides-duri.json` gains a `renumber` kind: `"67:9:<word position>"` → new ayah, with a reason); the text itself is never touched (non-negotiable 1). **Needs the developer to confirm from the 1443H printed al-Duri mushaf that it counts 31 ayahs in al-Mulk.**
- **(b) Hold al-Duri.** It keeps its printed page at 100%, no zoom, until quran.ws re-measures it from the print the artwork comes from. Ask quran.ws (corrections@quran.ws, legal@quran.ws are the published contacts).
- **(c) Ask the Complex or quran.ws which release the 1443H artwork was built from.**

Planner's recommendation: build Shu'bah, Warsh and Qalun now; **al-Duri last, behind this decision**.

## Pipeline

### 1. Generalise `WordBoxBuilder` (no change to Hafs)

- Replace `private const string KEY = 'hafs'` and the guard with `config('mushaf.editions')` membership: `build(string $key)` accepts any edition key with `word_boxes_enabled`. **The guard may not be loosened for an edition without an entry in `mushaf.word_box_riwayat`** (a new config map below). The Hafs run must still produce digest `8944a6b3…` and `word-boxes-hafs.json` byte for byte.
- The per-edition parts move into config (`config/mushaf.php`):
  - `word_box_riwayat.{key}`: `quran_text_file` (`warsh`, `qalun`, `shubah`, `duri`; `hafs` as today), `position_splits` (Hafs `['15:7:1' => 2]`; **empty for the other four**, which have no app word index: their positions are quran-text's `position_in_ayah`), `base_height_share`, `width_per_letter` (calibrated per riwayah: below), `numbering_overlay` (null; al-Duri's file if option (a) is chosen).
  - `editions.{key}.expected_ayahs`: Warsh 6,214, Qalun 6,214, Shu'bah 6,236; **al-Duri set only after the decision** (6,218 for option (a)). The importer's A2 then checks the polygon count against it.
  - `approved_word_boxes.{key}` and (step 13) `approved_word_contours.{key}`: empty until the developer approves a riwayah's digests.
- Files: `resources/svg-mushaf/word-boxes-{key}.json`, `word-box-overrides-{key}.json`, `word-contours-{key}.json` (the existing `word_box_files` patterns already take `%s`). Each output credits quran-ws as the Hafs one does; set `ATTRIBUTION` per file, unchanged text.
- `QuranTextSource::words()` already skips ayah 0 (the Fatiha basmala rows of Warsh, Qalun and al-Duri), so those rows do not enter W1's line count; the page 1 basmala line has no band and falls into a **block** in the contour map (step 13 A3). The ADR's expectation for page 1 holds: re-check it in the first run.
- **W5 needs letter counts.** `rasm_imlai` is empty for the four (an Imla'i spelling exists «for one release only», `known-issues.md` §10), so W5 would be skipped. Count letters from the word's own `text`: `\p{L}` characters excluding `Lm` (the superscript alef and similar), computed the same way for every row. `width_per_letter` `low` and `high` are **calibrated per riwayah on the first run** and recorded with the digest (as the Hafs run did: 0.17 and 3.3).
- `letters` in `QuranTextWord` becomes «letter count» with the source of the count named in the PHPDoc; Hafs keeps `rasm_imlai`.
- **Debris contours.** Qalun has 10,184 empty movetos and 13,995 contours that collapse to a point at 1/32 (step 12 C5), Shu'bah 4,603 and 7,292 (every one at most 0.028 unit across, which is source debris, not artwork). They must not disturb the split. Rule (per edition, a config number): a content contour whose box is at most `debris_extent` (0.03 unit) in both directions is **excluded from the word split and from the box**, then attached as a loose contour to the nearest word on its line (step 13 A3 step 2), so every subpath is still claimed (W10). The count per page goes in the report. Measure before building: how many debris contours per riwayah, and that none is inside a base-height group.

### 2. The gate, per riwayah

W1, W2, W3, W6 are hard failures, W4, W5 and W8 flag, as for Hafs (ADR 0090 decision 6), plus step 13's **W9** (an ayah mark per ayah that ends on the page), **W10** (contour integrity) and **W11** (sajda lines: Hafs gives exactly 15; the count is reported for each other riwayah and compared with the sajdah ayahs in its own numbering). W7, the developer's sample, is part of the sign-off. The run writes the same report: counts, flagged lines, an HTML review sheet.

Expectations from the Hafs run, to size the work and to check the first result against: Hafs needed 214 reviewed lines out of 8,820 (about 2.4%), 212 corrected by an override, five W8 lines fixed, one line left to the developer. The same method on a different riwayah will have a different number of such lines; **the first run's counts decide the effort**, and the report must give them before any override is written.

### 3. Developer review sheet per riwayah

As Hafs: the `WordBoxReviewSheet` overlay for flagged lines (W2, W3, W4, W5, W8, an applied or refused override, a loose attachment), the **30 random unflagged pages** (W7, zero errors allowed; spread across the mushaf, drawn with a fixed seed recorded in the report), and step 13's re-wrapped 200% sheet. The developer signs off by setting `approved_word_boxes.{key}` and `approved_word_contours.{key}` to the run's digests. **The agent never sets them.** Four sheets: one per riwayah, handed over one at a time, in the publish order below.

### 4. Overrides

`word-box-overrides-{key}.json` follows the existing format (`overrides` with `groups` and `loose`, `needs_developer`, `word_lines`). An override names the line's contours by their index in the **normalised** per-line list (as the Hafs file does), and the build refuses an override whose counts do not match. No override is hand-written by the agent without the sheet showing the line first.

### 5. Order of work and of publishing

1. **Shu'bah.** The numbering equals Hafs (`ayah-map` all `same`), so it is the lowest-risk first run and exercises the generalisation (W1 expected 0 pages, since it matches Hafs' ayah set).
2. **Warsh**, then **Qalun** (same count and layout family: Warsh and Qalun share a typesetting, `limitations.md`). Page 1 and the Fatiha basmala are the place to look. Qalun carries the most debris contours.
3. **al-Duri**, after the numbering decision.
4. After each riwayah: re-import if its config changed, `mushaf:build-word-boxes {key}`, developer sign-off, `mushaf:publish {key}` (the pack gets `has_word_boxes` and `has_word_contours`). Per ADR 0090, production publish runs only after the developer approves, by the coordinator.

### 6. What does not change

- The page artwork, the regions and the TQP pages. The Hafs boxes and digest.
- The app: it reads `has_word_boxes` and `has_word_contours` per pack (step 13 B1) and nothing else; **no app change is part of step 14.** The recited-word pill needs audio, which these riwayat do not have; their boxes serve zoom and nothing else. (Pill and follow for a non-Hafs reciter stay under ADR 0090 decision 12, a later ADR.)
- Non-Hafs accessibility labels stay «surah name and ayah number» until step 15 (ADR 0100).

## Tests (Pest)

- `WordBoxBuilderTest` (extend): the guard still refuses an edition without a `word_box_riwayat` entry; a four-edition synthetic fixture runs with empty `position_splits`; the Hafs digest is unchanged.
- Letter-count unit test (`\p{L}` minus `Lm`, Extended-B letters count one each).
- Debris rule: a 0.02-unit contour is attached to the nearest word, never alters a box, and W10 stays 0.
- Numbering overlay (only when option (a) is chosen): a synthetic ayah split moves later ayahs by one, leaves the text untouched, refuses to apply when its anchor word is not where it says (as `word_lines`).
- Real-cache parity (skipped when the cache is absent): W6 is 0 for Warsh, Qalun and Shu'bah on all 604 pages; for al-Duri it fails exactly on pages 562–564 until the overlay exists.

## Release blockers

- **RB-A: al-Duri numbering** (developer).
- **RB-B: each riwayah's sign-off** (word boxes digest and contour digest), W7 sample with zero errors.
- **RB-C: attribution text** for the quran-text data in the credits (step 15 decides it for the text; boxes carry the same credit line as Hafs).
- Step 13 must be built, or the contour half of this work has nowhere to go.

## Open questions for the developer

1. **al-Duri's numbering** (options a, b, c above), and whether you can check the 1443H printed al-Duri for the number of ayahs in al-Mulk.
2. **The publish order** (Shu'bah, Warsh, Qalun, al-Duri), or one riwayah at a time as you prefer?
3. **Review load.** Each riwayah means a sheet of flagged lines plus 30 random pages. Is that acceptable for four more riwayat, or do you want a smaller sample for the three that match Hafs' layout closely (accepting a lower W7 bar)? The planner recommends keeping 30: the bar is yours, and the first run's flag count says how heavy it is.
4. **QUL.** Please confirm on `https://qul.tarteel.ai` whether a Warsh, Qaloon, Doori or Shuba mushaf layout exists (the planner could not open the resources page); it would be an independent check of quran-text's lines.
5. **Contacting quran.ws** about the al-Duri release and the origin of the v3.0 documents (their `docs/sources.md` calls it «a real gap»).

## Risks

- quran-text is «Beta», its lines are «reconstructed», and the v3.0 documents have no recorded origin; the gate is what protects the boxes.
- Qalun and Shu'bah debris contours and unusual page structure can move the W2 count well above Hafs'.
- A 12 Nov finding about lines is being relied on for four riwayat the planner could re-check only at the ayah level (0 mismatches on three riwayat; al-Duri 3 pages); the first run measures W1.

## Report back

Counts per riwayah (W1–W10, flags, overrides needed, debris contours, loose attachments), the calibrated `width_per_letter`, the page 1 treatment, the sheets' links, and anything in the data that disagreed with this plan.
