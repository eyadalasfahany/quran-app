# Step 13 — Page zoom in Mushaf mode: the printed word shapes re-wrap into bigger, shorter lines (ADR 0090, amendment of 26 Nov 2026, item 9)

**Status (26 Nov 2026):** Parts 0, A and B done and committed (`03418c75`). **Part C is next**; the contour data is `pending_review` until the developer approves the C0 sheet.

Branch: `main` (check with `git branch --show-current`). Stage and commit nothing. Read `.claude/agent-rules.md`, root `CLAUDE.md`, `apps/api/CLAUDE.md` (and `apps/api/.ai/rules/index.md`) and `apps/mobile/CLAUDE.md` first. Do the parts in order: **0 (checks and frames), A (API), B (device), C (measure and gate)**. One part per review. Part B may start only after Part A's gate passes, because the device reads the new pack tables.

**Depends on:** step 7 (Skia page), step 8 (settings), step 12 (TQP1: the pack and the decoder it builds on). **Step 11 (release) waits for it.** Written 26 Nov 2026 by the planner; implementation goes to a Haiku subagent from this brief, and the orchestrator reviews against it.

## What changed in this brief (read first)

The first version of this step (zoom the whole page, pan sideways in a horizontal scroll view) is **withdrawn**. Developer, 26 Nov 2026: «I don't want scroll X.. I want when zooming we may show less words per line so words are bigger.» So:

- At **100%** the page is the exact printed page (the TQP1 path drawn as today, lines end as printed).
- Above 100% (up to **200%**, 25% steps) the **printed word shapes themselves** (the contours of the artwork, not a font) are laid out again in shorter, bigger lines on the same page width. Same calligraphy, re-wrapped. **No horizontal scrolling anywhere.**
- Until a riwayah has approved word data (step 14), its page stays at 100% and zoom is unavailable there. At step 13 only Hafs has it.
- This replaces the old «Decided defaults» 1 and 2 (pinch scales the page around the pinch point; a horizontal scroll view pans). Old items 3 to 8 are kept below where still true.

## Rests on

- ADR 0090 «Amendment, 26 Nov 2026», item 9 (this change), items 3 (zoom, as amended by item 9), 7 (full-width pages) and 8 (landscape pill); decisions 5 and 6 (word boxes, gate W1–W8, approved digest), 8 (Skia), 10 (accessibility). Spec §4 «Mushaf page sizing», §12 «Mushaf rendering» (edited with this step).
- Root `CLAUDE.md` non-negotiables 1 (the artwork is never altered: this step moves word shapes, it never edits one), 5 (`useWindowClass()`; zoom steps are the same on every window class), 7 (all strings in i18n), and the design flow (ADR 0087).
- Code read for this brief: `apps/api/app/Domains/Mushaf/Services/WordBoxBuilder.php`, `WordBoxes/{PageContours,LineOrder,LineBands,SvgPathBounds,WordSplitter,WordBoxOverrides}.php`, `Packs/{SvgMushafPackBuilder,SvgMushafPackWriter}.php`, `Packs/Tqp/*`, `config/mushaf.php`, `resources/svg-mushaf/word-boxes-hafs.json`; `apps/mobile/src/features/reader/mushaf-svg/*`, `components/{MushafSvgPage,MushafPinch,MushafSvgContainer,MushafScrollView}.tsx`, `screens/ReaderScreen.tsx`, `settings-model.ts`, `settings/components/FontScaleStepper.tsx`, `core/mushaf-pack/SvgMushafPackReader.ts`.

## Rules for this step

- **The raw SVG is never altered, and no contour is edited, re-drawn or re-shaped.** A word moves as a rigid piece (a translation, plus one uniform scale only for a title block, below). Reading «each word = the contours the builder assigned to it» is a re-arrangement of the artwork, not an edit of the Quran text (non-negotiable 1). Say so in the report.
- **Word boxes do not change.** The approved digest `8944a6b3…` (`mushaf.approved_word_boxes.hafs`) must be identical after Part A. If it changes, stop and report. The new contour data has its **own** digest and its **own** developer approval (Part C0).
- **No Quran text, no artwork in tests or fixtures** (`.claude/agent-rules.md`): synthetic SVGs marked `FIXTURE — not artwork`. Real-page checks run from the local cache (`apps/api/storage/app/private/sources/svg-mushaf/<commit>/mushafs/<folder>/kfqc/svg/NNN.svg`), skip when it is absent, and check nothing in.
- **No new dependency**, in either app. Do not change `PackSchema::VERSION`. **`SVG_MUSHAF_VERSION` stays 2** (developer, 26 Nov 2026: nothing that shipped reads `svg_mushafs` packs; the new tables are additive and the new `meta` keys are optional, and a pack without them simply has no zoom).
- Every new component is its own file with a colocated test; screens only compose (`apps/mobile/CLAUDE.md`). Every string in `ar.json` and `en.json`.

## Decisions (developer, 26 Nov 2026; do not reopen)

1. No sideways scrolling. The zoomed page is word shapes re-wrapped into lines, on the same width.
2. 100% is the exact printed page; zoom runs 100%–200% in 25% steps; pinch and the text-size stepper both drive it; **one global `mushafZoom`** persisted in the `reader.settings` MMKV JSON (default 1; clamped to [1, 2]; snapped to 0.25).
3. The other riwayat get word data first (step 14). Until a riwayah has approved word data its page stays at 100% and the stepper says zoom needs word data.
4. Frames are pre-approved: draw, then implement at once. Captions end «Approved by the developer, 26 Nov 2026», never «(بانتظار الموافقة)».

## Decided defaults (planner, 26 Nov 2026; change only if the developer says so)

Kept from the first version, where still true: Reduce Motion means no animated step (zoom jumps); long press and tap on an ayah behave as at 100%; the full-screen toggle (ADR 0071) is unchanged; the swipe-back from the screen edge is unchanged (there is no horizontal scroll view now); a zoom change keeps the ayah at the top of the screen in place, as rotation does; the stepper is the accessible zoom control.

New defaults:

1. **Zoom is a pinch in steps.** The pinch is step-wise like today's `MushafPinch` (no live transform): the start level times the pinch scale, snapped to 0.25, written to the store when the step changes. A hold-the-previous-drawing rule covers the gap (B6).
2. **Justification** (the printed page justifies with kashida inside words, which a re-wrap cannot do; so the re-wrap stretches gaps only): lines are balanced by minimum raggedness (B2); a gap may stretch to at most `GAP_STRETCH_MAX = 6.0` page units beyond its natural width; a line that would need more is **not justified** (right-aligned, the start of a line in Arabic) instead. A paragraph's last line is justified only if the printed last line of that paragraph was full width (at least 97% of the page's text width). A paragraph whose printed lines are not mostly full width (pages 1 and 2 print short centred lines) lays out **centred and ragged**. Open question 1 asks whether the developer wants other values.
3. **Zoom steps are the same on every window class** (100, 125, 150, 175, 200%).
4. **The flowed Tanzil view is no longer a large-text view.** `mushafView()` no longer looks at `fontScale`. `HafsMushafList` stays as the **fallback when a riwayah's pack is not in the manifest and not installed** (`svgShown` false, e.g. a first launch offline), because `ReaderScreen` uses it for that today (line ~200). Open question 2 asks whether the developer wants that fallback kept.

## Contradictions found in the repo (list them in the report; none is silently resolved)

- ADR 0090 amendment of 26 Nov 2026, item 3 (and spec §4, §12) say a page wider than the window «must pan» and cap the page at 600 pt: both are superseded by this step (item 9) and by item 7 (no cap). This step edits the ADR and spec text; `step-13` (this file, old version) and spec §4 «Zoom (proposed…)» are replaced.
- `ReaderScreen.tsx` line ~486: `MushafPinch maxScale={view === 'svg' && shownMushaf !== 'hafs' ? 1 : FONT_SCALE_MAX}` caps a non-Hafs pinch at 1×. That already matches decision 3 (no zoom without word data) and is kept in spirit: the cap now comes from `zoomAvailable`, not from the riwayah key.
- `WordBoxBuilder` (`KEY = 'hafs'`, throws `UnknownSvgMushafException` for any other key) and its docblock «Builds the Hafs word boxes»: step 14 generalises it. This step must **not** weaken that guard.
- `apps/mobile/CLAUDE.md` still says «font size derived from it» for the Mushaf page width: wrong since the amendment of 15 Nov; fix the sentence (the page width follows the column; zoom is `mushafZoom`).

## Part 0 — frames and checks

### 0.1 Frames (ADR 0087; pre-approved)

Draw each in `screens/frames/core/` by copying `Mushaf.html` (or `ReaderSettings.html`), add its `gx-fig` block to `screens/index.html` with the caption ending «Approved by the developer, 26 Nov 2026», rebuild (`python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`), review at `design/core/<Screen>/index.html`, never hand-edit `design/`, run `npm run check:html -w @quran/design-tokens`. Frames use placeholders, no real Quran text (agent rules): draw a page of marked placeholder words as existing `Mushaf.html` does.

| Frame id | What it shows |
| --- | --- |
| `MushafZoom150` | Hafs, compact (390 × 844), zoom 150%: shorter, bigger, mostly justified lines on the full page width, no horizontal scroll bar, the page's ayah-end ornaments after their words, a mid-page surah start with its title and basmala centred on their own lines |
| `MushafZoom200` | the same page at 200%: about 4 to 5 words a line, two lines ragged because the gap cap was hit |
| `ReaderSettingsMushafZoom` | the settings sheet in Mushaf mode: the row «تكبير الصفحة» with the stepper showing «١٥٠٪» (the `FontScaleStepper` look, percent label, glyphs «أ−» «أ+») |
| `ReaderSettingsMushafZoomUnavailable` | the same row for a riwayah without word data: the stepper disabled (steps at disabled opacity) and the hint below it |

Landscape and expanded windows need no extra frame: the same layout runs at the wider width (the review link's `sizes=compact%2Cmedium%2Cexpanded%2Clandscape` shows them; derived variants are drafts).

### 0.2 Copy (proposed; the developer confirms in the frame review)

| Key | ar | en |
| --- | --- | --- |
| `reader.settings.mushafZoom` | «تكبير الصفحة» | "Page zoom" |
| `reader.settings.mushafZoomValue` | uses `formatPercent` as `FontScaleStepper` does | same |
| `reader.settings.zoomIn` / `zoomOut` | «تكبير الصفحة» / «تصغير الصفحة» (accessibility labels of the two buttons) | "Zoom in" / "Zoom out" |
| `reader.settings.mushafZoomUnavailable` | «التكبير متاح للروايات التي تتوفر بياناتها كلمةً كلمة. هذه الرواية ستدعمه لاحقًا.» | "Zoom is available for riwayat that have word-by-word data. This riwayah will get it later." |

### 0.3 Check: contour order on the real artwork (planner ran it, 26 Nov 2026, with a Python port; an approximation until the cache test in A2 reruns it)

**The real rule** (`SvgPathBounds::contours`, read in full): a contour starts at a moveto (`m` or `M`) and is emitted if at least one drawing command follows; it ends at a `z`, at the next moveto, or at the end of the path data. A moveto that draws nothing is not a contour. A **drawing command after a `z` with no moveto starts a new contour at the current point**, and TQP has no `M` for it: no such case exists in the 300 pages sampled (60 random pages of each riwayah, 0 cases), and **`TqpSubpaths` throws if it ever appears** rather than guess.

Over all 604 pages of each riwayah, with the spike's `tqp.py` (`page_pieces`, `abs_segments`), counting content movetos against movetos that draw something:

| Riwayah | Pages where the two counts are equal | Empty movetos |
| --- | --- | --- |
| Hafs | all 604 | 0 |
| Warsh | 603 (not page 2) | 1 |
| Qalun | 3 | 10,184 |
| Shu'bah | 14 | 4,603 |
| al-Duri | all 604 | 0 |

In every riwayah of every page, **all `ayah_markers` pieces come before `#content` in document order**, so TQP's subpath numbering starts with the ayah marks. About 94% of subpaths are not closed by `z` (they end at the next moveto). Hafs has no empty moveto, but **the other three do** (Qalun and Shu'bah most): contour indices must never be computed by offset arithmetic. The builder emits TQP subpath indices directly (A2, A3). Hafs pages have 1, 2, 146 or 162 content pieces: a page's contour is the subpath of any content piece, in document order.

**Sajda lines** (planner's scan, Hafs pages 3 to 604, content contours at least 33 units wide and at most 5.5 units high): exactly **15 contours on 15 pages** (the fifteen sajdah ayahs), all 0.9 unit high and 47 to 116 units wide. Fourteen lie inside one word's box; **the one on page 293 (line 4) is 115.5 units wide and crosses three words' boxes**, and the overrides file already records it as a `loose` contour of that line (`293:4`: «a sajda line ... »). A re-wrap that carried such a line with a single word would leave it hanging over the wrong words: rule in A3 step 3.

## Part A — API: which contours belong to which word

### The data model (decided; measured on a scratch SQLite, 26 Nov 2026)

Each word is a set of **TQP subpath indices** (the k-th subpath of the page's TQP stream, 0-based, counted over every piece in document order, ayah marks first; a subpath starts at an `M`). The pack carries them as **run-length rows** in two small tables. A first design (one table of 14 columns with four REAL bounds, about 84,000 rows) measured **5.8 MB** on a scratch SQLite, which would put the Hafs pack near 51.6 MB: **rejected**. The words' boxes are already in `word_boxes`, so the word table carries no bounds and no page:

```sql
-- one row per run of a word's subpaths; joined to word_boxes by (surah, ayah, position) for the page, line and box
CREATE TABLE word_contours (
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL, position INTEGER NOT NULL,
  first INTEGER NOT NULL,    -- first subpath index of the run
  count INTEGER NOT NULL,    -- subpaths in the run
  flag  INTEGER NOT NULL,    -- 0 grouped by the builder (inside the box); 1 a loose contour attached to this word (outside the box)
  PRIMARY KEY (surah, ayah, position, first)
) WITHOUT ROWID;

-- blocks, ayah marks and sajda lines: the only things the layout needs bounds of; integers in 1/32 page units, RAW page space
CREATE TABLE contour_blocks (
  page INTEGER NOT NULL,
  kind INTEGER NOT NULL,     -- 1 block (title, basmala or other full-line art), 2 ayah mark, 3 sajda line (an annotation: its subpath is also in a word's runs), 4 hizb ornament (margin; anchored to a word, never in its runs)
  ord  INTEGER NOT NULL,     -- 0-based within (page, kind): blocks top to bottom, marks and sajda lines by document order
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL,   -- 0 for a block
  first INTEGER NOT NULL, count INTEGER NOT NULL,
  x0 INTEGER NOT NULL, y0 INTEGER NOT NULL, x1 INTEGER NOT NULL, y1 INTEGER NOT NULL,
  PRIMARY KEY (page, kind, ord)
) WITHOUT ROWID;
```

- Measured on the scratch SQLite: `word_contours` for 77,433 words about **1.25 MB**; `contour_blocks` for about 7,000 rows about **0.24 MB**. Expected Hafs pack: 45.76 + about 1.5 = **about 47.3 MB**. Bar: **49 MB** (C1). The page of a word comes from its `word_boxes` row (`word_boxes_page` index), so no `page` column.
- A word with several runs (a W8 line, an override, a loose attachment) has several rows. Positions without a `word_contours` row are covered by the nearest earlier position of the same ayah that has rows: this is how **15:7** works (quran-text prints one word where the app counts two; the app's positions 1 and 2 share the box, and only position 1 has contour rows, so the word is placed once and both positions get its rectangle).
- `meta` gains `has_word_contours` (`'1'` only when the contour data is approved (Part C0); or when published locally with `--with-pending-contours`) and `word_contours_digest`. The tables exist in every pack and are filled only then.
- Bounds are in the **raw page space** of `word_boxes` and `regions` (the viewBox origin included). **TQP pages are baked to a zero origin** (page 1 of every riwayah and Hafs page 2 have a non-zero raw origin; the pack's `pages.origin_x/origin_y` hold it). The device subtracts the origin from every raw rectangle before laying out (B5), exactly as `useMushafPageLoader.pageData` does for regions and boxes. The API computes bounds with `PageContours`' own chain (raw space), never from TQP data, so no origin is added back on the PHP side.
- **1:1** is the line the overrides file records as `needs_developer` (its note: the last two words are merged, the first letter of the last word is a box of its own, one long contour runs under both words and could belong to either). **State in the report how the contour map treats that line** (the builder's own split, which the developer accepted as «correct as built», with the long contour in whichever word it already belongs to). Do not hand-correct it.

### A1. Carry the original contour index through the builder (no ordering change)

- `PageContours::fromSvg` already returns contours in document order; the **index into that list is the content contour index**. Add `PageContours::indexed(string $svg): list<array{index: int, box: Box}>` or keep `fromSvg` and carry indexes in a parallel list in `WordBoxBuilder::page()`; either way **no existing ordering, grouping or box computation changes**.
- `WordBoxBuilder::page()` (lines 269–277): when it fills `$perBand[$band][] = $contour`, also fill `$perBandIndex[$band][] = $i`.
- `LineOrder::normalise()` reverses and merges runs, so a group's indexes (`$groups`, and the overrides' `groups` and `loose`) index the **normalised** list. Return the permutation: `normalise()` gains an `order` key, `list<int>`, where `order[j]` is the position in the **input** list of the contour now at position `j` (input is the `$perBand` list in path order). Compute it by permuting an index array exactly as the contours are permuted (reverse, then the run merge). Existing keys and behaviour stay.
- A word's content contours = `perBandIndex[band][order[t]]` for each `t` in its group; a loose contour (override `loose`) = the same mapping of its normalised index.
- **Test (the gate that the change is safe):** the digest of the Hafs word boxes is still `8944a6b3f72874e9a77ea8e708f7d06b68f6741ee55f1d606167870835a04553` and `word-boxes-hafs.json` is byte-identical after a rebuild (`php artisan mushaf:build-word-boxes hafs` from the local cache; the existing `WordBoxBuilderTest` fixtures must keep passing unchanged, plus one new assertion that `order` is a permutation of `0..n-1` on a reversed line and on a line with a stray contour).

### A2. Content contour index → TQP subpath index

New `apps/api/app/Domains/Mushaf/Packs/Tqp/TqpSubpaths.php`: `map(string $svg): array{content: list<int>, marks: list<array{first: int, count: int}>, subpaths: int}`.

- Walk `TqpPageScope::pieces($svg)` in order (extend each piece with `section: 'markers'|'content'` and `group: int|null`, the ordinal of its `ayah-mark` group; the encoder ignores the new keys, so the golden `.container.bin` files do not change).
- For each piece, walk `TqpPathParser::segments($d)`; **every `M` increments the subpath counter**. A content moveto is a content contour **only if at least one drawing command (`L`, `Q`, `C`, or their expanded forms) follows it before the next `M`** (this is `SvgPathBounds::contours`' rule: a contour ends at `z`, at the next moveto or at the end of the path; a moveto that draws nothing is not a contour). `content[c]` is the counter value at the c-th such moveto. If a drawing command follows a `Z` with no `M` (SVG's implicit new subpath, which `SvgPathBounds` counts as a contour and TQP has no `M` for; 0 cases in 300 sampled pages), **throw `SvgMushafSourceException` naming the page**. Cross-check: per path, the number of mapped contours equals `count(SvgPathBounds::contours($d))`; a mismatch throws (this is what catches Qalun's 10,184 empty movetos if the rule ever drifts).
- `marks`: for each `ayah-mark` group (ornament path and number path are adjacent pieces of one group), the run `first` = counter at the group's first moveto, `count` = subpaths in the group.
- **Tests** (`tests/Unit/Mushaf/Tqp/TqpSubpathsTest.php`, synthetic SVGs): ayah-mark pieces number before content; an empty moveto is skipped in `content` but counted; two content pieces continue the numbering; `Z` then a relative `m`; the cross-check throws when the parser and `SvgPathBounds` disagree (use a path with `Z` followed by a drawing command and no `M`). Real-cache parity (skipped when the cache is missing): for pages 1, 2, 3, 50, 300, 604 of Hafs and one page of each other riwayah, every mapped contour's box from `TqpPathParser` absolute segments (baked matrix applied, origin shift added back) equals `PageContours`' box within `1/32 + 1e-6` on each side, and the mapped count equals `count(PageContours::fromSvg)`.

### A3. The contour map builder

New `apps/api/app/Domains/Mushaf/WordBoxes/ContourMapBuilder.php` (`WordBoxBuilder::build()` calls it after the boxes, passing what it has: per page the lines' groups with original indexes, loose contours, out-of-band contours, regions, words). It returns `ContourMap` (a record: per page the word runs and the block rows), and **never changes a box**.

1. **Words.** For each word group: the TQP subpath of each of its content contours (A1 + A2), merged into runs of consecutive indexes (`flag 0`).
2. **Loose contours** (the override file's `loose`: in Hafs 48 contours on 15 lines, whose reviewed reasons are: a pause mark of the line **below** (9 lines), of the line **above** (4), the **hizb ornament** (3: pages 472, 499, 517) and the **sajda** line of 293:4). They are by definition marks of a **neighbouring line's** word or an ornament, so «nearest word on the same line» would pull a neighbour's fragment onto the wrong word, the failure the developer wants avoided. Rule: attach each loose contour to the word, **on this line or the line above or below**, whose own non-loose contour extents (the union of the boxes of its grouped contours, 2D) are nearest to the contour's box (distance 0 when they overlap); ties go to the word on the right (the start of the line). The override entry may carry an explicit **`attach`**: `"loose contour index": "surah:ayah:position"` (new optional key in `word-box-overrides-{key}.json`; the build refuses an attach whose word does not exist on the page), which wins over the geometry. `flag 1`. **Every loose attachment (48 in Hafs) is listed on the review sheet with its target word**, and the three hizb ornaments are **not** attached to a word: **developer, 26 Nov 2026: «as printed»** — each hizb ornament is its own `contour_blocks` row (`kind 4`, hizb ornament, with its subpath run and bounds), drawn in the margin beside the re-laid line that holds the word it sits next to in print (the nearest word by the rule above gives that anchor; the ornament itself never enters a word's runs). Sajda lines likewise stay as printed (rule 3). The contours never enter any box.
3. **Sajda lines.** A content contour at most **1.5 units high and at least 33 units wide** is a sajda line (gate **W11**: Hafs must give exactly 15 on 15 pages; another riwayah's count is reported, not assumed). It stays in whichever word's runs it already belongs to (`flag 0`, or `flag 1` for 293:4), **and** a `contour_blocks` row `kind 3` records its subpath and bounds. The layout fuses every word on that printed line whose box overlaps the line by at least 50% of the word's width into **one unbreakable unit, keeping their printed offsets** (so the line stays over its words; 116 units at most, which fits `A = 162` at 200%). If the fused unit is wider than `A`, it scales as an over-wide word does (B2 step 4).
4. **Out-of-band contours** (`bandAt() === null`: the surah title calligraphy, the basmala line, anything else outside the text bands): sort by y-centre and cluster consecutive contours whose y-ranges overlap or are within **0.25 × the edition's line height** of each other; each cluster is a **block** (`kind 1`, run set, bounds = the union in raw space). Blocks are not classified title or basmala in the data: the layout treats all as «centred, own line, never broken», so no classification can be wrong. `ord` runs top to bottom.
5. **Ayah marks.** For each `ayah-mark` group (A2), compute the bounds of its subpaths with `PageContours`' chain (raw space) and find the ayah region (page polygons, `LineBands::pageRects`) that contains its centre; ties (marks on a shared edge) go to the ayah whose last word is nearest on the left in print. Gate **W9** (hard failure, like W1): the number of marks on the page equals the number of ayahs whose **last word is on this page**, every such ayah gets exactly one mark, and no mark is unmatched. Emit `kind 2` with `surah`, `ayah`.
6. **Integrity (hard gate W10, needs no new approval):** for every word, the union of the x-range of its `flag 0` runs equals the stored box `[x0, x1]` within 0.01; every in-band content contour of the page belongs to exactly one word run (`flag 0` or `1`) and every out-of-band content contour to exactly one block; every subpath index in `0..subpaths−1` is claimed exactly once by a word run, a block or an ayah mark (`kind 3` rows are annotations and are left out of this count). The check lists unclaimed or double-claimed indexes by page.
7. **Digest.** `contours_digest` = SHA-256 of the canonical JSON of all rows sorted by their keys, with the commit, the `word_boxes` digest and the algorithm version `1`. Config `mushaf.approved_word_contours` (`hafs` => digest) holds the developer's approval, as `approved_word_boxes` does. Statuses reuse `WordBoxesStatus`: `Failed` when W9, W10 or W11 fail, `Approved` when the digest equals the config value, otherwise `PendingReview`.
8. **Output.** Commit `apps/api/resources/svg-mushaf/word-contours-hafs.json` (keys, indexes and coordinates only; credit line as `word-boxes-hafs.json`). Mirror exactly how `word-boxes-hafs.json` is written and loaded into `svg_mushaf_word_boxes` (look at `WordBoxApproval`, `BuildWordBoxesCommand` and `SvgMushafWordBoxRepository`).

### A4. Storage

Where the word-box status lives: **`svg_mushafs`** (migration `2026_11_12_100003_add_word_boxes_status_to_svg_mushafs_table.php` adds `word_boxes_status` and `word_boxes_digest` to it; there is no `svg_mushaf_editions` table). New migration `2026_11_26_120000_add_contours_to_svg_mushafs.php`: add `contours_status` and `contours_digest` (nullable) to `svg_mushafs`, and create `svg_mushaf_word_contours` and `svg_mushaf_contour_blocks` (the pack tables plus `edition_id`, FK as `svg_mushaf_word_boxes` does). Models, repository contracts and Eloquent implementations follow the word-box ones (`SvgMushafWordBoxRepository`, `SvgMushafWordBox`). Check `apps/api/.ai/rules/migrations.md` and `models.md` first (additive migration only).

### A5. Pack

- `SvgMushafPackWriter::createSchema()`: add `word_contours` and `contour_blocks` (the DDL above) and `CREATE INDEX contour_blocks_page ON contour_blocks (page, kind, ord)` is covered by the primary key; `insertWordContour`, `insertContourBlock`.
- `SvgMushafPackBuilder`: when the edition's `word_boxes_status` is `approved` **and** `contours_status` is `approved`, write the rows and `has_word_contours = '1'`, `word_contours_digest`; otherwise `has_word_contours = '0'` and no rows. **Local-only flag `mushaf:publish {key} --with-pending-contours`** (next to `--without-word-boxes`; same refusal in production and the same guard text pattern, `SvgMushafPublisher` lines ~56 to 60): writes the rows when the contour status is `pending_review` (never `failed`) and sets `has_word_contours = '1'`, so the simulator can exercise zoom before the developer approves. The fingerprint includes the flag, so a local pack is never mistaken for an approved one. `SvgMushafPublisher`'s fingerprint gains `contours_digest` (an approval bumps a version; an unchanged one does not).
- `has_word_boxes` and the `word_boxes` table are unchanged.

### A6. Tests (Pest; `tests/Unit/Mushaf/`, `tests/Feature/Mushaf/`)

1. `LineOrderTest` (extend): `order` is a permutation; reversed line; stray contour; merge of runs.
2. `TqpSubpathsTest`, `ContourMapBuilderTest` (synthetic pages from `tests/Support/SvgMushafPackFixtures.php`: two lines, a title block above line 1, a loose contour that belongs to the line below, two ayah marks, a sajda-like thin wide contour over two words): words; loose attachment by 2D nearest across adjacent lines, and an explicit `attach` winning; blocks clustered by y with the 0.25 line-height gap rule; sajda annotation row and the layout-facing fusion data; W9 (a mark count one short fails); W10 (an unclaimed contour fails); W11 count; 15:7 has contour rows for position 1 only.
3. `SvgMushafPackTest` (extend): approved → rows and `has_word_contours = '1'`; boxes approved but contours pending → `has_word_contours = '0'`, no rows, **the word-box digest is unchanged**; the two tables exist in every pack; `--with-pending-contours` writes rows for `pending_review`, never for `failed`.
4. `SvgMushafPublishCommandTest` (extend): approving contours bumps the version; republishing unchanged does not; `--with-pending-contours` is refused when `APP_ENV=production`.
5. `WordBoxBuilderTest` (extend): the digest and output of the existing fixtures are unchanged after A1.

### A7. Gate for Part A (no review sheet needed; that is Part C)

`cd apps/api && composer qa` passes. On the Hafs cache: `mushaf:build-word-boxes hafs` gives digest `8944a6b3…` unchanged and `word-boxes-hafs.json` byte-identical; **W9, W10 are 0 and W11 is exactly 15 on 15 pages** on all 604 pages; the loose-attachment list (48 contours, each with its target) and the 1:1 treatment are in the report. The contour status stays `pending_review`. **The developer's review sheet and approval are Part C0, because the sheet is drawn by Part B's layout code.**

## Part B — device

### B1. Pack reader and page data

- `core/mushaf-pack/types.ts`: `WordContourRun = { surah: number; ayah: number; position: number; first: number; count: number; loose: boolean }`; `ContourBlock = { page: number; kind: 1 | 2 | 3; ord: number; surah: number; ayah: number; first: number; count: number; x0: number; y0: number; x1: number; y1: number }` (bounds converted from the stored 1/32 integers to page units on read).
- `SvgMushafPackReader`: `readonly hasWordContours: boolean` (meta `has_word_contours === '1'` and both tables exist: a pack from before this step has none, so guard with `sqlite_master`, as `hasWordBoxes` guards its table); `wordContoursForPage(page): WordContourRun[]` (`SELECT c.* FROM word_contours c JOIN word_boxes b USING (surah, ayah, position) WHERE b.page = ? ORDER BY c.surah, c.ayah, c.position, c.first`); `contourBlocksForPage(page): ContourBlock[]`; SELECT only, like every method.
- `zoomAvailable(reader): boolean` = `reader.hasWordBoxes && reader.hasWordContours` (pure helper in `mushaf-svg/mushaf-zoom.ts`).

### B2. The layout (new, pure, no Skia: `mushaf-svg/rewrap-layout.ts`)

`layoutPage(input: LayoutInput, zoom: number): PageLayout`, deterministic, no I/O. At `zoom === 1` it is not called (the original picture is drawn); a test asserts the caller never calls it for 1.

**Types**

```ts
// All rectangles are in the page's ZERO-ORIGIN space: the loader has already subtracted the pack page's origin from the raw boxes, bounds and bands (B5).
type WordUnit = { surah: number; ayah: number; position: number; covers: number; line: number;   // covers: 1, or more for 15:7 (positions without contour rows)
  box: Rect;            // the approved word box
  runs: readonly { first: number; count: number; loose: boolean }[];   // no bounds: the unit's extent is its box
  mark: { first: number; count: number; bounds: Rect } | null;         // the ayah ornament fused after the word (kind 2)
  sajda: { first: number; count: number; bounds: Rect } | null };      // a sajda line over this word (kind 3), for the fusion rule
type BlockUnit = { first: number; count: number; bounds: Rect };       // kind 1
type LayoutInput = { words: readonly WordUnit[]; blocks: readonly BlockUnit[];
  bands: ReadonlyMap<number, { y0: number; y1: number }>;  // printed line -> band, from the word boxes' y0 and y1
  viewBox: { width: 345; height: 550 } };
type Placed = { unit: WordUnit | BlockUnit; dx: number; dy: number; scale: number };   // a translation of the unit's original coordinates, plus a uniform scale (1 for words)
type PageLayout = { unitsWidth: number; unitsHeight: number;   // the recorded picture's size in layout units
  placed: readonly Placed[]; lines: readonly { y0: number; y1: number; wordRects: readonly PlacedWordRect[] }[]; regions: readonly PageRegionGeometry[]; wordRect(surah, ayah, position): WordBox | null };
```

**Steps (all lengths are page units; `z` = zoom)**

1. **Reading order.** Sort `words` by `(band.y0 of line, x1 descending)` (right to left: the start of an Arabic line is on the right). Interleave `blocks` by y-centre against the band centres. A block between two text lines splits the page into **paragraphs**; the lines above and below are separate paragraphs. The ayah mark of a word is fused to it (`WordUnit.mark`), so a word and its ornament are one unbreakable **unit**; its extent is `union(box, mark.bounds)`. **Sajda fusion:** every word on the same printed line whose box overlaps a `sajda` line's x-range by at least 50% of the word's width joins **one unbreakable unit** with the other such words, keeping their printed offsets (the unit's extent is the union of their boxes and the line's bounds). Loose attachments (`flag 1`) travel with their word and add nothing to its extent.
2. **Text width.** `B` = the page's widest printed line extent over all words: `max over lines (max x1 − min x0)` (about 325 for most Hafs pages; narrower on pages 1, 2 and surah-end pages), and `Lx` = the page's minimum `x0`. **`A = B / z`** is the line width in layout units.
3. **Natural gap.** Between two units that were neighbours on the same printed line: their printed gap `prev.x0 − next.x1` clamped to `[−1.5, 4.0]` (a negative gap keeps an interlocking pair interlocked; 19% of printed gaps are negative, median 1.64). Between units that were not neighbours (a printed line break): `1.6`.
4. **Break** each paragraph into lines by **minimum raggedness**: dynamic programming over its units, cost of a non-last line = `slack²` where `slack = A − (Σ extents + Σ natural gaps)`; a line with `slack < 0` is infeasible, except that a unit wider than `A` goes **alone** on its line and is scaled down uniformly to `A` (`scale = A / extent`; in Hafs 4 words are wider than 160 units, so at 200% only these); the last line of the paragraph costs 0. O(n²) per paragraph with n ≤ 161 words a page.
5. **Justify** each non-last line: extra per gap `e = slack / (units − 1)`; if `e ≤ GAP_STRETCH_MAX` (6.0) every gap grows by `e` (the line fills `A`), else the line keeps natural gaps and is right-aligned at `Lx/z`'s start edge. The last line of a paragraph is justified iff the paragraph's printed last line was at least 0.97 × `B` wide, else right-aligned. A paragraph whose printed non-last lines are less than 80% full width is **centred and ragged** (pages 1 and 2).
6. **Vertical.** Line pitch `P` = the median band height of the page's text lines (36.3 for Hafs; fall back to 36.3 with no lines). Line `i` of the layout has `y0 = top + i × P` where `top` is the printed first item's `y0 / z`; each word's `dy` aligns its printed band top to its new line top (`dy = newTop − band.y0`), so all words of a new line share the baseline their printed lines had. A block keeps its printed height and the printed gap above and below it (`gapAbove = block.y0 − previous line.y1`, `gapBelow = next line.y0 − block.y1`, each at least 0); a block is **centred** on `Lx + B/(2z)` and scaled by `min(1, A / blockWidth)` (a title about 250 wide at `A = 162` shrinks to 0.65 of its printed size in layout units, so it shows at 1.3× instead of 2×).
7. **Page size in layout units.** `unitsWidth = 345 / z`; `unitsHeight = top + content + bottom / z`, with `bottom = 550 − last printed item's y1`. The picture is drawn with the scale `z × (width / 345)` where `width` is the column width, so the page is always exactly the column wide; its height in points is `unitsHeight × z × width / 345`. Margins stay the same in points at every zoom.
8. **Regions at zoom.** For each ayah, one rectangle per laid-out line it occupies: x from its first to its last unit on that line (gaps inside the ayah included, ornament included), y the line's band. Convert to `PageRegionGeometry` (polygon points, `bounds`, `verseKey`, label point at the first rectangle) so `regionAt`, the washes, the ayah accessibility elements and the label stay the existing code. An ayah that continues from the previous page starts at the page's first line. `wordRect(surah, ayah, position)` returns the placed word's `WordBox`-shaped rectangle (`line` = the **laid-out** line index) and covers `position … position + covers − 1`.

**Tests** (`rewrap-layout.test.ts`, synthetic units; no artwork): single paragraph breaks where the DP says; a word wider than `A` alone and scaled; a gap-cap line is right-aligned, not justified; last-line rule both ways; a block splits paragraphs and centres; a negative printed gap is kept between neighbours; `covers = 2` yields one placed word and two positions; the ayah mark never separates from its word; a sajda line fuses the words under it and keeps their printed offsets (including the page-293 shape: one line over three words); regions union by line; `unitsWidth × z = 345`; determinism (same input, same output); `layoutPage` is never called at zoom 1 (assert in the caller test).

### B3. Splitting the page into word paths (pure parts and one Skia part)

- `mushaf-svg/tqp-subpaths.ts` (pure): `splitSubpaths(decoded: TqpDecoded): SubpathTable` with `starts: Int32Array` (absolute grid x, y of each `M`: computed with the same current-point rule as `tqp-decoder.ts`, an `M` after a `Z` is relative to the subpath start), `cmdFrom: Uint32Array` and `deltaFrom: Uint32Array` (offsets into `cmds` and `deltas`, length `n + 1`). Test against the golden fixtures of step 12 (`__fixtures__/tqp/*.ints.json`): the absolute start of every subpath equals the integers the Python reference gives.
- `page-picture.ts` gains `buildRunPath(decoded, table, first, count): SkPath` (builder (ii) of step 12: `moveTo(abs)` for the first, `rMoveTo` and the relative calls for the rest, then one `addPath` at the 1/32 scale) and a `WordPathCache` per page (word key → `SkPath`; **4 pages** capacity, separate from the 8-page model cache). The page's `SubpathTable` is built once per decoded page; the decoded page is already cached.

### B4. Drawing a zoomed page

- `recordZoomPicture(wordPaths, layout, color, key)`: one `PathBuilder` (even-odd), for each `Placed`: `addPath(path, translate(dx, dy) × scale)` (its subpath runs are already in the word's path in original coordinates, so the translation is in page units, applied around the unit's own origin: `matrix = [s, 0, 0, s, dx + (1 − s) × cx, dy + (1 − s) × cy]` with `(cx, cy)` the block's centre for scaled blocks, and `[1, 0, 0, 1, dx, dy]` for words), then record into an `SkPicture` of size `unitsWidth × unitsHeight`. Cached per `(page, zoom, color)`; **a zoom change drops every picture of the other zooms** (`clearPictures` already exists for themes; add `clearZoom(except)`).
- `MushafSvgPage` takes a `geometry: { unitsWidth, unitsHeight }` and a `layout: PageLayout | null`; the `Canvas` group transform is `scale = width / unitsWidth` (the existing `scaleFor(width)` generalised: `scaleFor(width, unitsWidth = 345)`, `pageHeightFor(width, unitsWidth, unitsHeight)`, `toPage`, `toScreen`, `pageItemHeight` all gain optional geometry arguments defaulting to the printed 345 × 550, so zoom 1 is byte-for-byte today's behaviour). At zoom > 1 `regions` and the pill rectangle come from the layout, not from the pack's polygons and word boxes (the washes, taps, accessibility elements and the pill already read `regions` and a `WordBox`).
- Everything else in `MushafSvgPage` (the layers, `appear`, the pill's slide) is unchanged. The pill slides between two words **on the same laid-out line** (`pillMove` compares `line`, which is now the laid-out line at zoom).

### B5. Loader, list and the anchor

- `useMushafPageLoader`: per page also loads `wordContoursForPage` and `contourBlocksForPage` (with `PageData`, SQL, cached 16 pages) and builds `LayoutInput` once, **in zero-origin space**: subtract the pack page's `origin_x`/`origin_y` (pages 1 and 2 are non-zero) from every box, band, block, mark and sajda rectangle, as `originOf` and `pageData` already do for regions and boxes; positions of a word with no contour row are given to the nearest earlier position of the same ayah (`covers`); a test with a non-zero origin proves a block lands where the artwork draws it; exposes `layout(page, zoom): PageLayout | null` (computed on demand, memoised per `(page, zoom)`, dropped when the zoom changes), `zoomedPicture(page, zoom, color)`, and `itemHeight(page, zoom)`.
- **Item heights.** `MushafSvgList`'s item height at zoom `z` is `pageHeightFor(width, unitsWidth, unitsHeight)` + the divider when the page's layout exists, otherwise the estimate `z × pageItemHeight(width, divider)`. Read how `MushafSvgList` and FlashList size items today (the height is derived from the width in `page-layout.ts`) and use FlashList's re-measuring; **the visible pages and the three each side are laid out first** when the zoom changes (idle tasks nearest-first, as the loader already queues loads), so the estimate is replaced before the reader scrolls there.
- **Anchor.** A zoom change is handled like a rotation: record the top ayah (`mushaf-top-ayah.ts` / `useReadingAnchor`) before the change and scroll back to it after the new heights are known. Find the exact existing path for rotation in `MushafSvgList` and reuse it; do not add a second mechanism. Test: the top ayah is the same ayah after 100% → 150% → 200% → 100%.
- `MushafPinch`: `maxScale` and `fontScale` go; it drives `mushafZoom` in steps (`pinchMushafZoom(start, scale)` = `clampMushafZoom(snap(start × scale))`) when `zoomAvailable`, and does nothing when not. It still runs alongside `MushafScrollView` (`MushafPinchContext`) as today.
- `ReaderScreen`: `mushafView()` loses `fontScale` and the Hafs-only branch (it returns `'flowed'` only when `svgShown` is false, per default 4); `maxScale` is removed; `mushafZoom` and `zoomAvailable` flow to `MushafSvgContainer` → `MushafSvgList` → the pages.

### B6. Holding the previous drawing

When a zoom step arrives, a page whose new picture is not ready keeps drawing its previous picture and geometry (stretched to the new width) for at most one idle cycle; it never shows the skeleton for a page that already had a picture. Gate (C2): no blank page frame during a step.

### B7. Settings and the stepper

- `settings-model.ts`: `MUSHAF_ZOOM_MIN = 1`, `MUSHAF_ZOOM_MAX = 2`, `MUSHAF_ZOOM_STEP = 0.25`, `clampMushafZoom(value)` (snaps to 0.25, defaults 1 for a non-number), `mushafZoom` in the model and the MMKV JSON read and write (a blob without it reads 1). `fontScale` is untouched (Reading and Focus).
- New `settings/components/MushafZoomStepper.tsx` (+ test), the look and structure of `FontScaleStepper.tsx` (glyphs, percent label via `formatPercent`, 44 pt targets, `theme.opacity.disabled`): `value`, `onChange`, `disabled`, props; steps `±0.25`; at min/max the step button is disabled. Test: render, both directions, the percent text in `ar` and `en`, disabled state with `accessibilityState`, labels.
- `ReaderSettingsSheet`: in Mushaf mode show the zoom row (`MushafZoomStepper`, label `reader.settings.mushafZoom`, the hint `…Unavailable` when `!zoomAvailable`); in Reading and Focus the font row as today. Settings › Reading keeps `fontScale` only (the zoom control lives where the page is; note it in the report).
- Pure `mushaf-zoom.ts` (+ test): `clampMushafZoom`, `pinchMushafZoom`, `zoomAvailable`, `stepMushafZoom(value, direction)`.

### B8. Tests (Jest, colocated; never two jest runs at once; `--maxWorkers=2`; kill orphans first)

`mushaf-zoom.test.ts`, `rewrap-layout.test.ts`, `tqp-subpaths.test.ts`, `page-picture.test.ts` (word-path cache capacity, `clearZoom`), `MushafSvgPage.test.tsx` (zoom 2: the canvas group scale follows `unitsWidth`; a tap in the laid-out region resolves to its ayah; the pill rectangle comes from the layout; accessible elements keep their labels in `ar` and `en`; zoom 1 renders from the pack polygons as before), `MushafPinch.test.tsx` (steps; no-op when unavailable), `MushafZoomStepper.test.tsx`, `ReaderScreen.test.tsx` (no flowed view above 1×; flowed only when the pack is not shown), `SvgMushafPackReader.test.ts` (`hasWordContours`, a pack without the table), `settings-model.test.ts`.

Run: `cd apps/mobile && npm run lint && npx tsc --noEmit && npm test -- --maxWorkers=2 && npx expo-doctor`.

## Part C — review sheet, approval, measure and gate

0. **The developer's sheet and approval (after Part B2; needs `layoutPage`).** Produce, from the device's TypeScript layout, a throwaway script in the scratchpad (not committed) that runs `layoutPage` on `word-contours-hafs.json`, `word-boxes-hafs.json` and the decoded TQP pages and draws SVG: for **at least 30 spread pages plus every page that has a loose attachment, a sajda line, a 1:1 or W8 line**, side by side, the printed page and the page re-wrapped at **200%**. Beside each loose attachment (48 in Hafs) show its target word; the three hizb ornaments (pages 472, 499, 517) get their own panel. Sign-off rules: zero cut marks, zero marks pulled in from a neighbour, zero words in the wrong order, every ayah-end ornament after the right word, every sajda line over its words. One error fails the run (as W7). The coordinator hands the sheet over as a link. **The developer approves; do not set `approved_word_contours` yourself.** Until then the simulator runs on a local pack made with `mushaf:publish hafs --with-pending-contours`.
1. **Real sizes.** After Part A on the local database (one riwayah at a time, `nice`): `content_packs.size_bytes` for Hafs, and the row counts and bytes of `word_contours` and `contour_blocks` from the stored `.sqlite`. Planner's scratch estimate: +1.5 MB, so about **47.3 MB** (45.76 MB before this step). Bar: **49 MB**; above, stop and report.
2. **Speed on the booted iPhone 17 Pro simulator** (never create a simulator; no Android; shut the simulator down when finished): per page, record `splitSubpaths` ms, word-path build ms, `layoutPage` ms at 150% and 200%, picture ms, and **the sum for the visible pages on a zoom step** (hold-the-previous-drawing cases counted). Gates: the 20-page animated scroll at 150% and 200% holds **60 fps with the longest frame under 24 ms** (the step 1 and 12 bar), decode and layout run only in idle tasks, a zoom step paints the visible pages within **150 ms** with no blank frame. If a gate fails, report; do not change the layout rules to hide it.
3. **Baseline check (decides a question the data cannot answer).** The layout aligns words by their printed **band top**. Measure on 20 spread pages at 200% the vertical jitter of the lowest point of the full-height contours within a laid-out line (it should be under 0.5 unit); show three pages as before/after crops in the sheet. If the jitter is visible, **stop and report**: the fallback is a per-word `base_y` column in `word_contours`, which needs the builder to compute it and a new approval.
4. **Contour integrity on all five riwayat** (Part A's real-cache parity run extended): the empty-moveto counts match 0.3's table, `TqpSubpaths::map` is accepted on all 604 pages of each riwayah (Hafs only goes into a pack; the rest prove step 14's input), and W11 is reported for each riwayah.
5. **Visual.** Frame vs simulator screenshots at 390 × 844 for `MushafZoom150`, `MushafZoom200`, the two settings frames (`python3 packages/design-tokens/scripts/frame-shot.py <frame-id> <out.png>`; `xcrun simctl io booted screenshot`), Arabic and English, compact and an expanded window (an iPad is not required: the review link's sizes plus the simulator's landscape).
6. **Accessibility pass.** VoiceOver reads each ayah as one element at 100% and 200% (labels unchanged), the stepper reads its percent, Reduce Motion gives no animated step.
7. `npx expo-doctor`, `node .github/scripts/npm-audit.mjs`, `composer audit`: nothing new.

## Risks to report

- **Kashida.** A re-wrap cannot stretch inside a word, so at 200% more lines are ragged than in print; the cap (6.0 units) is a guess from the median printed gap (1.64) and p90 (3.78).
- **Baseline** (Part C3).
- **Heights:** the estimate-then-exact height can move the page under the reader's finger; mitigated by laying out near pages first.
- **Loose attachments, sajda lines, hizb ornaments and 1:1/W8 lines** are the places a mark can still sit wrong; the review sheet lists every one. The nearest-word rule is geometry, not a fact from the source.
- **Memory:** word paths for 4 pages plus pictures per zoom; measured in C2.
- **Pack size** (C1).
- **ayah-mark matching** (W9) is a geometric assumption verified on all 604 pages, not a fact from the source.

## Release

JavaScript, assets and a pack: **no native change, no package**, so OTA-able once Skia is in a store build (`apps/mobile/CLAUDE.md` «Releasing»; run `npx eas-cli fingerprint:compare`). The API ships first (the pack carries the new tables; a client without this step ignores them). Do not bump `version`.

## Open questions for the developer

1. **Justification.** Is «gaps only, ragged when a gap would pass 6 units» right, or do you prefer a smaller cap, always-justified lines with wider gaps, or kashida added by an algorithm later (quran.ws did that for its own pages)?
2. **The no-pack fallback.** `HafsMushafList` (flowed Tanzil Hafs) is the Mushaf view only while a pack is not available (first launch offline). Keep that fallback, or show only the download card?
3. **Pages 1 and 2** lay out centred and ragged at zoom (their printed lines are centred). Right?
4. **Copy** in 0.2.
5. **Loose marks and hizb ornaments.** 48 loose contours in Hafs belong to a neighbouring line's word or are ornaments. The default attaches each to the geometrically nearest word across adjacent lines, listed on the sheet for you to approve. For the three **hizb ornaments** (pages 472, 499, 517), which sit in the margin, should they travel with a word, or be drawn as their own block at the start of a line?
6. **Sajda lines.** The default fuses the words under a sajda line into one unit (as printed) so the line stays over them. Is that right?

## Report back

Files changed; the digest check (`8944a6b3…` unchanged); the table in 0.3 re-run on the cache; how 1:1 is treated and the loose-attachment list; the pack size; the timing table (split, word paths, layout, picture, per step); the baseline result; screenshots; the contradictions list; and whether any page failed W9, W10 or W11.
