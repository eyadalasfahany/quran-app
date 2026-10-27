# 0004 — Local MySQL and Redis from Homebrew, Docker deferred

Date: 2026-10-27 · Status: accepted · Amends ADR 0003

## Context

ADR 0003 ran MySQL 9.7, Redis 8.10, Mailpit, Horizon and the scheduler in Docker Compose. This Mac already runs Homebrew MySQL (9.2, shared with other projects, managed in phpMyAdmin) and has Homebrew Redis (8.0), and PHP 8.5 is local. Docker adds a second MySQL to look after for one developer.

## Decision

For now, local development uses the Homebrew services:

- MySQL 9.2 on port 3306, with a dedicated `quran` user that can only reach `quran` and `quran_testing*` databases. The brew MySQL is not upgraded, because other projects share its data directory and MySQL can't be downgraded.
- Redis 8.0 on port 6379 (`brew services start redis`).
- No Mailpit: `MAIL_MAILER=log` writes mail to `storage/logs/laravel.log`.
- `php artisan serve`, `php artisan horizon` and `php artisan schedule:work` run on local PHP 8.5 when needed.

`infra/docker-compose.yml` and `apps/api/Dockerfile` stay in the repo, unused, for when Docker comes back.

## Consequences

- Local versions trail the pins (MySQL 9.7, Redis 8.10). CI uses the pinned versions in service containers, so a version-specific difference surfaces there, not on the Mac.
- Mail can't be viewed in an inbox until Mailpit (or Docker) returns; that matters from Phase 4 (email sign-in codes).
- Setup steps live in `docs/runbooks/local-setup.md`.
