# Phase 7: spec and content-plan patch (**Applied 1 Nov 2026**)

**Applied 1 Nov 2026** by the planner after the developer accepted ADR 0042 and the plan: `docs/technical-spec.md`, `docs/content-plan.md`, `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/mobile/CLAUDE.md` and the amendment notes in ADR 0017 and 0032. Differences from the text below: the §3 job row says the import runs in the release script from step 17 (not "never"), and the two table-cell appends were made before the closing pipe. This file is now the record of what changed.


Applies ADR 0042 (Proposed; source fawazahmed0/hadith-api, revised 1 Nov 2026). Apply only after the developer accepts the ADR, and after `ft/azkar` merges or by hand-resolving the shared lines (see "Merge risk" in `../phase-7.md`). Each edit names the file, the section, what it replaces, and the exact new text. "Insert after" means a new line directly after the quoted anchor. No religious text appears below.

## `docs/technical-spec.md`

### §3 Backend code structure (deferral marks only)

1. Domain tree line `│   ├── Hadith/         categories, hadiths, translations, daily rotation` becomes:
   `│   ├── Hadith/         full collections (ADR 0042); categories, daily rotation deferred`
2. Job table rows `SyncHadithJob` and `SendDailyHadithJob`: append to the Purpose cell ` **Deferred (ADR 0042).**`
3. Insert a row after `SendDailyHadithJob`:
   `| ``hadith:import`` (command, scheduled) | command | Weekly, Sunday 03:30 UTC | Re-imports the primary hadith collection source from the pinned snapshot. A no-op while the lock is closed or the pinned hashes are unchanged (ADR 0042 §3); never in the production release script. |`
4. Integrations list: add `HadithApiFawaz` (and later `SunnahCom`) to the `app/Integrations` listing in `apps/api/CLAUDE.md` (Structure, first bullet).

### §4 App code structure

Replace the route line
`│   ├── hadith/index.tsx, category/[id].tsx, [id].tsx`
with
```text
│   ├── hadith/index.tsx, search.tsx, downloads.tsx                          Phase 7, ADR 0042
│   ├── hadith/[collection]/index.tsx, books/[book]/index.tsx, books/[book]/chapters/[chapter].tsx, hadith/[number].tsx
│   │   (a book lists its hadith directly when the source has no chapters; HadeethEnc category/detail routes: deferred)
```
In the table row `Account, online lookups, hadith browsing | TanStack Query`, replace `hadith browsing` with `deferred HadeethEnc browsing`. Insert after the table a sentence: «Hadith collections read from `content.db` packs (ADR 0042), not through TanStack Query.»

### §5 Backend database schema

1. In the `resources` row, `group` enum text: append `, `hadith_collections` (ADR 0042; `hadith` stays reserved for the deferred HadeethEnc pack)` and add: «The database column is `string(64)`; the enum is the PHP `ResourceGroup`.»
2. Above the existing Hadith table, insert:

> **Hadith: full collections (ADR 0042).** Every table carries `resource_id` first (one resource per collection) and every row carries `source_id` → `content_sources`. Arabic columns are `utf8mb4_0900_bin` and hold the source bytes; only `text_search` is normalised. Nothing here changes when the source changes from fawazahmed0/hadith-api to Sunnah.com. fawazahmed0 has no chapter level, so `hadith_chapters` stays empty for it.
>
> | Table | Columns | Keys and indexes |
> | --- | --- | --- |
> | `hadith_collections` | `resource_id` FK, `id`, `slug` varchar(32) (canonical), `source_id` FK, `source_code` varchar(32), `title_ar` varchar(200) null (developer-approved map), `title_en` varchar(200) null, `author_ar` varchar(200) null, `author_en` varchar(200) null, `attribution_ar` text, `attribution_en` text, `source_url` varchar(500) null, `total_hadith` int, `books_count` int, `source_version` varchar(64) (the pinned commit SHA), `imported_at` datetime(6) | PK (`resource_id`,`id`); unique `slug` |
> | `hadith_books` | `resource_id`, `id`, `book_number` varchar(16) (fawazahmed0 section number as text), `title_ar` varchar(500) null (developer-approved map), `title_en` varchar(500) null, `position` int, `hadith_count` int, `source_id` FK, `source_key` varchar(96) | PK (`resource_id`,`id`); unique (`source_id`,`source_key`); index (`resource_id`,`position`) |
> | `hadith_chapters` | `resource_id`, `id`, `book_id`, `chapter_number` int (Taybah ordinal in the book; not stable across sources), `source_chapter_key` varchar(32) null (Sunnah.com float id as text), `title_ar` text null, `title_en` text null, `position` int, `hadith_count` int, `source_id` FK, `source_key` varchar(96) | PK (`resource_id`,`id`); unique (`source_id`,`source_key`); index (`resource_id`,`book_id`,`position`). **Empty for fawazahmed0.** |
> | `hadith_entries` | `resource_id`, `id`, `book_id`, `chapter_id` null, `hadith_number` varchar(32) (text: decimal numbers exist, Sunnah.com numbers can carry suffixes), `arabic_number` varchar(32) null, `position` int, `text_ar` text (byte-exact, from the `ara-{c}` edition), `text_en` text null and `narrator_en` text null (empty for fawazahmed0: no English is fetched), `text_search` text, `source_url` varchar(500) null (null for fawazahmed0), `source_id` FK, `source_key` varchar(96), `source_text_sha256` char(64), `source_version` varchar(64), `imported_at` datetime(6) | PK (`resource_id`,`id`); unique (`source_id`,`source_key`); index (`resource_id`,`hadith_number`) (not unique until the import dry run shows whether duplicates exist); index (`resource_id`,`book_id`,`chapter_id`,`position`) |
> | `hadith_grades` | `resource_id`, `id`, `entry_id`, `grade` varchar(120) (as received), `graded_by` varchar(200) null (fawazahmed0 `name`; Sunnah.com `graded_by`), `source_id` FK, `source_key` varchar(96) | PK (`resource_id`,`id`); index (`resource_id`,`entry_id`). Every grade is stored. It is served only when `hadith.grades_visible` (a constant in `config/hadith.php`, `false` through Phase 7) is true and `graded_by` is not null; the API and the pack builder apply this rule, so the pack table is empty. No `review_status` column; a later phase can add one additively. |
> | `hadith_ref_aliases` | `resource_id`, `old_number` varchar(32), `new_number` varchar(32) null, `match` enum(`exact_text`,`similar_text`,`number_only`,`none`), `since_version` int | PK (`resource_id`,`old_number`,`since_version`). Empty until a source switch. |

3. On the existing HadeethEnc block (`hadith_categories`, `hadiths`, `hadith_category_hadith`, `hadith_translations`, `daily_hadiths`) and the `devices` columns `push_daily_hadith`, `daily_hadith_time`: prefix with «**Deferred (ADR 0042): HadeethEnc daily hadith and topics. These tables are not created in Phase 7.**»
4. `content_sources`: add «Hadith sources: `fawazahmed0` (Unlicense, `not_required`; `notes` holds the developer's provenance note) and `sunnahcom` (key requested, `pending`). There is no switch (ADR 0045).»

### §6 Device database schema

1. Replace the row
   `| hadith_categories, hadiths, hadith_translations, hadith_category_hadith | as backend, ar + interface language only | — |`
   with
   `| hadith_categories, hadiths, hadith_translations, hadith_category_hadith | **Deferred (ADR 0042):** HadeethEnc pack, not built in Phase 7 | — |`
2. Insert after the `azkar_*` row:
   `| hadith_collections, hadith_books, hadith_chapters, hadith_entries, hadith_grades, hadith_ref_aliases | Hadith collections pack group (ADR 0042): one pack per collection, columns as backend without `source_id` and `source_key`. `hadith_grades` contains only visible grades; none are visible through Phase 7, so it is empty. `hadith_chapters` is empty for fawazahmed0; `hadith_ref_aliases` is empty until a source switch. Arabic text byte-exact | keyed by `resource_id` plus their own ids; `hadith_entries` index (`resource_id`,`hadith_number`) |`
3. Insert after the `search_study` row:
   `| search_hadith | FTS5 virtual table: `entry_id` UNINDEXED, `resource_id` UNINDEXED, `text_search`, built on the device after a collection pack installs (ADR 0042) | `tokenize='unicode61 remove_diacritics 2'` |`
4. In the `user.db` table, insert after the `azkar_*` row:
   `| hadith_bookmarks, hadith_reading_position | saved hadith keyed by `collection_slug` + `hadith_number` (text), plus `book_number` as a fallback place, `numbering_source`, `status` (`ok` or `unverified`), `created_at`; one last-read place per collection | local only (ADR 0027, 0042). Never stores a database, book or chapter id, so a source switch can remap by alias. Added to `PERSONAL_TABLES`; cleared by «مسح البيانات». Separate from the single Quran bookmark of ADR 0028 |`

### §7 Content pipeline

1. In "Pack contents by group", append: `, `hadith_collections:{slug}` (one pack per collection, ADR 0042; `hadith:{lang}` remains the deferred HadeethEnc pack)`.
2. Insert after the "Azkar is not synced from QF" bullet:

> - **Hadith collections are not synced from QF (ADR 0042).** The source is fawazahmed0/hadith-api, read directly as static JSON from jsDelivr **at a pinned commit SHA** (never `@1`); `config/hadith.php` records the commit and each file's SHA-256, and a file with another hash is refused. `php artisan hadith:snapshot` downloads `editions.json`, `info.json` and the `ara-{c}` Arabic editions (and nothing else: no English edition, and `ara-{c}1` is not stored) into `storage/app/hadith`. `php artisan hadith:import` validates the snapshot, writes the six `hadith_*` tables per collection in one transaction (section → book; hadith assigned to a book by `section_details` ranges, cross-checked against `reference.book`; hadith numbers with no text skipped and listed; every grade stored with its named grader), bumps that collection's resource version, and writes an import report (counts against the source's counts, skipped numbers, duplicate numbers, section 0, range mismatches, graders seen). All ten collections (`bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi`, `qudsi`, `dehlawi`) are imported, packed and served; there is no per-collection approval. It runs under a cache lock. There is no switch (ADR 0045): the pack builder, the manifest and the `/hadith/collections` endpoints serve each collection whenever its pack is installed, and the builder leaves out grades (`hadith.grades_visible` is false). Titles come from `config/hadith_titles.php` (ADR 0042 §4a: ummahapi.com collection names, developer-approved authors, section titles from the dev-only, never-in-production `hadith:match-section-titles` proposal); a missing Arabic title stays null and the app shows «مجموعة {n}» / «كتاب {n}». The weekly scheduler entry is a no-op unless the pinned hashes change. `docker/release.sh` runs `hadith:import --download --defer-pack` (the Azkar pattern, ADR 0044) from step 17, not before. Bumping the commit SHA is a change the developer approves.
> - **Source switch (ADR 0042 §8).** Replacing the source is a re-import, not a merge. The collection's `resources` row is kept (same `resource_id` and `source_key`; `source_id` updated, `version` bumped), the change feed for it is cleared with a floor version so older devices get `410` and download the new pack, and `hadith_ref_aliases` maps old numbers to new ones for the app to apply to saved items.

3. In "Normalization on ingest" (hop 1, item 7), append: «Hadith `text_search` is produced by a hadith normaliser that also removes bidirectional and zero-width marks (U+200E/F, U+061C, U+202A–202E, U+2066–2069, U+200B–200D, U+FEFF); the stored `text_ar` keeps every byte as received.»

### §9 API endpoints

1. Intro line «Twenty-seven endpoints cover v1.»: add «Phase 7 adds five hadith collection endpoints (ADR 0042).»
2. Mark the existing rows `/hadith/categories`, `/hadith/categories/{id}/hadiths`, `/hadith/{id}`, `/hadith/daily`: append to Purpose ` **Deferred (ADR 0042, HadeethEnc).**`
3. Insert after the `/hadith/daily` row:

> | GET | `/hadith/collections` | none | Collections served (no switch, ADR 0045): slug, titles (null when no Arabic title), counts, source credit, pack resource id | 200 |
> | GET | `/hadith/collections/{slug}/books` | none | Books of a collection | 200, 404 |
> | GET | `/hadith/collections/{slug}/books/{book}/chapters` | none | Chapters of a book (an empty list when the source has none) | 200, 404 |
> | GET | `/hadith/collections/{slug}/books/{book}/hadiths` | none | Hadiths of a book, `?chapter=`, cursor-paginated | 200, 404 |
> | GET | `/hadith/collections/{slug}/hadiths/{number}` | none | One hadith: Arabic text, number, breadcrumb, source credit, `source_url` when present. **No `grades` while `hadith.grades_visible` is false (all of Phase 7)** | 200, 404 |

4. `/bootstrap` row: append «The daily hadith id is deferred (ADR 0042).»

### §13 Notifications (deferral mark)

Prefix the "Daily hadith push" bullet with «**Deferred (ADR 0042).**» and mark the first paragraph's mention of the daily hadith the same way. No other §13 change.

### §15 Solo delivery plan

1. Timeline: replace `wk 27 ── 33   v1.1: Hadith and more (post-launch)` with `wk 27 ── 33   v1.1: HadeethEnc daily hadith, extra scripts and more (post-launch)`, and after the Azkar line add `parallel      Hadith collections (Phase 7, ADR 0042; not on the launch critical path)`.
2. Phase table: relabel `7. Beta and store review` as `8. Beta and store review` and insert before it:

> | 7. Hadith collections (parallel with Phase 6) | not scheduled | Full collections (collection → book → hadith; chapters when a source has them) from fawazahmed0/hadith-api pinned to a commit, all ten collections, Arabic only, per-collection packs, collections/books/hadith screens, search, own cover art, hidden grades, saved items by collection slug + number; Sunnah.com switch blocked on the key (ADR 0042) | Offline reading and search in airplane mode; frames verified; production serves the ten collections from the Hadith release (no switch, ADR 0045) |

   Planner's effort estimate (not a commitment): about 4 focused weeks for steps 2 to 16, excluding frame approval waits, the time to supply Arabic titles, and the Sunnah.com switch.
3. Cut-lines: replace the row `Hadith section and daily hadith push` with
   `| Hadith collections (Phase 7) | Parallel; no switch (ADR 0045) | — | All ten collections ship; no reviewer gate. The Home tile and Menu card appear only when a collection pack is installed (ADR 0017, 0042) |`
   `| HadeethEnc daily hadith, topics and daily push | Deferred (ADR 0042) | \~2 weeks | Needs HadeethEnc written confirmation (and Azkar-style sign-off if a reviewer exists then) |`
4. In the opening sentence, replace «with Hadith, extra scripts and push moved to v1.1» with «with HadeethEnc, extra scripts and push moved to v1.1».

### §16 Open questions and risks

Add under Questions:
- `[ ] Developer: approve the drafted Arabic author names and the hadithapi.com section-title proposal in `config/hadith_titles.php` (collection names come from ummahapi.com), and the source-line wording; missing titles fall back to numbers and do not block release (ADR 0042 §4, §4a).`
- `[ ] Sunnah.com: API key (GitHub issue on sunnah-com/api) and written terms for offline packs, redistribution, attribution and grader credit (blocks the switch only).`

Add under Risks:
- «fawazahmed0's data comes partly from sunnah.com and Shamela (its `References.md`); the Unlicense comes from the repository author and does not necessarily clear those upstream rights. The classical texts are centuries old. Accepted by the developer for now; Sunnah.com's written terms close it. Grades stay hidden (ADR 0042 §3, §5).»
- «Hadith numbering may differ between sources; the switch ships an alias table and flags unmatched saved items (ADR 0042 §8).»

## `docs/content-plan.md`

### API catalog, Hadith table (around line 136)

Replace the Hadith table with:

| API | Gives us | Access | Terms that matter | Decision |
| --- | --- | --- | --- | --- |
| [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | Ten collections (36,512 hadith numbers) as static JSON: Arabic editions with diacritics, sections, hadith and Arabic numbers, named graders and grades. No chapter level, no per-hadith URL. Edition metadata lists author "Unknown" and no source; `References.md` lists upstream sites (sunnah.com, al-maktaba.org/Shamela and others); no Arabic names (English collection and section names only) | Public CDN (jsDelivr), no key, no rate limit; **pinned to a commit SHA** | Unlicense on the repository. From the repository author; part of the data comes from sunnah.com and Shamela, so the Unlicense does not necessarily clear upstream rights | **Primary for Phase 7**, read directly, Arabic only, all ten collections, no switch (ADR 0045). Grades stored, hidden through Phase 7 (ADR 0042) |
| [Sunnah.com](https://sunnah.com/developers) API v1 | Full collections, books, chapters, hadiths with grader and grade, a public page per hadith; offline dump on key requests | API key by GitHub request (requested 1 Nov 2026) | Not published; confirm offline storage, redistribution, attribution and credit | **Long-term target**: replaces fawazahmed0 through `SunnahComSource` with no schema, endpoint, pack or screen change |
| [HadeethEnc](https://documenter.getpostman.com/view/5211979/TVev3j7q) API v1 | Curated hadiths with grade, explanation and benefits, by category; 72 languages | No key | No changes; credit HadeethEnc | **Deferred (ADR 0042)**: daily hadith, topics and explanations. Still used by the Azkar enrichment (ADR 0031 §12) |
| hadithapi.com | Seven collections, Arabic, English, Urdu | API key (dev-only `HADITH_API_KEY`) | No terms, licence or offline-storage permission published | **Hadith data not used.** Arabic section (كتاب) titles taken once through the dev-only `hadith:match-section-titles` (two-way 95% match, titles only), developer-approved; Sunnah.com titles replace them (ADR 0042 §4a) |
| ummahapi.com | A proxy of fawazahmed0; drops books and graders. `GET /api/hadith/collections` has `arabic_name` | No key | Not stated | **Hadith data not used.** The ten Arabic collection names only (ADR 0042 §4a) |
| Dorar.net | (unchanged row) | | | (unchanged) |

### Permissions to request

Replace `- [ ] Sunnah.com: API key and terms` with
`- [ ] Sunnah.com: API key (GitHub issue on sunnah-com/api, requested 1 Nov 2026) and written terms for offline packs, redistribution, attribution and grader credit (blocks the switch only)`
and add
`- [ ] Developer: approve Arabic author names and the section-title proposal in `config/hadith_titles.php`, and the source-line wording; optional, missing titles fall back to numbers (ADR 0042)`.
Mark `HadeethEnc: confirm app use in writing` «(deferred, ADR 0042)».

### «Hadith» section (around line 281)

Replace the section text (heading kept) with:

> The first Hadith release is **full collections** (collection → book → hadith; chapters appear when a source has them), read offline from per-collection packs (ADR 0042). HadeethEnc's curated hadiths, explanations, daily hadith and daily push are **deferred**.
>
> | Source | What it gives us | Access | Terms we must follow | Use |
> | --- | --- | --- | --- | --- |
> | fawazahmed0/hadith-api | Ten collections: Arabic with diacritics, sections, numbers, named graders | Static JSON on jsDelivr, pinned to a commit; no key | Unlicense from the repository author; part of the data comes from sunnah.com and Shamela, so upstream rights are not necessarily cleared | Phase 7 source; Arabic only; all ten collections, no switch (ADR 0045) |
> | [Sunnah.com](https://sunnah.com/developers) | Full collections, grades with graders, chapters, a page per hadith, offline dump on request | API key via GitHub | To confirm in writing | Long-term target; replaces fawazahmed0 |
> | HadeethEnc.com | Curated hadiths with explanations | Free API | No modification, addition or deletion; credit HadeethEnc | Deferred |
> | hadithapi.com | Arabic section titles only | Dev-only key | None published | One-off title match, developer-approved; no hadith data |
> | ummahapi.com | The ten Arabic collection names only | No key | Not stated | Names only; no hadith data |
> | Dorar.net | Hadith references (backend adapter, Azkar only) | Token | Per ADR 0031 §2 | Unchanged |
>
> - **Pipeline:** the backend imports the pinned snapshot into MySQL (`hadith_collections`, `hadith_books`, `hadith_chapters`, `hadith_entries`, `hadith_grades`, `hadith_ref_aliases`), builds one pack per collection, and the app downloads the packs and reads offline. There is no lock or switch (ADR 0045): the import runs on every deploy, like Azkar.
> - **Display:** every hadith shows its collection, book, number and a source line. **No grade is shown through Phase 7**; grades are stored with their named graders and stay hidden. A link to the source page is shown only when the source provides one. Arabic only: no English edition is stored. Hadith text is never shortened, altered or rewritten.
> - **Arabic names:** fawazahmed0 has none. `config/hadith_titles.php` holds them with a source per entry: collection names from ummahapi.com, author names from the developer (drafted, pending approval), section names from a one-off hadithapi.com match (accepted only at ≥ 95% in both directions; titles only). A missing name stays empty: the app shows «مجموعة {n}» / «كتاب {n}», never the English source name in the Arabic interface.
> - **Covers:** each collection has an own-design cover rendered from tokens; no published-edition images.
> - **Stable references:** saved items use collection slug + hadith number; a source switch ships an alias table and flags unmatched items.
> - **No AI:** no generated explanations, summaries or translations of hadith.
> - **Review (amended for Phase 7 collections, ADR 0042):** there is no content reviewer for these collections; the developer decides the Arabic names, the source-line wording and the gap list. The content plan's "the content reviewer signs off on the Hadith section" is not applied to them. Azkar's own reviewer rules (ADR 0031) are unchanged.
> - **Tables (deferred):** `hadith_categories`, `hadiths`, `hadith_translations`, `daily_hadiths` stay as the HadeethEnc design.

### Notifications table, credits and Rollout

- Notifications table row `Daily hadith | Push from Laravel`: append «(deferred, ADR 0042)».
- Release pipeline «Credits» line: add «fawazahmed0/hadith-api (Unlicense) when a collection ships; Sunnah.com when it becomes the source», and note HadeethEnc is credited when its content ships.
- Rollout row «Listening and Hadith … Hadith v1»: replace `Hadith v1` with `Hadith collections (Phase 7, parallel)`.

## Other files (proposal only)

- `CLAUDE.md`: see «Proposed CLAUDE.md wording» in `../phase-7.md`.
- `apps/mobile/CLAUDE.md` «Where state lives»: `Account, online lookups, hadith browsing` → `Account, online lookups, deferred HadeethEnc browsing`; add a row `Hadith collections | content.db via feature repositories; saved hadith in user.db`.
- `apps/api/CLAUDE.md` «Structure»: add `HadithApiFawaz` (later `SunnahCom`) to the `app/Integrations` list.
- ADR 0017 gets «Amended by ADR 0042 (الحديث tile gated on an installed collection pack)»; ADR 0032 gets «Amended by ADR 0042 (الحديث card in the menu, same gate)». `docs/adr/README.md` is unchanged.
- `apps/api/.env.example`: `HADITH_API_KEY=` empty with the comment `# dev-only, used by hadith:match-section-titles`. `apps/api/CLAUDE.md` «Structure»: also note the minimal dev-only `HadithApiCom` client used by the title matcher.
