# Railway release (API)

ADR 0022 (Railway), ADR 0031 §11 (Azkar in production). The API service deploys from `apps/api/railway.json`, built from `apps/api/docker/Dockerfile`.

## What runs, in order

Each deploy runs the release once, as Railway's **pre-deploy command**, before the new version starts. The command is set in `apps/api/railway.json` (`deploy.preDeployCommand`):

```
/usr/local/bin/entrypoint.sh /usr/local/bin/release.sh
```

`docker/release.sh` runs these steps and stops at the first failure. A failed pre-deploy stops the deploy; the previous version keeps serving.

1. **`php artisan migrate --force`.** Schema changes are additive in production (CLAUDE.md).
2. **`php artisan azkar:import --download --if-unlocked --defer-pack`.** Railway's pre-deploy container has **no volume**, so nothing here may write a pack file (ADR 0044).
   - **While locked** (the default in production: `AZKAR_OPENDUA_IMPORT_ENABLED=false` or the `opendua` source is not `granted`): prints the reasons and exits **0**. Nothing is downloaded or written.
   - **When unlocked:** downloads the pinned catalogue into `storage/app/azkar/` and checks its SHA-256 against `azkar.opendua.catalogue_sha256` before writing anything. It validates every record, replaces the `azkar` rows in one transaction, and bumps the resource version. It neither builds nor queues the pack. Any validation error or pin mismatch exits non-zero and fails the deploy.

**Web start (`docker/start-web.sh`, API service only):** runs `php artisan content:ensure-packs`, then FrankenPHP. This builds the new azkar pack and any other missing pack on the volume. A failure prints `FAIL <id>` in the deploy log and the API still starts; the manifest leaves that resource out until it is rebuilt.

The entrypoint (`docker/entrypoint.sh`) also runs `config:cache` and `migrate --force` at container start, so the same migrations run again harmlessly. It does not seed.

## What never runs in production

- No seeders. `DatabaseSeeder` throws when `APP_ENV=production`. `ContentSourceSeeder` is not called by the release.
- No factories and no development fixtures (`EXPO_PUBLIC_AZKAR_DEV_FIXTURES` is a mobile build flag and never reaches the API).
- `azkar:source-permission` refuses in production. It only sets the `opendua` source in a local database.
- The Quran reference map only accepts rows marked `reviewed` in production (`config/azkar_quran_map.php`). A `candidate` or `unmatched` row blocks the entry.

## Services

| Railway service | Config | Role |
| --- | --- | --- |
| API | `apps/api/railway.json` | Web (FrankenPHP). Pre-deploy: the release above. |
| Horizon | `apps/api/railway-horizon.json` | Queue workers (`default`, `packs`). Pack builds queued by other code run here. |
| Scheduler | `apps/api/railway-scheduler.json` | `schedule:work`. |

The release builds the azkar pack synchronously, so it does not depend on Horizon. Horizon still processes the queued `BuildContentPackJob` that the content listeners dispatch.

## Environment (Railway variables)

Set on the API service unless noted. The QF variables go on the API, Horizon and Scheduler services: the scheduler dispatches `SyncQuranFoundationJob`, and Horizon runs it and `BuildContentPackJob`.

| Variable | Production value | Notes |
| --- | --- | --- |
| `APP_ENV` | `production` | Enables every production guard above. |
| `AZKAR_OPENDUA_IMPORT_ENABLED` | `false` until OpenDua confirms in writing | ADR 0031 §1. |
| `QF_ENV` | `production` | API, Horizon, Scheduler. Selects `oauth2.quran.foundation` and `apis.quran.foundation` (`config/quran.php`). |
| `QF_CLIENT_ID` | QF production client ID | API, Horizon, Scheduler. Same pair as local `apps/api/.env` (ADR 0041); never in git. |
| `QF_CLIENT_SECRET` | QF production client secret | API, Horizon, Scheduler. |
| `QF_CONTACT_EMAIL` | set | API, Horizon, Scheduler. Used in the download User-Agent. |

## First QF production sync

**Deploy the sync fixes first** (1 Nov 2026). Production QF returns bootstrap mutations unsorted, and some Arabic tafsirs (90, 93, and all of 925) have records with a null `group_tafsir_id`. A build without the ordering fix in `ContentSyncService` and the group-leader fallback in `TafsirsHandler` fails `content:sync tafsirs` on production. In the chapter reciters, 3, 5 and 19 each carry a "Dua.mp3" file with no chapter and no URL, and 168 has four ayah timings with no valid range (33:7, 33:8, 36:40, 101:3). `ChapterRecitationsHandler` skips both with a warning. A build without that fails `content:sync chapter_recitations`.

The production mirror has its own sync tokens (`sync_states` is keyed by environment), so the first run bootstraps from QF snapshots. The scheduler runs every group in `quran.sync.groups` daily at 02:00 UTC. To start sooner, from a shell in the API container (`railway ssh`):

```bash
php artisan qf:ping
php artisan content:sync tafsirs
php artisan content:sync mushafs
php artisan content:sync chapter_recitations
```

Command-line PHP in the image has a 1 GB memory limit (`$PHP_INI_DIR/php-cli.ini`, set in `docker/Dockerfile`). On an image built before that, add `-d memory_limit=1G` after `php`, or the tafsir and reciter snapshots fail with "Allowed memory size of 134217728 bytes exhausted". There is no Horizon service yet, so after a manual sync build the packs with `php artisan queue:work redis --queue=packs,default --stop-when-empty --tries=1`.

Each run prints `mutations_applied`, `resources_touched` and `rows`. Horizon builds the packs; `GET /api/v1/content/manifest` then lists each resource with its version, size and SHA-256.

**Pack files live on the `local` disk** (`storage/app/private/packs/`). Railway’s container filesystem is ephemeral: a redeploy without a mounted volume drops every `.sqlite.gz` while MySQL still has `content_packs` rows. The manifest then advertises packs that return 404 and the app cannot install reciters or tafsirs. Mount a Railway volume on `/app/storage/app/private` (or the image’s equivalent) on the **API** service so packs survive deploys. After any deploy that lost files, rebuild from a shell in the API container:

```bash
php artisan content:ensure-packs --prune-orphans
```

On an image **before** `content:ensure-packs` shipped, prune then build per resource (pass the id as a **string** to `Artisan::call`):

```bash
php artisan tinker --execute 'App\Domains\Content\Models\ContentPack::query()->cursor()->each(function ($p) { if (! Illuminate\Support\Facades\Storage::disk("local")->exists($p->path)) { $p->delete(); } });'
php artisan tinker --execute 'App\Domains\Content\Models\Resource::query()->where("is_active", true)->orderBy("id")->pluck("id")->each(fn (int $id) => Artisan::call("content:build-pack", ["resource_id" => (string) $id]));'
```

If packs still 404 after a rebuild loop, the gzip was never written. On the API shell, confirm the volume mount and that files exist:

```bash
php artisan tinker --execute 'echo storage_path("app/private/packs");'
ls -la storage/app/private/packs 2>/dev/null | head
```

The mount path must be **`/app/storage/app/private`** (not `storage/app/private` relative to the wrong root). Spot-check: `curl -I "https://<api>/api/v1/content/packs/<resource_id>/<version>"` should be `200` with `Content-Type: application/gzip`.

## Unlocking Azkar in production

This is a reviewed change, never a command on the server:

1. ~~OpenDua confirms the rights in writing.~~ Done: ADR 0038 accepts OpenDua's public statements.
2. ~~A migration sets the `opendua` row in `content_sources` to `granted`.~~ Done: `2026_11_01_100015_grant_opendua_content_source` (ADR 0038).
3. `APP_ENV=production` is set on the API service. Without it the importer applies local rules and accepts `candidate` map rows.
4. The reviewed Quran reference map has every row `reviewed` (no `candidate` or `unmatched` row remains; `php artisan azkar:quran-map-candidates` shows the counts). Review sheet: `docs/plans/phase-6/quran-map-review.md`.
5. `AZKAR_OPENDUA_IMPORT_ENABLED=true` is set on the API service.
6. The next deploy imports and builds the pack. The import report is in `storage/app/azkar/reports/` inside the container, and the console summary is in the deploy log.

## Checking a deploy

- Deploy log, pre-deploy step: `Azkar import skipped: the wet import is locked.` is expected until the unlock above (now only the import flag keeps it locked).
- When unlocked: the summary table, `Status: imported`, and `pack` in the report (`version`, `sha256`, `size_bytes`, `row_count`).
- `GET /api/v1/content/manifest` lists the `azkar` resource once its pack exists.

## Rolling back the content

The azkar pack is versioned. To stop serving Azkar content without a code rollback, set `AZKAR_OPENDUA_IMPORT_ENABLED=false` (the next deploy skips the import) and set the `opendua` source back to `pending` in a reviewed migration. The pack builder then refuses to build a new Azkar pack.
