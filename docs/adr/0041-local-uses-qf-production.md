# 0041 — Local development uses QF production keys

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends the content plan («Security, environments & monitoring», channel table), spec §13 and apps/api/CLAUDE.md («Content and QF»)

## Context

The content plan gave local development QF's prelive keys and kept production keys for the Railway API only. Prelive holds sample data: 2 chapters and 2 chapter reciters (Husary 6, Afasy 7). On 1 Nov 2026 QF issued production keys. Production has the full dataset: 114 chapters, 9 Arabic tafsirs and 21 chapter reciters.

With prelive, the local app can't show what production will ship, and the 6,236-ayah checksum and Phase 1 exit check can't run locally.

## Decision

1. **The local API uses QF production keys** (`QF_ENV=production` in `apps/api/.env`). The local mirror syncs the full production dataset.
2. **The key pair stays out of git.** It lives only in the developer's `apps/api/.env` and in Railway variables. Non-negotiables 2 and 8 are unchanged.
3. **Stores stay per environment.** `sync_states` is keyed by environment and resource group, so a switch between prelive and production re-bootstraps instead of mixing tokens (QF Content Sync rule).
4. **Prelive stays available.** Its pair is kept commented out in the local `.env`. Tests never call QF (`Http::fake` with recorded fixtures), so CI needs no keys.
5. **The reciter allowlist follows production** (developer, 1 Nov 2026). `quran.sync.groups.chapter_recitations` lists every production chapter reciter except 173, a duplicate stream of Afasy (7). Reciter 176 is beta on QF and its Arabic name says so («تجريبي»). Missing Arabic names are filled in `quran.reciter_display_names` (names, not Quran text).

## Consequences

- Local sync load hits QF production. It's the same daily volume as the Railway API, from one more client.
- A local bug that writes bad data stays local. QF data is read-only to us.
- Local and Railway share one QF client. Rotating the secret means updating both.
- Spec §16's question about a full prelive dataset is closed.
