# Step 4 — Tafsirs, mushafs and chapter recitations (API)

Follow [README.md](README.md), especially the **shared contract** table. Needs step 3 committed. Read also:
- The step 3 engine (`app/Domains/Content/Sync`) and its `GroupHandler` interface.
- `docs/content-plan.md`, tafsir item 4 ("Rendering"): the whitelist.

**Goal:** three more handlers on the step 3 engine, plus an HTML sanitizer.
- **No engine changes**, unless a handler truly needs one (report it if so).
- **The per-ayah `recitations` group is not synced in Phase 1.** v1 plays one audio file per surah.

## `app/Support/Html/HtmlSanitizer`

`sanitize(string $html): string` reduces tafsir HTML to a short whitelist **without changing any words**.
- **Allowed elements:** `p`, `br`, `b`, `strong`, `i`, `em`, `span`, `h1`, `h2`, `h3`, `h4`, `blockquote`, `sup`, `sub`.
- **Attributes:** every one is dropped (including `style` and `class`).
- **Removed with their content:** `script`, `style`, `iframe`, `object`, `embed`, `form`, `img`, `video`, `audio`, and comments.
- **Any other element** is unwrapped: the element goes, its children stay.
- **Parser:** PHP 8.4+ `Dom\HTMLDocument` (`Dom\HTMLDocument::createFromString(…, LIBXML_NOERROR)`), parsing the input as a body fragment. No new packages.
- **Contract:** the text content of the output equals the text content of the input (both read through the same parser), minus the text of the removed elements.

**Tests** (`tests/Unit/Support/HtmlSanitizerTest.php`):
- A real-looking QF sample, `<h1><span style="color: rgb(59, 62, 102);">Introduction</span></h1><p>…</p>`, keeps `h1`/`span`/`p` and loses `style`.
- `<script>` is removed with its text.
- `<a href>` is unwrapped and keeps its text.
- Arabic text with diacritics keeps identical bytes.
- Nested disallowed tags are handled.
- An empty string returns an empty string.

## `Sync/Handlers/TafsirsHandler`

Snapshot records come **one per ayah** and repeat a group's text:
```json
{"id": 82641, "verse_id": 1, "verse_key": "1:1", "group_verse_key_from": "1:1", "group_verse_key_to": "1:1",
 "group_verses_count": 1, "group_tafsir_id": 82641, "start_verse_id": 1, "end_verse_id": 1,
 "text": "<h1>…</h1>", "resource_id": 169}
```
- **One `tafsir_entries` row per `group_tafsir_id`.** Skip later records with a `group_tafsir_id` already seen in the same snapshot.
- **Row mapping:**
  - `first_verse_id` ← `start_verse_id`, falling back to `verse_id`.
  - `last_verse_id` ← `end_verse_id`, falling back to `verse_id`.
  - `first_verse_key` ← `group_verse_key_from`, falling back to `verse_key`.
  - `last_verse_key` ← `group_verse_key_to`, falling back to `verse_key`.
  - `html` = `HtmlSanitizer::sanitize(text)`.
  - `source_hash` = `hash('sha256', text)` of the **raw** text.
- **Change rows:** entity `tafsir_entry`, key `group_tafsir_id`, payload with the shared-contract columns.
- **Row mutations:** upsert by (`resource_id`, `group_tafsir_id`).
- **Catalog:** `ContentCatalogClient::tafsirs()`.

## `Sync/Handlers/MushafsHandler`

A mushaf snapshot has `record_type` per record:
```json
{"record_type": "mushaf", "id": 1, "name": "QCF V2", "description": "…", "pages_count": 604, "lines_per_page": 15,
 "default_font_name": "v2", "mapping_mode": "reference", "qirat": {"id": 1, "name": "Hafs"}}
{"record_type": "mushaf_page", "id": 605, "mushaf_id": 1, "page_number": 1, "first_verse_id": 1, "last_verse_id": 7,
 "first_word_id": 1, "last_word_id": 8420, "verses_count": 7, "verse_mapping": {"1": "1-7"}}
{"record_type": "mushaf_word", "id": 529417, "mushaf_id": 1, "word_id": 1, "verse_id": 1, "text": "ﱁ",
 "char_type_id": 1, "char_type_name": "word", "page_number": 1, "line_number": 9,
 "position_in_verse": 1, "position_in_line": 1, "position_in_page": 1}
```
- **`mushaf` → `mushafs`:** `id` = record `id`, `qirat_name` = `qirat.name`.
- **`mushaf_page` → `mushaf_pages`:** the record's own `id` is ignored.
- **`mushaf_word` → `word_layouts`:**
  - `glyph` ← `text`, **byte for byte**
  - `char_type` ← `char_type_name`
  - `page` ← `page_number`
  - `line` ← `line_number`
- **Unknown `record_type`** throws `SyncException`.
- **Change entities and keys:** `mushaf`/`id`, `mushaf_page`/`page_number`, `word_layout`/`word_id`.
- **Resource name:** from the `mushaf` record (mushafs have no catalog call). Language and direction stay null.

## `Sync/Handlers/ChapterRecitationsHandler`

The snapshot has two record types:
```json
{"record_type": "chapter_audio_file", "id": 10734, "audio_recitation_id": 1, "chapter_id": 1,
 "audio_url": "https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/1.mp3", "duration": 78, "duration_ms": 78000,
 "file_size": 1595520.0, "format": "mp3", "metadata": {"artist": "Abdul Basit Abdul Samad"}}
{"record_type": "audio_segment", "id": 1, "audio_file_id": 10734, "chapter_id": 1, "verse_id": 1, "verse_key": "1:1",
 "timestamp_from": 0, "timestamp_to": 6300, "duration_ms": 6,
 "segments": [[1, 0.0, 960.0], [2, 970.0, 1420.0], [3, 1430.0, 2670.0]]}
```
- **The `recitations` row:** one per resource.
  - `reciter_name` and `style` (`style.name`), `qirat` (`qirat.name`) come from the catalog: `GET {api}/api/v4/resources/chapter_reciters`, shaped `{"reciters": [{"id": 6, "name": "Mahmoud Khaleel Al-Husary", "style": {"name": "Murattal"}, "qirat": {"name": "Hafs"}}]}`.
  - `reciter_name_ar` comes from the same endpoint with `?language=ar` (`translated_name.name`).
  - **Fallback** when the resource id isn't in the catalog: `reciter_name` = the first `chapter_audio_file.metadata.artist`, and the other fields null.
  - Add `chapterReciters(string $language = 'en')` to `ContentCatalogClient`.
- **`chapter_audio_file` → `chapter_audio_files`:**
  - `id` = record `id`.
  - `audio_url` **as received** (ADR 0008; per-ayah relative URLs are out of scope).
  - `size_bytes` = `(int) file_size`, or null.
  - `duration_ms` = `duration_ms` if it equals `duration × 1000`, else `duration × 1000`.
- **`audio_segment` → `recitation_timings`:**
  - `start_ms` = `timestamp_from`, `end_ms` = `timestamp_to`, both ints.
  - **Ignore the segment's own `duration_ms`**: it's unreliable (`6` next to a 6300 ms span).
  - `segments` is normalized to `[[word_position:int, start_ms:int, end_ms:int], …]` (round the floats). Drop entries that aren't 3 numbers with start < end. Store null when nothing is left.
  - `has_word_segments` on the recitation = true if any timing has segments.
- **Change entities and keys:** `recitation`/`id`, `chapter_audio_file`/`id`, `recitation_timing`/`"{audio_file_id}:{verse_id}"`.

## Config

Add to `config('quran.sync.groups')`:
- `tafsirs => 'tafsirs:*'`
- `mushafs => 'mushafs:1'` (QCF V2 only for Phase 1)
- `chapter_recitations => 'chapter_recitations:6,7'`. **Filter format:** several IDs of one group are comma-separated (`group:6,7`). QF rejects a repeated group (`group:6;group:7`) with "Duplicate resource group"; `;` separates different groups only.

Prelive has 100+ chapter recitations, about 3.8 MB each, so only two are synced by default.

## Tests

Feature tests with tiny fixtures, a few records per `record_type`:
- **Tafsir:** a snapshot with 3 ayah records sharing one `group_tafsir_id` plus 1 other gives 2 rows, with correct verse ranges, sanitized HTML and `source_hash` of the raw text.
- **Mushaf:** a snapshot gives 1 `mushafs`, 2 `mushaf_pages` and 3 `word_layouts` rows, with the glyph byte-exact.
- **Chapter recitation:**
  - Bootstrap returns `has_more: true` with a relative `next_page_url`; both pages are applied, and the token comes from the last page.
  - The audio file, timings and normalized segments are right.
  - The catalog name, the Arabic name and the fallback to `metadata.artist` all work.
- **Row mutations** for each new entity write correct change rows (upsert payload columns = the shared contract).
- **Errors:** an unknown `record_type` fails the run without advancing `last_sequence`.

## Reviewer live check (not for the agent)

`php artisan content:sync tafsirs`, `… mushafs` and `… chapter_recitations`. Expected counts:
- tafsirs: rows ≤ 293 per resource
- mushaf 1: 49 pages and 6,438 word layouts
- each chapter recitation: 114 files and 6,236 timings

## Leave untouched

The step 3 engine semantics, the earlier migrations (new migrations only if truly needed, reported), `apps/mobile`, `packages/` and `composer.json`.
