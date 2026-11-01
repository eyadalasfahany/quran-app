# Railway release (API)

ADR 0022 (Railway), ADR 0031 §11 (Azkar in production). The API service deploys from `apps/api/railway.json`, built from `apps/api/docker/Dockerfile`.

## What runs, in order

Each deploy runs the release once, as Railway's **pre-deploy command**, before the new version starts. The command is set in `apps/api/railway.json` (`deploy.preDeployCommand`):

```
/usr/local/bin/entrypoint.sh /usr/local/bin/release.sh
```

`docker/release.sh` runs these steps and stops at the first failure. A failed pre-deploy stops the deploy; the previous version keeps serving.

1. **`php artisan migrate --force`.** Schema changes are additive in production (CLAUDE.md).
2. **`php artisan azkar:import --download --if-unlocked --build-packs`.**
   - **While locked** (the default in production: `AZKAR_OPENDUA_IMPORT_ENABLED=false` or the `opendua` source is not `granted`): prints the reasons and exits **0**. Nothing is downloaded or written.
   - **When unlocked:** downloads the pinned catalogue into `storage/app/azkar/` and checks its SHA-256 against `azkar.opendua.catalogue_sha256` before writing anything. It validates every record, replaces the `azkar` rows in one transaction, bumps the resource version, and builds the `azkar` pack **in this process** (not on the queue, so the deploy log shows the result). Any validation error, pin mismatch or pack failure exits non-zero and fails the deploy.

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

Each run prints `mutations_applied`, `resources_touched` and `rows`. Horizon builds the packs; `GET /api/v1/content/manifest` then lists each resource with its version, size and SHA-256.

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
