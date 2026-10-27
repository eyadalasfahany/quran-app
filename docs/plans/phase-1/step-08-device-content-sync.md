# Step 8 — Device content sync (App)

Follow [README.md](README.md), especially the **shared contract** table. Needs steps 6 and 7 committed. Read also:
- Spec §7, hop 3.
- [ADR 0008](../../adr/0008-phase-1-content-decisions.md) (gzipped packs, decompressed with `fflate`).
- The step 6 types in `@quran/api-contract` (`ContentManifest`, `ContentChangesPage`).
- The step 7 code in `src/core/db/content/`.

**Goal:** the app keeps its selected resources current from our API. It downloads and imports packs atomically, and applies the change feed. Everything works offline from what's already imported.

## Dependencies

| Package | How | Version |
| --- | --- | --- |
| `expo-file-system` | `npx expo install expo-file-system` | Expo's pin (version table ~58.0.11) |
| `expo-crypto` | `npx expo install expo-crypto` | Expo's pin (~58.0.7). **Add a row to the `docs/content-plan.md` version table:** "SHA-256 of downloaded packs" |
| `fflate` | `npm install fflate@0.8.3 -w @quran/mobile` | 0.8.3 (version table, ADR 0008) |

## API client (`src/core/api/`)

- **`client.ts`:** `apiGet(path, { headers, signal })` on top of `apiBaseUrl()` (Phase 0).
  - Sends `Accept: application/json`, `Accept-Language` (the current locale from `src/core/i18n`), `X-Platform` (`ios` | `android`) and `X-App-Version` (from `expo-constants`).
  - `X-Device-Id` isn't sent yet. It arrives with device registration in Phase 4; mention it in the report rather than leaving a TODO comment.
- **`content.ts`**, typed only from `@quran/api-contract`:
  - `getManifest(etag?: string)` → `{ status: 304 } | { status: 200; etag: string; manifest: ContentManifest }`.
  - `getChanges({ resourceId, sinceVersion, cursor?, limit? })` → `{ status: 200; page: ContentChangesPage } | { status: 410 }`.
  - `packUrl(path)` resolves the manifest's relative `pack.url` against `apiBaseUrl()`.
  - Any other status throws `ApiError` (status plus the problem-details `code` when present).

## Sync engine (`src/core/sync/content-sync.ts`)

`syncContent(deps: ContentSyncDeps): Promise<ContentSyncReport>`, where every side effect is injected so it can be tested:
```ts
type ContentSyncDeps = {
  db: SqlExecutor;            // from step 7
  api: ContentApi;            // getManifest, getChanges, downloadPack(url, toPath)
  files: FileStore;           // cacheDir, readBytes, writeBytes, remove
  sha256: (bytes: Uint8Array) => Promise<string>;
  gunzip: (bytes: Uint8Array) => Uint8Array;   // fflate gunzipSync in production
  now: () => number;
  selection: () => number[];  // resource ids the reader wants
};
```

**Flow:**
1. **Manifest:** `getManifest(meta.manifest_etag)`.
   - `304`: set `installed_resources.last_checked_at = now` for every installed resource, and return.
   - `200`: store `manifest_etag` in `meta`.
2. **Removal:** a resource that is installed but no longer in the manifest, or `selection()` no longer includes it, has its rows deleted and its `installed_resources` row removed, in one transaction.
3. **For each selected resource in the manifest:**
   - **Installed, same `version`:** update `last_checked_at` only.
   - **Installed, `installed.version >= changes_since_min_version`:** the **change feed**. Page through `getChanges` from `since_version = installed.version`, collecting every page, then apply them all in **one transaction**:
     - An `upsert` is an `INSERT OR REPLACE` of the payload row into the entity's table.
     - A `delete` removes the row by the entity key, scoped to the resource.
     - Then set `installed_resources.version = manifest version`.
     - A `410` at any point falls through to the pack path.
   - **Not installed, below the floor, or `410`:** the **pack**.
     1. `downloadPack` to `cacheDir/packs/{id}-{version}.sqlite.gz`.
     2. `sha256` of the downloaded bytes must equal `manifest.pack.sha256`. **On mismatch, delete the file and skip this resource (no DB change).**
     3. `gunzip` the bytes and write `…/{id}-{version}.sqlite`.
     4. `ATTACH` it as `pack` and check `pack.meta.pack_schema_version = 1` and the `resource_id` match.
     5. In **one transaction**: delete the resource's existing rows from its group's tables (by `resource_id`; for mushafs and recitations through their `id` link), `INSERT INTO <table> SELECT <columns> FROM pack.<table>` for each group table, then upsert `installed_resources` (version, sha256, `last_checked_at`).
     6. `DETACH`, then delete both temp files.
4. **Isolation:** each resource is independent. One failure doesn't stop the others. Errors are collected into the report.
5. **Report:** `ContentSyncReport` lists, per resource: `skipped`/`unchanged`/`changes-applied`/`pack-imported`/`failed` (with the reason). Log it in `__DEV__` only.

**Shared mapping:** `src/core/sync/content-tables.ts` holds the group → tables → columns → key mapping from the README contract. The pack import and the change feed both use it. Nothing is hard-coded in two places.

**Default selection** (`src/core/sync/selection.ts`):
- The MMKV key `content.selectedResourceIds` (a number array). Add the key to `storageKeys`.
- When unset, the default is:
  - every `mushafs` resource;
  - the first `translations` and the first `tafsirs` resource whose `language_code` equals the app locale, falling back to `en`;
  - the first `chapter_recitations` resource.
- This is **provisional** until the Settings and download UI in Phase 2/3; say so in a comment.

**Triggers** (`src/core/sync/use-content-sync.ts`):
- Run once after `useContentDb().ready`, then again when the app returns to the foreground more than 6 h after the last successful run (`AppState`; keep the timestamp in MMKV).
- Never block rendering, never run twice at once, and swallow network errors (offline is normal).
- Mount it in `app/_layout.tsx`.

## Tests

Jest, with the `node:sqlite` `SqlExecutor` from step 7 and fakes for the API, files and clock. **Build real gzipped SQLite pack fixtures in the test** (node:sqlite plus `fflate.gzipSync`) using the shared-contract tables.

- **Fresh install:** a translation pack imports, its rows match, and `installed_resources` is set.
- **304:** only `last_checked_at` changes.
- **Same version:** no download.
- **Hash mismatch:** nothing changes in the DB and the temp file is removed.
- **Atomic import:** a failure in the middle (a pack with a missing table) leaves the previous rows of that resource intact.
- **Changes:** upsert and delete across 2 pages are applied in one transaction, and the version is updated.
- **410:** falls back to the pack.
- **Removal:** a resource dropped from the selection has its rows deleted.
- **Byte-exact:** a translation text with diacritics and an RLM is byte-identical after the pack import and after a change upsert.
- **Contract consistency:** `content-tables.ts` lists exactly the README contract (a guard test against drift).
- **Selection defaults:** for `ar` and `en`.

## Gates

The mobile gates, `npm run typecheck`, and `node .github/scripts/npm-audit.mjs`.

## Reviewer live check (not for the agent)

1. Local API running with packs built (steps 3–6 synced on prelive).
2. Simulator run: the default resources install.
3. Airplane mode, then relaunch: translation 85 still reads for Al-Fatihah and Al-Baqarah.
4. A `ROW_UPDATE` replayed through a test sync updates the device after a foreground.

## Leave untouched

`apps/api`, the API contract (consume only), the navigation shell and screens (only `app/_layout.tsx` mounts the hook), and i18n.
