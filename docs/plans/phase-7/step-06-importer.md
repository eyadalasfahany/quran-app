# Step 6 — Importer, `hadith:import`, dev-only `hadith:match-section-titles`

ADR 0042 §2, §4a, §5, §7 (Accepted, with the 2 Nov and 7 Nov amendments), ADR 0045 (no switch), ADR 0068 (source cache). ADR 0076 (Proposed) only for the chapter seam. Plan: `docs/plans/phase-7.md` (step 6 row, its tests row, "Data design" mapping rules, "Titles data", D4, D8, D9, D12, D13). Read `docs/plans/phase-7/README.md`, `.claude/agent-rules.md`, `apps/api/CLAUDE.md`, `apps/api/.ai/rules/*` and `docs/plans/phase-7/step-05-source-client.md` first. **No hadith text of any kind is written in this step**: code, tests, fixtures, reports and your final report use placeholders only (`FIXTURE text 1 — not a hadith`, «نص تجريبي ١ — ليس حديثًا», `FIXTURE grade`, `FIXTURE grader`, `FIXTURE section 1`, `FIXTURE-KEY`). That includes grade strings, section names and chapter titles. Reports give counts, keys and paths only.

## Goal
1. `php artisan hadith:import`: read the pinned fawazahmed0 snapshot through `HadithCollectionSource`, map it (section → book, hadith → entry, grades), validate, and write one collection per transaction, with a source-text hash, a text-integrity check, a report, packs and a scheduler entry that is a no-op when nothing changed.
2. `php artisan hadith:match-section-titles`: a dev-only, one-off matcher that proposes Arabic book (كتاب) titles from hadithapi.com under the strict two-way 95% rule. It writes a proposal file, never `config/`.

This step leaves **`hadith_chapters` empty and every `hadith_entries.chapter_id` null** (see "Chapter seam"). It adds no endpoint, no route, no migration, no mobile file.

## Rules for this step
- Branch `main` (CLAUDE.md, 6 Nov 2026). Check with `git branch --show-current`. Do not commit, push, switch branches or add dependencies.
- **Never open, print or edit `apps/api/.env`.** The dev-only key is read only through `config('hadith.api_key')`.
- Do not edit `docs/technical-spec.md`, ADR 0042, ADR 0076, `docs/plans/phase-7.md`, `docs/plans/phase-7/README.md` or any other `docs/` file. Someone else owns them.
- Do not edit committed step 3–5 code: migrations, models, factories, `app/Integrations/HadithApiFawaz/**`, `app/Domains/Hadith/{Contracts,Sources,Console,Exceptions}/**` (you may add new files in `Sources/` and `Exceptions/` as listed), `HadithSourceServiceProvider`, `PackSchema`, `PackBuilder`, `config/hadith_titles.php`. Shared files are edited additively and at the end: `config/hadith.php` (append one key), `bootstrap/providers.php` (append two lines), `routes/console.php` (append one entry). Do not change any existing config value (`HadithConfigTest` asserts `reference_exceptions` is `[]`; `HadithTitlesConfigTest` asserts `sections` is `[]`).
- **Do not add the import to `docker/release.sh` or `docker/start-web.sh`.** That is step 17. A test asserts neither file mentions `hadith:`.
- Laravel standards (`apps/api/CLAUDE.md`): `declare(strict_types=1)`, full typing, `final` classes, domain exceptions (never a bare `\Exception`), Larastan level 8. Layers (`tests/Unit/ArchitectureTest.php` enforces): services never touch `Illuminate\Http`; repositories never use the `DB` facade (inserts go through `Model::query()->insert()` in chunks); **the transaction lives in the service**; an integration never imports `App\Domains`.
- **Plain-PHP records.** `ArchitectureTest` forces `App\Domains\*\Data` to extend laravel-data, so every record in this step lives in `App\Domains\Hadith\Import\Records` (plain `final readonly` classes), as step 5 did with `Sources\Records`. Do not create `App\Domains\Hadith\Data`.
- Read hadith files **only** through `HadithCollectionSource` (`HadithSourceRegistry::primary()`), which re-hashes every cached file against its pin. Never open the cache folder directly (step 5 rule).
- Hadith text is never altered: no `trim`, no normalisation, no re-encoding of `text_ar`. Only `text_search` is derived, with `App\Support\HadithText\HadithSearchTextNormalizer`.
- **A raw exception message may contain row text** (a `QueryException` includes its bindings). Never print or store `$e->getMessage()` of anything except the domain exceptions listed here. For any other `Throwable`, the report and the console get the class name only.
- Parallel sessions may run tests at the same time. Every test that touches the database uses `RefreshDatabase` (never the shared `quran_testing` tables directly). Cache files go to a temp root (`hadithUseTempCache()`), never the real cache.

## Facts this brief rests on (checked in the code at commit 7447291)
- Tables exist (step 3): `hadith_collections`, `hadith_books`, `hadith_chapters`, `hadith_entries`, `hadith_grades`, `hadith_ref_aliases`. Composite primary keys (`resource_id`, `id`); **`id` is a plain `unsignedInteger`, not auto-increment**, so the importer assigns ids. No FK between the hadith tables. `hadith_entries` is unique on (`source_id`, `source_key`) and has a **non-unique** index on (`resource_id`, `hadith_number`). `hadith_grades` has no unique key. Column limits: `hadith_number`/`arabic_number` 32, `book_number` 16, `source_key` 96, `grade` 120, `graded_by` 200, collection `title_ar`/`title_en`/`author_ar` 200, book `title_ar`/`title_en` 500.
- `content_sources` row `fawazahmed0` is inserted by migration `2026_11_01_110001_insert_fawazahmed0_content_source.php` (`permission_status = not_required`, `attribution_ar`, `attribution_en` set). It is delivered without a gate (D12; `permission_status` is provenance only).
- Group `ResourceGroup::HadithCollections` exists, `PackSchema` has the six hadith tables, and `EloquentPackSnapshotRepository` serves an empty `hadith_grades` while `config('hadith.grades_visible')` is `false`. Packs build with the existing `PackBuilder::build(Resource)`; no hadith gate exists.
- `config('hadith.files')` holds 12 real SHA-256 pins; `config('hadith.slug_map.fawazahmed0')` maps `nawawi`, `qudsi`, `dehlawi` to `nawawi40`, `qudsi40`, `shahwaliullah40`; `config('hadith.collections')` is the ordered list of the ten canonical slugs; `config('hadith.reference_exceptions')` is `[]`.
- `config/hadith_titles.php`: `collections.{slug}.{title_ar, title_ar_source, author_ar, author_ar_source, author_ar_status}`; `sections` is `[]`.
- `FawazHadithSource::collection()` and `info()` return `SourceCollection` / `SourceCollectionInfo` (step 5 records). `FawazHadithSource::bytes()` **fetches on a cache miss**, so this step adds a presence check (below) to guarantee `hadith:import` makes no request unless `--download` was given.
- `Cache::lock()` pattern: `app/Domains/Duas/Services/DuasImporter.php` (`Cache::lock('duas:import', 3600)`). Tests use the array cache store (`phpunit.xml`), which supports locks.
- Imports run from `docker/start-web.sh` (volume mounted), not `docker/release.sh`; see the comments at the top of both files.

## Files

Create (production, under `apps/api/`):

| Path | Purpose |
| --- | --- |
| `app/Domains/Hadith/Exceptions/HadithImportLockedException.php` | `final class … extends RuntimeException` — another import holds the lock |
| `app/Domains/Hadith/Exceptions/HadithReferenceMismatchException.php` | `reference.book` disagrees with the section ranges (below) |
| `app/Domains/Hadith/Exceptions/HadithTextIntegrityException.php` | stored text differs from the source; rolls the collection back |
| `app/Domains/Hadith/Sources/HadithSnapshotPresence.php` | is a collection's pinned file pair in the cache and valid (no request) |
| `app/Domains/Hadith/Import/Records/HadithIssue.php` | one validation finding |
| `app/Domains/Hadith/Import/Records/HadithImportPlan.php` | the rows to write for one collection |
| `app/Domains/Hadith/Import/Records/CollectionStats.php` | counts and lists for the report |
| `app/Domains/Hadith/Import/Records/MappingResult.php` | plan + stats + issues from the mapper |
| `app/Domains/Hadith/Import/Records/IntegrityResult.php` | result of the text-integrity check |
| `app/Domains/Hadith/Import/Records/CollectionImportResult.php` | outcome for one collection |
| `app/Domains/Hadith/Import/Records/HadithImportReport.php` | outcome for one run |
| `app/Domains/Hadith/Import/Records/SectionMatch.php` | the matcher's verdict for one section |
| `app/Domains/Hadith/Import/Records/CollectionProposal.php` | the matcher's output for one collection |
| `app/Domains/Hadith/Services/HadithTitles.php` | reads `config('hadith_titles')` |
| `app/Domains/Hadith/Services/HadithMapper.php` | `SourceCollection` → `MappingResult` |
| `app/Domains/Hadith/Services/HadithImportFingerprint.php` | the "unchanged" fingerprint |
| `app/Domains/Hadith/Services/HadithTextIntegrityChecker.php` | stored rows vs the plan's hashes |
| `app/Domains/Hadith/Services/HadithImporter.php` | lock, per-collection flow, transaction, packs |
| `app/Domains/Hadith/Services/HadithSectionTitleMatcher.php` | the pure 95% two-way rule |
| `app/Domains/Hadith/Services/HadithSectionTitleProposer.php` | reads both sides, calls the matcher |
| `app/Domains/Hadith/Validation/HadithCollectionValidator.php` | issues beyond the mapper's; the reference check |
| `app/Domains/Hadith/Repositories/Contracts/HadithImportRepository.php` | persistence contract |
| `app/Domains/Hadith/Repositories/Eloquent/EloquentHadithImportRepository.php` | implementation |
| `app/Domains/Hadith/Console/ImportHadithCommand.php` | `hadith:import` |
| `app/Domains/Hadith/Console/MatchSectionTitlesCommand.php` | `hadith:match-section-titles` |
| `app/Domains/Hadith/HadithImportServiceProvider.php` | binds the repository, registers both commands |
| `app/Integrations/HadithApiCom/HadithApiComConfig.php` | validated config (final readonly) |
| `app/Integrations/HadithApiCom/HadithApiComClient.php` | titles-only client |
| `app/Integrations/HadithApiCom/HadithApiComServiceProvider.php` | closure bindings |
| `app/Integrations/HadithApiCom/HadithApiComException.php` | base (non-final, `extends \RuntimeException`) |
| `app/Integrations/HadithApiCom/HadithApiComConfigException.php` | bad config, key missing, production |
| `app/Integrations/HadithApiCom/HadithApiComRequestException.php` | HTTP or network failure (`public readonly ?int $status`) |
| `app/Integrations/HadithApiCom/HadithApiComShapeException.php` | unexpected response shape |
| `app/Integrations/HadithApiCom/HadithApiComChapter.php` | record (final readonly) |
| `app/Integrations/HadithApiCom/HadithApiComHadithRef.php` | record (final readonly) |

Create (tests, under `apps/api/tests/Feature/Hadith/`; `Pest.php` already extends `TestCase` for `Feature`):

| Path | Purpose |
| --- | --- |
| `Support/HadithImportFixtures.php` | placeholder files for the importer (not a test file) |
| `Support/HadithTitleMatchFixtures.php` | `Http::fake` helpers for hadithapi.com (not a test file) |
| `Import/HadithMapperTest.php` | mapper and validator, no database |
| `Import/HadithImporterTest.php` | importer service, `RefreshDatabase` |
| `Import/HadithImportCommandTest.php` | `hadith:import`, `RefreshDatabase` |
| `Import/HadithImportArchTest.php` | layering and file-content rules |
| `TitleMatch/HadithSectionTitleMatcherTest.php` | the rule, pure |
| `TitleMatch/HadithApiComClientTest.php` | client, redaction |
| `TitleMatch/MatchSectionTitlesCommandTest.php` | command |

Change:

| Path | Change |
| --- | --- |
| `config/hadith.php` | append the `title_match` key after `download` (below) |
| `bootstrap/providers.php` | append `HadithApiComServiceProvider::class` then `HadithImportServiceProvider::class` after `HadithSourceServiceProvider::class` (add the two `use` lines in alphabetical position) |
| `routes/console.php` | append one `Schedule::command(...)` entry (below) |

## Config: append to `config/hadith.php`

After `download`, with a short comment above (`// Dev-only title matcher (hadith:match-section-titles, ADR 0042 §4a). Not read in production.`):

```php
    'title_match' => [
        'base_url' => 'https://hadithapi.com/api',
        'timeout_seconds' => 30,
        'tries' => 3,
        'retry_delay_ms' => 1000,   // attempt n waits retry_delay_ms * 2^(n-1)
        'page_size' => 100,         // see open question 6
        'max_pages' => 2000,        // safety cap per collection
        'threshold_percent' => 95,
        // canonical slug => hadithapi.com book slug. malik and the three forty-hadith collections have no counterpart.
        'books' => [
            'bukhari' => 'sahih-bukhari',
            'muslim' => 'sahih-muslim',
            'tirmidhi' => 'al-tirmidhi',
            'abudawud' => 'abu-dawood',
            'ibnmajah' => 'ibn-e-majah',
            'nasai' => 'sunan-nasai',
        ],
    ],
```

## Titles shape (one definition, used by the importer and written by the matcher)

`config('hadith_titles.sections')` is `array<string, array<string, array{title_ar: string, title_ar_source: string}>>`: `sections.{canonicalSlug}.{sectionKey}` where `sectionKey` is the fawazahmed0 section key (`'1'`, `'2'`, …, equal to `book_number`). The matcher's proposal carries the same shape in its `paste` block, so the developer can paste it. Do not change the config file; tests set it with `config(['hadith_titles.sections' => …])`.

## Records (`App\Domains\Hadith\Import\Records`, all `final readonly`, no methods unless stated)

- `HadithIssue(string $severity, string $code, ?string $subject)`. `const SEVERITY_ERROR = 'error'`, `const SEVERITY_WARNING = 'warning'`. `subject` is a hadith number, a section key or `null`. It never holds text.
- `HadithImportPlan(array $collection, array $books, array $chapters, array $entries, array $grades)`. `$collection` is `array<string, int|string|null>` (one row). The others are `list<array<string, int|string|null>>` of column => value **without** `resource_id` (the repository adds it, as `EloquentAzkarImportRepository` does). `$chapters` is `[]` in this step.
- `CollectionStats` (all public): `int $hadithInFile`, `int $imported`, `int $noText`, `int $booksCreated`, `int $sectionsInFile`, `int $emptySections`, `int $grades`, `int $hadithWithGrades`, `int $gradesWithoutGrader`, `array $graders` (`array<string, int>` graded_by name => grade rows), `int $section0Hadith`, `bool $section0IsBook`, `int $referenceChecked`, `int $estimatedRawBytes`, `?int $infoHadithCount`, `?string $infoLastHadithNumber`, `?int $infoSectionCount`, `?string $lastHadithNumberInFile` (the number of the last hadith in file order), and lists of strings: `array $noTextNumbers`, `array $duplicateNumbers`, `array $referenceMismatchNumbers` (mismatches **not** covered by an exception), `array $referenceExceptionNumbers` (mismatches covered by `reference_exceptions`), `array $emptySectionKeys`. All `list<string>`.
- `MappingResult(HadithImportPlan $plan, CollectionStats $stats, array $issues)` — `$issues` is `list<HadithIssue>`.
- `IntegrityResult(int $expected, int $stored, int $storedHashMismatches, int $sourceMismatches, int $missing, int $extra, array $firstKeys)` plus `public function ok(): bool` (all four counters 0 and `expected === stored`). `$firstKeys` is `list<string>` of at most 20 `source_key`s.
- `CollectionImportResult(string $slug, string $status, ?string $failure, ?CollectionStats $stats, array $issues, bool $fingerprintUnchanged, ?string $fingerprint, ?int $resourceId, ?int $versionBefore, ?int $versionAfter, array $pack, ?IntegrityResult $integrity)`. Status constants: `STATUS_IMPORTED='imported'`, `STATUS_UNCHANGED='unchanged'`, `STATUS_VALID='valid'` (dry run, no errors), `STATUS_INVALID='invalid'` (validation errors, nothing written), `STATUS_FAILED='failed'` (an exception; nothing written), `STATUS_NO_SNAPSHOT='no_snapshot'`, `STATUS_VERIFIED='verified'`, `STATUS_INTEGRITY_FAILED='integrity_failed'`. `$failure` is a domain-exception message or a class name, never text. `$pack` is `array<string, bool|int|string|null>`: `built`, `queued`, `deferred`, `reason`, `version`, `sha256`, `size_bytes`, `row_count`, `error`. Method `public function failed(): bool` — true for `invalid`, `failed`, `integrity_failed`, or a pack with a non-null `error`.
- `HadithImportReport(string $generatedAt, bool $dryRun, bool $verify, int $peakMemoryBytes, array $collections)` — `$collections` is `list<CollectionImportResult>`. Methods: `succeeded(): bool` (no collection `failed()`; `no_snapshot` is not a failure) and `toReport(): array` (JSON-ready, shape below).
- `SectionMatch(string $bookNumber, bool $accepted, string $reason, ?string $chapterId, ?string $titleAr, int $sectionSize, int $forwardMatched, int $chapterSize, int $backwardMatched)` plus `forwardPercent(): float` and `backwardPercent(): float` (`round(100 * matched / total, 2)`; `0.0` when the total is 0). Reasons: `accepted`, `empty_section`, `no_chapter_mapped`, `forward_below_threshold`, `backward_below_threshold`, `chapter_has_no_title`.
- `CollectionProposal(string $slug, string $bookSlug, array $matches, int $mappingErrors, int $hadithapiChapters, int $hadithapiHadith, int $ambiguousNumbers)` — `$matches` is `list<SectionMatch>`.

## Exceptions

- `HadithReferenceMismatchException extends RuntimeException`. Constructor `(public readonly string $slug, public readonly int $count, public readonly array $hadithNumbers)` (`list<string>`, at most the first 20). Message exactly: `Collection [{slug}]: {count} hadith are in a book that disagrees with reference.book. First numbers: {n1, n2, …}.` Numbers only, never text. Thrown by `HadithCollectionValidator::assertReferencesAgree()`; the importer turns it into the issue `reference_book_mismatch` and the status `invalid`. It is never thrown inside a transaction.
- `HadithImportLockedException` message: `Another Hadith import is already running.`
- `HadithTextIntegrityException` message: `Collection [{slug}]: stored text differs from the source ({a} altered, {b} differ from the source hash, {c} missing, {d} extra). Nothing was written.` Counts only. Thrown **inside** the transaction, so it rolls the collection back.

## `HadithTitles` (`App\Domains\Hadith\Services`, `final`, no constructor)
Reads config on every call.
```php
public function collectionTitleAr(string $slug): ?string;   // hadith_titles.collections.{slug}.title_ar when a non-empty string, else null
public function authorAr(string $slug): ?string;            // author_ar only when author_ar_status === 'approved' and non-empty, else null
public function sectionTitleAr(string $slug, string $sectionKey): ?string; // hadith_titles.sections.{slug}.{key}.title_ar when a non-empty string, else null
/** @return array<string, mixed> everything the importer reads for a slug (collection entry + sections entry), for the fingerprint */
public function forSlug(string $slug): array;
```

## `HadithMapper` (`App\Domains\Hadith\Services`, `final`)
Constructor: `HadithSearchTextNormalizer $normalizer`, `HadithTitles $titles`. `public const int VERSION = 1;` — bump it whenever the mapping rules change (the fingerprint includes it).

```php
public function map(
    SourceCollection $source,
    ?SourceCollectionInfo $info,
    int $sourceId,
    string $sourceCode,
    string $sourceVersion,
    string $attributionAr,
    string $attributionEn,
    CarbonImmutable $now,
): MappingResult;
```
Pure: no database, no HTTP, no config except `HadithTitles`, `hadith.collections` (position) and `hadith.reference_exceptions`. `{slug}` in every key below is the **canonical** slug (`$source->slug`, D13). Never throws for bad data; it records issues.

Algorithm, in this order:
1. **Ranges.** For each `SourceSection` in file order: it has a range only when both `firstHadithNumber` and `lastHadithNumber` are non-null and `is_numeric`; the range is `(float) first … (float) last`, inclusive. Sections without a usable range receive no hadith. (Identity of numbers is always the exact string; floats are used only for range membership. Step 5 refuses trailing-zero decimals, so this is safe. Do not use bcmath.)
2. **Each hadith in file order** (`hadithInFile++`):
   - **No text** when `text === null`, or `text === ''`, or `$normalizer->normalize($text) === ''` (only whitespace or invisible marks). Append the number to `noTextNumbers`, `noText++`, skip. If `normalize()` throws `\UnexpectedValueException`, add error `invalid_utf8` (subject = number) and skip.
   - **Duplicate** number (exact string already seen among text-bearing hadith): append to `duplicateNumbers`, add error `duplicate_hadith_number`, skip the repeat. The first occurrence stays.
   - **Non-numeric** number (`! is_numeric`): error `non_numeric_hadith_number`, skip.
   - **Book assignment.** Candidates = sections whose range contains `(float) number`. None: error `hadith_outside_ranges`, skip. More than one: if `referenceBook` is non-null and exactly one candidate has `key === referenceBook`, use it; otherwise error `ambiguous_range`, skip. One: use it.
   - **Reference check.** If `referenceBook !== null`: `referenceChecked++`; when it differs (`!==`, exact string) from the assigned section key, the number goes to `referenceExceptionNumbers` if it appears in `config('hadith.reference_exceptions')[slug]` (a `list<string>`; see open question 1), else to `referenceMismatchNumbers`. The range assignment always wins; the exception only stops the mismatch from failing the collection.
3. **Books.** A book is created for each section, in file order, that received at least one hadith. `id` = 1-based position among created books; `position` = `id`; `book_number` = section key; `title_en` = `SourceSection::titleEn`; `title_ar` = `HadithTitles::sectionTitleAr`; `hadith_count` = hadith assigned; `source_id`, `source_key` = `{sourceCode}:{slug}:{sectionKey}`. A section with no hadith creates no book and its key goes to `emptySectionKeys`. **Section 0** follows the same rule: it is a book only if hadith fall in it (`section0Hadith`, `section0IsBook`), and its title stays null unless `sections.{slug}.0` is set.
4. **Entries** in file order among the hadith that passed step 2. `id` = running 1-based count across the collection; `position` = running 1-based count inside its book; `book_id` = the book's id; `chapter_id` = `null`; `hadith_number` = number; `arabic_number` = `arabicNumber`; `text_ar` = the source string **unchanged**; `text_en` = `null`; `narrator_en` = `null`; `text_search` = `normalize($text)`; `source_url` = `null`; `source_id`; `source_key` = `{sourceCode}:{slug}:{number}`; `source_text_sha256` = `hash('sha256', $text)` over the exact bytes; `source_version`; `imported_at` = `$now->format('Y-m-d H:i:s.u')` (UTC, `datetime(6)`).
5. **Grades.** For each entry, each `SourceGrade` in order: row `id` = running 1-based count; `entry_id`; `grade` and `graded_by` exactly as received; `source_id`; `source_key` = `{entry source_key}:{index}` (index 1-based within the hadith). Error `grade_too_long` (grade > 120 bytes) or `graded_by_too_long` (> 200). Update `grades`, `hadithWithGrades`, `graders` (key = `gradedBy`), `gradesWithoutGrader`. `hadith_grades` stays empty for a collection with no graded hadith. Nothing here depends on `grades_visible`.
6. **Collection row.** `id` = 1; `slug`; `source_id`; `source_code`; `title_ar` = `HadithTitles::collectionTitleAr`; `title_en` = `SourceCollection::titleEn`; `author_ar` = `HadithTitles::authorAr`; `author_en` = `null`; `attribution_ar`/`attribution_en` = the parameters; `source_url` = `null`; `total_hadith` = imported; `books_count` = books created; `source_version`; `imported_at`.
7. **Stats.** Fill `CollectionStats`, including `estimatedRawBytes` = Σ over entries of `strlen(text_ar) + strlen(text_search) + 150` (the plan's per-row overhead), and the `info*` fields from `$info` (`hadithCount`, `lastHadithNumber`, `sectionCount`) when given. `lastHadithNumberInFile` = the `number` of the last hadith in file order.

`text_ar` must be the same PHP string the adapter returned (do not copy through any function that changes bytes).

## `HadithCollectionValidator` (`App\Domains\Hadith\Validation`, `final`, no constructor)
```php
/** @return list<HadithIssue> the mapper's issues plus the findings below; never throws for data */
public function validate(string $slug, MappingResult $mapping): array;

/** @throws HadithReferenceMismatchException when $stats->referenceMismatchNumbers is not empty */
public function assertReferencesAgree(string $slug, CollectionStats $stats): void;
```
Findings `validate()` adds (error unless marked warning):
- `empty_collection` — `imported === 0`.
- `source_attribution_missing` — `attribution_ar` or `attribution_en` is `''`.
- `hadith_number_too_long` (> 32 bytes), `arabic_number_too_long` (> 32), `book_number_too_long` (> 16), `source_key_too_long` (> 96), `title_too_long` (collection `title_ar` > 200, book `title_ar` > 500). Subject = number or key.
- warnings: `hadith_count_differs_from_info` (`hadithInFile !== infoHadithCount`, subject null), `last_hadith_number_differs_from_info` (`lastHadithNumberInFile !== infoLastHadithNumber`), `section_count_differs_from_info` (`sectionsInFile !== infoSectionCount`), `no_text_hadith` (once, when `noText > 0`), `empty_section` (once, when `emptySections > 0`), `reference_exception_used` (once, when `referenceExceptionNumbers` is not empty).
The count comparisons are **reported, not blocking** (plan: "counts vs last_hadithnumber and info counts").

## `HadithImportFingerprint` (`App\Domains\Hadith\Services`, `final`)
```php
public function of(string $slug, string $attributionAr, string $attributionEn): string;
```
Returns `hash('sha256', json_encode($inputs, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES))` where `$inputs` is, with these keys in this order: `mapper` (`HadithMapper::VERSION`), `commit` (`config('hadith.commit')`), `edition_sha256` (the pin `config('hadith.files')['editions/ara-'.{sourceSlug}.'.json']`, with `{sourceSlug}` found as `FawazHadithSource::sourceSlug($slug)`), `position` (1-based index of the slug in `config('hadith.collections')`), `attribution_ar`, `attribution_en`, `titles` (`HadithTitles::forSlug`), `reference_exceptions` (`config('hadith.reference_exceptions')[slug] ?? []`). It reads no file. A later `hadith_titles.sections` approval, a `reference_exceptions` edit or a pin change changes it; a re-run with the same inputs does not. Stored in `resources.import_fingerprint`.

## `HadithSnapshotPresence` (`App\Domains\Hadith\Sources`, `final`)
Constructor: `FawazHadithSource $source`, `SnapshotStore $store`, `PinnedFileVerifier $verifier`. `public function missing(string $slug): array` returns `list<string>`: the paths among `info.json` and `editions/ara-{sourceSlug}.json` for which `! $store->has($path)` or `! $verifier->matches($path, $store->read($path))`. It makes no request and writes nothing.

## `HadithImportRepository` (contract) and `EloquentHadithImportRepository`
`App\Domains\Hadith\Repositories\Contracts\HadithImportRepository` (interface):
```php
public function source(string $code): ?\App\Domains\Content\Models\ContentSource;   // ContentSource::query()->where('code', $code)->first()
/** @return array{total: int, entries: int}|null  total_hadith of the collection row and the real count of hadith_entries; null when there is no collection row */
public function storedCounts(int $resourceId): ?array;
public function replaceForResource(int $resourceId, HadithImportPlan $plan): void;
/** @return \Generator<int, array{source_key: string, text_ar: string, source_text_sha256: string}> chunks of 500 by id */
public function entryTexts(int $resourceId): \Generator;
```
`replaceForResource`: delete this `resource_id`'s rows from `HadithGrade`, `HadithEntry`, `HadithChapter`, `HadithBook`, `HadithCollection` (in that order; **`hadith_chapters` is deleted and re-inserted even though it is empty today**), then insert `collection` (one row), `books`, `chapters`, `entries`, `grades` with `Model::query()->insert()` in chunks of 250, each row `['resource_id' => $resourceId] + $row`. No `DB` facade, no transaction (the service owns it). Bound in `HadithImportServiceProvider` as `HadithImportRepository::class => EloquentHadithImportRepository::class` (`public array $bindings`, as `AzkarImportServiceProvider`).

## `HadithTextIntegrityChecker` (`App\Domains\Hadith\Services`, `final`)
Constructor: `HadithImportRepository $repository`.
```php
public function checkAgainstPlan(int $resourceId, HadithImportPlan $plan): IntegrityResult;
```
Build `$expected` = `source_key => source_text_sha256` from `$plan->entries`. Iterate `$repository->entryTexts($resourceId)`: a key not in `$expected` → `extra++`; otherwise `hash('sha256', text_ar) !== source_text_sha256` (column) → `storedHashMismatches++`, and column `!== $expected[key]` → `sourceMismatches++`, then unset the key. `missing` = keys left in `$expected`. `stored` = rows iterated. Record up to 20 offending keys in `firstKeys`.

## `HadithImporter` (`App\Domains\Hadith\Services`, `final`)
Constructor: `HadithSourceRegistry $sources`, `HadithSnapshotPresence $presence`, `HadithMapper $mapper`, `HadithCollectionValidator $validator`, `HadithImportFingerprint $fingerprints`, `HadithTextIntegrityChecker $integrity`, `HadithImportRepository $repository`, `ResourceRepository $resources`, `PackBuilder $packs`. Public constant `LOCK_KEY = 'hadith:import'`.

```php
/**
 * @param  list<string>  $slugs  canonical slugs, in the order to import
 * @throws \LogicException when $buildPacks and $deferPack are both true, or the source row is not seeded
 * @throws \InvalidArgumentException for a slug not in config('hadith.collections')
 * @throws HadithImportLockedException when a wet run cannot get the lock
 */
public function run(array $slugs, bool $dryRun = false, bool $buildPacks = false, bool $deferPack = false): HadithImportReport;

/** Read-only text-integrity check of stored rows against the source. @param list<string> $slugs */
public function verify(array $slugs): HadithImportReport;
```
`run()`:
1. Validate the arguments. Load `$content = $this->repository->source($primary->code())` (`$primary = $this->sources->primary()`); `null` → `\LogicException('The source [..] must be seeded before an import.')`.
2. **Lock (wet runs only):** `$lock = Cache::lock(self::LOCK_KEY, 3600)`; `! $lock->get()` → throw `HadithImportLockedException`. Release in `finally`. Dry runs and `verify()` take no lock.
3. For each slug **in order, one at a time** (never hold two collections in memory; `unset` the source collection and mapping before the next slug and call `gc_collect_cycles()`), call the private `importCollection(...)`, which returns a `CollectionImportResult`. A collection that is `invalid`, `failed`, `no_snapshot` or `integrity_failed` does not stop the next one.
4. Return `HadithImportReport` with `memory_get_peak_usage(true)`.

`importCollection()` for one slug, in this order:
1. `$fingerprint = $this->fingerprints->of($slug, $content->attribution_ar, $content->attribution_en)`; `$resource = $this->resources->findBySource($content->id, ResourceGroup::HadithCollections, $slug)`.
2. **Unchanged shortcut (wet runs only, no file access):** if `$resource !== null`, `$resource->import_fingerprint` equals `$fingerprint` (`hash_equals`), `storedCounts($resource->id)` is non-null with `entries === total` and `total > 0` → status `unchanged`, `pack = ['built' => false, 'queued' => false, 'reason' => 'unchanged']`, no version bump, no row replacement, no pack work. (Dry runs skip this shortcut but still set `fingerprintUnchanged` from the same comparison.)
3. **No request:** if `$this->presence->missing($slug) !== []` → status `no_snapshot`, `failure` = `Pinned files not in the cache: {paths}. Run hadith:import --download.`
4. Read: `$info = $source->info($slug)`, `$collection = $source->collection($slug)`. Catch `HadithPinException|HadithSourceFormatException|HadithApiFawazException` → status `failed`, `failure` = the exception message (step 5 messages hold paths only).
5. `$mapping = $this->mapper->map($collection, $info, $content->id, $primary->code(), $primary->version(), $content->attribution_ar, $content->attribution_en, CarbonImmutable::now('UTC'))`; `unset($collection)`.
6. `$issues = $this->validator->validate($slug, $mapping)`; then `try { $this->validator->assertReferencesAgree($slug, $mapping->stats); } catch (HadithReferenceMismatchException $e) { $issues[] = new HadithIssue('error', 'reference_book_mismatch', null); }` and keep `$e->getMessage()` as `failure`.
7. Any `error` issue → status `invalid` (dry or wet), nothing written.
8. Dry run with no errors → status `valid`.
9. **Wet write**, inside `DB::transaction(fn () => …)`:
   - `$resource ??= $this->resources->create([...])` with `source_id` = `$content->id`, `group` = `ResourceGroup::HadithCollections`, `source_key` = `$slug`, `name` = `title_ar ?? 'مجموعة '.$position` (ADR 0042 §9; `$position` = 1-based index in `config('hadith.collections')`, ASCII digits), `name_ar` = collection `title_ar` or `null`, `language_code` = `'ar'`, `direction` = `TextDirection::Rtl`, `version` 0, `changes_floor_version` 0, `is_active` true.
   - `$before = $resource->version; $resource->version = $before + 1; $resource->changes_floor_version = $resource->version; $resource->checksum` = the edition pin from `config('hadith.files')`; `$resource->import_fingerprint = $fingerprint; $resource->is_active = true;` `$this->resources->save($resource)` (same as `AzkarImporter::write()`).
   - `$this->repository->replaceForResource($resource->id, $mapping->plan)`.
   - `$check = $this->integrity->checkAgainstPlan($resource->id, $mapping->plan)`; if `! $check->ok()` throw `HadithTextIntegrityException` (rolls everything back, including the version bump).
   Any `Throwable` from this block (outside the transaction) → status `failed`; `failure` = `HadithTextIntegrityException`'s message, or for anything else **`get_class($e)` only**. The version and rows are unchanged because the transaction rolled back.
10. **Packs** after a successful commit, exactly as `AzkarImporter` does: `$buildPacks` → `$this->packs->build($resource)` and record `built`, `version`, `sha256`, `size_bytes`, `row_count`; a `PackBuildException` is recorded as `pack.error` (the rows stay written) and the result `failed()`; `$deferPack` → `['built' => false, 'queued' => false, 'deferred' => true]`; neither → `BuildContentPackJob::dispatch($resource->id)` and `['built' => false, 'queued' => true]`. Status `imported`.

`verify($slugs)`: no lock, no writes. For each slug: `findBySource` → none: status `failed`, `failure` `Not imported yet.`; `missing()` non-empty → `no_snapshot`; otherwise read, map (no validation), `checkAgainstPlan($resource->id, $mapping->plan)`; `ok()` → `verified`, else `integrity_failed` with the `IntegrityResult`.

## `HadithImportReport::toReport()` shape (JSON-ready; counts, keys, numbers and grader names only; no text, no titles, no section names)
```
generated_at, dry_run, verify, peak_memory_bytes, succeeded,
collections: [{
  slug, status, failure,
  fingerprint_unchanged, fingerprint,
  counts: { hadith_in_file, imported, no_text, books_created, sections_in_file, empty_sections, grades,
            hadith_with_grades, distinct_graders, grades_without_grader, section0_hadith, section0_is_book,
            reference_checked, reference_mismatches, reference_exceptions_used, duplicates,
            info_hadith_count, info_last_hadith_number, info_section_count, estimated_raw_bytes, estimated_gzip_bytes },
  lists:  { no_text_numbers, duplicate_numbers, reference_mismatch_numbers, reference_exception_numbers, empty_section_keys },
  graders: { "<graded_by>": count },
  issues: [{ severity, code, count, first_subjects: [≤20] }],      // grouped by severity+code
  resource: { id, version_before, version_after, pack: {…} },
  integrity: { expected, stored, stored_hash_mismatches, source_mismatches, missing, extra, first_keys } | null
}]
```
`estimated_gzip_bytes` = `intdiv(estimated_raw_bytes * 10, 35)` (the plan's 3.5 : 1 assumption). Both are **estimates**; see open question 3.

## `ImportHadithCommand` (`App\Domains\Hadith\Console`)
```php
protected $signature = 'hadith:import
    {--download : Fetch and verify the 12 pinned files first (hadith:snapshot in verified mode); without it no request is made}
    {--dry-run : Map and validate in memory; write no rows}
    {--verify : Check stored rows against the source text; write nothing}
    {--build-packs : After a successful wet import, build each pack now}
    {--defer-pack : Neither build nor queue the pack; the web service builds it at start (ADR 0044)}
    {--no-pack : Alias for --defer-pack}
    {--collection=* : Canonical slug to import (repeatable; default all ten, in config order)}
    {--report= : Where to write the JSON report (default storage/app/hadith/reports/<Ymd-His-v>.json)}';
protected $description = 'Import the pinned fawazahmed0 hadith collections into the Hadith content tables (ADR 0042).';
public function handle(HadithImporter $importer, HadithSnapshotter $snapshotter): int;
```
Behaviour:
- `--build-packs` with `--defer-pack`/`--no-pack` → error `Choose --build-packs or --defer-pack (--no-pack), not both.` and `FAILURE`. `--verify` with `--dry-run`, `--build-packs`, `--defer-pack` or `--no-pack` → error and `FAILURE`. `--build-packs` with `--dry-run` is accepted and ignored (nothing is written).
- Unknown `--collection` slug (not in `config('hadith.collections')`) → error naming the slug and the valid ones; `FAILURE`; nothing else runs.
- `--download`: `$snapshotter->take(false)`; print `Snapshot verified: {n} files.`; on `HadithApiFawazException|HadithPinException|HadithSourceFormatException` print the message, `FAILURE`.
- Run `$importer->verify(...)` or `$importer->run(...)`; catch `HadithImportLockedException` → print its message, `FAILURE`.
- Write the JSON report (`File::ensureDirectoryExists(dirname())`, `JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR`). The default path is under `storage_path('app/hadith/reports/')` (outside the volume, like ADR 0068 §3 for reports).
- Print: `Status: …` per collection as one table with columns `Collection | Status | In file | Imported | No text | Books | Grades | Mismatches | Duplicates | Est. raw MB`; one line per `no_snapshot` / `failed` / `invalid` collection with its `failure` or its error codes with counts (no subjects); `Peak memory: {mb} MB`; `Report written to: {path}`. For `no_snapshot` add `Run hadith:import --download.`
- Exit `SUCCESS` iff `$report->succeeded()`. A run where every collection is `no_snapshot` exits `SUCCESS` (this is the scheduled case).
- Never prints text, titles, section names, grade strings or an exception message other than the domain messages above.

## Scheduler
Append to `routes/console.php` (use `Schedule::command(ImportHadithCommand::class)`):
```php
Schedule::command(ImportHadithCommand::class)
    ->dailyAt('04:30')
    ->timezone('UTC')
    ->withoutOverlapping()
    ->onOneServer();
```
Because it has no `--download`, the scheduled run never makes a request: an unchanged collection exits through the fingerprint shortcut without reading a file, a missing cache is `no_snapshot` (exit 0), and only a changed fingerprint (a config or titles change that deployed) rewrites rows and queues one `BuildContentPackJob`. The entry is not in `docker/release.sh` or `docker/start-web.sh`.

## Chapter seam (ADR 0076, Proposed; no code in this step)
The chapter step (OpenITI data files, committed under `database/data/hadith/chapters/{slug}.json`) will plug in **between `HadithMapper::map()` and `HadithCollectionValidator::validate()` in `HadithImporter::importCollection()`**, working on the `MappingResult` it returns. What this step leaves ready for it, and which the implementer must not change:
1. `HadithImportPlan::$chapters` exists and is always `[]`; `replaceForResource()` already deletes and inserts `hadith_chapters`, so the chapter step only has to fill the list.
2. Every entry row already carries a `chapter_id` key (`null`) and `book_id`, `position`, `hadith_number`, which is what a chapter assignment by first/last number inside a book needs. Plan rows already carry their own `source_id`, so chapter rows can name another source (the `openiti` row) with no change to the repository.
3. `HadithImportFingerprint::of()` is the one place where a chapter file hash must be added (the chapter step edits it and bumps `HadithMapper::VERSION`), so a new chapter file changes the fingerprint and bumps the pack version.
4. Tests in this step assert that `hadith_chapters` is empty and `chapter_id` is null; the chapter step changes those two tests, nothing else.
Do not create an interface, an empty class, a hook, a config key or a `TODO` for it.

## Title matcher

### `HadithApiCom` integration (`App\Integrations\HadithApiCom`; imports no `App\Domains`)
`HadithApiComConfig` (final readonly): `string $baseUrl` (rtrim `/`), `string $apiKey`, `array $books` (`array<string, string>`), `int $timeoutSeconds`, `int $tries`, `int $retryDelayMs`, `int $pageSize`, `int $maxPages`, `string $userAgent` (same rule as `HadithApiFawazConfig`). `public static function fromConfig(): self` throws `HadithApiComConfigException` when:
- `app()->isProduction()` — checked **first, before the key is read**; message `The title source is a developer tool and is disabled in production.`;
- `config('hadith.api_key')` is not a non-empty string — message `HADITH_API_KEY is not set. Put it in your local apps/api/.env (dev-only).`;
- `base_url` or `books` is malformed. Messages name the config key, never a value.

`HadithApiComChapter(string $id, ?string $titleAr)`; `HadithApiComHadithRef(string $hadithNumber, string $chapterId)` (final readonly).

`HadithApiComClient` (final): constructor `HadithApiComConfig $config`.
```php
/** @return list<HadithApiComChapter> GET {base}/{bookSlug}/chapters?apiKey=… ; reads only id and chapterArabic */
public function chapters(string $bookSlug): array;
/** @return list<HadithApiComHadithRef> GET {base}/hadiths?apiKey=…&book={bookSlug}&paginate={pageSize}&page={n}, all pages; reads only hadithNumber and chapterId */
public function hadithRefs(string $bookSlug): array;
/** Replaces the key, and its urlencoded and rawurlencoded forms, with [redacted]. */
public function redact(string $text): string;
```
Rules:
- `$bookSlug` must be a value of `config->books`, else `HadithApiComException` (no request).
- The key goes **only** in the `apiKey` query parameter. Use `Http::withUserAgent(...)->timeout(...)->connectTimeout(...)->retry(...)` with the step 5 retry predicate (connection error, 429, ≥ 500; backoff `retryDelayMs * 2 ** (attempt - 1)`), `throw: false` and no `->throw()`.
- **Redaction rule (RB15).** CURL and Guzzle messages contain the full URL with the key. Therefore: catch `ConnectionException` and `RequestException` and throw `HadithApiComRequestException` with a message built **only** from a fixed label and a status: `The title source answered HTTP {status} for [{label}].` or `The title source could not be reached for [{label}].`, where `{label}` is `chapters` or `hadiths`, never a URL. **Do not chain the previous exception** (`previous: null`). Never log. Never put a URL, the key or a request object in an exception, a return value or a property.
- Response shape (an assumption; open question 6): chapters = JSON `chapters` list of objects with `id` (int|string) and `chapterArabic` (string|null; `''` becomes `null`); hadiths = `hadiths.data` list of objects with `hadithNumber` (int|string) and `chapterId` (int|string), and `hadiths.last_page` (int). Convert ids and numbers to strings exactly (`(string)` of an int; a string unchanged). Keep **only** those fields; the decoded array is dropped immediately (nothing else, no text or grades, is stored anywhere). Loop `page = 1 … last_page`, stopping with `HadithApiComShapeException('Too many pages for [hadiths].')` beyond `maxPages`. Anything else unexpected → `HadithApiComShapeException('Unexpected response shape for [{label}] page {n}.')`.
`HadithApiComServiceProvider` binds config and client with closures (pattern of `HadithApiFawazServiceProvider`).

### `HadithSectionTitleMatcher` (pure; `final`, no constructor)
```php
/**
 * @param  array<string, list<string>>  $sections   book_number => hadith numbers that have text (exact strings)
 * @param  list<array{number: string, chapter_id: string}>  $pairs  hadithapi.com hadith => chapter
 * @param  array<string, ?string>  $chapterTitles   chapter_id => chapterArabic (as received)
 * @return list<SectionMatch>  one per section, in the order of $sections
 */
public function match(array $sections, array $pairs, array $chapterTitles, int $thresholdPercent = 95): array;
```
Rule (all comparisons are integer: `matched * 100 >= total * $thresholdPercent`; numbers align by **exact string**):
1. Build `numberChapters[number] = set of chapter ids` from `$pairs` (identical pairs de-duplicated) and `chapterNumbers[chapterId] = set of distinct numbers`. A number with more than one distinct chapter is **ambiguous**: it never counts as matched, anywhere.
2. For each section with numbers `N` (`total = count(N)`): `0` → rejected `empty_section`. Tally, per chapter, the numbers of `N` that are unambiguous. No tally → rejected `no_chapter_mapped`. The best chapter `C*` is the one with the highest tally (ties: the smaller id by `strcmp`).
3. **Forward:** `forwardMatched = tally[C*]`, `sectionSize = total`; fail → `forward_below_threshold`.
4. **Backward:** `chapterSize = count(chapterNumbers[C*])` (every hadithapi.com number in that chapter, including ambiguous ones and numbers fawazahmed0 has no text for); `backwardMatched` = those numbers that are unambiguous and belong to `N`; fail → `backward_below_threshold`. A number missing from fawazahmed0 counts as not mapped (open question 7).
5. Both pass but `$chapterTitles[C*]` is `null` or `''` → rejected `chapter_has_no_title`. Otherwise `accepted`, `titleAr` = the title **byte for byte as received**.
Hadith numbers with no text are never in `$sections` (they are left out of the forward count).

### `HadithSectionTitleProposer` (`final`)
Constructor: `HadithSourceRegistry $sources`, `HadithMapper $mapper`, `HadithSectionTitleMatcher $matcher`, `HadithApiComClient $client`. `public function propose(string $slug): CollectionProposal`. It reads `$this->sources->primary()->collection($slug)` (a dev tool: a cache miss may download through the verified adapter), calls `$mapper->map($collection, null, 0, $code, $version, '', '', CarbonImmutable::now('UTC'))`, and builds `$sections[book_number]` from `plan->books` and `plan->entries` (the same assignment the importer uses). It then calls `$client->chapters($bookSlug)` and `$client->hadithRefs($bookSlug)` for `config('hadith.title_match.books')[$slug]`, and the matcher with `config('hadith.title_match.threshold_percent')`. `mappingErrors` = count of `error` issues in the mapping (reported, not blocking).

### `MatchSectionTitlesCommand`
```php
protected $signature = 'hadith:match-section-titles
    {--collection=* : Canonical slug to match (repeatable; default the six hadithapi.com shares)}
    {--output= : Where to write the proposal (default storage/app/hadith/proposals/section-titles.json)}';
protected $description = 'Dev only: propose Arabic book titles from hadithapi.com under the two-way 95% rule (ADR 0042 §4a). Writes a proposal, never config/.';
public function handle(HadithSectionTitleProposer $proposer): int;
```
1. **`app()->isProduction()` → `error('hadith:match-section-titles is a developer tool and is disabled in production.')`, `FAILURE`, before the key is read and before any request**, even when a key is configured.
2. Slugs: default = the keys of `config('hadith.title_match.books')`. A `--collection` slug not in `config('hadith.collections')` → error, `FAILURE`. A known slug without an entry in `books` (`malik`, `nawawi40`, `qudsi40`, `shahwaliullah40`) is **skipped** and listed in the proposal under `skipped` with `reason: "no counterpart"` (not an error).
3. `HadithApiComConfig::fromConfig()`; on `HadithApiComConfigException` print `$client->redact(message)` and `FAILURE`. For each slug call the proposer. On `HadithApiComException|HadithPinException|HadithSourceFormatException|HadithApiFawazException` print `redact($e->getMessage())` and return `FAILURE`; **write nothing** unless every selected collection finished.
4. Write the proposal (`File::ensureDirectoryExists`, same JSON flags as the report) to `--output` or `storage_path('app/hadith/proposals/section-titles.json')`. Never write under `config/`, `database/` or `app/`.
5. Print, per collection: `Collection {slug}: {accepted} accepted, {rejected} rejected ({sections} sections)`; and `Proposal written to: {path}` and `This command never writes config/. Review the proposal and paste its "paste" block into config/hadith_titles.php under 'sections'.`

Proposal JSON (titles and statistics only; no hadith text, no grades, no URL, no key):
```
generated_at, source: "hadithapi.com", commit, threshold_percent,
collections: { "<slug>": { book_slug, sections: <int>, hadithapi_chapters, hadithapi_hadith, ambiguous_numbers, mapping_errors,
   accepted: { "<book_number>": { title_ar, title_ar_source: "hadithapi.com", chapter_id, forward: {matched, total, percent}, backward: {matched, total, percent} } },
   rejected: { "<book_number>": { reason, chapter_id|null, forward: {…}, backward: {…} } } } },
skipped: { "<slug>": { reason } },
paste: { "<slug>": { "<book_number>": { title_ar, title_ar_source: "hadithapi.com" } } }
```
`title_ar` is written exactly as received (`JSON_UNESCAPED_UNICODE`, no trim or normalisation). `percent` is `SectionMatch::forwardPercent()` / `backwardPercent()`. Console output never contains a title.

## Tests (Pest, `declare(strict_types=1)`, placeholders only, never the live network)

Every test file starts with `require_once` of the helper files it needs and `beforeEach` calling `Http::preventStrayRequests()`. Files that touch the database call `uses(RefreshDatabase::class);`. Load `Support/HadithFixtureFiles.php` with `require_once __DIR__.'/../Support/HadithFixtureFiles.php';` and reuse `hadithUseTempCache()`, `hadithPinFixtures()`, `hadithFakeCdn()`, `hadithEditFixture()` from it. **New helper names are prefixed `hadithImport…` / `hadithMatch…`** (names already used: see step 4's list in `step-04-pack-contract.md`, plus `hadithSourceContract`).

### `Support/HadithImportFixtures.php`
Step 5's `hadithFixtureFiles()` puts `2787.2` outside its section ranges, so this step has its own.
- `hadithImportCollection(): array` — the default decoded edition. `metadata.name` `FIXTURE collection`; `sections`: `"0": ""`, `"1": "FIXTURE section 1"`, `"2": "FIXTURE section 2"`, `"3": "FIXTURE section 3"`; `section_details` (`hadithnumber_first/last`, `arabicnumber_first/last`): `"0"` 0–0/0–0, `"1"` 1–2/1–2, `"2"` 3–4/3–4, `"3"` 2787.2–2787.2/5–5. `hadiths` in file order:
  1. number `1`, arabic `1`, text `FIXTURE text 1 — not a hadith`, grades `[{name: "FIXTURE grader", grade: "FIXTURE grade"}]`, reference `{book: 1, hadith: 1}`
  2. number `2`, arabic `2`, text «نص تجريبي ١ — ليس حديثًا» with a `U+200F` after the dash, grades two items (`FIXTURE grader`/`FIXTURE grade`, `FIXTURE grader 2`/`FIXTURE grade 2`), reference book `1`
  3. number `3`, arabic `3`, text `''`, grades `[]`, reference book `2`
  4. number `4`, arabic `4`, text `FIXTURE text 4 — not a hadith`, grades `[]`, reference book `2`
  5. number `2787.2`, arabic `5`, text `FIXTURE text 5 — not a hadith`, grades `[]`, reference book `3`
  Expected for this default: 5 in the file, 4 imported, no-text `['3']`, 3 books (section 0 empty, so no book) with `hadith_count` 2, 1, 1, positions inside books 1-2, 1, 1, 3 grade rows (entry `2` has two), 2 hadith with grades, 1 distinct grader name per FIXTURE plus `FIXTURE grader 2` (so 2 distinct graders).
- `hadithImportFiles(?callable $editOne = null): array` — `hadithFixtureFiles()` with every `editions/ara-*.json` replaced by `hadithImportCollection()` (optionally passed through `$editOne($path, $data)`), and `info.json` rebuilt per source slug: `metadata{name, last_hadithnumber: 2787.2, sections: {the four}}`, `hadiths`: 5 items (`hadithnumber`, `arabicnumber`, `grades`, `reference`). `editions.json` unchanged. Encode with `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.
- `hadithImportUse(array $files): string` — calls `hadithUseTempCache()`, `hadithPinFixtures($files)`, `hadithFakeCdn($files)` and returns the cache root (the test deletes it in `afterEach`).
- `hadithImportWarm(): void` — `app(HadithSnapshotter::class)->take(false)` to fill the temp cache through the fake CDN.
- `hadithImportRun(array $slugs = [], bool $dry = false, bool $build = false, bool $defer = true): HadithImportReport` — `app(HadithImporter::class)->run(...)`. Default `$slugs = ['bukhari']`.

### `Import/HadithMapperTest.php` (no database; `app(HadithMapper::class)`, build `SourceCollection` records by hand or through `FawazHadithSource` with the fake CDN)
- `it('assigns each hadith to a book by section_details ranges')`: ids, positions and `hadith_count` as above.
- `it('keeps a decimal hadith number as text and finds its range numerically')`: row `hadith_number` is the string `'2787.2'`, in book `'3'`.
- `it('skips a hadith with no text and lists it')`: also text `null` (key absent) and a text of only `U+200F` and spaces; each appears in `noTextNumbers`; none is a row.
- `it('imports section 0 only when hadith fall in it')`: default fixture has no section-0 book; a fixture with range 0–0 widened to include hadith `1` creates book `'0'` (`section0IsBook` true, title null).
- `it('creates no book for an empty section and lists its key')`.
- `it('stores every grade as received with its grader, in order, and none for a collection without grades')`: `source_key` `fawazahmed0:bukhari:2:2` for the second grade of hadith `2`; a collection with every `grades` set to `[]` gives an empty `grades` list.
- `it('keeps text_ar byte-identical and hashes the exact bytes')`: `text_ar === ` the fixture string including `U+200F`, `strlen` equal, `source_text_sha256 === hash('sha256', $text)`; `text_search` equals `HadithSearchTextNormalizer` output.
- `it('uses the canonical slug and the source code in every key')`: for `nawawi40`: `fawazahmed0:nawawi40:1`, `fawazahmed0:nawawi40:1` for the book.
- `it('reports a number outside every range')` (`hadith_outside_ranges`), `it('reports a number inside two ranges unless reference.book picks one')` (`ambiguous_range` vs resolved), `it('reports a non-numeric number')`, `it('reports invalid UTF-8')`, `it('reports a duplicate number once and keeps the first')`.
- `it('records a reference.book mismatch and keeps the range assignment')`: `referenceMismatchNumbers === ['4']` when hadith `4` says book `1`; `assertReferencesAgree` throws `HadithReferenceMismatchException` with `slug`, `count`, `hadithNumbers` and a message that contains only numbers; with `config(['hadith.reference_exceptions' => ['bukhari' => ['4']]])` it does not throw, `referenceExceptionNumbers === ['4']` and the issue `reference_exception_used` is a warning.
- `it('reports counts against info.json as warnings, not errors')`: a mismatching `info.json` count gives `hadith_count_differs_from_info` (warning) and no error.
- `it('rejects over-long fields')` (`source_key_too_long`, `grade_too_long`, `book_number_too_long`).
- `it('uses titles only from hadith_titles and only an approved author')`: set `config(['hadith_titles.sections' => ['bukhari' => ['1' => ['title_ar' => 'FIXTURE title', 'title_ar_source' => 'hadithapi.com']]]])`: book `'1'` has that title, book `'2'` null; a collection with `author_ar_status` other than `approved` gets `author_ar` null.
- `it('leaves chapter_id null and chapters empty')`.
- `it('estimates raw bytes from text lengths')`.

### `Import/HadithImporterTest.php` (`RefreshDatabase`; `beforeEach`: `$files = hadithImportFiles()`, `hadithImportUse($files)`, `hadithImportWarm()`; `afterEach` deletes the temp root)
- `it('imports the default collection into all six tables')`: counts 1 collection, 3 books, 4 entries, 3 grades, 0 chapters, 0 aliases; `hadith_entries.chapter_id` all null; collection `total_hadith 4`, `books_count 3`, `source_version` the pinned commit, attribution equals the `content_sources` row; the resource has group `hadith_collections`, `source_key` `bukhari`, version 1, `checksum` the edition pin, `import_fingerprint` set, `is_active` true, `name` equal to the approved `title_ar` for `bukhari`; for `nawawi40` it equals `title_ar`; with `config(['hadith_titles.collections.bukhari.title_ar' => null])` the name is `مجموعة 1`.
- `it('stores text_ar byte for byte and the matching sha256')` (read back from MySQL: same bytes including `U+200F`; `source_text_sha256` equals `hash('sha256', text_ar)`).
- `it('imports all ten collections')`: `run(config('hadith.collections'))`; ten resources, ten collection rows; `nawawi40`, `qudsi40`, `shahwaliullah40` are read from `ara-nawawi`, `ara-qudsi`, `ara-dehlawi` (the request log shows those paths).
- `it('lists no-text hadith in the report and does not import them')`.
- `it('reports counts against the source and info.json')` (`hadith_in_file 5`, `info_hadith_count 5`, `info_section_count 4`, `info_last_hadith_number '2787.2'`).
- `it('fails a collection with a duplicate number and writes nothing for it, while the next collection still imports')`: edit only `ara-bukhari.json`; `bukhari` is `invalid`, no `bukhari` resource; `muslim` is `imported`; `succeeded()` false.
- `it('fails a collection on a reference.book mismatch unless the developer listed an exception')`: status `invalid`, issue `reference_book_mismatch`, `failure` is the exception message; with the exception configured the collection imports and the report lists the number under `reference_exception_numbers`.
- `it('reports the mismatch count and numbers on a dry run without writing')`.
- `it('dry run writes no rows, no resource and no pack, and reports valid')`.
- `it('is idempotent: the same inputs bump nothing')`: second `run()` → status `unchanged`, version stays 1, rows untouched (compare a row's `imported_at`), no request made (record `Http::recorded()` count after the warm-up and assert it is unchanged).
- `it('bumps the version when titles, reference exceptions or the edition pin change')`: change `hadith_titles.sections` via `config()` → second run `imported`, version 2, `changes_floor_version 2`, book title now set; same for a `reference_exceptions` edit and a new pin (re-fake the CDN with an edited file).
- `it('rewrites rows when the stored count no longer matches (rows deleted by hand)')`.
- `it('rolls a collection back when a write fails and leaves the version unchanged')`: bind a `HadithImportRepository` subclass that inserts the entries and then throws a `\RuntimeException('FIXTURE failure with FIXTURE text 1')` from `replaceForResource`; status `failed`, `failure` is `RuntimeException` (the class name; the message text must not appear), zero rows in every hadith table for the resource, resource `version` 0 or absent.
- `it('rolls back when the integrity check fails')`: a repository whose `entryTexts()` yields one altered `text_ar`; `failure` contains `Nothing was written`; no rows remain.
- `it('detects an altered stored row in verify mode')`: import, then `DB::table('hadith_entries')->where('source_key','fawazahmed0:bukhari:1')->update(['text_ar' => 'FIXTURE altered'])`; `verify(['bukhari'])` → `integrity_failed`, `storedHashMismatches 1`, `firstKeys` holds the key; an untouched import verifies `verified`.
- `it('refuses a second wet run while the lock is held')`: `Cache::lock('hadith:import', 10)->get()` in the test, then `run()` throws `HadithImportLockedException`; a dry run is allowed; after `release()` it runs.
- `it('makes no request without a cached snapshot and reports no_snapshot')`: empty temp cache, `Http::assertNothingSent()`, status `no_snapshot`, `succeeded()` true, no row written; corrupt one cached file → also `no_snapshot`.
- `it('builds the pack now with --build-packs')`: `ContentPack` row exists, `row_count` > 0, the packed `hadith_grades` table has 0 rows (`grades_visible` is false) although MySQL has 3; `it('queues the pack job by default')` with `Queue::fake()` (`BuildContentPackJob` pushed once; none when unchanged); `it('queues nothing with --defer-pack')`; `it('refuses --build-packs together with --defer-pack')` (`\LogicException`).
- `it('never puts text, titles or section names in the report')`: `json_encode($report->toReport())` contains none of `FIXTURE text`, `FIXTURE section`, `نص تجريبي`.
- `it('leaves hadith_chapters empty')`.
- `it('does not mention hadith in release.sh or start-web.sh')`: `file_get_contents(base_path('docker/release.sh'))` and `…/start-web.sh` do not contain `hadith:` (step 17 adds it; see open question 5).
- `it('registers a daily, non-overlapping, one-server schedule entry for hadith:import')`: `app(Schedule::class)->events()` has an event whose command contains `hadith:import`, `expression` is `30 4 * * *`, `withoutOverlapping` and `onOneServer` are true, and the command does not contain `--download`; and `it('the scheduled run is a no-op when nothing changed')`: after an import, `Artisan::call('hadith:import')` exits 0, makes no request, bumps no version.

### `Import/HadithImportCommandTest.php` (`RefreshDatabase`)
- `it('is registered')` (`Artisan::all()` has both commands).
- `it('imports with --defer-pack, prints a table and writes a report with counts only')`: exit 0; output contains the slug, `imported`, `Report written to:`; the report file (use `--report` into the temp root) decodes and `collections[0].counts.imported` is 4; output and file contain none of the placeholder texts.
- `it('--dry-run writes no rows')`, `it('--collection imports only the named slugs')`, `it('rejects an unknown --collection')` (exit 1, names valid slugs, no request), `it('rejects --build-packs with --defer-pack')`, `it('rejects --verify with --dry-run')`.
- `it('--download fetches and verifies the twelve files first')`: empty cache, `--download --defer-pack`: exactly 12 requests, then import.
- `it('without --download and an empty cache it exits 0 and says to use --download')`, `it('exits 1 when a collection is invalid')`, `it('exits 1 when another import holds the lock and prints the lock message')`.
- `it('--verify exits 0 on clean rows and 1 on an altered row')`.
- `it('prints no exception message other than the domain messages')`: use the failing repository from the importer test; output contains `RuntimeException` and not the message text.

### `Import/HadithImportArchTest.php`
- `arch('hadith import records are plain PHP')->expect('App\Domains\Hadith\Import\Records')->not->toUse(['Illuminate\Database', 'Spatie\LaravelData', 'Illuminate\Http'])`.
- `arch('the hadithapi.com client imports no domain')->expect('App\Integrations\HadithApiCom')->not->toUse('App\Domains')`.
- `arch('only the title matcher uses hadithapi.com')->expect('App\Integrations\HadithApiCom')->toOnlyBeUsedIn(['App\Domains\Hadith\Services\HadithSectionTitleProposer', 'App\Domains\Hadith\Console\MatchSectionTitlesCommand', 'App\Integrations\HadithApiCom'])`.
- `arch('the importer never reads the dev-only key or the title source')->expect('App\Domains\Hadith\Services\HadithImporter')->not->toUse('App\Integrations\HadithApiCom')`; and a test that the string `hadith.api_key` appears only in `config/hadith.php` and `HadithApiComConfig.php` (scan `app/` with `File::allFiles`).
- `arch('the hadith import layers hold')`: `App\Domains\Hadith\Repositories` not `Illuminate\Support\Facades\DB`; `App\Domains\Hadith\Services` not `Illuminate\Http`; `toUseStrictTypes()` for `App\Domains\Hadith` and `App\Integrations\HadithApiCom`.
- `it('does not write under config/, database/ or app/ from the matcher')`: grep the two matcher files for `config_path(`, `base_path('config`, `database_path(`, `app_path(` (none).

### `TitleMatch/HadithSectionTitleMatcherTest.php` (pure; build inputs by loops)
- `it('accepts a section at exactly 95% forward and 95% backward')`: the section has 1,000 numbers, 950 of them map to chapter `1` (forward 950/1000); chapter `1` lists 1,000 numbers in all, 950 of them in the section (backward 950/1000). Accepted.
- `it('rejects at 94.9% forward')` (949/1000) and `it('rejects at 94.9% backward')` (chapter of 1,000 with 949 in the section), each with the correct `reason`.
- `it('rejects a match that passes forward but fails backward')`: the whole section maps to chapter `1`, but chapter `1` holds 10× as many numbers → `backward_below_threshold`.
- `it('rejects a section spread over two chapters')`: 60/40 → `forward_below_threshold`.
- `it('leaves numbers with no text out of the forward count')`: they are not in `$sections`, so `sectionSize` equals the with-text count.
- `it('aligns numbers by exact string')`: `'2787.2'` matches `'2787.2'`; `'2787.20'` and `'01'` do not match `'2787.2'` and `'1'`.
- `it('never counts an ambiguous number as matched')`: a number in two chapters lowers both percentages.
- `it('rejects an accepted-by-numbers match whose chapter has no title')` (`chapter_has_no_title`), `it('rejects an empty section')`, `it('rejects when no number maps')`.
- `it('returns the title byte for byte')`: a title with `U+200F` and a trailing space comes back `===`.
- `it('uses the configured threshold')`: `$thresholdPercent = 100` rejects 999/1000.

### `TitleMatch/HadithApiComClientTest.php` (`Http::fake`, `FIXTURE-KEY`)
Set `config(['hadith.api_key' => 'FIXTURE-KEY'])` and call `app()->forgetInstance(HadithApiComConfig::class)` / `HadithApiComClient::class` after changing config.
- `it('sends the key only as the apiKey query parameter')`: `Http::assertSent` URL contains `apiKey=FIXTURE-KEY`; no header, no body carries it.
- `it('reads only chapter ids and Arabic titles, and only hadith numbers and chapter ids')`: the fake responses carry extra fields with `FIXTURE text` placeholders; the returned objects have only the two fields each (`get_object_vars` count 2); nothing else is reachable.
- `it('follows pagination to the last page')`, `it('refuses an unexpected shape')` (`HadithApiComShapeException`, message has no key), `it('stops at max_pages')`.
- `it('refuses a book slug that is not configured and sends no request')`.
- `it('retries on 503, 429 and a connection error, then fails with the status')`.
- **`it('never lets the key reach an exception message, a previous exception or a log')`**: for each of connection error (the `Http::fake` closure throws `ConnectionException` whose message contains `https://hadithapi.com/api/…?apiKey=FIXTURE-KEY`), HTTP 500 with a body containing the key, HTTP 403, and a bad shape: the thrown exception's message does not contain `FIXTURE-KEY`, `getPrevious()` is `null`, `(string) $e` does not contain it, and a temp log file (`config(['logging.default' => 'single', 'logging.channels.single.path' => <temp>])`) either does not exist or does not contain it.
- `it('redacts the key, its urlencoded form and its rawurlencoded form')` (use a key like `FIXTURE KEY+1`).
- `it('refuses to build its config in production even with a key')`: `$this->app['env'] = 'production'` (restore in `afterEach`); `HadithApiComConfigException`; no request.
- `it('refuses to build its config without a key')`: message mentions `HADITH_API_KEY` and nothing else.

### `TitleMatch/MatchSectionTitlesCommandTest.php` (`Http::fake` + step 5 fake CDN + temp cache; `RefreshDatabase` is not needed)
Helpers in `Support/HadithTitleMatchFixtures.php`: `hadithMatchFake(array $chaptersBySlug, array $hadithsBySlug): void` serving `hadithapi.com/api/{bookSlug}/chapters*` and `hadithapi.com/api/hadiths*` with placeholder JSON (`chapterArabic` = `FIXTURE chapter title 1`, a title with `U+200F` for the byte-exact test; `hadithNumber` strings).
- `it('refuses to run in production even with a key')`: `config(['hadith.api_key' => 'FIXTURE-KEY'])`, env production; exit 1, output contains `disabled in production`, `Http::assertNothingSent()`, no file written.
- `it('refuses without a key and names HADITH_API_KEY')`.
- `it('processes only the six shared collections and lists the others as skipped')`: `--collection=malik --collection=nawawi40` → proposal `skipped` has both with `no counterpart`; no hadithapi request.
- `it('lists every accepted and rejected match with both percentages and the counts')`: default fixtures for `bukhari` (book `1` matches chapter `1`; book `2` is spread over two chapters and is rejected); proposal `accepted['1'].forward` is `{matched, total, percent}`.
- `it('writes the title byte for byte and only titles and statistics')`: the stored `title_ar` `===` the fake's string with `U+200F` and trailing space; the proposal file contains none of `FIXTURE text`, `نص تجريبي`, `FIXTURE grade`, `grades`, `apiKey`, `https://`.
- `it('writes a paste block in the hadith_titles sections shape')`: `paste.bukhari['1']` has `title_ar` and `title_ar_source: hadithapi.com`.
- `it('never writes config/')`: `md5_file(config_path('hadith_titles.php'))` and `hadith.php` unchanged; no file created under `config/`.
- **`it('never shows FIXTURE-KEY in output, proposal, exception messages or logs')`**: run the command through a success, a 403, a 500 and a connection error (message carrying the URL with the key); assert `Artisan::output()` and the proposal file and the temp log lack `FIXTURE-KEY`.
- `it('writes nothing when one collection fails')`.
- `it('is not scheduled and not in release.sh or start-web.sh')`.

## Reuse (paths checked)
- `apps/api/app/Domains/Azkar/Services/AzkarImporter.php` (resource create/bump, fingerprint shortcut, `buildPackNow`, pack modes), `Services/AzkarImportFingerprint.php`, `Repositories/Eloquent/EloquentAzkarImportRepository.php` (delete + chunked insert), `Console/ImportAzkarCommand.php` (options, report file, summary), `AzkarImportServiceProvider.php` (bindings, commands).
- `apps/api/app/Domains/Duas/Services/DuasImporter.php` (`Cache::lock`, `LockTimeoutException` pattern).
- `apps/api/app/Domains/Hadith/{Sources,Contracts,Console}` and `Sources/Records` (step 5), `App\Support\HadithText\HadithSearchTextNormalizer`, `config/hadith.php`, `config/hadith_titles.php`.
- `apps/api/app/Domains/Content/Repositories/Contracts/ResourceRepository.php` (`sourceId`, `findBySource`, `create`, `save`), `Content/Packs/PackBuilder.php`, `Content/Jobs/BuildContentPackJob.php`, `Content/Models/ContentSource.php`, `Content/Enums/{ResourceGroup,TextDirection}.php`.
- `apps/api/app/Integrations/HadithApiFawaz/*` (retry predicate, config object, provider and exception style), `apps/api/app/Domains/Feedback/FeedbackServiceProvider.php` (schedule registration pattern; this step uses `routes/console.php` per the plan's merge-risk table).
- `apps/api/tests/Feature/Hadith/Support/HadithFixtureFiles.php`, `tests/Feature/Hadith/Source/*` (fake-CDN test style), `tests/Feature/Hadith/HadithPackBuilderTest.php` (pack assertions), `tests/Unit/ArchitectureTest.php`.
- `apps/api/docker/release.sh`, `apps/api/docker/start-web.sh` (read only, to assert they are untouched).

## Gates
Run from `apps/api` with the local PHP 8.5:
```bash
composer qa
```
(`pint --test`, `phpstan analyse` at level 8, `pest --parallel`.) If Pint reports style issues, run `vendor/bin/pint` once and rerun. Also run `php artisan list | grep hadith` (expect `hadith:import`, `hadith:match-section-titles`, `hadith:snapshot`) and `php artisan schedule:list | grep hadith`. No dependency change, so no `composer audit` / `npm-audit`. **No OpenAPI change is expected** (no route, controller, resource or schema change): `npm run generate -w @quran/api-contract` from the repo root must produce no diff in `openapi.json` or `schema.d.ts`; if it does, stop and report. `git status --short` must show nothing under `apps/api/storage/`, nothing under `database/`, and `docker/*.sh` unchanged.

### Real-data dry run (at the end, local only, counts only)
1. Check the local database has the hadith migrations applied (`php artisan migrate:status` lists the six `hadith` tables and the `fawazahmed0` source migration as Ran). If not, say so in your report and skip this section; **do not run `migrate`**.
2. The pinned snapshot is already cached at `apps/api/storage/app/private/sources/hadith/df57907be35291c91ad6a6691180e22ca9920784/`. Run `php artisan hadith:import --dry-run --report=<scratchpad path>`. If PHP's `memory_limit` stops it, rerun with `php -d memory_limit=1G artisan …` and report the peak; do not change any code or ini file to raise a limit (step 17 measures RB14).
3. Report **counts only**, never text, titles, section names or grade strings: per collection hadith in the file, imported, no-text, duplicates, section-0 hadith, range vs `reference.book` mismatches (and the exception count), books created, empty sections, grade rows, distinct graders, the three info-count warnings, `estimated_raw_bytes` and `estimated_gzip_bytes`, the status, and `peak_memory_bytes`. Totals across the ten.
4. Do not run `hadith:import` without `--dry-run`, and do not run `hadith:match-section-titles` (it needs the developer's key).

## Out of scope
- Chapters: any chapter row, `chapter_id`, OpenITI file, parser or matcher (ADR 0076 and its own step). The seam above is described, not built.
- Endpoints, controllers, Resources, OpenAPI, mobile files, frames.
- `docker/release.sh`, `docker/start-web.sh`, `docs/runbooks/railway-release.md`, `--download` wiring in deploy scripts (step 17).
- `SunnahComSource`, a Sunnah.com adapter, `hadith_ref_aliases` rows, the alias report (step 18). The table stays empty.
- The optional `ara-{c}1` diagnostic comparing our `text_search` with the diacritics-removed edition: not built (open question 4).
- Editing `config/hadith_titles.php` (the developer pastes the proposal), changing `files` pins, bumping the commit, `reference_exceptions` values, grades visibility, English text.
- A `--source` option, a `--force` option, a pack gate for hadith (D12), a kill switch (ADR 0045).
- Running the live matcher or any network call in tests.

## Open questions for the developer
1. **`reference_exceptions` shape.** `config/hadith.php` has `reference_exceptions => []` and no shape. This brief defines `array<string, list<string>>`: canonical slug => hadith numbers whose `reference.book` disagreement the developer accepts, the range assignment always winning. Confirm, or name another shape (for example number => book).
2. **Duplicate hadith numbers.** The entry key is `fawazahmed0:{slug}:{hadithnumber}` and is unique in MySQL, so a repeated number cannot be stored. The default here is a validation error (`duplicate_hadith_number`): that collection writes nothing until the developer decides. Options once the dry run shows whether any exist: suffix the later occurrence's key (`…:{number}#2`) and keep it, or skip it and list it. The plan says only "duplicates reported".
3. **Pack sizes cannot come from `--dry-run`.** A dry run writes no rows and builds no pack. This brief reports `estimated_raw_bytes` (Σ `text_ar` + `text_search` lengths + 150 per hadith) and `estimated_gzip_bytes` (÷ 3.5, the plan's assumption). Measured sizes need a local wet run with `--build-packs` against a development database (`content_packs.size_bytes`). Say if you want that run as part of this step.
4. **The `ara-{c}1` diagnostic** (ADR 0042 §3, plan step 6 row, "optional") cannot run: the step 5 client refuses `ara-{c}1` (D7) and `config('hadith.files')` has no pins for them. Building it would need ten more pinned files (about 47 MB). Left out.
5. **Where the import runs.** Plan step 17 and the plan's merge table name `docker/release.sh`, but its own header and `start-web.sh` run imports at web start, where the volume is mounted (B1, ADR 0044). The "not wired yet" test therefore asserts that neither script contains `hadith:`. Step 17 should say `start-web.sh`. Also: ADR 0042 §3's `--if-unlocked` line is superseded by its 2 Nov amendment (no switch), and no `--if-unlocked` option exists here.
6. **hadithapi.com response shape and paging.** The envelope used here (`chapters[].id/chapterArabic`, `hadiths.data[].hadithNumber/chapterId`, `hadiths.last_page`, query `book`, `paginate`, `page`) is from the ADR's field list plus memory of the public API; nothing in the repo records it. The client fails with a clear shape error if it differs, and the maximum `paginate` value is unknown (`page_size` 100 is a guess). Verify on the first run with your key.
7. **Backward denominator.** "≥ 95% of that chapter's hadith map back to the section" is read strictly: every hadithapi.com number in the chosen chapter counts, and one that fawazahmed0 has no text for (or that is ambiguous across chapters) counts as not mapped. This can reject a good match for a collection with many no-text gaps. Confirm, or relax to count only numbers present with text in fawazahmed0.
8. **Empty non-zero sections.** The plan says section 0 becomes a book only if hadith fall in it. This brief applies the same rule to every section, so a numbered section whose hadith all lack text creates no book (listed in `empty_section_keys`). Confirm.
9. **No-text definition.** "No text" here means `null`, `''`, or text that is empty after the hadith normaliser (only whitespace and invisible marks). The plan says "no text" without defining blank text.
10. **Failure scope.** "Validation failure writes nothing" (ADR 0042 amendment) is applied per collection: an invalid collection writes nothing and the others still import; the run exits 1. If you want all-or-nothing across the ten, say so (it would need all ten plans in memory at once, which the 9.8 MB `ara-bukhari` file makes expensive).
11. **Count differences against `info.json`** are warnings, not errors (the plan says "reported"). Confirm they should not block.
12. **Resource name fallback.** ADR 0042 §9 puts «مجموعة {n}» in `resources.name` when no Arabic title exists. This brief writes it with ASCII digits (`مجموعة 1`) and the collection's position in `config('hadith.collections')`; it is replaced by a pack version bump when a title is approved.
13. **Scheduler cadence.** Daily 04:30 UTC with no `--download` is a cheap no-op by design (the plan says "no-op unless hashes change"). Because content only changes on a deploy (which also runs the import at start in step 17), the schedule is a safety net. Say if you would rather not schedule it at all.
14. **Proposal location.** ADR 0042 §4a puts the proposal in `storage/app/hadith/proposals/section-titles.json`, outside the ADR 0068 cache root (which is for downloaded sources). This brief keeps the ADR path, and the import reports go to `storage/app/hadith/reports/`.

## Answers to the open questions (orchestrator, 7 Nov 2026)

These override anything above that conflicts with them.

1. `reference_exceptions`: slug => list of hadith numbers (strings). The range assignment wins. Accepted.
2. A duplicate hadith number is a validation error for that collection (it writes nothing). The real-data dry run reports whether any exist; if so, the developer decides.
3. The dry run reports estimated raw and gzip bytes. Then do one local wet run with `--build-packs` against the local dev database and report the measured pack sizes (counts and bytes only).
4. Leave out the `ara-{c}1` diagnostic (D7).
5. Noted: step 17 runs the import from `docker/start-web.sh`, and there is no `--if-unlocked`. Fix the plan text at step 17.
6. Accepted. The matcher is dev-only; a shape error is fine.
7. Accepted, strict.
8. Accepted.
9. Accepted.
10. Accepted: failures are per collection, and the run exits 1 if any failed.
11. Accepted: warnings.
12. Use Arabic-Indic digits (the app's Arabic numerals) in the «مجموعة n» fallback for `resources.name`.
13. **Drop the daily scheduler entry.** Content only changes on deploy. Remove the scheduler code and test, and keep the test that `release.sh` and `start-web.sh` don't mention `hadith:` yet.
14. Accepted.

Chapters (ADR 0076, accepted decisions 7 Nov 2026): the Hadith release waits for chapters, but step 6 still builds only the seam described above.
