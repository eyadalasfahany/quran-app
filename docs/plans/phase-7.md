# Phase 7 — الحديث (Hadith: full collections)

Status: **planned, not started** · Branch: `ft/hadith` (the developer creates it; these files are written on `main` and move there) · Runs **in parallel with Phase 6** (`ft/azkar`, exit check still open) · ADR 0042 (Proposed) · Spec §5, §6, §7, §9, §4, §15 (proposed edits in [`phase-7/spec-changes.md`](phase-7/spec-changes.md), not applied).

**Goal:** a Hadith section with full collections (collection → book/كتاب → chapter/باب → hadith) that reads fully offline from per-collection packs. The source today is hadithapi.com, behind two locks, for development builds only. When Sunnah.com grants a key, a `SunnahComSource` replaces it with **no change** to the schema, endpoints, packs or screens.

HadeethEnc (daily hadith, topics, explanations, the spec §5 `hadith_categories` / `hadiths` / `hadith_translations` / `daily_hadiths` tables, the daily hadith push) is **deferred to a later phase**. Its spec text stays in place and is marked deferred.

**Sources this plan rests on (all read for this plan):**
- `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/mobile/CLAUDE.md`, `.claude/agent-rules.md`.
- `docs/technical-spec.md` §3 (domains, jobs), §4 (routes), §5 (schema, `content_sources`, `resources`, Hadith tables), §6 (`content.db`, `user.db`), §7 (pack contract, Azkar import), §8–§9 (conventions, endpoints), §12 (search), §13 (daily hadith push), §15 (delivery plan, cut lines), §16.
- `docs/content-plan.md` («Hadith» section, hadith sources table, «Rules for every provider»).
- ADR 0006 (API Resources), 0008 (resource groups), 0010 and 0013 (HTML designs win), 0014 (hadith translations stay), 0017 (Home tiles), 0027 (local-only), 0028 (Quran bookmark), 0031 (Azkar pattern), 0032 (Menu), 0038 (rights on public statements), 0041 (QF production keys), 0042 (this phase).
- `docs/plans/phase-6.md` and `docs/plans/phase-6/README.md` (format), `phase-6/step-02-schema.md`, `phase-6/step-04-frames.md`.
- Code read: `apps/api/app/Domains/Azkar/**` (importer, sources, contracts), `apps/api/app/Integrations/Dorar/**`, `apps/api/app/Domains/Content/Enums/ResourceGroup.php` and `ServedResourceGroup.php`, `Content/Packs/PackSchema.php`, `apps/api/app/Support/QuranText/SearchTextNormalizer.php`, `apps/api/routes/console.php`, `apps/api/config/azkar.php`, `apps/api/.env.example`, `docs/runbooks/railway-release.md`, `apps/mobile/src/core/sync/content-tables.ts`.

## Rules

- All earlier-phase rules apply (`apps/mobile/CLAUDE.md`, `apple-design`, tokens through `useTheme()`, one component per file with its colocated test, screens only compose).
- **No religious text anywhere**: not in code, tests, fixtures, frames, docs or reports. Fixtures are placeholders (`FIXTURE text 1 — not a hadith`, «نص تجريبي ١ — ليس حديثًا») with source `taybah-dev-fixture`. Frames use bracketed placeholders such as «[نص الحديث كما ورد في المصدر]». Counts, keys and file paths only in reports.
- **Hadith text is never altered.** Arabic is stored byte for byte as received (U+200F marks included). Only `text_search` is normalised.
- **The API key appears in no file except `apps/api/.env`** (never opened or printed by an agent). Fixtures use `FIXTURE-KEY`.
- **No grade is shown** while `graded_by` is empty or the grade is not reviewer-approved (D4).
- **No production content** while hadithapi.com has no written permission (D3, release blockers).
- If code, the spec and an ADR disagree, stop and report.

## Decisions (developer, 1 Nov 2026, all final)

| # | Question | Decision |
| :--- | :--- | :--- |
| D1 | Timing | Start now, in parallel with Phase 6, on branch `ft/hadith`. Proposed `CLAUDE.md` wording is in "Proposed CLAUDE.md wording" below (not edited). |
| D2 | Scope | Scope B: **full collections only**. HadeethEnc work (daily hadith, topics, explanations, spec §5 hadith tables, daily push) is deferred; its spec text stays, marked deferred. |
| D3 | Source | **hadithapi.com now, Sunnah.com later.** hadithapi.com has no terms, licence or offline-storage permission: it sits behind `HADITH_COLLECTIONS_IMPORT_ENABLED=false` (dev builds only, never production packs) until written permission exists. When the Sunnah.com key arrives, `SunnahComSource` replaces it; schema, endpoints, packs and screens do not change. |
| D4 | Grades | hadithapi.com grades are **hidden** until Sunnah.com: they are stored, but the API and app do not show them while `graded_by` is empty; the reviewer signs off before any appears. |
| D5 | Covers | Our own covers per collection, from existing design tokens (Arabic name, a distinct colour per collection), drawn in `quran-app-screens.html` and approved before code. No third-party or published-edition images. **Planner choice:** a rendered `CollectionCover` component, not bundled images (ADR 0042 §8 gives the reasons). |
| D6 | Source code layout (planner, follows `apps/api/CLAUDE.md`) | HTTP clients in `app/Integrations/HadithApiCom` (later `SunnahCom`); `HadithCollectionSource` interface, adapters and importer in `app/Domains/Hadith`. Mirrors Dorar/Azkar. |
| D7 | Pack group (planner, needs developer confirmation) | New group `hadith_collections`, one `resources` row per canonical slug, kept across the source switch. `hadith:{lang}` stays reserved for deferred HadeethEnc. |

## Merge risk with Phase 6 (parallel work)

Both branches edit shared files. Keep each edit small, additive and at the end of its list, and merge `main` into `ft/hadith` whenever `ft/azkar` lands:

| Shared file | Phase 7 edit | Risk |
| --- | --- | --- |
| `apps/api/app/Domains/Content/Packs/PackSchema.php` | adds `hadith*` table methods | Same file Azkar added to. Add new methods at the end; do not reorder. |
| `ResourceGroup.php`, `ServedResourceGroup.php` | add `HadithCollections` | Two-line change. |
| `apps/mobile/src/core/sync/content-tables.ts` (`PackGroup`) | adds `hadith_collections` | Same list as `azkar`. |
| `apps/mobile/src/core/db/content/migrations/*` | adds a numbered migration | **Numbering collision** if both branches add `0010_*`. Take the next free number at merge time and regenerate the Drizzle journal. |
| `apps/mobile/src/core/db/user/clear.ts` (`PERSONAL_TABLES`) and `clear.test.ts` | adds two tables | The test asserts the exact list; resolve by merging both lists. |
| Home tiles, Menu cards, sidebar, i18n `ar.json` / `en.json` | adds الحديث tile, card, keys | Namespace all keys under `hadith.*`. |
| `quran-app-screens.html`, `quran-app-design-system.html`, `packages/design-tokens/src/*` | new section and tokens | Add a new section at the end of the screens file; do not touch Azkar sections. |
| `docs/technical-spec.md`, `docs/content-plan.md`, `CLAUDE.md`, `docs/adr/README.md` | proposed patch only | Apply the patch after `ft/azkar` merges or resolve by hand. |
| `apps/api/routes/console.php`, `docker/release.sh` | one scheduler entry; `release.sh` unchanged | Low. |

ADR numbers: 0042 is taken by this phase. If `ft/azkar` adds an ADR first, renumber at merge.

## Facts the plan relies on (from the developer, 1 Nov 2026)

- hadithapi.com: 7 collections have data, 40,465 hadiths in total: sahih-bukhari 7,276 · sahih-muslim 7,564 · al-tirmidhi 3,956 · abu-dawood 5,274 · ibn-e-majah 4,341 · sunan-nasai 5,761 · mishkat 6,293. musnad-ahmad and al-silsila-sahiha return 404 with 0 hadiths. A hadithapi.com "chapter" is a Sunnah.com **book** (Bukhari: 99). The باب title is only a per-hadith heading, with no id. Fields per hadith: `id, hadithNumber (string), englishNarrator, hadithEnglish, hadithUrdu, urduNarrator, hadithArabic, headingArabic/Urdu/English, chapterId, bookSlug, volume, status, book{}, chapter{}`. No source URL, grader or translator credit. 60 requests a minute; a full pull at 200 per page is about 200 requests.
- Sunnah.com API (`spec.v1.yml`): `/collections`, books, chapters (float `chapterId`), hadiths with `grades[{graded_by, grade}]`, a public page per hadith; key requests also offer an offline dump.

## Data design (summary; exact columns are in the spec patch)

| Table | One row per | Key columns (beyond `resource_id`, `id`) |
| --- | --- | --- |
| `hadith_collections` | collection (one per pack) | `slug` (canonical), `source_id`, `source_code`, `title_ar` (reviewed map), `title_en`, `author_ar` null, `author_en` null, `author_death` text null, `attribution_ar/en`, `total_hadith`, `books_count`, `source_version`, `imported_at` |
| `hadith_books` | book/كتاب | `book_number` text, `title_ar`, `title_en` null, `position`, `hadith_count`, `source_key` |
| `hadith_chapters` | chapter/باب | `book_id`, `chapter_number` int (our ordinal, **not stable across sources**), `source_chapter_key` text null, `title_ar` null, `title_en` null, `position`, `hadith_count` |
| `hadith_entries` | hadith | `book_id`, `chapter_id` null, `hadith_number` **text**, `position`, `text_ar` (bin collation, byte-exact), `text_en` null, `narrator_en` null, `volume` null, `text_search`, `source_url` null, `source_key`, `source_text_sha256`, `source_version`, `imported_at` |
| `hadith_grades` | grade on a hadith | `entry_id`, `grade` (as received), `graded_by` null, `review_status` (`sourced`/`reviewed`), `source_key` |
| `hadith_ref_aliases` | old number after a switch | `old_number`, `new_number` null, `match` (`exact_text`/`similar_text`/`number_only`/`none`), `since_version` |

Mapping for hadithapi.com: chapter → book; `headingArabic` grouped by (book, heading) as contiguous runs → chapter; `status` → grade with `graded_by` null; `hadithNumber` → `hadith_number` as text; `hadithArabic` → `text_ar` untouched. Per-row keys: `hadithapi:{bookSlug}:{id}`.

**Number uniqueness is not assumed.** The unique key is (`source_id`, `source_key`); (`resource_id`, `hadith_number`) is an index, not a unique constraint, until step 6's dry run reports whether duplicates exist.

**Resource identity across the switch.** `resources` is unique on (`source_id`, `group`, `source_key`). A new source would normally mean a new `resource_id`, which the device sees as a different pack. The plan keeps **one `resources` row per canonical slug** and updates its `source_id` and bumps `version` at the switch, so the manifest id and the pack path scheme stay the same (step 17 verifies that nothing assumes `source_id` is immutable).

**Slug mapping (canonical on the left; to be verified against `GET /collections` when the key arrives — only `bukhari` is confirmed by the developer's notes):**

| hadithapi.com | Canonical slug (Sunnah.com style, unverified) |
| --- | --- |
| sahih-bukhari | `bukhari` |
| sahih-muslim | `muslim` |
| al-tirmidhi | `tirmidhi` |
| abu-dawood | `abudawud` |
| ibn-e-majah | `ibnmajah` |
| sunan-nasai | `nasai` |
| mishkat | `mishkat` |

A collection Sunnah.com lacks (Mishkat is the one to check) becomes a developer decision (ADR 0042, Consequences).

## Pack size estimates (assumptions shown; step 4 and step 6 measure the real sizes)

Per-hadith assumptions (no measurement exists yet): Arabic `text_ar` ≈ 500 characters × 2 bytes = **1.0 KB**; `text_en` + narrator ≈ **0.6 KB**; `text_search` (diacritics stripped) ≈ **0.8 KB**; row and index overhead plus amortised book/chapter rows ≈ **0.1 KB**. Total **≈ 2.5 KB raw per hadith**. Compression assumption: gzip of Arabic-heavy SQLite **3.5 : 1**. Real sizes may differ by ±50%.

| Collection | Hadiths | Raw (MB) | Gzipped pack (MB) |
| --- | ---: | ---: | ---: |
| `bukhari` | 7,276 | 18.2 | 5.2 |
| `muslim` | 7,564 | 18.9 | 5.4 |
| `tirmidhi` | 3,956 | 9.9 | 2.8 |
| `abudawud` | 5,274 | 13.2 | 3.8 |
| `ibnmajah` | 4,341 | 10.9 | 3.1 |
| `nasai` | 5,761 | 14.4 | 4.1 |
| `mishkat` | 6,293 | 15.7 | 4.5 |
| **Total** | **40,465** | **101** | **≈ 29** |

On the device, the installed rows are about the raw size, plus an FTS5 index (assumed 30–40% of `text_search`) built on the device after install. English is in the same pack as Arabic in this plan; if the device size is too large the English column can move to a separate pack without a schema change (open question 5).

## API and routes

Endpoints (spec §8/§9 conventions: `/api/v1`, cursor pagination, `ETag`, problem details, API Resources per ADR 0006, OpenAPI regenerated in the same change):

| Method | Path | Purpose | Responses |
| --- | --- | --- | --- |
| GET | `/hadith/collections` | Collections served (title, counts, source credit, pack resource id) | 200 |
| GET | `/hadith/collections/{slug}/books` | Books of a collection | 200, 404 |
| GET | `/hadith/collections/{slug}/books/{book}/chapters` | Chapters of a book | 200, 404 |
| GET | `/hadith/collections/{slug}/books/{book}/hadiths` | Hadiths of a book (`?chapter=`), cursor-paginated | 200, 404 |
| GET | `/hadith/collections/{slug}/hadiths/{number}` | One hadith | 200, 404 |

No `grades` in any response while `graded_by` is null or unreviewed. `source_url` is null for hadithapi.com. While the gate is closed in production, `/hadith/collections` returns an empty list and the others return 404 `hadith_collection_unavailable`. The existing deferred routes (`/hadith/categories`, `/hadith/{id}`, `/hadith/daily`) stay in the spec marked deferred; the new `/hadith/collections/*` paths cannot collide with `/hadith/{id}` because `collections` is a literal segment (step 7 adds a route-order test).

The app reads **packs only** for reading; the endpoints serve the catalogue (the collections list before a pack is installed) and the OpenAPI contract. Online browsing of un-downloaded collections is not built (open question 9).

App routes (proposed; replaces the spec §4 line `hadith/index.tsx, category/[id].tsx, [id].tsx`):

```
app/hadith/index.tsx                                       collections (covers, download state)
app/hadith/search.tsx                                      search in installed collections
app/hadith/[collection]/index.tsx                          books of a collection (header cover)
app/hadith/[collection]/books/[book]/index.tsx             chapters of a book
app/hadith/[collection]/books/[book]/chapters/[chapter].tsx   hadith list of a chapter
app/hadith/[collection]/hadith/[number].tsx                the hadith reader (one hadith, previous / next)
app/hadith/downloads.tsx                                   sheet: pack size, Wi-Fi, progress (or reuse the shared downloads screen)
```

The `[book]` and `[chapter]` params are browsing keys only. **A saved item never stores a book or chapter key**: it stores collection slug + hadith number, plus a book number as a fallback place.

## Steps

| # | Step | Description | Dependencies | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Docs, ADR, spec patch | ADR 0042 (Proposed), this plan, README, spec/content-plan patch file. Apply the patch only after the developer accepts the ADR. | Developer acceptance | drafted |
| 2 | Env, config, locks | Empty `HADITH_API_KEY` in `.env.example`; `HADITH_COLLECTIONS_IMPORT_ENABLED=false`; `config/hadith.php` (slug map, reviewed titles map, `primary_source`, import and rate settings); reviewed migrations inserting `content_sources` rows `hadithapi` (`pending`) and `sunnahcom` (`pending`); a gate service (production needs `granted` and flag; non-production needs the flag) | 1 | |
| 3 | MySQL schema | Migrations, models, factories for the six tables; `utf8mb4_0900_bin` Arabic columns; additive only | 1 | |
| 4 | Pack contract | `hadith_collections` in `ResourceGroup`, `ServedResourceGroup`, `PackSchema`, mobile `PackGroup` and `content-tables.ts`; pack builder and manifest gate; empty `hadith_grades` and `hadith_ref_aliases` ship from day one; grade-visibility filter; `HadithSearchTextNormalizer` (PHP) and its TypeScript mirror with a parity fixture | 2, 3 | |
| 5 | Source interface and hadithapi.com client | `Integrations/HadithApiCom` client (60/min limiter, retry with backoff, `Retry-After`, User-Agent with contact email, **key redaction**); `Domains/Hadith/Contracts/HadithCollectionSource`, DTOs, `HadithApiComSource`, `HadithSourceRegistry`; `hadith:snapshot` writes pinned, hashed snapshots under `storage/app/hadith` (git-ignored), so an import never re-fetches | 2 | |
| 6 | Importer and command | Mapper (chapter → book, heading runs → chapter, `status` → grade), validator, `hadith:import` (locked: flag, `content_sources`, `Cache::lock`, `--dry-run`, `--if-unlocked`, `--build-packs`), import report (counts vs `hadiths_count`, duplicates, non-contiguous headings, empty headings), source-text hash, scheduler entry (weekly, no-op while locked, never in `release.sh`), text-integrity check | 3, 4, 5 | |
| 7 | API endpoints and contract | Routes, controllers, FormRequests, Data objects, Resources, repositories; grade filter; ETag; problem codes; `npm run generate -w @quran/api-contract`; commit `openapi.json` and `schema.d.ts` | 3, 6 | |
| 8 | Design frames | Frames in `quran-app-screens.html` (list below), light and dark, Arabic and English, compact and expanded, plus the cover set. **Developer approval gate.** Can start as soon as step 1 is accepted; do not wait for steps 2 to 7 | 1 | |
| 9 | Cover tokens and `CollectionCover` | Palette tokens in `quran-app-design-system.html` and `packages/design-tokens`; `CollectionCover` in `src/shared/ui`; contrast check in light, sepia and dark | 8 (approved) | |
| 10 | Mobile data layer: content | `content.db` migration, pack install path for `hadith_collections`, repositories, hooks, FTS5 `search_hadith` build after install, installed-collection state, dev fixtures | 4, 6 | |
| 11 | Mobile data layer: personal | `user.db` tables `hadith_bookmarks`, `hadith_reading_position`, `hadith_alias_applied` handling; `PERSONAL_TABLES`; alias applier (dormant until a pack has aliases) | 10 | |
| 12 | Mobile UI: components | One file and one test each (list below); screens not built yet | 8, 9, 10 | |
| 13 | Mobile UI: screens, routes, entry points | The seven routes, i18n, Home tile and Menu card gated on an installed pack, sidebar link, Sources and thanks row, bookmark and last-read | 11, 12 | |
| 14 | Search | In-section Arabic search over `search_hadith` (normalised query, scope chips by collection, highlight by position, history) | 10, 13 | |
| 15 | Hardening | Offline, loading, error and download states; airplane mode; resize keeps position; accessibility pass; Dynamic Type; RTL and English | 13, 14 | |
| 16 | Exit check | Checks, visual review against frames on iPhone 17 and the expanded window, both languages, light and dark, airplane mode, release-blocker audit | 15 | |
| 17 | **Sunnah.com switch** | `SunnahComSource`, slug verification, alias report, re-import, version bump, feed floor, app alias application. **Blocked: needs the key and its written terms** | Key, terms, 16 | blocked |

### Tests for each step

| # | Tests (written with the step, not after) |
| :---: | :--- |
| 1 | Docs only. Review: every claim cites a path; no religious text; no key; ADR number free. |
| 2 | Pest: gate truth table (production × flag × `permission_status`; non-production × flag); `.env.example` has an empty key (a test or CI grep); `config/hadith.php` has no key; migration inserts the two source rows as `pending`; production refuses to change a permission from the command line. |
| 3 | Pest: migrations run and roll back; column types and collations (Arabic columns `utf8mb4_0900_bin`); unique (`source_id`,`source_key`); number is text; byte-exact round trip of a string containing U+200F and diacritics (placeholder characters, not hadith text); factories build valid rows; `arch()` layering. |
| 4 | Pest: pack contains the six tables with empty `hadith_grades` and `hadith_ref_aliases`; unreviewed grades are excluded from the pack; builder refuses under a closed gate; manifest lists only gated collections; `hadith:{lang}` untouched. Normaliser: strips U+200E/F, U+061C, U+202A–202E, U+2066–2069, U+FEFF, zero-width characters, harakat, tatweel; maps like `SearchTextNormalizer`; PHP and TS give identical output on a shared golden fixture; the **Quran** normaliser and `packages/quran-text-check` are unchanged and still pass. Jest: `content-tables` mirror matches `PackSchema`. |
| 5 | Pest with `Http::fake` and recorded **placeholder** fixtures: pagination to `last_page`; 60/min limiter; 429 and `Retry-After`; retry; 404 collection yields an empty, reported result; the key never appears in exception messages, logs, snapshot files or reports (assert with `FIXTURE-KEY`); snapshot hash is stable; interface contract test shared by the future `SunnahComSource`. |
| 6 | Pest: heading-run grouping (contiguous runs, non-contiguous repeats, empty headings, a hadith with no heading); `status` → grade with `graded_by` null; `text_ar` byte-identical to input and `source_text_sha256` matches; counts vs `hadiths_count` mismatch is reported; duplicate numbers reported; locked run exits 0 with `--if-unlocked` and writes nothing; production refuses while `pending`; `Cache::lock` prevents a second run; idempotent re-import (same snapshot → no version bump); one transaction per collection rolls back on error; scheduler entry registered and a no-op while locked; `release.sh` has no hadith command; text-integrity check detects an altered row. |
| 7 | Pest feature test per endpoint (200, 404, cursor pagination, ETag and 304, `Accept-Language` does not change content); no `grades` key while unreviewed, and present only for reviewed grades; closed gate in production returns the empty and 404 behaviour; route order vs `/hadith/{id}`; OpenAPI regenerated and drift-free (`--fail-on-unknown`); `arch()` (controller → service → repository). |
| 8 | Review only: frames compared to tokens; placeholders only; every state present; developer approval recorded in the step brief. |
| 9 | Jest: `CollectionCover` render for each slug and the fallback, light/sepia/dark, RTL and English, accessibility label, no raw hex (tokens only); token check `npm run check:html -w @quran/design-tokens`; contrast ≥ 4.5 : 1 for the title on every ground in all three themes (computed in a test). |
| 10 | Jest: pack install in one transaction and rollback on failure; repository queries (books, chapters, hadiths of a chapter, one hadith by slug + number, previous/next); FTS build and query using the normaliser; Arabic bytes round trip; grade table empty means no grade in view-model; Arabic-first view model with English hidden by default (open question 5); `content.db` rebuilds from packs; no personal data in `content.db`. |
| 11 | Jest: bookmark add/remove/list by `{slug}:{number}`; last-read place per collection; `PERSONAL_TABLES` updated and **`clear.test.ts` updated** (it asserts the exact list); «مسح البيانات» clears both tables; alias applier: `exact_text` rewrites, other matches mark `unverified`, no alias leaves the item untouched, applying twice is idempotent; no database id stored in a saved item. |
| 12 | One `*.test.tsx` per component: render and variants, interaction, RTL (ar and en), accessibility role and label, theme tokens, no raw hex. |
| 13 | Jest screen and route tests: `routes.test.ts` with `satisfies keyof paths`; Home tile and Menu card appear only with an installed pack (update `HomeScreen.test.tsx`, which asserts no الحديث tile today); every string in `ar.json` and `en.json`; no grade UI; source line present; no link when `source_url` is null; bookmark and last-read persist offline. |
| 14 | Jest: normalised query matches diacritic and alef variants; scope chips; highlight positions on original text; empty and no-results states; history capped at 20 and cleared by «مسح البيانات»; Quran search unaffected. |
| 15 | Jest: offline, loading, error and retry states; resize keeps the reading position; Dynamic Type at the largest sizes; screen-reader order. Manual: airplane mode on the simulator and the Android emulator. |
| 16 | `composer qa`; `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; contract generated and committed; screenshots vs `frame-shot.py` frames at 390 × 844; expanded window check; secret scan for the key; release-blocker audit. |
| 17 | Pest: `SunnahComSource` passes the shared source contract test; alias report on fixture corpora (placeholders) for each match method; wet run replaces rows without changing the `resource_id`; manifest entry unchanged in shape; older device gets `410`; schema and OpenAPI diff is empty; Jest: alias application on a fixture pack, `unverified` state frame. |

## Step 1 outputs (this change)

- `docs/adr/0042-hadith-collections-source.md` (Proposed).
- `docs/plans/phase-7.md` (this file), `docs/plans/phase-7/README.md`.
- `docs/plans/phase-7/spec-changes.md` (the proposed patch for spec §4, §5, §6, §7, §9, §15 and the content plan; **not applied**).

## Frames needed (step 8)

New section «الحديث — Hadith collections (proposed)» in `quran-app-screens.html`, placed after the Azkar section (new ids with the `HadithColl` prefix; the existing `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` stay, captioned "deferred: HadeethEnc, ADR 0042"). Existing language only (tokens, Amiri for hadith text, IBM Plex Sans Arabic for UI, cards, 44 pt buttons), copying the markup of the Azkar frames. Bracketed placeholders for all hadith text; titles on covers are the reviewed titles, shown in the frames as «[اسم المجموعة]» until the reviewer supplies them.

| Frame id | Content |
| --- | --- |
| `HadithCollList` | Collections list with covers: installed collections, a not-installed one with size and a download button, one downloading. Search button. Source credit footer. Light, Arabic. |
| `HadithCollListDark`, `HadithCollListEnglish` | Dark; English (LTR). |
| `HadithCollCovers` | Spec sheet of every cover (the seven collections plus the neutral fallback), light, sepia and dark, with contrast values. |
| `HadithCollBooks` | Collection header (large cover, title, author, counts, source credit) and the books list (number medallion, title, hadith count). Plus dark and English variants. |
| `HadithCollChapters` | A book's chapters list (باب title, hadith count). Plus dark and English variants. |
| `HadithCollChapter` | A chapter's hadith cards (number, 3-line Arabic preview with line clamp, narrator line). Plus dark and English variants. |
| `HadithCollReader` | One hadith: breadcrumb (collection · book · chapter), number, full Arabic text, English below in the English interface when allowed, source line, bookmark, previous and next. No grade section. Plus dark and English variants. |
| `HadithCollReaderGrade` | Future state, labelled "after Sunnah.com sign-off (not built now)": the grade section with grader and reviewer attribution. Drawn only so the layout is fixed. |
| `HadithCollSearch` | Search field, scope chips by collection, recent searches; results with highlighted match; no-results. |
| `HadithCollDownload` | Sheet: pack size, Wi-Fi only, progress, cancel. |
| `HadithCollStates` | Loading skeletons, offline with nothing downloaded, offline with downloaded content, download failed, load error with retry. |
| `HadithCollSaved` | Saved hadith list, and the **unverified** state a saved item takes after a source switch (item shown at book level with a quiet notice). |
| `HadithCollExpanded` | Expanded window with the sidebar: collections and books master list on the start side, reader on the other. Plus a second expanded frame for the reader with a side panel. |
| Existing, updated | `#Main` and the expanded Home: tile link retargeted to the collections list. `Menu`, `MenuDark`, `MenuEnglish`: الحديث card (amends ADR 0032 §3). Sidebar «المزيد» entry retargeted. `Sources`: hadith credit row. |

Android frames: only where the platform differs (follow `phase-6/step-04-frames.md`).

## Components (step 12; each its own file with a colocated test)

`src/shared/ui`: `CollectionCover` (and, if the frames need them, none others; reuse `Card`, `Divider`, `ScreenHeader`, `SheetHeader`, `UiText`).
`src/features/hadith/components`: `CollectionRow`, `CollectionHeader`, `CollectionDownloadButton`, `BookRow`, `ChapterRow`, `HadithCard`, `HadithText`, `HadithMeta` (number, narrator), `HadithSourceLine`, `HadithBreadcrumb`, `HadithPager` (previous/next), `HadithBookmarkButton`, `SavedHadithRow`, `UnverifiedNotice`, `HadithSearchField`, `HadithSearchResultRow`, `HadithStateView` (loading, offline, error, empty).

## Proposed CLAUDE.md wording (not applied)

Replace the «Current phase» bullet's first sentence with:

> **Current phases: Phase 6, الأذكار (Azkar)** on branch `ft/azkar` (spec §15, ADR 0031), **and, in parallel, Phase 7, الحديث (Hadith: full collections)** on branch `ft/hadith` (ADR 0042, plan `docs/plans/phase-7.md`). Production Hadith content is blocked: hadithapi.com has no written permission (flag `HADITH_COLLECTIONS_IMPORT_ENABLED` stays off), and Sunnah.com's key is pending. HadeethEnc (daily hadith, topics) is deferred.

Keep the rest of the bullet (Azkar blockers, open earlier-phase work) and add «Check the branch with `git branch --show-current`; each phase's files stay on its own branch.»

## Release blockers

Nothing in Phase 7 ships production content until every item below is cleared.

| # | Blocker | Cleared by |
| :---: | :--- | :--- |
| RB1 | hadithapi.com has no terms, licence or offline-storage permission | Never cleared for hadithapi.com: the source stays dev-only; production waits for Sunnah.com (RB2). Both locks stay closed. |
| RB2 | Sunnah.com key and **written terms**: offline storage in packs, redistribution, attribution wording, English translation credit | A reviewed migration setting `sunnahcom` to `granted` (the ADR 0038 pattern), plus the step 17 switch |
| RB3 | Grades: no named grader | Sunnah.com `graded_by` plus reviewer sign-off per ADR 0042 §4 |
| RB4 | English text has no translator credit | Decision to show it with a credit, or keep it hidden (open question 5) |
| RB5 | Arabic collection titles have no source (hadithapi.com's `bookName` is English) | Reviewed titles map, signed off by the content reviewer |
| RB6 | Content reviewer sign-off on the Hadith section (content plan «Review») | Reviewer |
| RB7 | Frames approved by the developer (ADR 0010) | Step 8 |
| RB8 | Numbering differences between sources (Sahih Muslim) | The alias report read by the developer and reviewer before the wet switch |
| RB9 | The API key must not leak (query-parameter key in URLs, logs, Sentry, Pulse, snapshots, reports) | Redaction tests (step 5) and a secret scan (step 16) |
| RB10 | Text integrity: stored Arabic equals source bytes | Text-integrity check passes (step 6) |
| RB11 | Cover contrast and approval | Step 9 contrast test; frames approved |
| RB12 | Store launch with no licensed Hadith content | Developer decision: ship Phase 7 code dormant (no tile, no card) or hold it back |

## Open questions for the developer

1. **ADR number.** The brief asked for 0041, which is taken (`0041-local-uses-qf-production.md`). Accept 0042?
2. **Canonical slugs.** Confirm the Sunnah.com-style set above, and say what happens to a collection Sunnah.com lacks (Mishkat first).
3. **Arabic collection titles and author names.** hadithapi.com gives English names only. Which named source supplies reviewed Arabic titles (a reviewed map in `config/hadith.php`, signed off by the reviewer)?
4. **Cover palette.** Seven distinct collection colours are new tokens, and sepia needs values too. Approve adding them to the design system, and the ornament.
5. **English.** Show `hadithEnglish` (no translator credit) or hide it like grades until Sunnah.com names its translators? Same pack or a separate pack for size? Urdu is not stored; confirm.
6. **Grade sign-off.** Confirm the rule: visible only when `graded_by` is set and a reviewer marked it `reviewed`.
7. **Switch remap policy.** Confirm: `exact_text` moves silently; everything else becomes *unverified* and shows at book level.
8. **Placement.** Home الحديث tile ships in this phase, gated on an installed pack (ADR 0017). A الحديث card in the Menu (amends ADR 0032). No Home hadith card. Confirm, and whether covers appear on Home later.
9. **Online browsing.** The app reads packs only; un-downloaded collections are not browsable online. Confirm (spec §4's TanStack Query row for hadith moves to `content.db`).
10. **Share and copy.** Hide the share action until Sunnah.com's terms allow it?
11. **Search placement.** In-section search only in this phase; a Hadith chip in the global search later?
12. **Saved items.** A list of saved hadith plus one last-read place per collection, separate from ADR 0028's single Quran bookmark. Confirm a list is wanted.
13. **Pack group.** Confirm a new `hadith_collections` group rather than reusing `hadith` (D7).
14. **Duplicate numbers.** If the dry run finds duplicate `hadith_number` values inside a collection, the policy is to be decided with the report.
15. **Phase numbering and the v1 launch.** Beta and store review becomes Phase 8. Does the store launch wait for licensed Hadith content?
16. **Sepia** covers: draw all three themes, or light and dark only (as Phase 6 frames did)?

## Spec and ADR conflicts found

1. ADR 0041 already exists; this ADR is 0042.
2. Spec §15 names Phase 7 «Beta and store review» (and Phase 6 D10 already says Beta becomes Phase 7). Beta becomes Phase 8, and the cut-line row «Hadith section and daily hadith push» is split.
3. Content plan «Display»: "every hadith shows its grade, … and a link back to the source page." This conflicts with D4 (grades hidden) and with hadithapi.com having no source URL. Resolved by ADR 0042 §9.
4. Spec §5, §7 and §6 reserve `hadith:{lang}` and name the HadeethEnc tables. The new tables use different names and a different group; the old text is marked deferred.
5. ADR 0017 and ADR 0032 §3 have no الحديث tile or card rule for collections. ADR 0017 already says the tile comes with the feature; ADR 0032 needs an amendment and updated `Menu*` frames.
6. `apps/mobile/CLAUDE.md` «Where state lives» says hadith browsing uses TanStack Query; collection reading moves to `content.db`.
7. The existing `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` frames and the Home tile link draw the deferred HadeethEnc design.
8. Spec §5 names the table `content_sources`; the brief calls it `sources`. This plan uses `content_sources`.
9. Spec §5 says `resources.group` is an enum, but the migration is `string(64)`; no database change is needed for the new group (only PHP and TS enums).
10. `.env.example` already has `HADITH_API_KEY="hADITH_API_KEY"` (a placeholder, not empty). Step 2 empties it.
11. CLAUDE.md names `app/Support/ArabicNormalizer.php`; it does not exist. The real class is `app/Support/QuranText/SearchTextNormalizer.php`, and it does not strip U+200F. Hadith needs its own normaliser (step 4).
12. The brief says the pack could be `hadith-collection:{slug}`; manifest packs are identified by `resource_id`, so the name is a label only.
13. Spec §3 and §13 (`SyncHadithJob`, `SendDailyHadithJob`, `/bootstrap` daily hadith id, `devices.push_daily_hadith`) belong to the deferred HadeethEnc phase.
14. Phase 6 runs in parallel and edits the same files (see "Merge risk").
15. The agent rules forbid switching branches, so the files were written on `main`; the developer creates `ft/hadith` and moves them.
