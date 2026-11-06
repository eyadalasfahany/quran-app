# Railway release (API)

ADR 0022 (Railway), ADR 0040 (volume, audio and packs on the API service), ADR 0045 (features enabled by default: no environment switches). The API service deploys from `apps/api/railway.json`, built from `apps/api/docker/Dockerfile`.

## Where each piece of work runs

Three phases run in three containers. They do different work because only one of them has the volume.

| Phase | Config | Container | Volume | Does |
| --- | --- | --- | --- | --- |
| Pre-deploy (release) | `deploy.preDeployCommand` → `docker/release.sh` | a fresh container, discarded afterwards | **no** | `migrate --force` only (B1, 2 Nov 2026) |
| Container start (web) | `deploy.startCommand` → `entrypoint.sh start-web.sh` | the serving container | **yes**, at `/app/storage/app/private` | `config:cache` (entrypoint); `azkar:audio-verify`; the two pinned snapshots; `azkar:import --download --defer-pack` (DB rows); `duas:snapshot hadeethenc --pinned` and `duas:import --download --defer-pack` (DB rows); `mp3quran:import --defer-pack` and `recitation-timings:import --defer-pack` (committed manifest and timing files, ADR 0060/0061); `content:ensure-packs` (builds any missing pack); then `exec frankenphp` |
| Worker services | `railway-horizon.json`, `railway-scheduler.json` | not deployed (see below) | would need it | nothing today |

A failed pre-deploy (a migration error) stops the deploy; the previous version keeps serving. A failed container start (for example a healthcheck timeout) fails the new deployment and the previous one keeps serving. Start-time tasks log and continue, so a missing file never blocks Quran reading, and a failed snapshot or Azkar download warns and keeps the current Azkar version (ADR 0044, amended 2 Nov 2026). An Azkar pack that lists a missing recording is never built (ADR 0040, fail closed).

### The pre-deploy step (`docker/release.sh`)

1. `php artisan migrate --force`. Schema changes are additive in production (CLAUDE.md). This is the only pre-deploy step: the Azkar import moved to web start on 2 Nov 2026, because the import reads the audio files on the volume that only the web container mounts (ADR 0044, amended).

   **6 Nov 2026:** Railway's deployments showed no pre-deploy command (`serviceManifest.deploy.preDeployCommand` was empty although `railway.json` sets it), so this step had not run since 1 Nov and production was 18 migrations behind; every import on web start failed. The migrations were run by hand over `railway ssh`, and `docker/start-web.sh` now runs `migrate --force` first and stops the start if it fails. Check after a deploy with `railway ssh -- sh -c 'cd /app && php artisan migrate:status --pending'`.

### The Azkar import at web start (`docker/start-web.sh`, before `content:ensure-packs`)

1. `php artisan azkar:snapshot hisnmuslim --pinned` and `php artisan azkar:snapshot hadeethenc --pinned`. Each fetches the configured snapshot date and keeps it only if its manifest SHA-256 is the pin in `config/azkar.php`. A failure prints a warning and the start continues. The import then runs without that secondary: the import report says so (`sourced.required_count_secondary.used = false`, with the reason), and HadeethEnc notes are left out with a reason.
2. `php artisan azkar:import --download --defer-pack`. It downloads the pinned OpenDua catalogue and checks its SHA-256 before writing anything. It validates every record. A validation error, a checksum mismatch, a reviewed-map failure or a failed download prints a warning, writes nothing and keeps the current Azkar version serving (the start continues). When the content changed, it replaces the `azkar` rows in one transaction and bumps the version. When it did not change, it prints `unchanged` and writes nothing. It builds no pack (`--defer-pack`); `content:ensure-packs` does that in the same start.

### The web container start (`docker/start-web.sh`)

1. Creates `storage/app/private/packs` and `storage/app/private/azkar-audio` on the volume, and `storage/app/tmp` and `storage/app/azkar/reports` in the container.
2. `php artisan azkar:audio-verify`: presence and size of the 238 shipped recordings (fast). A failure logs which files are missing. Use `--full` by hand to hash them too.
3. `php artisan azkar:snapshot hisnmuslim --pinned` and `php artisan azkar:snapshot hadeethenc --pinned`. When the folder on the volume already matches every pinned file SHA-256, the command logs `already pinned` and skips the download (same pin check as above).
4. `php artisan azkar:import --download --defer-pack` (see «The Azkar import at web start»).
5. `php artisan duas:snapshot hadeethenc --pinned`. The Duas HadeethEnc pin (`config/duas.php`, date and SHA-256) differs from Azkar's, so this is a second fetch into `storage/app/duas/hadeethenc`, not a reuse of step 3. A snapshot already on the volume that matches its pin is kept with `Snapshot already pinned`. A failure prints a warning and the Duas import runs without it.
6. `php artisan duas:import --download --defer-pack`. It writes the Duas rows (DB only; no pack). Unchanged content prints `unchanged` and bumps nothing. A refused import (reviewed Quran map, pin or validation) prints a warning and the current Duas version keeps serving.
7. `php artisan mp3quran:import --defer-pack`. It reads `resources/mp3quran/manifest.json` and writes the MP3Quran recitation rows (one resource per moshaf, one file per surah). No network and no storage credential. A refused moshaf prints a warning and the current MP3Quran version keeps serving.
8. `php artisan recitation-timings:import --defer-pack`. It reads `resources/recitation-timings/**` and writes the Taybah timing rows (ADR 0060). It skips and names any file whose audio URL, ayah rows or word layouts do not match, and the current versions keep serving. A rerun with unchanged files bumps nothing.
9. `php artisan content:ensure-packs`: builds every active resource pack whose row is missing or whose file is gone, Quran packs included. When nothing changed it only checks files, so it is quick. The first start after a volume is attached builds every pack in the foreground, which can take minutes (see «Volume and audio, first time»). Bumping many recitations in one deploy (for example the first import of many reciters) builds all their packs here, before the health check passes (ADR 0044's consequence); a larger batch can time out the 120 s check, and then `php artisan content:ensure-packs` from a shell finishes it.
10. `exec frankenphp run --config /etc/caddy/Caddyfile`.

`entrypoint.sh` never runs the Azkar work and is never edited for it: Horizon and the scheduler share it.

## Railway services

| Railway service | Config | Status |
| --- | --- | --- |
| API | `apps/api/railway.json` | Web (FrankenPHP). One replica. Volume at `/app/storage/app/private`. Pre-deploy: the release above. Start: `start-web.sh`. Health check `GET /up`, timeout 120 s. |
| Horizon | `apps/api/railway-horizon.json` | **Not deployed** while the API has a volume. A worker service cannot share it, so a pack built there would never be served. `QUEUE_CONNECTION=sync` builds packs inline. |
| Scheduler | `apps/api/railway-scheduler.json` | **Not deployed** for the same reason. Its work (the QF sync) runs by hand through `railway ssh` until object storage replaces the volume (a new ADR). |

ADR 0022 is amended by ADR 0040. Volumes and replicas exclude each other, so the API has one replica and each deploy has a short outage.

## Environment (Railway variables)

Set on the API service unless noted.

| Variable | Production value | Notes |
| --- | --- | --- |
| `APP_ENV` | `production` | Enables the production guards (reviewed Quran map rows only; no seeders). |
| `APP_URL` | `https://quranmobile-production.up.railway.app` | ADR 0022. Nothing in the API builds absolute URLs for audio or packs: `remote_url` is a relative path (`/api/v1/azkar/audio/0.0.2/OD-001.mp3`), so the value only affects the `public` disk and links. Set it anyway. |
| `QUEUE_CONNECTION` | `sync` | With no worker, `database` or `redis` would queue jobs that never run (ADR 0040). |
| `FILESYSTEM_DISK` | `local` (leave the default) | Packs use the `local` disk; audio uses the `azkar_audio` disk, which is always on. |
| `DORAR_API_BASE_URL`, `DORAR_API_TOKEN` | set when Dorar is granted; empty until then | ADR 0045: Dorar is used whenever both are set, and is the null source otherwise. A credential, not a switch. |
| `QF_ENV` | `production` | API. Selects `oauth2.quran.foundation` and `apis.quran.foundation` (`config/quran.php`). |
| `QF_CLIENT_ID`, `QF_CLIENT_SECRET` | QF production values | API. Never in git (ADR 0041). |
| `QF_CONTACT_EMAIL` | set | API. Used in the download User-Agent. |

There are **no** Azkar, HadeethEnc, hisnmuslim, audio or Dorar enable switches. Nothing turns Azkar on or off with a variable (ADR 0045, 2 Nov 2026). The `content_sources` rows keep their `permission_status` as provenance; it does not gate anything.

## Volume and audio, first time (developer, Railway dashboard and `railway ssh`)

The volume holds the packs and the 238 Azkar recordings (about 55 MiB). Choose a size that also holds the Quran packs; check the manifest sizes after the first sync.

1. **Attach the volume** to the API service: mount path **`/app/storage/app/private`**, one replica. (Production has used this path since setup; the packs and the Azkar audio live under it. Anything else under `storage/app` is rebuilt or re-fetched on start.)
2. **Set the variables** above (`APP_URL`, `QUEUE_CONNECTION=sync`, `APP_ENV=production`). Confirm replicas = 1. Do not create the Horizon or Scheduler services.
3. **Deploy.** Expect a short outage. Verify persistence: `railway ssh`, then `echo ok > storage/app/private/.volume-check`, redeploy, `cat storage/app/private/.volume-check`, then delete the file.
4. **Copy the recordings** (one-time; resumable; each file is checked against the manifest's size and SHA-256):
   ```bash
   php artisan azkar:audio-sync
   php artisan azkar:audio-verify --full
   ```
   Expect `shipped 238`, `verified 238`, `missing 0`. Rerun `azkar:audio-sync` if it was interrupted. It skips files already verified.
   The recording rows follow the files, so the import in step 5 must run after this step.
5. **Write the recording rows and build the pack.** The import writes a recording row only for a file that is on the volume, so the import must run again after step 4, and the pack is then built at start:
   ```bash
   php artisan azkar:import --download --defer-pack
   php artisan content:ensure-packs
   ```
   The import prints `imported` with the recording count (`gated.recordings.imported`, expect 238). Its fingerprint changes once the files exist, so the next start's import also picks them up. A redeploy does the same without a shell: the web start imports the rows and builds the pack.
6. **Smoke tests** (see «Checking a deploy»).

## What never runs in production

- No seeders. `DatabaseSeeder` throws when `APP_ENV=production`. `ContentSourceSeeder` is not called by the release.
- No factories and no development fixtures (`EXPO_PUBLIC_AZKAR_DEV_FIXTURES` was removed, ADR 0045).
- No `azkar:source-permission`. The command is removed (removed 2 Nov 2026, ADR 0045).
- The Quran reference map only accepts rows marked `reviewed` in production (`config/azkar_quran_map.php`). A `candidate` or `unmatched` row blocks its entry.
- No Azkar pack is built by the pre-deploy container (`--defer-pack`).

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

**Pack files live on the `local` disk** (`storage/app/private/packs/`). Railway’s container filesystem is ephemeral: a redeploy without a mounted volume drops every `.sqlite.gz` while MySQL still has `content_packs` rows. The manifest then advertises packs that return 404 and the app cannot install reciters or tafsirs. The API service volume is mounted at `/app/storage/app/private` (ADR 0040), so the packs under `storage/app/private/packs` survive deploys. After any deploy that lost files, rebuild from a shell in the API container:

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

The mount path is **`/app/storage/app/private`** (ADR 0040); the packs are under `storage/app/private/packs` inside it. Spot-check: `curl -I "https://<api>/api/v1/content/packs/<resource_id>/<version>"` should be `200` with `Content-Type: application/gzip`.

## Azkar in production (ADR 0031, 0040, 0045)

Azkar is on. There is no switch. What decides the content:

1. The `opendua` catalogue matches its pinned SHA-256 (`azkar.opendua.catalogue_sha256`) and validates.
2. The reviewed Quran reference map has every row for the shipped entries `reviewed`. Production refuses any other row, so the import fails and the deploy stops. Check with `php artisan azkar:quran-map-candidates` (counts) and review with `docs/plans/phase-6/quran-map-review.md`. Excluded entries (`config/azkar.php`, `excluded_entries`) are left out and do not block.
3. The audio manifest matches its pin (`azkar.audio.manifest_sha256`). A recording is imported only when its file is on the volume at the manifest's size.

The secondary sources are read only when their snapshot is on the server and matches its pin. A missing or mismatching snapshot never fails the deploy.

## Checking a deploy

- **Pre-deploy log:** `migrate` only.
- **Container start log:** `start: Azkar audio verified` (or a warning naming the files); `azkar:snapshot` prints `Snapshot verified against the pin` or a warning; `azkar:import` prints the summary table (`Status: imported` means the rows changed; `Status: unchanged` means nothing was written, the normal result of a redeploy with no content change); then `start: content packs up to date` (or the lines of the packs that failed).
- **Smoke tests:**
  - `curl -s https://quranmobile-production.up.railway.app/api/v1/content/manifest` lists the `azkar` resource with its version and pack size.
  - `curl -s -D- -o /dev/null -H 'Range: bytes=0-99' https://quranmobile-production.up.railway.app/api/v1/azkar/audio/0.0.2/OD-001.mp3` answers `206` with `Content-Type: audio/mpeg`.
  - Download the pack, `sha256sum` matches the manifest's `sha256`. Its `azkar_recordings` count is 238, and no `remote_url` contains `opendua.org`.
  - Redeploy once and repeat the first two checks: the audio and the pack persisted.

## Rolling back

There is no flag (ADR 0045, 2 Nov 2026). Each option is a reviewed change:

- **A bad release:** revert the commit and deploy. The next start's import writes the reverted content and its version (the fingerprint notices the change).
- **Stop serving Azkar content:** a reviewed migration deletes the `azkar` resource's rows (`azkar_items`, `azkar_recordings` and the rest, scoped by `resource_id`) and the resource's pack row. The manifest then stops listing the resource. Keep the `content_sources` row; its `permission_status` is provenance only.
- **Stop serving one recording:** remove its file from the volume (`railway ssh`, `rm storage/app/private/azkar-audio/0.0.2/OD-NNN.mp3`) and run `php artisan azkar:import --download --defer-pack` and `php artisan content:ensure-packs`. The endpoint answers 404 for a missing file, and the next pack carries no row for it.
- The files stay on the volume until removed by hand.

## Recovering a lost volume

If the volume is empty or lost, nothing is served from the pack table until the files are back. In order, through `railway ssh`:

```bash
php artisan azkar:audio-sync
php artisan azkar:audio-verify --full
php artisan azkar:import --download --defer-pack
php artisan content:ensure-packs
```

`content:ensure-packs` also rebuilds the Quran packs. Packs and audio are both rebuildable from MySQL and the pinned sources, so a lost volume costs time, not content.


## Developer checklist (dashboard and `railway ssh`, not done by the code)

Tick each box when it is done. The code is in place (2 Nov 2026); these steps are the developer's.

- [ ] API service: volume attached at `/app/storage/app/private`, replicas = 1.
- [ ] API service variables: `APP_URL=https://quranmobile-production.up.railway.app`, `APP_ENV=production`, `QUEUE_CONNECTION=sync`. `FILESYSTEM_DISK` left as `local`. No Azkar switch variable exists to set.
- [ ] No Horizon or Scheduler service created.
- [ ] Deploy. Expect a short outage. Volume marker: `echo ok > storage/app/private/.volume-check`, redeploy, `cat` it, delete it.
- [ ] `railway ssh`: `php artisan azkar:audio-sync`, then `php artisan azkar:audio-verify --full` (expect `verified 238`, `missing 0`).
- [ ] `railway ssh` or the next deploy (the start runs the import): `php artisan azkar:import --download --defer-pack`, then `php artisan content:ensure-packs`. The import prints `imported` with 238 recordings.
- [ ] Smoke tests: the manifest lists `azkar`; the Range request answers `206`; the pack's `sha256sum` matches the manifest; `azkar_recordings` count is 238 and no `remote_url` contains `opendua.org`.
- [ ] Redeploy once and repeat the manifest and Range checks: the audio and the pack persisted.
- [ ] Reviewed Quran map rows for every shipped entry (production refuses any other row).
- [ ] Dorar variables, only when Dorar is granted.
