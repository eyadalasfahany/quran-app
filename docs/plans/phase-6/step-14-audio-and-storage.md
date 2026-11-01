# Step 14 — Azkar audio in production and persistent file storage

Plan only. Nothing here is implemented. Written 1 Nov 2026 by the planner.

**Rests on:**
- ADR 0040 (`docs/adr/0040-azkar-audio-hosted-by-taybah.md`, draft in this change), which supersedes ADR 0038 decision 3 and amends ADR 0031 §8 and release blocker 5.
- ADR 0031 §8, §9, §11; ADR 0038; ADR 0022 (Railway); ADR 0014 (no Quran translations); ADR 0010 (design source).
- Spec §7 (pack path, line 400), §8 (caching line 429, rate limits line 431), §9, §12, §13 (environments).
- `docs/plans/phase-6/step-08-audio-rights.md` (the rights logic and UI states this plan switches on), `docs/runbooks/railway-release.md`, `docs/content-plan.md` (OpenDua row, line 149 and 172).
- Code read: `apps/api/docker/{Dockerfile,entrypoint.sh,release.sh}`, `apps/api/railway*.json`, `apps/api/config/azkar.php`, `config/filesystems.php`, `config/queue.php`, `app/Domains/Content/Packs/PackBuilder.php`, `Content/Services/ContentDeliveryService.php`, `Content/Http/Controllers/ContentPackController.php`, `Content/routes.php`, `Content/Listeners/QueuePackBuild.php`, `Azkar/Services/{AzkarImporter,AzkarTransformer}.php`, `Azkar/OpenDua/StepFlattener.php`, migration `2026_10_31_100008_create_azkar_recordings_table.php`, `PackSchema::azkarRecordings()`, and mobile `src/features/azkar/audio/*`, `src/features/audio/downloads/*`, `src/features/azkar/data/{content-repository,reader-units}.ts`.

## What is wrong today (facts, with sources)

1. **Packs are lost on every redeploy.** `PackBuilder::store()` writes to `Storage::disk('local')`, root `storage/app/private` (`config/filesystems.php`). The image has no volume (`docker/Dockerfile`, `WORKDIR /app`), and `content_packs` rows live in MySQL. After a redeploy the row exists and the file does not, so `GET /content/packs/{resource}/{version}` fails. `PackBuilder::build()` returns an existing row via `findForVersion()` and never rebuilds it, so the loss is permanent until the row is deleted.
2. **The release builds a pack nobody can read.** `railway.json` runs `entrypoint.sh release.sh` as the pre-deploy command, a separate container; `release.sh` ends with `azkar:import --download --if-unlocked --build-packs`. Its filesystem is discarded, and Railway does not mount volumes there (pre-deploy docs, and the volumes guide: mounted when the container starts, checked 1 Nov 2026). Production is locked today (`AZKAR_OPENDUA_IMPORT_ENABLED=false`), so this has not bitten yet.
3. **`BuildContentPackJob` never runs.** `QueuePackBuild` dispatches it; `QUEUE_CONNECTION` defaults to `database` (`config/queue.php`); no Horizon service exists on Railway (developer, 1 Nov 2026).
4. **`APP_URL` is `http://localhost:8000`** on Railway. ADR 0022 says it should be `https://quranmobile-production.up.railway.app`.
5. **Audio rows are never imported** (`audio_rights_verified` false, `recording_rights` empty in `config/azkar.php`), and each catalogue `recordings[].url` points at `https://audio.opendua.org/hisn/v0.0.2/OD-NNN.mp3`.

## Design (decided here, within the developer's four decisions)

### Storage

- **Volume mount path: `/app/storage/app`.** It is the narrowest path that covers everything the API writes: packs (`storage/app/private/packs/{resource}/{version}.sqlite.gz`), the pack temp files (`storage/app/tmp`), the Azkar catalogue cache and import reports (`storage/app/azkar`), and the new audio folder. Mounting `/app/storage` would hide `framework/{cache,sessions,views}` and `logs` that the image creates; `/app/storage/app` hides nothing the image needs.
- A new volume is empty and the image runs as root (no `USER` in the Dockerfile), so the start script runs `mkdir -p storage/app/private storage/app/tmp storage/app/azkar storage/app/azkar-audio`.
- **Audio** lives at `storage/app/azkar-audio/{version}/OD-001.mp3`, on a new disk `azkar_audio` (not served by Laravel's `serve`; only the controller reads it). Packs keep using the `local` disk. `FILESYSTEM_DISK` stays `local`.
- **One replica.** Railway volumes and replicas are mutually exclusive, and a redeploy of a volume-backed service has a short outage even with a healthcheck (Railway volumes reference, checked 1 Nov 2026). Accepted: no zero-downtime deploys.
- **No Horizon or Scheduler service while storage is a volume.** A volume attaches to one service (I found "one volume per service" and "no replicas"; whether a volume can be shared across services I could not confirm, so treat sharing as unavailable). A pack built by a separate Horizon container would land on its own disk and never be served. ADR 0022 lists Horizon and Scheduler as planned services; ADR 0040 and the spec §13 edit say they wait for object storage (a new ADR).

### Where file-writing work runs

| Work | Runs | Why |
| --- | --- | --- |
| `migrate --force` | Pre-deploy (kept) | Needs only MySQL. A failure stops the deploy and the old version keeps serving. |
| Azkar import, DB rows only | Pre-deploy (`azkar:import --download --if-unlocked --no-pack`, step 3) | Needs MySQL and the network, not the volume. Validation errors still fail the deploy. |
| Pack build, audio verification | Web container start (`docker/start-web.sh`, steps 2 and 7), before FrankenPHP | Only place the volume is mounted. Runs only in the web service's `startCommand`, never in `entrypoint.sh` (Horizon and Scheduler share it). |
| First audio copy | One-time `railway ssh` (step 9) | 58 MB, minutes long. Keeping it out of the start path keeps `/up` fast. The command is resumable. |

Rejected: a one-off `railway ssh` for packs. A volume loss or a fresh deploy would leave the manifest pointing at missing files until someone remembered to run it. Start-time self-heal fixes that every time.

Start failures do not take the API down. Each task logs loudly and the script continues to `exec frankenphp`, so Quran reading keeps working. Fail-closed rule: an audio-bearing pack is never built while its files are missing (step 7).

### Queue

`QUEUE_CONNECTION=sync` on the API service. With no worker, `database` would pile up jobs that never run. `sync` runs `BuildContentPackJob` inline where the event fires (the importer, `content:sync` run through `railway ssh`), writing into the volume. Nothing in an HTTP request path dispatches pack builds, so request latency is unaffected. A pack failure now fails the console command that triggered it; step 2 tests that. No new service is added.

### Audio source and provisioning

| Option | Verdict |
| --- | --- |
| A. `railway ssh` upload from the developer's folder | Not recommended. I could not confirm that `railway ssh` copies files; it would be a tar piped over stdin, 58 MB, with no resume and no verification until after. |
| B. `azkar:audio-sync` downloads each shipped file from `https://audio.opendua.org/hisn/v0.0.2/<file>` and checks it against a **pinned manifest** | **Recommended.** Runs where the volume is mounted, resumable (skips files whose size and SHA-256 match), checks every file twice (download and `--full` verify), reproducible after a volume loss, no manual transfer. `audio.opendua.org` answers HEAD with `200`, `audio/mpeg`, `accept-ranges: bytes` (checked 1 Nov 2026). |
| C. `azkar:audio-sync --from=<dir>` | Kept as an option on the same command: for local development (the developer's `opendua-audio-hisn-v0.0.2/` folder), for tests, and as the fallback if `audio.opendua.org` is down. |

This copy from `audio.opendua.org` at provisioning is my proposal and needs the developer's confirmation (open question 4); decision 2 only says the app and API never stream from or proxy to it. The command fetches only the 238 shipped files, one at a time with a gap and a User-Agent with the contact email (API rules for HTTP clients), not OpenDua's 63 MB zip.

**Pinned manifest.** Commit a copy of the archive's `manifest.json` as `apps/api/resources/azkar/audio/hisn-0.0.2.manifest.json` (71,784 bytes, SHA-256 `451e49c4081d8913d905a95b5ce7631ce884e9935c05c712754bddc31f093c8d`, shasum run 1 Nov 2026) and pin that hash in `config/azkar.php` (`azkar.audio.manifest_sha256`). The published manifest at `audio.opendua.org/hisn/v0.0.2/manifest.json` is a different file (131,931 bytes, SHA-256 `c5a947bb…eb42`) with extra fields (`published`, `rightsNotice`, `categories`, `zips`); I compared it with the local one: every track's `key`, `bytes`, `sha256`, `entryId` and `partIndex` are identical. We pin ours because it is small, stable and ours to review; the per-file hashes inside it do the real verification. The manifest is data (ids and hashes), not audio, so it may be committed; the MP3s and the archive folder stay gitignored (`.gitignore` line 49).

### Mapping OpenDua tracks to our rows

The catalogue's `recordings[].url` ends in the track file name, so the mapping is by file name, not by guesswork. I checked `storage/app/azkar/catalogue-0.0.4.json` against the archive manifest:

| Check | Result |
| --- | --- |
| Recording objects in the catalogue (including those nested in repeat groups) | 250 |
| Distinct recording ids | 249 (`recording-000207` appears in both variations of entry 207, an excluded entry) |
| Distinct files referenced / tracks in the archive | 249 / 249, a one-to-one match |
| URLs whose file is not in the manifest | 0 |
| Tracks whose manifest `entryId` (`OD-077`) differs from the catalogue entry number (`entry-000077`) | 0 |
| Part tracks (`OD-077-1`, `-2`) | Match by file name; `partIndex` is informational |
| Recording objects on excluded entries (50, 70, 76, 99, 110, 206, 207, 235, 236) | 12 objects, 11 files: OD-050, 070, 076, 099, 206, 207-1, 207-2, 235, 236-1, 236-2, 236-3. Entry 110 has none. |
| **Ships** | **238 files, 57,874,176 bytes (about 55 MiB), 5,771 s** |
| Cannot be mapped | None |
| Map to a **step with several items**, not to one item | 7 recordings: entries 31 (4 items), 66 (2), 67 (2), 69 (4), 106 (3), 119 (2), 243 (2) |

`entry_key` is `hisn-al-muslim:entry-000001` for `OD-001`: the number is the same, zero-padded to six digits. Item mapping: `StepFlattener` gives every item of a step the step's recordings, and `AzkarTransformer` writes one row per item × recording (`recording_key = item_key:recording_id`). For a one-item step that is exact. For the seven multi-item steps the same file would sit on 2–4 items, and a reader unit that holds only item 2 would play the whole step. Plan (step 5): attach the recording to the **first item of its step only**; the reader's `recordingForUnit` (first recording among a unit's body items) then shows it once. Open question 2 asks the developer to confirm.

### Serving

- `GET /api/v1/azkar/audio/{version}/{file}` (for example `/api/v1/azkar/audio/0.0.2/OD-001.mp3`).
- Headers: `Content-Type: audio/mpeg`, `Cache-Control: public, max-age=31536000, immutable` (spec §8; the version is in the path), `ETag: "<track sha256>"`, `Accept-Ranges: bytes`. `BinaryFileResponse` answers `Range` with 206, which AVPlayer and ExoPlayer need.
- Answers 404 (problem details, stable `code`) for a version other than the pinned one, a file not in the shipped set, a missing file, or when `azkar.opendua.audio_rights_verified` is false. That 404 is the server-side rollback lever.
- **Rate limit.** Audio gets its own limiter, `azkar-audio`, 600 per minute per IP (config key `azkar.audio.rate_limit_per_minute`). It does not share the 300/min `content` limiter: a single play issues several Range requests, and «download all» fetches 238 files. Spec §8 line 431 gets a new row.
- **Pack `remote_url`** becomes the relative path above, never an absolute URL and never an `opendua.org` URL. The pack stays valid if the domain changes, and `APP_URL` stays out of the pack. The column keeps its name; no schema change. The app resolves it against `EXPO_PUBLIC_API_URL` (step 8).
- `size_bytes` comes from the manifest's `bytes` (the storage summary needs it); `duration_ms` from the catalogue, asserted equal to the manifest's `durationSeconds × 1000` (all 249 are equal today).

### Rights record: proposed values (developer to confirm, open question 4)

These are my proposals. The developer's decisions cover only the attribution line, that audio ships and that Taybah hosts it. `attribution.ts` passes `licence` and `licenceUrl` to the UI, so the wording is user-visible.

`config/azkar.php`: `audio_rights_verified` becomes `(bool) env('AZKAR_AUDIO_ENABLED', false)`. `recording_rights` would be:

| Key | Proposed value | Why |
| --- | --- | --- |
| `stream_allowed`, `download_allowed` | true, true | The invitation says "works offline". |
| `redistribution_allowed` | false | We host; users do not get redistribution rights. |
| `attribution_en` / `attribution_ar` | `Recitation by Muhammad Jumah for OpenDua` / null | Developer's wording; no Arabic wording is published (ADR 0038 stance), the app falls back to the English line. |
| `licence` | "Recitation under OpenDua's separate recording terms (not CC BY 4.0)" | The archive README says CC BY 4.0 does not apply. |
| `licence_url` | `https://opendua.org/developers` | `opendua.org/licence/audio` is 404; ADR 0038 uses this page. |
| `rights_verified_at` | `2026-11-01` | Meaning changes from "verified in writing" to "verified by developer decision on this date"; the config comment is rewritten. |

`AzkarImporter::lockReasons()` already refuses an audio import with an empty `licence`.

### Offline download: in this step or a follow-up?

**Recommendation: follow-up, in the same plan but a second release.** Release A (steps 0–9) ships streaming and the infrastructure. Release B (steps 10–12) ships downloads.

Why: (1) Step 8 deferred the download manager because `features/audio/downloads/manager.ts` is keyed by Quran `audio_file_id` and the `downloads` table is Quran-shaped; touching it risks Quran downloads. (2) Streaming already satisfies "audio works in the reader" and exercises the real server, volume and URL path. (3) Downloads need the rights logic, a downloader, a screen and file cleanup, which is a UI-heavy review of its own. OpenDua's "works offline" wording is met by Release B.

How Release B should be built is not mine to decide, because ADR 0031 §8 says downloads "reuse the Quran download manager, generalised through an additive `user.db` change". See open question 1. My recommendation is a small separate downloader behind the existing `AzkarDownloadPort` that writes MP3s under `audio/azkar/` in the document directory and derives state from the files (no `user.db` change, no touch to the Quran manager), reusing the manager's pure helpers (`networkGate`, `byteCount`). Release B steps below assume that choice and say where they would change.

## Steps

**Sequencing gate.** Steps 3, 4 and 5 edit `ImportAzkarCommand.php`, `AzkarImporter.php` and `config/azkar.php`, which are uncommitted in the working tree from the excluded-entries change (git status, 1 Nov 2026). Step 3 does not start until that change is committed, and step 5 must not touch its `excluded_entries` logic.

Each step is one reviewable change. Do not start a step before the previous one's gates pass. Implementation goes to a Haiku subagent on a written brief; the orchestrator reviews the diff. No step adds a dependency.

### Step 0 — Decisions on paper (docs; the planner's edits are already made, the developer verifies)

- **Already edited in this change** (targeted edits only; `docs/adr/0031-azkar.md` also carries the other agent's uncommitted excluded-entries work, which was not touched): `docs/adr/0031-azkar.md` (§1.2 amendment note, §8 bullet struck and superseded, consequence line, release blocker 5 closed), `docs/adr/0038-opendua-arabic-rights-from-public-statements.md` (decision 3 marked superseded), `docs/adr/0022-production-on-railway.md` (decision 3 amended: volume, one replica, no Horizon or Scheduler), `docs/content-plan.md` (OpenDua row, line 149, and open question, line 172), `docs/technical-spec.md` (§7 pack path; §13 production row), `docs/plans/phase-6/step-08-audio-rights.md` (opening rule points to ADR 0040).
- **Still to edit, shipped with the step that creates the thing:** spec §8 limiter row and §9 endpoint row (step 6); spec §12 (Azkar audio streams from our API; step 8); `docs/plans/phase-6.md` (add step 14, rewrite the download follow-up as Release B; step 9); `docs/runbooks/railway-release.md` (step 9).
- **Tests:** none (docs).
- **Gates:** developer reads the ADR 0040 and the edits above. `rg "not licensed to us|Audio still needs written" docs` finds nothing.
- **Developer by hand:** approve the ADR text; send the non-blocking email to `opendua@hdfund.org` (streaming, offline download, re-hosting, attribution wording) and file the reply beside ADR 0038's; decide the ADR number (open question 3).

### Step 1 — Persistent storage and queue (infrastructure; no audio)

- **Files:** new `apps/api/docker/start-web.sh` (`mkdir -p` the four folders, then `exec frankenphp run --config /etc/caddy/Caddyfile`; heal calls arrive in steps 2 and 7); `apps/api/docker/Dockerfile` (copy and `chmod +x` it); `apps/api/railway.json` (`startCommand` becomes `/usr/local/bin/entrypoint.sh /usr/local/bin/start-web.sh`; `healthcheckTimeout` 30 → 120); `apps/api/docker/release.sh` (drop the `azkar:import … --build-packs` line; the pre-deploy runs `migrate --force` only until step 3; the file's header comment says why); `railway-horizon.json` and `railway-scheduler.json` untouched.
- **Behaviour change:** none visible in production today, because the Azkar import is locked. Packs built after this step survive redeploys once the volume exists.
- **Tests:** a Pest test that reads `railway.json` and asserts the web `startCommand` runs `start-web.sh` and `preDeployCommand` does not mention `azkar:import`; a shell syntax check (`sh -n docker/*.sh`) in the gate. Do not test Railway itself.
- **Gates:** `composer qa`; `sh -n apps/api/docker/*.sh`. No contract change.
- **Developer by hand (Railway dashboard or CLI):**
  1. API service → Volumes → add a volume, mount path `/app/storage/app`. Size: the audio is 55 MiB; pick a size that also holds the Quran packs you plan to build (check the manifest sizes after the first sync).
  2. Variables on the API service: `APP_URL=https://quranmobile-production.up.railway.app`, `QUEUE_CONNECTION=sync`. Leave `FILESYSTEM_DISK=local`.
  3. Confirm replicas = 1. Do not create the Horizon or Scheduler services.
  4. Deploy. Expect a short outage. Verify persistence: `railway ssh` → `echo ok > storage/app/private/.volume-check`, redeploy, `cat` it again. Delete the file.
  5. `curl -s https://quranmobile-production.up.railway.app/up` returns 200.

### Step 2 — Self-healing packs (`content:heal-packs`)

- **Files:** new `app/Domains/Content/Console/HealPacksCommand.php` (`content:heal-packs {--only=} {--except=} {--dry-run}`), new `Content/Services/PackHealer.php`, a `ContentPackRepository` method to delete a stale row, registered in `ContentServiceProvider`; `docker/start-web.sh` calls `content:heal-packs --only=azkar` in the foreground and `--except=azkar` in the background (`&`), each with `|| echo` so a failure never blocks the server.
- **Behaviour:** for each active, deliverable resource: (a) if the current `version` has no `content_packs` row, build it; (b) if a row exists but `Storage::disk('local')->exists($pack->path)` is false, delete the row and rebuild (the new gzip has a new SHA-256 and the same version; devices that hold the version keep working). Locked Azkar resources (`PackBuildException`) are reported and skipped, not failed. `--dry-run` lists what it would do. Safe on every start: with all files present it only runs `exists()` calls.
- **Memory note:** `--except=azkar &` rebuilds large QF packs inside the web container's memory limit while it serves requests. Non-blocking; if it shows up in Railway metrics, run it by hand through `railway ssh` instead (`--dry-run` first).
- **Tests (Pest, `Storage::fake('local')`):** missing file → row replaced, file exists, `size_bytes` and `sha256` match the new bytes; file present → untouched, no build call; no pack row for the current version → built; locked Azkar resource → reported, exit 0; `--only` and `--except` filters; `--dry-run` writes nothing; a pack build failure under `QUEUE_CONNECTION=sync` surfaces as a non-zero exit from the command that triggers it (`content:sync` path), documented.
- **Gates:** `composer qa`.
- **Developer by hand:** after deploy, `railway ssh` → `php artisan content:heal-packs --dry-run`; read the list; run it without `--dry-run`. This also repairs any QF pack rows already in production whose files vanished.

### Step 3 — Idempotent Azkar import, DB only (`--no-pack`)

- **Files:** `app/Domains/Azkar/Console/ImportAzkarCommand.php` (new `--no-pack`; skips `BuildContentPackJob::dispatch` and `buildPackNow`); `AzkarImporter.php` (skip when the stored fingerprint matches); new `Azkar/Services/AzkarImportFingerprint.php`; one additive migration: nullable `import_fingerprint` (string 64) on `resources` (additive, allowed in production, `.ai/rules/migrations.md` to be read by the implementer); `docker/release.sh` gets back `azkar:import --download --if-unlocked --no-pack`.
- **Fingerprint** = SHA-256 of: catalogue SHA-256, the `azkar` config inputs that change rows (`excluded_entries`, `quran_references`, `chapter_titles_ar`, `chapter_timing`, `session_categories`, `store_english`, the audio block and `audio_rights_verified`, and the audio manifest SHA-256). Without the config inputs, turning audio on would never re-import (`write()` bumps `resources.version` on every run today, so an unguarded import would force every device to re-download on each deploy).
- **Behaviour:** unchanged fingerprint → prints "unchanged", exits 0, no version bump. Changed → imports, bumps the version, queues nothing. The pack is built at the next start by `content:heal-packs` (step 2), because the current version has no pack row.
- **Manifest gap (checked):** after the pre-deploy import, `resources.version` and `changes_floor_version` are N+1 while the newest pack is still N, until start builds N+1. In `apps/mobile/src/core/sync/content-sync.ts` (lines 171–178) a device already on the pack's version N does nothing, and an older device downloads pack N, so there is no re-download loop, only a short window. A device on N gets a 410 from `GET /content/changes` in the gap (`ContentDeliveryService::changes()`, `sinceVersion < changes_floor_version`), which the app handles as "gone". If step 7 refuses to build N+1 for a long time, that window is long but harmless. A test pins it (below).
- **Tests:** manifest during the gap lists pack N with `changes_since_min_version` N+1, and `GET /content/changes?since_version=N` returns 410 (pins today's behaviour so a later change is deliberate); unchanged fingerprint → no version bump, no row replacement; each fingerprint input flips it (one test per input class); `--no-pack` dispatches no job (`Queue::fake`) and builds no file; locked import still exits 0 under `--if-unlocked`; existing `AzkarImportTest` still passes.
- **Gates:** `composer qa`.
- **Developer by hand:** none yet (the import stays locked until `AZKAR_OPENDUA_IMPORT_ENABLED=true`, which is a separate, existing release item in the runbook).

### Step 4 — Audio manifest, disk and `azkar:audio-sync`

- **Files:** `apps/api/resources/azkar/audio/hisn-0.0.2.manifest.json` (copied byte for byte from the archive); `config/azkar.php` (new `audio` block: `version` `0.0.2`, `manifest_path`, `manifest_sha256`, `base_url` `https://audio.opendua.org`, `rate_limit_per_minute` 600, `gap_ms`, `retry_delay_ms`); `config/filesystems.php` (disk `azkar_audio`, root `storage_path('app/azkar-audio')`, `serve` false); new `app/Domains/Azkar/Audio/AzkarAudioManifest.php` (loads the file, checks its SHA-256 against the pin, exposes `shippedTracks()` = tracks whose entry number is not in `excluded_entries`, and `trackForFile()`); new `Azkar/Console/SyncAzkarAudioCommand.php` (`azkar:audio-sync {--from=} {--full} {--verify-only}`) and `VerifyAzkarAudioCommand`-style `--verify-only` mode; a domain exception for a bad pin or hash.
- **Behaviour:** `azkar:audio-sync` copies each missing or mismatched shipped file (download with retry and backoff, or from `--from`), writes to a temp name, checks size and SHA-256, then renames. A mismatch deletes the temp file and fails the command. `--verify-only` checks existence and size only (milliseconds; used at start); `--full` hashes everything. Files for excluded entries are never fetched and are reported if found on disk. Exits non-zero on any failure.
- **Tests (placeholder bytes, never real audio; the test builds its own tiny manifest and points the config at it):** pin mismatch refuses to start; shipped set excludes excluded entries; download → verified → stored; wrong hash → temp deleted, non-zero exit; resume skips verified files; `--from` copy; `--verify-only` fails on a missing or short file; `Http::fake` only; `Http::preventStrayRequests`.
- **Gates:** `composer qa`.
- **Developer by hand:** none.

### Step 5 — Importer writes the audio rows

- **Files:** `config/azkar.php` (the rights block and `audio_rights_verified` env flag above); `app/Domains/Azkar/Services/AzkarTransformer.php` (recording branch only; do not touch the `excluded_entries` work another agent is doing); `Azkar/Validation/CatalogueValidator.php` (new issue code `recording_unmapped`); `Azkar/OpenDua/StepFlattener.php` only if the first-item rule needs the step's item order (it already has it).
- **Behaviour (when `AZKAR_AUDIO_ENABLED=true`):** for each recording of a non-excluded entry: look up the track by the URL's file name in `AzkarAudioManifest`; check the manifest `entryId` number equals the entry number and the duration matches; write one row on the step's **first item** with `remote_url` = `/api/v1/azkar/audio/0.0.2/<file>`, `size_bytes` = manifest bytes, `source` `opendua`, rights from config. An unmapped or mismatched recording on a shipped entry is an import error (fail closed). Excluded entries produce no rows. Importer report: `recordings.upstream`, `imported` (expect 238), `downloadable` (238), and a new `unmapped` count (expect 0).
- **Tests:**
  - 238 rows from a fixture catalogue that copies the real shape (placeholder text, `FIXTURE text 1 — not a dhikr`), including the 7 multi-item step cases (one row each, on the first item) and a nested repeat-group case;
  - excluded entry → no row and no unmapped error;
  - unknown file name, wrong entry number, and duration mismatch → import error;
  - `AZKAR_AUDIO_ENABLED=false` → zero rows (the rollback path), same as today;
  - **no `opendua.org` substring in any recording row, nor in the SQLite pack built from it** (non-negotiable 2 and ADR 0040 decision 2);
  - `rights_verified_at` is the epoch-ms of 2026-11-01 (existing conversion); `attribution_ar` null, `attribution_en` the ADR string; `licence` not empty;
  - `PackSchemaAzkarTest` and `AzkarMigrationTest` still pass (no schema change).
- **Gates:** `composer qa`.
- **Developer by hand:** none.

### Step 6 — Audio endpoint, limiter and contract

- **Files:** new `app/Domains/Azkar/Http/Controllers/AzkarAudioController.php`, new `Azkar/Services/AzkarAudioService.php` (resolves a file to its absolute path and track; throws a not-found domain exception, friendly message, in `lang/{ar,en}/problems.php`), new `Azkar/routes.php` registered from a service provider (prefix `api/v1`, name `v1.`, per `apps/api/CLAUDE.md`), `RateLimiter::for('azkar-audio', …)` next to the `content` limiter pattern in `ContentServiceProvider`; `packages/api-contract/openapi.json` and `src/schema.d.ts` regenerated; Pest arch tests updated if the new folder needs registering.
- **Tests (Pest feature, `Storage::fake('azkar_audio')` with placeholder bytes):** 200 with `audio/mpeg`, immutable `Cache-Control`, SHA-256 `ETag`, `Accept-Ranges`; `If-None-Match` → 304; `Range: bytes=0-9` → 206 with the right `Content-Range` and body length; unsatisfiable range → 416; wrong version, unknown file, a file of an excluded entry, a path-traversal string, and a missing file → 404 problem details with a stable `code`; flag off → 404; the 601st request in a minute → 429 with `Retry-After`; the route is outside `auth`.
- **Gates:** `composer qa`; `npm run generate -w @quran/api-contract` (commit both generated files; CI fails on drift); `--fail-on-unknown` must pass (use `#[Response(404, …)]` as `ContentPackController` does).
- **Developer by hand:** none.

### Step 7 — Fail-closed audio at start

- **Files:** `app/Domains/Content/Packs/PackBuilder.php` (before building an `azkar` pack that contains `azkar_recordings` rows, call a small `AzkarAudioReadiness` check; if any referenced file is missing or the wrong size, throw `PackBuildException`; no rows → no check); `docker/start-web.sh` (runs `php artisan azkar:audio-sync --verify-only` first and logs the result; then the Azkar heal from step 2).
- **Behaviour:** if the volume lost the audio, the new pack is not built, the manifest keeps the previous pack, and the log names the missing files. Nothing is half-served.
- **Tests:** pack with recordings and all files present builds; one file missing or short → `PackBuildException`, no `content_packs` row, no file; pack without recordings never touches the audio disk; `PackBuilderTest` baseline unchanged.
- **Gates:** `composer qa`.
- **Developer by hand:** none.

### Step 8 — App: resolve the URL, play, attribute (streaming)

- **Files:** new `apps/mobile/src/features/azkar/audio/audio-url.ts` and `audio-url.test.ts` (`resolveAudioUrl(remoteUrl, apiBase)`: a path starting with `/` is joined to `EXPO_PUBLIC_API_URL`; an absolute `http(s)` URL passes through, which keeps the dev fixtures working); `playback.ts` and its test use it; check that `AzkarReaderScreen` mounts `AzkarAudioButton`, `AzkarAudioPlayer` and `AzkarAttributionLine` for a unit whose recording is playable and shows nothing otherwise; `AzkarAttributionLine` text is the English line when `attribution_ar` is null (existing `attribution.ts` fallback). New i18n strings only if the frames need them (`ar.json` and `en.json` together).
- **Tests:** playback failure: a 404 or a timeout from the audio endpoint (rollback lever, or a file missing on the volume) must end in a clean `idle`/error state with the unit not stuck in `loading` — `playback.ts` has no error status today, so this step adds one (`onStatus` handling of a player error) and the button returns to its play state; `audio-url` (relative, absolute, trailing slash, empty); `playback.test.ts` passes the resolved URL to `createAudioPlayer`; `availability.test.ts` already covers the 4 states, re-run with `rightsVerifiedAt` set; reader screen test: a unit with a recording shows the button and the attribution «Recitation by Muhammad Jumah for OpenDua», a unit without shows nothing; Arabic and English render (RTL), accessibility roles and labels. Each component that changes keeps its own colocated test.
- **Gates:** `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; frontend rule checks.
- **Visual check (frontend rule):** run the API locally with the real archive (`php artisan azkar:audio-sync --from=/Applications/MAMP/htdocs/quran-app/opendua-audio-hisn-v0.0.2`, `AZKAR_AUDIO_ENABLED=true`, local import per ADR 0031 §11), start the app on the iPhone 17 simulator, open a reader unit with audio, screenshot with `xcrun simctl io booted screenshot`, render `AzkarReaderAudio` with `python3 packages/design-tokens/scripts/frame-shot.py AzkarReaderAudio <out>`, and compare. Also check the offline state (`stream_offline` pill) and the `none` state (no controls). Read the `apple-design` skill first. Do not paste religious text into the review notes.
- **Developer by hand:** play a track on the simulator and, before release, on a real iPhone (background audio, lock screen, silent switch); a new EAS build is needed for this step to reach TestFlight.

### Step 9 — Production rollout and runbook

- **Files:** rewrite `docs/runbooks/railway-release.md` (what runs and where: pre-deploy migrate and DB import, start-time verify and heal; the services table now says Horizon and Scheduler are not deployed and why; new variables `APP_URL`, `QUEUE_CONNECTION`, `AZKAR_AUDIO_ENABLED`; first audio provisioning; rolling back audio; recovering a lost volume); `docs/plans/phase-6.md` status.
- **Order (this order is what makes it fail closed):**
  1. Steps 1–7 are deployed with `AZKAR_AUDIO_ENABLED` unset.
  2. `railway ssh` → `php artisan azkar:audio-sync` (about 238 downloads; rerun if interrupted) → `php artisan azkar:audio-sync --full --verify-only`; expect 238 verified, 0 missing.
  3. Set `AZKAR_AUDIO_ENABLED=true`. Deploy. Pre-deploy imports the rows (fingerprint changed); start verifies the files and builds the pack.
- **Smoke tests (production):**
  - `GET /api/v1/content/manifest` lists the `azkar` resource with the new version.
  - `curl -s -D- -o /dev/null -H 'Range: bytes=0-99' https://quranmobile-production.up.railway.app/api/v1/azkar/audio/0.0.2/OD-001.mp3` → `206`, `audio/mpeg`.
  - Download the pack, `sha256sum` equals the manifest value; `sqlite3` count of `azkar_recordings` is 238 and `grep -c opendua.org` over `remote_url` is 0.
  - Redeploy once and repeat the manifest and Range checks: pack and audio persisted.
- **Developer by hand:** every item in the order above; `railway ssh` commands; a TestFlight build with step 8; confirm the first real playback; keep the volume snapshot or backup setting you want (not decided here).

### Release B — offline download (after Release A is in TestFlight)

Assumes the recommended design (open question 1). If the developer chooses to generalise the Quran manager instead, steps 10 and 12 change (a `user.db` migration, a `kind` column, a generic key) and a destructive-migration check is needed.

**Step 10 — Downloader behind `AzkarDownloadPort`.**
- **Files:** new `apps/mobile/src/features/azkar/audio/file-download-port.ts` (+ test) implementing `list/status/enqueue/cancel/remove/removeCategory/storageBytes`; state from files under `audio/azkar/` plus an in-memory store for in-flight transfers; downloads one file at a time, verifies `size_bytes`, gates on `networkGate` and the Wi-Fi-only setting like the Quran manager, writes to a temp file then renames; the app binds it instead of `NoAudioDownloadPort`.
- **Tests (fake file system and network):** idle → downloading → done; failed then retry; cancel deletes the partial file; remove; `removeCategory`; size mismatch → failed; Wi-Fi-only blocks on cellular; storage bytes sum; a pack update that drops a recording deletes its file.
- **Gates:** mobile gates; no Quran download test changes.
- **Developer by hand:** none.

**Step 11 — Downloads screen and entry point.**
- **Files:** existing `AzkarDownloadsScreen`, `AzkarDownloadButton`, `AzkarDownloadRow`, `AzkarStorageSummary` get the real port; the Azkar Home overflow entry appears once any recording has `download_allowed = 1` (it already reads that condition); category-level «تنزيل الكل» only if `AzkarDownloads` has it (check the frame, do not invent).
- **Tests:** screen with a populated and an empty port (`AzkarDownloads`, `AzkarDownloadsEmpty`), per-state rows, delete-all through `ConfirmDialog`, RTL, accessibility.
- **Visual check:** iPhone 17 simulator vs `frame-shot.py AzkarDownloads` and `AzkarDownloadsEmpty`.
- **Developer by hand:** try a download in airplane mode and with Wi-Fi only on.

**Step 12 — Play from the file; cleanup.**
- **Files:** `playback.ts` plays the local file URI when availability is `local`; `useIsDownloaded` reads the new port; reader shows the done state on `AzkarDownloadButton`.
- **Tests:** `local` uses the file URI; `stream_offline` becomes `local` after a download; deleting the file returns to `stream_offline` when offline.
- **Gates:** mobile gates. TestFlight build.
- **Developer by hand:** play a downloaded track in airplane mode on a real device.

## Release blockers (this step)

1. Volume mounted at `/app/storage/app`, a marker file survives a redeploy (step 1 check).
2. ADR 0040 number clash resolved; ADR 0031, 0038 and 0022, the spec, the content plan and the step-08 brief edited (step 0).
3. All 238 files verified (`azkar:audio-sync --full --verify-only`) before `AZKAR_AUDIO_ENABLED=true`.
4. A production Range request returns `206`; the pack has 238 recording rows and no `opendua.org` URL.
5. Attribution «Recitation by Muhammad Jumah for OpenDua» visible next to the audio on the iPhone 17 simulator, matching the frame.
6. `APP_URL` corrected; `QUEUE_CONNECTION=sync`; replicas = 1; no Horizon or Scheduler service created.
7. Not blockers, tracked: the OpenDua email reply (ADR 0040 decision 6). ADR 0031 release blocker 2 (Arabic chapter titles) is unchanged and still applies to Azkar as a whole. The import flag, `APP_ENV=production` and the reviewed Quran map remain the Azkar unlock items in the runbook.

## Open questions

1. **Offline download design (ADR conflict).** ADR 0031 §8 says downloads reuse the Quran download manager, generalised through an additive `user.db` change. I recommend a separate file-backed downloader behind `AzkarDownloadPort` (no `user.db` change, no risk to Quran downloads) and a second release. Confirm that, or choose the generalisation. If you choose the separate downloader, ADR 0040 needs one more line amending §8.
2. **Recordings on multi-item steps.** Seven recordings (entries 31, 66, 67, 69, 106, 119, 243) cover a whole step of 2–4 items. The plan attaches each to the step's first item, so the reader shows the audio once and it plays the whole step. Confirm, or choose to show it on every item of the step (today's importer behaviour), which makes a later item's audio play the earlier items too.
3. ~~**ADR number.**~~ Resolved 1 Nov 2026: this ADR is 0040; `0039-sliding-recited-word-pill.md` keeps 0039.
4. **Proposed rights record and first copy (my values, not yours).** The values under «Rights record: proposed values» (`licence` wording, `licence_url`, `redistribution_allowed = 0`, `rights_verified_at = 2026-11-01` meaning "verified by developer decision"), and the one-time provisioning copy of the 238 files from `audio.opendua.org` with `--from` as fallback. Confirm or give the wording. `licence` and `licence_url` are shown to users.

## Developer answers (1 Nov 2026)

1. Offline download: a separate file-backed downloader behind `AzkarDownloadPort` (Release B). ADR 0040 amends ADR 0031 §8 accordingly.
2. Recordings on multi-item steps: one row on the first item of the step.
3. ADR number: this ADR is 0040.
4. Rights record: as proposed, except the user-visible licence text is softened to the attribution line plus a link to `https://opendua.org/developers` (no claim about OpenDua's recording terms). First copy: the server downloads the 238 files from `audio.opendua.org` and verifies each SHA-256; `--from` stays as the fallback.

