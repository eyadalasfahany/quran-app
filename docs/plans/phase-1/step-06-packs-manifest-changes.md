# Step 6 — Packs, manifest and change feed (API + contract)

Follow [README.md](README.md), especially the **shared contract** table: pack tables and columns must match it exactly. Needs steps 3 and 4 committed. Read also:
- Spec §7, hop 2.
- Spec §8 (conventions: envelope, problem details, cursors, caching, rate limits).
- Spec §9 (the `/content/*` rows and the manifest example).
- ADR 0006 (API Resources) and ADR 0008 (gzipped packs).

**Goal:** build a gzipped SQLite pack per resource version, and serve the manifest, the packs and the change feed.

## Pack builder (`app/Domains/Content/`)

**`Packs/PackBuilder::build(Resource $resource): ContentPackData`:**
1. **Create** a temporary SQLite file (PDO `sqlite`; `pdo_sqlite` is available, no packages) in `storage/app/tmp/`.
2. **Tables:**
   - `meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)` with `pack_schema_version` = `1`, `resource_id`, `group`, `version`, `built_at` (ISO 8601 UTC).
   - The resource group's tables from the shared contract. Integers are `INTEGER`, text and JSON are `TEXT`, flags are `INTEGER` 0/1. Primary keys:
     - `translation_entries` (`resource_id`,`verse_id`) Translation parts removed by ADR 0014 (28 Oct 2026).
     - `tafsir_entries` (`resource_id`,`group_tafsir_id`)
     - `mushafs` (`id`)
     - `mushaf_pages` (`mushaf_id`,`page_number`)
     - `word_layouts` (`mushaf_id`,`word_id`)
     - `recitations` (`id`)
     - `chapter_audio_files` (`id`)
     - `recitation_timings` (`audio_file_id`,`verse_id`)
3. **Copy** the resource's rows from MySQL in chunks of 1,000, in one SQLite transaction. Text is copied **byte for byte**; JSON columns are written as their JSON text.
4. **Compact:** `VACUUM`, close.
5. **Compress and store:** `gzencode($bytes, 9)` → `storage/app/packs/{resource_id}/{version}.sqlite.gz` on the `local` disk.
6. **Record** a `content_packs` row: `size_bytes` and `sha256` of the **gz file**, `row_count` (all rows excluding `meta`), `schema_version` = 1. Delete the temp file.
7. **Idempotent:** if a `content_packs` row for (resource, version) already exists, return it without rebuilding.

**Supporting pieces:**
- **`Jobs/BuildContentPackJob(int $resourceId)`** on queue `packs`. It builds the pack for the resource's **current** version. A failure leaves earlier packs untouched (the manifest keeps serving the last good one).
- **`Listeners/QueuePackBuild`** on `ResourceContentChanged` (from step 3) dispatches the job.
- **Artisan command:** `content:build-pack {resource_id}` (synchronous).
- **`Jobs/PruneContentChangesJob`:** deletes `content_changes` rows older than 30 days. Scheduled daily.

## Endpoints

Domain `Content`, routes in `ContentServiceProvider` (`api/v1` prefix, name `v1.`), as in `Domains/Sync`. Responses are API Resources with `$wrap = null`. Errors come from the existing problem-details renderer. Add a named rate limiter `content` (300/min per IP) to all three.

**`GET /content/manifest`**
```json
{"generated_at": "2026-10-27T02:14:00.000Z", "pack_schema_version": 1,
 "resources": [
   {"id": 12, "group": "translations", "name": "M.A.S. Abdel Haleem", "author_name": "Abdul Haleem", Translation parts removed by ADR 0014 (28 Oct 2026).
    "language_code": "en", "direction": "ltr", "version": 3,
    "pack": {"url": "/api/v1/content/packs/12/3", "size_bytes": 81234, "sha256": "…"},
    "changes_since_min_version": 2}]}
```
- **Which resources:** active ones that have at least one built pack. `version` = the **latest built pack's** version, not `resources.version`.
- **Fields:** `changes_since_min_version` = `changes_floor_version`. `generated_at` = the newest `built_at` among the listed packs, so the body is stable between builds.
- **Ordering:** by `group`, then `id`.
- **Caching:** strong `ETag` = `"` + sha256 of the response body + `"`. `If-None-Match` matching it → `304` with no body. `Cache-Control: public, max-age=300`.

**`GET /content/packs/{resource}/{version}`**
- Streams the gz file: `Content-Type: application/gzip`, `Content-Length`, `Cache-Control: public, max-age=31536000, immutable`, `ETag` = `"`sha256`"`.
- An unknown resource or version, or an inactive resource → problem details 404.
- (Spec §9 says 302 to a cached file; that comes when a CDN exists. Note it in the report.)

**`GET /content/changes?resource_id=&since_version=&cursor=&limit=`**
- **Validation** (FormRequest): `resource_id` required, an existing active resource. `since_version` required, int ≥ 0. `limit` int 1–500, default 50. `cursor` opaque (base64url of the last change `id`); invalid → 422.
- **`410` Gone** (problem details, `code` = `changes_gone`) when `since_version < changes_floor_version`, or when changes after `since_version` have been pruned. The device then downloads the pack.
- **Response:** `{"data": [{"id": 123, "version": 3, "entity": "translation_entry", "entity_key": "5", "op": "upsert", "payload": {…}}], "next_cursor": "…"|null}`. Changes have `version > since_version`, ordered by `id`, after the cursor. Translation parts removed by ADR 0014 (28 Oct 2026).
- **Caching:** `Cache-Control: public, max-age=60`.

## Contract

- Run `npm run generate -w @quran/api-contract`, and commit `openapi.json` and `src/schema.d.ts`.
- The export must pass `--fail-on-unknown`. Add `#[Response]` attributes for the 304, 404 and 410 cases.
- Export named types from `packages/api-contract/src/index.ts`: `ContentManifest`, `ContentManifestResource`, `ContentChangesPage`, `ContentChange`. Derive them from `paths[...]`, like `HealthResponse`.

## Tests

Feature tests on MySQL. Use `Storage::fake('local')` where needed, and factories or rows inserted directly (no QF calls).

**Pack builder:**
- **Files and rows:** the pack file exists, its sha256 and size match the `content_packs` row, and gunzipping gives an SQLite database whose `meta` and tables are as specified, with the expected row counts.
- **Byte-exact:** a translation text with diacritics and an RLM is byte-identical inside the pack (`bin2hex`). Translation parts removed by ADR 0014 (28 Oct 2026).
- **Every group:** one test per group (translations, tafsirs, mushafs, chapter_recitations) checks the table columns equal the shared contract. Translation parts removed by ADR 0014 (28 Oct 2026).
- **Idempotent:** building the same version twice keeps one row.
- **Failure:** a failing build (e.g. an unwritable disk) leaves the previous pack and the manifest unchanged.
- **Listener:** `ResourceContentChanged` dispatches `BuildContentPackJob` (`Queue::fake`).

**Manifest:**
- 200 with the shape above.
- Inactive resources and resources without a pack are excluded.
- `version` is the latest pack's.
- The ETag stays the same across requests, and `If-None-Match` gives 304.
- `Cache-Control` is set.

**Packs:** 200 with the headers above; 404 problem details.

**Changes:**
- Paging with `limit` and `next_cursor` across 3 pages.
- Only `version > since_version`.
- 410 when below the floor, with `code` `changes_gone`.
- 422 for a bad cursor or a missing `resource_id`.
- 429 after the rate limit (lower the limit in the test via config).

**Prune job:** deletes only changes older than 30 days.

## Gates

`composer qa`, `npm run generate -w @quran/api-contract`, `cd apps/mobile && npx tsc --noEmit`, and `npm run typecheck`.

## Reviewer live check (not for the agent)

Run `content:build-pack` for translation 85, then `curl` the manifest (200, then 304 with the ETag), download the pack, and check its sha256 and the 293 rows inside. Translation parts removed by ADR 0014 (28 Oct 2026).

## Leave untouched

The sync engine semantics, the migrations (unless a column is missing: report it), and `apps/mobile` app code (only the type check runs there).
