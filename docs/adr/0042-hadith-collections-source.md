# 0042 — Hadith: full collections first, hadithapi.com behind a lock, Sunnah.com later

Date: 2026-11-01 · Status: **Proposed** (developer decisions of 1 Nov 2026 recorded; this ADR waits for the developer's acceptance) · Amends spec §4, §5, §6, §7, §9, §15, the content plan (Hadith section, sources tables), ADR 0017 (Home tiles) and ADR 0032 (Menu cards). Defers part of spec §3, §5, §9, §13 (HadeethEnc, daily hadith). Plan: `docs/plans/phase-7.md`.

Numbering note: the brief asked for 0041, but `0041-local-uses-qf-production.md` is already accepted, so this ADR is 0042.

## Context

The spec and the content plan planned the Hadith section around HadeethEnc: a curated set, categories, explanations, a daily hadith and a daily push (spec §5 `hadith_categories`, `hadiths`, `hadith_translations`, `daily_hadiths`; §9 `/hadith/*`; §13 `SendDailyHadithJob`). Sunnah.com's full collections were "later: v2" (content plan, Hadith table).

On 1 Nov 2026 the developer changed the order (decisions D1 to D5 in `docs/plans/phase-7.md`):
- Build full collections first (collection → book → chapter → hadith).
- Use **hadithapi.com** now. It publishes **no terms, no licence and no offline-storage permission**, so it cannot ship.
- Use **Sunnah.com** later. The developer is requesting an API key through a GitHub issue on `sunnah-com/api`.

Facts about the two APIs (verified by the developer on 1 Nov 2026; this ADR does not re-fetch them):
- hadithapi.com: 7 collections with data (40,465 hadiths in total). A chapter in hadithapi.com is a Sunnah.com **book** (كتاب). The باب title exists only as a per-hadith heading, with no id. `status` carries the values `Sahih`, `sahih` and `Da'eef`. No grader, no translator credit, no source URL. 60 requests a minute.
- Sunnah.com (`spec.v1.yml`): collections, books, chapters (float `chapterId`), hadiths with per-language `chapterTitle`, `urn`, `body` and `grades[{graded_by, grade}]`. A public page per hadith. Key requests also offer an offline dump.

## Decision

### 1. Scope
1. Phase 7 builds **full collections only**. HadeethEnc (daily hadith, topics, explanations, the existing §5 hadith tables, the daily push, `/hadith/daily`, the `/bootstrap` daily hadith id, `devices.push_daily_hadith`) is **deferred to a later phase**. Its spec text stays and is marked *deferred (ADR 0042)*. Its frames `#Hadith`, `#HadithDetail`, `#HadithDetailEnglish` stay and are captioned deferred; they are not redrawn.
2. Phase 7 runs **in parallel with Phase 6** on its own branch, `ft/hadith`. Phase 6 (`ft/azkar`) keeps its exit check. Both touch shared files (plan, section "Merge risk").

### 2. One schema for both sources
New MySQL tables, separate from the deferred HadeethEnc tables, modelled on Sunnah.com: `hadith_collections`, `hadith_books`, `hadith_chapters`, `hadith_entries`, `hadith_grades`, `hadith_ref_aliases`. Every table carries `resource_id` first (the Azkar pattern, ADR 0031 §9) and every row carries `source_id` → `content_sources`.

**The schema, the endpoints, the pack tables and the app screens do not change when Sunnah.com replaces hadithapi.com.** The pieces that make that true from day one:
- `hadith_entries.hadith_number` is **text**, because hadithapi.com sends a string and Sunnah.com numbers can carry suffixes.
- Arabic columns are `utf8mb4_0900_bin` and hold the source bytes (the U+200F marks included). Only `text_search` is normalised, and the normaliser strips bidirectional marks.
- `hadith_chapters.source_chapter_key` is text, so a Sunnah.com float `chapterId` fits without a type change.
- `hadith_entries.source_url` is nullable and filled by Sunnah.com.
- `hadith_grades` exists and ships in the pack **empty** until a named grader exists.
- `hadith_ref_aliases` exists and ships empty until the switch (section 6).

Mapping for hadithapi.com: its chapter → our **book**; its `headingArabic` grouped by (book, heading) → our **chapter** (a contiguous run of equal headings in hadith order; non-contiguous repeats become separate chapters and are listed in the import report); `status` → `hadith_grades.grade` with `graded_by` null.

### 3. Sources, code layout and the two locks
- **Code:** the HTTP clients live in `app/Integrations/HadithApiCom` (later `app/Integrations/SunnahCom`), because `apps/api/CLAUDE.md` says providers live in `Integrations` and `Integrations` never import from `Domains`. The `HadithCollectionSource` interface, the adapters (`HadithApiComSource`, later `SunnahComSource`) and the importer live in `app/Domains/Hadith`. This mirrors the Dorar split (`Integrations/Dorar` and `Domains/Azkar/Sources`).
- **Two locks, as Azkar has (ADR 0031 §1):**
  1. The `content_sources` row `hadithapi` stays `permission_status = pending` (no reviewed migration sets it to `granted` while there is no written permission).
  2. `HADITH_COLLECTIONS_IMPORT_ENABLED` defaults to `false`.
- **What the locks do:**
  - In production the importer refuses unless the source is `granted` **and** the flag is on. The pack builder and the public endpoints apply the same gate.
  - Outside production, the flag alone opens a *development* import for a `pending` source. The pack builder and the endpoints read the source's `permission_status` live, so such rows are served only outside production.
  - The scheduler entry and `docker/release.sh` never import hadithapi.com in production: the scheduler entry is a no-op while locked, and the import is **not added to `release.sh`** until the Sunnah.com switch.
- **Secrets:** `HADITH_API_KEY` lives only in `apps/api/.env`; `.env.example` has it empty. hadithapi.com takes the key as a query parameter (`?apiKey=`), so the client must redact it from exception messages, logs, snapshots, import reports, Sentry and Pulse. A test asserts that no report, snapshot or exception text contains the key.
- Development packs are built on the developer's machine only and are never uploaded to Railway.

### 4. Grades are hidden (D4)
- hadithapi.com names no grader, its values are only `Sahih`/`sahih`/`Da'eef`, and the first 200 Mishkat rows are all "sahih".
- Grades are stored. A grade is **visible** only when `graded_by` is not null **and** `review_status = reviewed` (a reviewer signed it off).
- The API Resources, the pack builder and the app all apply this rule. Today no grade is visible, so the pack's `hadith_grades` table is empty. The UI has no grade section, and no placeholder sentence (ADR 0031 §1.4).

### 5. Stable user references
- Anything the user saves on a hadith points to **collection slug + hadith number** (`bukhari:1`), never to a database id, a book id or a chapter ordinal.
- Canonical collection slugs follow Sunnah.com's names and will not change at the switch. A mapping table (`config/hadith.php`) maps hadithapi.com slugs to them. The mapping is **to be verified against `GET /collections`** when the key arrives (only `bukhari` is confirmed by the developer's notes).
- Numbering differs between the sources (the developer names Sahih Muslim). The switch therefore produces an **alias table** (old number → new number or none, with how the match was made), shipped in the pack. The app applies it to saved items; unmatched items are flagged, never silently re-pointed (section 6).

### 6. The switch is a re-import, not a merge
When the Sunnah.com key and its written terms exist:
1. A reviewed migration adds the `sunnahcom` source row and sets it to `granted` (the pattern of ADR 0038). `SunnahComSource` is added to the registry and `hadith.primary_source` changes.
2. A dry run produces the alias report: for each saved-able hadith, old number → new number by matching normalised Arabic text, with the method (`exact_text`, `similar_text`, `number_only`, `none`) and counts per collection. The developer and the reviewer read it before the wet run.
3. The wet run replaces each collection's rows in one transaction. It does not merge. The collection's `resources` row is **kept** (same `resource_id` and `source_key`), with `source_id` updated and `version` bumped, so the manifest entry and the pack id are unchanged and devices simply see a newer version.
4. The change feed for that resource is cleared and a floor version is set, so an older device gets `410` and downloads the new pack (the step verifies this against the Azkar re-import).
5. The app, on installing the new pack, applies `hadith_ref_aliases` to `user.db`: `exact_text` moves silently; every other result marks the saved item *unverified* and shows the saved place at book level. Nothing is ever pointed at a hadith the match could not confirm.

### 7. Packs
- One pack per collection: a `resources` row in the new group **`hadith_collections`**, `source_key` = canonical slug, `language_code` `ar`, name = the reviewed Arabic title. Spec §7's `hadith:{lang}` stays reserved for the deferred HadeethEnc pack, and the two have different tables and different locks, so they do not share a group.
- `resources.group` is a `string(64)` column (`create_resources_table` migration), so the new group needs no database migration; only `ResourceGroup`, `ServedResourceGroup`, `PackSchema` and the app's `PackGroup` change.
- Packs are built, and listed in the manifest, only when the gate in section 3 allows. Reading works fully offline after the pack downloads (non-negotiable 4).
- No Taybah-written text enters a pack: the only text is the source's, byte for byte, plus the reviewed collection titles.

### 8. Book covers (D5): a rendered component, not images
- Each collection has our own cover, **rendered** by a `CollectionCover` component from design tokens: the reviewed Arabic title in the display face, a distinct ground colour per collection, and a simple ornament from the existing design language.
- Why a component and not bundled images:
  - Arabic text is shaped by the real font, so it never looks different from the rest of the app and Dynamic Type works.
  - It follows light, sepia and dark themes and RTL with no extra assets.
  - There are no copyrighted images, no per-density files and no binary growth.
  - A new collection (after the switch) gets a cover without an app release: an unknown slug uses a neutral fallback palette.
- It is shown in the collections list, the collection header and the book list header. Home keeps its icon tile (no cover).
- The palette is **new colour tokens**, which is a developer decision (ADR 0010: tokens come from the HTML design system). The covers are drawn in `quran-app-screens.html` and approved before code. No third-party or published-edition image is used.

### 9. Display rules
- Arabic is always shown. `hadithEnglish` and `englishNarrator` are stored but shown only when the developer accepts the licensing risk, because hadithapi.com names no translator (open question 5 in the plan). Urdu fields are not stored.
- Every hadith shows its collection, book, chapter and number. A **source line** ("Source: …") is shown from `content_sources`. A link to the source page is shown only when `source_url` exists (hadithapi.com has none). This amends the content plan's "every hadith shows its grade … and a link back" (it is a conflict listed in the plan, resolved here by D4 and the null URL).
- The Home tile and the Menu card appear only while at least one collection pack is installed (ADR 0017: no dead ends). With the locks closed, production installs nothing, so neither shows.
- No generated religious content (non-negotiable 6). Tests and fixtures use placeholders (`FIXTURE text 1 — not a hadith`, source `taybah-dev-fixture`).

## Consequences

- Spec §15 numbering changes: Hadith collections become Phase 7 and Beta and store review becomes Phase 8. The "Hadith section and daily hadith push" cut-line row is split.
- ADR 0032's Menu card list gains الحديث and the `Menu`, `MenuDark` and `MenuEnglish` frames change.
- `apps/mobile/CLAUDE.md` "Where state lives": collection reading moves from TanStack Query to `content.db`. Only the deferred HadeethEnc browsing stays online.
- Production has no Hadith content until the release blockers in `docs/plans/phase-7.md` clear. The code can ship dormant, with no tile.
- The deferred HadeethEnc work needs its own ADR when it is scheduled (its tables are not touched here).
- If Sunnah.com cannot supply a collection hadithapi.com has (for example Mishkat), that collection is a developer decision at the switch: drop it, or keep it with its own source and permission.
