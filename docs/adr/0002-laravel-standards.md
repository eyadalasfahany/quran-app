# 0002 — Apply the `laravel-standards` skill, with the spec taking precedence

Date: 2026-10-27 · Status: accepted

## Context

The project now carries the team's `laravel-standards` skill (`.claude/skills/laravel-standards`). It was written for admin-panel CRUD APIs and disagrees with this spec in five places: response shape, pagination, repository style, API collections and the test database.

## Decision

Adopt the skill's rules that don't conflict with the spec:

- `declare(strict_types=1)` and full typing in every PHP file, tests included.
- One shared FormRequest per entity; thin controllers; services own transactions and not-found handling.
- Domain exceptions, never bare `\Exception`; enums and value objects instead of primitives.
- Eager loading, no N+1; index filter and sort columns.
- Pest functional tests for HTTP contracts; Mockery unit tests for services that mock I/O only, never the rule under test.
- A `composer qa` script (Pint, Larastan, Pest).

Where they conflict, the spec wins:

| Topic | Skill | This project |
| --- | --- | --- |
| Response shape | API Resources and a `{code, errors, data, message, meta}` envelope | `spatie/laravel-data` objects; the resource directly or `{data, next_cursor}`; RFC 9457 problem details for errors (section 8) |
| Pagination | Page-number paginator with `per_page` | Opaque cursors only; the admin panel is Filament, so there is no admin list API |
| Repositories | Concrete `BaseRepository` | Shared Eloquent base class in `Support/Repositories` plus one contract per repository, bound in the domain's service provider |
| API collections | Hand-kept Postman and Hoppscotch files | The generated `openapi.json` is the collection; both tools import it, and CI fails on drift |
| Test database | Isolated SQLite files | MySQL 9.7, because Quran text columns rely on `utf8mb4_0900_bin` |

## Consequences

- `apps/api/CLAUDE.md` and section 3 of the spec list these rules.
- Friendly not-found messages from the skill are kept but rendered as problem details with a stable `code`.
