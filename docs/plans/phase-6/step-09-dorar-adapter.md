# Step 9 — Dorar adapter (API only)

ADR 0031 §2. The offline Azkar reader never depends on this. **No Dorar data is stored in any content table or pack.**

## What is known
The developer confirms an official Dorar hadith API reached with an approved access token (31 Oct 2026). It can return the hadith text, narrator (الراوي), muhaddith (المحدث), source (المصدر), page or number, grade (حكم المحدث), the canonical Dorar URL, an explanation link and related or similar links. Its terms forbid bulk import, scraping and permanent storage in offline packs without separate written permission, and they limit caching.

**Not available in the repo yet:** the token, the endpoint paths, the auth header format, the response schema and the exact caching limits. Everything below is built so those arrive as configuration and one mapper class.

## Build
- **Contract** `App\Domains\Azkar\Contracts\HadithReferenceSource`:
  - `isAvailable(): bool`
  - `lookup(HadithReferenceQuery $query): HadithReferenceResult`
- **DTOs** (follow the existing `Data` classes; every field nullable except `attribution`):
  - `HadithReferenceQuery`: `text` (search string), `?page`.
  - `HadithReference`: `textAr`, `narrator`, `muhaddith`, `source`, `pageOrNumber`, `grade`, `canonicalUrl`, `explanationUrl`, `similarUrls` (list), `attribution`.
  - `HadithReferenceResult`: list of `HadithReference`, `provider` (`dorar` | `none`), `retrievedAt`.
- **`NullHadithReferenceSource`:** `isAvailable() = false`, empty result. Bound in the container whenever `services.dorar.token` is empty.
- **`App\Integrations\Dorar\DorarClient`:** the transport only.
  - **Config** (`config/services.php` `dorar` block, env with empty defaults in `.env.example`): `DORAR_API_BASE_URL`, `DORAR_API_TOKEN`, `DORAR_TOKEN_HEADER` (default `Authorization`), `DORAR_TOKEN_PREFIX` (default `Bearer `), `DORAR_TIMEOUT_SECONDS` (5), `DORAR_MAX_REQUESTS_PER_MINUTE` (30), `DORAR_CACHE_TTL_SECONDS` (0 = no caching beyond the request).
  - **Requests:** sends the token header plus a `User-Agent` naming Taybah. The token never appears in logs, exceptions or responses (redact it).
  - **Limits and errors:**
    - The app's own limiter enforces the per-minute limit (Laravel `RateLimiter`).
    - A 429 throws `DorarRateLimitedException` carrying `Retry-After`.
    - Other non-2xx responses throw `DorarRequestException`, without the body when it might echo the token.
  - **Cache:** only when the TTL is above 0, keyed by a hash of the query.
- **`DorarHadithReferenceSource`:** implements the contract with `DorarClient` plus `DorarResponseMapper`.
  - The mapper has no schema to map until the developer adds Dorar's API documentation. It throws `DorarMappingUnavailableException` with a message pointing to this brief.
  - The class is bound whenever the base URL and the token are set (no switch, ADR 0045; removed 2 Nov 2026).
- **No route, no job, no scheduled task, no console command that loops over queries.** An HTTP endpoint for the app comes later, with the mapper.

## Tests (Pest)
- **Binding:** Null when no token; Null when the token is set but disabled; Dorar when both are set.
- **Transport** (`Http::fake`):
  - the configured header and prefix are sent
  - a 429 raises the limited exception with `Retry-After`
  - a timeout is applied
  - the token is redacted from exception messages and logs
  - the limiter blocks request 31 within a minute (configurable)
  - cache off with TTL 0; cache hit within the TTL when above 0
- **Mapper:** throws the "unavailable" exception.
- **Architecture** (`tests/Unit/ArchitectureTest.php` style): nothing in `App\Domains\Azkar\Services`, `App\Domains\Content\Packs` or any model uses `App\Integrations\Dorar`. Dorar data cannot reach a pack.
