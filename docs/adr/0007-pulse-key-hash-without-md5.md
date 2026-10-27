# 0007 — Pulse `key_hash` uses SHA-256, not MD5

Date: 2026-10-27 · Status: accepted

## Context

The first CI run failed while migrating the test database on MySQL 9.7:

> 3763 Expression of generated column 'key_hash' contains a disallowed function: `md5`.

The Pulse migration as published by `laravel/pulse` 1.8.1 defines `key_hash` on `pulse_values`, `pulse_entries` and `pulse_aggregates` as `unhex(md5(key))`. MySQL 9.4 deprecated `MD5()` and `SHA1()`. MySQL 9.6 moved them out of the built-in functions, and generated columns may only use built-in functions. The legacy hashing component brings `MD5()` back for queries but not for generated columns.

Local MySQL is Homebrew 9.2, which still has `MD5()`, so this only showed in CI. Production runs 9.7, so `php artisan migrate` would have failed there too. Pulse 1.8.1 is the latest release, and there was no upstream issue or fix when this was written.

## Decision

- In our published migration, `key_hash` is `unhex(left(sha2(key, 256), 32))`: the first 16 bytes of SHA-256. The `char(16)` binary column and its indexes are unchanged.
- This is safe because on MySQL only the database computes `key_hash`. Pulse hashes in PHP only on SQLite (`requiresManualKeyHash()`). Its queries only compare `key_hash` with `key_hash`, so any deterministic 16-byte hash works.
- The PostgreSQL and SQLite branches are untouched.
- `tests/Unit/MigrationCompatibilityTest.php` fails if any migration calls `md5()` or `sha1()` on a MySQL column. This is needed because local 9.2 accepts them.

## Consequences

- If a later Pulse release ships a new migration, check it for `MD5()` before running it.
- The local `quran` database still has the MD5 columns from step 4. They work on 9.2. Run `php artisan migrate:fresh` before the local MySQL moves to 9.6 or later. Tests use fresh migrations, so they are already on SHA-256.
- Drop this change if Pulse fixes the migration upstream.
