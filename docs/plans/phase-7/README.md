# Phase 7 step briefs

One file per step of [`../phase-7.md`](../phase-7.md), written when the step starts (none exist yet). The reviewer checks each diff against ADR 0042 (Accepted), the spec and the approved frames; the developer commits. Phase 7 runs on branch `ft/hadith`, in parallel with Phase 6 (`ft/azkar`). Source: fawazahmed0/hadith-api, pinned to a commit SHA (revised 1 Nov 2026; hadithapi.com and ummahapi.com are not used).

| Step | Brief | Status |
| --- | --- | --- |
| 1 | Docs, ADR 0042, spec patch ([`spec-changes.md`](spec-changes.md)) | Done (1 Nov 2026): ADR 0042 accepted, patch applied |
| 2 | Env, config (dev-only `HADITH_API_KEY`, pin, titles map with ummahapi.com names and authors) | Done |
| 3 | MySQL schema | Done |
| 4 | Pack contract and hadith search normaliser | Done |
| 5 | Source interface and fawazahmed0 client, snapshot | Done |
| 6 | Importer, `hadith:import` command, dev-only `hadith:match-section-titles` | Done (+6b chapters, gap fills, completeness: ADR 0076) |
| 6b | Chapter matcher and import from OpenITI (D14, ADR 0076, proposed): 6b.0 spike and pins, 6b.1 matcher, 6b.2 import | Waiting for ADR 0076 acceptance |
| 6c | More chapter collections (Muslim, Tirmidhi, Malik) | After 6b |
| 7 | API endpoints and contract | Done (+7b ranges) |
| 8 | Design frames (developer approval gate) | Approved 7 Nov 2026 (frames in `screens/frames/hadith/`) |
| 8b | Chapter frames (changes to approved frames, developer approval gate) | Waiting for ADR 0076 acceptance |
| 9 | Cover tokens and `CollectionCover` | Done |
| 10 | Mobile data layer: content | Done |
| 11 | Mobile data layer: personal | Done |
| 12 | Mobile UI: components | Done |
| 13 | Mobile UI: screens, routes, entry points | Done |
| 14 | Search | Done |
| 15 | Hardening | Done (simulator review fixes) |
| 16 | Exit check | Done 7 Nov 2026: gates green, iPhone 17 simulator review (English UI not driven: no tap automation) |
| 17 | Release wiring (production flag on, `release.sh`, runbook) | Done: hadith:import at web start; deployed |
| 18 | Sunnah.com switch | Blocked: needs the API key and its written terms |

## Rules for every step
- ADR 0042 wins over any brief. **Never write religious text**: no hadith, grade, grade string, grader's judgement, book or chapter title, not even as an example. Tests and fixtures use placeholders such as `FIXTURE text 1 — not a hadith` / «نص تجريبي ١ — ليس حديثًا», `FIXTURE grade`, `FIXTURE grader`, source `taybah-dev-fixture`. Reports give counts, keys and paths only.
- **Pin the source.** The importer fetches from the commit SHA in `config/hadith.php` (`df57907be35291c91ad6a6691180e22ca9920784`), never `@1`, and refuses a file whose SHA-256 differs from the recorded one. Bumping the SHA is a change of its own that the developer approves.
- **Arabic only.** Store only the `ara-{c}` editions, byte for byte. `ara-{c}1` is not stored and not a `text_search` input. No English edition is fetched.
- Only `text_search` is normalised, with the hadith normaliser (it strips bidirectional and zero-width marks), not the Quran one.
- No grade is shown through Phase 7: grades are stored with their graders, `hadith.grades_visible` is `false`, and the pack's grade table is empty. There is no `review_status` column. Never invent a collection-level grade.
- There is no content reviewer. The developer decides the Arabic names, the source-line wording, the gap list and SHA bumps. All ten collections ship.
- **Rule: every collection that ships is complete (developer, 7 Nov 2026).** Complete means every hadith number in the collection's numbering has its text and its book (and its chapter once chapters exist). Gaps in fawazahmed0 are filled from OpenITI only when confirmed by both neighbours (ADR 0076). A collection that still has a gap is not packed, not listed in the manifest and not shown in the app until the gap is closed (**amended 7 Nov 2026, option 2:** after every source is tried, an unrecoverable hadith becomes a placeholder row shown as «غير متوفر حاليًا في المصدر», and the collection is released; ADR 0076); the import report states `complete: yes/no` per collection. Never ship a partial collection, never hide a gap.
- A hadith with no text in the source is not imported and is listed in the report. A missing Arabic title stays `null` and does not block shipping: the UI shows «مجموعة {n}» / «كتاب {n}» (i18n labels) and an ornament-only cover, never an invented or translated title and never the English source name in the Arabic interface.
- fawazahmed0 has no chapter (باب) level: a book lists its hadith directly. The chapter screens, columns and endpoint exist for Sunnah.com and are tested with fixtures. **Proposed amendment (D14, ADR 0076, not yet Accepted):** chapter titles and number ranges from OpenITI, titles only and never hadith text, may fill `hadith_chapters` for some collections through the dev-only `hadith:match-chapters` matcher and a committed, SHA-256-pinned data file; the Zenodo pin, the 95% two-way rule and the CC BY-NC-SA credit apply. Until the developer accepts ADR 0076, this bullet stands as written.
- Saved items reference collection slug + hadith number, never a database id, book id or chapter ordinal.
- There is no switch or lock (ADR 0045, 2 Nov 2026): the import runs on every deploy, like Azkar. Add the hadith command to `docker/release.sh` only in step 17.
- No key is needed for hadith data. `HADITH_API_KEY` is optional, **dev-only**, empty in `.env.example`, never read in production and redacted from logs, used only by `hadith:match-section-titles`. Never open or print `apps/api/.env`.
- **Titles only from the other sources.** Hadith data comes only from fawazahmed0. Collection names come from ummahapi.com (data in `config/hadith_titles.php`), Arabic authors were approved by the developer on 1 Nov 2026, and section titles come from the one-off hadithapi.com matcher (accept only at ≥95% in both directions; titles only, never hadith text or grades; refuses to run in production; not scheduled; not in `release.sh`; the command writes a proposal, never `config/`).
- Schema, endpoints, packs and screens must not need a change at the Sunnah.com switch (step 18).
- `apps/mobile/CLAUDE.md` and `apps/api/CLAUDE.md` apply in full: one component per file with its colocated test, tokens via `useTheme()`, i18n for every string, `laravel-standards` for API code, `useWindowClass()` for layout.
- UI work follows `apple-design`, is reviewed against its frame in `screens/frames/hadith/<FrameId>.html`, and is checked on the iPhone 17 simulator against `frame-shot.py` output. No UI code before step 8 is approved.
- Shared files are edited additively and at the end (see "Merge risk" in the plan). Namespace i18n keys under `hadith.*`.
- Don't commit, push, switch branches or add dependencies. Check the branch with `git branch --show-current`.
- If the code, the spec and an ADR disagree, stop and report.

## Environment
Same as [`../phase-6/README.md`](../phase-6/README.md) (Node 26 PATH prefix, PHP 8.5 path, MySQL, Android emulator, known Windows-only failures). Local: PHP 8.5 from Homebrew and Node 26 through nvm per `CLAUDE.md`. Hadith snapshots live in `apps/api/storage/app/private/sources/hadith/{commit}` (`SourceCache`, git-ignored, ADR 0068). The first snapshot downloads about 47 MB of `ara-*` JSON from jsDelivr.
