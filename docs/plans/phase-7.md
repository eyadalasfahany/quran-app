# Phase 7 — الحديث (Hadith: full collections)

Status: **planned, not started** · Branch: `ft/hadith` (the developer creates it; these files are written on `main` and move there) · Runs **in parallel with Phase 6** (`ft/azkar`, exit check still open) · ADR 0042 (Proposed) · Spec §5, §6, §7, §9, §4, §15 (proposed edits in [`phase-7/spec-changes.md`](phase-7/spec-changes.md), not applied).

**Revision (1 Nov 2026):** the developer replaced hadithapi.com with **fawazahmed0/hadith-api, read directly** as the source now. hadithapi.com is evaluated and not used (no terms). ummahapi.com is evaluated and not used (it only proxies fawazahmed0 and drops books and graders). Sunnah.com stays the long-term target.

**Goal:** a Hadith section with full collections (collection → book/كتاب → hadith, with an optional chapter/باب level that fawazahmed0 does not have) that reads fully offline from per-collection packs. The source today is fawazahmed0's static JSON, pinned to a commit SHA, with one kill-switch flag and all ten collections shipping (no content reviewer). When Sunnah.com grants a key, a `SunnahComSource` replaces it with **no change** to the schema, endpoints, packs or screens.

HadeethEnc (daily hadith, topics, explanations, the spec §5 `hadith_categories` / `hadiths` / `hadith_translations` / `daily_hadiths` tables, the daily push) is **deferred**. Its spec text stays, marked deferred.

**Sources this plan rests on (read for this plan):**
- `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/mobile/CLAUDE.md`, `.claude/agent-rules.md`.
- `docs/technical-spec.md` §3, §4, §5 (`content_sources`, `resources`, Hadith tables), §6, §7 (pack contract, Azkar import), §8–§9, §12, §13, §15, §16.
- `docs/content-plan.md` («Hadith» section, hadith sources table, «Rules for every provider»).
- ADR 0006, 0008, 0010, 0013, 0014 (hadith translations stay), 0017, 0027, 0028, 0031, 0032, 0038, 0041, 0042.
- `docs/plans/phase-6.md`, `phase-6/README.md`, `phase-6/step-02-schema.md`, `phase-6/step-04-frames.md`.
- Code read: `apps/api/app/Domains/Azkar/**`, `apps/api/app/Integrations/Dorar/**`, `Domains/Content/Enums/ResourceGroup.php` and `ServedResourceGroup.php`, `Content/Packs/PackSchema.php`, `apps/api/app/Support/QuranText/SearchTextNormalizer.php`, `apps/api/routes/console.php`, `apps/api/config/azkar.php`, `apps/api/.env.example`, `docs/runbooks/railway-release.md`, `apps/mobile/src/core/sync/content-tables.ts`.
- Facts about fawazahmed0/hadith-api from the developer (1 Nov 2026), listed below. Not re-fetched.

## Rules

- All earlier-phase rules apply (`apps/mobile/CLAUDE.md`, `apple-design`, tokens through `useTheme()`, one component per file with its colocated test, screens only compose).
- **No religious text anywhere**: code, tests, fixtures, frames, docs, reports. Fixtures are placeholders (`FIXTURE text 1 — not a hadith`, «نص تجريبي ١ — ليس حديثًا»), source `taybah-dev-fixture`. Frames use bracketed placeholders such as «[نص الحديث كما ورد في المصدر]». Reports give counts, keys and paths only. This includes grade strings, graders' judgements and section names: use `FIXTURE grade`, `FIXTURE grader`.
- **Hadith text is never altered.** Arabic is stored byte for byte as received. Only `text_search` is normalised.
- **No grade is shown** through Phase 7 (D4): grades are stored with their graders, `hadith.grades_visible` is `false`, and the pack's grade table is empty.
- **Arabic only.** No English edition is fetched or stored.
- **All ten collections ship.** `HADITH_COLLECTIONS_IMPORT_ENABLED` is the only lock, a kill switch: `false` in `.env.example`, `true` in production at release (step 17). There is no content reviewer; the developer decides (Arabic names, source-line wording, gap list, SHA bumps).
- No provider key exists. `HADITH_API_KEY` is removed.
- If code, the spec and an ADR disagree, stop and report.

## Decisions (developer, 1 Nov 2026)

| # | Question | Decision |
| :--- | :--- | :--- |
| D1 | Timing | Start now, in parallel with Phase 6, on `ft/hadith`. Proposed CLAUDE.md wording below (not edited). |
| D2 | Scope | Full collections only. HadeethEnc work deferred; its spec text stays, marked deferred. |
| D3 | Source | **fawazahmed0/hadith-api now, read directly, pinned to commit `df57907be35291c91ad6a6691180e22ca9920784`** (not `@1`; bumping the SHA is a change the developer approves). Licence Unlicense. Sunnah.com later via `SunnahComSource` with no schema, endpoint, pack or screen change. Replaces the earlier hadithapi.com decision. |
| D4 | Grades | Hidden through Phase 7. Stored with the named grader. **Simplest option chosen:** a constant `hadith.grades_visible = false` in `config/hadith.php`; no `review_status` column and no `reviewed_graders` list (a later phase can add them additively). Bukhari and Muslim have no grade rows and no collection-level "Sahih" is invented. |
| D5 | Covers | Own covers per collection from existing tokens (Arabic name, distinct colour), drawn and approved before code, no third-party images. **Planner choice:** a rendered `CollectionCover` component (ADR 0042 §10). Now ten collections. |
| D6 | Lock | **No content reviewer; all ten collections ship** (`bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi`, `qudsi`, `dehlawi`). `HADITH_COLLECTIONS_IMPORT_ENABLED` stays as a **kill switch**: `false` in `.env.example`, **`true` in production at release** (step 17). While `false` nothing is imported, packed or listed; packs already on devices keep working. The `fawazahmed0` source row records the Unlicense (`not_required`). Amends the content plan's fawazahmed0 row and its "content reviewer signs off on the Hadith section" rule for Phase 7 collections (Azkar's reviewer rules in ADR 0031 are untouched). |
| D7 | Arabic only | Only the `ara-{c}` editions are stored. `ara-{c}1` is not stored and not a `text_search` input (our own normaliser). English editions are not fetched. |
| D8 | Hierarchy | collection → book (= fawazahmed0 section) → hadith. `hadith_chapters` stays in the schema for Sunnah.com and is empty for this source; the app handles "no chapters". |
| D9 | Arabic names | fawazahmed0 has none (English collection names; 0 of Bukhari's 98 section names contain Arabic). The **developer supplies and approves** `config/hadith_titles.php` (10 collections, authors, ~407 sections). A missing name stays null and **does not block shipping**: Arabic UI shows «مجموعة {n}» / «كتاب {n}» (i18n labels, n = fixed collection position or `book_number`) and an ornament-only cover; never the English source name in the Arabic UI, never an invented title. English UI may show the source's `title_en`. |
| D10 | Code layout (planner, follows `apps/api/CLAUDE.md`) | Client in `app/Integrations/HadithApiFawaz`; `HadithCollectionSource`, adapters (`FawazHadithSource`, later `SunnahComSource`) and the importer in `app/Domains/Hadith`. |
| D11 | Pack group (planner; confirm) | New group `hadith_collections`, one `resources` row per slug, kept across the source switch. `hadith:{lang}` stays reserved for deferred HadeethEnc. |

## Merge risk with Phase 6 (parallel work)

Both branches edit shared files. Keep each edit small, additive and at the end of its list; merge `main` into `ft/hadith` whenever `ft/azkar` lands.

| Shared file | Phase 7 edit | Risk |
| --- | --- | --- |
| `apps/api/app/Domains/Content/Packs/PackSchema.php` | adds `hadith*` table methods | Same file Azkar added to. Add at the end; do not reorder. |
| `ResourceGroup.php`, `ServedResourceGroup.php` | add `HadithCollections` | Two-line change. |
| `apps/mobile/src/core/sync/content-tables.ts` (`PackGroup`) | adds `hadith_collections` | Same list as `azkar`. |
| `apps/mobile/src/core/db/content/migrations/*` | adds a numbered migration | **Numbering collision** if both add `0010_*`. Take the next free number at merge and regenerate the Drizzle journal. |
| `apps/mobile/src/core/db/user/clear.ts` (`PERSONAL_TABLES`) and `clear.test.ts` | adds two tables | The test asserts the exact list; merge both lists. |
| Home tiles, Menu cards, sidebar, i18n `ar.json` / `en.json` | الحديث tile, card, keys | Namespace keys under `hadith.*`. |
| `quran-app-screens.html`, `quran-app-design-system.html`, `packages/design-tokens/src/*` | new section and tokens | Add a new section at the end; do not touch Azkar sections. |
| `docs/technical-spec.md`, `docs/content-plan.md`, `CLAUDE.md`, ADR 0017/0032 notes | proposed patch only | Apply after `ft/azkar` merges, or by hand. |
| `apps/api/routes/console.php`, `docker/release.sh` | one scheduler entry; `release.sh` unchanged | Low. |
| `apps/api/.env.example` | removes the `HADITH_API_KEY` line, adds the flag | Low. |

ADR numbers: 0042 is this phase's. If `ft/azkar` adds an ADR first, renumber at merge.

## Facts the plan relies on (developer, 1 Nov 2026)

**fawazahmed0/hadith-api** (`github.com/fawazahmed0/hadith-api`):
- Licence **Unlicense**. Latest commit `df57907be35291c91ad6a6691180e22ca9920784` (2026-06-03). Static JSON on jsDelivr: `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@<sha>/...`. No key, no rate limit.
- Files: `editions.json` (per collection, editions with name, language, direction, has_sections, link, linkmin); `info.json` (per collection `metadata{name, sections{n: English name}, last_hadithnumber, section_details}` and `hadiths[{hadithnumber, arabicnumber, grades[{name, grade}], reference{book, hadith}}]`); `editions/{edition}.json` (full collection: `metadata{name, sections, section_details{n:{hadithnumber_first/last, arabicnumber_first/last}}}`, `hadiths[{hadithnumber, arabicnumber, text, grades, reference}]`; `ara-bukhari` is 9.8 MB raw); `editions/{edition}/sections/{n}.json`; `editions/{edition}/{n}.json`; `.min.json` variants.
- Arabic editions: `ara-{c}` (diacritics; stored byte for byte) and `ara-{c}1` (diacritics removed; not stored). Edition `author` is "Unknown", `source` is empty.
- 10 collections, hadiths listed / sections / hadiths with grades:

| Slug | Hadiths | Sections (books) | With grades | Graders named |
| --- | ---: | ---: | ---: | --- |
| `abudawud` | 5,274 | 44 | 5,274 | 4 |
| `bukhari` | 7,589 | 98 | 0 | — |
| `ibnmajah` | 4,343 | 38 | 4,341 | 4 |
| `malik` | 1,858 | 62 | 1,858 | 1 |
| `muslim` | 7,563 | 57 | 0 | — |
| `nasai` | 5,765 | 52 | 5,758 | 3 |
| `tirmidhi` | 3,998 | 50 | 3,954 | 4 |
| `nawawi` | 42 | 2 | 0 | — |
| `qudsi` | 40 | 2 | 0 | — |
| `dehlawi` | 40 | 2 | 0 | — |
| **Total** | **36,512** | **407** | | |

- Grade values are English strings. Section names are English only. Section 0 exists with an empty name in some collections. Some hadith numbers have no text. Numbers can be decimal (for example `2787.2`).
- **No باب level and no per-hadith source URL.**

**Sunnah.com API** (`spec.v1.yml`, header `X-API-Key`): collections, books, chapters (float `chapterId`), hadiths with `grades[{graded_by, grade}]`, a public page per hadith, offline dump on key requests. Unchanged.

## Data design (summary; exact columns in the spec patch)

| Table | One row per | Key columns (beyond `resource_id`, `id`) |
| --- | --- | --- |
| `hadith_collections` | collection (one per pack) | `slug`, `source_id`, `source_code`, `title_ar` (developer-approved map, null until supplied), `title_en`, `author_ar` null, `author_en` null, `attribution_ar/en`, `total_hadith`, `books_count`, `source_version` (the commit SHA), `imported_at` |
| `hadith_books` | book (fawazahmed0 section) | `book_number` text, `title_ar` null, `title_en` null, `position`, `hadith_count`, `source_key` |
| `hadith_chapters` | chapter/باب (empty for fawazahmed0) | `book_id`, `chapter_number` int, `source_chapter_key` text null, `title_ar` null, `title_en` null, `position`, `hadith_count` |
| `hadith_entries` | hadith | `book_id`, `chapter_id` null, `hadith_number` **text**, `arabic_number` text null, `position`, `text_ar` (bin collation, byte-exact), `text_en` null (empty), `narrator_en` null (empty), `text_search`, `source_url` null, `source_key`, `source_text_sha256`, `source_version`, `imported_at` |
| `hadith_grades` | grade on a hadith | `entry_id`, `grade` (as received), `graded_by` null, `source_key`. Served only when `hadith.grades_visible` is true (false through Phase 7) |
| `hadith_ref_aliases` | old number after a switch | `old_number`, `new_number` null, `match`, `since_version` |

Mapping for fawazahmed0: section → book; `hadithnumber` → `hadith_number` (text); `arabicnumber` → `arabic_number`; `ara-{c}` `text` → `text_ar` untouched; each `grades[]` item → a grade row (`name` → `graded_by`, `grade` → `grade`); book assignment from `section_details` ranges, cross-checked against `reference.book` (a disagreement fails that collection's import unless an exception the developer decided is listed in `config/hadith.php`). Hadith numbers with no text are not imported and are listed in the report. Section 0 is imported as a book only if hadiths fall in it; its title stays null. Keys per row: `fawazahmed0:{slug}:{hadithnumber}`.

**Number uniqueness is not assumed.** The unique key is (`source_id`, `source_key`); (`resource_id`, `hadith_number`) is an index until the import dry run reports whether duplicates exist.

**Resource identity across the switch.** `resources` is unique on (`source_id`, `group`, `source_key`). The plan keeps **one `resources` row per canonical slug** and updates its `source_id` and bumps `version` at the switch, so the manifest id and pack path scheme stay the same (step 18 verifies that nothing assumes `source_id` is immutable).

**Canonical slugs** are fawazahmed0's, which the developer states are Sunnah.com-style: `bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi`, `qudsi`, `dehlawi`. mishkat drops out; malik, nawawi, qudsi and dehlawi are added. Re-check before step 3 freezes them: a saved reference is keyed by slug, so changing one later is costly. Sunnah.com's public pages show the names without a key; the three forty-hadith collections are the ones most likely to be named differently. `slug_map` in `config/hadith.php` maps a source's slug to the canonical one.

**Numbering and the switch.** fawazahmed0 carries both `hadithnumber` and `arabicnumber`, and its numbering is expected to be close to Sunnah.com's, which should lower remap risk. This is not verified here; the alias report at the switch measures it.

## Pack size estimates (assumptions shown; step 4 and step 6 measure the real sizes)

One measured anchor: `ara-bukhari.json` is **9.8 MB raw** for 7,589 hadiths, about **1.29 KB per hadith** in JSON (text plus keys and numbers). Per-hadith assumptions for SQLite: `text_ar` ≈ **1.2 KB**; `text_search` (diacritics stripped, assumed 70% of `text_ar`) ≈ **0.85 KB**; row and index overhead ≈ **0.15 KB**; grade rows and book rows ≈ **0.1 KB** for graded collections. Total **≈ 2.3 KB raw per hadith**. Compression assumption: gzip of Arabic-heavy SQLite **3.5 : 1**. Other collections are scaled from Bukhari by count, assuming similar text length (the one big assumption). Real sizes may differ by ±50%.

| Collection | Hadiths | Raw (MB) | Gzipped pack (MB) |
| --- | ---: | ---: | ---: |
| `bukhari` | 7,589 | 17.5 | 5.0 |
| `muslim` | 7,563 | 17.4 | 5.0 |
| `nasai` | 5,765 | 13.3 | 3.8 |
| `abudawud` | 5,274 | 12.1 | 3.5 |
| `ibnmajah` | 4,343 | 10.0 | 2.9 |
| `tirmidhi` | 3,998 | 9.2 | 2.6 |
| `malik` | 1,858 | 4.3 | 1.2 |
| `nawawi`, `qudsi`, `dehlawi` | 122 | 0.3 | 0.1 |
| **Total** | **36,512** | **≈ 84** | **≈ 24** |

The importer downloads about 36.5k × 1.29 KB ≈ 47 MB of `ara-*` JSON once, plus `editions.json` and each `info.json`, then works from the pinned snapshot. On the device, installed rows are about the raw size plus an FTS5 index (assumed 30–40% of `text_search`) built after install.

## API and routes

Endpoints (spec §8/§9 conventions: `/api/v1`, cursor pagination, `ETag`, problem details, API Resources per ADR 0006, OpenAPI regenerated in the same change):

| Method | Path | Purpose | Responses |
| --- | --- | --- | --- |
| GET | `/hadith/collections` | Collections served (title, counts, source credit, pack resource id) | 200 |
| GET | `/hadith/collections/{slug}/books` | Books of a collection | 200, 404 |
| GET | `/hadith/collections/{slug}/books/{book}/chapters` | Chapters of a book (empty list for fawazahmed0) | 200, 404 |
| GET | `/hadith/collections/{slug}/books/{book}/hadiths` | Hadiths of a book (`?chapter=`), cursor-paginated | 200, 404 |
| GET | `/hadith/collections/{slug}/hadiths/{number}` | One hadith | 200, 404 |

No `grades` in any response while `hadith.grades_visible` is false (all of Phase 7). `source_url` is null for fawazahmed0. While the kill switch is off nothing is listed and every collection returns 404 `hadith_collection_unavailable`; when on, all ten are served. The deferred routes (`/hadith/categories`, `/hadith/{id}`, `/hadith/daily`) stay marked deferred; `collections` is a literal segment so it cannot collide with `/hadith/{id}` (step 7 adds a route-order test).

The app reads **packs only** for reading. The endpoints serve the catalogue (the collections list before a pack is installed) and the OpenAPI contract.

App routes (replaces the spec §4 line `hadith/index.tsx, category/[id].tsx, [id].tsx`):

```
app/hadith/index.tsx                                       collections (covers, download state)
app/hadith/search.tsx                                      search in installed collections
app/hadith/[collection]/index.tsx                          books of a collection (header cover)
app/hadith/[collection]/books/[book]/index.tsx             chapters if the book has any, else its hadith list
app/hadith/[collection]/books/[book]/chapters/[chapter].tsx   hadith list of a chapter (Sunnah.com; no rows for fawazahmed0)
app/hadith/[collection]/hadith/[number].tsx                the hadith reader (one hadith, previous / next)
app/hadith/downloads.tsx                                   sheet: pack size, Wi-Fi, progress
```

`[book]` and `[chapter]` params are browsing keys only. **A saved item never stores a book or chapter key**: it stores collection slug + hadith number, plus a book number as a fallback place.

## Steps

| # | Step | Description | Dependencies | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Docs, ADR, spec patch | ADR 0042 (Proposed), this plan, README, spec/content-plan patch. Apply the patch only after the developer accepts the ADR. | Developer acceptance | drafted (revised for fawazahmed0) |
| 2 | Env, config, kill switch | **Remove** `HADITH_API_KEY` from `.env.example`; add `HADITH_COLLECTIONS_IMPORT_ENABLED=false`; `config/hadith.php` (commit pin and per-file SHA-256 map, `slug_map`, ordered list of the ten slugs, `grades_visible=false`, `primary_source`); `config/hadith_titles.php` skeleton (empty, developer-filled); migrations inserting `content_sources` rows `fawazahmed0` (`not_required`, Unlicense URL, provenance `notes`) and `sunnahcom` (`pending`); kill-switch service | 1 | |
| 3 | MySQL schema | Migrations, models, factories for the six tables; `utf8mb4_0900_bin` Arabic columns; additive only; slugs frozen only after the Sunnah.com public-page check | 1 | |
| 4 | Pack contract | `hadith_collections` in `ResourceGroup`, `ServedResourceGroup`, `PackSchema`, mobile `PackGroup` and `content-tables.ts`; pack builder and manifest gate (the kill switch); `hadith_grades` and `hadith_ref_aliases` ship from day one; grade filter (`grades_visible`, empty pack table); `HadithSearchTextNormalizer` (PHP) and its TS mirror with a parity fixture | 2, 3 | |
| 5 | Source interface and fawazahmed0 client | `Integrations/HadithApiFawaz` (pinned jsDelivr URL builder, retry with backoff, User-Agent with contact email, size cap, SHA-256 verification); `Domains/Hadith/Contracts/HadithCollectionSource`, DTOs, `FawazHadithSource`, `HadithSourceRegistry`; `hadith:snapshot` downloads `editions.json`, `info.json` and the `ara-{c}` editions into `storage/app/hadith` (git-ignored) and prints the hash map for review | 2 | |
| 6 | Importer and command | Mapper (section → book, ranges and `reference.book`, grades, no-text hadiths skipped), validator, `hadith:import` (flag, gate, `Cache::lock`, `--dry-run`, `--if-unlocked`, `--build-packs`), report (counts vs `last_hadithnumber` and info counts, no-text list, duplicates, section 0, range vs `reference.book` mismatches, grader list), source-text hash, scheduler entry (no-op unless hashes change or flag), text-integrity check; optional dry-run diagnostic comparing our `text_search` with `ara-{c}1` | 3, 4, 5 | |
| 7 | API endpoints and contract | Routes, controllers, FormRequests, Data objects, Resources, repositories; grade filter; ETag; problem codes; `npm run generate -w @quran/api-contract`; commit `openapi.json` and `schema.d.ts` | 3, 6 | |
| 8 | Design frames | Frames in `quran-app-screens.html` (list below): ten covers, books straight to hadiths, the chapters level for Sunnah.com, states, light/dark, Arabic/English, compact/expanded. **Developer approval gate.** Can start once step 1 is accepted | 1 | |
| 9 | Cover tokens and `CollectionCover` | Ten palette tokens plus fallback in `quran-app-design-system.html` and `packages/design-tokens`; `CollectionCover` in `src/shared/ui`; contrast check in light, sepia and dark | 8 (approved) | |
| 10 | Mobile data layer: content | `content.db` migration, pack install for `hadith_collections`, repositories (handle "no chapters"), hooks, FTS5 `search_hadith` build after install, installed-collection state, dev fixtures | 4, 6 | |
| 11 | Mobile data layer: personal | `user.db` tables `hadith_bookmarks`, `hadith_reading_position`; `PERSONAL_TABLES`; alias applier (dormant until a pack has aliases) | 10 | |
| 12 | Mobile UI: components | One file and one test each (list below); screens not built yet | 8, 9, 10 | |
| 13 | Mobile UI: screens, routes, entry points | The routes, i18n, Home tile and Menu card gated on an installed pack, sidebar link, Sources and thanks row, bookmark and last-read. A collection with exactly one book that holds hadith (`nawawi`, `qudsi`, `dehlawi`) opens its hadith list directly, with no books screen (developer, 1 Nov 2026) | 11, 12 | |
| 14 | Search | In-section Arabic search over `search_hadith` (normalised query, scope chips by collection, highlight by position, history) | 10, 13 | |
| 15 | Hardening | Offline, loading, error and download states; airplane mode; resize keeps position; accessibility; Dynamic Type; RTL and English | 13, 14 | |
| 16 | Exit check | Checks, visual review against frames on iPhone 17 and the expanded window, both languages, light and dark, airplane mode, release-blocker audit | 15 | |
| 17 | Release wiring | In production set `HADITH_COLLECTIONS_IMPORT_ENABLED=true`; add `hadith:import --download --if-unlocked --build-packs` to `docker/release.sh` (in-process pack build, the Azkar pattern); update `docs/runbooks/railway-release.md`; confirm PHP memory fits the largest edition (`ara-bukhari` is 9.8 MB of JSON; the Dockerfile memory limit was raised for Azkar); document the kill switch | 16 | |
| 18 | **Sunnah.com switch** | `SunnahComSource`, slug verification, alias report, re-import, version bump, feed floor, app alias application. **Blocked: needs the key and its written terms** | Key, terms, 17 | blocked |

### Tests for each step

| # | Tests (written with the step, not after) |
| :---: | :--- |
| 1 | Docs only. Review: every claim cites a path or a developer fact; no religious text (not even grade strings or section names); ADR number free. |
| 2 | Pest: kill-switch truth table (flag on/off × environment); `.env.example` has no `HADITH_API_KEY` line and the flag is `false` (test or CI grep); `config/hadith.php` pins the full 40-character SHA and no `@1`, lists exactly the ten slugs and has `grades_visible=false`; there is no `approved_collections`; migrations insert the two source rows (`fawazahmed0` `not_required`, `sunnahcom` `pending`); production refuses to change a source status from the command line. |
| 3 | Pest: migrations run and roll back; column types and collations (Arabic columns `utf8mb4_0900_bin`); unique (`source_id`,`source_key`); number is text, and `2787.2`-style values round trip; byte-exact round trip of a string with diacritics and U+200F (placeholder characters); `chapter_id` nullable; factories valid; `arch()` layering. |
| 4 | Pest: pack has the six tables, `hadith_chapters` and `hadith_ref_aliases` empty is valid; grades excluded from the pack while `grades_visible` is false; builder builds nothing while the flag is off; manifest lists all ten collections when on and none when off; `hadith:{lang}` untouched. Normaliser: strips U+200E/F, U+061C, U+202A–202E, U+2066–2069, U+FEFF, zero-width marks, harakat, tatweel; maps like `SearchTextNormalizer`; PHP and TS identical on a shared golden fixture; the **Quran** normaliser and `packages/quran-text-check` are unchanged and pass. Jest: `content-tables` mirrors `PackSchema`. |
| 5 | Pest with `Http::fake` and **placeholder** JSON fixtures shaped like the verified files: URL contains the pinned SHA and never `@1`; a file whose SHA-256 differs from `config/hadith.php` is refused; retry and backoff; oversized or truncated body refused; 404 on a collection reports it; snapshot is stable; no Arabic fetched from `ara-{c}1`; no English edition requested; shared source contract test reusable by `SunnahComSource`. |
| 6 | Pest: section → book by `section_details` ranges; `reference.book` mismatch fails the collection unless a developer-decided exception is listed; decimal numbers; hadith with no text skipped and listed; section 0 with and without hadiths; a hadith with several grades; collection with no grade rows imports with empty `hadith_grades`; `text_ar` byte-identical and `source_text_sha256` matches; counts vs source reported; duplicates reported; all ten slugs import; flag off: `--if-unlocked` exits 0 and writes nothing; `Cache::lock` blocks a second run; idempotent re-import (same pinned hashes → no version bump); one transaction per collection rolls back on error; scheduler entry registered and a no-op; `release.sh` has no hadith command; integrity check detects an altered row. |
| 7 | Pest feature test per endpoint (200, 404, cursor pagination, ETag and 304, `Accept-Language` does not change content); `chapters` returns an empty list for a book with none; no `grades` key while `grades_visible` is false; flag off returns an empty list and 404s; route order vs `/hadith/{id}`; OpenAPI regenerated and drift-free (`--fail-on-unknown`); `arch()`. |
| 8 | Review only: frames compared to tokens; placeholders only; every state present; approval recorded in the step brief. |
| 9 | Jest: `CollectionCover` for each of the ten slugs and the fallback, light/sepia/dark, RTL and English, accessibility label, no raw hex; `npm run check:html -w @quran/design-tokens`; contrast ≥ 4.5 : 1 for the title on every ground in all three themes. |
| 10 | Jest: pack install in one transaction and rollback on failure; repositories (books, hadiths of a book with and without chapters, one hadith by slug + number, previous/next across a book boundary); FTS build and query via the normaliser; Arabic bytes round trip; empty grades table means no grade in the view model; a null Arabic title is omitted, not replaced; `content.db` rebuilds from packs; no personal data in `content.db`. |
| 11 | Jest: bookmark add/remove/list by `{slug}:{number}`; last-read per collection; `PERSONAL_TABLES` updated and **`clear.test.ts` updated**; «مسح البيانات» clears both tables; alias applier: `exact_text` rewrites, other matches mark `unverified`, no alias leaves the item, applying twice is idempotent; no database id stored. |
| 12 | One `*.test.tsx` per component: render and variants, interaction, RTL (ar and en), role and label, theme tokens, no raw hex. |
| 13 | Jest screen and route tests: `routes.test.ts` with `satisfies keyof paths`; Home tile and Menu card only with an installed pack (update `HomeScreen.test.tsx`, which asserts no الحديث tile today); every string in `ar.json` and `en.json`; a book without chapters lists hadith directly, a book with chapters lists chapters (fixtures); no grade UI; source line present; no link when `source_url` is null; bookmark and last-read persist offline. |
| 14 | Jest: normalised query matches diacritic and alef variants; scope chips; highlight positions on original text; empty and no-results; history capped at 20 and cleared by «مسح البيانات»; Quran search unaffected. |
| 15 | Jest: offline, loading, error and retry states; resize keeps position; Dynamic Type at the largest sizes; screen-reader order. Manual: airplane mode on the simulator and the Android emulator. |
| 16 | `composer qa`; `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; contract generated and committed; screenshots vs `frame-shot.py` at 390 × 844; expanded window; grep that no key variable and no `@1` URL remain; release-blocker audit. |
| 17 | Pest: `release.sh` runs the hadith import after Azkar and fails on a validation error; flag off exits 0 and prints why; manifest has ten resources when on and none when off; import peak memory under the container limit (measured); no tile when no pack installed. |
| 18 | Pest: `SunnahComSource` passes the shared contract test; alias report on placeholder corpora for each match method; wet run keeps the `resource_id`; manifest shape unchanged; older device gets `410`; schema and OpenAPI diff empty; Jest: alias application on a fixture pack; `unverified` state; chapters appear for a source that has them. |

## Step 1 outputs (this change)

- `docs/adr/0042-hadith-collections-source.md` (Proposed, retitled: fawazahmed0 now, Sunnah.com later).
- `docs/plans/phase-7.md` (this file), `docs/plans/phase-7/README.md`.
- `docs/plans/phase-7/spec-changes.md` (proposed patch, **not applied**).

## Frames needed (step 8)

New section «الحديث — Hadith collections (proposed)» in `quran-app-screens.html`, after the Azkar section, ids with the `HadithColl` prefix. The existing `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` stay, captioned "deferred: HadeethEnc, ADR 0042". Existing language only (tokens, Amiri for hadith text, IBM Plex Sans Arabic for UI, cards, 44 pt buttons), copying the Azkar frames' markup. Bracketed placeholders for all hadith text; cover titles and book names are «[اسم المجموعة]» / «[اسم الكتاب]» until the reviewer supplies them.

| Frame id | Content |
| --- | --- |
| `HadithCollList` | Collections list with covers: installed, one not installed (size, download button), one downloading. Search button. Source credit footer. Light, Arabic. Plus `HadithCollListDark`, `HadithCollListEnglish`. |
| `HadithCollCovers` | Cover specimens for the ten collections and the fallback, light, sepia and dark, with contrast values. |
| `HadithCollBooks` | Collection header (large cover, title, author, counts, source credit) and the books list (number medallion, title or number only when the title is null, hadith count). Plus dark and English. |
| `HadithCollBook` | A book's hadith list **with no chapters** (the fawazahmed0 case): hadith cards with number and a clamped 3-line preview. Plus dark and English. |
| `HadithCollSingle` | A **single-book collection** (`nawawi`, `qudsi`, `dehlawi`): collection header, then the hadith list directly, with no books screen. Plus dark and English. |
| `HadithCollChapters` | A book's chapters list, labelled "shown when the source has chapters (Sunnah.com)", and the chapter's hadith list. Plus dark and English. |
| `HadithCollReader` | One hadith: breadcrumb (collection · book), number, full Arabic, source line, bookmark, previous and next. No grade section, no English text. Plus dark and English (English = English UI labels). |
| `HadithCollReaderGrade` | Future state labelled "after the developer turns grades on (not built now)": grade section with grader attribution. Fixes layout only. |
| `HadithCollSearch` | Search field, scope chips by collection, recent searches; results with highlighted match; no-results. |
| `HadithCollDownload` | Sheet: pack size, Wi-Fi only, progress, cancel. |
| `HadithCollStates` | Loading skeletons, offline with nothing downloaded, offline with downloaded content, download failed, load error with retry. |
| `HadithCollSaved` | Saved hadith list, and the **unverified** state after a source switch. |
| `HadithCollExpanded` | Expanded window with the sidebar: collections and books on the start side, reader on the other; plus the reader with a side panel. |
| Existing, updated | `#Main` and the expanded Home: tile link to the collections list. `Menu`, `MenuDark`, `MenuEnglish`: الحديث card (amends ADR 0032 §3). Sidebar «المزيد» entry retargeted. `Sources`: Hadith credit row. |

Android frames only where the platform differs (follow `phase-6/step-04-frames.md`).

## Components (step 12; each its own file with a colocated test)

`src/shared/ui`: `CollectionCover` (reuse `Card`, `Divider`, `ScreenHeader`, `SheetHeader`, `UiText`).
`src/features/hadith/components`: `CollectionRow`, `CollectionHeader`, `CollectionDownloadButton`, `BookRow`, `ChapterRow`, `HadithCard`, `HadithText`, `HadithMeta`, `HadithSourceLine`, `HadithBreadcrumb`, `HadithPager`, `HadithBookmarkButton`, `SavedHadithRow`, `UnverifiedNotice`, `HadithSearchField`, `HadithSearchResultRow`, `HadithStateView`.

## Proposed CLAUDE.md wording (not applied)

Replace the «Current phase» bullet's first sentence with:

> **Current phases: Phase 6, الأذكار (Azkar)** on branch `ft/azkar` (spec §15, ADR 0031), **and, in parallel, Phase 7, الحديث (Hadith: full collections)** on branch `ft/hadith` (ADR 0042, plan `docs/plans/phase-7.md`). The source is fawazahmed0/hadith-api, pinned to a commit; all ten collections ship with no content reviewer, behind the kill switch `HADITH_COLLECTIONS_IMPORT_ENABLED` (true in production at release). Grades are hidden. Sunnah.com's key is pending. HadeethEnc (daily hadith, topics) is deferred.

Keep the rest (Azkar blockers, open earlier-phase work) and add «Check the branch with `git branch --show-current`; each phase's files stay on its own branch.»

## Release blockers

No production Hadith content ships until the items for that collection are cleared. Items marked "switch" block only step 17.

| # | Blocker | Cleared by |
| :---: | :--- | :--- |
| RB1 | Reviewer approval of the collection (content, edition provenance: the `ara-*` edition names no author and no source, and the wording of the source line). Suggested review order: `nawawi` first (42 hadith, small and well known), then the rest | Reviewer, recorded by adding the slug to `approved_collections` |
| RB2 | Sunnah.com key and written terms (switch) | Key, then the step 17 migration. **Not a blocker for production with fawazahmed0.** |
| RB3 | Grades are hidden | Reviewer sign-off per grader, `reviewed_graders`, and the developer's answer to open question 6 |
| RB4 | English text | Not stored. Adding it needs its own rights decision. Nothing to clear now. |
| RB5 | Reviewed Arabic titles: 10 collections, authors, ~407 sections (the cover needs the collection title) | Reviewer; `config/hadith_titles.php` |
| RB6 | Content reviewer sign-off on the Hadith section (content plan «Review») | Reviewer |
| RB7 | Frames approved (ADR 0010) | Step 8 |
| RB8 | Numbering differences between sources (switch) | Alias report read before the wet switch |
| RB9 | Pinned source integrity: files match the recorded SHA-256 at the pinned commit; a SHA bump is a reviewed change | Step 5 tests and the review of any bump |
| RB10 | Text integrity: stored Arabic equals source bytes | Integrity check passes (step 6) |
| RB11 | Cover contrast and approval | Step 9 test; frames approved |
| RB12 | Gaps: hadith numbers with no text are skipped and listed | Reviewer accepts the gap list for each collection |
| RB13 | Store launch with no approved collection | Developer decision: ship dormant (no tile, no card) or hold it back |

## Open questions for the developer (recommended default in brackets)

1. **ADR number.** 0041 is taken; accept 0042? [Yes.]
2. **Slugs.** Check the ten slugs against Sunnah.com's public pages before step 3 freezes them (the three forty-hadith collections first). [Keep fawazahmed0's names unless a page shows a different Sunnah.com name.]
3. **Arabic names.** Who supplies reviewed Arabic names for 10 collections, their authors and ~407 sections? [A reviewer from a named published Arabic edition, entered in `config/hadith_titles.php`; null until then; a collection cannot be approved without its titles.]
4. **Edition provenance.** `ara-*` says author "Unknown" and gives no source. [The reviewer identifies each edition's textual source before approving that collection; none approved until then.]
5. **Approval record.** Per-collection approval as the slug list in `config/hadith.php`. [Yes.]
6. **Grades.** Once the reviewer signs off, may named-grader grades show before Sunnah.com? [No; keep hidden through Phase 7; Bukhari and Muslim have none and none are invented.]
7. **Missing text.** Skip hadith numbers with no text and list them. [Yes; the reviewer decides per collection whether the gap is acceptable.]
8. **Section 0** (empty name). [Import as a book only if it holds hadiths; show the number only.]
9. **English.** Not stored. [Confirm; revisit with Sunnah.com.]
10. **Cover palette.** Ten colours plus a fallback (and sepia values) as new tokens. [Approve in step 8.]
11. **Placement.** Home tile and Menu card gated on an installed pack; no Home hadith card (amends ADR 0032). [Yes.]
12. **Reading source.** Packs only; no online browsing of un-downloaded collections. [Yes.]
13. **Share and copy.** [Available only for approved collections, with the source line.]
14. **Search.** In-section only now; global chip later. [Yes.]
15. **Saved items.** A list plus one last-read place per collection, separate from ADR 0028's single Quran bookmark. [Yes.]
16. **Pack group.** `hadith_collections` rather than reuse `hadith`. [Yes.]
17. **Switch remap policy.** `exact_text` moves silently; others become *unverified* at book level. [Yes; risk is likely lower than with hadithapi.com but unmeasured.]
18. **Small collections.** Include `nawawi`, `qudsi`, `dehlawi` (about 40 hadiths each). [Yes, as normal collections.]
19. **Phase numbering and launch.** Beta becomes Phase 8. [Yes; the store launch does not wait for Hadith.]
20. **Sepia covers.** [Draw all three themes in the cover specimen only.]

## Spec and ADR conflicts found

1. ADR 0041 already exists; this ADR is 0042.
2. Spec §15 names Phase 7 «Beta and store review» (Phase 6 D10 already says Beta becomes Phase 7). Beta becomes Phase 8; the cut-line row is split.
3. **Content plan, fawazahmed0:** the Hadith table says "Not used unless the reviewer approves specific content" and the API catalog says "Not used" with "Grade sources are not documented". ADR 0042 amends both: used under per-collection reviewer approval. The content plan's Hadith «Display» line ("every hadith shows its grade … and a link back") conflicts with D4 and the null source URL; resolved by ADR 0042 §11.
4. Spec §5, §6, §7 reserve `hadith:{lang}` and name the HadeethEnc tables. The new tables and group are different; the old text is marked deferred.
5. ADR 0017 and ADR 0032 §3 have no الحديث rule for collections. ADR 0032 needs an amendment and updated `Menu*` frames.
6. `apps/mobile/CLAUDE.md` «Where state lives» says hadith browsing uses TanStack Query; collection reading moves to `content.db`.
7. The existing `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` frames and the Home tile link draw the deferred HadeethEnc design.
8. Spec §5 calls the table `content_sources`; the brief said `sources`. This plan uses `content_sources`.
9. Spec §5 says `resources.group` is an enum; the migration is `string(64)`. No database change for the new group.
10. `.env.example` has `HADITH_API_KEY="hADITH_API_KEY"`; step 2 removes the line. The developer should also delete it from the local `apps/api/.env`.
11. CLAUDE.md names `app/Support/ArabicNormalizer.php`; it does not exist. The real class is `app/Support/QuranText/SearchTextNormalizer.php` and it does not strip U+200F or other bidirectional marks; Hadith needs its own normaliser.
12. The Unlicense covers the repository author's work, not necessarily third-party editors or graders, and the edition names no source; the lock therefore stays per collection with reviewer approval, and grades stay hidden. This is a rights risk the developer is accepting, not a closed question.
13. Spec §3 and §13 (`SyncHadithJob`, `SendDailyHadithJob`, `/bootstrap` daily hadith id, `devices.push_daily_hadith`) belong to the deferred HadeethEnc phase.
14. Phase 6 runs in parallel and edits the same files (see "Merge risk").
15. The agent rules forbid switching branches, so the files are on `main`; the developer creates `ft/hadith` and moves them.
