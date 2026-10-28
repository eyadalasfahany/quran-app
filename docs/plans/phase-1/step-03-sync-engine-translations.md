# Step 3 — Sync engine, proven on translations (API)

> **Removed by ADR 0014 (28 Oct 2026):** Quran translations, word-by-word meanings, word chips and the translation panel, tab and settings. Lines below that mention them are history; do not build them.

Follow [README.md](README.md), especially the **shared contract** table. Needs steps 1 and 2 committed. Read also:
- Spec §7, hop 1.
- [`../phase-1.md`](../phase-1.md): the "What QF prelive actually gives us" section.
- The step 1 code in `app/Integrations/QuranFoundation/`.

**Goal:** the generic Content Sync engine (bootstrap, snapshots, mutations, resume, versioning, change feed) plus the `translations` handler. Other groups come in step 4, so build the engine generic, with one handler per group.

## Integration additions (`app/Integrations/QuranFoundation/`)

**`ContentCatalogClient`** (same auth, headers, retry and environment rules as step 1; reuse its HTTP plumbing, don't copy it):
- `translations(): list<CatalogEntry>` from `GET {api}/api/v4/resources/translations`.
  - Response: `{"translations": [{"id": 85, "name": "M.A.S. Abdel Haleem", "author_name": "Abdul Haleem", "slug": "en-haleem", "language_name": "english", "translated_name": {"name": "…", "language_name": "english"}}]}`.
- `tafsirs(): list<CatalogEntry>` from `GET {api}/api/v4/resources/tafsirs`.
  - Same shape, under `"tafsirs"`. `author_name` may be null.
- `CatalogEntry` is a readonly object: `id` int, `name` string, `authorName` ?string, `languageName` ?string, `slug` ?string.

## Domain code (`app/Domains/Content/`)

**Repository contracts and Eloquent implementations** (`Repositories/Contracts`, `Repositories/Eloquent`), bound in `ContentServiceProvider`:
- `ResourceRepository`, `SyncStateRepository`, `SyncRunRepository`, `ContentChangeRepository`, `TranslationEntryRepository`.
- Repositories do persistence only, with no transactions (arch rule).
- Bulk writes use `upsert`/`insert` in chunks of 500.

**`Sync/GroupHandler` interface:**
- `group(): ResourceGroup`.
- `replaceFromSnapshot(Resource $resource, Snapshot $snapshot): int` deletes every row for the resource, inserts all records, and returns the row count.
- `applyRow(Resource $resource, Mutation $mutation): ContentChangeData` handles `ROW_CREATE`/`ROW_UPDATE` (`op` upsert, payload = full row in the shared-contract columns) and `ROW_DELETE` (`op` delete, payload null).
- `ContentChangeData` (laravel-data) carries `entity`, `entityKey`, `op`, `payload`.

**`Sync/Handlers/TranslationsHandler`.** Snapshot and row records look like:
```json
{"id": 401704, "resource_content_id": 85, "verse_id": 1, "verse_key": "1:1", "chapter_id": 1,
 "verse_number": 1, "language_name": "english", "text": "In the name of God, …",
 "foot_notes": [], "resource_id": 85, "updated_at": "…"}
```
- **Row mapping:**
  - `verse_id` ← `verse_id`
  - `verse_key` ← `verse_key`
  - `text` ← `text`, **byte for byte**
  - `footnotes` ← `foot_notes` (an empty array is stored as null)
  - `source_record_id` ← `id`
- **Change rows:** `entity` = `translation_entry`, `entity_key` = `verse_id`.
- **`ROW_DELETE`:** the row key is `record_key` if numeric, else `source_record_id`. If neither identifies a row, throw `SyncException`.
- **Unknown record shapes** (missing `verse_id` or `text`) throw `SyncException`. Never guess.

**`Services/ContentSyncService::run(ResourceGroup $group, string $resourcesFilter): SyncRunResult`:**
1. Load or create `sync_states` for (current QF environment, group). `bootstrap = sync_token === null`. Create a `sync_runs` row (`running`).
2. Iterate `ContentSyncClient::sync($resourcesFilter, $token, $bootstrap)` page by page. Inside a page, mutations must be strictly ascending by `sequence`; out of order throws `SyncException`.
3. **Skip** any mutation with `sequence <= sync_states.last_sequence`, so replays are idempotent.
4. **Resolve the resource:**
   - `resources` row by (`qf` source, `group`, `source_key = resource_id`). Create it on `RESOURCE_CREATE`.
   - Metadata comes from the catalog: `name`, `author_name`, `language_name`, `language_code` (via `LanguageCode::fromQfName()`), `direction`.
   - **`LanguageCode::fromQfName()` map:** arabic→ar, english→en, urdu→ur, persian→fa, indonesian→id, turkish→tr, french→fr, bengali→bn, spanish→es, russian→ru, german→de, malay→ms, chinese→zh; anything else → null.
   - **`direction`:** `rtl` for ar, ur and fa; otherwise `ltr`.
   - Fetch the catalog **once per run**, lazily.
5. **Apply** each mutation **in its own `DB::transaction`**, which also sets `sync_states.last_sequence = sequence`:
   - **`RESOURCE_CREATE` / `RESOURCE_INVALIDATE`:**
     - If `unavailable_reason` is set: `is_active = false`, store the reason, no snapshot.
     - Otherwise fetch the snapshot **before** opening the transaction. Inside it: `replaceFromSnapshot`, bump the version (below), set `changes_floor_version = version`, `source_sequence = snapshot.sync_sequence`, `synced_at = now`, `is_active = true`.
   - **`RESOURCE_DELETE`:** `is_active = false`, bump the version, set `changes_floor_version = version`.
   - **`RESOURCE_UPDATE`:** refresh the catalog metadata only. No version bump.
   - **`ROW_*`:** the resource must exist (otherwise `SyncException`). Call `applyRow`, bump the version, and write a `content_changes` row (`version` = the resource's current run version).
   - **Version bump:** at most **once per resource per run**. The first touch in a run sets `version = version + 1`; later touches in the same run reuse that number.
6. After the **last** page, in one transaction: store `next_sync_token`, set `last_success_at`, clear `last_error`, and finish the run `ok` with `mutations_applied`.
7. **On any exception:**
   - The run becomes `failed` with the message, and `sync_states.last_error` is set.
   - Rethrow.
   - The token is **not** advanced, so a rerun resumes after the last committed `last_sequence`.
8. After the run commits, dispatch `Events/ResourceContentChanged(resourceId, version)` once per touched resource (step 6 listens).

**Other components:**
- **Job:** `Jobs/SyncQuranFoundationJob(ResourceGroup $group, string $filter)`. Queue `sync`, `ShouldBeUnique` per group, `tries = 1`. It calls the service.
- **Artisan command:** `content:sync {group} {--resources=}`. Runs synchronously. The filter defaults to `config('quran.sync.groups.<group>')`. It prints the run summary (mutations applied, resources touched, rows), never record text.
- **Config:** add `sync.groups` to `config/quran.php` with `translations => 'translations:*'` (step 4 adds the others).
- **Schedule** (`routes/console.php`): each configured group daily at 02:00 UTC, dispatching the job.

## Tests

`tests/Feature/Content/`, MySQL `RefreshDatabase`, `Http::fake` with `preventStrayRequests`. Fixtures are tiny files under `tests/Fixtures/qf/` in the shapes above: a snapshot with 3 records and a catalog with 2 entries.

- **Bootstrap:**
  - The `RESOURCE_CREATE` for `translations:85` gives 3 rows.
  - The resource gets `version` 1, `changes_floor_version` 1, its name, author and language from the catalog.
  - The token and `last_sequence` are stored, and the run is `ok`.
- **Rerun with the stored token and no mutations:** nothing changes, the version stays the same, and `sync_token` is sent instead of `bootstrap`.
- **Row mutations:** a `ROW_UPDATE` changes one row's text and writes an `upsert` change with version 2. A `ROW_DELETE` deletes the row and writes a `delete` change (payload null).
- **One bump per run:** two `ROW_UPDATE`s for the same resource in one run share one version.
- **`RESOURCE_INVALIDATE`:** replaces every row and raises `changes_floor_version`.
- **`RESOURCE_DELETE`:** sets `is_active` false.
- **Unavailable:** a mutation with `unavailable_reason` sets `is_active` false and fetches no snapshot (assert no snapshot request).
- **Resume:**
  - The second mutation's snapshot returns 500 on every retry, so the run fails.
  - `last_sequence` equals the first mutation's sequence, and the token is not stored.
  - The rerun (fixed fake) does not reapply the first mutation (assert its snapshot isn't requested again), and the run completes.
- **Paging:** two pages are applied in order, and the token comes from the final page only.
- **Ordering:** a page with descending sequences throws `SyncException`.
- **Byte-exact:**
  - A record whose text has diacritics, a ZWJ/RLM and a double space is stored with identical `bin2hex`.
  - The `content_changes.payload.text` is identical too.
- **Events:** `ResourceContentChanged` is dispatched once per touched resource (`Event::fake`).
- **Unit tests:** `LanguageCode::fromQfName` for every mapped name, plus null for an unknown one.
- **Arch:** the arch tests stay green. Services don't use HTTP; repositories have no transactions.

## Reviewer live check (not for the agent)

`php artisan content:sync translations --resources="translations:85"` gives 293 `translation_entries` rows for resource 85.

## Leave untouched

The step 2 migrations (add **new** migrations only if a column is truly missing, and report it), `app/Domains/Sync`, `apps/mobile`, `packages/`, and `composer.json`.
