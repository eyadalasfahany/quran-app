# API (Laravel 13, PHP 8.5)

Spec: `docs/technical-spec.md` §3 (structure), §5 (schema), §7 (pipeline), §8–9 (API), §10 (auth), §11 (sync), §13 (envs).

## Structure

- Domains under `app/Domains/{Content,Audio,Hadith,Identity,Sync,Devices,Notifications}`.
- External providers under `app/Integrations/{QuranFoundation,HadeethEnc,AlAdhan,Expo}`, each implementing `ContentSource` where it supplies content.
- Shared helpers in `app/Support` (`ArabicNormalizer`, `HtmlSanitizer`, `VerseKey`, `ProblemDetails`).

## Layering (enforced by Pest `arch()` tests)

Controller → FormRequest → Data object (`spatie/laravel-data`) → Service → Repository contract → Eloquent repository → Model.

- Controllers are thin: validate, call one service method, return a Data object. No Eloquent in controllers.
- Services own business rules and transactions. Services never touch `Request` or HTTP.
- Repositories do persistence only. No transactions, no business rules.
- Each domain's service provider binds its repository contracts and registers its routes.
- `Integrations` never import from `Domains`.

## Team standards (ADR 0002)

Follow `.claude/skills/laravel-standards`, except where this file or the spec says otherwise.

- `declare(strict_types=1)` and full typing in every PHP file, tests included. No `mixed` or loose arrays across layers.
- One shared FormRequest per entity unless store and update genuinely differ.
- Domain exceptions, never bare `\Exception`. Not-found errors carry a friendly message and render as problem details.
- Enums and value objects instead of primitives; eager-load every relation a Data object or loop touches.
- The spec wins on: Data objects (not API Resources or the skill's envelope), cursor pagination (not `per_page`), the generated OpenAPI file (not hand-kept Postman collections), MySQL for tests (not SQLite).
- Repositories: extend the Eloquent base class in `app/Support/Repositories` and implement the domain's contract.

## Database

- MySQL 9.7, InnoDB, `utf8mb4`. Quran text columns use `utf8mb4_0900_bin`; everything else `utf8mb4_0900_ai_ci`. Timestamps `datetime(6)` UTC.
- User data references `verse_id`, never free-text verse keys.
- Synced user tables all carry `id` (client UUID), `user_id`, `client_updated_at`, `server_version`, `deleted_at`, plus an index on (`user_id`, `server_version`).
- Migrations are additive in production. A destructive change needs an ADR.

## API rules

- All routes under `/api/v1`. Errors are RFC 9457 problem details with a stable `code`.
- Cursor pagination only. Content endpoints send `ETag`; user endpoints send `Cache-Control: no-store`.
- Rate limits per spec §8. `Accept-Language` localizes messages and emails only, never content.
- OpenAPI is generated from routes, FormRequests and Data objects. Keep them accurate; CI fails on drift.

## Content and QF

- QF prelive keys for local and staging, production keys only in production. Sync tokens and mirrors are per environment.
- Apply Content Sync mutations in ascending `sequence`, one transaction per mutation, advancing `last_sequence` in the same transaction.
- Any `quran_core` change runs `VerifyTextIntegrityJob`; a mismatch blocks pack publishing.
- HTTP clients: retry with backoff, User-Agent with app name and contact email, respect `Retry-After` on 429.

## Tests

- Pest feature tests for every endpoint; `Http::fake` with recorded QF fixtures, never live QF calls in tests.
- Sync must cover the cases in spec §11 (two devices offline, delete vs edit, guest merge, clock skew, old cursor, retried push).
- Feature tests (`it()` / `expect()`) for HTTP contracts; unit tests build services with Mockery-mocked repositories and gateways. Mock I/O, never the rule under test.
- Run: `composer qa` (`pint --test`, `phpstan analyse` at Larastan level 8, `pest --parallel`) with local PHP 8.5. Redis uses the `predis` client, so no PHP extension is needed.
