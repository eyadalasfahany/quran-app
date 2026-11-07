# Phase 7 — الحديث (Hadith: full collections)

Status: **plan accepted (developer, 1 Nov 2026); implementation not started** · Branch: `ft/hadith` (the developer creates it; these files are written on `main` and move there) · Runs **in parallel with Phase 6** (`ft/azkar`, exit check still open) · ADR 0042 (Accepted) · Spec §5, §6, §7, §9, §4, §15 (edits applied 1 Nov 2026; record in [`phase-7/spec-changes.md`](phase-7/spec-changes.md)).

**Revision (1 Nov 2026):** the developer replaced hadithapi.com with **fawazahmed0/hadith-api, read directly** as the source now. **Hadith data** is never taken from hadithapi.com (no terms) or ummahapi.com (a proxy of fawazahmed0 that drops books and graders). **Titles are**: ummahapi.com gives the ten Arabic collection names, hadithapi.com gives Arabic section titles through a one-off dev-only matcher, and the developer approves author names (ADR 0042 §4a). Sunnah.com stays the long-term target.

**Revision (7 Nov 2026, proposed, ADR 0076):** the developer decided «use OpenITI» for hadith chapter (باب) titles. D14 and step 6b add chapters for four collections first; D8, D9 and the «Titles data» rules below stay as written and are **amended additively by D14** (see «Spec and ADR conflicts found», items 17 to 22). Not Accepted until the developer accepts ADR 0076.

**Goal:** a Hadith section with full collections (collection → book/كتاب → hadith, with an optional chapter/باب level that fawazahmed0 does not have) that reads fully offline from per-collection packs. The source today is fawazahmed0's static JSON, pinned to a commit SHA, with no switch and all ten collections shipping (no content reviewer). When Sunnah.com grants a key, a `SunnahComSource` replaces it with **no change** to the schema, endpoints, packs or screens.

HadeethEnc (daily hadith, topics, explanations, the spec §5 `hadith_categories` / `hadiths` / `hadith_translations` / `daily_hadiths` tables, the daily push) is **deferred**. Its spec text stays, marked deferred.

**Sources this plan rests on (read for this plan):**
- `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/mobile/CLAUDE.md`, `.claude/agent-rules.md`.
- `docs/technical-spec.md` §3, §4, §5 (`content_sources`, `resources`, Hadith tables), §6, §7 (pack contract, Azkar import), §8–§9, §12, §13, §15, §16.
- `docs/content-plan.md` («Hadith» section, hadith sources table, «Rules for every provider»).
- ADR 0006, 0008, 0010, 0013, 0014 (hadith translations stay), 0017, 0027, 0028, 0031, 0032, 0038, 0041, 0042.
- `docs/plans/phase-6.md`, `phase-6/README.md`, `phase-6/step-02-schema.md`, `phase-6/step-04-frames.md`.
- Code read: `apps/api/app/Domains/Azkar/**`, `apps/api/app/Integrations/Dorar/**`, `Domains/Content/Enums/ResourceGroup.php` and `ServedResourceGroup.php`, `Content/Packs/PackSchema.php`, `apps/api/app/Support/QuranText/SearchTextNormalizer.php`, `apps/api/routes/console.php`, `apps/api/config/azkar.php`, `apps/api/.env.example`, `docs/runbooks/railway-release.md`, `apps/mobile/src/core/sync/content-tables.ts`.
- Facts about fawazahmed0/hadith-api from the developer (1 Nov 2026), listed below. Not re-fetched.
- For D14 and step 6b (7 Nov 2026): `docs/plans/phase-7/chapters-research.md`, `docs/adr/0076-hadith-chapters-from-openiti.md`, `docs/content-plan.md` («Hadith» and «Rules for every provider»), the step 3 migrations `apps/api/database/migrations/2026_11_01_12000*` and models in `apps/api/app/Domains/Hadith/Models`, step 5 (`apps/api/app/Integrations/HadithApiFawaz`, `apps/api/app/Domains/Hadith/Sources`, `apps/api/config/hadith.php`), `apps/api/app/Domains/Content/Enums/PermissionStatus.php`, ADR 0075 and the frames in `screens/frames/hadith/`.

## Rules

- All earlier-phase rules apply (`apps/mobile/CLAUDE.md`, `apple-design`, tokens through `useTheme()`, one component per file with its colocated test, screens only compose).
- **No religious text anywhere**: code, tests, fixtures, frames, docs, reports. Fixtures are placeholders (`FIXTURE text 1 — not a hadith`, «نص تجريبي ١ — ليس حديثًا»), source `taybah-dev-fixture`. Frames use bracketed placeholders such as «[نص الحديث كما ورد في المصدر]». Reports give counts, keys and paths only. This includes grade strings, graders' judgements and section names: use `FIXTURE grade`, `FIXTURE grader`.
- **Hadith text is never altered.** Arabic is stored byte for byte as received. Only `text_search` is normalised.
- **No grade is shown** through Phase 7 (D4): grades are stored with their graders, `hadith.grades_visible` is `false`, and the pack's grade table is empty.
- **Every collection that ships is complete (developer, 7 Nov 2026).** Complete means every hadith number in the collection's numbering has its text and its book (and its chapter once chapters exist). Gaps in fawazahmed0 are filled from OpenITI only when confirmed by both neighbours (ADR 0076). A collection that still has a gap is not packed, not listed in the manifest and not shown in the app until the gap is closed (**amended 7 Nov 2026, option 2:** after every source is tried, an unrecoverable hadith becomes a placeholder row shown as «غير متوفر حاليًا في المصدر», and the collection is released; ADR 0076); the import report states `complete: yes/no` per collection. Never ship a partial collection, never hide a gap.
- **Arabic only.** No English edition is fetched or stored.
- **All ten collections ship.** There is no switch and no lock (ADR 0045, 2 Nov 2026): the import runs on every deploy, like Azkar, from step 17. There is no content reviewer; the developer decides (Arabic names, source-line wording, gap list, SHA bumps).
- No key is needed for hadith data. `HADITH_API_KEY` is an **optional, dev-only** entry (empty in `.env.example`, comment "dev-only, used by hadith:match-section-titles"), never read in production and redacted from logs.
- If code, the spec and an ADR disagree, stop and report.

## Decisions (developer, 1 Nov 2026)

| # | Question | Decision |
| :--- | :--- | :--- |
| D1 | Timing | Start now, in parallel with Phase 6, on `ft/hadith`. CLAUDE.md wording applied 1 Nov 2026 (see below). |
| D2 | Scope | Full collections only. HadeethEnc work deferred; its spec text stays, marked deferred. |
| D3 | Source | **fawazahmed0/hadith-api now, read directly, pinned to commit `df57907be35291c91ad6a6691180e22ca9920784`** (not `@1`; bumping the SHA is a change the developer approves). Licence Unlicense. Sunnah.com later via `SunnahComSource` with no schema, endpoint, pack or screen change. Replaces the earlier hadithapi.com decision. |
| D4 | Grades | Hidden through Phase 7. Stored with the named grader. **Simplest option chosen:** a constant `hadith.grades_visible = false` in `config/hadith.php`; no `review_status` column and no `reviewed_graders` list (a later phase can add them additively). Bukhari and Muslim have no grade rows and no collection-level "Sahih" is invented. |
| D5 | Covers | Own covers per collection from existing tokens (Arabic name, distinct colour), drawn and approved before code, no third-party images. **Planner choice:** a rendered `CollectionCover` component (ADR 0042 §10). Now ten collections. **Updated 7 Nov 2026 (frames approved): bound-book covers in four muted tones plus a neutral fallback, told apart by ornament, not ten colours.** |
| D6 | Lock | **No content reviewer; all ten collections ship** (`bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi`, `qudsi`, `dehlawi`). The kill switch `HADITH_COLLECTIONS_IMPORT_ENABLED` was removed (2 Nov 2026, ADR 0045, with the note in ADR 0042): the import runs on every deploy, like Azkar, from step 17. Rollback is a revert or a data migration. The `fawazahmed0` source row records the Unlicense (`not_required`). Amends the content plan's fawazahmed0 row and its "content reviewer signs off on the Hadith section" rule for Phase 7 collections (Azkar's reviewer rules in ADR 0031 are untouched). |
| D7 | Arabic only | Only the `ara-{c}` editions are stored. `ara-{c}1` is not stored and not a `text_search` input (our own normaliser). English editions are not fetched. |
| D8 | Hierarchy | collection → book (= fawazahmed0 section) → hadith. `hadith_chapters` stays in the schema for Sunnah.com and is empty for this source; the app handles "no chapters". |
| D9 | Arabic names | fawazahmed0 has none (English collection names; 0 of Bukhari's 98 section names contain Arabic). `config/hadith_titles.php` holds data with a `source` per entry, approved by the developer: **collection names from ummahapi.com** (`arabic_name`, ten names), **author names** drafted by the orchestrator and **approved by the developer, 1 Nov 2026**, **section (كتاب) names** from a one-off hadithapi.com match proposal (`hadith:match-section-titles`, strict two-way 95% rule, titles only; see "Titles data"). A missing name stays null and **does not block shipping**: Arabic UI shows «مجموعة {n}» / «كتاب {n}» (i18n labels, n = fixed collection position or `book_number`) and an ornament-only cover; never the English source name in the Arabic UI, never an invented title. English UI may show the source's `title_en`. |
| D10 | Code layout (planner, follows `apps/api/CLAUDE.md`) | Client in `app/Integrations/HadithApiFawaz`; `HadithCollectionSource`, adapters (`FawazHadithSource`, later `SunnahComSource`) and the importer in `app/Domains/Hadith`. |
| D11 | Pack group (planner; confirm) | New group `hadith_collections`, one `resources` row per slug, kept across the source switch. `hadith:{lang}` stays reserved for deferred HadeethEnc. |
| D12 | Delivery gate | **None.** A `not_required` source is delivered (developer, 7 Nov 2026). Since 2 Nov `permission_status` is provenance only and blocks nothing (ADR `0042-features-enabled-by-default`, amendment), so hadith packs have no permission gate, and `pending`/`denied` do not block either. |
| D13 | Canonical slugs | Checked against Sunnah.com 7 Nov 2026 (open question 2): seven match; three differ, so the canonical slugs are `nawawi40`, `qudsi40`, `shahwaliullah40`. `config/hadith.php` `slug_map.fawazahmed0` maps `nawawi`, `qudsi`, `dehlawi` to them; fawazahmed0 edition file names (`ara-nawawi` etc.) keep the source's slug. Slugs are now frozen. |
| D14 | Chapters (باب) from OpenITI (**proposed**, developer decided «use OpenITI», 7 Nov 2026; ADR 0076) | **Amends D8 and D9 additively.** OpenITI supplies chapter titles and hadith-number ranges only, never hadith text. Pinned to the Zenodo release 2023.1.8 (version DOI to confirm). First Bukhari, Abu Dawud, Nasa'i, Ibn Majah; then Muslim, Tirmidhi, Malik once their parsers are measured (step 6c). The dev-only matcher `hadith:match-chapters` accepts a chapter only if it lies in one book (hard) and passes forward and backward 95% checks (ADR 0076 §5); the proposal is committed as `database/data/hadith/chapters/{slug}.json` with its SHA-256 pinned in `config/hadith.php`, and the importer reads only that file. Chapter rows use `source_id` = `openiti`, so no schema change; `content_sources` row `openiti` is added by a new migration, with the CC BY-NC-SA 4.0 credit on the Sources screen and the ShareAlike notice on the chapter data. **Partly chaptered books (navigation decision for the developer): option C (book all-or-nothing) if the 6b.1 per-book report shows most books complete, otherwise option B (in-place runs).** Expected yield of C is low (probably Ibn Majah and few books elsewhere; ADR 0076 §7 gives the reasons), so nothing is chosen until the report exists. **Chapters do not hold the Phase 7 release:** without chapter files every collection ships flat; the open question is whether to wait for 6b to avoid one pack re-download per chaptered collection later. Decisions still open: Quran text inside titles (no default, RB18), the title-cleaning list, Shamela naming, the pack-mixing ShareAlike risk, partly chaptered behaviour, attribution wording. Replaced by Sunnah.com at step 18 with no schema change. |
| D15 | Chapters: developer answers (7 Nov 2026) | Titles quoting verses shown as printed (ADR 0076 decision 1). **The Hadith release waits for chapters (6b)**: RB17–RB23 block the release. Other defaults accepted (ADR 0076, Developer decisions). |
| D16 | Pack hosting | Hadith packs are served like every other pack, from the API (`/content/packs/{resource}/{version}`), developer 7 Nov 2026. Moving **all** pack downloads to Cloudflare R2 is a later, separate piece of work (needs a new ADR, an S3 Flysystem package, R2 credentials in Railway, and the non-negotiable 2 host list updated). The app needs no change for it: `packUrl()` already accepts an absolute manifest URL. |

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
| `screens/` (ADR 0075), `quran-app-design-system.html`, `packages/design-tokens/src/*` | new section and tokens | Add a new section at the end; do not touch Azkar sections. |
| `docs/technical-spec.md`, `docs/content-plan.md`, `CLAUDE.md`, ADR 0017/0032 notes | proposed patch only | Apply after `ft/azkar` merges, or by hand. |
| `apps/api/routes/console.php`, `docker/release.sh` | one scheduler entry; `release.sh` unchanged | Low. |
| `apps/api/.env.example` | empties `HADITH_API_KEY` (dev-only comment), adds the flag | Low. |

ADR numbers: 0042 is this phase's. If `ft/azkar` adds an ADR first, renumber at merge.

## Facts the plan relies on (developer, 1 Nov 2026)

**fawazahmed0/hadith-api** (`github.com/fawazahmed0/hadith-api`):
- Licence **Unlicense**. Latest commit `df57907be35291c91ad6a6691180e22ca9920784` (2026-06-03). Static JSON on jsDelivr: `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@<sha>/...`. No key, no rate limit.
- Files: `editions.json` (per collection, editions with name, language, direction, has_sections, link, linkmin); `info.json` (per collection `metadata{name, sections{n: English name}, last_hadithnumber, section_details}` and `hadiths[{hadithnumber, arabicnumber, grades[{name, grade}], reference{book, hadith}}]`); `editions/{edition}.json` (full collection: `metadata{name, sections, section_details{n:{hadithnumber_first/last, arabicnumber_first/last}}}`, `hadiths[{hadithnumber, arabicnumber, text, grades, reference}]`; `ara-bukhari` is 9.8 MB raw); `editions/{edition}/sections/{n}.json`; `editions/{edition}/{n}.json`; `.min.json` variants.
- Arabic editions: `ara-{c}` (diacritics; stored byte for byte) and `ara-{c}1` (diacritics removed; not stored). Edition `author` is "Unknown", `source` is empty. `References.md` lists the sites the data came from "directly or indirectly": al-maktaba.org (Shamela), sunnah.com, iium.edu.my/deed/hadith, hadithbd.com, zubairalizai.com, and al-maktaba.org books 1755 (Abu Dawud, Albani grades) and 32832 (Abu Dawud, Arnaut grades), among others.
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

- Grade values are English strings. Collection and section names are English only (for example, 0 of Bukhari's 98 section names contain Arabic); there are no Arabic names or author names. Section 0 exists with an empty name in some collections. Some hadith numbers have no text. Numbers can be decimal (for example `2787.2`).
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

## Titles data (`config/hadith_titles.php`)

Hadith data comes only from fawazahmed0. Titles come from three places, each entry carrying its `source`; the developer approves the file (ADR 0042 §4a). A missing title stays null and the Arabic UI shows «مجموعة {n}» / «كتاب {n}», so nothing here blocks shipping.

| Slug | Arabic name (ummahapi.com `arabic_name`) | Arabic author (drafted by the orchestrator, **approved by the developer, 1 Nov 2026**) |
| --- | --- | --- |
| `bukhari` | صحيح البخاري | الإمام محمد بن إسماعيل البخاري |
| `muslim` | صحيح مسلم | الإمام مسلم بن الحجاج النيسابوري |
| `abudawud` | سنن أبي داود | الإمام أبو داود سليمان بن الأشعث السجستاني |
| `tirmidhi` | جامع الترمذي | الإمام أبو عيسى محمد بن عيسى الترمذي |
| `ibnmajah` | سنن ابن ماجه | الإمام محمد بن يزيد ابن ماجه القزويني |
| `nasai` | سنن النسائي | الإمام أحمد بن شعيب النسائي |
| `malik` | موطأ مالك | الإمام مالك بن أنس |
| `nawawi` | الأربعون النووية | الإمام يحيى بن شرف النووي |
| `qudsi` | الأحاديث القدسية | null (several compilers) |
| `dehlawi` | الأربعون لولي الله الدهلوي | الإمام شاه ولي الله الدهلوي |

- **Collection names:** from ummahapi.com's `GET /api/hadith/collections` (`arabic_name`, verified 1 Nov 2026); names only, no hadith data. ummahapi.com has no book or section endpoint and no Arabic section names.
- **Authors:** drafted by the orchestrator, **approved by the developer, 1 Nov 2026**; `qudsi` is null.
- **Sections (كتاب):** a one-off match against hadithapi.com, only for the six shared collections. `hadith:match-section-titles` (dev only, in step 6) writes a proposal file for the developer to approve and commit. Match rule: for each fawazahmed0 section take its hadith numbers that have text (from `section_details`); accept a hadithapi chapter's `chapterArabic` only when **≥ 95% of those numbers map to that single chapter and ≥ 95% of that chapter's hadith map back to the section**; otherwise null. Bukhari shows why: fawazahmed0 has 97 named sections against hadithapi.com's 99 chapters. The report lists every accepted and rejected match with both percentages. The command refuses to run in production, is not scheduled, is not in `release.sh`, needs the dev-only `HADITH_API_KEY` (a query parameter, so it is redacted from logs, reports and proposals), reads only titles, hadithNumber and chapterId, and stores titles as received. `malik` has no hadithapi.com counterpart and stays numbered; `nawawi`, `qudsi` and `dehlawi` have one section and open straight to the hadith list.
- **Why acceptable:** titles are short factual names of classical book divisions; the import is one-off and developer-approved; hadithapi.com has no terms, so the risk is noted. Sunnah.com's titles replace these at step 18.

**Chapter (باب) titles (D14, ADR 0076, proposed).** A fourth source: OpenITI, titles and number ranges only. They are not in `config/hadith_titles.php` (too large for a cached config array); they live in `apps/api/database/data/hadith/chapters/{slug}.json`, one file per collection, each with a header (release, DOI, version id, source-file SHA-256, matcher version, licence) and a licence notice beside the folder. Titles are the heading text with only the removals on ADR 0076 §3's closed list (developer approves the list). A chapter title that is empty or that fails the acceptance rule is not written; nothing is invented and no English title exists (`title_en` stays null). Quran text inside titles is a developer decision (RB18).

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

No `grades` in any response while `hadith.grades_visible` is false (all of Phase 7). `source_url` is null for fawazahmed0. Every collection is served once its pack is installed (no switch, ADR 0045); a collection with no installed pack returns 404 `hadith_collection_unavailable`. The deferred routes (`/hadith/categories`, `/hadith/{id}`, `/hadith/daily`) stay marked deferred; `collections` is a literal segment so it cannot collide with `/hadith/{id}` (step 7 adds a route-order test).

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
| 1 | Docs, ADR, spec patch | ADR 0042 (Accepted), this plan, README, spec, content-plan, CLAUDE.md and ADR 0017/0032 edits applied | Developer acceptance | done (1 Nov 2026) |
| 2 | Env, config | `HADITH_API_KEY=` **empty and dev-only** in `.env.example` (comment "dev-only, used by hadith:match-section-titles"; `config/hadith.php` exposes it only outside production); `config/hadith.php` (commit pin and per-file SHA-256 map, `slug_map`, ordered list of the ten slugs, `grades_visible=false`, `primary_source`); `config/hadith_titles.php` with the ten ummahapi.com collection names and the author names (`source` per entry, authors approved by the developer, 1 Nov 2026), section titles empty; migrations inserting `content_sources` rows `fawazahmed0` (`not_required`, Unlicense URL, provenance `notes`) and `sunnahcom` (`pending`)| 1 | |
| 3 | MySQL schema | Migrations, models, factories for the six tables; `utf8mb4_0900_bin` Arabic columns; additive only; slugs frozen only after the Sunnah.com public-page check | 1 | |
| 4 | Pack contract | `hadith_collections` in `ResourceGroup`, `ServedResourceGroup`, `PackSchema`, mobile `PackGroup` and `content-tables.ts`; pack builder and manifest (no switch, ADR 0045); `hadith_grades` and `hadith_ref_aliases` ship from day one; grade filter (`grades_visible`, empty pack table); `HadithSearchTextNormalizer` (PHP) and its TS mirror with a parity fixture | 2, 3 | |
| 5 | Source interface and fawazahmed0 client | `Integrations/HadithApiFawaz` (pinned jsDelivr URL builder, retry with backoff, User-Agent with contact email, size cap, SHA-256 verification); `Domains/Hadith/Contracts/HadithCollectionSource`, DTOs, `FawazHadithSource`, `HadithSourceRegistry`; `hadith:snapshot` downloads `editions.json`, `info.json` and the `ara-{c}` editions into the `SourceCache` folder (`storage/app/private/sources/hadith/{commit}`, git-ignored, ADR 0068) and prints the hash map for review | 2 | |
| 6 | Importer and command | Mapper (section → book, ranges and `reference.book`, grades, no-text hadiths skipped), validator, `hadith:import` (`Cache::lock`, `--dry-run`, `--defer-pack`, `--build-packs`; no switch, ADR 0045), report (counts vs `last_hadithnumber` and info counts, no-text list, duplicates, section 0, range vs `reference.book` mismatches, grader list), source-text hash, scheduler entry (no-op unless hashes change), text-integrity check; optional dry-run diagnostic comparing our `text_search` with `ara-{c}1`; **`hadith:match-section-titles`** (dev-only matcher, see "Titles data") | 3, 4, 5 | |
| 6b | Chapter matcher and import (D14, ADR 0076; **proposed**) | Three reviewable parts. **6b.0 spike and pins:** fetch the Zenodo release (version DOI, archive size, whether the four version ids exist), record SHA-256s of the files read, write one parser per version (باب and كتاب/أبواب headings, numbered hadith, closed markup list), re-measure the research table on the Zenodo files; **no chapter is accepted from GitHub-commit figures.** **6b.1 matcher:** `hadith:match-chapters` (dev-only, one collection per run) writes a proposal and a report (every accepted and rejected chapter with the one-book result, forward and backward percentages and counts; per-book coverage under options B and C; n ≤ 19 cost; per-hadith text-check rate; count of titles outside the cleaning list; count of titles with a Quran-text run; count of titles with continuation lines). **6b.2 import:** migration adding `content_sources` row `openiti` (`granted`, CC BY-NC-SA 4.0, notes); `config/hadith.php` pins for the chapter files and for the OpenITI source files; importer extension that reads `database/data/hadith/chapters/{slug}.json`, verifies its SHA-256, writes `hadith_chapters` and `hadith_entries.chapter_id` (a collection with no file imports as today); pack builder carries the rows; licence notice file. Does not edit step 2's migrations | 3, 5, 6 | |
| 6c | More collections (D14) | One brief per collection (Muslim, Tirmidhi, Malik): its per-version parser, the same report, the same acceptance rule, its data file. Each is its own review | 6b | |
| 7 | API endpoints and contract | Routes, controllers, FormRequests, Data objects, Resources, repositories; grade filter; ETag; problem codes; `npm run generate -w @quran/api-contract`; commit `openapi.json` and `schema.d.ts`. **D14:** the `chapters` route and `?chapter=` return real rows for collections that have a chapter file and stay empty or filtered-empty for the rest (the shape does not change); each chapter resource carries `title_ar`, `chapter_number`, `hadith_count` and no source URL | 3, 6 (6b for real data) | |
| 8 | Design frames | Frames in `screens/frames/hadith/` (list below; ADR 0075): ten covers, books straight to hadiths, the chapters level for Sunnah.com, states, light/dark, Arabic/English, compact/expanded. **Developer approval gate.** Can start once step 1 is accepted | 1 | |
| 8b | Chapter frames (D14; **developer approval gate**) | Changes to the approved step 8 frames and one new frame, listed in «Frames needed for chapters». Frames are drawn in `screens/frames/hadith/` (ADR 0075) and approved before step 12 builds chapter components. Can run in parallel with 6b | 8 (approved), ADR 0076 accepted | |
| 9 | Cover tokens and `CollectionCover` | Ten palette tokens plus fallback in `quran-app-design-system.html` and `packages/design-tokens`; `CollectionCover` in `src/shared/ui`; contrast check in light, sepia and dark | 8 (approved) | |
| 10 | Mobile data layer: content | `content.db` migration, pack install for `hadith_collections`, repositories (handle "no chapters"), hooks, FTS5 `search_hadith` build after install, installed-collection state, dev fixtures. **D14:** repositories return, for a book, whether it has chapters; a book is either chaptered or flat under the recommended option C (under option B a repository also returns the unchaptered runs between chapters, computed from `chapter_id` null in `position` order); fixtures for a chaptered book, a flat book and (B only) a partly chaptered book | 4, 6 | |
| 11 | Mobile data layer: personal | `user.db` tables `hadith_bookmarks`, `hadith_reading_position`; `PERSONAL_TABLES`; alias applier (dormant until a pack has aliases) | 10 | |
| 12 | Mobile UI: components | One file and one test each (list below); screens not built yet | 8, 9, 10 | |
| 13 | Mobile UI: screens, routes, entry points | The routes, i18n, Home tile and Menu card gated on an installed pack, sidebar link, Sources and thanks row, bookmark and last-read. A collection with exactly one book that holds hadith (`nawawi`, `qudsi`, `dehlawi`) opens its hadith list directly, with no books screen (developer, 1 Nov 2026). **D14:** a chaptered book opens its chapter list and a flat book its hadith list (already planned); the Sources screen shows the OpenITI credit from `content_sources`; under option B the run rows are built here; the reader breadcrumb stays collection · book | 11, 12, 8b | |
| 14 | Search | In-section Arabic search over `search_hadith` (normalised query, scope chips by collection, highlight by position, history) | 10, 13 | |
| 15 | Hardening | Offline, loading, error and download states; airplane mode; resize keeps position; accessibility; Dynamic Type; RTL and English | 13, 14 | |
| 16 | Exit check | Checks, visual review against frames on iPhone 17 and the expanded window, both languages, light and dark, airplane mode, release-blocker audit. **D14:** the chapter frames are reviewed against **real chapter data** from the committed files, not only fixtures, plus a count check (chapters and hadith_count per book equal the report) | 15, 6b | |
| 17 | Release wiring | Add `hadith:import --download --defer-pack` to `docker/release.sh` (packs build at web start, ADR 0044, the Azkar pattern); update `docs/runbooks/railway-release.md`; confirm PHP memory fits the largest edition (`ara-bukhari` is 9.8 MB of JSON; the Dockerfile memory limit was raised for Azkar); no switch to document (ADR 0045) | 16 | |
| 18 | **Sunnah.com switch** | `SunnahComSource`, slug verification, alias report, re-import, version bump, feed floor, app alias application. **D14:** the re-import replaces `hadith_chapters` and `chapter_id` with Sunnah.com's chapters in the same transaction; the `openiti` source row stays as history; the OpenITI chapter files and their pins are retired; saved items store no chapter key, so nothing is remapped for chapters. **Blocked: needs the key and its written terms** | Key, terms, 17 | blocked |

### Tests for each step

| # | Tests (written with the step, not after) |
| :---: | :--- |
| 1 | Docs only. Review: every claim cites a path or a developer fact; no religious text (not even grade strings or section names); ADR number free. |
| 2 | Pest: `.env.example` has `HADITH_API_KEY` empty with the dev-only comment (test or CI grep); the key is `null` from config in production; `config/hadith.php` pins the full 40-character SHA and no `@1`, lists exactly the ten slugs and has `grades_visible=false`; there is no `approved_collections`; `hadith_titles.php` has the ten collection names with `source: ummahapi.com`, authors marked approved (developer, 1 Nov 2026), and no hadith text; migrations insert the two source rows (`fawazahmed0` `not_required`, `sunnahcom` `pending`); production refuses to change a source status from the command line. |
| 3 | Pest: migrations run and roll back; column types and collations (Arabic columns `utf8mb4_0900_bin`); unique (`source_id`,`source_key`); number is text, and `2787.2`-style values round trip; byte-exact round trip of a string with diacritics and U+200F (placeholder characters); `chapter_id` nullable; factories valid; `arch()` layering. |
| 4 | Pest: pack has the six tables, `hadith_chapters` and `hadith_ref_aliases` empty is valid; grades excluded from the pack while `grades_visible` is false; builder builds nothing while the flag is off; manifest lists all ten collections when on and none when off; `hadith:{lang}` untouched. Normaliser: strips U+200E/F, U+061C, U+202A–202E, U+2066–2069, U+FEFF, zero-width marks, harakat, tatweel; maps like `SearchTextNormalizer`; PHP and TS identical on a shared golden fixture; the **Quran** normaliser and `packages/quran-text-check` are unchanged and pass. Jest: `content-tables` mirrors `PackSchema`. |
| 5 | Pest with `Http::fake` and **placeholder** JSON fixtures shaped like the verified files: URL contains the pinned SHA and never `@1`; a file whose SHA-256 differs from `config/hadith.php` is refused; retry and backoff; oversized or truncated body refused; 404 on a collection reports it; snapshot is stable; no Arabic fetched from `ara-{c}1`; no English edition requested; shared source contract test reusable by `SunnahComSource`. |
| 6 | Pest: section → book by `section_details` ranges; `reference.book` mismatch fails the collection unless a developer-decided exception is listed; decimal numbers; hadith with no text skipped and listed; section 0 with and without hadiths; a hadith with several grades; collection with no grade rows imports with empty `hadith_grades`; `text_ar` byte-identical and `source_text_sha256` matches; counts vs source reported; duplicates reported; all ten slugs import; `Cache::lock` blocks a second run; idempotent re-import (same pinned hashes → no version bump); one transaction per collection rolls back on error; scheduler entry registered and a no-op; `release.sh` has the hadith command only from step 17 (`--defer-pack`); integrity check detects an altered row. **Matcher (`hadith:match-section-titles`):** a section is accepted at exactly 95% forward and 95% backward and rejected at 94.9% on either side; the two-way rule rejects a match that passes forward but fails backward; a section spread over two chapters is rejected; hadith numbers with no text are left out of the forward count; string and decimal numbers align by exact string; only the six shared collections are processed (`malik` and the three single-section collections are skipped); the report lists every accepted and rejected match with both percentages and counts; titles are stored byte for byte as received; only titles and statistics reach the proposal file (no hadith text, no grades); it **refuses to run when `APP_ENV=production`** even with a key; it never writes `config/`; it is not scheduled and not in `release.sh`; **`FIXTURE-KEY` never appears in the report, proposal, exception messages or logs** (the key is a query parameter); `Http::fake` with placeholder fixtures. |
| 6b | **6b.0:** parser unit tests on placeholder mARkdown (never real headings): a باب heading starts a chapter; a كتاب or أبواب heading ends it (so a chapter cannot absorb the next book's first hadith); a numbered heading is a hadith; other headings are continuations; marker patterns from the closed list. **Cleaning function:** each listed removal tested alone and together; every other byte (diacritics, U+200E/F, internal spaces, punctuation) unchanged; a character class outside the list is left in and counted. **6b.1 matcher:** a chapter with all numbers in one book is accepted, one number in another book is rejected even when text matches 100%; ceil rule at n = 1, 19, 20 (19 of 20 passes, 18 of 20 fails, 19 of 19 required at n = 19); forward and backward each reject alone; decimal and string numbers align by exact string; numbers with no text are excluded from forward and counted; headings with no numbered hadith are not chapters; per-book coverage and option B/C output (`--partial-books=drop|keep`); `drop` writes only complete books; the report lists every decision with both percentages and counts; the proposal contains only whitelisted keys (no text field, asserted by a key whitelist test); refuses `APP_ENV=production`; never writes `config/` or `database/data/`; not scheduled, not in `release.sh`; source files with a SHA-256 other than the pin are refused; Quran-run detector counts hits against a placeholder corpus (`FIXTURE verse text`), never prints a title. **6b.2 import:** `openiti` row inserted by a new migration and removed on rollback, `granted`, licence URL and notes set; chapter file with a wrong SHA-256 refused; chapter rows have `source_id` = `openiti`, `source_key` `openiti:{slug}:{book}:{ordinal}` (≤ 96) and `source_chapter_key` ≤ 32; `chapter_id` set for every hadith in an accepted chapter and null elsewhere; `hadith_count` equals the number of entries; a chapter whose range lies in two books fails the import; two chapters whose ranges overlap or interleave in position order fail the import; titles round trip byte for byte; hadith rows keep fawazahmed0's `source_id`, `source_key`, `text_ar` and `source_text_sha256`; re-import with the same pins is idempotent (no version bump); a changed chapter file bumps the pack version; a collection with no file imports with no chapter rows; pack contains `hadith_chapters` rows only for chaptered collections; Sources credit text equals the `content_sources` attribution; the licence notice file exists beside the data. |
| 6c | The same suite per added collection, with that collection's parser fixtures. |
| 8b | Review only: changed frames compared to tokens and to the originals; placeholders only; Arabic title shown in the English frame; credit row present in both Sources frames; approval recorded in the step brief. |
| 7 | Pest feature test per endpoint (200, 404, cursor pagination, ETag and 304, `Accept-Language` does not change content); `chapters` returns an empty list for a book with none; no `grades` key while `grades_visible` is false; flag off returns an empty list and 404s; route order vs `/hadith/{id}`; OpenAPI regenerated and drift-free (`--fail-on-unknown`); `arch()`. **D14 additions:** `chapters` returns rows in `position` order for a collection with a chapter file and an empty list otherwise; `?chapter=` returns exactly that chapter's hadith in `position` order and an unknown chapter returns 404; a book that is flat under option C returns an empty chapter list and all its hadith; chapter resource has no `source_url` and no hadith text. |
| 8 | Review only: frames compared to tokens; placeholders only; every state present; approval recorded in the step brief. |
| 9 | Jest: `CollectionCover` for each of the ten slugs and the fallback, light/sepia/dark, RTL and English, accessibility label, no raw hex; `npm run check:html -w @quran/design-tokens`; contrast ≥ 4.5 : 1 for the title on every ground in all three themes. |
| 10 | Jest: pack install in one transaction and rollback on failure; repositories (books, hadiths of a book with and without chapters, one hadith by slug + number, previous/next across a book boundary); FTS build and query via the normaliser; Arabic bytes round trip; empty grades table means no grade in the view model; a null Arabic title is omitted, not replaced; `content.db` rebuilds from packs; no personal data in `content.db`. **D14 additions:** a chaptered book lists chapters in order and each chapter lists its hadith in `position` order; a flat book lists hadith; the sum of chapter hadith counts equals the book's count under option C; previous/next in the reader crosses a chapter boundary in `position` order; (B only) unchaptered runs are computed in order and labelled by their first and last number with no stored row. |
| 11 | Jest: bookmark add/remove/list by `{slug}:{number}`; last-read per collection; `PERSONAL_TABLES` updated and **`clear.test.ts` updated**; «مسح البيانات» clears both tables; alias applier: `exact_text` rewrites, other matches mark `unverified`, no alias leaves the item, applying twice is idempotent; no database id stored. |
| 12 | One `*.test.tsx` per component: render and variants, interaction, RTL (ar and en), role and label, theme tokens, no raw hex. |
| 13 | Jest screen and route tests: `routes.test.ts` with `satisfies keyof paths`; Home tile and Menu card only with an installed pack (update `HomeScreen.test.tsx`, which asserts no الحديث tile today); every string in `ar.json` and `en.json`; a book without chapters lists hadith directly, a book with chapters lists chapters (fixtures); no grade UI; source line present; no link when `source_url` is null; bookmark and last-read persist offline. **D14 additions:** the Sources screen shows the OpenITI credit in Arabic and English, taken from `content_sources`; chapter rows show the Arabic title in the English UI with English labels; a chaptered book opens the chapter list; saved items store no chapter key. |
| 14 | Jest: normalised query matches diacritic and alef variants; scope chips; highlight positions on original text; empty and no-results; history capped at 20 and cleared by «مسح البيانات»; Quran search unaffected. |
| 15 | Jest: offline, loading, error and retry states; resize keeps position; Dynamic Type at the largest sizes; screen-reader order. Manual: airplane mode on the simulator and the Android emulator. |
| 16 | `composer qa`; `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; contract generated and committed; screenshots vs `frame-shot.py` at 390 × 844; expanded window; grep that no key variable and no `@1` URL remain; release-blocker audit. **D14 additions:** chapter frames compared with the running app on real data; the committed chapter files match their pinned SHA-256s; `LICENSE-NOTICE.md` is present; the Quran-run detector report is attached to the audit. |
| 17 | Pest: `release.sh` runs the hadith import after Azkar and fails on a validation error; flag off exits 0 and prints why; manifest has ten resources when on and none when off; import peak memory under the container limit (measured); no tile when no pack installed. |
| 18 | Pest: `SunnahComSource` passes the shared contract test; alias report on placeholder corpora for each match method; wet run keeps the `resource_id`; manifest shape unchanged; older device gets `410`; schema and OpenAPI diff empty; Jest: alias application on a fixture pack; `unverified` state; chapters appear for a source that has them. **D14 additions:** the wet run replaces `hadith_chapters` and `chapter_id` in one transaction; no chapter row has `source_id` = `openiti` afterwards; the app shows no stale chapter; a saved item still opens. |

## Step 1 outputs (this change)

- `docs/adr/0042-hadith-collections-source.md` (Accepted 1 Nov 2026: fawazahmed0 now, Sunnah.com later).
- `docs/plans/phase-7.md` (this file), `docs/plans/phase-7/README.md`.
- `docs/plans/phase-7/spec-changes.md` (the patch; **applied 1 Nov 2026**).

## Frames needed (step 8)

New section «الحديث — Hadith collections (proposed)» in `screens/` (section `hadith`, ADR 0075), ids with the `HadithColl` prefix. The existing `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` stay, captioned "deferred: HadeethEnc, ADR 0042". Existing language only (tokens, Amiri for hadith text, IBM Plex Sans Arabic for UI, cards, 44 pt buttons), copying the Azkar frames' markup. Bracketed placeholders for all hadith text; cover titles and book names are «[اسم المجموعة]» / «[اسم الكتاب]» until the developer supplies them.

| Frame id | Content |
| --- | --- |
| `HadithCollList` | Collections list with covers: installed, one not installed (size, download button), one downloading. Search button. Source credit footer. Light, Arabic. Plus `HadithCollListDark`, `HadithCollListEnglish`. |
| `HadithCollUntitled` | The **fallback when Arabic titles are missing**: collections list and books list with «مجموعة ١» / «كتاب ٣» labels and ornament-only covers; Arabic, dark and English (English may show the source name). |
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

## Frames needed for chapters (step 8b; D14, ADR 0076; draw, do not code before approval)

Option C (book-level all-or-nothing) assumed; if the 6b.1 report leads to option B, the `HadithCollChaptersPartial` frames below are added. Files are in `screens/frames/hadith/` (ADR 0075); this plan edits none of them.

| Frame | Change |
| --- | --- |
| `HadithCollChapters`, `HadithCollChaptersDark`, `HadithCollChaptersEnglish` | Replace the caption «shown when the source has chapters (Sunnah.com)» with «shown for chaptered books (OpenITI titles; Sunnah.com later)». The English frame currently shows «[Chapter name]»; OpenITI has no English title, so it must show an Arabic title placeholder («[اسم الباب]», right-to-left) with English labels and counts. Rows themselves (card, 60 pt, count) stay |
| `HadithCollChapterHadith`, `HadithCollChapterHadithDark`, `HadithCollChapterHadithEnglish` | Caption change as above; the title placeholder in the English frame as above |
| `HadithCollSources` and `Sources` (`screens/frames/salah/Sources.html`) | Add the OpenITI row (Arabic and English wording from ADR 0076 §8.3). Both frames list sources; only `HadithCollSources` shows the fawazahmed0 row today, so the developer says which is the app's Sources screen or both change |
| `HadithCollExpanded` | The start pane draws collections and books only. Add a chapters-level state, either in this frame or as the new frame below |
| **New:** `HadithCollExpandedChapters` | Expanded window: chapter list of a chaptered book in the start pane, reader on the other side. ADR 0010 requires uncovered layouts to be drawn first |
| **New only if option B is chosen:** `HadithCollChaptersPartial` (+ `Dark`, `English`) | A chaptered book with in-place unchaptered runs between chapter rows, each labelled by its number range |
| `HadithCollBooks`, `HadithCollBooksDark`, `HadithCollBooksEnglish` | No change recommended: the book row stays title + hadith count. A chapter count in the row would be a design addition for the developer to ask for |
| `HadithCollBook` (flat book), `HadithCollUntitled*`, `HadithCollReader*`, `HadithCollSingle*`, `HadithCollSearch*`, `HadithCollSaved*` | No change. The reader breadcrumb stays collection · book (saved items store no chapter). A chapter in the breadcrumb is a possible developer addition |

## Components (step 12; each its own file with a colocated test)

`src/shared/ui`: `CollectionCover` (reuse `Card`, `Divider`, `ScreenHeader`, `SheetHeader`, `UiText`).
`src/features/hadith/components`: `CollectionRow`, `CollectionHeader`, `CollectionDownloadButton`, `BookRow`, `ChapterRow`, `HadithCard`, `HadithText`, `HadithMeta`, `HadithSourceLine`, `HadithBreadcrumb`, `HadithPager`, `HadithBookmarkButton`, `SavedHadithRow`, `UnverifiedNotice`, `HadithSearchField`, `HadithSearchResultRow`, `HadithStateView`.

## CLAUDE.md wording (applied 1 Nov 2026)

Replace the «Current phase» bullet's first sentence with:

> **Current phases: Phase 6, الأذكار (Azkar)** on branch `ft/azkar` (spec §15, ADR 0031), **and, in parallel, Phase 7, الحديث (Hadith: full collections)** on branch `ft/hadith` (ADR 0042, plan `docs/plans/phase-7.md`). The source is fawazahmed0/hadith-api, pinned to a commit; all ten collections ship with no content reviewer, with no switch (ADR 0045). Grades are hidden. Sunnah.com's key is pending. HadeethEnc (daily hadith, topics) is deferred.

Keep the rest (Azkar blockers, open earlier-phase work) and add «Check the branch with `git branch --show-current`; each phase's files stay on its own branch.»

## Release blockers

There is no reviewer gate: all ten collections ship with the Hadith release (no switch, ADR 0045).

| # | Blocker | Cleared by |
| :---: | :--- | :--- |
| RB24 | **Completeness**: every shipped collection has every hadith with text and book (developer rule, 7 Nov 2026) | Gap report accepted, gaps filled from OpenITI (ADR 0076); any collection still incomplete is held back |
| RB2 | Sunnah.com key and written terms (switch) | Key, then step 18. **Not a blocker for production with fawazahmed0.** |
| RB3 | Grades | Nothing to clear: hidden through Phase 7 (`grades_visible=false`). Showing them is a later developer decision. |
| RB4 | English text | Not stored. Adding it needs its own rights decision. Nothing to clear now. |
| RB5 | Arabic titles | **Not a blocker.** Collection names are in hand (ummahapi.com); authors were approved by the developer on 1 Nov 2026; section titles come from the matcher proposal. Anything missing falls back to «مجموعة {n}» / «كتاب {n}» and an ornament-only cover; a pack version bump delivers later names. |
| RB15 | The dev-only `HADITH_API_KEY` must not leak (it is a query parameter) | Redaction tests for `hadith:match-section-titles` (step 6); never read in production; secret scan at step 16 |
| RB16 | Title match used hadithapi.com, which has no terms | Developer-approved one-off, titles only (ADR 0042 §4a); replaced by Sunnah.com titles at step 18 |
| RB6 | Developer acceptance of ADR 0042, which replaces the content plan's reviewer sign-off for these collections | Developer |
| RB7 | Frames approved (ADR 0010), including the untitled fallback frames | Step 8 |
| RB8 | Numbering differences between sources (switch) | Alias report read before the wet switch |
| RB9 | Pinned source integrity: files match the recorded SHA-256 at the pinned commit; a SHA bump is a change the developer approves | Step 5 tests and the developer's review of any bump |
| RB10 | Text integrity: stored Arabic equals source bytes (nobody checks it against a printed edition) | Integrity check passes (step 6) |
| RB11 | Cover contrast, including the ornament-only fallback cover | Step 9 test; frames approved |
| RB12 | Gaps: hadith numbers with no text are skipped and listed | Developer reads the import report and accepts the gap list |
| RB13 | Upstream rights: fawazahmed0's `References.md` shows part of the data comes from sunnah.com and Shamela; the Unlicense comes from the repository author and does not necessarily clear those rights (the classical texts are centuries old) | Accepted by the developer for now; Sunnah.com's written terms (step 18) close it. Also the developer's call whether the store build ships the section live or dormant. |
| RB14 | Production deploy fits: the import runs in the release step within the container's PHP memory limit and the Railway volume | Step 17 measurement |
| RB17 | OpenITI licence accepted: CC BY-NC-SA 4.0 (credit, ShareAlike on the chapter data, non-commercial use) | Developer accepts ADR 0076 §8; Sources row and notice file present (step 6b.2) |
| RB18 | **Quran text inside chapter titles** (ayat quoted in headings; non-negotiable 1) | Developer policy decision; the 6b.1 detector report counts hits per collection. **Blocks Bukhari**; no default |
| RB19 | Chapter alignment measured on the **pinned Zenodo files**, not the 2025 GitHub commits the research used; per-chapter acceptance report read | Step 6b.0 and 6b.1 reports read by the developer |
| RB20 | Title cleaning list approved; titles otherwise byte-exact | Developer approves ADR 0076 §3; step 6b tests |
| RB21 | Shamela upstream rights for OpenITI's Shamela-derived versions (same class as RB13) | Accepted by the developer alongside RB13, or not; Sunnah.com's terms (step 18) close it |
| RB22 | Partly chaptered book behaviour and the chapter frames | Developer chooses A/B/C and approves step 8b |
| RB23 | Credit and notice: `openiti` `content_sources` row, Sources credit in both Sources frames and the screen, licence notice beside the chapter files | Steps 6b.2, 8b, 13 |

**RB17 to RB23 block shipping chapter files only (D14).** Without chapter files every collection ships flat, as planned, and these do not hold the Phase 7 release.

## Open questions: all decided

The developer accepted every recommended default on 1 Nov 2026 (reply "ok" to "accept defaults"). Each default in brackets is now the decision. Follow-up actions that remain are noted in the steps (the slug check before step 3, the matcher proposal and author names, the source-line wording).

1. **ADR number.** 0041 is taken; accept 0042? [Yes.] **Decided: accepted, developer, 1 Nov 2026.**
2. **Slugs.** Check the ten slugs against Sunnah.com's public pages before step 3 freezes them (the three forty-hadith collections first). [Keep fawazahmed0's names unless a page shows a different name.] **Decided: accepted, developer, 1 Nov 2026.**
3. **Arabic names.** Collection names (ummahapi.com) are in hand. Approve the drafted author names. Review the section-title proposal the matcher writes (95% two-way rule). [Approve the authors; ship with numbered fallbacks for any section the matcher rejects.] **Decided: accepted, developer, 1 Nov 2026.**
4. **Source-line wording** and the provenance note in `content_sources.notes`. [Wording: «المصدر: fawazahmed0/hadith-api» with the licence name; you decide.] **Decided: accepted, developer, 1 Nov 2026.**
5. **Grades.** May named-grader grades show before Sunnah.com? [No; hidden through Phase 7.] **Decided: accepted, developer, 1 Nov 2026.**
6. **Gaps.** Hadith numbers with no text are skipped and listed. [Accept the list in the import report.] **Decided: accepted, developer, 1 Nov 2026.**
7. **Section 0** (empty name). [A book only if it holds hadith; shown by number.] **Decided: accepted, developer, 1 Nov 2026.**
8. **English.** Not stored. [Confirm; revisit with Sunnah.com.] **Decided: accepted, developer, 1 Nov 2026.**
9. **Cover palette.** Ten colours plus a fallback (and sepia values) as new tokens. [Approve in step 8.] **Decided: accepted, developer, 1 Nov 2026.**
10. **Placement.** Home tile and Menu card gated on an installed pack; no Home hadith card (amends ADR 0032). [Yes.] **Decided: accepted, developer, 1 Nov 2026.**
11. **Reading source.** Packs only; no online browsing of un-downloaded collections. [Yes.] **Decided: accepted, developer, 1 Nov 2026.**
12. **Share and copy.** [Allowed, with the source line; hide it if you prefer until Sunnah.com's terms.] **Decided: accepted, developer, 1 Nov 2026.**
13. **Search, saved items, pack group.** In-section search only now; a saved list plus one last-read place per collection (separate from ADR 0028); new group `hadith_collections`. [Yes to all.] **Decided: accepted, developer, 1 Nov 2026.**
14. **Switch remap policy.** `exact_text` moves silently; others become *unverified* at book level. [Yes; risk probably lower than with other sources but unmeasured.] **Decided: accepted, developer, 1 Nov 2026.**
15. **Release.** All ten collections ship at release, with no switch (ADR 0045); packs on devices remain. [Yes.] **Decided: accepted, developer, 1 Nov 2026.**
16. **Phase numbering and launch.** Beta becomes Phase 8. [Yes; the store launch ships Hadith if it is ready, otherwise dormant.] **Decided: accepted, developer, 1 Nov 2026.**
17. **Sepia covers.** [Draw all three themes in the cover specimen only.] **Decided: accepted, developer, 1 Nov 2026.**

## Spec and ADR conflicts found

1. ADR 0041 already exists; this ADR is 0042.
2. Spec §15 names Phase 7 «Beta and store review» (Phase 6 D10 already says Beta becomes Phase 7). Beta becomes Phase 8; the cut-line row is split.
3. **Content plan, fawazahmed0 and reviewer:** the Hadith table says "Not used unless the reviewer approves specific content", the API catalog says "Not used" with "Grade sources are not documented", and the section says "the content reviewer signs off on the Hadith section". ADR 0042 amends all three for Phase 7: there is no reviewer, the developer decides, and Azkar's reviewer rules (ADR 0031) are untouched. The content plan's «Display» line ("every hadith shows its grade … and a link back") conflicts with D4 and the null source URL; resolved by ADR 0042 §11.
4. Spec §5, §6, §7 reserve `hadith:{lang}` and name the HadeethEnc tables. The new tables and group are different; the old text is marked deferred.
5. ADR 0017 and ADR 0032 §3 have no الحديث rule for collections. ADR 0032 needs an amendment and updated `Menu*` frames.
6. `apps/mobile/CLAUDE.md` «Where state lives» says hadith browsing uses TanStack Query; collection reading moves to `content.db`.
7. The existing `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` frames and the Home tile link draw the deferred HadeethEnc design.
8. Spec §5 calls the table `content_sources`; the brief said `sources`. This plan uses `content_sources`.
9. Spec §5 says `resources.group` is an enum; the migration is `string(64)`. No database change for the new group.
10. `.env.example` has `HADITH_API_KEY="hADITH_API_KEY"` (a placeholder). Step 2 empties it and marks it dev-only for the title matcher; the real key stays only in the developer's local `.env`.
11. CLAUDE.md names `app/Support/ArabicNormalizer.php`; it does not exist. The real class is `app/Support/QuranText/SearchTextNormalizer.php` and it does not strip U+200F or other bidirectional marks; Hadith needs its own normaliser.
12. Upstream rights: fawazahmed0's `References.md` lists sources including sunnah.com and Shamela (al-maktaba.org). The Unlicense comes from the repository author and does not necessarily clear those rights; the edition metadata still says author "Unknown". The classical texts are centuries old. The developer accepts this for now; Sunnah.com's written terms close it. This is a risk, not a closed question.
13. Spec §3 and §13 (`SyncHadithJob`, `SendDailyHadithJob`, `/bootstrap` daily hadith id, `devices.push_daily_hadith`) belong to the deferred HadeethEnc phase.
14. Phase 6 runs in parallel and edits the same files (see "Merge risk").
15. **release.sh:** the first draft said the hadith import is never in `docker/release.sh`; with all ten collections shipping, step 17 adds it (the Azkar pattern), and the PHP memory limit and Railway volume must be checked.
16. The agent rules forbid switching branches, so the files are on `main`; the developer creates `ft/hadith` and moves them.
17. **D14 / ADR 0076 vs D8, D9, ADR 0042 §2 and §4a, README rules:** all say `hadith_chapters` is empty for fawazahmed0 and that titles come only from ummahapi.com, the developer and hadithapi.com. ADR 0076 adds OpenITI and fills chapters for some collections. Also affected: spec §5 line «Empty for fawazahmed0», spec §6 pack row, spec §9 `chapters` row, plan «API and routes» and the caption «shown when the source has chapters (Sunnah.com)» on six frames. Not resolved; ADR 0076 is Proposed.
18. **«Stored as received» vs OpenITI markup:** ADR 0042 §4a says titles are stored as received; OpenITI headings carry markers. ADR 0076 §3 proposes a closed removal list.
19. **Non-negotiable 1 and the agent rules vs ayat in titles:** unresolved (RB18).
20. **Research figures vs the pin:** the research measured GitHub commits `44e1c36` and `089e665`; the licence and the pin are the Zenodo release (RB19).
21. **ADR numbering:** this plan and ADR 0042 cite «ADR 0045» for «no kill switch», but `docs/adr/0045-english-surah-names.md` is a different ADR; the text is in `docs/adr/0042-features-enabled-by-default.md`. Pre-existing; not fixed here.
22. **Approved frames:** step 8 was approved on 7 Nov 2026 (`phase-7/README.md`). The changes in «Frames needed for chapters» reopen part of that approval (step 8b).
