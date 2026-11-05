# API step 02b (plan A3): `recitation-timings:import` and `recitation-timings:verify`

Branch `ft/recitation-timings`. Do not commit, push, switch branches or add dependencies. Plan: `docs/plans/recitation-timings.md` ("API steps"). Rests on ADR 0060 decisions 2, 3, 5, 6, 7, 8, 10, ADR 0044 (packs build at web start), ADR 0052. Depends on step 01 (tables, `TaybahTimingRepository`, models, factories) and on step 02a only for the file format (this step never runs Python). **Never write Quran text**; test fixtures use numbers and placeholder ids.

## Read first

- `.claude/agent-rules.md`, `CLAUDE.md`, `apps/api/CLAUDE.md`, the `laravel-standards` skill, `apps/api/.ai/rules/*.md` for the paths you touch.
- Models to copy for style: `app/Domains/Names/Services/NamesImporter.php` (fingerprint, bump in one transaction, `import_fingerprint` assigned as an attribute), `app/Domains/Azkar/Console/ImportAzkarCommand.php` (`--defer-pack`), `database/migrations/2026_11_03_082931_drop_untrusted_recitation_timings.php` (version, floor, `content_changes` delete, `ResourceContentChanged`), `app/Domains/Content/Console/EnsureContentPacksCommand.php`, `app/Support/QuranText/TanzilReader.php`.
- Existing code you will call (all verified): `ResourceRepository::{sourceId, findBySource, save}`, `RecitationRepository::{findForResource, setHasWordSegments}`, `ChapterAudioFileRepository::{find, idsFor}`, `RecitationTimingRepository::anyHaveSegments`, `ContentServiceProvider::$bindings`, `Events\ResourceContentChanged(int $resourceId, int $version)`, `Listeners\QueuePackBuild`.

Environment (this Mac): `export PATH=/opt/homebrew/bin:$PATH`; run PHP tools from `apps/api`.

## Goal

An idempotent web-start import of the committed timing files (format version 1, below) into `taybah_timing_sets` and `taybah_recitation_timings`, with every file checked against the **current** audio file and against QF word counts, and with the resource version bumped (so installed devices replace the pack) only when something changed. Plus a verify command. Nothing here builds packs or touches the QF handler (steps 03 and 05).

## Committed file format (version 1, written by step 02a; the API only reads it)

Location: `{config('quran.recitation_timings.path')}/{kind}/{recitation_key}/{NNN}.json` (`NNN` = chapter, zero-padded to 3). One minified JSON object:

```json
{"format":1,"kind":"mp3quran","recitation_key":"253","chapter_id":59,
 "audio":{"url":"https://audio.taybah-app.com/audio/mp3quran/253/059-f0b5d093352295a0.mp3","bytes":8680138,"sha256":"f0b5d093352295a06b1e1f756e4ec815939bc07aed4753a07f82ec15351e6176","measured_duration_ms":541936},
 "source":"aligner","tool_version":"0.1.0",
 "models":{"align":{"id":"...","revision":"..."},"asr":null},
 "original_first_start_ms":null,
 "ayahs":[{"verse_key":"59:1","verse_id":5127,"start_ms":0,"end_ms":14655,"segments":[[1,6427,6967],[2,7107,7728]]}]}
```

(`segments` is `[[qf_word_position, start_ms, end_ms], ...]` or `null`; the real file lists every ayah and word.)

## Files to create

- `app/Support/QuranText/ChapterVerseCounts.php`
- `app/Domains/Content/Enums/TaybahTimingKind.php`
- `app/Domains/Content/Timings/TaybahTimingFile.php`, `TaybahTimingAyah.php` (final readonly value objects), `TaybahTimingFileReader.php`, `TaybahTimingFileException.php`, `TaybahImportReport.php` (final readonly)
- `app/Domains/Content/Services/TaybahTimingImporter.php`
- `app/Domains/Content/Services/RecitationSegmentsFlagService.php`
- `app/Domains/Content/Services/ResourceVersionService.php`
- `app/Domains/Content/Console/ImportRecitationTimingsCommand.php`, `VerifyRecitationTimingsCommand.php`
- Tests: `tests/Unit/Content/ChapterVerseCountsTest.php`, `tests/Feature/Content/TaybahTimingImportTest.php`, `tests/Feature/Content/RecitationSegmentsFlagServiceTest.php`, `tests/Feature/Content/RecitationTimingsVerifyCommandTest.php`

## Files to change

- `config/quran.php`: add the block below.
- `app/Domains/Content/ContentServiceProvider.php`: register the two commands in `boot()`'s `$this->commands([...])`.
- `app/Domains/Content/Repositories/Contracts/WordLayoutRepository.php` + `Eloquent/EloquentWordLayoutRepository.php`: add `wordCountsForVerses`.
- `app/Domains/Content/Repositories/Contracts/ChapterAudioFileRepository.php` + `Eloquent/EloquentChapterAudioFileRepository.php`: add `findForRecitationChapter`.
- `app/Domains/Content/Repositories/Contracts/ContentChangeRepository.php` + `Eloquent/EloquentContentChangeRepository.php`: add `deleteForResource`.

### Config (`config/quran.php`, new key, with a comment citing ADR 0060)

```php
'recitation_timings' => [
    // Committed timing files: {path}/{kind}/{recitation_key}/{NNN}.json (ADR 0060 decision 2).
    'path' => base_path('resources/recitation-timings'),
    // word_layouts.mushaf_id whose 'word' rows give the QF word count of each verse (the only mushaf QF syncs, mushafs:1).
    'word_count_mushaf_id' => 1,
    // QF chapter reciter ids that never get Taybah timings (ADR 0060 decision 10: 168 keeps no highlight). Scoped to kind qf.
    'excluded_qf_recitations' => [168],
],
```

## Exact names

### `ChapterVerseCounts` (`App\Support\QuranText`, `final`, static methods)

There is no `verses` or `chapters` table in the API database and `packages/` is not in the Docker image, so the importer cannot read Tanzil at web start. Use a constant:

```php
public const array COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
public static function forChapter(int $chapter): int;                 // 1..114, else InvalidArgumentException
public static function firstVerseId(int $chapter): int;               // 1 + sum of earlier counts
public static function verseId(int $chapter, int $ayah): int;         // ayah 1..forChapter(), else InvalidArgumentException
public static function total(): int;                                  // 6236
```

Index 0 is chapter 1. These are verse counts (numbers), not text.

### `TaybahTimingKind` (`App\Domains\Content\Enums`, string-backed): `Qf = 'qf'`, `Mp3Quran = 'mp3quran'`. The value is the `content_sources.code` that owns the recitation's resource.

### Repository additions (exact signatures)

```php
// WordLayoutRepository
/** @return array<int, int> verse_id => number of rows with char_type 'word', for verse ids in [$firstVerseId, $lastVerseId]; verses with none are absent. */
public function wordCountsForVerses(int $mushafId, int $firstVerseId, int $lastVerseId): array;
// ChapterAudioFileRepository
public function findForRecitationChapter(int $recitationId, int $chapterId): ?ChapterAudioFile;
// ContentChangeRepository
public function deleteForResource(int $resourceId): void;
```

### Services

```php
final class ResourceVersionService
{
    public function __construct(private readonly ResourceRepository $resources, private readonly ContentChangeRepository $changes) {}

    /** Version +1 and changes_floor_version = new version (installed devices replace the whole pack), the resource's content_changes deleted, resource saved. Call inside the caller's transaction. @return int<0, max> the new version */
    public function bumpWithFloor(Resource $resource): int;
}

final class RecitationSegmentsFlagService
{
    public function __construct(RecitationRepository $recitations, ChapterAudioFileRepository $files, RecitationTimingRepository $timings, TaybahTimingRepository $taybah) {}

    /** has_word_segments = QF rows with segments for the recitation's files OR TaybahTimingRepository::anyServedSegments(). The one place this rule lives (ADR 0060 decision 6). */
    public function refresh(int $recitationId): void;
}

final class TaybahTimingImporter
{
    public function import(bool $deferPack = false, bool $dryRun = false, ?TaybahTimingKind $kind = null, ?string $recitationKey = null): TaybahImportReport;
}
```

`TaybahImportReport` (readonly): `int $filesSeen`, `int $imported`, `int $unchanged`, `int $versionBumps`, `int $segmentsNulled` (verses), `list<array{path: string, reason: string}> $skipped`. Method `hasProblems(): bool` is `$skipped !== []`.

### Commands

- `recitation-timings:import {--defer-pack : write rows and bump versions but queue no pack build (start-web.sh builds it, ADR 0044)} {--dry-run : validate and report, write nothing} {--kind= : qf or mp3quran} {--key= : one recitation key}`. Prints a table (files seen, imported, unchanged, version bumps, verses with segments nulled) and one line per skipped file (`path: reason`; relative path, no Arabic). Exit `FAILURE` when `hasProblems()`, else `SUCCESS` (an empty or missing folder is `SUCCESS` with the line `No timing files found.`). Invalid `--kind` is a failure with a message.
- `recitation-timings:verify`: prints each stale set (`TaybahTimingRepository::staleSets()`: recitation id, chapter, URL) and, per recitation, the number of sets. Exit `FAILURE` when any set is stale, else `SUCCESS`. Read-only.

## Behaviour rules (exact)

**Resolving a file.** Group files by (`kind`, `recitation_key`). `kind` maps to a source (`ResourceRepository::sourceId($kind->value)`), then `findBySource($sourceId, ResourceGroup::ChapterRecitations, $key)`, then `RecitationRepository::findForResource`. A group with no source, resource or recitation: skip every file of it (`no such recitation`). **The lookup is always source-scoped**: a QF reciter `5` and an MP3Quran moshaf `5` are different resources. For kind `qf`, a key listed in `config('quran.recitation_timings.excluded_qf_recitations')` skips its files (`excluded recitation`); the list never applies to another kind.

**Reading a file (`TaybahTimingFileReader::read`).** Refuse (`TaybahTimingFileException` with a short reason, which the importer turns into a skip) when: not valid JSON; `format` is not 1; a required key is missing or has the wrong type; `kind`, `recitation_key` or `chapter_id` inside the file differs from the folder names and file name (`NNN` parsed as the chapter); `source` is not a `TaybahTimingSource` value; `chapter_id` outside 1 to 114. Keep `fileSha256 = hash('sha256', $bytes)`.

**Checks per file** (each failure skips only that file; nothing is stored for it, **no digest is stored, so the next start retries**):

1. The recitation has a `chapter_audio_files` row for the chapter (`findForRecitationChapter`), else `no audio file`.
2. `file.audio_url === audio.url` (strict string equality), else `audio url differs`. For kind `mp3quran` also `file.size_bytes === audio.bytes`.
3. `ayahs` has exactly `ChapterVerseCounts::forChapter($chapter)` rows, in order, `verse_key === "{chapter}:{n}"` and `verse_id === ChapterVerseCounts::verseId($chapter, $n)`, else `ayah rows do not match the surah`.
4. Every row: ints, `start_ms >= 0`, `start_ms < end_ms`; row 1 `start_ms === 0`; each row's `start_ms` equals the previous row's `end_ms` (contiguous, so no overlap or gap), else `bad ayah range`.
5. The last row's `end_ms` against `audio.measured_duration_ms` (the same limits the device applies in `apps/mobile/src/features/audio/data/timings.ts`): `end_ms <= measured + 2000` and `measured - end_ms <= max(15000, 0.05 * measured)`, else `timings do not fit the audio`.
6. `word_layouts` exist: call `wordCountsForVerses(config word_count_mushaf_id, firstVerseId, lastVerseId)`; if the result lacks **any** verse of the surah, skip the file (`word layouts missing`). **Do not null the segments in that case**: with digest idempotency, nulls would stick for good.
7. Segment check per verse. `N` = that verse's word count. `segments` null in the file stays null. Otherwise it must be a list of `[position, start_ms, end_ms]` of ints with `position >= 1` and `0 <= start_ms < end_ms`, and the **set of distinct positions must equal `{1..N}`** (repeats of a position are allowed). A verse that fails becomes `segments = null` (ayah timing is kept), and its verse id goes into `$nulled` (sorted ascending). Log one `Log::warning` per file listing the verse keys (a mismatch is expected for about 21 verses of the Quran).

**Digest and idempotency.** `digest = hash('sha256', $fileSha256.':'.implode(',', $nulled))`. A file is unchanged when a set exists for (recitation, chapter) with the same `digest` and the same `audio_url`; it is then not written. (Including `$nulled` means a later QF word-layout change reimports it.)

**Writing.** Per recitation, collect the changed files, then one `DB::transaction`: for each changed file `upsertSet(...)` (`imported_at = CarbonImmutable::now('UTC')`, `size_bytes = audio.bytes`, `measured_duration_ms`, `source`, `tool_version`, `models`, `original_first_start_ms`, `digest`), `deleteRows`, `insertRows` (one row per ayah with `recitation_id`, `chapter_id`, `verse_id`, `start_ms`, `end_ms`, `segments`); then `RecitationSegmentsFlagService::refresh($recitation->id)`; then **one** `ResourceVersionService::bumpWithFloor($resource)` for the whole recitation, however many files changed. After the commit, dispatch `ResourceContentChanged($resource->id, $version)` once, unless `$deferPack` or the resource is not `is_active`. With `--dry-run` nothing is written and no event is dispatched; the report still counts what would be imported.

**Never deletes.** A committed file that disappears from the folder does not delete its stored set or rows; an empty or missing folder deletes nothing. Stale sets are reported by `recitation-timings:verify` and are simply not served (step 05).

**No QF dependence.** Reads no `recitation_timings` rows and calls no QF client. Reads no storage credentials (no R2, no S3).

## Tests

`ChapterVerseCountsTest` (Unit): `it('has 114 chapters summing to 6236')`; `it('numbers verses globally')` (verse id of 1:1 is 1, of 2:1 is 8, of the last verse of chapter 114 is 6236); `it('rejects an out of range chapter or ayah')`; `it('matches the Tanzil file')`: parse `packages/quran-text-check/data/tanzil-quran-simple-1.1.txt` (via `TanzilReader::simplePath()`), count lines per surah number (split on `|`, never print text), compare with `COUNTS`; skip when the file is absent.

`TaybahTimingImportTest` (Feature, `RefreshDatabase`, config `quran.recitation_timings.path` pointed at a per-test folder under `storage_path('framework/testing/'.uniqid())`, deleted in `afterEach`). Helpers: `makeRecitation(string $sourceCode, string $key)` (create the `ContentSource` with that code if missing, a `Resource` with `group = ChapterRecitations`, `source_key = $key`, `version = 3`, `changes_floor_version = 1`, and a `Recitation`), a word-layout seeder (`Mushaf::factory()->create(['id' => 1])`, then `WordLayout::factory()` rows with `char_type = 'word'`, N per verse), a file writer that builds a valid committed file for a small real chapter (use chapter 108, which has 3 verses, or 112) with placeholder timings. Tests (names as written, or close):

- `it('imports a file, bumps the resource once, and dispatches one ResourceContentChanged')` (`Event::fake`)
- `it('is idempotent: a second run imports nothing and bumps nothing')` (version and floor unchanged, zero events, `imported_at` unchanged)
- `it('reimports and bumps once when the file content changes')`
- `it('bumps once per recitation even when several chapters change')`
- `it('with --defer-pack writes rows and bumps but dispatches no event')`
- `it('with --dry-run writes nothing')`
- `it('nulls the segments of a verse whose positions do not match the QF word count and keeps its ayah timing')` (word layout has 4 words, file has positions 1..3; the neighbouring verses keep their segments; the set digest changes when the layout changes, so a rerun after adding the missing word imports again and restores segments)
- `it('keeps segments with repeated positions when the distinct positions are 1..N')`
- `it('skips the file and stores no digest when word layouts are missing, then imports on the next run after they appear')`
- `it('skips a file whose audio url differs from the current file')`, `it('skips an mp3quran file whose size differs')`, `it('skips a file with a missing ayah row')`, `it('skips non-contiguous or overlapping rows')`, `it('skips a start that is not before its end')`, `it('skips a last ayah that ends more than 2 s past the measured duration or leaves a long tail')`
- `it('skips a file whose folder or name disagrees with its content')`
- `it('skips an unknown recitation and an unknown source')`
- `it('never imports QF reciter 168, but imports an mp3quran moshaf with id 168')` (config default `[168]`)
- `it('keeps a QF reciter 5 and an mp3quran moshaf 5 separate')` (each file lands on its own recitation)
- `it('does not delete stored sets when the folder is empty or missing')`
- `it('sets has_word_segments from the Taybah rows, and false when every verse was nulled')`
- `it('exits non-zero and names the file when anything was skipped')` (artisan command; assert output contains the relative path and a reason, no Arabic)
- `it('reads no storage credential and calls no http')` (`Http::preventStrayRequests()` around the run; plus `expect(file_get_contents(app_path('Domains/Content/Services/TaybahTimingImporter.php')))->not->toContain('R2_')` and not `s3`).

`RecitationSegmentsFlagServiceTest`: flag true from QF rows only; true from a served Taybah set only; false when the Taybah set's URL no longer matches the file; false when neither.

`RecitationTimingsVerifyCommandTest`: lists a stale set and exits non-zero; exits zero when none.

Architecture: `tests/Unit/ArchitectureTest.php` must stay green (no `DB` facade in repositories; services never use HTTP). Add one `arch()` expectation there only if you need it: `arch('the Taybah importer reads no storage SDK')->expect('App\Domains\Content')->not->toUse(['Aws', 'League\Flysystem\AwsS3V3'])`.

## Gates

```bash
cd /Applications/MAMP/htdocs/quran-app/apps/api
export PATH=/opt/homebrew/bin:$PATH
vendor/bin/pint --format agent
composer qa
```

Contract gate: copy `packages/api-contract/openapi.json` and `src/schema.d.ts` to a scratch folder you create with `mktemp -d` first; after the work run `npm run generate -w @quran/api-contract` from the repo root (nvm Node 26) and `diff` against the copies; it must be empty (the tree is dirty, never diff against `HEAD`).

## Out of scope

The converter (step 02a), the QF handler (step 03), MP3Quran import (step 04), pack query, `start-web.sh`, spec or ADR edits (step 05), any committed timing file, mobile code.

## Open questions

- **`word_layouts` empty.** Default: skip with `word layouts missing` (a fresh database that has never run the QF sync imports no Taybah timings and the command exits non-zero with a warning at web start). The alternative, importing ayah-level rows with all segments null, is rejected because digest idempotency would keep the nulls.
- **Partial reciters.** The importer does not enforce "ship only when complete" (ADR 0060 decisions of 4 Nov); the developer controls that by what is committed.
