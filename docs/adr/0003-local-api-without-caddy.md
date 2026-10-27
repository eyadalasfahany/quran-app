# 0003 — Local API runs on `php artisan serve`, not Caddy

Date: 2026-10-27 · Status: accepted; Docker part deferred by ADR 0004 (Homebrew MySQL and Redis for now)

## Context

Section 13 said the local API runs in `docker compose` on the Mac. PHP-FPM speaks FastCGI, so the simulator can only reach it through a web server. Caddy is what staging and production use, but adding it locally is extra setup for one developer, and PHP 8.5 is installed locally anyway.

## Decision

Locally the API runs with `php artisan serve` on port 8000 using the Homebrew PHP 8.5. `infra/docker-compose.yml` runs MySQL 9.7, Redis 8.10, Mailpit, Horizon and the scheduler, plus an app service that runs `artisan serve` for anyone who prefers the container. Host ports avoid the ones already used on this machine: MySQL 33306, Redis 16379, Mailpit 18025 (SMTP 11025). The Caddyfile and PHP-FPM image are built when staging is set up.

## Consequences

- iOS simulators call `http://localhost:8000`; Android emulators call `http://10.0.2.2:8000`. `EXPO_PUBLIC_API_URL` carries the value per profile.
- Local requests skip Caddy's TLS, HSTS, compression and 1 MB body cap, so those are first exercised on staging.
- PHP 8.5 and Node 26 must be installed locally (Homebrew `php`, nvm with `.nvmrc`).
