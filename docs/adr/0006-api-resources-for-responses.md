# 0006 — API Resources shape responses; Data objects stay inside

Date: 2026-10-27 · Status: accepted · Amends ADR 0002 (response shape) and spec section 3

## Context

Phase 0 step 9 generates `openapi.json` with `dedoc/scramble` (0.13.51), then TS types with `openapi-typescript`. The spec assumed Scramble reads `spatie/laravel-data` objects. The free version doesn't; that support is in Scramble PRO. Its laravel-data code only prints a PRO notice.

With `HealthData` returned from the controller, the export was `{"type": "object", "additionalProperties": {}}`. The generated TS type became `Record<string, unknown>`, so a renamed field could never fail the app's `tsc`.

Options were:

- Writing our own Scramble extension for Data objects.
- Buying Scramble PRO.
- Returning Laravel API Resources, which free Scramble documents from `toArray()`.

The developer chose API Resources, and kept laravel-data for typed values inside the API.

## Decision

- **Responses** are API Resources in `Domains/*/Http/Resources`.
  - `toArray()` lists every field explicitly.
  - `$wrap = null`, so the section 8 envelope still holds: the resource directly, or `{data, next_cursor}` for lists.
  - The resource's `@property` docblock names the Data object it wraps.
  - A status that depends on the payload is set in `withResponse()`. Scramble can't see it there, so it is declared with `#[Dedoc\Scramble\Attributes\Response]` on the controller method (`/health` declares its 503 this way).
- **Data objects stay** for typed values between layers: what a service returns, and DTOs built from a FormRequest's validated input. They never touch HTTP (an `arch()` rule enforces this). Scramble documents request bodies from the FormRequests.
- **Export:**
  - `npm run generate -w @quran/api-contract` runs `scramble:export --fail-on-unknown`, then `openapi-typescript`.
  - An unknown type fails the export, so an undocumented field can't slip through.
  - The server is the relative `/api/v1` and the title and version are pinned in `config/scramble.php`, so the file is the same on every machine.
- Scramble is a production dependency. `config/scramble.php` is loaded on every boot and reads a Scramble enum, so a `--no-dev` install without it would fail to boot. Its docs UI at `/docs/api` stays closed outside `local`: `RestrictedDocsAccess` allows other environments only through a `viewApiDocs` gate, and none is defined.

## Consequences

- Controllers return `new XResource($service->method())`. They still don't touch Eloquent.
- Every response field is written twice: once on the Data object, once in `toArray()`. `toArray()` is where `snake_case` names and date formats are set (dates use `toIso8601ZuluString('millisecond')`).
- Scramble still prints its PRO notice on export, because the resource wraps a Data object. The schema is complete; the notice can be ignored.
- If PRO is bought later, controllers could return Data objects again. This ADR would then be superseded.
