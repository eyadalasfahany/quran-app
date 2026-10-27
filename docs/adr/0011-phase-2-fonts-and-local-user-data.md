# 0011 — Phase 2: mushaf fonts on first use, bundled Amiri, local user data

Date: 2026-10-27 · Status: accepted · Amends root CLAUDE.md non-negotiable #2, ADR 0009 (`user.db` timing) and the content-plan fonts row

## Context

Phase 2 builds the reader (`docs/plans/phase-2.md`). The developer answered three questions:

- **D1:** download the QCF V2 mushaf fonts on first use instead of bundling them.
- **D2:** have bookmarks, highlights and notes work in Phase 2.
- **D3:** bundle Amiri and Amiri Quran for Reading and Focus modes.

QF's font documentation (`api-docs.quran.com/docs/tutorials/fonts/font-rendering`) says:
- The 604 QCF V2 page fonts are served from `https://verses.quran.foundation/fonts/quran/hafs/v2/{ttf|woff|woff2}/p{page}.{ext}`.
- Local caching and bundling are allowed only with an active Developer Console account and an accessible credit: *"Quran fonts provided by Quran Foundation."*
- Cached copies need a refresh strategy, because files get corrected.
- Distribution is limited to "an integrated part of your application". The files **may not be offered through your own API, asset package or standalone download.**

## Decision

1. **Mushaf fonts load from QF's CDN on first use.**
   - **Source:** the app fetches `…/hafs/v2/ttf/p{page}.ttf` directly from `verses.quran.foundation`, for the visible page and the two pages either side. **Our API never serves, mirrors or repackages them.**
   - **Cache:** each file is kept in the app's document directory and loaded with `expo-font`.
   - **Offline:** an optional "download all mushaf pages" action fetches the rest in the background, so Mushaf mode works offline.
   - **Refresh:** the cached `ETag` and `Last-Modified` are revalidated with a conditional request at most once every 30 days per file, when online.
   - **Credit:** "Quran fonts provided by Quran Foundation" appears in Settings → Sources and in the store description.
   - **Account:** the Developer Console account must stay active, as the terms require.
2. **Non-negotiable #2 becomes:** "The app calls only our API, the audio URLs QF's API returns, and QF's public font CDN (`verses.quran.foundation`, mushaf fonts only)."
   - QF credentials still never leave `apps/api`. The font CDN is public and needs no credentials.
3. **A local-only `user.db` moves into Phase 2.**
   - **Scope:** bookmarks, highlights and notes are written to `user.db` (spec §6 schema), and every write also appends an `outbox` row (non-negotiable #4).
   - **Phase 4** adds the sender, the pull and account sync on top, with no schema change.
   - ADR 0009's "`user.db` moves to Phase 4" now applies only to the sync engine.
4. **Amiri and Amiri Quran 1.003 are bundled** (SIL Open Font License, `github.com/aliftype/amiri`), used for:
   - Uthmani ayah text in Reading and Focus modes.
   - Surah names and display type.
   - Their licence file ships with them.
   - **Exception to the 12-month release rule:** 1.003 is from June 2025. The rule targets code packages, and a stable typeface isn't a maintenance risk, so this is accepted and recorded here.

## Consequences

- **Offline:** Mushaf mode needs the network the first time each page is shown, unless "download all" was used. Reading mode works offline from first launch (Tanzil text and Amiri Quran).
- **Phase 4:** the sync phase shrinks to the sender, the pull and the conflict rules.
- **New items in the content-plan version table:** the Amiri fonts, plus the QF font CDN as a runtime source.
