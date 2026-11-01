# Step 13 — hisnmuslim.com and HadeethEnc adapters (ADR 0031 §12)

API (`apps/api`) plus one small mobile rule. Locked in production like OpenDua. Never write religious text; tests use placeholder fixtures shaped like each API.

## 1. Source abstraction
Refactor the OpenDua importer behind an interface, without changing its behaviour or tests.
- `AzkarCatalogueSource`: `code()`, `fetchSnapshot(): Snapshot` (files plus a SHA-256 manifest), `parse(Snapshot): ParsedCatalogue` (the existing DTOs).
- `OpenDuaSource` wraps the current parser.
- `azkar:import --source=opendua|hisnmuslim`. Default is `config('azkar.primary_source')`.
- Each source has its own lock pair (its `content_sources` row plus `AZKAR_<SOURCE>_IMPORT_ENABLED`) and its own pinned snapshot manifest.

## 2. `HisnMuslimSource`
- **Fetch** `https://www.hisnmuslim.com/api/ar/husn_ar.json` (index: `ID`, `TITLE`, `AUDIO_URL`, `TEXT`), then each chapter file `api/ar/{ID}.json`. The file's top-level key is the chapter title; each entry has `ID`, `ARABIC_TEXT`, `LANGUAGE_ARABIC_TRANSLATED_TEXT`, `TRANSLATED_TEXT`, `REPEAT`, `AUDIO`.
  - Polite and sequential: a 300 ms gap, a User-Agent naming Taybah plus a contact, retry with backoff on 429/5xx.
  - Strip the UTF-8 BOM from the file bytes, never from text values.
  - Handle the known field-name variation (one chapter uses a different text key). Detect by key, report it, and never guess.
- **Snapshot:** `azkar:snapshot hisnmuslim` writes `storage/app/azkar/hisnmuslim/<date>/` plus `manifest.json` (SHA-256 per file and of the whole). The pin (the whole-manifest SHA-256 plus the date) goes in `config/azkar.php`. An import verifies every file against the pin.
- **Map:**
  - chapter `number` = index `ID`; `title_ar` = `TITLE` (Arabic chapter titles finally exist; still byte-exact)
  - entry `source_reference` = entry `ID` (the book number), `entry_key` = `hisn-al-muslim-hm:<ID>`
  - one variation `standard`; one `recitation` item per entry with `ARABIC_TEXT` byte-exact
  - `required_count` = `REPEAT` when it is a positive integer; otherwise an error
  - `TRANSLATED_TEXT` and the transliteration are **not** stored; audio is **not** imported
  - Quran spans go through the same `QuranSegmenter` and candidate map: extend `azkar:quran-map-candidates` to `--source=hisnmuslim`, keyed by its item keys
- **Categories:** session categories by chapter number, the same as OpenDua (1, 25, 27, 28). Browse categories: reuse OpenDua's tag mapping by chapter **number** (both follow the book's numbering). Report chapters with no tag.

## 3. Cross-verification report
- `azkar:compare-sources` compares OpenDua and hisnmuslim by book number.
- Report:
  - entries present in only one source
  - for each number, whether the Arabic is byte-identical, equal after `text_search` normalisation, or different (with a character-level diff position; **print positions and lengths only, never the text**)
  - `REPEAT` vs OpenDua `times`
- It always runs as part of any import, and its summary goes into the import report.

## 4. `HadeethEncEnricher`
- Official API: `GET https://hadeethenc.com/api/v1/categories/list/?language=ar`, then `hadeeths/list/?language=ar&category_id=…&per_page=…` for the Azkar-related categories:
  - 301 أذكار الصباح والمساء
  - 268 فقه الأدعية والأذكار, with its children
  - 278 فضائل الذكر
  - 279 فضل الدعاء
  - 299, 300

  Then `hadeeths/one/?language=ar&id=…`.
- Polite fetching, the same as above. Snapshot and pin the same way.
- **Linking:** a candidate link wherever an Azkar recitation item's normalised text is contained in the hadith's normalised text, with the match length. Write `config/azkar_hadeethenc_links.php`: `entry_key → [{hadeeth_id, status: 'candidate'|'reviewed', evidence}]`. **IDs and evidence only, no text.**
- **Notes** for linked entries, with `source_type 'hadeethenc'`, `source_name 'موسوعة الأحاديث النبوية (HadeethEnc.com)'` and `source_url = https://hadeethenc.com/ar/browse/hadith/{id}`:
  - `explanation` ← `explanation` (byte-exact)
  - `grade` ← `grade`, with `grader` from the hadith's grading attribution if the API gives one; otherwise null
  - `reference` ← `attribution`

  «الفوائد» is not stored (ADR 0031 §12).
- **Where links count:** production imports only `reviewed` links; local imports also use `candidate` links and list them as warnings.
- `content_sources` row `hadeethenc` (`pending`, `licence_url` `https://hadeethenc.com/api-docs/`, `attribution_ar` «موسوعة الأحاديث النبوية HadeethEnc.com», `attribution_en` "HadeethEnc.com — Encyclopedia of Translated Prophetic Hadiths"). The local unlock command accepts `--source=hadeethenc`.

## 5. Mobile rule
In `apps/mobile/src/features/azkar` (reader units / counter choice), `requiredCount === 1` renders the «تم» button (`AzkarDoneButton`), exactly like `null`. Category totals are unchanged. Add tests.

## 6. Run locally and report
1. Run `azkar:snapshot hisnmuslim`.
2. Unlock hisnmuslim and hadeethenc **locally only**.
3. Run `azkar:import --source=hisnmuslim`, then the enrichment, then build the pack.

Report counts only:
- entries, chapters (with Arabic titles), `REPEAT` distribution, Quran map statistics
- compare-sources results (identical / normalised-equal / different / missing)
- HadeethEnc categories and hadiths fetched, candidate links, notes by kind

Keep `primary_source = opendua` until the developer chooses, and say which you recommend from the comparison.

## Gates
- **API:** pint, phpstan (0 errors), pest (only the documented Windows-only failures)
- **Mobile:** lint, tsc and jest on `src/features/azkar`

No Salah changes. Don't commit.
