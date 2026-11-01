# 0042 — Hadith: full collections from fawazahmed0/hadith-api, Sunnah.com later

Date: 2026-11-01 · Status: **Accepted (developer, 1 Nov 2026)** (all recommended defaults in the plan's open questions accepted) · Amends spec §4, §5, §6, §7, §9, §15, the content plan (Hadith section, hadith sources tables; the fawazahmed0 row), ADR 0017 (Home tiles) and ADR 0032 (Menu cards). Defers part of spec §3, §5, §9, §13 (HadeethEnc, daily hadith). Plan: `docs/plans/phase-7.md`.

Numbering note: the first request asked for 0041, but `0041-local-uses-qf-production.md` is already accepted, so this ADR is 0042.

History: the first draft of this ADR (1 Nov 2026) chose hadithapi.com behind a lock. The developer replaced it the same day with fawazahmed0/hadith-api, read directly, and then decided that **there is no content reviewer and all ten collections ship**. This text is the current decision.

## Context

The spec and the content plan planned the Hadith section around HadeethEnc (curated hadiths, categories, explanations, a daily hadith and push: spec §5 `hadith_categories`, `hadiths`, `hadith_translations`, `daily_hadiths`; §9 `/hadith/*`; §13 `SendDailyHadithJob`). Sunnah.com's full collections were "later: v2" and fawazahmed0 was "Not used unless the reviewer approves specific content" with "grade sources are not documented" (content plan, Hadith table and section). The content plan also says "the content reviewer signs off on the Hadith section".

On 1 Nov 2026 the developer decided:
- Build full collections first. HadeethEnc is deferred.
- Source now: **fawazahmed0/hadith-api**, read directly from its static JSON. Sunnah.com remains the long-term target; the developer is requesting its API key.
- **Hadith data is not taken from** hadithapi.com (publishes no terms, licence or offline-storage permission) or ummahapi.com (it only proxies fawazahmed0 and drops books and graders). **Titles are**: ummahapi.com supplies the ten Arabic collection names and hadithapi.com supplies Arabic section titles through a one-off matching command (section 4a).

Facts about fawazahmed0/hadith-api (verified by the developer on 1 Nov 2026; this ADR does not re-fetch them):
- Licence **Unlicense**. Latest commit `df57907be35291c91ad6a6691180e22ca9920784` (2026-06-03). Static JSON on jsDelivr (`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@<ref>/...`). No key and no rate limit.
- Files: `editions.json`; `info.json` (per collection: `metadata` with section names and `last_hadithnumber`, plus `hadiths[{hadithnumber, arabicnumber, grades[{name, grade}], reference{book, hadith}}]`); `editions/{edition}.json` (full collection with `metadata.section_details` ranges and `hadiths[{hadithnumber, arabicnumber, text, grades, reference}]`; `ara-bukhari` is 9.8 MB raw); per-section files; `.min.json` variants.
- Arabic editions per collection: `ara-{c}` (with diacritics) and `ara-{c}1` ("diacritics removed for easier searching"). Edition `author` is "Unknown" and `source` is empty in the metadata, but `References.md` lists the sites the data came from (see Consequences).
- 10 collections (hadiths listed / sections / hadiths with grades): abudawud 5274/44/5274; bukhari 7589/98/0; ibnmajah 4343/38/4341; malik 1858/62/1858; muslim 7563/57/0; nasai 5765/52/5758; tirmidhi 3998/50/3954; nawawi 42/2/0; qudsi 40/2/0; dehlawi 40/2/0. Graders are named (for example Al-Albani, Zubair Ali Zai, Shuaib Al Arnaut) and grade values are English strings. Bukhari and Muslim have no grade rows.
- Sections (kitabs) have English names only. Section 0 exists with an empty name in some collections. Some hadith numbers have no text. Numbers can be decimal (for example `2787.2`).
- **No باب (chapter) level and no per-hadith source URL.**

Sunnah.com (`spec.v1.yml`): collections, books, chapters (float `chapterId`), hadiths with `grades[{graded_by, grade}]`, a public page per hadith, an offline dump on key requests. Unchanged from the first draft.

## Decision

### 1. Scope
1. Phase 7 builds **full collections only**. HadeethEnc (daily hadith, topics, explanations, the §5 hadith tables, the daily push, `/hadith/daily`, the `/bootstrap` daily hadith id, `devices.push_daily_hadith`) is **deferred**. Its spec text stays, marked *deferred (ADR 0042)*. Its frames `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` stay, captioned deferred, not redrawn.
2. Phase 7 runs **in parallel with Phase 6**, on branch `ft/hadith`. Both touch shared files (plan, "Merge risk").

### 2. One schema for both sources
New MySQL tables, separate from the deferred HadeethEnc tables, modelled on Sunnah.com: `hadith_collections`, `hadith_books`, `hadith_chapters`, `hadith_entries`, `hadith_grades`, `hadith_ref_aliases`. Every table carries `resource_id` first (the Azkar pattern, ADR 0031 §9); every row carries `source_id` → `content_sources`.

**Schema, endpoints, pack tables and screens do not change when Sunnah.com replaces fawazahmed0.** From day one:
- `hadith_number` is **text** (decimal numbers exist; Sunnah.com numbers can carry suffixes). `arabic_number` is a nullable text column.
- Arabic columns are `utf8mb4_0900_bin` and hold the source bytes. Only `text_search` is normalised, with a hadith normaliser that strips bidirectional and zero-width marks.
- `hadith_chapters` exists and is **empty for fawazahmed0**, which has no باب level. The app handles "no chapters": a book lists its hadiths directly. Screens for chapters are built and tested with fixtures, and appear when a source provides chapters.
- `source_url` is nullable and stays null for fawazahmed0.
- `hadith_grades` ships in the pack with every grade stored, subject to the visibility rule in section 5.
- `text_en` and `narrator_en` columns exist, nullable, and stay empty for this source (section 6).
- `hadith_ref_aliases` exists and ships empty until a switch.

Mapping for fawazahmed0: collection → `hadith_collections`; **section → book** (`book_number` = section number as text; its English name is `title_en`); each hadith → `hadith_entries` with `hadith_number` = `hadithnumber`, `arabic_number` = `arabicnumber`, `text_ar` = the `ara-{c}` edition `text` untouched; each `grades[]` item → a `hadith_grades` row (`grade` = grade, `graded_by` = name). A hadith is assigned to a book from `section_details` ranges (`hadithnumber_first/last`), cross-checked against `reference.book`; a disagreement fails the import for that collection unless an exception the developer decided is listed in `config/hadith.php`. A hadith number with no text is **not imported** and is listed in the import report.

### 3. Source, code layout and the lock
- **Code:** the HTTP client lives in `app/Integrations/HadithApiFawaz`; the `HadithCollectionSource` interface, the adapters (`FawazHadithSource`, later `SunnahComSource`) and the importer live in `app/Domains/Hadith` (`Integrations` never import from `Domains`; the Dorar/Azkar split).
- **Pinned and reproducible:** the importer fetches from the **commit SHA** (`@df57907be35291c91ad6a6691180e22ca9920784`), never `@1`. `config/hadith.php` records the commit and the SHA-256 of every file used; a file with another hash is refused. Bumping the SHA is a change the developer approves (its own diff, with the changed-text report).
- **Arabic only:** only `editions.json`, `info.json` and the `ara-{c}` editions are fetched. `ara-{c}1` is not stored as display text and is not an input to `text_search` (our own normaliser produces it, so Quran and Hadith search share one tested rule); an optional dry-run diagnostic may compare the two.
- **The lock is one kill switch, not an approval list.** There is no content reviewer, and **all ten collections are imported, packed and served**: `bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi`, `qudsi`, `dehlawi`. There is no `approved_collections` list.
  1. `HADITH_COLLECTIONS_IMPORT_ENABLED` is the **kill switch**. `.env.example` has it `false`. **At release, production sets it to `true`** (a Railway variable, the developer's act, step 17). While `false`, the importer does nothing, the pack builder builds nothing, the manifest and `/hadith/collections` list nothing, and the app (no pack installed) shows no tile or card. Setting it back to `false` stops serving and importing; it does not remove packs already on devices, which keep reading offline.
  2. The developer makes the decisions the reviewer would have made: the Arabic names (section 4), the wording of the source line, an internal note on the editions' provenance, the list of skipped hadith numbers, any range exception, and every SHA bump. Each is recorded in `config/hadith.php`, `config/hadith_titles.php` or `content_sources.notes`, not in a code path.
  3. The `content_sources` row `fawazahmed0` records the Unlicense (`licence_url` = the repository's licence file, `permission_status = not_required`). The Unlicense covers the repository author's work; it does not by itself establish the rights of third parties (editors, graders), which is why grades stay hidden and the edition's provenance is recorded as a note the developer accepts.
- **What the kill switch does:** the same flag gates the importer, the pack builder, the manifest and the `/hadith/collections` endpoints in every environment. The scheduler entry is a no-op while the flag is off or the pinned hashes are unchanged. The import joins `docker/release.sh` (`hadith:import --download --if-unlocked --build-packs`, the Azkar pattern) in step 17 (release wiring), not before.
- **No provider key for hadith data.** `HADITH_API_KEY` stays in `.env.example` as an **optional, dev-only** entry, empty, with the comment "dev-only, used by hadith:match-section-titles". It is never read in production and is redacted from logs (section 4a).

### 4. Arabic names come from a map the developer approves
fawazahmed0 has **no Arabic names**: collection names are English (for example "Sahih al Bukhari"), 0 of Bukhari's 98 section names contain Arabic, and there are no Arabic author names. The names come from three places, all recorded as data in `config/hadith_titles.php`, each entry with its `source`. The developer approves the file. A missing title stays `null`, the app never shows an invented or machine-translated Arabic title (ADR 0031 §1.4), and the English source name is never shown in the Arabic interface. **A missing title does not block shipping a collection**; the fallback is:
- **Collection:** the cover shows its ornament and no title; the list row and header show «مجموعة {n}» / "Collection {n}", where n is the collection's fixed position in `config/hadith.php`. The name appears as an i18n label, not as source text.
- **Book:** the row shows «كتاب {n}» / "Book {n}" with n = `book_number`.
- **English interface:** may show the source's English `title_en` when there is no Arabic title.
- A collection whose Arabic title arrives later gets its cover title with a pack version bump; no app release.

### 4a. Where the titles come from
Hadith data comes from fawazahmed0 and nowhere else. The titles:
1. **Arabic collection names: ummahapi.com** (`GET /api/hadith/collections`, field `arabic_name`; the developer verified it on 1 Nov 2026). Only the ten names are used, entered as data with `source: ummahapi.com`. No hadith data is taken from ummahapi.com, which has no book or section endpoint and no Arabic section names.

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

2. **Arabic author names: the developer.** Drafted by the orchestrator (the table above), **approved by the developer on 1 Nov 2026**, entered with `source: developer`. `qudsi` has none (several compilers) and stays null.
3. **Arabic كتاب (section) names: a one-off match against hadithapi.com.** hadithapi.com's `/api/{bookSlug}/chapters` has `chapterArabic` (these are Sunnah.com "books"), and `/api/hadiths` gives `chapterId` per `hadithNumber`. Counts differ, so a match is accepted only under a strict two-way rule, by the command below.
- **Never in production:** it refuses to run when `APP_ENV=production`, is not scheduled and is not in `docker/release.sh`. It needs `HADITH_API_KEY`, an **optional, dev-only** key: empty in `.env.example` with the comment "dev-only, used by hadith:match-section-titles", never read in production, and redacted from logs, exceptions, reports and proposal files (the key is a query parameter).
- **Scope:** only the six collections hadithapi.com shares (hadithapi slugs `sahih-bukhari`, `sahih-muslim`, `al-tirmidhi`, `abu-dawood`, `ibn-e-majah`, `sunan-nasai`, for `bukhari`, `muslim`, `tirmidhi`, `abudawud`, `ibnmajah`, `nasai`). `malik` has no counterpart and stays numbered. `nawawi`, `qudsi` and `dehlawi` have one section and open straight to the hadith list, so they need no section title.
- **What it reads from hadithapi.com:** `/api/{bookSlug}/chapters` (`id`, `chapterArabic`) and, from `/api/hadiths`, only `hadithNumber` and `chapterId`. **Only titles are taken. Never hadith text, grades or anything else**: nothing else is written to disk.
- **Match rule:** for each fawazahmed0 section, take its hadith numbers that have text (from the `section_details` ranges). Accept a hadithapi chapter's `chapterArabic` only when **at least 95% of those numbers map to that single chapter AND at least 95% of that chapter's hadith map back to the section**. Otherwise the title is null and the UI shows «كتاب {n}».
- **Output:** a **proposal file** (`storage/app/hadith/proposals/section-titles.json`) and a report listing every accepted and rejected match with both percentages and the counts (Bukhari: fawazahmed0 has 97 named sections against hadithapi.com's 99 chapters). Each accepted title is recorded as received (no edits) with `source: hadithapi.com`. **The command never writes `config/`**: the developer reads the proposal, approves and commits it into `config/hadith_titles.php`.
- **Why this is acceptable (ADR 0042 §4):** titles are short factual names of classical book divisions; it is a one-off import the developer approves; hadithapi.com publishes no terms, so the risk is noted and accepted. Sunnah.com's titles replace these at step 18.

### 5. Grades are hidden (D4 stands)
- Every grade row is stored with its named grader, but **no grade is shown through Phase 7** (D4 stands). **Simplest option chosen:** there is no `review_status` column and no `reviewed_graders` list. A single constant, `hadith.grades_visible` in `config/hadith.php`, is `false`; the API Resources and the pack builder serialise a grade only when it is `true` and `graded_by` is not null. The pack's `hadith_grades` table therefore ships empty.
- The app has no grade section. Turning grades on is a later, deliberate change of that constant for the Sunnah.com phase, decided by the developer; if per-grader sign-off is wanted then, a review column can be added additively.
- Bukhari and Muslim have no grade rows; no collection-level "Sahih" is ever invented.
- Open for the developer: whether named-grader grades may show before Sunnah.com. Until answered, they do not.

### 6. English
Translation rights are unclear, and the Unlicense cannot cover third-party translations, so **no English edition is fetched or stored** (`text_en` stays empty). The English interface shows the Arabic hadith with English UI labels. Adding English text later needs its own rights decision.

### 7. Stable user references
- Anything the user saves on a hadith points to **collection slug + hadith number** (`bukhari:1`), never to a database id, a book id or a chapter ordinal.
- Canonical slugs are the ones fawazahmed0 already uses (`bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi`, `qudsi`, `dehlawi`), which the developer states are Sunnah.com-style. They must be checked against Sunnah.com's public pages before the schema step freezes them (a saved reference is keyed by slug, so changing one later is costly). `config/hadith.php` `slug_map` maps a source's slug to the canonical one.
- fawazahmed0 carries both `hadithnumber` and `arabicnumber`, and its numbering is expected to be close to Sunnah.com's, which should lower remap risk at the switch. That is not verified here; the alias report at the switch measures it.

### 8. The switch to Sunnah.com is a re-import, not a merge
When the key and its written terms exist:
1. A migration adds the `sunnahcom` source row as `granted` (the ADR 0038 pattern, after the developer reads the terms). `SunnahComSource` joins the registry and `hadith.primary_source` changes.
2. A dry run produces the alias report: old number → new number by matching normalised Arabic text, with the method (`exact_text`, `similar_text`, `number_only`, `none`) and counts per collection. The developer reads it first.
3. The wet run replaces each collection's rows in one transaction, without merging. The `resources` row is **kept** (same `resource_id` and `source_key`, `source_id` updated, `version` bumped), so the manifest id and pack path scheme are unchanged.
4. The change feed for that resource is cleared with a floor version so an older device gets `410` and downloads the new pack (verified against the Azkar re-import).
5. The app applies `hadith_ref_aliases` to `user.db`: `exact_text` moves silently; any other result marks the saved item *unverified* and shows it at book level. Nothing is pointed at a hadith the match could not confirm.
6. A collection Sunnah.com lacks, or names differently, is a developer decision at the switch. Sunnah.com adds chapters and URLs and grader attribution without a schema change.

### 9. Packs
- One pack per collection: a `resources` row in the group **`hadith_collections`**, `source_key` = canonical slug, `language_code` `ar`, name = the developer-approved Arabic title (or «مجموعة {n}» when none). `hadith:{lang}` stays reserved for deferred HadeethEnc.
- `resources.group` is `string(64)`, so no database migration is needed; `ResourceGroup`, `ServedResourceGroup`, `PackSchema` and the app's `PackGroup` change.
- Packs are built and listed while the kill switch is on. Reading works fully offline after the pack downloads (non-negotiable 4). The only text in a pack is the source's Arabic byte for byte, plus the developer-approved titles.

### 10. Book covers: a rendered component, not images
- Each collection has our own cover, **rendered** by a `CollectionCover` component from design tokens: the Arabic title when one exists, a distinct ground colour per collection, a simple ornament from the existing design language. With no Arabic title the cover shows the ornament alone (section 4).
- Why a component: the real font shapes the Arabic and Dynamic Type works; it follows light, sepia and dark and RTL with no extra assets; no copyrighted images, no per-density files, no binary growth; a new collection gets a cover without an app release (an unknown slug uses a neutral fallback palette).
- Shown in the collections list, the collection header and the book list header. Home keeps its icon tile.
- The palette (ten colours plus the fallback) is **new colour tokens**, a developer decision (ADR 0010). Covers are drawn in `quran-app-screens.html` and approved before code. No third-party or published-edition image.

### 11. Display rules
- Arabic only, always shown. Every hadith shows its collection, book, number and a **source line** ("Source: …") built from `content_sources`, with wording the developer decides. A source link is shown only when `source_url` exists (never for fawazahmed0).
- The Home tile and the Menu card appear only while at least one collection pack is installed (ADR 0017). With the kill switch off, nothing is installed.
- No generated religious content (non-negotiable 6). Tests and fixtures use placeholders (`FIXTURE text 1 — not a hadith`, source `taybah-dev-fixture`).

## Consequences

- The content plan's fawazahmed0 row ("Not used", "grade sources are not documented") is amended: used as the Phase 7 hadith source. The hadithapi.com row becomes "hadith data not used (no terms); Arabic section titles taken once through a dev-only matcher, developer-approved". The ummahapi.com row becomes "hadith data not used; the ten Arabic collection names only". Sources: data from fawazahmed0; collection names from ummahapi.com; section titles from hadithapi.com (one-off match); author names from the developer.
- Spec §15 numbering: Hadith collections become Phase 7 and Beta becomes Phase 8; the cut-line row is split.
- ADR 0032's Menu card list gains الحديث, and the `Menu`, `MenuDark` and `MenuEnglish` frames change.
- `apps/mobile/CLAUDE.md` "Where state lives": collection reading moves from TanStack Query to `content.db`.
- Production content ships without waiting for Sunnah.com: all ten collections, when the developer turns the kill switch on at release. Until then production has no Hadith content and the code ships dormant, with no tile.
- **This amends the content plan's "the content reviewer signs off on the Hadith section" (and its "Not used unless the reviewer approves" for fawazahmed0) for Phase 7 collections: there is no reviewer, and the developer decides.** Azkar's own reviewer rules in ADR 0031 are untouched.
- Sunnah.com is not a production blocker any more; it is the blocker for the switch (grader attribution by Sunnah.com, chapters, URLs).
- **Provenance risk, accepted by the developer for now.** The editions' provenance is partly documented: fawazahmed0's `References.md` lists the sites the data came from "directly or indirectly" (al-maktaba.org/Shamela, sunnah.com, iium.edu.my/deed/hadith, hadithbd.com, zubairalizai.com, and al-maktaba.org books 1755 and 32832 for Abu Dawud's Albani and Arnaut grades, among others), so part of the data comes from sunnah.com and Shamela. The Unlicense comes from the repository author and does not necessarily clear those upstream rights. The classical Arabic texts themselves are centuries old. The edition metadata still says author "Unknown" with an empty source. Sunnah.com's written terms (step 18, the switch) close this. The developer keeps a note in `content_sources.notes` and keeps grades hidden. With no reviewer, nobody else checks the Arabic text against a printed edition; text integrity is limited to "stored equals source".
- `HADITH_API_KEY` is needed only for the dev-only title matcher; it lives in the developer's local `apps/api/.env` and never in production. Agents never open that file.
