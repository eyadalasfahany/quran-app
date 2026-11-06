# ADR 0068: Pinned source files live on the volume

Status: accepted · 2026-11-06

## Context

The API container runs its start-up tasks before the web server starts (ADR 0044, 0065, 0067). On 6 Nov 2026 these took about 3 min 20 s. The Railway health check was 120 s, so the deploy failed mid-start.

Most of that time was spent downloading files the container already had on the previous deploy:

- the pinned Hisn al-Muslim and HadeethEnc snapshots (Azkar)
- the OpenDua catalogue
- the pinned HadeethEnc snapshot for Duas

They were saved under `storage/app/azkar` and `storage/app/duas`. Those folders are outside the only volume (`/app/storage/app/private`, ADR 0040), so every deploy started with them empty. The commands already skip the download when a file exists and matches its pin. They just never found one.

## Decision

1. **One cache root.** Downloaded upstream source files are saved under one configured root: `content_sources.cache_root`, which defaults to `storage/app/private/sources`. That folder is on the volume. Code reaches it through `App\Support\Storage\SourceCache::path()`; there are no hard-coded `storage_path('app/azkar…')` paths.
2. **Verification is unchanged.** Every file is still checked against its pinned SHA-256 before use. A mismatch is deleted and downloaded again, so keeping files between deploys never puts an unverified file to use.
3. **Reports stay out.** The per-run JSON reports (`storage/app/azkar/reports`, `storage/app/duas/reports`) stay outside the volume, so they don't pile up there.
4. **Health check.** The timeout is raised to 600 s (runbook «Service settings»). That leaves room for the first start after this change, when the cache on the volume is filled once, and for a large pack rebuild.

## Consequences

- From the second deploy on, the snapshot steps only check hashes on disk. The logs say "Snapshot already pinned", and the start-up drops from minutes to seconds.
- The volume holds a few MB more.
- Changing a pin, which means a new date or hash, downloads once and stores the new folder beside the old one. Old dated folders can be deleted by hand; nothing reads them.
- Local development uses the same path (`storage/app/private/sources`), so existing local copies under `storage/app/azkar` are downloaded once more.
