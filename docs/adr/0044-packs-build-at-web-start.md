# 0044 — Packs build at web start, not in pre-deploy

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Amends ADR 0031 §11 (production deploy) and ADR 0022 (Railway).

## Context

Pack files live on the `local` disk, which on Railway is the API service's volume at `/app/storage/app/private` (ADR 0040). Railway runs the pre-deploy command in a separate container with no volume mounted, and throws that container away.

The release ran `azkar:import --build-packs` in pre-deploy. Once the import is unlocked, the rows and the `content_packs` row would reach MySQL, but the `.sqlite.gz` would be written to the throwaway container. Dropping the flag does not help: the importer then dispatches `BuildContentPackJob`, and with `QUEUE_CONNECTION=sync` it runs in the same container.

A Railway service with a volume also stops its old deployment before the new one starts, so a start command that fails takes the API down.

## Decision

1. **Pre-deploy writes rows only.** `release.sh` runs `azkar:import --download --if-unlocked --defer-pack`. `--defer-pack` writes the rows and bumps the version but neither builds nor queues the pack. It cannot be combined with `--build-packs`.
2. **The web service builds missing packs at start.** `railway.json` starts `docker/start-web.sh` (since ADR 0067, the image's `CMD` does), which runs `content:ensure-packs` and then FrankenPHP. Normally that only checks that each file exists. It builds a new azkar version, and rebuilds everything after a volume loss.
3. **A failed build does not block start.** It is logged and the API serves anyway. The manifest already leaves out any pack whose file is missing, so the app does not offer that resource until the next build succeeds. This replaces ADR 0031 §11's "a pack failure fails the deploy" for Railway.

## Consequences

- An import validation or pin failure still fails the deploy in pre-deploy. Only the pack build moved.
- A pack failure is found in the deploy log (`FAIL <id>` from `content:ensure-packs`), not by a failed deploy.
- Packs build before FrankenPHP listens, so the 30 s health check waits for them. A new azkar pack fits easily. A full rebuild after a volume loss does not, and fails that deploy, so recover from a shell instead (runbook).
- Object storage (the Horizon return in ADR 0040) would let any container write packs, and would replace this.

## Amendment, 2 Nov 2026 (developer review)

- **The import moves to web start (B1).** Decision 1 is superseded. The pre-deploy container has no volume, and the Azkar import reads the audio files to decide which recording rows exist. Run there, it dropped every recording row on each deploy. `release.sh` now runs `migrate --force` only. `start-web.sh` runs, in order: the storage folders, `azkar:audio-verify`, the pinned snapshots (`hisnmuslim`, `hadeethenc`), `azkar:import --download --defer-pack`, `content:ensure-packs`, then serves. The import still writes rows only; the pack is built by `content:ensure-packs` in the same start.
- **Warn and keep (M3).** Each start task logs and continues. A failed download, checksum, validation or pin check warns, fails no deploy and no start, and the current version keeps serving. A GitHub or OpenDua outage cannot block a hotfix.
- **Volume and health check (M2).** The volume is mounted at `/app/storage/app` (not `/app/storage/app/private`; the packs live under `private/packs` inside it). The web health check timeout is 120 s (`railway.json`).
- **`entrypoint.sh` no longer migrates (M1).** It runs `config:cache` only; migrations run in the pre-deploy container. A migration error stops the deploy, not the running API.
- **No `--if-unlocked`.** That option was removed on 2 Nov 2026 (ADR 0045: features enabled by default). The import has no lock.
