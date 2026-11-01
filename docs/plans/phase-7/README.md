# Phase 7 step briefs

One file per step of [`../phase-7.md`](../phase-7.md), written when the step starts (none exist yet). The reviewer checks each diff against ADR 0042 (Proposed), the spec and the approved frames; the developer commits. Phase 7 runs on branch `ft/hadith`, in parallel with Phase 6 (`ft/azkar`). Source: fawazahmed0/hadith-api, pinned to a commit SHA (revised 1 Nov 2026; hadithapi.com and ummahapi.com are not used).

| Step | Brief | Status |
| --- | --- | --- |
| 1 | Docs, ADR 0042, spec patch ([`spec-changes.md`](spec-changes.md)) | Drafted, revised for fawazahmed0 (1 Nov 2026); patch not applied |
| 2 | Env, config, kill switch (remove `HADITH_API_KEY`, pin, titles map skeleton) | |
| 3 | MySQL schema | |
| 4 | Pack contract and hadith search normaliser | |
| 5 | Source interface and fawazahmed0 client, snapshot | |
| 6 | Importer and `hadith:import` command | |
| 7 | API endpoints and contract | |
| 8 | Design frames (developer approval gate) | |
| 9 | Cover tokens and `CollectionCover` | |
| 10 | Mobile data layer: content | |
| 11 | Mobile data layer: personal | |
| 12 | Mobile UI: components | |
| 13 | Mobile UI: screens, routes, entry points | |
| 14 | Search | |
| 15 | Hardening | |
| 16 | Exit check | |
| 17 | Release wiring (production flag on, `release.sh`, runbook) | |
| 18 | Sunnah.com switch | Blocked: needs the API key and its written terms |

## Rules for every step
- ADR 0042 wins over any brief. **Never write religious text**: no hadith, grade, grade string, grader's judgement, book or chapter title, not even as an example. Tests and fixtures use placeholders such as `FIXTURE text 1 — not a hadith` / «نص تجريبي ١ — ليس حديثًا», `FIXTURE grade`, `FIXTURE grader`, source `taybah-dev-fixture`. Reports give counts, keys and paths only.
- **Pin the source.** The importer fetches from the commit SHA in `config/hadith.php` (`df57907be35291c91ad6a6691180e22ca9920784`), never `@1`, and refuses a file whose SHA-256 differs from the recorded one. Bumping the SHA is a change of its own that the developer approves.
- **Arabic only.** Store only the `ara-{c}` editions, byte for byte. `ara-{c}1` is not stored and not a `text_search` input. No English edition is fetched.
- Only `text_search` is normalised, with the hadith normaliser (it strips bidirectional and zero-width marks), not the Quran one.
- No grade is shown through Phase 7: grades are stored with their graders, `hadith.grades_visible` is `false`, and the pack's grade table is empty. There is no `review_status` column. Never invent a collection-level grade.
- There is no content reviewer. The developer decides the Arabic names, the source-line wording, the gap list and SHA bumps. All ten collections ship.
- A hadith with no text in the source is not imported and is listed in the report. A missing Arabic title stays `null` and does not block shipping: the UI shows «مجموعة {n}» / «كتاب {n}» (i18n labels) and an ornament-only cover, never an invented or translated title and never the English source name in the Arabic interface.
- fawazahmed0 has no chapter (باب) level: a book lists its hadith directly. The chapter screens, columns and endpoint exist for Sunnah.com and are tested with fixtures.
- Saved items reference collection slug + hadith number, never a database id, book id or chapter ordinal.
- `HADITH_COLLECTIONS_IMPORT_ENABLED` is the only lock: a kill switch, `false` in `.env.example`, `true` in production at release. Add the hadith command to `docker/release.sh` only in step 17.
- There is no provider key. `HADITH_API_KEY` is removed from `.env.example`; never open or print `apps/api/.env`.
- Schema, endpoints, packs and screens must not need a change at the Sunnah.com switch (step 18).
- `apps/mobile/CLAUDE.md` and `apps/api/CLAUDE.md` apply in full: one component per file with its colocated test, tokens via `useTheme()`, i18n for every string, `laravel-standards` for API code, `useWindowClass()` for layout.
- UI work follows `apple-design`, is reviewed against its frame in `quran-app-screens.html`, and is checked on the iPhone 17 simulator against `frame-shot.py` output. No UI code before step 8 is approved.
- Shared files are edited additively and at the end (see "Merge risk" in the plan). Namespace i18n keys under `hadith.*`.
- Don't commit, push, switch branches or add dependencies. Check the branch with `git branch --show-current`.
- If the code, the spec and an ADR disagree, stop and report.

## Environment
Same as [`../phase-6/README.md`](../phase-6/README.md) (Node 26 PATH prefix, PHP 8.5 path, MySQL, Android emulator, known Windows-only failures). Local: PHP 8.5 from Homebrew and Node 26 through nvm per `CLAUDE.md`. Hadith snapshots live in `apps/api/storage/app/hadith` (git-ignored; confirm in step 5). The first snapshot downloads about 47 MB of `ara-*` JSON from jsDelivr.
