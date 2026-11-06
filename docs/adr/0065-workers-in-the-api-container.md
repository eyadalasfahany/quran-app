# 0065 — Horizon and the scheduler run in the API container

Date: 2026-11-06 · Status: **accepted** (developer, 6 Nov 2026) · Amends: ADR 0022 §3, ADR 0040 (workers not deployed), spec §13 (environments), `docs/runbooks/railway-release.md`

## Context

ADR 0040 took Horizon and the scheduler off Railway. Only the API service mounts the volume, and a separate worker service cannot share it, so a pack built there would never be served. `QUEUE_CONNECTION=sync` builds packs inline, and the scheduler's work was left to manual runs over `railway ssh`.

As a result, none of the three entries in `routes/console.php` run in production: the daily 02:00 UTC QF sync, `PruneContentChangesJob`, and `RefreshStoreVersionsCommand` every 15 minutes (the force-update data, ADR 0060).

The developer wants the queue and the schedule running without adding Railway services (6 Nov 2026).

## Decision

1. **One container, three programs.** `docker/start-web.sh` runs its start steps as before (migrations, imports, `content:ensure-packs`), then `exec supervisord -c /etc/supervisor/taybah.conf` (`docker/supervisord.conf`). supervisord runs `web` (FrankenPHP), `horizon` and `scheduler` (`schedule:work`), each restarted when it exits. The workers start only after the migrations, so they never see an old schema. They share the volume, which removes ADR 0040's reason for keeping them off.
2. **A web failure restarts the container; a worker failure does not.** An event listener (`docker/supervisor-web-fatal.sh`) stops supervisord when `web` reaches FATAL. The container then exits and Railway restarts it (restart policy Always; a dashboard setting since ADR 0067). A crash loop in Horizon or the scheduler, for example while Redis is down, leaves the API serving.
3. **Graceful stop.** Railway's SIGTERM reaches supervisord, which passes it to every program. Horizon finishes its current job, with up to 120 s (`stopwaitsecs`). Railway's draining seconds are set in the dashboard above that (130 s).
4. **One replica stays a rule** (ADR 0040). Every schedule entry also uses `onOneServer()`, a Redis lock, so a brief overlap between deployments cannot run a job twice.
5. **Queue settings fixed for Redis.**
   - Horizon listens on `sync`, `packs` and `default`. `SyncQuranFoundationJob` uses `sync`, and it was missing from the list.
   - Production runs 2 Horizon processes instead of 10, because they share the container's memory with FrankenPHP.
   - `SyncQuranFoundationJob` has a 1800 s timeout and `uniqueFor` 7200 s, so a run killed by a deploy does not hold its unique lock forever.
   - `BuildContentPackJob` has a 600 s timeout.
   - The Redis `retry_after` is 1860 s, longer than the longest timeout.
   - These timeouts are first estimates. Check them against Horizon's job runtimes once it runs.
6. **Rollout in two steps.**
   1. Deploy with `QUEUE_CONNECTION=sync`. The scheduler starts working, and its jobs run inline in `schedule:run` with no worker timeout. Horizon runs but has no jobs.
   2. Once the logs show Horizon running, set `QUEUE_CONNECTION=redis`. Jobs and pack builds then leave the scheduler and web request paths.
7. `railway-horizon.json` and `railway-scheduler.json` are no longer used and are removed.

## Consequences

- **Positive:** the QF sync, the change-feed prune and the store-version refresh run on schedule. No new Railway service and no extra cost. Pack builds can move off the request path.
- **Negative:** the workers share the container's CPU and memory with the web server, so a heavy pack build can slow requests. A deploy stops all three programs together. Scaling the web server alone is not possible, but volumes already rule out replicas.
- **Later:** object storage (the follow-up ADR 0040 named) would let the workers move to their own service again.

## Alternatives considered

- **Background processes (`&`) in `start-web.sh`.** Rejected: nothing restarts a crashed worker, Railway checks only `/up`, and SIGTERM reaches only FrankenPHP, so running jobs are cut off.
- **Separate Horizon and scheduler services.** Rejected: they cannot share the volume (ADR 0040), and the developer asked for no new services.
- **Railway cron service for the scheduler.** Rejected: also a new service, and it has no volume.
