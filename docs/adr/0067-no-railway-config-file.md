# 0067 — The image starts itself; no Railway config file

Date: 2026-11-06 · Status: **accepted** (developer, 6 Nov 2026) · Amends: ADR 0022, ADR 0044 (`railway.json` starts `start-web.sh`), ADR 0065 (restart policy), spec §7, `docs/runbooks/railway-release.md`

## Context

Railway has deprecated Config as Code. Existing `railway.json` files stop being read on 1 Dec 2026, a hard cutoff. The API's start command, pre-deploy command, health check and restart policy came from that file. Without it, the service would fall back to the image's `CMD`, which was bare `frankenphp`: no migrations, imports or pack builds, and no Horizon or scheduler.

The pre-deploy command was already not running (6 Nov 2026 finding), so `start-web.sh` runs the migrations.

Railway's replacement is Infrastructure as Code (`.railway/railway.ts`, applied with `railway config apply`). Apply deletes any resource the file leaves out, which here includes MySQL, Redis and the volume that holds the Azkar audio. There is no staging environment to try a plan on.

## Decision

1. **The production Dockerfile moves to the service root** (`apps/api/docker/Dockerfile` → `apps/api/Dockerfile`), where Railway finds it by default. It replaces the local `php:8.5-cli` image, which was unused (ADR 0004: local development runs on Homebrew). Without a config file, Railway would otherwise have built that local image. **The image's `CMD` is `start-web.sh`.** With the existing `ENTRYPOINT` (`entrypoint.sh`, `config:cache`), the image starts correctly with no start command from Railway.
2. **`railway.json` is removed, and there is no pre-deploy step.** `docker/release.sh` stays in the image for a manual run, but nothing calls it. `app-stores:refresh` runs from the scheduler (ADR 0065).
3. **Platform-only settings live in the dashboard**, listed in the runbook's «Service settings» table. The settings are: root directory `apps/api`, `RAILWAY_DOCKERFILE_PATH` unset, health check `/up` with 120 s, restart policy Always, draining seconds 130, replicas 1, and the start and pre-deploy commands and the config file path left empty. The table is the source of truth.
4. **No Infrastructure as Code for now.** Revisit when there is more than one service or environment. Before any `apply`, run `railway config pull` so every existing resource is in the file, and confirm that `plan` shows no deletions.

## Consequences

- **Positive:** the image behaves the same wherever it runs. Nothing depends on the 1 Dec cutoff, and the repo has no deploy tool that could delete resources.
- **Negative:** the local Docker image is gone. If Docker returns locally, `infra/docker-compose.yml` (context `apps/api`) builds the production image, or a separate development Dockerfile has to be added under another name. The dashboard settings are not versioned or reviewed. A new or recreated service must be set up from the runbook by hand.
- **Cutover:** the dashboard settings must be in place before the commit that deletes `railway.json` deploys. Otherwise that deploy has no health check.
- **Rollback hazard:** after 1 Dec, a deployment built before this ADR would start bare FrankenPHP. Roll back only to deployments built after it.
- **Ongoing trade-off:** restart policy Always restarts a persistent failure without limit, for example a broken migration that stops the start. Railway's deploy and crash notifications should be on.

## Alternatives considered

- **Infrastructure as Code (`.railway/railway.ts`).** Rejected for now. Apply deletes anything the file omits, it adds the `railway` npm package and a second deploy path, and the docs do not show volumes, pre-deploy or draining in the DSL.
- **Keep `railway.json` until 1 Dec.** Rejected: the cutoff would change start behaviour with no deploy to mark it.
