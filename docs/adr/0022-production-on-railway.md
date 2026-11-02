# 0022 — Production API runs on Railway

Date: 2026-10-29 · Status: accepted · Amends spec §13, the content plan (self-hosting), and ADR 0016

## Context

The spec called for two VPS hosts behind Caddy, staging and production, with GitHub Actions deploying over SSH. That pipeline was never built. The only hosted environment we are running is production, on Railway, where the account already exists.

## Decision

1. **One hosted environment: production, on Railway.** There is no staging server. Local development stays `php artisan serve` with Homebrew MySQL and Redis and QF prelive keys (ADR 0003, 0004).
2. **Railway builds `apps/api/docker/Dockerfile`** (FrankenPHP, PHP 8.5, Caddy inside the image). The service root is `apps/api`. A push to `main` deploys. The container runs `php artisan migrate --force` before it serves.
3. **Three services from that image:** the API (`railway.json`, health check `GET /up`), Horizon (`railway-horizon.json`), and the scheduler (`railway-scheduler.json`). MySQL and Redis are Railway plugins. QF production keys live only in Railway variables.

   **Amended 1 Nov 2026 (ADR 0040):** the API service has a volume at `/app/storage/app/private` (the `local` disk root) and one replica. Horizon and the scheduler are not deployed while storage is a volume, because a worker service cannot share it; `QUEUE_CONNECTION=sync` builds packs inline. They return with object storage (a new ADR). **Amended 2 Nov 2026 (ADR 0044):** pre-deploy has no volume, so packs build at web start (`docker/start-web.sh`).
4. **TestFlight and the store** use `EXPO_PUBLIC_API_URL` `https://quranmobile-production.up.railway.app` (ADR 0016). Railway's `APP_URL` is the same address. **Amended 2 Nov 2026:** the address is now `https://app.taybah-app.com` (`eas.json`, with the scheme; `apiBaseUrl()` rejects a value without one). The Railway domain stays attached for builds made before the change.

## Consequences

- A bad deploy reaches testers and, later, store users. There is no staging copy to try it on first.
- Railway's MySQL and Redis versions follow the plugins. CI still runs MySQL 9.7 and Redis 8.10.
- Railway terminates public TLS. The container listens on Railway's `PORT`.
- The local `apps/api/Dockerfile` is unchanged and stays unused for production.
