# Step 3 — Hafs word boxes and the gate (ADR 0090 decisions 5 and 6)

Branch `ft/madinah-svg-mushaf`, worktree `/Applications/MAMP/htdocs/quran-app-mushaf`. Stage nothing. API only. **Model: stronger model (Opus).**

Prerequisite: step 2 is merged in the working tree, and `php artisan mushaf:import hafs` has run locally. The 604 pages are in the source cache and their regions are in `svg_mushaf_ayah_regions`.

## Read first

- `docs/adr/0090-madinah-svg-mushaf.md`: decisions 5 and 6, including the ordering note and the spike measure.
- The step 2 code in `app/Domains/Mushaf/`: models, `SvgMushafStore`, the importer, config.
- The spike, `docs/plans/madinah-svg-mushaf/spike/words2.py`, `words3.py` and `words7.py`. `words7.py` is the method to port. `words2.py` has the path parser and the band split.
- `app/Support/QuranText/ChapterVerseCounts.php` (`verseId`, `firstVerseId`) and `TanzilReader.php`.
- `packages/quran-text-check/data/tanzil-quran-data-1.0.xml`: its `<page index sura aya/>` entries, 604 of them, give each page's first ayah.

## Inputs

- **Page artwork.** The raw SVG `{base}/svg/{NNN}.svg` from `SvgMushafStore`. A page's text is the path(s) under `<g id="content">`, each wrapped in `<g transform="translate(tx ty)">`. The root `<g transform="matrix(a b c d e f)">` flips y. Ayah-end ornaments live under `id="ayah_markers"` and are **not** text: skip them.
- **Ayah regions** of the page (`svg_mushaf_ayah_regions`). A polygon is either:
  - SVG path data of rectangles, `M x y L x y L x y L x y Z` repeated;
  - **or, on pages 1–2,** a bare list of `x,y` pairs.

  Both are in the page's own coordinates: y down, the same space as the transformed contours. Pages 1–2 declare a viewBox origin of `-53.31 -198.48`. Check on the real pages that contours and regions line up; the review sheet shows it.
- **Words per line.**
  - Read `word_layouts` where `mushaf_id = config('mushaf.word_boxes.layout_mushaf_id')` (1, the 1441H print) and `char_type = 'word'`, grouped by (page, line).
  - **Order each line's words by (`verse_id`, `position_in_verse`), never by `position_in_line`.** The local copy of that column is wrong for some words.
  - `verse_id` maps to (surah, ayah) through `ChapterVerseCounts`.
- **Letter counts** for W5: the Tanzil token of each word, from `TanzilReader::texts()` split on single spaces, counting only tokens that contain a letter (`\p{L}`). Count letters with `preg_match_all('/\p{L}/u', …)`. Never change or store the text.

## Method (port of `words7.py`)

1. **Contours.** Parse every subpath of the content path(s) and compute its bounding box from its endpoints and control points. Apply the transform chain: the inner `translate`, then the root `matrix`. The result is in page coordinates, with y down.
   - The parser handles all commands `MmLlHhVvCcSsQqTtAaZz`, absolute and relative, with implicit repeats. An `m` or `M` followed by more pairs continues as `l` or `L`.
   - After `z`, the current point returns to the start of the subpath.
   - Number forms include `7e-3`, `-0.547-0.681` and `.5.5`.
   - Keep path order.
2. **Line bands.**
   1. Collect the region rectangles of the page.
   2. Let `h` be the 25th percentile of their heights.
   3. Split each rectangle into `max(1, round(height / h))` equal horizontal bands.
   4. The page's text lines are the distinct bands, merged when they overlap by more than 0.5, and sorted top to bottom.
3. **Line contours.** A contour belongs to the band holding its vertical centre.
4. **W1.** The band count equals the number of `word_layouts` lines with words on that page. The i-th band is the i-th such line.
5. **Spans.** For each word, its allowed x-range is the union of its own ayah's region rectangles that cover the band's vertical centre, with tolerance `span_tolerance`.
6. **Split.** The line's contours in path order run left to right, which is reverse reading order. Split them into exactly N contiguous groups, one per word, matched to the words in reverse reading order. Use the dynamic program that minimises the sum of:
   - group cost = (max x1 − min x0)
   - plus `no_base_penalty` if the group has no contour of height ≥ `base_height_share` × band height
   - plus `out_of_span_penalty` if the group's x-centre is outside its word's span.
7. **Box.** A word's box is (min x0, band y0, max x1, band y1) of its group, rounded to 2 decimals.

## Checks

| Check | Rule | Kind |
| --- | --- | --- |
| W1 | band count = layout line count | hard |
| W2 | every group has a full-height contour, and its centre is inside its word's span | hard |
| W3 | on every line, the first group's x0 < the last group's x0 (path runs left to right) | hard |
| W4 | box width < `min_width` | flag |
| W5 | width ÷ letters outside [`width_per_letter.low` × page median, `width_per_letter.high` × page median] | flag |
| W6 | the page's set of (surah, ayah) in regions = the ayahs from that page's Tanzil start up to (not including) the next page's start; page 604 runs to 114:6 | hard |

- **Calibrate on the real 604 pages, then fix the values in `config/mushaf.php` under `word_boxes`:**
  - `base_height_share` 0.30, `no_base_penalty` 1000, `out_of_span_penalty` 500 and `span_tolerance` 0.5, all as in the spike;
  - `min_width` and `width_per_letter.low` / `.high`, chosen from the distribution so that roughly the outer 1% is flagged;
  - `layout_mushaf_id` 1 and `review_sample` 30.

  Report the distributions you used.
- **Digest.** The SHA-256 of the canonical JSON of all boxes, sorted by (surah, ayah, position), together with the `word_boxes` config values and `mushaf.commit`.

## Approval (W7)

- Add `'approved_word_boxes' => ['hafs' => null]` to `config/mushaf.php`. Only the developer sets the digest there, after reviewing the sheet. No command writes it.
- Add a column `svg_mushafs.word_boxes_status`, enum `none`, `failed`, `pending_review` or `approved`, plus `word_boxes_digest` char(64) nullable. A build sets:
  - `failed` if any hard check fails;
  - `approved` if the digest equals the configured approved digest;
  - otherwise `pending_review`.
- Step 5's pack includes boxes only when the status is `approved`.

## Storage

- Migration `svg_mushaf_word_boxes`:
  - `id`; `svg_mushaf_id` FK cascade; `page` smallint unsigned; `line` tinyint unsigned; `surah` tinyint unsigned; `ayah` smallint unsigned; `position` smallint unsigned (`position_in_verse`); `x0`, `y0`, `x1`, `y1` decimal(8,2); timestamps.
  - Unique (`svg_mushaf_id`, `surah`, `ayah`, `position`); index (`svg_mushaf_id`, `page`).
- A build replaces the edition's rows in one transaction, even when it fails, so the sheet can show them. The status column records the outcome.

## Command and review sheet

- `mushaf:build-word-boxes {key=hafs} {--sheet= : directory to write the review sheet} {--sample=}`:
  - refuses any key without a layout (only `hafs` today);
  - prints the counts per check, the flagged lines, the digest and the status;
  - returns a non-zero exit on `failed`.
- **The sheet** is local only: never committed, never served. Write `index.html` plus one HTML page per listed page:
  - **What it lists:** every page with a W2/W4/W5 issue, plus `review_sample` random pages without issues. The pages are chosen by a seeded random (seed = the first 8 hex digits of the digest), so a re-run lists the same pages.
  - **What each page shows:** the page SVG inlined, read from the cache, with every word box drawn on top in alternating colours, and flagged boxes in a thick red outline. Next to it goes a table of the line's word keys (surah:ayah:position) and widths. Keys only, no Quran text in the sheet.
  - **What `index.html` shows:** the counts, the digest, and links to each page. It says that the developer approves by setting `approved_word_boxes.hafs` to the digest after checking every listed page.

## Tests (Pest; synthetic fixtures only: no Quran artwork, no Quran text)

1. **Path parser:** absolute and relative commands, implicit repeats, `z` returning to the start, exponents and joined negatives, and `h`/`v`/`s`/`q`/`t`/`a`. Assert the bounding boxes.
2. **Transform chain:** translate inside a y-flipping matrix gives the expected page coordinates.
3. **Bands:** a 2-line-tall rectangle splits into two bands; neighbouring rectangles merge.
4. **Split:** three synthetic words of a few contours each, with a mark-only contour between two words and known spans, give the right groups. Wrong spans cost more.
5. **Each check:** W1, W2, W3 and W6 failures set `failed`; W4 and W5 only flag.
6. **Digest:** stable across two runs. Equal to the configured value gives `approved`; a different one gives `pending_review`.
7. **Ordering:** a line whose `position_in_line` values are shuffled still maps words by (verse, position).

## Gates

- `composer qa` in `apps/api` is green.
- **Then run it for real:** `php artisan mushaf:build-word-boxes hafs --sheet=/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/45caaed8-c2a1-4fa5-a801-974871103e43/scratchpad/word-box-sheet`.
- Report:
  - the per-check counts on all 604 pages;
  - the calibrated values and their distributions;
  - the digest and status;
  - how many pages the sheet lists;
  - every file created or changed.

  If a hard check fails, report the failing pages and lines with their keys and the likely cause. Do not loosen a hard check to make it pass.
