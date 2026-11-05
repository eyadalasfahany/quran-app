# API step 01 (plan A2): Taybah timing tables, models, repository

Branch `ft/recitation-timings`. Do not commit, push, switch branches or add dependencies. Plan: `docs/plans/recitation-timings.md` ("API steps"). Rests on ADR 0060 decision 4 and 10, ADR 0061 decision 9. Never write religious text; fixtures use numbers and marked placeholders only.

## Read first

- `.claude/agent-rules.md`, `CLAUDE.md`, `apps/api/CLAUDE.md`, and the `laravel-standards` skill (`.claude/skills/laravel-standards/SKILL.md`).
- `apps/api/.ai/rules/index.md`, then `migrations.md`, `models.md`, `enums.md`, `domains.md` (the globs cover the files you touch).
- Copy the style of: `apps/api/database/migrations/2026_10_27_143840_create_recitation_timings_table.php`, `app/Domains/Content/Models/RecitationTiming.php`, `app/Domains/Content/Models/ChapterAudioFile.php`, `app/Domains/Content/Repositories/Contracts/RecitationTimingRepository.php`, `app/Domains/Content/Repositories/Eloquent/EloquentRecitationTimingRepository.php`, `database/factories/ChapterAudioFileFactory.php`, `app/Domains/Content/ContentServiceProvider.php` (the `$bindings` array).

Environment (this Mac): `export PATH=/opt/homebrew/bin:$PATH` before any `php`, `composer` or `vendor/bin/*` command; run them from `apps/api`. Tests use local MySQL (`quran_testing`).

## Goal

Add the two tables that hold Taybah-made recitation timings, with their models, factories, one enum and one repository, so later steps (import, pack build, handler flag) can use them. The tables have **no foreign key to `chapter_audio_files`**: a QF snapshot deletes and re-inserts that table's rows (`ChapterRecitationsHandler::replaceFromSnapshot` calls `files->deleteForRecitation()`), which would cascade-delete any timing row that points at a file. Nothing in this step reads or changes pack building, the handler, or any command.

## Files to create

1. `apps/api/database/migrations/2026_11_05_100001_create_taybah_timing_sets_table.php`
2. `apps/api/database/migrations/2026_11_05_100002_create_taybah_recitation_timings_table.php`
3. `apps/api/app/Domains/Content/Enums/TaybahTimingSource.php`
4. `apps/api/app/Domains/Content/Models/TaybahTimingSet.php`
5. `apps/api/app/Domains/Content/Models/TaybahRecitationTiming.php`
6. `apps/api/database/factories/TaybahTimingSetFactory.php`
7. `apps/api/database/factories/TaybahRecitationTimingFactory.php`
8. `apps/api/app/Domains/Content/Repositories/Contracts/TaybahTimingRepository.php`
9. `apps/api/app/Domains/Content/Repositories/Eloquent/EloquentTaybahTimingRepository.php`
10. `apps/api/tests/Feature/Content/TaybahTimingTablesTest.php`

## Files to change

- `apps/api/app/Domains/Content/ContentServiceProvider.php`: add `TaybahTimingRepository::class => EloquentTaybahTimingRepository::class` to `$bindings` (and the two `use` lines).
- `apps/api/app/Domains/Content/Models/Recitation.php`: add `HasMany<TaybahTimingSet, $this> taybahTimingSets()` (relation only).

## Exact schema

Both tables: `$table->charset('utf8mb4'); $table->collation('utf8mb4_0900_ai_ci'); $table->innoDb();` as in the existing migration. `declare(strict_types=1)`. Foreign keys are declared explicitly (`unsignedBigInteger` column, then `->foreign()->references('id')->on('recitations')->cascadeOnDelete()`), per `.ai/rules/migrations.md`.

### `taybah_timing_sets` (one provenance row per recitation and surah file)

| # | Column | Type | Null | Notes |
| --- | --- | --- | --- | --- |
| 1 | `id` | `unsignedBigInteger` auto-increment primary key (`$table->id()`) | no | |
| 2 | `recitation_id` | `unsignedBigInteger` | no | FK `recitations.id`, cascade on delete |
| 3 | `chapter_id` | `unsignedTinyInteger` | no | 1 to 114, same type as `chapter_audio_files.chapter_id` |
| 4 | `audio_url` | `string(500)` | no | verbatim URL the timings were made for |
| 5 | `size_bytes` | `unsignedBigInteger` | no | |
| 6 | `sha256` | `char(64)` | no | of the audio file |
| 7 | `measured_duration_ms` | `unsignedInteger` | no | decoded duration, never QF's `duration_ms` |
| 8 | `source` | `string(32)` | no | enum `TaybahTimingSource` |
| 9 | `tool_version` | `string(32)` | yes | |
| 10 | `models` | `json` | yes | model ids and revisions |
| 11 | `original_first_start_ms` | `unsignedInteger` | yes | MP3Quran's own ayah-1 start, when the source published one |
| 12 | `digest` | `char(64)` | no | the importer's idempotency digest (step 02b) |
| 13 | `imported_at` | `dateTime('imported_at', 6)` | no | UTC |

Unique index `taybah_timing_sets_recitation_id_chapter_id_unique` on (`recitation_id`, `chapter_id`) (let Laravel name it). No other index.

### `taybah_recitation_timings` (one row per ayah)

| # | Column | Type | Null |
| --- | --- | --- | --- |
| 1 | `recitation_id` | `unsignedBigInteger` | no (FK `recitations.id`, cascade on delete) |
| 2 | `chapter_id` | `unsignedTinyInteger` | no |
| 3 | `verse_id` | `unsignedSmallInteger` | no |
| 4 | `start_ms` | `unsignedInteger` | no |
| 5 | `end_ms` | `unsignedInteger` | no |
| 6 | `segments` | `json` | yes (`[[word_position, start_ms, end_ms], ...]` over QF word positions) |

Primary key (`recitation_id`, `chapter_id`, `verse_id`). After `Schema::create`, add the check constraint exactly as the existing migration does: `DB::statement('alter table `taybah_recitation_timings` add constraint `taybah_recitation_timings_start_before_end` check (`start_ms` < `end_ms`)');`. `down()` of each migration: `Schema::dropIfExists(...)`; the timings migration is numbered second so a rollback drops it first.

## Enum

`App\Domains\Content\Enums\TaybahTimingSource` (string-backed, TitleCase cases, same file style as `PermissionStatus`):

- `Aligner = 'aligner'` (made by `tools/recitation-align`)
- `Mp3QuranPublished = 'mp3quran_published'` (MP3Quran's own published ayah timings, normalised)

## Models

Follow `RecitationTiming` / `ChapterAudioFile` (`final`, `#[Fillable([...])]` attribute, `public $timestamps = false;`).

- `TaybahTimingSet`: fillable = all columns except `id`. Casts: `source` => `TaybahTimingSource::class`, `models` => `array`, `imported_at` => `immutable_datetime`. `@property` PHPDoc for typed access (`CarbonImmutable $imported_at`, `TaybahTimingSource $source`, ints). `#[UseFactory(TaybahTimingSetFactory::class)]` + `HasFactory`. Relation `recitation(): BelongsTo<Recitation, $this>`.
- `TaybahRecitationTiming`: `public $incrementing = false;`, fillable = all six columns, cast `segments` => `array`, `HasFactory` with `TaybahRecitationTimingFactory`. Relation `recitation()`.

## Factories (placeholder data only)

- `TaybahTimingSetFactory`: `recitation_id` => `Recitation::factory()`, `chapter_id` => 1, `audio_url` => `https://audio.example.test/fixture/001.mp3`, `size_bytes` 1024, `sha256` => `str_repeat('a', 64)`, `measured_duration_ms` 60000, `source` => `TaybahTimingSource::Aligner`, `tool_version` '0.0.0-fixture', `models` => null, `original_first_start_ms` => null, `digest` => `str_repeat('b', 64)`, `imported_at` => `now()`.
- `TaybahRecitationTimingFactory`: `recitation_id` => `Recitation::factory()`, `chapter_id` 1, `verse_id` 1, `start_ms` 0, `end_ms` 1000, `segments` => `[[1, 0, 1000]]`.

## Repository

Contract `TaybahTimingRepository` (interface, in `Repositories/Contracts`); implementation `final class EloquentTaybahTimingRepository extends EloquentRepository implements TaybahTimingRepository` (`model()` returns `TaybahTimingSet::class`; rows go through `TaybahRecitationTiming::query()`). Persistence only: no transactions, no business rules. Exact signatures:

```php
public function findSet(int $recitationId, int $chapterId): ?TaybahTimingSet;

/**
 * @param  array{recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int, sha256: string, measured_duration_ms: int, source: TaybahTimingSource, tool_version: string|null, models: array<string, mixed>|null, original_first_start_ms: int|null, digest: string, imported_at: CarbonImmutable}  $attributes
 */
public function upsertSet(array $attributes): TaybahTimingSet;   // updateOrCreate on (recitation_id, chapter_id)

public function deleteRows(int $recitationId, int $chapterId): void;

/**
 * @param  list<array{recitation_id: int, chapter_id: int, verse_id: int, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}>  $rows
 */
public function insertRows(array $rows): void;                  // chunks of 500; segments encoded with json_encode(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), as EloquentRecitationTimingRepository::encode() does

/** True when a set exists for the recitation and chapter and its audio_url equals $audioUrl. */
public function hasServedSet(int $recitationId, int $chapterId, string $audioUrl): bool;

/** True when any set of the recitation matches a current chapter_audio_files row (same recitation, chapter and audio_url) and has at least one Taybah timing row of that chapter with segments not null. */
public function anyServedSegments(int $recitationId): bool;

/**
 * Sets whose recitation has no chapter_audio_files row with the same chapter and audio_url (the file's URL changed or the file is gone).
 *
 * @return Collection<int, TaybahTimingSet>   // Illuminate\Database\Eloquent\Collection
 */
public function staleSets(): Collection;
```

`hasServedSet`, `anyServedSegments` and `staleSets` join to `chapter_audio_files` on `recitation_id`, `chapter_id` and `audio_url`. Use query-builder joins or `whereExists`; do not use `Illuminate\Support\Facades\DB` (the architecture test forbids it in repositories). The equality on `audio_url` is MySQL's normal column comparison (both columns are `utf8mb4_0900_ai_ci`); the importer in step 02b compares URLs with strict `===` before writing, so this is a documented, accepted residual (a URL that differs from the file's only by letter case is treated as the same).

## Behaviour rules

- A QF snapshot (`files->deleteForRecitation`), a QF file or timing mutation, and a `chapter_audio_files` delete never remove a row in either new table (no FK to the file). Only deleting the `recitations` row cascades.
- `segments` is stored exactly as given; `null` stays SQL NULL (not the JSON text `null`).
- Nothing here changes the pack, the manifest, any endpoint, `PackSchema`, or device SQL.

## Tests to write (`tests/Feature/Content/TaybahTimingTablesTest.php`, Pest, `uses(RefreshDatabase::class)`)

Names (use these `it(...)` strings, or close paraphrases that keep the meaning):

1. `it('creates both Taybah tables with the columns in order')` using `Schema::getColumnListing` for both tables, and `Schema::hasTable`.
2. `it('rejects a timing row whose start is not before its end')` expects `Illuminate\Database\QueryException`.
3. `it('keeps one set per recitation and chapter')` (second insert with the same pair throws `UniqueConstraintViolationException`).
4. `it('deletes sets and rows when the recitation is deleted')`.
5. `it('does not delete Taybah rows when the recitation files are replaced')`: create a recitation with a `ChapterAudioFile`, a set and two rows; call `app(ChapterAudioFileRepository::class)->deleteForRecitation($id)` then `->insert([...])` with the same file; assert the set and both rows still exist.
6. `it('rolls the migrations down and up again')`: copy the pattern in `tests/Feature/Content/AzkarMigrationTest.php` (`require` the migration file, call `down()`, assert, and restore the schema with `$this->artisan('migrate')->assertSuccessful()` so later tests see the full schema; MySQL DDL commits implicitly, so do not rely on the `RefreshDatabase` transaction here). Drop the timings table first, then the sets table, and assert `Schema::hasTable` both ways. If this proves flaky under `pest --parallel`, delete the test and keep tests 1 and 2.
7. `it('reports a set as served only while the file url matches')`: `hasServedSet` true for the matching URL, false after the file's `audio_url` changes.
8. `it('reports served segments only for a matching file and a non-null segments row')` for `anyServedSegments` (true; false when URL differs; false when all rows have null segments).
9. `it('lists stale sets')`: `staleSets` returns the set whose URL no longer matches and the set whose file row is gone, and not a current one.
10. `it('stores segments as json and null as sql null')`: via `insertRows`, read back with `TaybahRecitationTiming::query()->toBase()`.
11. factories produce valid rows (`TaybahTimingSet::factory()->create()` and the timing factory).

## Gates

```bash
cd /Applications/MAMP/htdocs/quran-app/apps/api
export PATH=/opt/homebrew/bin:$PATH
vendor/bin/pint --format agent          # fixes style; then:
composer qa                              # pint --test, phpstan (Larastan level 8), pest --parallel
```

Contract gate (this step changes no endpoint): before you start, copy `packages/api-contract/openapi.json` and `packages/api-contract/src/schema.d.ts` to a scratch folder you create with `mktemp -d`. After the work, run `npm run generate -w @quran/api-contract` from the repo root (Node 26 through nvm: `source ~/.nvm/nvm.sh && nvm use`), then `diff` both files against the copies. The diff must be empty. The working tree is dirty with other work, so never diff against `git HEAD`.

## Out of scope

The importer, the converter, the pack query, the handler, commands, config keys, `start-web.sh`, mobile code, ADR or spec edits.

## Open questions

None. (The case-insensitive URL equality residual above is a documented default.)
