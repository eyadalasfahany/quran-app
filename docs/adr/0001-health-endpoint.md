# 0001 — Add `GET /api/v1/health`

Date: 2026-10-27 · Status: accepted

## Context

Phase 0 needs one endpoint that runs through every backend layer (provider, contract, Eloquent repository, service, controller, Data object), gets exported by Scramble, and is imported by the app as a generated type. None of the 26 endpoints in section 9 can be built in Phase 0 without schema or provider work from later phases. Laravel's built-in `/up` only says the framework booted; it doesn't check MySQL or Redis and isn't part of `/api/v1` or the OpenAPI file.

## Decision

Add `GET /api/v1/health` (no auth) to section 9. It returns `status`, `time` and `checks` (`database`, `redis`), answers `200` when every check passes and `503` otherwise, and sends `Cache-Control: no-store`. It lives in `Domains/Sync` as the Phase 0 example domain; the Eloquent repository checks the database through the `users` table Laravel ships, so no Phase 4 tables are created early. `/up` stays for the external uptime checker (section 13).

## Consequences

- Section 9 lists 27 endpoints.
- The app gets a real generated type to prove the contract flow in Phase 0.
- If health later needs to sit outside Sync (for example a `System` domain), moving it is a code-only change; the route and payload stay the same.
