# 0031 — Azkar: sources, rights, provenance and data ownership

Date: 2026-10-31 · Status: accepted · Amends spec §4, §6, §7, §12, §13, §15, the content plan (Adhkar and duas), ADR 0017 (Home tiles)

## Context

The developer asked for a first-class Azkar feature built on Hisn al-Muslim (حصن المسلم). Phase A research (`docs/plans/phase-6/source-research.md`) inspected the OpenDua v0.0.4 dataset field by field.

What OpenDua provides:
- **Coverage:** 267 entries in 132 chapters, Arabic text, instructions and the book's own narration text.
- **Repeat counts:** for 31 entries only.
- **Licence:** a clear CC BY 4.0 licence for OpenDua's English, transliteration and structure.

What it lacks:
- **Rights:** no published licence for the Arabic edition. The two licence pages the dataset names are HTTP 404, and the audio is "not offered under the dataset licence".
- **Missing fields:** no Arabic chapter titles, references, gradings or explanations.

Dorar (الدرر السنية) offers an official hadith API with an approved access token, under terms that forbid bulk import and permanent storage without separate written permission (developer, 31 Oct 2026).

## Decision

### 1. Sources and the licensing blocker
1. **OpenDua is the canonical structured source** for Hisn al-Muslim, pinned by version and SHA-256 of the catalogue file. The app never calls OpenDua.
2. **Production import is disabled** until OpenDua confirms in writing the Arabic dataset's redistribution rights, attribution, Arabic chapter titles, and audio streaming, download and re-hosting rights. Two locks:
   - The `opendua` row in `content_sources` stays `permission_status = pending`.
   - `AZKAR_OPENDUA_IMPORT_ENABLED` defaults to `false`.

   The importer refuses to write production rows, and the pack builder refuses to build an Azkar pack, unless both allow it. This is a **release blocker** (section 9).
3. **Arabic chapter titles** must come from a named, authoritative Arabic Hisn al-Muslim source whose use is permitted. The field exists and stays `null` until then. English titles are never translated by us, and never generated.
4. **No generated religious content** (non-negotiable 6). A field with no verified source stays `null`, and the UI omits its section. It never shows a placeholder sentence.

### 2. Dorar
1. Dorar is used **only through the Laravel API** (mobile → Taybah API → Dorar). The token lives in `apps/api` env (`DORAR_API_TOKEN`) and never reaches the app.
2. **No bulk import, no scraping, no full mirror.** Dorar content is never written into an offline content pack unless separate written permission allows it.
3. Caching follows Dorar's published limits. The TTL is configuration (`DORAR_CACHE_TTL_SECONDS`, default `0`), set from the terms the developer holds.
4. Every Dorar-provided item keeps its attribution and canonical Dorar URL.
5. Dorar sits behind a `HadithReferenceSource` interface. The core offline Azkar reader never depends on it.

### 3. Provenance
- **Per resource:** a `resources` row in group `azkar` with `source_id → content_sources` (licence URL, attribution in Arabic and English, permission status), plus `version` and `checksum`, the SHA-256 of the pinned upstream file.
- **Per entry and item:**
  - Stable `entry_key` (`<collection>:<upstream entry id>`, e.g. `hisn-al-muslim:entry-000075`).
  - `source_reference` (the book number), `source_dua_id`.
  - `source_text_sha256`: SHA-256 of the upstream Arabic exactly as received, used to detect upstream changes.
  - `source_version`, `imported_at`, `review_status` (`sourced` | `reviewed`), `reviewed_at`.
- **Per sourced note** (explanation, context, virtue, reference, grade): its own `source_type`, `source_name`, `source_reference`, `source_url`, `review_status`. These are never merged into one description.
- Every import writes a report: counts, warnings, errors, and changed upstream texts. Malformed religious content is reported and the import fails. It is never silently dropped or repaired.

### 4. Quran passages inside azkar
- Quran text inside a dhikr is **not copied** from OpenDua. The importer splits the upstream Arabic at the ﴿ ﴾ marks.
- The text outside the marks is kept byte-for-byte as `text` segments. Each passage becomes a `quran` segment with `surah`, `verse_from` and `verse_to`, taken from a **reviewed reference map** in the repository.
- An entry with Quran marks and no reviewed map row fails the import.
- The app renders `quran` segments from `content.db.verses` with Taybah's Quran font and rules.
- ADR 0014 applies unchanged: no translation or transliteration of a Quran segment, in any interface language.

### 5. Language
- Arabic is always shown.
- OpenDua's English and transliteration of **non-Quranic** duas are stored only when the licence explicitly covers them (CC BY 4.0, confirmed with the rest). They are shown under the Arabic in the English interface, as ADR 0014 allows for hadith, with OpenDua's attribution line.
- Instruction and narration steps that exist only in English (12 upstream) are not shown in the Arabic interface.

### 6. Repetition
- `required_count` is `INTEGER NULL` and comes only from a verified source (upstream `times`). A missing count is never read as 1.
- With a count, the reader shows a counter (`٢ / ٣`). Without one, it shows a single «تم» / "Done" action. No open-ended tally unless a source explicitly supports unrestricted repetition.
- `required_count` (content) and `current_count` (user) live in different databases and never overwrite each other.

**Amended 1 Nov 2026 (developer):** every unit has the same 120 pt ring control (`AzkarCounter`), in one of two variants.
- **A sourced count** (including 1): the counter, with the value in the centre. A count of 1 reads «٠ من ١», then «١ من ١» with a full ring, and completes on one tap. The value uses the counter's format («من», as in the approved `AzkarReader` frame), not «/».
- **No sourced count** (`required_count` null): the single variant. The ring is empty, with a check and «تم» / "Done" in its centre, and no number. One tap fills the ring and completes the unit. Its accessible label is «وضع علامة «تم»» / "Mark as done", with the same button role as the counter.
- Either way the unit completes through the same path (`recordTap`), so auto-advance and the last unit's «إتمام» work the same. The bottom «تم» pill is removed.

**Count from the secondary source, developer 1 Nov 2026:** when the primary source has no `times` for an item, `required_count` is filled from the secondary source's `REPEAT` for the same item, and `required_count_source` records `hisnmuslim`. The match is by book number. Where one book number has several recitations, an item is paired by position only when both sides have the same number of recitations. Otherwise it stays `null` and the import report lists it as ambiguous. Nothing is invented: no source with no count, no match or no readable snapshot leaves the count `null`.
- A count the primary has is never replaced. When the secondary gives a different number, the primary's count is kept and the difference is a `required_count_conflict` warning.
- The secondary is read only while its own lock is open (its import flag and granted permission, as for its import). In production, while it is locked, counts stay as OpenDua has them.
- The import report lists the counts by source, the conflicts and the ambiguous items. `required_count_source` is server-side provenance: it is not in the content pack schema, so the app never receives it.

### 7. Timing and reminders are separate concepts
- **Religious timing metadata (content):**
  - `occasion`, a semantic code: `morning`, `evening`, `after_prayer`, `before_sleep`, `after_waking`, `entering_home`, `leaving_home`, `entering_mosque`, `leaving_mosque`, `travel`, …
  - `timing_type`: `time_period` | `prayer_based` | `event_based` | `anytime`.
  - `timing_prayer` for prayer-based entries.

  These are assigned per chapter from a reviewed mapping file, never inferred from wording. **No morning or evening boundary is encoded** until a cited policy is approved. The schema can hold one later (`timing_policy_*` columns) without a migration of existing rows.
- **Implementation (1 Nov 2026):**
  - No reminder is on by default and no time is suggested; a clock reminder schedules nothing until the user picks a time. A prayer-relative one starts at the prayer time (offset 0), and the user sets the offset.
  - Location is read only for enabled prayer-relative reminders.
  - Entry reminders use the same sheet (`/azkar/reminders?entry=`).
  - The shared notification budget (`src/features/notifications/budget.ts`) is enforced at sync. Prayer-relative windows shrink toward 1 day. Reminders that still cannot fit are refused with an alert, never dropped silently.
- **User reminder preference (user.db):** a clock time or a prayer-relative offset, computed with the existing Salah engine (`features/salah/data/prayer-times.ts`). The UI calls it «وقت التذكير» and never presents it as the time of the dhikr.

### 8. Audio rights
- The recording model carries `reciter`, `source`, `remote_url`, `duration_ms`, `size_bytes`, `stream_allowed`, `download_allowed`, `redistribution_allowed`, `attribution_*`, `licence`, `licence_url` and `rights_verified_at`.
- A recording row is imported only with verified rights. The app streams only when `stream_allowed = 1` and downloads only when `download_allowed = 1`.
- With no legal audio, the UI shows no audio controls at all: no disabled play or download buttons.
- **OpenDua recordings are not streamed, downloaded, proxied, cached, re-hosted or bundled** until written rights exist.
- Downloads will reuse the Quran download manager (`features/audio/downloads`), generalised through an additive `user.db` change when the first licensed recording exists.

### 9. Data ownership and offline
- **`content.db`:** canonical Azkar content, delivered as a fourth content-pack group, `azkar`, through the existing manifest, change feed and pack builder. It stays replaceable; nothing personal is written there. Tables:
  - `azkar_chapters`, `azkar_entries`, `azkar_items`, `azkar_segments`
  - `azkar_categories`, `azkar_entry_categories`
  - `azkar_notes`
  - `azkar_recordings`
- **`user.db`** (local only, ADR 0027): `azkar_favorites`, `azkar_progress`, `azkar_reminders`. All three are added to `PERSONAL_TABLES`, so «مسح البيانات» clears them.
- **Display categories:** a Taybah layer, kept apart from the canonical chapters.
  - Session categories are pinned to chapters: morning and evening (ch. 27, by upstream `morning` / `evening` variation), after prayer (ch. 25), before sleep (ch. 28), on waking (ch. 1).
  - Browse categories are OpenDua's 19 editorial tags.
  - The book's chapter order and numbering are always kept.
- **Development fixtures** are placeholder strings («نص تجريبي — ليس ذكرًا»). They are loaded only in development builds behind `EXPO_PUBLIC_AZKAR_DEV_FIXTURES=1`, with source `taybah-dev-fixture`, and never shipped or packed.

### 10. Placement
- No sixth tab.
- **Home:** gains an «الأذكار» tile only when Azkar content is installed (ADR 0017: no dead ends).
- **Menu** (ADR 0032): an «الأذكار» card in the القائمة grid, under the same condition.
- **Salah:** unchanged. No Azkar row is added to the Salah screen (developer, 1 Nov 2026: the Salah feature must not change). The `SalahAzkar` frame is withdrawn.
- **Routes:** `/azkar/*`, pushed over the tabs. Details and reminder settings are sheets (ADR 0013, 0020).

### 11. Real content locally (developer, 1 Nov 2026)
- **Local and development:** the real pinned OpenDua v0.0.4 is imported and packed for local testing.
  - Only a local database may set the `opendua` source to `granted`, through a command that refuses when `APP_ENV=production`.
  - Dev placeholder fixtures are turned off once real content is installed.
- **Production stays locked** until OpenDua confirms in writing: the migration keeps `pending`, and `AZKAR_OPENDUA_IMPORT_ENABLED=false`.
- **Quran reference map:**
  - Candidate rows are generated by matching each ﴿ ﴾ passage against Taybah's bundled Tanzil text. Each row is marked `candidate` with its match evidence.
  - Local imports may use candidates and the report lists them as warnings.
  - **A production import accepts only rows the developer has marked `reviewed`.**
- **Production deploy (Railway, ADR 0022):** schema migrations, then the Azkar import, which downloads the pinned file, verifies its SHA-256, and no-ops with exit 0 while locked. Then the pack build. No seeders, factories or dev fixtures run in production.

### 12. Additional sources (developer, 1 Nov 2026)
- **hisnmuslim.com** (the book's official site; its JSON API was checked live on 1 Nov 2026) becomes a second canonical adapter. It provides 132 chapters with **Arabic titles**, per-dhikr Arabic text, a `REPEAT` on every entry, and per-dhikr MP3s.
  - No terms are published, so it is locked in production exactly like OpenDua (its own `content_sources` row, `pending`, plus its own import flag) until written permission arrives.
  - Its translation is not stored, and its audio is not imported (rights; also served over plain HTTP).
  - `config('azkar.primary_source')` chooses `opendua` or `hisnmuslim` (default `opendua`). The other source is used for **cross-verification**: Arabic text per book number is compared and every difference is listed in the import report.
- **HadeethEnc** (official API; published terms allow use without modification, with attribution) enriches entries with `explanation`, `grade` and `reference` notes.
  - Links between an Azkar entry and a HadeethEnc hadith are **candidates** found by matching the dhikr text inside the hadith text. They are listed in a review file and become notes in production only when marked `reviewed`. HadeethEnc's «الفوائد» (benefits) are not mapped to `virtue`; they are not stored for now.
  - `content_sources` row `hadeethenc`: `pending` in production until the written confirmation the content plan already asks for.
- **Repeat count of 1** from a source means one recitation. The reader shows the counter ring, reading «٠ من ١» and then «١ من ١» with a full ring, and one tap completes it.

**Amended 1 Nov 2026 (developer):** this bullet previously said the reader shows «تم» and never «١ من ١». The count of 1 now uses the same ring as every counter (§6), and the «تم» pill is gone. A missing count (null) uses the single ring variant, which has no number. Both complete through the same path, so auto-advance and «إتمام» behave the same for every unit.

## Consequences

- Phase 6 «الأذكار» is added to spec §15 (plan `docs/plans/phase-6.md`). Beta and store review becomes Phase 7.
- The feature ships behind content availability. Until OpenDua answers, production builds have the code, the schema and an empty pack list, so users see no Azkar entry point.
- Explanation, virtue, reference and grade sections are hidden for every entry until a sourced, licensed provider is added.
- Audio controls are absent until a licensed recording exists.

### Release blockers
1. OpenDua's written confirmation of Arabic redistribution rights and attribution.
2. Arabic chapter titles from a permitted named source.
3. A reviewed Quran reference map for the 15 entries with Quran passages (16 text fields, 22 passage occurrences, 21 unique; verified by the step-3 dry run).
4. The Azkar design frames approved by the developer.
5. Audio, only if it is to ship: written streaming, download and re-hosting rights.
