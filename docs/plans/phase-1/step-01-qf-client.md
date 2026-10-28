# Step 1 — QF client and config (API)

Follow [README.md](README.md). Read also:
- [`../phase-1.md`](../phase-1.md): "What QF prelive actually gives us" and step 1.
- [ADR 0008](../../adr/0008-phase-1-content-decisions.md).
- `docs/content-plan.md`, the "Security, environments & monitoring" section.

**Goal:** a Quran Foundation (QF) HTTP client that later sync jobs use. No database, domain services, jobs or routes in this step.

## 1. `apps/api/config/quran.php`

Read env through `App\Support\Env`, like the other config files.

| Key | Source / value |
| --- | --- |
| `qf.environment` | `QF_ENV`, default `prelive`; only `prelive` or `production` are valid |
| `qf.client_id`, `qf.client_secret` | `QF_CLIENT_ID`, `QF_CLIENT_SECRET` (default `""`) |
| `qf.contact_email` | `QF_CONTACT_EMAIL` (default `""`) |
| `qf.hosts.prelive` | auth `https://prelive-oauth2.quran.foundation`, api `https://apis-prelive.quran.foundation/content` |
| `qf.hosts.production` | auth `https://oauth2.quran.foundation`, api `https://apis.quran.foundation/content` |
| `qf.timeout` | 30 (seconds) |
| `qf.retries` | 3 |
| `qf.token_refresh_margin` | 60 (seconds) |
| `qf.per_page` | 100 |

A backed enum for the environment (`App\Integrations\QuranFoundation\QfEnvironment`) is recommended.

## 2. `apps/api/app/Integrations/QuranFoundation/`

Remove `.gitkeep`.

**`OAuthTokenProvider`:**
- `POST {auth}/oauth2/token` with HTTP Basic auth (`client_id:client_secret`) and the form body `grant_type=client_credentials&scope=content`.
- The response has `access_token` and `expires_in` (≈ 3599 s).
- Cache the token in the default cache store under a key that includes the environment, for `expires_in − token_refresh_margin`. A prelive token must never be usable for production.
- Provide `forget()`.

**`ContentSyncClient`:**
- `sync(string $resources, ?string $syncToken = null, bool $bootstrap = false)` yields one typed page per response, following `next_page_url` until `has_more` is false.
  - First request: `GET {api}/api/v4/resources/sync` with `resources`, `per_page`, and either `bootstrap=true` or `sync_token=<token>`.
  - `resources` format: `group:*`, `group:6,7` (IDs of one group comma-separated), or several groups separated by `;` (`translations:85;tafsirs:169`). Repeating a group is rejected by QF. Translation parts removed by ADR 0014 (28 Oct 2026).
  - Envelope:
    ```json
    {"sync": {"sync_until_sequence": 247, "has_more": false, "next_page_url": null,
              "next_sync_token": "…", "mutations": [ … ]}}
    ```
- `snapshot(string $snapshotUrlOrPath)` returns a typed snapshot:
  ```json
  {"resource_group": "translations", "resource_id": 85, "resource_content_id": 85, Translation parts removed by ADR 0014 (28 Oct 2026).
   "schema_version": 1, "sync_sequence": 247, "records": [ { … }, … ]}
  ```
  Records are flat objects whose fields vary by resource; keep them as `list<array<string, mixed>>`.
- **URL resolution:** `next_page_url` and `snapshot_url` are **relative** (`/api/v4/…`). Resolve them against the **current environment's** `{api}`, which already ends in `/content`. Never use a hard-coded host.
- **Mutation fields:** `sequence` (int), `type`, `resource_group`, `resource_id`, `resource_content_id`, `record_type`, `record_key`, `source_record_id`, `changed_at`, `data`, `snapshot_url`, `unavailable_reason`.
  - `type` is one of `RESOURCE_CREATE`, `RESOURCE_INVALIDATE`, `RESOURCE_DELETE`, `RESOURCE_UPDATE`, `ROW_CREATE`, `ROW_UPDATE`, `ROW_DELETE`; model it as a backed enum.
  - Model the page, mutation and snapshot as small readonly value objects.
- **Headers on every API request:** `x-auth-token: <token>`, `x-client-id: <client id>`, `User-Agent: Taybah/1.0 (+mailto:<contact_email>)`.
- **Laravel `Http` client:**
  - Timeout from config.
  - Retry up to `qf.retries` with backoff on connection errors, 5xx and 429. On 429, honour `Retry-After`, **capped at 30 s** so one 429 can't stall a sync job.
  - On **401** from the API: `forget()` the token, fetch a new one, and retry that request once.
- **Errors:** error bodies look like `{"success": false, "type": "unprocessable_entity", "message": "resources is required", "details": {…}}`.
  - Throw `QuranFoundationException extends RuntimeException`, carrying status, type and message.
  - Missing `client_id` or `client_secret` throws before any HTTP call.

**`QuranFoundationServiceProvider`:** registered in `bootstrap/providers.php`; binds the client and the token provider from config.

**Artisan `qf:ping`:**
1. Get a token.
2. `sync("translations:85", bootstrap: true)`. Translation parts removed by ADR 0014 (28 Oct 2026).
3. `snapshot()` the first `RESOURCE_CREATE`'s `snapshot_url`.
4. Print **only**: the environment, the HTTP outcome, the mutation count and the snapshot record count. Never the token, client id, secret or any record content.

## 3. Tests

Pest, `Http::fake` with `Http::preventStrayRequests()`. Put tiny hand-written fixtures in the shapes above under `apps/api/tests/Fixtures/qf/`: a few records each, nothing copied in bulk.

- **Token:**
  - Basic auth and the form body are sent.
  - The token is cached: a second call makes no request.
  - It refreshes after `expires_in − margin` (`$this->travel`).
  - Prelive and production use different cache keys and hosts.
- **Sync:**
  - Follows `next_page_url` across 2+ pages, resolving against the configured environment's api base.
  - `sync_token` vs `bootstrap` query params.
  - The three headers, including the contact email.
- **Snapshot:** resolves a relative URL; typed records.
- **Errors:**
  - 429 + `Retry-After` retries, then succeeds.
  - 5xx retries.
  - 401 forgets the token, refetches, and retries once.
  - A 422 body becomes `QuranFoundationException` with its message.
  - Missing credentials throw before HTTP.
- **`qf:ping`:** prints counts, never the token or client id.
- The existing arch test stays green.

## Leave untouched

`app/Domains`, `database/`, `routes/`, `apps/mobile`, `packages/`, `docs/`, `.github/`, `composer.json`/`composer.lock` (no packages), and the existing tests (only add new ones).
