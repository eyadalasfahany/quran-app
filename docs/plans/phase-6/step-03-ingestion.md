# Step 3 — Azkar ingestion pipeline (API)

ADR 0031 §1, §3–§7. Builds on step 2. **The pipeline must be complete and tested, but production import stays locked.** Tests use placeholder fixtures only.

## Goal
`php artisan azkar:import {path} {--dry-run} {--report=}` reads a pinned OpenDua catalogue file and does the following:
1. Validates every record.
2. Transforms it into the step-2 tables without changing one byte of religious text.
3. Writes an import report.
4. When unlocked, replaces the `azkar` resource's rows in one transaction and triggers the pack build.

## Code layout
`app/Domains/Azkar/`, following `Domains/Content` and the `laravel-standards` skill:
- `Console/ImportAzkarCommand.php`
- `OpenDua/CatalogueParser.php` and DTOs under `Data/`
- `Validation/CatalogueValidator.php`, collecting every problem (never stopping at the first)
- `Services/AzkarImporter.php`, `Services/QuranSegmenter.php`
- `Data/ImportReport.php`
- `Models/*`
- `config/azkar.php`

## Locks (ADR 0031 §1)
- **Pin:** `azkar.opendua.version` (`0.0.4`) and `azkar.opendua.catalogue_sha256` (`231dfca7b1d0b5bea8ead8125c8d556121a115c40c9e348e08f4b3ede5194958`). A file whose SHA-256 differs is an error. A new upstream version is adopted only by changing the pin on purpose.
- **Wet import** has no switch and no permission gate (removed 2 Nov 2026, ADR 0045; `permission_status` is provenance only). Otherwise the command prints why, writes nothing, and exits non-zero.
- **`--dry-run`** is always allowed. It parses, validates and transforms in memory, writes the report, and touches no table.

## Transformation rules (exact)
- `entry_key` = `<collectionId>:<entry.id>` (e.g. `hisn-al-muslim:entry-000075`).
- `chapter.id` = upstream `number`.
- `entry.id` = 1-based order in the file; `position` = order within its chapter.
- **Variations:** an entry without `variations` but with top-level `steps` has one variation, `standard`.
- **Items:** steps are flattened in order per variation. `item_key` = `<entry_key>:<variation id>:<n>`, with `n` 1-based within the variation.
  - `instruction` and `narration` steps become one item each: `kind` = step type, `text_ar` = `arabic`, `text_en` = `text`, `speaker` copied.
  - A `recitation` step becomes one item per `items[]` element: `kind = recitation`, `source_dua_id` = `dua.id`, `required_count` = `items[].times` when present, else `null`. Never default it to 1.
  - A `repeat` step has `times` and child `steps`. Its children are flattened in place with `repeat_group` = 1-based index of the repeat step within the variation and `repeat_times` = its `times`. (Step 2 lacks these two columns; add them here, see below.)
- **Arabic and segments:**
  - The item's Arabic (`dua.arabic` or step `arabic`) is never trimmed, normalised or re-encoded.
  - `source_text_sha256` = SHA-256 of that exact UTF-8 string.
  - Segmenting (`QuranSegmenter`): split at each `﴿…﴾` span.
    - Text outside spans becomes `text` segments, byte-exact, including surrounding whitespace. Zero-length pieces are skipped.
    - Each span becomes a `quran` segment whose surah and verses come from `config('azkar.quran_references')[item_key]`, a list in span order: `[surah, verse_from, verse_to|null]`.
    - A string with spans and no map row, or with a map row of the wrong length, is a **validation error** (`quran_reference_unreviewed`).
    - **Proof of no mutation:** reassembling the text segments with the original span substrings must equal the original string byte for byte. Assert it for every item.
  - `text_search` (text segments only) uses the same normaliser as spec §7. Reuse the API's existing `text_search` code; find it in `app/Support/QuranText` or the content sync.
- **English and transliteration:** stored only when `azkar.opendua.store_english` is `true` (default `false`: the licence the dataset names is unreadable, ADR 0031 §5) **and** the item has no `quran` segment. Otherwise `null`.
- **Recordings:** imported only when `azkar.opendua.audio_rights_verified` is `true` (default `false`). Rights fields come from config (`stream_allowed`, `download_allowed`, `redistribution_allowed`, `licence`, `licence_url`, `rights_verified_at`). Otherwise zero rows, and the report counts what upstream offered.
- **Chapters:** `title_en` from upstream. `title_ar` from `config('azkar.chapter_titles_ar')[number]`, which ships **empty**; a missing title is `null` plus a report count.
- **Categories:** from config, never inferred from wording.
  - **Session:**
    - `morning`: ch. 27, variations `morning` and `standard`
    - `evening`: ch. 27, `evening` and `standard`
    - `after_prayer`: ch. 25
    - `before_sleep`: ch. 28
    - `after_waking`: ch. 1
  - **Browse:** one per upstream tag (`id` = tag id, `progress_period = session`), entries by their tags.
  - `azkar_entry_categories.variation_key` = the variation for chapter-27 entries that have morning or evening variations, otherwise `'*'`.
- **Occasion and timing:** from `config('azkar.chapter_timing')`, keyed by chapter number. Each value is `occasion`, `timing_type`, `timing_prayer|null`, and must be derived only from the chapter's own title:
  - 1 → `after_waking` / `event_based`
  - 10 → `leaving_home` / `event_based`
  - 11 → `entering_home` / `event_based`
  - 13 → `entering_mosque` / `event_based`
  - 14 → `leaving_mosque` / `event_based`
  - 25 → `after_prayer` / `prayer_based` / prayer `null`
  - 27 → occasion `null` / `time_period`
  - 28 → `before_sleep` / `event_based`
  - 96 → `travel` / `event_based`
  - every other chapter: all `null`

  No morning or evening boundary is stored.
- **Provenance:** `review_status = 'sourced'`, `source_version` = pinned version, `imported_at` = now (ms), `source_reference` = upstream `sourceReference`.
- **Notes:** OpenDua has no references, gradings or explanations, so zero `azkar_notes` rows.

## Validation
Each check is an error (import fails, report written) or a warning (import continues, listed):
- **Errors:**
  - unreadable or invalid JSON or UTF-8
  - SHA-256 differs from the pin
  - missing or duplicate `entry.id`
  - unknown `chapterId`, unknown tag
  - unknown step type
  - recitation item without Arabic
  - `times` that is not a positive integer
  - unbalanced `﴿` / `﴾`
  - HTML tags in any text
  - bidi or zero-width control characters (U+200B–U+200F, U+202A–U+202E, U+2066–U+2069)
  - `quran_reference_unreviewed`
  - a recording without `url` or `durationSeconds`
  - counts that disagree with `counts`
- **Warnings:**
  - the same Arabic string in more than one entry (13 upstream; legitimate)
  - an instruction or narration with English only (12)
  - dua `placeholders` present (3)
  - chapters without an Arabic title

## Report (`storage/app/azkar/reports/<timestamp>.json`, plus a console table)
- **Content counts:** entries imported, chapters imported, items by kind, segments (`text` / `quran`), Quran passages mapped and unmapped.
- **Sourced fields:** items with and without `required_count`; entries with explanations, virtues, contexts, references, grades (all 0); entries without explanations.
- **Gated fields:** English stored or skipped; recordings upstream, imported, legally downloadable.
- **Gaps and problems:** chapters without an Arabic title, validation errors, warnings.
- **Changed upstream texts:** items whose `source_text_sha256` differs from the previous import, by `item_key`.

## Additive columns (both sides, same change)
`azkar_items.repeat_group` int null and `azkar_items.repeat_times` int null, appended after `source_text_sha256`:
- **API:** a new migration plus the `PackSchema` columns.
- **App:** already done by the reviewer (migration `0009_bent_smasher`, `content-tables.ts`, tests). The API side must match: columns appended after `source_text_sha256` in this order.

## Resource and pack
- One `resources` row: `group = azkar`, `source_key = hisn-al-muslim`, `source_id` = the opendua source.
- A successful wet import replaces every Azkar row for that resource in one transaction, bumps `version`, and sets `checksum` to the file SHA-256.
- It also makes devices take the pack rather than an empty change feed. Read how `changes_floor_version` works in `ContentDeliveryService` and set it so a device older than the new version re-downloads the pack.
- Then it dispatches `BuildContentPackJob`, which step 2's rights gate already guards.

## Tests (Pest)
Fixture `tests/Fixtures/azkar/opendua-fixture.json`: the OpenDua schema shape with placeholder text only (`FIXTURE text 1 — not a dhikr`, `«نص تجريبي ١ — ليس ذكرًا»`). It needs:
- chapters 1, 25 and 27 (27 with morning and evening variations)
- a repeat group
- an entry with top-level `steps`
- a placeholder
- a recording
- an item with two `﴿نص تجريبي﴾` spans, plus a matching test-only `quran_references` row set through `config()`

Its pin is overridden in the test.

Cover:
- byte preservation (reassembly), `source_text_sha256`, no trimming of leading or trailing spaces
- every lock (flag off, source pending, pin mismatch)
- dry run writes nothing
- every validation error listed above (one small malformed fixture each, or a mutated copy)
- report numbers
- English gating (flag off; Quran item always null)
- recordings gating
- `required_count` null when absent
- repeat group columns
- `entry_key` / `item_key` stability across re-imports
- the changed-text report on a second import
- the version bump and pack dispatch

Run the importer once in `--dry-run` against the real pinned file at `C:/Users/Asus/AppData/Local/Temp/claude/d--projects-quran-app/b8fd25a9-6478-4f07-929c-6ef04bc56caf/scratchpad/opendua-v0.0.4/catalogue.json` (outside the repo; never copy it in). Paste the report numbers. It is **expected to fail validation** with `quran_reference_unreviewed` for the 16 unmapped Quran text fields in 15 entries (corrected count); that is the correct blocked state.
