# Step 5 — Packs and contract for the SVG mushafs (ADR 0090 decisions 5, 9 and 12)

Branch `ft/madinah-svg-mushaf` in worktree `/Applications/MAMP/htdocs/quran-app-mushaf` (check with `git branch --show-current`); never work in `/Applications/MAMP/htdocs/quran-app`. Stage and commit nothing. Add no dependency. No UI in this step. Two parts: **A. API** and **B. device**. Do A first, regenerate the contract (A9), then B.

## Before you start

- Run `git status --short > /private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/45caaed8-c2a1-4fa5-a801-974871103e43/scratchpad/step5-before.txt`. The tree already has many unrelated modified and deleted files (reader, fonts, onboarding, the untracked Mushaf domain and plan files). Never revert, stage or edit them. At the end compare `git status --short` with the saved list: the only new differences must be this step's files.
- Environment: this machine is a Mac (root `CLAUDE.md`: PHP 8.5 from Homebrew as `php`, Node 26 via `nvm use`, Homebrew MySQL and Redis). The Windows paths and «known Windows-only Pest failures» in `docs/plans/phase-6/README.md` do not apply. `apps/api/tests/Unit/ArchitectureTest.php` enforces layering (controllers never touch Eloquent or repositories, services never touch HTTP, strict types): commands call services, services use repository contracts, repositories do persistence only. `composer qa` runs these. Read `apps/api/CLAUDE.md` «Layering» and «Tests».
- Enum impact checked on 12 Nov 2026: no `match` over `ResourceGroup` lacks a `default` (`PackSchema::tablesFor()` and `ResourceGroup::isIgnored()` both have one; svg packs never call `tablesFor`). Mobile has no exhaustive `Record` over the group (`PackGroup` is a separate union you do not change). If PHPStan or `tsc` still reports an unhandled `svg_mushafs` somewhere, make the smallest edit there and list it in your report.

## Read first

- `.claude/agent-rules.md`, root `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/mobile/CLAUDE.md`.
- `docs/adr/0090-madinah-svg-mushaf.md`: decisions 5, 6, 9, 12 and the notes on word boxes and quran-text.
- `docs/technical-spec.md` §7 hop 2 («SVG mushafs (ADR 0090)»), §9 («Content manifest»), §6.
- `docs/plans/madinah-svg-mushaf.md` step 5.
- Code (all paths checked on 12 Nov 2026):
  - API pack code: `apps/api/app/Domains/Content/Packs/{PackBuilder,SqlitePackWriter,PackSchema}.php`, `Enums/{ResourceGroup,ServedResourceGroup}.php`, `Services/{ContentDeliveryService,ResourceVersionService}.php`, `Http/Controllers/ContentPackController.php`, `Http/Resources/ContentManifest{,Entry}Resource.php`, `Data/ContentManifestEntryData.php`, `Console/EnsureContentPacksCommand.php`, `Models/{Resource,ContentPack}.php`, `Repositories/Contracts/ResourceRepository.php`.
  - API Mushaf domain (steps 2–3): `apps/api/app/Domains/Mushaf/{MushafServiceProvider.php, Models/Svg*.php, Enums/WordBoxesStatus.php, Sources/{SvgMushafStore,SvgMushafDownloader}.php, Services/{SvgMushafImporter,WordBoxBuilder}.php, Repositories/**}`, `apps/api/config/mushaf.php`, `apps/api/resources/svg-mushaf/word-boxes-hafs.json`.
  - Pattern to copy for a resource row and version bump: `apps/api/app/Domains/Duas/Services/DuasImporter.php` (`write()`), and for a source row `apps/api/database/migrations/2026_10_31_100009_insert_opendua_content_source.php`.
  - Device: `apps/mobile/src/core/sync/{content-sync,install-resource,device-sync,content-tables,use-content-sync}.ts`, `src/core/api/content.ts`, `src/core/storage/mmkv.ts`, `src/core/db/expo-sql-executor.ts`, `src/features/audio/settings.ts` (`getWifiOnlyDownloads`), `src/features/audio/downloads/manager.ts` (`networkGate`, for reference only).
  - Test helpers: `apps/mobile/jest/{node-sqlite-executor,fake-file-system}.ts`, `apps/mobile/__tests__/{content-sync,install-resource}.test.ts` (patterns).

## What exists today (facts you build on)

- Tables (steps 2–3): `svg_mushafs` (`id, key, folder, edition_year, source_commit, page_count, ayah_count, imported_at, word_boxes_status, word_boxes_digest, timestamps`), `svg_mushaf_pages` (`svg_mushaf_id, page, svg_blob_sha, svg_bytes, gz_sha256, gz_bytes`), `svg_mushaf_ayah_regions` (`svg_mushaf_id, page, surah, ayah, label_x, label_y` (nullable decimals), `polygon` text, stored as received), `svg_mushaf_word_boxes` (`svg_mushaf_id, page, line, surah, ayah, position, x0, y0, x1, y1` decimals(8,2)).
- **The page bytes are not in MySQL.** `mushaf:import` writes each page's gzip beside the cached SVG at `SvgMushafStore` path `{base}/svg/NNN.svg.gz` (`base = SvgMushafDownloader::base($folder)`, `NNN` zero-padded to 3), under `SourceCache::path('svg-mushaf/'.config('mushaf.commit'))`. The row holds only `gz_sha256` and `gz_bytes`. The pack writer must read these files and verify them.
- `word_boxes_status` is set to `approved` by `WordBoxBuilder` only when the build digest equals `config('mushaf.approved_word_boxes.hafs')`. Today that config value is `null` and the committed file's status is `failed`, so a Hafs pack built now must have **no** word boxes.
- Today `PackBuilder` always gzips (`.sqlite.gz`) and `ContentPackController` always answers `application/gzip`. `PackSchema::tablesFor()` throws for groups it does not know.
- The device `syncContent()` ignores a manifest group with no entry in `CONTENT_GROUPS` (`contentGroup()` returns `undefined`), and never removes it. So `svg_mushafs` entries are safely skipped by the existing sync; do **not** add the group to `CONTENT_GROUPS` or `PackGroup`.
- `File.digest(algorithm: 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'): Promise<string>` exists in `expo-file-system` 58.0.13 and is typed (`build/internal/NativeFileSystem.types.d.ts`, class `NativeFileSystemFile`, which `File` extends). iOS (`FileSystemFile.swift`) and Android (`FileSystemFile.kt`) stream the file in 64 KB chunks natively. See B3.
- `expo-sqlite` 58 `SQLiteOpenOptions` has no read-only flag (only `useNewConnection`, `finalizeUnusedStatementsBeforeClosing`, and similar). See B5.

## Conflicts and gaps found (do not resolve silently; handle exactly as written)

1. **ADR 0090 decision 4 vs the decided pack design.** The ADR says Hafs ships only with word by word; the decided design lets a Hafs pack exist without boxes (empty table, flag false). Follow the decided design in the writer and the manifest, and add the guard in A5: `mushaf:publish hafs` refuses to publish unless boxes are approved, unless `--without-word-boxes` is passed (local and test use). See open question Q1.
2. **Plan step 5 lists the Sources credit and i18n strings; ADR 0090 decision 11 says the copy is confirmed in step 10.** Out of scope here. Do not add them.
3. **ADR 0090 decision 9 says "downloads when the Mushaf is first opened"; the brief says user-initiated per riwayah.** This step builds only the install function and hook; when it is called is step 7. Nothing here triggers a download by itself.
4. **`content:ensure-packs` (run at web start) builds every active resource without a pack file.** A missing source cache volume would make an svg resource fail and the command exit 1. Handle as A6 says.
5. **`expo-sqlite` cannot open read-only.** Use `PRAGMA query_only = ON` (B5), a weaker guarantee. See Q4.
6. The Wi-Fi-only setting that exists is `audio.wifiOnlyDownloads`, labelled in Settings › Listening. Reuse it as is (B4); a separate setting is Q5.

---

## A. API

### A1. Enum cases

- `ResourceGroup`: add `case SvgMushafs = 'svg_mushafs';` with the comment `// ADR 0090: one pack per riwayah of the Madinah page artwork.` It is not ignored.
- `ServedResourceGroup`: add `case SvgMushafs = 'svg_mushafs';` (the existing test `tests/Unit/Content/ServedResourceGroupTest.php` forces the two enums to match).

### A2. Migrations (new files; continue the step 2–3 sequence, which ends at `2026_11_12_100005`)

1. `2026_11_12_100006_insert_quran_ws_content_source.php`: copy the OpenDua migration pattern. Row: `code` `quran_ws`, `name` `quran.ws (quran-svg, King Fahd Glorious Qur'an Printing Complex)`, `licence_url` `https://github.com/quran-ws/quran-svg`, `attribution_ar` `''`, `attribution_en` `Page artwork: King Fahd Glorious Qur'an Printing Complex. Ayah polygons: quran.ws (quran-svg), CC BY 4.0.`, `permission_status` `not_required` (**Q6**: confirm), `notes` null, timestamps. Skip if the code exists. `down()` deletes the row.
2. `2026_11_12_100007_add_has_word_boxes_to_content_packs_table.php`: add `has_word_boxes` boolean, NOT NULL, default `false`, to `content_packs` (after `schema_version`). The manifest reads the flag recorded when the pack was built, so approving boxes later cannot make an old pack claim boxes it does not have. `down()` drops it.
3. Update `ContentPack` (`@property bool $has_word_boxes`, in `#[Fillable]`, cast `'has_word_boxes' => 'boolean'`).

### A3. Pack file writer (new)

`apps/api/app/Domains/Mushaf/Packs/SvgMushafPackWriter.php`, `final class`, own `PDO` on `sqlite:` (do not edit `SqlitePackWriter`; it binds blobs as text). Methods: `static create(string $path): self` (creates the directory, `PRAGMA journal_mode = DELETE`, `PRAGMA foreign_keys = OFF`, exception mode), `begin()`, `commit()`, `createSchema()`, `writeMeta(array $values)`, `insertPage(int $page, string $svgz)` (bind the blob with `PDO::PARAM_LOB`), `insertRegion(array $row)`, `insertWordBox(array $row)`, `close()`. **No `VACUUM`** (a fresh file has no free pages, and VACUUM would need a second 90 MB of disk).

Schema created by `createSchema()` (exact):

```sql
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE pages (page INTEGER PRIMARY KEY, svgz BLOB NOT NULL);
CREATE TABLE regions (
  page INTEGER NOT NULL, surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
  label_x REAL, label_y REAL, polygon TEXT NOT NULL,
  PRIMARY KEY (page, surah, ayah)
) WITHOUT ROWID;
CREATE INDEX regions_ayah ON regions (surah, ayah, page);
CREATE TABLE word_boxes (
  page INTEGER NOT NULL, line INTEGER NOT NULL, surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
  position INTEGER NOT NULL, x0 REAL NOT NULL, y0 REAL NOT NULL, x1 REAL NOT NULL, y1 REAL NOT NULL,
  PRIMARY KEY (surah, ayah, position)
) WITHOUT ROWID;
CREATE INDEX word_boxes_page ON word_boxes (page, line);
```

`word_boxes` is always created, and empty when the pack has no boxes. `label_x`/`label_y` are NULL for continuation rows. `polygon` is copied byte for byte. Coordinates come out of MySQL as decimal strings; bind them as strings and let the `REAL` affinity convert (a test asserts `typeof(x0) = 'real'`).

`meta` rows (all values strings): `pack_schema_version` = `(string) PackSchema::VERSION`, `resource_id`, `group` = `svg_mushafs`, `version`, `built_at` (ISO 8601 Zulu, millisecond, as `PackBuilder::write`), `mushaf_key`, `edition_year`, `source_commit`, `page_count`, `has_word_boxes` (`1` or `0`), and `word_boxes_digest` (only when `has_word_boxes` is `1`).

### A4. Repository for reading the editions (new)

- Contract `apps/api/app/Domains/Mushaf/Repositories/Contracts/SvgMushafPackRepository.php`:
  - `findByKey(string $key): ?SvgMushaf`
  - `pages(int $svgMushafId): iterable` of `array{page: int, gz_sha256: string, gz_bytes: int}`, ordered by page, lazy (`->toBase()->orderBy('page')->cursor()`).
  - `regions(int $svgMushafId): iterable` of `array{page: int, surah: int, ayah: int, label_x: string|null, label_y: string|null, polygon: string}`, ordered by `page, surah, ayah`, lazy.
  - `wordBoxes(int $svgMushafId): iterable` of `array{page: int, line: int, surah: int, ayah: int, position: int, x0: string, y0: string, x1: string, y1: string}`, ordered by `surah, ayah, position`, lazy.
- Eloquent implementation `EloquentSvgMushafPackRepository` in `Repositories/Eloquent/`, with PHPDoc array shapes (PHPStan level in `phpstan.neon`). Bind it in `MushafServiceProvider::register()`.

### A5. Approval gate, publisher, command (new)

1. `apps/api/app/Domains/Mushaf/Services/WordBoxApproval.php`: `isApproved(SvgMushaf $mushaf): bool`. True only when **all** hold: `$mushaf->key === 'hafs'`; `$mushaf->word_boxes_status === WordBoxesStatus::Approved`; `config('mushaf.approved_word_boxes.hafs')` is a non-empty string and `hash_equals` that value and `$mushaf->word_boxes_digest`; the committed file (`resource_path(sprintf(config('mushaf.word_box_files.output'), 'hafs'))`) exists, decodes, and its `digest` field equals the same value. Anything else: false (never throws). The other four riwayat: always false.
2. `apps/api/app/Domains/Mushaf/Services/SvgMushafPublisher.php`: `publish(string $key, bool $deferPack, bool $withoutWordBoxes): Resource` (throws `UnknownSvgMushafException` for a key not in `config('mushaf.editions')`, `SvgMushafException` when the edition is not imported or when the Hafs guard fails).
   - Edition must exist (`findByKey`) with `page_count === config('mushaf.pages')`; else throw.
   - Guard (conflict 1): for `hafs`, if `! WordBoxApproval::isApproved()` and `! $withoutWordBoxes`, throw with the message `Hafs is not published until its word boxes are approved. Pass --without-word-boxes to publish pages and regions only.`
   - Source row: `ResourceRepository::sourceId('quran_ws')` (throw if null).
   - Resource: `findBySource($sourceId, ResourceGroup::SvgMushafs, $key)` or `create([...])` with `source_id`, `group`, `source_key` = `$key`, `name` = the riwayah English name from the table below, `name_ar` = the Arabic name, `language_code` `ar`, `direction` `TextDirection::Rtl`, `version` 0, `changes_floor_version` 0, `is_active` true.
   - Fingerprint = `hash('sha256', json_encode([$mushaf->source_commit, $mushaf->page_count, <all page gz_sha256 in page order>, <sha256 of the concatenation of "page:surah:ayah:label_x:label_y:polygon\n" for all regions, a NULL label written as the empty string>, $includeBoxes ? $mushaf->word_boxes_digest : 'none']))`, where `$includeBoxes = WordBoxApproval::isApproved()`. If it equals `$resource->import_fingerprint`, return without a bump (and build nothing). Otherwise, in `DB::transaction`: `ResourceVersionService::bumpWithFloor($resource)`, set `import_fingerprint`, save. Then `PackBuilder::build()` unless `$deferPack` (then `BuildContentPackJob::dispatch`, as the Duas importer's `deferPack` branches do: `--defer-pack` means build later via `content:ensure-packs`).
   - Names (exact, from ADR 0090 decision 2): `hafs` «حفص عن عاصم» / `Hafs from Asim`; `warsh` «ورش عن نافع» / `Warsh from Nafi`; `qalun` «قالون عن نافع» / `Qalun from Nafi`; `shubah` «شعبة عن عاصم» / `Shu'bah from Asim`; `duri` «الدوري عن أبي عمرو» / `Al-Duri from Abu Amr`. Put them in `config/mushaf.php` under `editions.{key}.name` and `editions.{key}.name_ar` (new keys; update the five entries; they are display names, not Quran text).
3. `apps/api/app/Domains/Mushaf/Console/PublishSvgMushafCommand.php`: signature `mushaf:publish {key} {--defer-pack} {--without-word-boxes}`; prints the new version and `has_word_boxes`; exit 1 on `SvgMushafException`, `PackBuildException`. Register in `MushafServiceProvider::boot()` next to the other two commands. `mushaf:import` and `mushaf:build-word-boxes` are **not** changed: publishing is a deliberate step. Do not touch `docker/start-web.sh` (Q2).

### A6. `PackBuilder` branch and `EnsureContentPacksCommand`

In `PackBuilder::build()`, after the existing readiness checks and before the temp path is built, add `if ($resource->group === ResourceGroup::SvgMushafs) { return $this->buildSvgMushaf($resource); }`. Add `SvgMushafPackBuilder` (new, `apps/api/app/Domains/Mushaf/Packs/SvgMushafPackBuilder.php`) as a constructor dependency of `PackBuilder`, and have `buildSvgMushaf` call `$this->svgMushafs->build($resource)`. `SvgMushafPackBuilder::build(Resource $resource): ContentPackData` does the same as `PackBuilder::build` for the rest of its work (reuse an existing `content_packs` row whose file exists; drop a row without a file; catch `UniqueConstraintViolationException`; always delete the temp file in `finally`; delete the stored file if recording fails), except:

- Stored path `packs/{resource_id}/{version}.sqlite` (**uncompressed**, the `local` disk). Write the temp file under `storage_path('app/tmp/')`, then move it onto the disk with a stream (`Storage::disk('local')->writeStream`), never `file_get_contents` (the file is about 90 MB).
- `sha256` = `hash_file('sha256', $temp)`; `size_bytes` = `filesize($temp)`; `row_count` = pages + regions + word boxes written; `has_word_boxes` as decided below; `schema_version` = `PackSchema::VERSION`.
- Edition = `findByKey($resource->source_key)`; none, or `page_count !== config('mushaf.pages')`: `PackBuildException('The SVG mushaf is not imported. The pack is not built.')`.
- For each page row, in page order: read `SvgMushafStore::read($downloader->base($mushaf->folder), sprintf('svg/%03d.svg.gz', $page))`. Missing file, `strlen !== gz_bytes`, or `hash('sha256', $bytes) !== gz_sha256`: `PackBuildException('Page N of the SVG mushaf is missing or changed in the source cache. Run mushaf:import.')`. Insert the bytes unchanged. Never gunzip, re-gzip or alter them. Hold at most one page in memory.
- Regions: every row of `regions()`, in order.
- Word boxes: only when `WordBoxApproval::isApproved($mushaf)`; then every row of `wordBoxes()`, and `has_word_boxes` is `true`, and `meta.word_boxes_digest` is written. Otherwise the table stays empty and `has_word_boxes` is `false`.
- Use one transaction around all inserts (`begin`/`commit`).

`ContentPackController::show()`: choose `Content-Type` from the pack path: `application/vnd.sqlite3` when it ends in `.sqlite`, else `application/gzip` (add `ContentDeliveryService::isGzipped(ContentPackData $pack): bool`, or equivalent, so the controller does not parse paths). `BinaryFileResponse` already answers `Range`; leave that. Keep `Cache-Control` and `ETag` unchanged.

`EnsureContentPacksCommand`: skip resources whose group is `ResourceGroup::SvgMushafs` (print `SKIP {id}: SVG mushafs are built by mushaf:publish`). Reason: their input is the source cache, not the database (conflict 4). Q2 asks whether recovery should rebuild them.

### A7. Manifest

- `ContentDeliveryService::manifest()` passes `hasWordBoxes: $pack->has_word_boxes` to the entry.
- `ContentManifestEntryData`: add `public readonly bool $hasWordBoxes,` as the last constructor parameter. Update every place that constructs it (grep `new ContentManifestEntryData`, including tests) with `false`.
- `ContentManifestEntryResource` and `ContentManifestResource`: add `'has_word_boxes' => $this->resource->hasWordBoxes` and the docblock shape `has_word_boxes: bool` (last key). The value is true only for an `svg_mushafs` entry with approved boxes; it is `false` on every other entry. No other manifest field changes: `key` is the riwayah key (`hafs`, ...), `group` is `svg_mushafs`, `pack.size_bytes`/`pack.sha256` are of the uncompressed file.
- `ContentDeliveryService::servedPack` and `isServed` need no change (they already require the pack file on disk).

### A8. Spec

`docs/technical-spec.md`: §7 hop 2 «SVG mushafs» bullet: add that the pack is served uncompressed as `application/vnd.sqlite3` at `packs/{resource}/{version}.sqlite`, that its tables are `meta`, `pages`, `regions`, `word_boxes`, that `mushaf:publish {key}` creates the resource and builds it, and that `has_word_boxes` is recorded at build. Add the Hafs release order: (1) the developer signs off the review sheet and sets `mushaf.approved_word_boxes.hafs` to the digest; (2) re-run `mushaf:build-word-boxes hafs` (only that run sets the DB status to `approved`); (3) `mushaf:publish hafs`. Publishing before step 2 yields no boxes, and the guard refuses it. §9 (find with `grep -n "Content manifest" docs/technical-spec.md`): document the manifest field `has_word_boxes` and the group `svg_mushafs`. Do not edit ADR 0090 (Q1 and Q4 may need an amendment, which the orchestrator writes).

### A9. Contract

From the repo root: `npm run generate -w @quran/api-contract`. Commit-ready changes: `packages/api-contract/openapi.json` and `packages/api-contract/src/schema.d.ts` (the new `svg_mushafs` enum value, the `has_word_boxes` property). Do not hand-edit them.

### A10. API tests (Pest, in `apps/api/tests/`, synthetic data only)

Fixture rule: placeholder page bytes (for example `gzencode('FIXTURE page 1 — not artwork')`), polygon `M 0 0 L 1 0 L 1 1 L 0 1 Z`, coordinates like `10.5`. No Quran artwork or text. Use `config(['mushaf.pages' => 2])`, `Storage::fake('local')`, and write the fixture `.svg.gz` files under `SourceCache::path(...)` as `tests/Feature/Mushaf/SvgMushafImportTest.php` does (copy its helper style).

`tests/Feature/Mushaf/SvgMushafPackTest.php`:

1. builds a pack for a two-page `warsh` edition: opens the stored `.sqlite` with PDO; `pages` has 2 rows whose `svgz` equals the fixture bytes byte for byte; `regions` rows equal the DB rows (a continuation row has NULL labels); `word_boxes` is empty; `meta.has_word_boxes` = `0`; `meta.mushaf_key`, `meta.page_count`, `meta.pack_schema_version` correct.
2. the stored path ends `.sqlite`, the file is not gzip (first two bytes are not `1f 8b`), and `content_packs.sha256` equals `hash_file` of it.
3. a missing page file, a wrong-size page and a wrong-digest page each throw `PackBuildException` and leave no `content_packs` row and no stored file.
4. Hafs with status `approved` and a matching `config(['mushaf.approved_word_boxes.hafs' => $digest])` and a fixture output file whose `digest` matches (set `config(['mushaf.word_box_files.output' => 'svg-mushaf/test-fixture-%s.json'])`, remove it in `afterEach`, as the import test does): boxes written, `has_word_boxes` = 1, `meta.word_boxes_digest` present, `typeof(x0)` is `real`.
5. Hafs with status `approved` but a different config digest, with status `failed`, with config `null`, and with a file digest that differs: boxes absent, `has_word_boxes` = 0 (one dataset test).
6. a non-Hafs edition never gets boxes, even with word-box rows present in MySQL.
7. an unchanged re-publish does not bump the version; a changed `gz_sha256` or an approval change does.

`tests/Feature/Mushaf/SvgMushafPublishCommandTest.php`: `mushaf:publish hafs` fails with the guard message when unapproved; passes with `--without-word-boxes`; `mushaf:publish nope` fails; creates the `quran_ws` resource with the right names; `--defer-pack` builds nothing and dispatches `BuildContentPackJob` (`Queue::fake()`).

`tests/Feature/Content/SvgMushafDeliveryTest.php` (copy setup from `ContentDeliveryTest.php`): the manifest lists the `svg_mushafs` resource with `group`, `key`, `has_word_boxes`, `pack.url`, `pack.size_bytes` equal to the file size; `GET /api/v1/content/packs/{id}/{version}` answers 200 with `Content-Type: application/vnd.sqlite3`, the `ETag`, and a `Range: bytes=0-15` request answers 206; a gzip pack of another group still answers `application/gzip`; an inactive resource answers 404.

Update `tests/Unit/Content/ServedResourceGroupTest.php` only if it fails (it should pass once both enums have the case). `EnsureContentPacksCommandTest`: add a case that an `svg_mushafs` resource without a pack is skipped, not failed. Fix existing tests that build `ContentManifestEntryData` or assert the exact manifest JSON.

---

## B. Device

All new code goes under `apps/mobile/src/core/mushaf-pack/` (core, because it is sync, not a screen), no UI. One module per concern, each with a colocated test (`*.test.ts`/`*.test.tsx`).

### B1. Files

| File | Exports |
| --- | --- |
| `types.ts` | `SVG_MUSHAF_KEYS = ['hafs','warsh','qalun','shubah','duri'] as const`, `type SvgMushafKey`, `isSvgMushafKey(value: string): value is SvgMushafKey`, `type PageRegion = {surah: number; ayah: number; labelX: number \| null; labelY: number \| null; polygon: string}`, `type WordBox = {line: number; surah: number; ayah: number; position: number; x0: number; y0: number; x1: number; y1: number}`, `type InstalledSvgMushaf = {key: SvgMushafKey; resourceId: number; version: number; sha256: string; sizeBytes: number; hasWordBoxes: boolean; installedAt: number}`, `type SvgMushafInstallResult = {status: 'installed'} \| {status: 'cancelled'} \| {status: 'waiting_wifi'} \| {status: 'failed'; reason: 'network' \| 'checksum' \| 'size' \| 'import' \| 'unavailable' \| 'storage'}` |
| `installed-store.ts` | `getInstalledSvgMushaf(key)`, `setInstalledSvgMushaf(record)`, `clearInstalledSvgMushaf(key)`; backed by MMKV (`storage` from `@/core/storage/mmkv`), one JSON string per key under `storageKeys.svgMushaf.installed(key)`; add that to `storageKeys` as `svgMushaf: { installed: (key: string) => \`svgMushaf.installed.${key}\` }`. A malformed or wrong-key JSON reads as `undefined`. |
| `paths.ts` | `svgMushafPackPath(key, version): string` (`{Paths.document.uri without trailing slash}/packs/svg-mushaf-{key}-{version}.db`), `svgMushafPartPath(key, version)` (same plus `.part`), `svgMushafPackDirectory()`, and `databaseLocation(path): {name: string; directory: string}` (strips `file://`, `decodeURIComponent`, splits at the last `/`). The location is `documentDirectory/packs/`, **not** the cache directory (the OS may clear the cache). |
| `hash-file.ts` | `sha256File(path: string): Promise<string>` (B3). |
| `SvgMushafPackReader.ts` | the read API (B6). |
| `open-pack.ts` | `openSvgMushafPackAt(path)`, `openSvgMushafPack(key)`, `closeSvgMushafPack(key)` (B5). |
| `install-svg-mushaf.ts` | `installSvgMushafWith(deps, key, options): Promise<SvgMushafInstallResult>` and the device wrapper `installSvgMushaf(key, options)`. |
| `remove-svg-mushaf.ts` | `removeSvgMushaf(key)` and `cleanupSvgMushafFiles()`. |
| `useSvgMushafPack.ts` | the hook (B7), plus its zustand store `svg-mushaf-pack-store.ts`. |
| `index.ts` | re-exports the public surface. |

### B2. Install flow (`installSvgMushafWith`)

`deps` type `SvgMushafInstallDeps`: `{ api: Pick<ContentApi, 'getManifest' | 'downloadPack'>; db: SqlExecutor; files: SvgMushafFiles; sha256File: (path: string) => Promise<string>; openPack: (path: string) => SvgMushafPackReader /* uncached, B5 */; network: () => Promise<NetworkState>; wifiOnly: () => boolean; now: () => number }` where `SvgMushafFiles` = `{ exists(path): boolean; size(path): number; move(from, to): void; remove(path): void; list(dir): string[]; ensureDirectory(dir): void }`. The device wrapper wires `expo-file-system` `File`/`Directory`, `getManifest`/`downloadPack` from `../sync/device-sync` and `../api/content`, `openContentDb().executor`, `expo-network` `getNetworkStateAsync`, `getWifiOnlyDownloads` from `@/features/audio/settings`, `Date.now`. Options: `{ onProgress?: (fraction: number) => void; signal?: AbortSignal; allowCellular?: boolean }`.

Steps, in order. One install per key at a time: a module `Map<SvgMushafKey, Promise<…>>`, a second caller gets the same promise (copy `installResourceWith`).

1. `signal.aborted` → `{status:'cancelled'}`.
2. `getManifest(undefined, signal)`. A status other than 200 or a throw → `failed/network` (or `cancelled` if the signal is aborted). `writeCatalog(deps.db, manifest.resources)` (same as `install-resource.ts`). `resource = resources.find(r => r.group === 'svg_mushafs' && r.key === key)`; none → `failed/unavailable`.
3. Network gate: `const state = await deps.network()`. `canDownload = state.isConnected === true && (options.allowCellular === true || !deps.wifiOnly() || state.type === NetworkStateType.WIFI)`. Not connected → `failed/network`. Connected but gated by Wi-Fi-only → `{status:'waiting_wifi'}` (nothing queued; the caller may call again with `allowCellular: true`). This mirrors `networkGate` in `features/audio/downloads/manager.ts`; do not import that module.
4. Skip if `getInstalledSvgMushaf(key)` has `version === resource.version` and its file exists and `sha256 === resource.pack.sha256` → `installed` (no download).
5. Clean: remove `svgMushafPartPath(key, resource.version)` if present. `ensureDirectory`.
6. `onProgress?.(0)`. `deps.api.downloadPack(packUrl(resource.pack.url), partPath, { signal, onProgress: f => onProgress(min(0.9, f * 0.9)) })`. A throw → remove the `.part`; `cancelled` if the signal aborted; else `failed/network`. (A cancel must leave no `.part`.)
7. Size check: `deps.files.size(partPath) !== resource.pack.size_bytes` → remove `.part`, `failed/size`.
8. `onProgress?.(0.92)`; `hash = await deps.sha256File(partPath)` (B3, native, chunked). `hash !== resource.pack.sha256` → remove `.part`, `failed/checksum`. If aborted → remove `.part`, `cancelled`.
9. `deps.files.move(partPath, finalPath)` (`svgMushafPackPath(key, version)`; remove an existing file at `finalPath` first).
10. Open and check (B5): `reader = deps.openPack(finalPath)` (this is `openSvgMushafPackAt`, uncached, so an already-open old version is never returned); read `reader.hasWordBoxes`, then run `reader.verify({ key, resourceId: resource.id })` must pass (meta `pack_schema_version` = `1`, `group` = `svg_mushafs`, `mushaf_key` = `key`, `resource_id` = `String(resource.id)`, `version` = `String(resource.version)`, `page_count` > 0 and equal to `SELECT COUNT(*) FROM pages`). Close `reader` in a `finally`. Any failure or throw → remove `finalPath`, `failed/import` (the old version, its record and its cached reader are untouched).
11. Switch: `setInstalledSvgMushaf({ key, resourceId, version, sha256, sizeBytes, hasWordBoxes /* read in step 10 */, installedAt: now() })`, **then** evict the cache for this key (`closeSvgMushafPack(key)` closes the old connection; the next `openSvgMushafPack(key)` opens the new recorded version), **then** delete every other file in the packs directory matching `^svg-mushaf-{key}-\d+\.db(-wal|-shm|-journal)?$` except the new one. Delete the old version only after the record points at the new one. A failure while deleting the old file must not fail the install (swallow and log in `__DEV__`).
12. `bumpCatalogVersion()` (from `../sync/catalog-version`), `onProgress?.(1)`, `installed`.
13. A `try/finally` guarantees no `.part` survives any outcome except an OS kill; `cleanupSvgMushafFiles()` (B8) removes strays at app start.

Do **not** run `ATTACH` on this file and do not copy rows into `content.db`.

### B3. Hashing without reading the file into JS (exact)

Use `new File(path).digest('SHA-256')` from `expo-file-system`. It returns the lowercase hex digest, reads the file in 64 KB chunks on the native side and never passes the bytes to JavaScript. No new dependency.

```ts
import { File } from 'expo-file-system';
export function sha256File(path: string): Promise<string> {
  return new File(path).digest('SHA-256');
}
```

Do not use `expo-crypto` `digest` on the whole file (one-shot, needs the 95 MB in JS memory), `file.bytes()`, or `readBytes` loops (`expo-crypto` has no incremental hash, so chunking in JS cannot give a SHA-256 without a new dependency). The existing `sha256Bytes` in `device-sync.ts` stays for the small gzip packs.

Test: `hash-file.test.ts` mocks `expo-file-system` so `File.prototype.digest` returns a fixed hex string; it asserts the call is `digest('SHA-256')` and that no `bytes`/`readBytes` call happens. Nice to have, not a gate: the orchestrator may run one dev-build check that a large file's result equals `shasum -a 256`.

### B4. Wi-Fi

As step 3 of B2. Read the setting with `getWifiOnlyDownloads()` (`src/features/audio/settings.ts`). Add no setting and no UI string here (Q5).

### B5. Opening the file (separate database, read-only as far as the library allows)

`open-pack.ts` exports three functions with one rule. `openSvgMushafPackAt(path: string): SvgMushafPackReader` opens a **new, uncached** connection to that exact file (the installer uses it to verify a freshly downloaded file and closes it with `reader.close()`). `openSvgMushafPack(key: SvgMushafKey): SvgMushafPackReader | null` is the cached reader for the **recorded** version only: it reads `getInstalledSvgMushaf(key)`, returns `null` when there is no record or its file is missing, and otherwise opens `openSvgMushafPackAt(svgMushafPackPath(key, record.version))` once and caches it by key. `closeSvgMushafPack(key)` closes and evicts the cached reader. Both openers use `openDatabaseSync(name, { useNewConnection: true }, directory)` from `expo-sqlite` with the `{name, directory}` from `databaseLocation(path)`, then `execSync('PRAGMA query_only = ON')`. Wrap with `createExpoSqlExecutor` and pass the executor to `new SvgMushafPackReader(executor, closeFn)`. **Check the file exists first** (`expo-sqlite` creates an empty database when the file is missing, which would then pass as a pack): missing → throw. Never `ATTACH`, never copy. Never write: no method of the reader runs anything but `SELECT`. `closeSvgMushafPack(key)` calls the reader's `close()` (which calls `database.closeSync()`), and removes the cache entry.

### B6. Read API (`SvgMushafPackReader`)

Constructor `(executor: SqlExecutor, close: () => void)`. Everything synchronous (the executor is). Methods, exact signatures:

- `verify(expected: {key: SvgMushafKey; resourceId: number; version: number}): void` (throws `Error`, see B2 step 10).
- `readonly pageCount: number` and `readonly hasWordBoxes: boolean` (from `meta`, read once in the constructor; `hasWordBoxes` is `meta.has_word_boxes === '1'` **and** `SELECT 1 FROM word_boxes LIMIT 1` returns a row).
- `getPage(page: number): Uint8Array | null`: `SELECT svgz FROM pages WHERE page = ?`; `null` when out of range or missing. The bytes are returned as stored (gzip); inflating (fflate) and caching are step 7. Return a `Uint8Array` even if the driver returns an `ArrayBuffer`.
- `regionsForPage(page: number): PageRegion[]`: `SELECT surah, ayah, label_x, label_y, polygon FROM regions WHERE page = ? ORDER BY surah, ayah`. `labelX`/`labelY` are `null` for a region that continues from the previous page.
- `wordBoxesForPage(page: number): WordBox[]`: `SELECT line, surah, ayah, position, x0, y0, x1, y1 FROM word_boxes WHERE page = ? ORDER BY line, surah, ayah, position`. Empty array when the pack has no boxes. Never fabricates boxes.
- `pageForAyah(surah: number, ayah: number): number | null`: `SELECT MIN(page) FROM regions WHERE surah = ? AND ayah = ?` (the page the ayah starts on). This is the pack's own page↔ayah mapping (ADR 0090 decision 6); the `page` column of `content.db` is never consulted.
- `pagesForAyah(surah, ayah): number[]` (all pages, ascending, for an ayah that spans two).
- `firstAyahOnPage(page: number): {surah: number; ayah: number} | null`: the first non-continuation region by `surah, ayah` (`label_x IS NOT NULL`), else the first region, else `null`.
- `close(): void`.

### B7. Hook `useSvgMushafPack(key: SvgMushafKey)`

A small zustand store (`svg-mushaf-pack-store.ts`) holds per-key transient state so every screen sees the same download: `{ phase: 'idle' | 'downloading' | 'verifying' | 'waiting_wifi' | 'failed' | 'cancelled'; progress: number; error: SvgMushafInstallResult['reason'] | null }`. The hook returns:

```ts
{
  status: 'absent' | 'downloading' | 'verifying' | 'waiting_wifi' | 'installed' | 'failed' | 'cancelled';
  progress: number;            // 0..1; 0 unless downloading or verifying
  error: 'network' | 'checksum' | 'size' | 'import' | 'unavailable' | 'storage' | null;
  installedVersion: number | null;
  availableVersion: number | null;   // from catalog_resources (group 'svg_mushafs', source_key = key); null before the first manifest read
  updateAvailable: boolean;          // installed and availableVersion > installedVersion
  sizeBytes: number | null;          // catalog pack_size_bytes, for the confirm text
  hasWordBoxes: boolean;             // from the installed record; false when absent
  download(options?: { allowCellular?: boolean }): Promise<SvgMushafInstallResult>;
  cancel(): void;                    // aborts the AbortController of the running install
  remove(): void;
  reader: SvgMushafPackReader | null;  // `openSvgMushafPack(key)`, opened lazily when status is 'installed'; null otherwise
}
```

`status` is `installed` when the MMKV record exists **and** the file exists; if the record exists and the file is gone, clear the record and report `absent`. `progress` while `verifying` is 0.92 and `phase` becomes `verifying` once the download resolves. `useCatalogVersion()` (from `src/core/sync/catalog-version.ts`) is the re-read trigger for the catalog values. `download()` returns the same promise for a second call while one runs. `cancel()` when nothing runs does nothing. Installed records are **not** part of `installed_resources`; the existing content sync neither updates nor removes them, and an `updateAvailable` pack is only reinstalled by an explicit `download()` (Q7).

### B8. Removal and cleanup

- `removeSvgMushaf(key)`: close the connection, delete the file and its `-wal`/`-shm`/`-journal`, clear the record, `bumpCatalogVersion()`.
- `cleanupSvgMushafFiles()`: for each file in the packs directory named `svg-mushaf-*`: delete every `.part`, and every file that is not the installed record's file for its key. Do not call it from any screen here; export it and test it. Wiring it to app start belongs to step 7.

### B9. Types and fixtures

Run `npx tsc --noEmit` after A9. Every typed `ContentManifestResource` / `ContentManifest` fixture that now fails because `has_word_boxes` is required gets `has_word_boxes: false`. Outside fixtures, change code only where `tsc` reports an `svg_mushafs` problem, with the smallest edit, and list it. Do not add `svg_mushafs` to `PackGroup` or `CONTENT_GROUPS`; add one test in `__tests__/content-sync.test.ts` that a manifest containing an `svg_mushafs` resource is ignored by `syncContent` (no install, no removal of an unrelated installed resource, report has no entry for it).

### B10. Device tests (Jest, synthetic only)

Fixture: build a tiny pack file with `node:sqlite` (`DatabaseSync`) in a temp directory with the exact A3 schema: 2 pages whose `svgz` is `gzipSync(new TextEncoder().encode('FIXTURE page N — not artwork'))`, 3 regions (one with NULL labels on page 2, polygon `M 0 0 L 1 0 L 1 1 L 0 1 Z`), and 0 or 2 word boxes with plain numbers; meta as A3. Open it with `openNodeSqlite` (`jest/node-sqlite-executor.ts`). No Quran artwork or text anywhere.

- `SvgMushafPackReader.test.ts`: `getPage` returns the stored bytes exactly and `null` for 0 and 3; `regionsForPage` order and `null` labels; `wordBoxesForPage` empty for a no-box pack and ordered for a box pack; `hasWordBoxes` false when meta says `1` but the table is empty; `pageForAyah` returns the first page and `null` for an unknown ayah; `pagesForAyah` for a spanning ayah returns two pages; `firstAyahOnPage` skips a continuation region; `verify` throws for a wrong key, a wrong resource id, a wrong schema version and a count mismatch.
- `install-svg-mushaf.test.ts` (use `jest/fake-file-system.ts` or an in-test `SvgMushafFiles` over a temp directory; the fake `downloadPack` copies a fixture file and calls `onProgress`): happy path installs, records, reports progress ending at 1, and a second call with the same version does not download; checksum mismatch removes the `.part` and leaves the previous version installed and its file present; size mismatch; corrupt pack (meta of another key) removes the new file and keeps the old; cancel mid-download (abort the signal inside `downloadPack`) leaves no `.part` and returns `cancelled`; Wi-Fi-only on cellular returns `waiting_wifi` without downloading and `allowCellular: true` proceeds; offline returns `failed/network`; the old version's file (and a `-wal` sibling) is deleted only after the record switches (assert the order with a spy on `setInstalledSvgMushaf` and `remove`); two concurrent calls share one download; unknown key in the manifest returns `failed/unavailable`; `ATTACH` is never issued (the `db` executor passed in has `exec` spied and not called with `ATTACH`).
- `useSvgMushafPack.test.tsx`: states `absent` → `downloading` (progress passes through) → `installed`; `cancel()` returns to `cancelled`; a record with a missing file reads `absent`; `updateAvailable` true when the catalog version is higher; `reader` is null until installed. Mock the installer module, not the network.
- `installed-store.test.ts`, `paths.test.ts` (including `databaseLocation` with spaces and `%20`), `hash-file.test.ts` (B3), `remove-svg-mushaf.test.ts` (cleanup deletes `.part` and stray versions, keeps the installed file).
- The strings «Quran», «text» etc. in tests are placeholders; if a fixture needs a name use `FIXTURE`.

---

## Gates (run in this order, from the repo root unless stated)

API (`cd apps/api`):

```bash
composer qa
```

(runs `pint --test`, `phpstan analyse`, `pest --parallel`; run `./vendor/bin/pint` first to fix style). Also run the new tests alone while working: `./vendor/bin/pest tests/Feature/Mushaf tests/Feature/Content/SvgMushafDeliveryTest.php tests/Unit/Content`. If the local MySQL is down, `brew services start mysql redis`.

Contract (after the API passes):

```bash
npm run generate -w @quran/api-contract
```

Mobile (`cd apps/mobile`; Node 26 through nvm; **never two jest runs at once, kill orphans first with `pkill -f jest`, and always scope with `--maxWorkers=2`**):

```bash
npm run lint
npx tsc --noEmit
npx jest --maxWorkers=2 src/core/mushaf-pack __tests__/content-sync.test.ts __tests__/install-resource.test.ts __tests__/content-api.test.ts
```

Then, if time allows, the full `npm test -- --maxWorkers=2` once. `npx expo-doctor` is not needed (no dependency changed). No `node .github/scripts/npm-audit.mjs` / `composer audit` (no dependency changed).

## Out of scope

- Any UI, route, screen, frame, `LoadingMushaf` component, picker, onboarding or settings change (steps 6–8). The hook exposes progress and cancel; the UI uses them later.
- Rendering pages with Skia, inflating pages, page caching, hit-testing, colours (step 7).
- Calling `cleanupSvgMushafFiles()` at app start; deciding when the app downloads; automatic updates of an installed pack.
- `user.db` changes and per-riwayah marks (step 9); audio follows the reciter's riwayah (step 9b).
- `docker/start-web.sh`, Railway runbook, scheduler entries; running `mushaf:publish` anywhere real; setting `mushaf.approved_word_boxes.hafs` (only the developer does that).
- The Sources credit, i18n strings and website changes (step 10).
- `word-boxes-hafs.json`, `word-box-overrides-hafs.json`, any file under `resources/svg-mushaf/` (never edit).
- Removing the old Mushaf code (step 10). Brotli, R2, any new host.
- OTA/store release steps (step 11). This step adds no native package, so it does not change the fingerprint.

## Done when

- Gates above pass; new tests listed in A10 and B10 exist and pass.
- `git status --short` differs from the saved list only by the files named here plus regenerated `openapi.json` and `schema.d.ts`.
- Report: files created/changed, the size of a fixture pack, and anything in the code that disagreed with this brief.

## Open questions for the developer (put in the report; do not decide)

- **Q1.** Should `mushaf:publish hafs` ever serve a Hafs pack without word boxes? The brief refuses by default (ADR 0090 decision 4) and allows it only with `--without-word-boxes`. Confirm, or amend the ADR.
- **Q2.** Who runs `mushaf:import` and `mushaf:publish` in production, and should `content:ensure-packs` rebuild lost svg packs after a volume loss? The brief skips them there and does not touch `start-web.sh`. The source cache (about 600 MB x 5 raw plus gzip files) must be on the volume.
- **Q3.** The English riwayah names in the publisher («Hafs from Asim», «Warsh from Nafi», ...) are provisional wording; the ADR gives only the Arabic. Confirm or replace.
- **Q4.** `expo-sqlite` has no read-only open; `PRAGMA query_only` is the only guard. Acceptable?
- **Q5.** Reuse `audio.wifiOnlyDownloads` for mushaf downloads, or add a separate "Wi-Fi only for mushafs" setting?
- **Q6.** `content_sources.permission_status` for the new `quran_ws` source: `not_required` (as used here, provenance only per ADR 0042) or `granted`?
- **Q7.** When a newer pack version exists for an installed riwayah, update silently on Wi-Fi, or only on the reader's tap (as the brief does)? Each update is about 90 MB.
- **Q8.** A cancelled or failed download restarts from zero (no resume). A 90 MB restart on a flaky connection may annoy; the server already answers `Range`. Add resume later?

## Decisions on the open questions (coordinator, 12 Nov 2026)

1. **Hafs without word boxes:** never in production. `mushaf:publish hafs` refuses unless the boxes are approved. `--without-word-boxes` exists for local testing only: it refuses when `app()->environment('production')`.
2. **Who runs import and publish:** a manual one-off per release, documented in `docs/runbooks/` as part of step 11. **The developer authorised the coordinator to run them on production (12 Nov 2026, «ok you»).** That covers `mushaf:import`, `mushaf:build-word-boxes` and `mushaf:publish` only, and only after the gate passes and the developer has approved the word boxes. Nothing is added to `start-web.sh`. `content:ensure-packs` skips `svg_mushafs`. The source cache stays on the volume (ADR 0068).
3. **English riwayah names:** as in `apps/mobile/src/core/i18n/locales/en.json` `reader.mushafs.*` (step 8).
4. **`PRAGMA query_only = ON`** on a separate database is accepted as the read-only open.
5. **Wi-Fi only:** reuse the existing downloads setting. Do not add a new one.
6. **`quran_ws` source:** `permission_status` `not_required` (CC BY 4.0, attribution waived inside a product).
7. **Updates:** only on the reader's tap. Never silent.
8. **Resume:** deferred. A cancelled or failed download restarts from zero.

## Review (coordinator, 15 Nov 2026)

Built and accepted. The deviations the implementer reported are decided as follows:

1. **`--defer-pack`** dispatches `BuildContentPackJob`, as the A10 test says. `content:ensure-packs` keeps skipping `svg_mushafs`.
2. **Fingerprint order:** the version is bumped, the pack is built, and only then is the fingerprint stored. A failed build therefore never reads as «unchanged».
   - Known gap: with `--defer-pack` the fingerprint is stored at dispatch, so a failed queued build stays missing until the next change.
   - Step 11 runs `mushaf:publish` without `--defer-pack`, so this gap doesn't apply there.
3. **`--without-word-boxes`** is refused when the boxes are already approved, as well as in production.
4. **Pack download media type:** the contract now reads `application/octet-stream`. The app doesn't read it.
5. **`openapi-typescript`:** it isn't installed in the worktree's `node_modules` (the `packages/*` modules weren't copied), so the implementer ran 7.13.0 from a scratch folder. Run `npm ci` in the worktree before the next contract change.
6. **Mobile lint:** the only failure was the throwaway `app/dev-svg-spike.tsx`. The coordinator deleted it, with `assets/dev-spike/`, on 15 Nov 2026.
