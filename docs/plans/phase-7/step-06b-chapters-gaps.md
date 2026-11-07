# Step 6b: OpenITI chapters, gap fills, merges and the completeness gate

Phase 7, branch `main`. Written 7 Nov 2026 for a Haiku implementer. Read first: `.claude/agent-rules.md`, `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/api/.ai/rules/*.md`, `docs/plans/phase-7/README.md`, `docs/plans/phase-7/step-06-importer.md` (the importer you extend), and in full `docs/adr/0076-hadith-chapters-from-openiti.md`. The ADR's dated decisions are binding. Background (counts only): `docs/plans/phase-7/gapfill-report.md`, `docs/plans/phase-7/chapters-research.md`, plan `docs/plans/phase-7.md` (D14 to D16, steps 6b, 6c, 8b, RB17 to RB24).

**Never write religious text.** No hadith, chapter title, grade or book title, not even as an example. Tests use placeholders: `FIXTURE text 1 — not a hadith`, «نص تجريبي ١ — ليس حديثًا», `FIXTURE chapter title 1`, source `taybah-dev-fixture`. Reports and logs print counts, hadith numbers, keys and paths only, never text or titles. Do not commit, push, switch branches or add dependencies. Check the branch with `git branch --show-current`.

## 0. Part order and what is first

Eight parts, each one reviewable change, in this order. **6b.1 comes first** and nothing else may start before it is reviewed, because every later part relies on its gate and its config shape.

| Part | Title | Needs |
| --- | --- | --- |
| **6b.1** | Foundations and the completeness gate: source rows, config shape, pinned data-file reader, `complete` per collection, held-back status, pack gate, deactivation | step 6 |
| 6b.2 | Range corrections, reference exceptions (Ibn Majah) and out-of-range placements (config and mapper only) | 6b.1 |
| 6b.3 | Merges: number-range columns, pack and model changes, overlay for merges | 6b.1, 6b.2 |
| 6b.4 | Gap fills and the Nasa'i missing book (gaps data file, overlay, verify path) | 6b.3 |
| 6b.5 | Chapter import (chapters data file, `hadith_chapters`, `chapter_id`, option C check) | 6b.4 |
| 6b.6 | Dev command `hadith:build-gaps` and the hadithapi.com record method | 6b.5 |
| 6b.7 | Dev command `hadith:match-chapters` | 6b.6 (it builds the same mapping, with the gaps overlay, that 6b.4 and 6b.5 use) |
| 6b.8 | Licence notices, pins, committed data (developer runs the commands), docs | 6b.7 |

The parts are a **strict chain**: each needs the one before it (the version bump sequence in the mapper, 3 to 7, and the shared overlay depend on it). The API/mobile follow-ups (section 11) are handoffs, not part of 6b.

**Decisions already made (do not reopen):** ADR 0076 «Developer decisions, 7 Nov 2026» (titles that quote verses are shown as printed; the Hadith release waits for chapters; defaults accepted), «Developer decision: OpenITI also fills text gaps», «Rule: every hadith collection we ship is complete», and «Decisions on the gap report» items 1 to 9.

### Files in flight (other agents), and how this brief avoids them
- `apps/mobile/**` (steps 10 and 12): **this brief edits no mobile file.** Section 11 lists what the mobile owner must add.
- Step 7 is committed (`de1b6cc`): `app/Domains/Hadith/Http/**`, `app/Domains/Hadith/routes.php`, `Data/`, `HadithCatalogueService.php`, `EloquentHadithCatalogueRepository.php`, `Repositories/Contracts/HadithCatalogueRepository.php`, `HadithServiceProvider.php`, `Exceptions/HadithCollectionUnavailableException.php`, `packages/api-contract/**`. **6b.1 to 6b.8 edit none of them.** The API changes that merges need are the follow-up in section 11 (part «7b»), started only when the step 7 owner confirms those files are free.
- `app/Integrations/HadithApiCom/HadithApiComClient.php` is edited only in 6b.6, additively (a new public method and a new record class). Run `git diff` on it first; if it has uncommitted changes by someone else, stop and report.
- `config/hadith.php`: edit **additively**. Existing keys stay where they are; new keys go **after** `range_corrections` in the order of section 2.1. The two existing keys `reference_exceptions` and `range_corrections` change value only in 6b.2 (their values grow, their shape stays).
- Shared test helper `tests/Feature/Hadith/Support/HadithImportFixtures.php`: add functions at the **end** only.
- After 6b.1 lands, a local `hadith:import` deactivates every collection that still has gaps (every collection that is not yet complete; today that is all of them except those the gap data closes). That changes the local database of everyone who re-imports; say so in the 6b.1 hand-off note.

## 1. Goal

1. Every collection we ship is **complete**: every hadith number in fawazahmed0's numbering has its text and its book (ADR 0076 «Rule, 7 Nov 2026»). The importer computes `complete` per collection, the pack builder refuses an incomplete one, and a re-import that turns a complete collection incomplete deactivates it.
2. Gaps are closed from pinned, committed data files: text fills (OpenITI, then hadithapi.com), merges (a number whose text already sits inside a neighbour), one missing Nasa'i book, range corrections, and 12 out-of-range placements.
3. OpenITI chapters (title and number range only) become `hadith_chapters` rows and `hadith_entries.chapter_id`, per book all-or-nothing (option C, see Open question Q5).
4. Production reads only committed files whose SHA-256 is pinned in `config/hadith.php`. Production never downloads OpenITI and never calls hadithapi.com.

## 2. Shared definitions

### 2.1 Config additions (`apps/api/config/hadith.php`), in this order after `range_corrections`

```php
// Developer-approved explicit placements of a hadith that falls in no section range (ADR 0076 decision 6). number => book_number (the source's section key).
'placements' => [],                  // filled in 6b.2

// Numbers the developer accepts as complete without text, merge or fill. Empty. NOT reference_exceptions (a different check).
'completeness_exceptions' => [],     // e.g. 'muslim' => ['123']; each entry needs a developer decision

// A book the source lacks, inserted between two source sections (ADR 0076 decision 4). book_number null = undecided (Open question Q3).
'extra_books' => [],                 // filled in 6b.4

// Committed data files under database/data/hadith, path relative to that folder => lowercase hex SHA-256. null = not committed yet.
'data_files' => [],                  // filled in 6b.8 by the developer

// OpenITI: used only by the dev commands (6b.6, 6b.7). Production never reads it.
'openiti' => [],                     // filled in 6b.6
```

Every key is read through a small typed accessor in the class that uses it (like `HadithRangeCorrections` validates its own key). A malformed value throws `HadithDataFileException` (section 3.4) before any import work.

### 2.2 The numbering and «complete»
- **The numbering** of a collection is every `hadithnumber` string of the pinned fawazahmed0 edition file, as `SourceCollection::$hadiths[*]->number`. Numbers are exact strings (`"2787.2"` is not `"2787"`).
- A number is **resolved** when exactly one holds:
  1. it has a row with text and a book (own text, or filled by 6b.4);
  2. it is **merged**: its text is inside another hadith's row, which is present with text and a book (6b.3), so the number resolves to that row;
  3. it is listed in `config('hadith.completeness_exceptions')[$slug]`.
- **`complete` = every number of the numbering is resolved.** Anything else goes to `incompleteNumbers` with a reason code: `no_text` (no text, not filled, not merged, not excepted), `outside_range` (has text, no section range holds it, no placement), `merge_target_missing`.
- Duplicate, non-numeric, invalid-UTF-8 and ambiguous-range hadith stay **errors** as today (status `invalid`); they are not «incomplete».
- Chapters never decide completeness: option C lets a book be flat.

### 2.3 Data files (committed, pinned, read-only for the app)
Folder `apps/api/database/data/hadith/`:

```
chapters/{slug}.json            chapter titles and number ranges (OpenITI)
chapters/LICENSE-NOTICE.md      CC BY-NC-SA 4.0 notice
gaps/{slug}.json                gap fills, merges, extra book (OpenITI, hadithapi.com); contains hadith TEXT
gaps/decisions/{slug}.json      text-free classification of every gap (input of hadith:build-gaps)
gaps/LICENSE-NOTICE.md          notice for the gap fills
```

Every file: UTF-8, `json_encode(..., JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`, keys in the order shown, one trailing `\n`, lists sorted as stated. The file is written once by a dev command and committed by the developer. **Pins:** `config('hadith.data_files')['chapters/bukhari.json']` etc. hold the SHA-256 of the exact bytes. The importer verifies the hash **before** parsing (section 3.4). `LICENSE-NOTICE.md` files are not pinned and not read by code; a test asserts they exist.

#### `gaps/{slug}.json`
```json
{
  "schema_version": 1,
  "collection": "nasai",
  "generator": "hadith:build-gaps 1",
  "fawazahmed0_commit": "<40 hex, equals config hadith.commit>",
  "decisions_sha256": "<64 hex of gaps/decisions/{slug}.json>",
  "origins": {
    "openiti": {
      "source_version": "2023.1.8",
      "doi": "10.5281/zenodo.10007820",
      "file": "<zenodo member path, or github path>",
      "file_sha256": "<64 hex>"
    },
    "hadithapicom": { "source_version": "retrieved-2026-11-07", "book_slug": "sunan-nasai" }
  },
  "books": [
    { "book_number": "<see Q3>", "after_book": "35", "first": "3857", "last": "3938",
      "title_ar": "<cleaned OpenITI heading>", "origin": "openiti", "source_key": "openiti:nasai:book:36" }
  ],
  "fills":  [ { "number": "125", "origin": "openiti", "source_key": "openiti:nasai:125", "unit": 124,
                "text_ar": "<text>", "source_text_sha256": "<64 hex of text_ar bytes>" } ],
  "merges": [ { "number": "5710", "into": "5709", "origin": "openiti" } ],
  "unresolved": [ { "number": "1", "reason": "neighbour_not_confirmed" } ]
}
```
Rules: `origins` has only the origins used. `origin` is `openiti` or `hadithapicom`. `source_version` for OpenITI is the release `2023.1.8`, except Tirmidhi: `github:OpenITI/0300AH@01a1544130e0236850ef2698923ad01575c5bd7c` (62 characters, fits `varchar(64)`). For hadithapi.com it is `retrieved-YYYY-MM-DD` (the date of the run, passed as an option, section 8). `books` may be empty; `fills`, `merges`, `unresolved` sorted by `(float) number`, then by string. `unit` (OpenITI fills only) is the zero-based unit index used (for review; not read by the importer). `reason` is one of the fixed codes of section 8.5.

#### `gaps/decisions/{slug}.json`
A verbatim copy of the measurement's `final-classification-{slug}.json` (text-free; produced outside the repo, see Q9). The code reads only these keys and ignores the rest: top level `collection`, `openiti` (`source`, `path`, `sha256`), `fawazahmed0_commit`, `containment_threshold`, `entries`; per entry `hadith`, `run_first`, `run_last`, `reason`, `class` (`fill-safe`, `merge-prev`, `merge-next`, `unknown`), `source` (`openiti`, `hadithapi.com`, `none`), `prev`, `next`, `openiti_unit`, `openiti_unit_number`, `hapi_numbers_in_record`, `hapi_declared_merge`. JSON numbers (`391.2`, `5710`) are converted to strings with `(string)` after `json_decode`; a float that would print with an exponent or loses digits makes the loader throw (`decision_number_not_exact`). Source `hadithapi.com` maps to origin code `hadithapicom`.

The **final measurement round is still running**: the code must work with whatever the final files say. Muslim, Tirmidhi and Malik keep `unknown` entries; those numbers land in `unresolved`, stay incomplete, and the gate holds the collection back automatically. Do not special-case any collection or number except through config.

#### `chapters/{slug}.json`
```json
{
  "schema_version": 1,
  "collection": "abudawud",
  "source": "openiti",
  "release": "2023.1.8",
  "doi": "10.5281/zenodo.10007820",
  "version_id": "0275AbuDawudSijistani.Sunan.Shamela0001726-ara1",
  "source_file_sha256": "<64 hex>",
  "matcher_version": "1",
  "partial_books": "drop",
  "licence": "CC BY-NC-SA 4.0, see LICENSE-NOTICE.md",
  "chapters": [
    { "ordinal": 1, "book_number": "1", "first": "1", "last": "5", "title_ar": "<cleaned heading>" }
  ]
}
```
`ordinal` is 1-based **per book**, in OpenITI order. `first` and `last` are hadith-number strings. **No hadith text and no match statistics** in this file (a test asserts the key whitelist). `chapters` sorted by book order of the collection, then `ordinal`. `partial_books` is `drop` or `keep` (Q5).

### 2.4 Text rules for filled text (closed list; Q1)
ADR 0076 «Decision on gaps» says fills are stored byte for byte after the closed marker-removal list of §3 only. §3 was written for headings. The text of a unit in an OpenITI mARkdown file needs these steps, applied by one pure class `App\Domains\Hadith\Overlay\OpenItiTextCleaner::clean(array $lines, int $markerEnd): string`. They are exactly what the measurement did, mapped to §3:

| Step | Rule | ADR 0076 §3 item |
| --- | --- | --- |
| G1 | On every line after the first, remove the leading run of the characters `~`, `#` and ASCII space (`ltrim($line, "~# ")`) | item 1, line-start markers (**extension: body lines, not only headings**) |
| G2 | On the first line keep only what follows the unit's number marker (`substr($line, $markerEnd)`); the marker and its number are not text | item 1 (**extension: the number prefix is not in §3**) |
| G3 | Remove every match of `PageV\S+` and `ms\d+` (the research's pattern), the token only, no neighbouring space | item 2 |
| G4 | Drop lines that are empty or ASCII-whitespace-only after G1 to G3, then join the remaining lines with **one ASCII space** | item 3 (**extension: body lines**) |
| G5 | Trim ASCII whitespace (space, tab, CR, LF, FF, VT) at both ends | item 4 |

Nothing else is removed: diacritics, U+200E/U+200F and other bidirectional marks, punctuation and internal spaces stay exactly as the file has them. **The implementer must not add a step.** The command counts, per collection, the fills whose result still contains `#`, `~`, `|`, `$`, `PageV` or a run of two ASCII spaces (`residual_markers`, `double_spaces`) and prints the counts; it does not clean them. **G1, G2 and G4 are extensions of §3 that the developer must approve before 6b.8 commits any data file (Q1).** hadithapi.com text is stored **exactly as received** (`hadithArabic` after JSON decoding, no trim, no cleaning); the command counts texts containing `<` or `&` and does not clean them (Q2).

### 2.5 Names used across parts (all under `App\Domains\Hadith` unless stated)
- `Overlay\HadithDataFiles` — the **only** class that calls `database_path('data/hadith')`. Read-only methods.
- `Overlay\GapFile`, `Overlay\GapFill`, `Overlay\GapMerge`, `Overlay\GapBook`, `Overlay\GapUnresolved`, `Overlay\ChapterFile`, `Overlay\ChapterRecord`, `Overlay\GapDecisions`, `Overlay\GapDecision` — `final readonly` value objects (plain PHP, no Eloquent).
- `Overlay\HadithOverlay` (the applied result, section 5.3), `Overlay\HadithOverlayBuilder` (service that loads and applies).
- `Overlay\OpenItiTextCleaner`, `Overlay\OpenItiHeadingCleaner`, `Overlay\OpenItiUnitReader`, `Overlay\HadithWordSet`.
- `Exceptions\HadithDataFileException` (`final`, extends `RuntimeException`, doc line like the other exceptions).
- The pack gate is `App\Domains\Content\Packs\HadithPackReadiness` (next to `DuasPackReadiness`), not in the Hadith domain.
- Console: `Console\BuildGapsCommand` (`hadith:build-gaps`), `Console\MatchChaptersCommand` (`hadith:match-chapters`). Services: `Services\HadithGapBuilder`, `Services\HadithChapterMatcher`.

Add `Overlay` classes to the existing arch rules: plain PHP value objects use no `Illuminate\Database`. See each part for the arch test edits.

## 3. Part 6b.1 — Foundations and the completeness gate

### 3.1 Files

| File | Change |
| --- | --- |
| `database/migrations/2026_11_07_110001_insert_openiti_and_hadithapicom_content_sources.php` | new (3.2) |
| `database/migrations/2026_11_07_110002_add_completeness_to_hadith_collections_table.php` | new (3.3) |
| `config/hadith.php` | add the five keys of 2.1 with the empty values shown |
| `app/Domains/Hadith/Exceptions/HadithDataFileException.php` | new |
| `app/Domains/Hadith/Overlay/HadithDataFiles.php` | new (3.4) |
| `app/Domains/Hadith/Models/HadithCollection.php` | add `@property bool $is_complete`, `@property int $incomplete_count`, casts `is_complete => boolean`, `incomplete_count => integer` |
| `database/factories/HadithCollectionFactory.php` | definition gets `'is_complete' => true, 'incomplete_count' => 0`; new state `incomplete(int $count = 1)` |
| `app/Domains/Hadith/Import/Records/CollectionStats.php` | append constructor params (3.5) |
| `app/Domains/Hadith/Services/HadithMapper.php` | compute completeness (3.5); `VERSION` 2 to 3 |
| `app/Domains/Hadith/Import/Records/CollectionImportResult.php` | `STATUS_HELD_BACK = 'held_back'` (3.6) |
| `app/Domains/Hadith/Import/Records/HadithImportReport.php` | add the report keys (3.7) |
| `app/Domains/Hadith/Services/HadithImporter.php` | held-back flow (3.6) |
| `app/Domains/Hadith/Services/HadithImportFingerprint.php` | add `completeness_exceptions` input |
| `app/Domains/Content/Packs/HadithPackReadiness.php` | new (3.8) |
| `app/Domains/Content/Packs/PackBuilder.php` | inject and call it (3.8). Edit additively, next to `DuasPackReadiness` |

### 3.2 Migration: `content_sources` rows
`2026_11_07_110001_insert_openiti_and_hadithapicom_content_sources.php`, anonymous class like `2026_11_01_110001_insert_fawazahmed0_content_source.php`. `up()` uses `DB::table('content_sources')->updateOrInsert(['code' => ...], ...)` so a local row converges (set `created_at` only on insert, like `2026_11_07_100001_insert_way2quran_content_source.php`). `down()` deletes both rows by code.

| Column | `openiti` | `hadithapicom` |
| --- | --- | --- |
| `name` | `OpenITI (Open Islamicate Texts Initiative)` | `hadithapi.com` |
| `licence_url` | `https://creativecommons.org/licenses/by-nc-sa/4.0/` | `https://hadithapi.com` |
| `attribution_ar` | proposed wording below | `نصوص بعض الأحاديث التي ينقصها المصدر الأساسي: hadithapi.com` |
| `attribution_en` | proposed wording below | `Text of some hadith missing from the main source: hadithapi.com` |
| `permission_status` | `granted` | `pending` |
| `notes` | see below | see below |

`openiti` `attribution_ar`: «عناوين الأبواب ونصوص بعض الأحاديث التي ينقصها المصدر الأساسي: OpenITI (مبادرة النصوص الإسلامية المفتوحة)، الإصدار 2023.1.8، الترخيص CC BY-NC-SA 4.0. أُجريت تعديلات: حُذفت رموز التنسيق، وربطت الأبواب بترقيم fawazahmed0/hadith-api.»
`openiti` `attribution_en`: «Chapter titles, and the text of some hadith missing from the main source: OpenITI (Open Islamicate Texts Initiative), release 2023.1.8, CC BY-NC-SA 4.0. Changes were made: formatting markers removed; chapters mapped to the hadith numbering of fawazahmed0/hadith-api.»
These two texts are **proposed** (the ADR §8.3 wording says «no hadith text is taken from OpenITI», which the gap decision made untrue; Q4). Keep them in two `private const` strings so a later migration can change them.
`openiti` `notes`: «Zenodo release 2023.1.8, version DOI 10.5281/zenodo.10007820, licence CC BY-NC-SA 4.0 (granted by the licence; provenance only, ADR 0076 §8.2). Tirmidhi's Sunan is not in that release: pinned to GitHub OpenITI/0300AH commit 01a1544130e0236850ef2698923ad01575c5bd7c, same licence. Used for chapter titles and number ranges, and for the text of hadith numbers that fawazahmed0 lacks (ADR 0076, 7 Nov 2026). Shamela-derived; upstream rights as RB13/RB21. ShareAlike applies to the chapter data and to the filled text.»
`hadithapicom` `notes`: «hadithapi.com publishes no terms. The developer accepted the risk on 7 Nov 2026 (ADR 0076 gap-report decision 8, RB16). Text of a few hadith that neither fawazahmed0 nor OpenITI has, produced locally with a dev-only key and committed as pinned data files; never fetched in production.»

### 3.3 Migration: completeness columns
`2026_11_07_110002_add_completeness_to_hadith_collections_table.php`, `Schema::table('hadith_collections', ...)`, additive:
- `$table->boolean('is_complete')->default(false)->after('books_count');`
- `$table->unsignedInteger('incomplete_count')->default(0)->after('is_complete');`
`down()` drops both columns. These columns are **not** added to `PackSchema` (the pack selects only the declared columns), so the pack is unchanged. The default `false` is deliberate: a row the importer did not write is never served.

### 3.4 `Overlay\HadithDataFiles` (read-only)
```php
final class HadithDataFiles
{
    /** @throws HadithDataFileException */
    public function chapters(string $slug): ?ChapterFile;      // 6b.5 fills the body; 6b.1 ships the SHA logic and a private readVerified()
    /** @throws HadithDataFileException */
    public function gaps(string $slug): ?GapFile;               // body in 6b.4
    /** @throws HadithDataFileException */
    public function decisions(string $slug): ?GapDecisions;     // body in 6b.6
    /** The pinned hash (or null) for a data-file path such as 'gaps/nasai.json'. */
    public function pin(string $relativePath): ?string;
    /** Hash of the bytes on disk, null when the file does not exist. */
    public function actualSha256(string $relativePath): ?string;
}
```
Rules for `readVerified(string $relativePath): ?string` (returns the bytes, or null when there is **no file and no pin**):
1. Path is built from `database_path('data/hadith/'.$relativePath)`; `$relativePath` must match `~^(chapters|gaps|gaps/decisions)/[a-z0-9]+\.json$~` else throw.
2. Pin missing/`null` and file exists: throw `HadithDataFileException('Data file [..] exists but has no pin.')`.
3. Pin set and file missing: throw (`pinned file missing`).
4. Pin set and file exists: `hash_equals($pin, hash('sha256', $bytes))` or throw (`SHA-256 mismatch`). The pin must match `~^[0-9a-f]{64}$~` or throw.
5. **The hash is checked before `json_decode`.** Decode with `JSON_THROW_ON_ERROR`; a decode error becomes `HadithDataFileException`.
The class never writes. Exception messages contain the path and the code (`pin_missing`, `file_missing`, `sha_mismatch`, `bad_json`), never file content.

In 6b.1 implement `readVerified()`, `pin()`, `actualSha256()` and make `chapters()`, `gaps()`, `decisions()` return `null` when `readVerified()` returns null, and throw `HadithDataFileException('not implemented in this part')` when it returns bytes. The later parts replace that throw.

### 3.5 Completeness in the mapper
`CollectionStats`: **append** these constructor parameters at the end, all with defaults (existing constructions keep working):
`mergedNumbers: list<string> = []`, `filledNumbers: list<string> = []`, `placedNumbers: list<string> = []`, `completenessExceptionNumbers: list<string> = []`, `incompleteNumbers: list<string> = []`, `incompleteReasons: array<string, string> = []` (number => reason code), `complete: bool = false`.

In `HadithMapper::map()` after the main loop (and, in later parts, after merges/fills/placements), compute:
- `incomplete = []`; for every number in the numbering (`$source->hadiths`, file order):
  - accepted (in `$accepted`) → resolved;
  - number in `$noTextNumbers`: resolved if merged (6b.3), else if in `completenessExceptions` → add to `completenessExceptionNumbers`, resolved; else incomplete `no_text`;
  - number in `$outsideRanges` (6b.1 has no placements yet): resolved only through a completeness exception, else incomplete `outside_range`;
- `complete = ($incomplete === [] && no ERROR issue)`. `incompleteNumbers` keeps file order and is capped nowhere (the report caps what it prints, 3.7).
`completeness_exceptions` is read through `HadithCompletenessExceptions::forSlug()` (a tiny validated reader like `HadithRangeCorrections`; values must be lists of non-empty strings; an unknown slug throws `HadithDataFileException`). **Do not reuse `reference_exceptions`.**

### 3.6 Importer behaviour
`CollectionImportResult`: add `public const string STATUS_HELD_BACK = 'held_back';`. `failed()` is **unchanged**: `held_back` is not a failure, the command exit code stays success, and `release.sh` (step 17) must not fail while some collections are incomplete.

In `HadithImporter`:
1. `importCollection()`: dry run keeps status `valid`; stats carry `complete`.
2. `write()` receives `$complete` (from `$mapping->stats->complete`):
   - the plan's `collection` row gets `'is_complete' => $complete ? 1 : 0` and `'incomplete_count' => count($stats->incompleteNumbers)` (the plan type `array<string, int|string|null>` stays valid);
   - `resources->create([... 'is_active' => $complete])` and `$resource->is_active = $complete;` replace the two places that set `true`;
   - the version still bumps and the rows are written when incomplete (the developer reviews them; the resource is simply not served);
   - `packAfterCommit()` is **not called** when incomplete: the pack result is `['built' => false, 'queued' => false, 'reason' => 'incomplete']` and `BuildContentPackJob` is not dispatched, with or without `--build-packs`/`--defer-pack`;
   - the result status is `STATUS_HELD_BACK` when incomplete, `STATUS_IMPORTED` otherwise.
3. A re-import that changes a previously complete collection to incomplete sets `is_active = false` in the same transaction; the old pack stays on disk but is not served (`servedResourceIds()` lists active resources only). A later re-import that becomes complete sets `is_active = true` and builds/queues the pack as today.
4. The «unchanged» fingerprint shortcut stays. `HadithImportFingerprint::of()` adds the input `'completeness_exceptions' => ($config[$slug] ?? [])`.
5. **Exceptions stay per collection.** `HadithDataFileException` can come from the new config readers (`HadithCompletenessExceptions`, later `HadithPlacements`) and from the overlay and chapter loaders. Specify and test all three:
   - `run()` and `verify()` validate every new config key for **all** requested slugs up front, next to `$this->corrections->assertKnown()` (a malformed or unknown-slug value throws before any work; `ImportHadithCommand` catches it and returns `FAILURE` with the message);
   - `importCollection()` and `verifyCollection()` catch `HadithDataFileException` around the overlay build, the chapter load and `map()`, exactly where `HadithRangeCorrectionException` is caught today, and return `STATUS_FAILED` with the exception message (no content). The run goes on with the next collection and nothing is written for the failed one;
   - test: `it('fails one collection on a bad data file and still imports the next')`.
6. **The unchanged path reports completeness.** `HadithImportRepository::storedCounts()` (contract and Eloquent implementation, both inside the Hadith domain) also returns `complete: bool` (the stored `is_complete`). The fingerprint shortcut result then carries `complete` and the stored `incomplete_count` (new optional fields on `CollectionImportResult`: `?bool $complete = null`, `?int $incompleteCount = null`, appended with defaults), and the report prints `complete: yes/no` for an unchanged collection too. Status stays `unchanged`. Step 17's log can then list held-back collections. Test: `it('reports complete: no for an unchanged held-back collection')`.
7. `verify()` is otherwise unchanged in 6b.1 (later parts add the overlay to both paths).

### 3.7 Report
`HadithImportReport::toArray()`: in each collection's `counts` add `complete` (bool), `incomplete` (int), `merged` (int), `filled` (int), `placed` (int); in `lists` add `incomplete_numbers` (first 100 numbers; the real count is in `counts`), `incomplete_reasons` (number => code, same 100), `merged_numbers`, `filled_numbers`, `placed_numbers` (all, they are short). The console summary line per collection ends with `complete: yes` or `complete: no (N incomplete)`. `HadithImportReport::succeeded()` ignores `held_back`. The existing test «never puts text, titles or section names in the report» must keep passing.

### 3.8 Pack gate
`app/Domains/Content/Packs/HadithPackReadiness.php`, modelled on `DuasPackReadiness`:
```php
final class HadithPackReadiness
{
    /** @throws PackBuildException */
    public function assertReady(int $resourceId): void
    // loads HadithCollection where resource_id; missing row or is_complete === false => throw new PackBuildException('The Hadith collection is incomplete or not imported. The pack is not built.');
}
```
`PackBuilder`: add `private readonly HadithPackReadiness $hadith` to the constructor (after `$namesGate`; keep the others), and in `build()` after the `Duas` branch: `if ($resource->group === ResourceGroup::HadithCollections) { $this->hadith->assertReady($resource->id); }`. Run `grep -rn "new PackBuilder" apps/api` and fix any manual construction (the container normally resolves it).

### 3.9 Tests (6b.1), Pest, placeholders only
New: `tests/Feature/Hadith/Gaps/HadithCompletenessTest.php`, `HadithDataFilesTest.php`, `HadithPackGateTest.php`, `HadithContentSourcesMigrationTest.php`.
- Migration: `it('inserts openiti as granted with the licence deed link')`, `it('inserts hadithapicom as pending with the no-terms note')`, `it('updates a stale local row instead of failing')`, `it('removes both rows on rollback')`; attribution columns are non-empty.
- Completeness (use the fixture builders in `HadithImportFixtures.php`): `it('is complete when every number has text')`; `it('lists a no-text number as incomplete with reason no_text')`; `it('lists an outside-range number as incomplete with reason outside_range')`; `it('accepts a completeness exception and reports it')`; `it('does not accept a reference exception as a completeness exception')`; `it('is incomplete when an error issue exists')`; stats lists hold numbers only.
- Importer: `it('writes an incomplete collection, marks it inactive and queues no pack')` (assert `is_complete` 0, `incomplete_count`, `resources.is_active` false, `Queue::assertNothingPushed`, status `held_back`, `failed()` false, command exit 0); `it('writes a complete collection active and queues the pack')`; `it('deactivates a resource when a re-import turns it from complete to incomplete')` (import complete, then remove a text from the fixture and change the pin so the fingerprint changes; assert `is_active` false, version bumped); `it('reactivates when it becomes complete again')`; `it('keeps a held-back collection out of the manifest')` (call `GET /api/v1/content/manifest` or the `ContentDeliveryService`; assert absent); `it('does not build a pack with --build-packs for an incomplete collection')` (result `pack.reason` `incomplete`, no `ContentPack` row).
- Pack gate: `it('refuses to build a pack for a collection with is_complete false')` (`HadithCollectionFactory::new()->incomplete()`, expect `PackBuildException`); `it('builds for a complete collection')`; `it('refuses when the collection row is missing')`.
- Data files: `it('returns null when there is neither file nor pin')`; `it('refuses a file with no pin')`; `it('refuses a pin with no file')`; `it('refuses a file whose SHA-256 differs')` (message has the code, never content); `it('checks the hash before parsing')` (invalid JSON with a wrong pin gives `sha_mismatch`, not `bad_json`); `it('refuses a malformed pin')`; `it('refuses a path outside the allowed folders')`. Use `File::put` into a temp copy: make `HadithDataFiles` take `?string $baseDirectory = null` in its constructor and use `$this->baseDirectory ?? database_path('data/hadith')`; tests construct it with a temp directory.
- Arch (`tests/Feature/Hadith/Import/HadithImportArchTest.php`, append only): `arch('overlay value objects are plain PHP')->expect('App\Domains\Hadith\Overlay')->not->toUse(['Illuminate\Database', 'Spatie\LaravelData', 'Illuminate\Http'])`. `HadithDataFiles` reads with plain `file_get_contents` and `is_file` (no `Illuminate\Support\Facades\File`, no `Illuminate\Database`). Also `it('reads database_path only in HadithDataFiles within the Hadith domain')`: scan `app/Domains/Hadith` for `database_path(`; only `Overlay/HadithDataFiles.php` may contain it (`NamesImporter` also uses it, outside the Hadith domain, and is not scanned).

### 3.10 Existing step 6 tests whose expectations change (update them, do not delete them)
The default importer fixture (`hadithImportCollection()`) has hadith 3 with no text, so it is now **incomplete**. Add at the end of `HadithImportFixtures.php`:
`function hadithImportApproveFixtureGaps(): void` — sets `config(['hadith.completeness_exceptions' => [<each slug the test imports> => ['3']]])`. Tests that must keep «imports and packs» call it in a `beforeEach`. Affected test names in `HadithImporterTest.php`: `imports the default collection into the six tables, with a resource row`, `imports all ten collections, with the three renamed source files`, `lists no-text hadith in the report and does not import them` (now also asserts `held_back` **without** the approval), `is idempotent: ...`, `builds the pack now with --build-packs ...`, `queues the pack job by default, once, ...`, `queues nothing with --defer-pack`, `skips a text-bearing hadith outside every range and lists it, without failing` (asserts `outside_range` and `held_back`), `counts reference.book 0 as missing and imports the collection`, `bumps the version when ...` tests. Also `HadithConfigTest.php` asserts `reference_exceptions` is `[]` (changed in 6b.2), `HadithMapperTest.php` (stats defaults), `HadithImportCommandTest.php` (exit codes unchanged, summary line), and `HadithPackBuilderTest.php` (uses the factory; the new default keeps it green).

### 3.11 Gate (6b.1)
`cd apps/api && composer qa`. No endpoint shape changes, so no contract regeneration.

## 4. Part 6b.2 — Range corrections, reference exceptions, placements

Only config, the mapper and tests. No data file.

### 4.1 `config/hadith.php` values (exact; from the gap report and ADR 0076 items 5, 6, 9)
```php
'reference_exceptions' => [
    'ibnmajah' => ['2435', '2464', '2476', '2477', '2528'],
],
'range_corrections' => [
    'muslim' => [ ...existing... ],
    'ibnmajah' => [
        '10' => ['first' => '2016', 'last' => '2089'],
        '15' => ['first' => '2390', 'last' => '2435'],
    ],
],
'placements' => [
    'bukhari' => ['521' => '9', '2384' => '42', '2516' => '48', '2711' => '54', '3156' => '58', '4978' => '66'],
    'muslim'  => ['4968' => '33', '4969' => '33', '4970' => '33', '4971' => '33', '5885' => '41', '5886' => '41'],
],
```
Update the comment above `range_corrections` and `reference_exceptions` to say who decided and the evidence (Ibn Majah: `reference.book` agrees for 2490 and 2497 after the correction; the five exceptions are the strays whose `reference.book` disagrees with both the corrected ranges and OpenITI's books). Bukhari 2711 is assigned by number with a weak score (0.463): add the line comment `// weak match, flagged in the gap report`.

### 4.2 Mapper
Add `Services\HadithPlacements` (validated reader like `HadithRangeCorrections`): `forSlug(string): array<string, string>` number => book_number; values must be non-empty strings; unknown slug throws `HadithDataFileException`.

In `HadithMapper::map()`, in the branch where `$candidates === []` today:
1. If `placements[$slug][$number]` exists: it must name a key of `$sections` (any section; the range is ignored) else issue **error** `placement_unknown_section` for that number; use it as `$sectionKey`, add the number to `$placedNumbers`, and continue through the **same** reference check as any other hadith (do not exempt it).
2. If a placement names a number whose range **does** match a section (candidates non-empty): issue **error** `placement_in_range` (stale config surfaces).
3. Otherwise add to `$outsideRanges` as today.
Stats: `placedNumbers` filled; `outsideRanges` excludes placed numbers; completeness (2.2) counts a placed number as resolved. Set `HadithMapper::VERSION` to 4 (one bump per part: 6b.1 sets 3, this part 4, 6b.3 5, 6b.4 6, 6b.5 7). Add `placements` to the fingerprint inputs (`reference_exceptions` is already there).

### 4.3 Tests (6b.2) in `tests/Feature/Hadith/Gaps/HadithPlacementsTest.php` and the existing files
- `it('places a hadith that is outside every range into the named book')`; `it('still applies the reference check to a placed hadith')` (a mismatch is reported as `reference_mismatch` unless it is in `reference_exceptions`); `it('errors on a placement naming an unknown section')`; `it('errors on a placement for a number that has a range')`; `it('counts a placed number as resolved for completeness')`; `it('bumps the version when a placement changes')`.
- Ibn Majah correction: a fixture with two overlapping sections and the corrected ranges assigns the two boundary numbers to one section each; `reference_exceptions` accepts exactly the five numbers and no others (assert the config values with the exact strings above).
- Update `HadithConfigTest.php` line asserting `reference_exceptions` is empty to assert the Ibn Majah list, and add asserts for `range_corrections.ibnmajah` and `placements` (count 6 and 6).
- **Dry-run step for the developer (in the hand-off note, not a test):** run `php artisan hadith:import --dry-run --collection=bukhari --collection=muslim --collection=ibnmajah` and report, per placed number, whether `reference.book` agreed. Any placed number that shows a mismatch needs a developer decision (Q6); the implementer adds nothing to `reference_exceptions` on their own.

### 4.4 Gate: `composer qa`.

## 5. Part 6b.3 — Merges

### 5.1 Design and why (decision for the plan; Q7 lists the ADR conflict)
**A merged number has no row.** Its text is already inside a neighbouring row (the «covering» row), so storing it again would show the text twice. Each covering row carries two nullable text columns, `number_first` and `number_last`, that hold the lowest and highest number of the covered span **including the row's own number** (display «٥٧٠٩–٥٧١٢»; a merge into the next row gives a span that ends at the row's own number). Both columns are null for an ordinary row.

Why columns and not an alias table:
- **Lookup by number keeps working with no new table.** Lookup is: exact `hadith_number` match first; if none, the row whose span contains the number (`number_first <= n <= number_last`, compared as numbers). The importer enforces that no other row's number lies inside a span, so the answer is unique.
- **The existing `hadith_ref_aliases` table cannot be reused.** It is for source switches: step 11's alias applier rewrites or marks saved items from it, and step 18 replaces it. A merge row there would silently change a user's saved number, and re-imports would need selective deletes.
- A new alias table would add a pack table, a mobile table, a change-feed entity and a delete order for a few dozen rows; the columns add two nullable columns to a table that already exists in the pack and in `content.db`.
Cost: a pack-schema column change and a range lookup in step 7 and step 10 (both in section 11). `PackSchema::VERSION` stays `1` because no Hadith pack has shipped (Q8 asks the developer to confirm).

### 5.2 Files

| File | Change |
| --- | --- |
| `database/migrations/2026_11_07_110003_add_number_range_and_source_code_to_hadith_entries_table.php` | new |
| `app/Domains/Hadith/Models/HadithEntry.php` | `@property string\|null $number_first`, `$number_last`, `$source_code` |
| `database/factories/HadithEntryFactory.php` | definition keys `number_first => null`, `number_last => null`, `source_code => null`; states `merged(string $first, string $last)` |
| `app/Domains/Content/Packs/PackSchema.php` | append three nullable text columns to `hadithEntries()`: `number_first`, `number_last`, `source_code` (after `source_url`) |
| `app/Domains/Hadith/Overlay/GapMerge.php`, `Overlay/HadithOverlay.php`, `Overlay/HadithOverlayBuilder.php` | new |
| `app/Domains/Hadith/Services/HadithMapper.php` | merges; `VERSION` 5 |
| `app/Domains/Hadith/Validation/HadithCollectionValidator.php` | one new check (5.4) |

Migration: `$table->string('number_first', 32)->nullable()->after('arabic_number'); $table->string('number_last', 32)->nullable()->after('number_first'); $table->string('source_code', 32)->nullable()->after('source_key');` `source_code` is null when the row comes from the collection's primary source; it is `openiti` or `hadithapicom` for a filled row (6b.4) so the app can show the right credit (the pack has no `source_id`). `down()` drops the three columns.

### 5.3 Overlay (merge part)
`Overlay\HadithOverlay` (final readonly): `fills: array<string, GapFill>` (empty in this part), `merges: array<string, string>` (merged number => covering number), `books: list<GapBook>` (empty), `originSourceIds: array<string, int>`, `originVersions: array<string, string>`. `HadithOverlayBuilder::build(string $slug, SourceCollection $source, array $originSourceIds): ?HadithOverlay` returns null when there is no gaps file. In this part the gaps file reader (`HadithDataFiles::gaps()`) parses and validates `merges` only; add the other sections in 6b.4 (the parser rejects unknown top-level keys with `HadithDataFileException('unknown_key')`, so parse them all now but ignore `fills`/`books` content in the mapper until 6b.4). Validation (all throw `HadithDataFileException`):
- `merges[*].number` exists in the numbering, has **no** text in the source, and is not also a fill; `merges[*].into` exists in the numbering **with text** (own text; a fill target is allowed after 6b.4); `into != number`; a merged number appears once;
- a number cannot be both merge and unresolved.
The importer passes `$overlay` to `HadithMapper::map()` as a new **last optional parameter** `?HadithOverlay $overlay = null`. Existing callers (`HadithSectionTitleProposer`, tests) are unchanged.

### 5.4 Mapper rules
1. Merged numbers are not in `$noTextNumbers` any more: they go to `stats->mergedNumbers` (and count as resolved).
2. After `$accepted` is built, for each covering number collect `own + merged`, take the minimum and maximum by `(float)` value (decimal numbers compare as decimals), and set the covering entry's `number_first` and `number_last` to the **original strings** of the minimum and the maximum. If the covering row has no merged numbers both stay null.
3. If a covering number is not in `$accepted` (no text, outside range, or itself merged): issue **error** `merge_target_missing` for the merged number and add it to `incompleteNumbers` with reason `merge_target_missing`.
4. `HadithCollectionValidator::validate()`: for every row with a span, if any **other** accepted row's number lies in `[number_first, number_last]` (numeric), issue error `merge_range_overlaps_row` (subject = the covering number). Also error `merge_range_crosses_book` when a merged number's hadith would fall in another book than the covering row: determine the merged number's book by its range (and placement); if no range holds it, skip this check.
5. `books.hadith_count`, `collection.total_hadith` count **rows**; merged numbers add nothing. State this in a code comment: a collection's `total_hadith` is smaller than its numbering by the number of merged numbers (and of excepted numbers).
6. `source_code` for a normal row stays null.

### 5.5 Tests (6b.3), `tests/Feature/Hadith/Gaps/HadithMergesTest.php`
- `it('gives the covering row a span that includes its own number')` (merge into the previous row: 5709 covers 5710–5712 gives first `5709`, last `5712`).
- `it('gives a merge into the next row a span that ends at the row number')`.
- `it('handles a row covering merges on both sides')` (merge-split).
- `it('compares decimal numbers as decimals')` (`391` and `391.2`).
- `it('does not duplicate text: a merged number has no row')` (entry count unchanged; `total_hadith` equals row count).
- `it('counts merged numbers as resolved for completeness')`; `it('fails the import with merge_target_missing when the covering row has no text')`; `it('fails with merge_range_overlaps_row when another row lies inside the span')`; `it('rejects a merge for a number that has text')`; `it('rejects a merged number that is also a fill')`.
- Pack: update `tests/Unit/Content/PackSchemaHadithTest.php` (hadith_entries column list, nullable names, row shape) and `HadithPackBuilderTest.php`; the latter adds `it('carries number_first, number_last and source_code and keeps them null for a normal row')`; the existing test asserting nullable column names for `hadith_entries` adds the three. Mobile fixtures are not touched.
- Import writes and reads the two columns (`HadithEntry::where(...)->value('number_first')`).
- Round trip: the pack's `hadith_entries` row for the covering number has the span; the merged number has no row anywhere.

### 5.6 Gate: `composer qa`. Contract: unchanged in this part (API follow-up is in section 11).

## 6. Part 6b.4 — Gap fills and the Nasa'i missing book

### 6.1 Files

| File | Change |
| --- | --- |
| `app/Domains/Hadith/Overlay/HadithDataFiles.php` | implement `gaps()`: parse and validate (6.2) |
| `app/Domains/Hadith/Overlay/{GapFile,GapFill,GapBook,GapUnresolved}.php` | new |
| `app/Domains/Hadith/Overlay/HadithOverlayBuilder.php` | apply fills and books |
| `app/Domains/Hadith/Services/HadithMapper.php` | per-row origin; extra sections; `VERSION` 6 |
| `app/Domains/Hadith/Services/HadithImporter.php` | resolve origin source ids; overlay in import and verify; fingerprint |
| `app/Domains/Hadith/Services/HadithImportFingerprint.php` | add `gaps_sha256`, `extra_books` |
| `config/hadith.php` | `extra_books` value (6.4) |
| `database/data/hadith/gaps/LICENSE-NOTICE.md` | new (6b.8 writes the text; create the file empty with a one-line title now so the test can check existence) |

### 6.2 Gaps file validation (in `HadithDataFiles::gaps()`), each failure `HadithDataFileException` with a code
`schema_version` is 1; `collection` equals the slug; `fawazahmed0_commit` equals `config('hadith.commit')`; every `fills[*].origin` and `merges[*].origin` is a key of `origins`; `fills[*].source_key` equals `{origin}:{slug}:{number}` and is at most 96 characters; `source_text_sha256` equals `hash('sha256', text_ar)`; `text_ar` is non-empty valid UTF-8; numbers are non-empty strings of at most 32 characters; no number appears twice across `fills`, `merges`, `unresolved`; `books[*]` has `book_number` (string or null), `after_book`, `first`, `last`, `title_ar`, `origin`, `source_key` (at most 96).

### 6.3 Applying fills
`HadithOverlayBuilder::build()`:
1. For each fill, find the `SourceHadith` with that number in the file. It **must exist and have null or empty text**; otherwise throw `HadithDataFileException('fill_target_missing')` / `fill_target_has_text`. Replace it **in place** (same position, so file order and `position` in the book are unchanged) with a new `SourceHadith(number, <the existing arabicNumber>, text_ar, [], null, null)`. A fill has no grades and no `reference`, so the reference check skips it (`referenceBook === null`).
2. For each `books[*]`: if `book_number` is `null`, throw `HadithDataFileException('book_number_undecided')` (Q3). Otherwise build a `SourceSection(key: book_number, titleEn: null, firstHadithNumber: first, lastHadithNumber: last, firstArabicNumber: null, lastArabicNumber: null)` and **insert it right after the section whose key is `after_book`** in the section list (throw if `after_book` is unknown, or if the new key already exists, or if `first`/`last` overlap another section's range after corrections).
3. Return a `HadithOverlay` with `fills`, `merges`, `books`, `originSourceIds` (origin code => `content_sources.id`), `originVersions`.

The importer resolves the ids with `$this->repository->source('openiti')` / `source('hadithapicom')` for the origins named in the file; a missing row throws `\LogicException` like `content()`.

### 6.4 `config('hadith.extra_books')`
```php
'extra_books' => [
    'nasai' => [
        ['book_number' => null, 'after_book' => '35', 'first' => '3857', 'last' => '3938', 'openiti_heading_ordinal' => 36],
    ],
],
```
`book_number` stays `null` until the developer decides it (Q3). It is the API `{book}` key and fawazahmed0 has none for this book. `HadithOverlayBuilder` takes the book's number from the **gaps file**; the config entry is read only by `hadith:build-gaps` (to find the OpenITI heading) and cross-checked: the gaps file's `book_number`, `after_book`, `first`, `last` must equal the config entry, else `HadithDataFileException('book_mismatch_with_config')`.

### 6.5 Mapper rules (per-row origin)
`map()` gets the overlay (already a parameter since 6b.3). For a hadith whose number is in `$overlay->fills`:
- entry `source_id` = `$overlay->originSourceIds[origin]`; `source_key` = the fill's `source_key`; `source_version` = `$overlay->originVersions[origin]`; `source_text_sha256` = `hash('sha256', text)`; `source_code` = origin code; `text_ar` = the fill's text unchanged; `text_search` from the normaliser like every row.
- `stats->filledNumbers` lists them; they count as `imported`.
- An extra book becomes a normal book row: `source_id` = the origin's id, `source_key` = the book's `source_key`, `title_ar` = the book's `title_ar` (the file value; **not** from `HadithTitles`, which only knows the source's own books), `title_en` null; its `position` follows the section order (so it sits between sections 35 and 36 and later books shift by one).
- Every other book and entry row is unchanged.
**The integrity checker (`HadithTextIntegrityChecker`) needs no change** (it compares the plan's own hashes). It must still pass for fills (test below).

### 6.6 Overlay on both import and verify
`HadithImporter::importCollection()` **and** `verifyCollection()` build the overlay identically (`HadithOverlayBuilder`) and pass it to `map()`. `verify()` must not report fill rows as `extra`. The fingerprint adds `'gaps_sha256' => $this->dataFiles->actualSha256('gaps/'.$slug.'.json')` and `'extra_books' => config`. A `HadithDataFileException` from the builder gives status `failed` with the exception message (no content), exactly like a pin failure; nothing is written.

### 6.7 Tests (6b.4), `tests/Feature/Hadith/Gaps/HadithFillsTest.php`
Fixture gaps files are written to a temp data dir with computed pins (helper `hadithGapsFixtureFile(string $slug, array $fills, array $merges = [], array $books = []): string` appended to `HadithImportFixtures.php`).
- `it('fills a no-text number in place with the filled text, origin id and key')` (assert `source_id` is the `openiti` row, `source_key` `openiti:{slug}:{n}`, `source_version`, `source_code`, `position` unchanged, `text_ar` bytes equal the file's, `source_text_sha256` correct).
- `it('uses the hadithapicom row for a hadithapicom fill')`.
- `it('refuses a fill whose target has text')`, `it('refuses a fill for a number the edition does not have')`, `it('refuses a wrong text hash')`, `it('refuses a source_key that does not follow the rule')`.
- `it('inserts the extra book after after_book and shifts later positions')`; `it('puts the fills of the extra book inside it by range')`; `it('refuses an undecided book number')`; `it('refuses a book whose range overlaps another section')`; `it('uses the title from the file for the extra book')`.
- `it('resolves a collection to complete when fills close every gap')` and `it('stays incomplete while an unresolved number remains')` (`unresolved` entries never resolve anything).
- `it('verify reports no extra rows for filled rows')`; `it('integrity check passes for filled rows')`; `it('changing the gaps file bumps the version, and an identical re-import does not')`; `it('refuses a gaps file whose SHA-256 differs from the pin')`.
- Round trip bytes: a fill containing U+200F, a combining mark and two internal spaces comes back from the database and from the built pack byte for byte.
- A pack for a collection with fills lists `source_code` `openiti` for the filled rows and null for the others.

### 6.8 Gate: `composer qa`.

## 7. Part 6b.5 — Chapter import

### 7.1 Files

| File | Change |
| --- | --- |
| `app/Domains/Hadith/Overlay/{ChapterFile,ChapterRecord}.php` | new |
| `app/Domains/Hadith/Overlay/HadithDataFiles.php` | implement `chapters()` |
| `app/Domains/Hadith/Services/HadithChapterAssigner.php` | new (7.3) |
| `app/Domains/Hadith/Services/HadithImporter.php` | call the assigner between `map()` and `validate()` (the seam in `step-06-importer.md`, «Chapter seam») |
| `app/Domains/Hadith/Services/HadithImportFingerprint.php` | add `chapters_sha256` |
| `app/Domains/Hadith/Services/HadithMapper.php` | `VERSION` 7 (the mapper itself does not read chapters) |
| `app/Domains/Hadith/Validation/HadithCollectionValidator.php` | chapter checks (7.4) |
| `app/Domains/Hadith/Import/Records/MappingResult.php` | no change; the assigner returns a new `MappingResult` |
| `database/data/hadith/chapters/LICENSE-NOTICE.md` | create with a one-line title (6b.8 writes the text) |

### 7.2 Chapter file validation (`HadithDataFiles::chapters()`)
`schema_version` 1; `collection` equals the slug; `source` is `openiti`; `partial_books` is `drop` or `keep`; every chapter has integer `ordinal` ≥ 1, string `book_number`, `first`, `last` non-empty strings of at most 32 characters, non-empty `title_ar`; no other keys (a **key whitelist** at chapter and header level; any unknown key throws `unknown_key`, so a text or statistics field can never be committed). Within one book ordinals are strictly increasing and unique (gaps allowed, because a rejected chapter keeps its ordinal slot).

### 7.3 `HadithChapterAssigner::assign(MappingResult $mapping, ?ChapterFile $file, int $openitiSourceId, string $slug): MappingResult`
No file: return the mapping unchanged (a collection with no file imports exactly as today). With a file:
1. Group the plan's entries by `book_id` in `position` order. Map `book_number` to book id from `plan->books`; a chapter naming a book that is not in the plan throws `HadithDataFileException('chapter_book_unknown')`.
2. For each chapter in file order: in its book's entry list find the index of the entry whose `hadith_number === first` and of the one whose `hadith_number === last`; either missing: error issue `chapter_bound_missing`; `last` before `first`: `chapter_range_inverted`. All entries from first to last inclusive get `chapter_id` = this chapter's id. An entry already assigned: `chapter_overlap`. The assignment is by **position order inside the book**, so merge-covering rows and filled rows between the bounds are included.
3. Chapter rows (appended to `plan->chapters`, `id` = running 1-based count over the file order): `book_id`, `chapter_number` = `ordinal`, `source_chapter_key` = `(string) ordinal`, `title_ar` = the file's title **unchanged** (byte for byte), `title_en` null, `position` = `ordinal`, `hadith_count` = the number of entries assigned, `source_id` = the `openiti` row id, `source_key` = `openiti:{slug}:{book_number}:{ordinal}` (at most 96; the validator checks).
4. Option C: if `partial_books` is `drop`, every book that has at least one chapter must have **every** entry assigned, else error `partial_book_chapters` (subject = book number). With `keep` partial books are allowed (kept for option B, Q5).
5. Chapters do not affect `is_complete`.
Edit `HadithImporter` at the seam only: after `$this->mapper->map(...)` and the overlay (6b.4), call the assigner, then `$this->validator->validate(...)`. The `HadithImportPlan` and the repository are unchanged (`replaceForResource()` already deletes and inserts `hadith_chapters`).

### 7.4 Validator additions
`validate()`: errors `chapter_title_empty` (null or empty after load), `source_key_too_long` for chapter keys, `chapter_number_too_long`. Also fail if two chapters of one book share the same `first`.

### 7.5 Tests (6b.5), `tests/Feature/Hadith/Gaps/HadithChaptersImportTest.php`
- `it('imports a collection with no chapter file exactly as before')` (no chapter rows, `chapter_id` null).
- `it('writes chapter rows with source_id openiti and the key and ordinals of the file')`; `it('sets chapter_id for every hadith in a chapter and null elsewhere')`; `it('sets hadith_count to the number of entries')`; `it('titles round trip byte for byte')` (U+200F inside, double space inside, Arabic digits); `it('keeps the hadith rows on the primary source')` (`source_id`, `source_key`, `text_ar`, `source_text_sha256` unchanged).
- `it('includes filled rows and merge-covering rows between the bounds')`.
- Failures: `a chapter naming an unknown book`, `a bound that is not in the book` (e.g. its number belongs to another book), `an inverted range`, `two overlapping chapters`, `a drop file with a half-covered book`, `a keep file with a half-covered book passes`, `a file with a text field is refused (unknown_key)`, `a wrong SHA-256 is refused`, `a pin with no file is refused`.
- `it('re-import with the same pins is idempotent and a changed chapter file bumps the pack version')`.
- `it('pack contains hadith_chapters rows only for chaptered collections')`.
- `it('a held-back collection still imports its chapters')` (chapters do not decide completeness).
- Update the step 6 tests `leaves hadith_chapters empty` and `leaves chapter_id null and chapters empty`: they now assert the same **only when no chapter file exists** (rename: `leaves hadith_chapters empty when there is no chapter file`).

### 7.6 Gate: `composer qa`.

## 8. Part 6b.6 — `hadith:build-gaps` (dev only)

Do 6b.6 after 6b.4. It writes the proposal that the developer commits in 6b.8.

### 8.1 Files

| File | Change |
| --- | --- |
| `app/Domains/Hadith/Console/BuildGapsCommand.php` | new |
| `app/Domains/Hadith/Services/HadithGapBuilder.php` | new |
| `app/Domains/Hadith/Overlay/{OpenItiUnitReader,OpenItiTextCleaner,OpenItiHeadingCleaner,HadithWordSet,GapDecisions,GapDecision}.php` | new |
| `app/Domains/Hadith/HadithImportServiceProvider.php` | register the command (append to `commands([...])`) |
| `app/Integrations/HadithApiCom/HadithApiComClient.php`, `HadithApiComRecord.php` | new method and record (8.6). Additive |
| `config/hadith.php` | fill `openiti` (8.2) |
| `tests/Feature/Hadith/Import/HadithImportArchTest.php` | extend the two arch rules (8.7) |

### 8.2 `config('hadith.openiti')` (values are pins; the SHA-256s are from the gap report)
```php
'openiti' => [
    'release' => '2023.1.8',
    'doi' => '10.5281/zenodo.10007820',
    'zenodo_file_id' => 'e1b4fd36-e7b8-4041-b893-3dc5db88c8de',
    'zenodo_archive_md5' => '8563c35f71bb51d4509d839f8cf069e6',
    'tirmidhi_repository' => 'OpenITI/0300AH',
    'tirmidhi_commit' => '01a1544130e0236850ef2698923ad01575c5bd7c',
    'files' => [
        // slug => member path (Zenodo data.zip path, or the GitHub path for tirmidhi), file name, sha256, unit markers
        'bukhari'  => ['path' => '0256Bukhari/0256Bukhari.Sahih/0256Bukhari.Sahih.Shamela0001681-ara1',                         'sha256' => 'b19b17cb5da39e06fde6b099dc8674994ca59980f090a12ca86a55adcd163375', 'unit_start' => '/^### \| ?([0-9]+) ?- /u', 'unit_stop' => '/^###/u'],
        'muslim'   => ['path' => '0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1',                                    'sha256' => 'a96f38425099d55769435a4d8d240b064d7d98c2326457ed8d28fb1f098d32b4', 'unit_start' => '/^# ([0-9]+) /u',            'unit_stop' => '/^(###|# \|)/u'],
        'nasai'    => ['path' => '0303Nasai/0303Nasai.SunanSughra/0303Nasai.SunanSughra.Shamela0000829-ara1',                    'sha256' => '3fce1aacdaa96a20c7fd32f97d6d255196ebe21c458693f9281baf46fd7db11e', 'unit_start' => '/^### \|\|\| ?([0-9]+) ?- ?/u', 'unit_stop' => '/^###/u'],
        'abudawud' => ['path' => '0275AbuDawudSijistani/0275AbuDawudSijistani.Sunan/0275AbuDawudSijistani.Sunan.Shamela0001726-ara1', 'sha256' => '58f8fb59122383c1dd0d7c7184f372a0076f3db9e19e9af9640881564b480472', 'unit_start' => '/^### \| ?([0-9]+) ?- /u', 'unit_stop' => '/^###/u'],
        'ibnmajah' => ['path' => '0273IbnMaja/0273IbnMaja.Sunan/0273IbnMaja.Sunan.Shamela0001198-ara1',                          'sha256' => '17c6161f01caec91d3ee3ea602d2885f6b2bb499de44d6090a76196945dd6bc9', 'unit_start' => '/^### \| ?([0-9]+) ?- /u', 'unit_stop' => '/^###/u'],
        'malik'    => ['path' => '0179MalikIbnAnas/0179MalikIbnAnas.Muwatta/0179MalikIbnAnas.Muwatta.JK000466-ara1',             'sha256' => 'c104e5604d96af249ad631d0c8e92e41e7fd65b53f29d5ae443cb0142637db46', 'unit_start' => '/^# ([0-9]+) /u',            'unit_stop' => '/^(###|# \|)/u'],
        'tirmidhi' => ['path' => 'data/0279Tirmidhi/0279Tirmidhi.Sunan/0279Tirmidhi.Sunan.JK000140-ara1.completed',               'sha256' => '5bc99d3d942ceaa729a83c11389016d940ae11fb0b641a4e012c743f9e44b647', 'unit_start' => '/^### \|\|\| ?([0-9]+)/u',       'unit_stop' => '/^###/u'],
    ],
],
```
The SHA-256 values are copied from `docs/plans/phase-7/gapfill-report.md`, table «Primary versions». Add `'unit_count'` to every `files` entry (Bukhari 7378, Muslim 7461, Nasa'i 5768, Malik 1822, Abu Dawud 5284, Ibn Majah 4343, Tirmidhi 3976). The patterns are the ones the measurement used, with `/u` added. A config test rejects any `sha256` that is not 64 lowercase hex.

### 8.3 `OpenItiUnitReader`
`units(string $path, string $startRx, string $stopRx): list<OpenItiUnit>`, `OpenItiUnit{?int $number, array $lines, int $markerEnd, int $lineIndex}`. Rules, identical to the measurement's `units()`:
1. Read the file; take everything after the first `#META#Header#End#` (the whole file if absent), split on `\n` (strip a trailing `\r`).
2. For each line `i`: if it matches `startRx` → start a new unit (`number` = group 1 as int or null, first line = the line, `markerEnd` = end offset of the match in bytes, `lineIndex` = i); continue. Else if it matches `stopRx` → close the current unit (no unit is open). Else if a unit is open → append the line.
3. The unit list is in file order; **the index in this list is the `unit` stored in decisions (`openiti_unit`)**.
Golden parity (a developer-run check, not CI, because the files are not in the repo): the primary files give these unit counts, which the port must reproduce exactly: Bukhari 7378, Muslim 7461, Nasa'i 5768, Malik 1822, Abu Dawud 5284, Ibn Majah 4343, Tirmidhi 3976. `hadith:build-gaps` prints the count and refuses to continue if it differs from `unit_count` in config (add `'unit_count' => 7378` etc. to each `files` entry).

### 8.4 `OpenItiTextCleaner` and `OpenItiHeadingCleaner`
`OpenItiTextCleaner::clean(array $lines, int $markerEnd): string` implements G1 to G5 of 2.4 and nothing else. `OpenItiHeadingCleaner::clean(array $lines): CleanedHeading{string $title, bool $hadContinuation}` implements ADR §3: (1) remove from the first line the leading `###`, optional spaces, a run of `|` or `$`, optional space; (2) remove `PageV\S+` and `ms\d+` tokens; (3) continuation lines (the lines immediately after the heading that start with `~~`) have the leading `~~` and spaces removed and are joined with one ASCII space; (4) trim ASCII whitespace at both ends. Both are pure, tested with placeholder strings.

### 8.5 `HadithGapBuilder::build(string $slug, string $openitiDir, ?string $retrievedOn): GapBuildResult`
Inputs: decisions (`HadithDataFiles::decisions($slug)`; the pin `data_files['gaps/decisions/{slug}.json']` must exist), the pinned OpenITI file `{openitiDir}/{basename of path}` (verify its SHA-256 equals `config openiti.files[slug].sha256` **and** the decisions file's `openiti.sha256`, else refuse), and the fawazahmed0 snapshot through `HadithSourceRegistry::primary()->collection($slug)`. **It never re-classifies.** For each decision entry, by `class`:

| class | source | action |
| --- | --- | --- |
| `fill-safe` | `openiti` | take `units[openiti_unit]`; the unit's number must equal `openiti_unit_number` (else `unit_number_mismatch`). Re-check (a), for the run `run_first`..`run_last` (all its entries are fills; their units are consecutive), the unit before the run's first fill unit matches the previous fawazahmed0 hadith (`prev`) and the unit after the last fill unit matches `next`, each by the text check of 8.5.1 (≥ 0.5); (b) the fill unit is not contained (≥ 0.8, 8.5.1) in either neighbour's text. Then `text_ar = OpenItiTextCleaner::clean(...)` and a fill row. |
| `fill-safe` | `hadithapicom` | fetch `recordsForNumber` for the gap number, `prev` and `next` (**cache the response per book and number for the whole run**, so a 76-number run asks for its two neighbours once, not 76 times at 1.5 s each) (only integers; a decimal neighbour gives `neighbour_not_fetchable`). Take the one record that lists the gap number; require `hapi_numbers_in_record === 1` as in the decision; re-check the prev/next records match fawazahmed0 (≥ 0.5), the gap record's containment in either neighbour is < 0.8, and it matches no fawazahmed0 hadith within ±20 positions at ≥ 0.5. `text_ar` is the record's `hadithArabic` exactly as received. |
| `merge-prev` / `merge-next` | any | merge row with `into` = the entry's `prev` / `next` (as string). Re-check only that `into` exists in fawazahmed0 with text. For `hadithapicom` merges also re-check that the fetched record lists both the gap and the `into` number, **or** its containment in `into` is ≥ 0.8. |
| `unknown` | any | `unresolved` with reason `unknown_after_measurement` |
A failed re-check turns that number into `unresolved` with the failing code (`recheck_neighbour_failed`, `recheck_duplicate`, `unit_number_mismatch`, `neighbour_not_fetchable`, `recheck_hapi_failed`); it is **not** written as a fill. The set of reason codes is closed: `unknown_after_measurement`, `neighbour_not_confirmed` (only if the decision file says so in `reason`), plus the five above.

**8.5.1 Text check (pure, in `HadithWordSet`).** `HadithWordSet::of(string $text): array<string, true>`: remove `PageV\S+|ms\d+`; remove the code points U+064B to U+0652, U+0670, U+0640, U+200B to U+200F, U+202A to U+202E, U+FEFF; fold أ إ آ to ا, ى to ي, ة to ه; replace every run of characters outside U+0621 to U+063A, U+0641 to U+064A and the ASCII space with a space; split on spaces; keep words of at least 3 characters (`mb_strlen`). `jaccard(a, b)` = |a∩b| / |a∪b|, 0.0 when either set is empty. `containment(unit, other)` = |unit∩other| / |unit|. Thresholds: match ≥ 0.5, contained ≥ 0.8 (`containment_threshold` in the decisions file; read it, do not hard-code). This normalisation is **for comparison only** and is never stored.

**The extra book.** If `config('hadith.extra_books')[$slug]` has an entry: find the `openiti_heading_ordinal`-th book heading in the OpenITI file (a heading line is a line matching `^### \|{1,2} ?` whose cleaned text starts with the word كتاب or أبواب; a parser must accept both heading levels, the report notes the Nasa'i one uses `###||`). Check the 95% two-way rule on its units: forward = share of the numbers `first..last` that appear as unit numbers inside that book, backward = share of the book's units whose number lies in `first..last`; both ≥ 95% (integer math, `intdiv(95*n + 99, 100)`), else refuse. `title_ar` = `OpenItiHeadingCleaner::clean(...)`. `book_number` = the config value; if null write `null` and report `book_number_undecided` (the importer refuses a null, Q3).

### 8.6 hadithapi.com record method (client, additive)
Before editing run `git diff apps/api/app/Integrations/HadithApiCom`. Add
```php
/** @return list<HadithApiComRecord> GET {base}/hadiths?apiKey=…&book={bookSlug}&hadithNumber={number}; records whose hadithNumber list contains $number; 404 gives [] */
public function recordsForNumber(string $bookSlug, int $number): array;
```
and `final readonly class HadithApiComRecord { public function __construct(public string $id, public array $numbers, public string $textAr) {} }` (`numbers` = `hadithNumber` split on `~[,\s]+~`, trimmed, empty parts dropped). It reads only `id`, `hadithNumber`, `hadithArabic` of each object under `hadiths.data`. It uses the client's existing private request path, so the pacing (`request_gap_ms` 1500), `Retry-After` handling and key redaction apply; read that path first and reuse it, do not write a second HTTP routine. The book slug comes from `config('hadith.title_match.books')`. The existing test «reads only chapter ids and Arabic titles…» must keep passing; add `HadithApiComClientTest` cases: `it('reads only id, hadithNumber and hadithArabic of a record')` (fixtures carry extra fields with `FIXTURE` text; `get_object_vars` count is 3), `it('keeps only records that list the number')`, `it('returns an empty list on 404')`, `it('never puts the key in an exception message')`, `it('waits the configured gap between requests')`.

### 8.7 Command `hadith:build-gaps`
Signature: `hadith:build-gaps {--collection=* : slug (repeatable; default every slug that has a decisions file)} {--openiti-dir= : folder holding the pinned OpenITI files (required)} {--retrieved-on= : YYYY-MM-DD, required when any hadithapi.com row is written}`. Rules:
- Refuse when `app()->isProduction()` **before** reading any key or file, same message style as `MatchSectionTitlesCommand`.
- hadithapi.com is touched only when a decision entry needs it, and only through `HadithApiComConfig::fromConfig()` (a missing key gives the existing config error; the command then writes the OpenITI-only parts and lists the hadithapicom numbers as `unresolved` with reason `hadithapi_key_missing`).
- Output only to `storage_path('app/hadith/proposals/gaps/{slug}.json')` and `{slug}.report.json`. **No `--output` option.** It never writes `config/` or `database/`.
- Report (counts, numbers and codes only): per class counts, fills per origin, merges per side, unresolved per reason, `residual_markers`, `double_spaces`, `hapi_text_with_markup` (texts containing `<` or `&`), unit count and its golden value, SHA-256s read, `retrieved_on`, and the proposal file's SHA-256 (the developer pins this value in 6b.8).
- Arch edits in `HadithImportArchTest.php`: add `App\Domains\Hadith\Services\HadithGapBuilder` and `App\Domains\Hadith\Console\BuildGapsCommand` to the `toOnlyBeUsedIn` list for `App\Integrations\HadithApiCom`; add both files plus `Overlay/OpenItiUnitReader.php` to the «writes nothing under config/, database/ or app/» file list (they must not contain `config_path(`, `base_path('config`, `database_path(`, `app_path(`).

### 8.8 Tests (6b.6), `tests/Feature/Hadith/Gaps/`
Placeholder OpenITI files built in a temp dir (`### ||| 1 - ` style lines with `FIXTURE text`), placeholder decisions files, `Http::fake` for hadithapi.com (never live).
- `OpenItiUnitReaderTest`: `it('starts a unit at the marker and closes it at a stop line')`, `it('does not open a unit before the first marker')`, `it('keeps the unit index stable')`, `it('reads group 1 as the number and null when absent')`, `it('handles a file without the header end marker')`.
- `OpenItiTextCleanerTest`: one test per step G1 to G5 alone and all together; `it('keeps U+200E and U+200F, diacritics and internal spaces')`; `it('does not remove anything else')` (a line with `|`, `$` and `~` in the middle is untouched); `it('drops a line that is only a page marker')`.
- `OpenItiHeadingCleanerTest`: each §3 removal alone and together, continuation lines, trims only ASCII whitespace (a no-break space at the end stays).
- `HadithWordSetTest`: folding, noise removal, words shorter than 3 dropped, jaccard/containment edge cases (empty sets).
- `HadithGapBuilderTest`: `it('writes an openiti fill from the unit at openiti_unit')`; `it('refuses when the unit number does not match')`; `it('turns a failed neighbour re-check into unresolved, not a fill')`; `it('turns a duplicated fill into unresolved')`; `it('writes merge-prev and merge-next with the entry prev and next')`; `it('lists unknown entries as unresolved')`; `it('refuses an OpenITI file whose SHA-256 differs from the pin')`; `it('refuses decisions whose SHA-256 differs from the pin')`; `it('writes a hadithapicom fill exactly as received, with no trim')`; `it('lists hadithapicom numbers as unresolved when the key is missing')`; `it('is deterministic: two runs give identical bytes')`; `it('the proposal passes the same validation as the importer')` (load it back through `HadithDataFiles` with a temp pin); `it('never prints text or titles in the report')`.
- `BuildGapsCommandTest`: refuses production before reading the key; no `--output` option exists; writes only under `storage/app/hadith/proposals/gaps`; exit codes.
- Extra book: `it('finds the n-th book heading at either heading level')`, `it('applies the 95% two-way rule with integer math')` (94.9% fails, 95% passes), `it('writes null book_number when undecided')`.

### 8.9 Gate: `composer qa`.

## 9. Part 6b.7 — `hadith:match-chapters` (dev only)

The matcher reads a pinned OpenITI file and the importer's own mapping, and writes a proposal in the chapters-file schema plus a report. First four collections only: Bukhari, Abu Dawud, Nasa'i, Ibn Majah (ADR §6). Muslim, Tirmidhi and Malik are step 6c. **Every figure in the research is void until this command re-measures it on the pinned files** (ADR §1.3).

### 9.1 Files

| File | Change |
| --- | --- |
| `app/Domains/Hadith/Console/MatchChaptersCommand.php` | new |
| `app/Domains/Hadith/Services/HadithChapterMatcher.php` | new |
| `app/Domains/Hadith/Overlay/OpenItiChapterReader.php` | new |
| `app/Domains/Hadith/HadithImportServiceProvider.php` | append the command |
| `config/hadith.php` | `openiti.files.{slug}.markup` (9.2) for the four slugs |
| `tests/Feature/Hadith/Import/HadithImportArchTest.php` | add the three new files to the no-write list |

### 9.2 Markup table (starting values; the first sub-task is to confirm them with a line-shape census)
The gap work measured only the hadith marker and stop patterns (section 8.2). The chapter patterns below are **starting values observed in the pinned files**; the matcher must print a census (counts of line shapes: heading level, numbered marker, continuation, page marker, other) so the developer can confirm them before any file is accepted:
- Abu Dawud, Bukhari, Ibn Majah: hadith marker `/^### \| ?([0-9]+) ?- /u`; chapter heading `/^### \| ?(?![0-9])(.+)$/u`; book heading `/^### \$ (.+)$/u` (Ibn Majah has no `$` lines, so its books come from headings whose cleaned text starts with كتاب or أبواب).
- Nasa'i: hadith marker `/^### \|\|\| ?([0-9]+) ?- ?/u`; chapter heading `/^### \|\| (.+)$/u`; book heading `/^### \| ?[0-9]+ ?- (.+)$/u`; **plus** any heading whose cleaned text starts with كتاب or أبواب ends a chapter regardless of level (the missing book is a `###||` heading).
A heading that starts with كتاب or أبواب always ends the current chapter and is never a chapter (the research found 0 recognised in Bukhari, which caused most of its 8% cross-book failures).

### 9.3 Algorithm (ADR 0076 §5)
Command: `hadith:match-chapters {--collection=* (default: the four)} {--openiti-dir= (required)} {--partial-books=drop : drop|keep}`. Refuse production before anything else. Output only under `storage_path('app/hadith/proposals/chapters/')`: `{slug}.json` (the chapters-file schema, `partial_books` = the option) and `{slug}.report.json`. No `--output`. Never write `config/` or `database/`.
1. Verify the OpenITI file's SHA-256 against `openiti.files[slug].sha256`; mismatch refuses.
2. Build the collection's mapping the way the importer does: `FawazHadithSource::collection`, the gaps overlay if a gaps file exists, `HadithMapper::map(...)`. This yields, per book, the entries (number, `text_ar`, position) and `book_number`. (The matcher reads text in memory to check that numbers align; it stores and prints none.)
3. Parse the OpenITI file (`OpenItiChapterReader`) into chapters: a chapter starts at a chapter heading and holds the numbered hadith units (marker group 1 = the listed number string) until the next chapter or book heading. Headings with no numbered unit are not chapters (counted). Heading text goes through `OpenItiHeadingCleaner`. Ordinal = 1-based position among the chapters **of the book** in the OpenITI order, counting only chapters that have at least one listed number, **before** acceptance (rejected chapters keep their ordinal slot, so ordinals are stable; a gap in ordinals is allowed in the proposal; 7.2 therefore requires ordinals strictly increasing and unique within a book, not consecutive).
4. For each chapter with n listed numbers: let `listed` = numbers that exist as entries in the mapping; numbers with no entry are excluded and counted as `listed_without_text`. If `listed` is empty the chapter is rejected `no_listed_text`.
   - **One book (hard):** all `listed` entries have the same `book_number`; else rejected `crosses_books`.
   - **Forward 95%:** among `listed`, those whose word set passes `HadithWordSet` Jaccard ≥ 0.5 against the OpenITI unit's cleaned text. Pass when `passed >= intdiv(95 * n_listed + 99, 100)`. Else `forward_below_threshold`.
   - **Backward 95%:** the book's entries from the lowest to the highest position among `listed` (inclusive) number m; those whose number is in the chapter's listed set number c. Pass when `c >= intdiv(95 * m + 99, 100)`. Else `backward_below_threshold`.
   - Numbers are compared as exact strings. Title empty after cleaning: `empty_title`.
   - A chapter of 1 to 19 numbers must pass completely (that follows from the formula); the report counts accepted and rejected chapters with n ≤ 19.
5. **Option C.** Per book: `entries_total`, `entries_covered` (entries between the bounds of accepted chapters), `complete` (= all covered). With `--partial-books=drop` the proposal keeps only the accepted chapters of complete books; with `keep` it keeps all accepted chapters. The report always prints both totals so the developer sees the cost before choosing (ADR §7).
6. `first` and `last` of an accepted chapter are the lowest and highest `listed` numbers by position order.

### 9.4 Report (`{slug}.report.json`; counts, numbers and codes only, no text, no titles)
`census` (line shapes), `chapters_parsed`, `headings_without_units`, per decision: `{book_number, ordinal, n, n_listed, listed_without_text, forward_passed, forward_required, backward_c, backward_m, backward_required, result: accepted|<reason>}` for **every** chapter, `accepted`/`rejected` per reason, `small_chapters_accepted`, `small_chapters_rejected` (n ≤ 19), per-hadith text-check rate for the collection, per-book coverage under `drop` and `keep`, `titles_with_continuation`, `titles_with_residual_markers` (cleaned titles that still contain `#`, `~`, `|`, `$`, `PageV`, or an ASCII `ms` followed by digits), `titles_empty`, source SHA-256, proposal SHA-256. The proposal file has the whitelisted keys only.
The Quran-run detector of ADR §4 is **not** built (decision 1 made titles «as printed»; Q10).

### 9.5 Tests (6b.7), `tests/Feature/Hadith/Gaps/`
Placeholder mARkdown only, never real headings (`### || FIXTURE chapter title 1`).
- `OpenItiChapterReaderTest`: a chapter heading starts a chapter; a book heading (كتاب or أبواب word) ends it; a numbered marker is a hadith; headings with no numbered unit are not chapters; continuation lines; ordinals count per book.
- `HadithChapterMatcherTest`: all numbers in one book accepted; **one number in another book rejected even at 100% text match**; ceil rule at n = 1, 19, 20 (19 of 20 passes, 18 of 20 fails, 19 of 19 required at 19); forward and backward each reject alone; decimal and string numbers align by exact string; numbers with no text are excluded from forward and counted; per-book coverage and the `drop`/`keep` outputs (`drop` writes only complete books); the report lists every decision with both counts; **the proposal contains only whitelisted keys** (assert the key set, no text field); the proposal loads through `HadithDataFiles::chapters()` with a temp pin; `a fill row inside a chapter counts like any other entry`.
- `MatchChaptersCommandTest`: refuses production; no `--output`; writes only under `storage/app/hadith/proposals/chapters`; refuses a source file whose SHA-256 differs from the pin; not scheduled (`Schedule` contains no `hadith:match-chapters`); `docker/release.sh` does not mention it.
- `it('prints no title and no hadith text in the console output or the report')`.

### 9.6 Gate: `composer qa`.

## 10. Part 6b.8 — Notices, pins, committed data (developer runs the commands)

1. Write `database/data/hadith/chapters/LICENSE-NOTICE.md` and `database/data/hadith/gaps/LICENSE-NOTICE.md`. Content (plain text, no religious text): the CC BY-NC-SA 4.0 deed link; source OpenITI, release 2023.1.8, version DOI 10.5281/zenodo.10007820 (Tirmidhi: GitHub `OpenITI/0300AH` commit `01a1544130e0236850ef2698923ad01575c5bd7c`); the version ids and file SHA-256s; **the list of changes** (formatting markers removed from titles and text, the closed lists of 2.4 and ADR §3; chapters mapped to fawazahmed0's numbering; for `gaps/`, which collections and how many rows came from each origin, and that hadithapi.com rows carry no published terms); the ShareAlike line; the statement that these files and the matching `hadith_chapters` rows and filled rows are licensed CC BY-NC-SA 4.0. Test: `it('has a licence notice beside each data folder')`.
2. The developer (not the implementer) runs this sequence, because `hadith:build-gaps` refuses an unpinned decisions file: (a) copy each `final-classification-{slug}.json` to `database/data/hadith/gaps/decisions/{slug}.json` and pin its SHA-256 in `config('hadith.data_files')['gaps/decisions/{slug}.json']`; (b) run `hadith:build-gaps` (and `hadith:match-chapters`); (c) copy the proposals from `storage/app/hadith/proposals/…` into `database/data/hadith/…` and pin each proposal's SHA-256 (the report prints it). The importer also checks that a gaps file's `decisions_sha256` header equals the pin of `gaps/decisions/{slug}.json` (`decisions_sha256_mismatch`). A test asserts every committed file under `database/data/hadith` has a pin whose value equals its SHA-256 and every pin has a file: `it('pins every committed data file and nothing else')`.
3. `docs/plans/phase-7/README.md` rule «fawazahmed0 has no chapter level» and the table row for 6b: update when the developer accepts the ADR (not before; do not edit them now).
4. `docs/runbooks/` gets no change here (step 17 owns release docs). Add one paragraph to this brief's hand-off note on how to re-run the two dev commands.

## 11. Impacts on other steps (handoffs; this step edits none of these files)

### Step 7 — API (part «7b», after 6b.3; contract regenerated there)
- `HadithEntryResource` / `HadithEntryData` / `HadithEntryDetailData`: add `number_first` and `number_last` (nullable strings) and `source_code` (nullable string). The exact-key-set tests in `HadithEntriesEndpointTest.php` change.
- `EloquentHadithCatalogueRepository::findEntryByNumber()`: exact match first (as now); on a miss, the row whose span contains the number: `whereNotNull('number_first')`, then compare as numbers (`CAST(number_first AS DECIMAL(20,4)) <= ? AND CAST(number_last AS DECIMAL(20,4)) >= ?`). Reject a non-numeric lookup before the cast.
- A merged number resolves to the covering row; the response is that row (the client shows the range). Tests: merged number 200 with covering row 199; a number in no span still 404.
- Gate there: `composer qa` plus `npm run generate -w @quran/api-contract`, commit `openapi.json` and `src/schema.d.ts`.

### Step 10 — mobile data layer
- **Timing (checked in `apps/mobile/src/core/sync/content-sync.ts`):** pack install copies each table with its own column list (`INSERT INTO t (cols) SELECT cols FROM pack.t`, and `INSERT OR REPLACE` with `table.columns` for change-feed rows), so extra pack columns are ignored and nothing breaks. **6b.3 can land before step 10 catches up**; until it does, devices simply cannot read the new columns. The mobile pack tests build their own packs (`features/hadith/data/__fixtures__/pack-test-helpers.ts`) and are not tied to `PackSchema`; the only backend test tied to the column list is `tests/Unit/Content/PackSchemaHadithTest.php` and `tests/Feature/Hadith/HadithPackBuilderTest.php`, which 6b.3 updates.
- `src/core/sync/content-tables.ts`: append `number_first`, `number_last`, `source_code` (all `text`, nullable) to `hadith_entries` after `source_url`; new drizzle migration `0014` and `schema.ts` columns; the pack/`content-tables` column-count tests change (hadith_entries 12 to 15).
- Repository by number: exact `hadith_number` first, else `CAST(number_first AS REAL) <= ? AND CAST(number_last AS REAL) >= ?`. Search by number uses the same lookup. `search_hadith` rows exist for covering rows only.
- Previous/next in the reader follow `position`; a covering row is one stop.
- A saved item stores slug + the **covering row's own** `hadith_number`; opening a saved item by a merged number is the lookup above.
- Fixtures: one covering row (span), one filled row (`source_code` `openiti`), one chaptered book, one flat book.
- Formatting: `number_first–number_last` rendered with the same digit formatter as `hadith_number` (Arabic-Indic digits in Arabic), an en dash between.

### Step 12/13 — components, screens, credits
- `HadithMeta` (or the number part of `HadithCard`) shows the span «٥٧٠٩–٥٧١٢» when `number_first` is set.
- `HadithSourceLine`: shows the row's own source: null `source_code` shows the collection source line; `openiti` and `hadithapicom` show their own credit lines (new keys `hadith.source.creditOpeniti`, `hadith.source.creditHadithapicom`; the existing `hadith.source.credit` stays for the primary source). ADR 0076 §8.5 says credit only on the Sources screens; the per-row source line for filled rows is an addition the developer must approve (Q4).
- Sources screen rows (same pattern as `reader.sources.mp3quran`): `reader.sources.openiti.title` / `.subtitle` and `reader.sources.hadithapicom.title` / `.subtitle`, Arabic and English, built from the `content_sources` attribution; the `openiti` row links to the licence deed. Whether a `pending` source is shown on the Sources screen is a step 13 decision (Q4).
- Chapter rows and the chaptered-book state follow the frames of step 8b (not this step). Chapter titles are shown as printed and **must not** be linked or indexed as Quran text (no ayah link, no Quran search) — ADR 0076 decision 1.
- Step 14 (search) must not index chapter titles as Quran text.

### Step 17 — release
`hadith:import` exit code stays 0 with held-back collections. The release log should print `held_back` collections so the developer sees which are not served. `release.sh` still must not call `hadith:build-gaps` or `hadith:match-chapters`.

### Step 18 — Sunnah.com switch
The re-import replaces the collection's rows, chapters and filled rows in one transaction; `number_first`/`number_last` are recomputed (or null); the `openiti` and `hadithapicom` `content_sources` rows stay as history; the data files and pins are retired. No schema change at that step.

## 12. Gates (every part)
`cd /Applications/MAMP/htdocs/quran-app/apps/api && composer qa` (runs `pint --test`, `phpstan analyse` at level 8, `pest --parallel`). Run `composer pint` style fixes first if `pint --test` fails (follow how earlier steps did it). No endpoint shape changes in 6b, so the contract is not regenerated here (it is in 7b). `composer audit` is not needed (no dependency changes). No mobile gate (no mobile file is touched). Local PHP 7.5 from Homebrew and MySQL as in `docs/plans/phase-6/README.md`.

## 13. Out of scope
- Any endpoint, resource, route, OpenAPI change, any mobile file, any frame or screen (section 11 lists the handoffs).
- Re-classifying gaps, aligning OpenITI to fawazahmed0 for gaps, or computing merge/fill decisions (the decisions files are the reviewed input; the measurement scripts live in the session scratchpad and are not ported, Q9).
- Downloading the 5.8 GB Zenodo archive in code. The developer places the pinned member files in a folder and passes `--openiti-dir`.
- Muslim, Tirmidhi and Malik chapters (step 6c) and any collection's unknowns (they stay held back).
- The Quran-run detector of ADR §4 (Q10), Sunnah.com, grades, English titles, option B UI.
- Editing ADR 0076, the plan, the spec or CLAUDE.md. Conflicts are listed below for the developer.

## 14. Open questions and conflicts (for the developer; the implementer decides none of them)

**Q1. Text-rule extensions G1, G2, G4 (section 2.4).** ADR 0076 §3's list was written for headings. Filling body text needs: removing the line-start `~`/`#` markers on body lines, dropping the unit's number prefix, and joining body lines with one ASCII space. This is what the measurement did. Approve, change or reject before 6b.8 commits any gaps file. No default beyond the list as written; the implementer adds no step.
**Q2. hadithapi.com text as received.** Stored without any cleaning. If a text contains markup (`<`, `&`) the report counts it; what to do then is yours.
**Q3. `book_number` of the Nasa'i missing book.** It is the API `{book}` key; fawazahmed0 has no key for it and the other keys are `'1'`, `'2'`, … Until you decide, `extra_books.nasai.book_number` is `null` and Nasa'i is held back (the importer refuses a null).
**Q4. Wording and credits.** (a) The proposed `openiti` attribution drops «no hadith text is taken from OpenITI» (the gap decision made it untrue); approve or change the wording. (b) ADR §8.5 says credit only on the Sources screens; filled rows would show their own source line in the reader (`source_code`). (c) Whether a `pending` source (`hadithapicom`) appears on the Sources screen. (d) The ShareAlike pack-mixing risk (ADR §8.4) grows: OpenITI **text** now sits in the same pack as fawazahmed0 text. The columns `source_id`/`source_code` keep it identifiable; whether that is enough is a legal question.
**Q5. Option C versus ADR decision 3.** The task and plan assume option C (a book is fully chaptered or flat). ADR 0076 «Developer decisions» item 3 says the layout is decided **after the 6b.1/6b.7 per-book report**. The brief builds `--partial-books=drop|keep` and the `partial_books` header so either works; the default is `drop` and the developer picks after reading the report.
**Q6. Placed hadith and `reference.book`.** ADR 0076 decision 6 places 12 hadith by OpenITI's book. If any placed hadith's `reference.book` disagrees with the book it is placed in, the import fails with `reference_book_mismatch`. The brief does not exempt them; you add each number to `reference_exceptions` (as for Ibn Majah) or say how to treat them. The 6b.2 dry run lists which.
**Q7. ADR 0076 §2.3 «No schema change» versus merges.** Merges and the per-row source need columns on `hadith_entries` (`number_first`, `number_last`, `source_code`) and on `hadith_collections` (`is_complete`, `incomplete_count`, not in the pack). The «No schema change» claim (and the step 18 «no schema, endpoint, pack or screen change» sentence) is now false for the pack. Please amend §2.3 and add an ADR note (not done here).
**Q8. `PackSchema::VERSION`.** Kept at `1` because no Hadith pack has shipped. If any device already holds a Hadith pack, the version must change and the mobile migration must handle it.
**Q9. Where the decisions come from.** The `final-classification-{slug}.json` files live in the session scratchpad (`/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/687c3823-f84e-4b7e-af26-c7003bde091c/scratchpad/gapfill/out/`) and the Python measurement scripts in `.../gapfill/scripts/`. They are session-local. Copy the final files (after the last measurement round) into `database/data/hadith/gaps/decisions/` and keep the scripts somewhere durable (suggested `docs/plans/phase-7/measurement/`; not done here). For OpenITI merges `hadith:build-gaps` trusts the pinned decision file; it re-checks only what is cheap (8.5). Say if you want a full re-classification port instead.
**Q10. Quran-run detector.** ADR §4 asked for a detector so you could decide; decision 1 decided «as printed». The brief drops it. Say if you still want the report-only count.
**Q11. Completeness and chapters.** The rule says a complete collection has «its chapter once chapters exist». With option C a flat book has no chapters, so chapters never gate. Confirm.
**Q12. `total_hadith` and counts.** `total_hadith` and `hadith_count` count rows. A collection with merged numbers shows fewer than its numbering. The Home/Books counts that say «N hadith» therefore differ from Sunnah.com's by the merged count; confirm this is acceptable.
**Q13. Conflict list from the task.** (1) ADR 0076 §1.1 («nothing else is taken from OpenITI») against the gap decisions (text fills): the later dated decision wins, used here. (2) ADR 0042 «hadith data is never taken from hadithapi.com» against gap-report decision 8: the later decision wins, used here. (3) Plan D14 («No schema change») against section 5.1: see Q7. (4) Plan step 6b describes three parts (6b.0 to 6b.2); this brief replaces them with eight parts and builds only the first four collections' chapters; 6b.0 (the Zenodo spike) is done by the measurements in `gapfill-report.md`, except the chapter heading census (9.2). (5) The plan says «the pack builder carries the rows» for chapters; it already does (step 4), nothing to add. (6) Task text says «Tirmidhi from GitHub commit 01a1544…»: the full 40-character SHA is `01a1544130e0236850ef2698923ad01575c5bd7c`. (7) `hadith:import` of an incomplete collection now exits 0 with status `held_back`; the step 6 brief said every non-failure leaves a pack queued; that sentence no longer holds for held-back collections.

## Answers to Q1–Q13 (orchestrator, on the developer's behalf, 7 Nov 2026)

These override anything above that conflicts with them.

- **Q1** Approved: G1/G2/G4 remove only OpenITI markup (line-start `~`/`#` markers, the number prefix, page and line markers) and join body lines with a single space. No letter, mark or punctuation of the text is changed. List them in ADR 0076 §3 as the closed list.
- **Q2** hadithapi.com text is stored as received. If a fill contains HTML or markup tags (`<`…`>`), that fill is **refused** (the gap stays unknown); nothing is stripped.
- **Q3** The Nasa'i missing book's `book_number` is the text `35.1` (between 35 and 36; position is what orders books). Nasa'i is not held back on this.
- **Q4** OpenITI credit wording: «عناوين الأبواب وبعض نصوص الأحاديث: مشروع OpenITI (الإصدار 2023.1.8)، بترخيص CC BY-NC-SA 4.0» / "Chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0". A filled row shows its own source line in the reader (from `hadith_entries.source_code`). The hadithapi.com row shows on Sources («بعض نصوص الأحاديث: hadithapi.com» / "Some hadith texts: hadithapi.com"). ShareAlike pack mixing is accepted.
- **Q5** Option C now. I decide after the 6b.7 per-book report whether anything changes.
- **Q6** Placed hadith (the 12) **are exempt** from the `reference.book` check; OpenITI decided their book.
- **Q7** Noted: an additive schema change. ADR 0076 gets a note at 6b.3.
- **Q8** Confirmed: `PackSchema::VERSION` stays 1 (no hadith pack has shipped).
- **Q9** The orchestrator copies the decision files into `apps/api/database/data/hadith/gaps/decisions/` and the scripts into `tools/hadith-gapfill/` after the final measurement round.
- **Q10, Q11, Q12** Confirmed: chapters never gate completeness. `total_hadith` counts rows; the UI shows the row count.
- **Q13** The later dated decision wins in every listed conflict.
- **6b.8** is run by the orchestrator locally (the dev-only key is present), not left for the developer.
