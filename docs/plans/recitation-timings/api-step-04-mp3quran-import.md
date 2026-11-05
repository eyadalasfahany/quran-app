# API step 04 (plan B5): MP3Quran source row and `mp3quran:import`

Branch `ft/recitation-timings`. Do not commit, push, switch branches or add dependencies. Plan: `docs/plans/recitation-timings.md` ("API steps"). Rests on ADR 0061 (decisions 4, 5, 7, 8, 9, 10, 11, 13), ADR 0021 (a recitation is a `resources` row plus a `recitations` row), ADR 0044 (packs build at web start), ADR 0062 (the app derives a missing surah from the pack; the API sends nothing extra). Depends on steps 01 and 02b (`TaybahTimingRepository`, `RecitationSegmentsFlagService`, `ResourceVersionService`, `ContentChangeRepository::deleteForResource`). **Never write Quran text, hadith or any religious content**; fixtures use numbers and placeholder names («قارئ تجريبي ١», `Fixture Reciter 1`).

## Read first

`.claude/agent-rules.md`, `CLAUDE.md`, `apps/api/CLAUDE.md`, the `laravel-standards` skill, `apps/api/.ai/rules/*.md` for the paths you touch, ADR 0061 (`docs/adr/0061-mp3quran-reciters-hosted-on-r2.md`), and as models: `app/Domains/Names/Services/NamesImporter.php` (fingerprint in `resources.import_fingerprint`, bump in one transaction), `app/Domains/Azkar/Audio/AzkarAudioManifest.php` (a committed manifest read and validated before any use), `database/migrations/2026_11_01_100013_insert_hadeethenc_content_source.php` (a content source inserted by migration), `tests/Support/AzkarAudioTestManifest.php` (a test-only manifest helper with `ParallelTesting::token()` folders), `app/Domains/Content/Services/ContentDeliveryService.php` (`isDefault`).

Input that exists now: `apps/api/resources/mp3quran/manifest.json`, `schema` 1, `source` `mp3quran`, `public_base` `https://audio.taybah-app.com`, `moshafs[]` with one moshaf today: `moshaf_id` 253, `reciter_id`, `name_ar`, `name_en`, `riwayah`, `moshaf_name`, `server`, `surah_list` (list of ints), `files[]` (109) of `{surah, key, url, bytes, sha256, duration_ms, source_url, source_etag}` where `key` is `audio/mp3quran/{moshaf}/{NNN}-{sha256[:16]}.mp3` and `url` is `public_base + '/' + key`. Do not edit it.

Environment (this Mac): `export PATH=/opt/homebrew/bin:$PATH`; run PHP tools from `apps/api`; local MySQL.

## Goal

Import the committed MP3Quran manifest into the content tables at web start: one `content_sources` row, and per moshaf one `resources` row (group `chapter_recitations`), one `recitations` row and one `chapter_audio_files` row per surah file (R2 URLs from the manifest, ids in the reserved range). It is idempotent and converges from the hand-inserted local pilot. It reads no storage credential and makes no network call: the API only reads the committed manifest (ADR 0061 decision 7). Pack building and `start-web.sh` are step 05.

## Files to create

- `database/migrations/2026_11_05_100003_insert_mp3quran_content_source.php`
- `app/Domains/Content/Mp3Quran/Mp3QuranManifest.php` (reader and validator), `Mp3QuranManifestData.php`, `Mp3QuranMoshaf.php`, `Mp3QuranFile.php` (final readonly value objects), `Mp3QuranManifestException.php`, `Mp3QuranFileId.php`
- `app/Domains/Content/Services/Mp3QuranImporter.php`, `Mp3QuranImportReport.php` (final readonly, in `Mp3Quran/`)
- `app/Domains/Content/Console/ImportMp3QuranCommand.php`
- `tests/Support/Mp3QuranTestManifest.php`
- `tests/Unit/Content/Mp3QuranFileIdTest.php`, `tests/Feature/Content/Mp3QuranImportTest.php`, `tests/Feature/Content/Mp3QuranSourceMigrationTest.php`

## Files to change

- `config/quran.php`: new keys (below).
- `app/Domains/Content/ContentServiceProvider.php`: register `ImportMp3QuranCommand` in `boot()`.
- `app/Domains/Content/Repositories/Contracts/RecitationTimingRepository.php` + `Eloquent/EloquentRecitationTimingRepository.php`: add `public function deleteForFiles(array $audioFileIds): int;` (`@param list<int>`, returns the number deleted; empty list returns 0).
- `app/Domains/Content/Repositories/Contracts/ChapterAudioFileRepository.php` + `Eloquent/EloquentChapterAudioFileRepository.php`: add `public function deleteForRecitationExcept(int $recitationId, array $keepIds): int;` (`@param list<int>`).
- `app/Domains/Content/Models/Resource.php`: add `@property string|null $import_fingerprint` and `@property string|null $unavailable_reason` to the PHPDoc (the columns exist; Names/Azkar assign `import_fingerprint` as an attribute, do the same, no `#[Fillable]` change).
- `app/Domains/Content/Services/ContentDeliveryService.php`: **fix `isDefault()`** (below).
- `tests/Feature/Content/ContentDeliveryTest.php`: the helper `packedRecitation()` must create its resource on the `qf` source (below) and one new test.
- `tests/Feature/Content/ContentHandlersTest.php`: one new test (below).

## Config (`config/quran.php`, new keys with a comment citing ADR 0061)

The Arabic strings below (`riwayah` and style labels) must match the manifest bytes exactly: copy them from `resources/mp3quran/manifest.json` with a script (`python3 -c` reading the JSON, printing `riwayah` and the text after the last ` - ` of `moshaf_name`) instead of retyping them, and compare the result with the line you wrote. A one-character mismatch would skip every moshaf.

```php
// ADR 0061 decision 8: the committed manifest the import reads. Production never calls MP3Quran's API.
'mp3quran_manifest_path' => base_path('resources/mp3quran/manifest.json'),
// ADR 0061 decision 11: MP3Quran moshaf id => QF chapter reciter source_key (developer-owned; empty until the developer fills it). A listed moshaf is imported but hidden (resource inactive), because QF's copy stays in the list.
'mp3quran_duplicates' => [],
// ADR 0061 decision 10: riwayat shipped in v1 (the manifest's `riwayah` text). Anything else is skipped.
'mp3quran_riwayat' => ['حفص عن عاصم'],
// recitations.style from the text after the last " - " in the manifest's `moshaf_name`. Unknown or missing: null.
'mp3quran_styles' => ['مرتل' => 'Murattal', 'مجود' => 'Mujawwad', 'معلم' => 'Muallim'],
```

## Migration `insert_mp3quran_content_source`

`up()`: `DB::table('content_sources')->updateOrInsert(['code' => 'mp3quran'], [...])` (so the local pilot row converges) with `name` `MP3Quran`, `licence_url` `https://www.mp3quran.net` (column is NOT NULL, 500), `attribution_ar` `MP3Quran (mp3quran.net)`, `attribution_en` `MP3Quran (mp3quran.net)` (both columns are NOT NULL; the wording is provisional, see open questions), `permission_status` `granted`, `notes` `Written permission is held by the developer; its wording is not quoted here (ADR 0061 decision 1).`, `created_at`/`updated_at` now (insert only sets `created_at`; use `now()` for `updated_at` always). `down()`: no-op with a comment (rows may be referenced).

## Names

```php
final class Mp3QuranFileId { public const int BASE = 1_000_000_000; public static function for(int $moshafId, int $surah): int; }   // BASE + moshafId * 1000 + surah; surah 1..114 else InvalidArgumentException; moshafId >= 1
final class Mp3QuranManifest { public function load(string $path): Mp3QuranManifestData; }          // throws Mp3QuranManifestException
final readonly class Mp3QuranManifestData { public function __construct(public string $publicBase, public array /* list<Mp3QuranMoshaf> */ $moshafs, public array /* list<array{moshaf_id: int|null, reason: string}> */ $invalid) {} }
final readonly class Mp3QuranMoshaf { /* moshafId int, nameAr, nameEn, riwayah, moshafName strings, surahList list<int>, files list<Mp3QuranFile> */ }
final readonly class Mp3QuranFile { /* surah int, key, url, sha256 strings, bytes int, durationMs int */ }
final class Mp3QuranImporter { public function import(bool $deferPack = false, bool $dryRun = false): Mp3QuranImportReport; }
```

`Mp3QuranImportReport`: `int $created`, `int $updated`, `int $unchanged`, `int $hidden`, `int $deactivated`, `int $files`, `int $surahsWithoutFile` (listed in `surah_list` but absent from `files`), `list<array{moshaf_id: int|null, reason: string}> $skipped`; `hasProblems()` is `$skipped !== []`.

Command: `mp3quran:import {--defer-pack : write rows and bump versions but queue no pack build (start-web.sh builds it, ADR 0044)} {--dry-run : validate and report, write nothing}`. Prints a table of the report and one line per skipped moshaf. Exit `FAILURE` on a refused manifest or `hasProblems()`, else `SUCCESS`.

## Manifest validation (`Mp3QuranManifest::load`)

Refuse the whole run (throw; nothing written; the command prints the message and fails) when: the file is missing or not valid JSON; `schema !== 1`; `source !== 'mp3quran'`; `public_base` is not an `https://` URL without a trailing slash; `moshafs` is not a non-empty list. (An empty list is refused on purpose, so a damaged manifest can never deactivate every recitation.)

Per moshaf, a problem puts it in `invalid` (it is skipped, never half-imported, **and its existing rows and resource are left exactly as they are**) when: `moshaf_id` is not an int >= 1 or is repeated; `name_ar`, `name_en`, `riwayah`, `moshaf_name` are not non-empty strings; `riwayah` is not in `config('quran.mp3quran_riwayat')`; `files` is not a non-empty list; or any file fails: `surah` an int 1..114 and unique in the moshaf; `bytes` int > 0; `duration_ms` int > 0; `sha256` 64 lowercase hex; `key === "audio/mp3quran/{moshaf_id}/{NNN}-{first 16 of sha256}.mp3"`; `url === public_base.'/'.key`. Files are returned sorted by surah. Fields not listed (`reciter_id`, `server`, `source_url`, `source_etag`) are ignored; `surah_list` is read for the report only (a missing or wrongly typed one counts as empty).

## Import rules (exact)

For each valid moshaf, in one `DB::transaction` (resource, recitation, files, flag, bump):

1. **Find or create the resource** by (source `mp3quran`, group `ChapterRecitations`, `source_key` = the moshaf id as text) through `ResourceRepository::sourceId('mp3quran')` + `findBySource`. The lookup is **always source-scoped**: a moshaf whose id equals a QF reciter id is a different resource. New resource: `version` 0, `changes_floor_version` 0, `is_active` true, `name` = `name_en`, `name_ar` = `name_ar`, `language_code` null, `direction` null. If the `mp3quran` source row is missing the run is refused (`content source mp3quran is not seeded`).
2. **Recitation** through `RecitationRepository::upsertForResource($resource->id, [...])` with `reciter_name` = `name_en`, `reciter_name_ar` = `name_ar`, `style` = `config('quran.mp3quran_styles')[<text after the last " - " in moshaf_name, trimmed>] ?? null`, `qirat` = `'Hafs'` (Hafs only in v1; the same English value QF rows carry), `has_word_segments` = the existing value or false. Keep the same `recitations.id` for an existing recitation (the pilot has id 22).
3. **Files.** Desired rows: one per manifest file, `id = Mp3QuranFileId::for($moshaf, $surah)`, `recitation_id`, `chapter_id` = surah, `audio_url` = the manifest `url`, `size_bytes` = `bytes`, `duration_ms` = the manifest's measured `duration_ms`, `format` = `'mp3'`. First `deleteForRecitationExcept($recitation->id, $desiredIds)` (a surah the manifest no longer lists loses its row; deleting before upserting avoids a `(recitation_id, chapter_id)` unique clash), then `upsert` each desired row. A surah the moshaf lacks simply has **no row** (ADR 0062: the app derives availability).
4. **Pilot cleanup, invariant.** An MP3Quran recitation must own no QF-style `recitation_timings` rows (its timings live only in the Taybah tables). `RecitationTimingRepository::deleteForFiles(<every file id of this recitation>)` runs on every import; a non-zero count counts as a change. (The local pilot put 24 and 286 rows there for files 1000253059 and 1000253002; this deletes them. They come back through step 02b's Taybah import.)
5. **Fingerprint.** `hash('sha256', json_encode([...], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES))` of this fixed-order array: `reciter_name`, `reciter_name_ar`, `style`, `qirat`, then `files` (sorted by chapter) of `[id, chapter_id, audio_url, size_bytes, duration_ms, format]`. Stored in `resources.import_fingerprint` (existing column, same as Names/Azkar/Duas).
6. **Hidden duplicates.** `$hidden = array_key_exists($moshafId, config('quran.mp3quran_duplicates'))`. A hidden moshaf is imported fully (so plan step A6(b) can use it) but `is_active = false` and `unavailable_reason = 'duplicate_of_qf:'.<QF source_key>`; it is not listed in the manifest endpoint and no pack is built. Not hidden: `is_active = true`, `unavailable_reason = null`.
7. **Change test.** Changed when the resource is new, or the stored fingerprint differs from the new one (a null fingerprint always differs), or the stored `is_active` differs from the wanted one, or step 4 deleted rows. When changed: assign `import_fingerprint`, `is_active`, `unavailable_reason`, `name`, `name_ar`, `synced_at = now`, call `ResourceVersionService::bumpWithFloor($resource)` once (it also deletes the resource's `content_changes`), then `RecitationSegmentsFlagService::refresh($recitation->id)` (so a re-import never drops a flag that served Taybah segments justify). When not changed: **write nothing at all** (no `synced_at`, no version).
8. **Event.** After the commit, when changed and the resource is active and not `$deferPack` and not `$dryRun`: `ResourceContentChanged::dispatch($resource->id, $version)` once.
9. **Removed moshaf.** After the loop, every `mp3quran` `ChapterRecitations` resource whose `source_key` is **not listed anywhere in the manifest** (valid or skipped as invalid) and is still active: `is_active = false`, `unavailable_reason = 'removed_from_manifest'`, `bumpWithFloor`, no event, no row deleted (ADR 0061 decision 13: the next pack build drops it; installed devices keep their files). A moshaf listed again later becomes active again through rule 7 (the active flag differs) and dispatches the event.
10. **Dry run.** Computes everything and the report, writes nothing, dispatches nothing.
11. **No I/O besides the manifest file and the database.** No HTTP, no storage disk, no credential, no `env()`.

## Fix `ContentDeliveryService::isDefault()`

It compares only `(int) $resource->source_key` with `config('quran.default_recitation')` (a **QF** chapter reciter id). An MP3Quran moshaf whose id equals that number would be flagged default in the manifest. Require the QF source: `$resource->source?->code === 'qf'` in addition (`source` is already eager-loaded by `ResourceRepository::activeWithPacks()` and used by `isServed()`). The default-reciter helper in `ContentDeliveryTest.php` (`packedRecitation`) builds resources on random sources, so change it to create or reuse the `qf` content source (`ContentSource::query()->firstOrCreate(['code' => 'qf'], [name, licence_url, attribution_ar, attribution_en, 'permission_status' => PermissionStatus::Granted])`) and pass its id as `source_id`; keep every existing assertion.

## Tests

`Mp3QuranTestManifest` (support, loaded by Pest the way `AzkarAudioTestManifest.php` is): `mp3QuranTestManifest(array $moshafs): string` writes a manifest under `storage_path('framework/testing/mp3quran-'.(ParallelTesting::token() ?: 'serial'))`, points `quran.mp3quran_manifest_path` at it, returns the path; `mp3QuranTestMoshaf(int $id, array $surahs, array $overrides = [])` builds one valid moshaf with placeholder names and files whose `key`, `url` and `sha256` follow the rules above (sha256 = `hash('sha256', "fixture-{$id}-{$surah}")`, bytes and duration are placeholder ints).

`Mp3QuranFileIdTest` (Unit): `it('puts moshaf and surah in the reserved range')` (253 and 59 give 1_000_253_059), `it('rejects a surah outside 1 to 114')`, `it('never collides with a QF record id')` (ids for moshaf 1 and surah 1 start above 1_000_000_000).

`Mp3QuranSourceMigrationTest`: the row exists after migrate (code `mp3quran`, granted, both attributions non-empty); running the migration's `up()` twice leaves one row; it converges a pre-existing pilot row (different `notes`) to the migration's values.

`Mp3QuranImportTest` (`RefreshDatabase`; `Event::fake([ResourceContentChanged::class])` where events are asserted; `Http::preventStrayRequests()` in `beforeEach`):

- `it('imports a moshaf: resource, recitation and one file per surah with ids in the reserved range and R2 urls')` (also: names, `qirat` Hafs, style from `moshaf_name`, `size_bytes`, measured `duration_ms`, `format` mp3, `version` 1, floor 1, one event).
- `it('is idempotent: a second run changes nothing and bumps nothing')` (version, floor, `synced_at`, row counts equal; zero events).
- `it('bumps once and dispatches once when a file url or size changes')` and `it('bumps when the style or name changes')`.
- `it('with --defer-pack bumps and writes but dispatches no event')`; `it('with --dry-run writes nothing')`.
- `it('imports only the surahs it has when a moshaf lacks some')` (no row for the missing surah; report counts it as `surahsWithoutFile` when `surah_list` names it).
- `it('removes the file row of a surah that left the manifest')`.
- `it('hides a duplicate: imported inactive with the reason and no event, and not served by the manifest endpoint')` (config `quran.mp3quran_duplicates = [<moshaf> => '7']`; `GET /api/v1/content/manifest` omits it even after `content:ensure-packs`).
- `it('converges from the local pilot rows')`: pre-create the pilot state (resource on source `mp3quran`, key `'253'`, version 4, floor 4, `import_fingerprint` null; a recitation with `has_word_segments` true; two files with the reserved ids; `recitation_timings` rows for both) then import a manifest with the same moshaf; assert the same resource id and recitation id, version 5, floor 5, fingerprint set, `recitation_timings` rows gone, flag false, files updated to the manifest URLs, one event; a second run changes nothing.
- `it('keeps has_word_segments true on re-import when a served Taybah set has segments')` (a `TaybahTimingSet` factory row whose URL equals the manifest URL plus a row with segments; change the manifest bytes of another surah to force a change; flag stays true).
- `it('deactivates a moshaf removed from the manifest without deleting rows, and reactivates it when listed again')` (inactive, `removed_from_manifest`, version bumped, no event; later active again with one event).
- `it('refuses a missing, malformed, empty or wrong-schema manifest and writes nothing')`.
- `it('skips an invalid moshaf and imports the others, and leaves the invalid one untouched')` (bad key hash; duplicate surah; wrong `url`; non-Hafs `riwayah`; surah 115; empty `files`) and the command exits non-zero naming the moshaf id.
- `it('ignores every QF config keyed by source_key')`: moshaf ids 5, 158, 168 and 174 (the ids in `quran.untrusted_timing_recitations`) and an id equal to `quran.default_recitation` import normally; none of them is `is_default` in the manifest endpoint (after building packs).
- `it('builds a pack for an imported recitation through content:ensure-packs')` (a `ContentPack` row exists; output contains `OK <resource id>`).
- `it('reads no credential and makes no network call')`: `Http::preventStrayRequests()` for the whole file; plus an assertion that the files this step and step 02b create (`app/Domains/Content/Mp3Quran/*`, `Services/Mp3QuranImporter.php`, `Services/TaybahTimingImporter.php`, `Console/ImportMp3QuranCommand.php`, `Console/ImportRecitationTimingsCommand.php`) contain none of `env(`, `Storage::`, `R2_`, `AWS_` (read them with `file_get_contents`). Do **not** scan `config/`: Laravel's stock `filesystems.php`, `queue.php`, `services.php` and `cache.php` legitimately contain `env('AWS_...')`, and you must not edit framework config. Also add `arch('the app uses no storage SDK')->expect('App')->not->toUse(['Aws'])` to `tests/Unit/ArchitectureTest.php`.

`ContentHandlersTest.php`: `it('leaves imported MP3Quran recitations untouched by a QF sync, even with the same source key')`: import (through `Mp3QuranImporter`) a moshaf with id 6 (the fixture QF reciter's key), run the QF fixture snapshot for reciter 6, assert the MP3Quran resource, recitation, its files and version are unchanged and the QF resource of key 6 is a separate row.

`ContentDeliveryTest.php`: `it('never marks an MP3Quran recitation default, even when its moshaf id equals the default QF reciter')`.

## Local cleanup note (for the developer; the importer needs none of it)

Run, from `apps/api`, after merging: `php artisan migrate`, `php artisan mp3quran:import --defer-pack`, then check read-only through `php artisan tinker --execute` with `DB::select(...)`: `select id, version, changes_floor_version, import_fingerprint is not null as fp from resources where id = 56;` (expect version 5, `fp` 1) and `select count(*) as c from recitation_timings where audio_file_id > 1000000000;` (expect 0). Pilot Arabic text must be written over a utf8mb4 connection (the `mysql` CLI default garbled `name_ar` once); the importer writes through Eloquent, so it is safe. Fallback only if convergence ever fails, delete the pilot rows (children first) and import again: `DELETE FROM recitation_timings WHERE audio_file_id > 1000000000; DELETE FROM chapter_audio_files WHERE id > 1000000000; DELETE FROM recitations WHERE resource_id = 56; DELETE FROM content_changes WHERE resource_id = 56; DELETE FROM content_packs WHERE resource_id = 56; DELETE FROM resources WHERE id = 56;` (the pack files under `storage/app/private/packs/56/` may be removed by hand).

## Gates

```bash
cd /Applications/MAMP/htdocs/quran-app/apps/api
export PATH=/opt/homebrew/bin:$PATH
vendor/bin/pint --format agent
composer qa
```

Contract gate (the manifest endpoint output changes only in data, not shape): copy `packages/api-contract/openapi.json` and `src/schema.d.ts` to a scratch folder you create with `mktemp -d` first; after the work run `npm run generate -w @quran/api-contract` from the repo root (nvm Node 26) and `diff` against the copies; it must be empty (the tree is dirty, never diff against `HEAD`).

## Out of scope

`docker/start-web.sh` and `StartupConfigTest` (step 05), the pack query (step 05), the Taybah importer (02b), the ingest tool (`tools/mp3quran-ingest`, plan B4), the Sources screen and its wording, any edit to `resources/mp3quran/manifest.json`, `CLAUDE.md`, ADRs or the spec, any mobile change.

## Open questions (defaults given; none blocks)

- **Attribution wording.** Both `attribution_*` columns are NOT NULL, so the migration writes the neutral `MP3Quran (mp3quran.net)` until the developer's wording is approved on the Sources frame (plan B2/B3). A later migration or seeder replaces it.
- **Style.** The manifest has no recording type, only `moshaf_name` (for example `<riwayah> - <type>`). Default: map the text after the last ` - ` through `quran.mp3quran_styles`, else null. The developer may prefer to add a `style` field to the manifest instead (an ingest-tool change, plan B4).
- **Duplicates.** Default: a duplicate is imported inactive (so A6(b) can still use it) rather than not imported; `quran.mp3quran_duplicates` starts empty and the developer fills it (for example moshaf 123 to QF `7`).
- **Surahs listed but absent from `files`.** Default: report the count, import what exists; the developer decides whether such a moshaf ships (a reciter ships only when complete, ADR 0061).
