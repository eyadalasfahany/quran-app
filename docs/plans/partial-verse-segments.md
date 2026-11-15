# Partial-verse Quran segments (ADR 0092 step 6) — plan

Date: 15 Nov 2026 · Status: **proposed** · Parent plan: `docs/plans/single-topics-audio.md` step 6 · Branch: `main`.
Agents write no religious text: fixtures use marked placeholders (`.claude/agent-rules.md`). The review sheet below is generated from source data by a command, never typed.

## Rests on

- ADR 0092 decision 4 (accepted 15 Nov 2026): entries 50, 206, 207, 235, 236 come back; a Quran segment can point to part of a verse, word to word; the app shows only the quoted words. Amends ADR 0090 decision 2.
- ADR 0031 §4 (Quran passages are `quran` segments that reference `verses`, never copied text; the app renders them from `content.db.verses`; ADR 0014: no translation) and §11 (reviewed map; production accepts only `reviewed` rows; `excluded_entries`).
- ADR 0014, ADR 0048 (Mushaf renders Tanzil text byte-for-byte), CLAUDE.md non-negotiable 1 (Quran text never altered, checksum test must pass), 3 (no QF data in the binary; only the Tanzil seed is bundled).
- Spec §5 (MySQL `azkar_segments`), §6 (device schema, `azkar_segments` row at line 394), §7 (pack pipeline, additive columns), §12 (Audio → ayah, word highlight uses QF word positions), §14 (Text integrity: `packages/quran-text-check`, 6,236-ayah checksum on the mirror and inside a built pack).
- `docs/plans/word-segmentation-plan.md` and `packages/quran-text-check/word-map-report.md`: the Tanzil word split aligned to QF positions (77,433 word rows, 6,236 end rows, 0 mismatches).
- `docs/plans/phase-6/quran-map-review.md` (review sheet format; entries 50, 206, 207, 235, 236 are `unmatched`).
- Code read: `apps/api/config/azkar.php` (`excluded_entries`, `quran_references`), `config/azkar_quran_map.php`, `config/azkar_hisnmuslim_quran_map.php`, `app/Domains/Azkar/Services/{QuranSegmenter,QuranReferencePolicy,QuranSpanMatcher,AzkarTransformer,AzkarImportFingerprint}.php`, `Console/QuranMapCandidatesCommand.php`, `database/migrations/2026_10_31_100004_create_azkar_segments_table.php`, `2026_11_15_132754_add_entry_class_and_home_to_azkar_entries_table.php` (additive precedent), `app/Domains/Content/Packs/PackSchema.php`, `apps/mobile/src/core/db/content/schema.ts`, `migrations/0017_azkar_entry_home.sql`, `core/sync/content-tables.ts` (`packSelectList`, `assertPackMeta`), `features/azkar/data/{content-repository,quran-segments,share-text,preview}.ts`, `features/azkar/components/DhikrText.tsx`, `features/reader/data/words.ts`, `apps/mobile/scripts/build-content-seed.mjs`, `tests/Feature/Azkar/ExcludedEntriesConfigTest.php`.

## What the app already has at word level

- **Device `words` table** (bundled Tanzil seed, `schema.ts` `words`, filled by `build-content-seed.mjs`): `verse_id`, `position` (1-based), `char_type` (`word` or `end`), `text_uthmani`, `text_imlaei`. The seed script asserts that joining a verse's `word` rows with one space gives the verse's `text_uthmani` exactly (`assertRejoins`), so a run of words joined with one space is a byte-exact substring of the stored verse. Pause marks attach to the previous word, `۞` to the next.
- **The position is already the app-wide word identity.** It is QF's `position_in_verse` (word-segmentation plan), the key of `recitation_timings.segments` (`[position, startMs, endMs]`, `activeWord` in `playerStore`) and of `word_layouts.position_in_verse`. Known audio merges (2:181, 8:6, 13:37) affect timings only, not the text positions.
- The API has no `words` table. It has the Tanzil files (`packages/quran-text-check/data/`) and `TanzilReader`, and the matcher works on the standard-orthography text (`QuranSpanMatcher`), because OpenDua spells like Tanzil Simple, not Uthmani.

## Design

### Definition

A `quran` segment covers `quran_surah:quran_verse_from` to `quran_surah:quran_verse_to` (`null` = the same verse). New nullable columns:

- `word_from`: the first quoted word, a `words.position` **in `quran_verse_from`**. Null means from the start of that verse.
- `word_to`: the last quoted word, a `words.position` **in the last verse of the segment** (`quran_verse_to`, or `quran_verse_from` when `quran_verse_to` is null). Null means to the end of that verse.
- Both null is today's meaning (whole verses): every existing row stays valid unchanged. Verses between the two ends are whole. Only `char_type = 'word'` positions count (the `end` row is never a quoted word).
- A partial segment is a single range inside one surah (a span that crosses surahs, `ranges` in the map, stays whole). Rules, checked at import: both numbers are integers ≥ 1; `word_to` ≥ `word_from` when it is the same verse; each number ≤ the verse's word count; at least one is non-null on a partial row; a partial row must not carry `ranges`.

### MySQL and pack

- Migration `add_word_range_to_azkar_segments_table`: `word_from`, `word_to` as `unsignedSmallInteger()->nullable()` after `quran_verse_to`; `down()` drops both. No data change.
- `PackSchema::azkarSegments()`: add `self::integer('word_from', nullable: true)` and `self::integer('word_to', nullable: true)` after `quran_verse_to`. `PackSchema::VERSION` stays 1: the app asserts `pack_schema_version = '1'` exactly (`content-sync.ts` `assertPackMeta`), so bumping it would reject every pack on every installed app. This is the same additive route as `azkar_entries.home` (ADR 0091) and the partial-surah audio range.
- `EloquentPackSnapshotRepository` already reads `azkar_segments` with `toBase()`; the pack builder writes the columns the schema lists. `AzkarSegment` model needs no change.
- `AzkarImportFingerprint`: `word_from` and `word_to` join a segment's input **only when non-null**, so with no partial rows the fingerprint is today's and no version bumps (the rule it already applies to `entry_class`, `home` and the topic config).

### Device

- `schema.ts` `azkarSegments`: `wordFrom: integer('word_from')`, `wordTo: integer('word_to')`; `npm run db:generate` produces `0018_*.sql` (`ALTER TABLE azkar_segments ADD word_from integer; ... ADD word_to integer;`), the `meta/0018_snapshot.json` and the `migrations.js` entry. Additive, runs in the same `useMigrations` path as 0017. The seed is untouched (it has no azkar tables: `seed-schema.ts`), so the bundled seed asset does not change.
- `content-tables.ts` `azkar_segments`: add `integer('word_from', true)`, `integer('word_to', true)` (nullable).
- `model.ts` `AzkarSegment`: `wordFrom: number | null`, `wordTo: number | null`; `content-repository.ts` `SEGMENT_SELECT` adds `s.word_from AS wordFrom, s.word_to AS wordTo`; `asSegment` carries them.

### Renderer (never from the source text)

- New `getQuranSegmentTexts(db, segment): string[]` in `features/azkar/data/content-repository.ts`:
  - Not a `quran` segment, or no `quran_surah` and `quran_verse_from`: `[]` (today's rule).
  - Both word numbers null: the verse `text_uthmani` list, exactly as `getQuranSegmentVerses` returns today.
  - Partial: for each verse id in the range read `words` (`features/reader/data/words.ts` `getWords`), keep `char_type = 'word'`; in the first verse drop positions below `word_from`; in the last verse drop positions above `word_to`; join each verse's kept `text_uthmani` with one space (the same join the seed asserts), one string per verse.
  - **Never fall back to the whole verse.** If the verse, the words, or either position is missing or out of range, or the result is empty, return `[]`. Today an unresolved segment already renders nothing (`resolveQuranVerses`); a partial segment must not show words the dhikr does not quote.
- `quran-segments.ts` `resolveQuranVerses` calls `getQuranSegmentTexts`. Its consumers (`DhikrText`, `AzkarPlayerDhikr`, `AzkarReaderScreen`, `DuaHisnDetailScreen`, `azkarShareText`) already take `readonly string[]` per segment and wrap the join in ﴿ ﴾, so they need no change. `getQuranSegmentVerses` stays for any caller that needs `VerseRecord`s; nothing but `quran-segments.ts` uses it today.
- `preview.ts` `quranRefs` (card captions «surah · ayah») is unchanged: it names the verse, not the words (open question 5).
- No word is normalized, trimmed, re-encoded or re-ordered. Trailing waqf marks that Tanzil attaches to the last quoted word appear as stored (open question 4).

### Map rows and import

- Rows for these entries live in `config/azkar_quran_map.php` (keys `hisn-al-muslim:entry-0000NN:<variation>:<n>`, the same keys as the `excluded_entries` and as today's `unmatched` rows for these five). `config/azkar_hisnmuslim_quran_map.php` (keys `hisn-al-muslim-hm:<n>`, the hisnmuslim.com adapter, ADR 0031 §12) holds parallel `unmatched` rows for 50; it is touched only if that adapter is used for these entries (open question 6).
- Row shape, additive: `[surah, verse_from, verse_to|null, 'status' => ..., 'evidence' => ..., 'check' => ..., 'words' => [word_from|null, word_to|null]]`. A row without `words` is whole-verse, as now.
- `QuranReferencePolicy::parse`: validates `words` (shape, integers, no `ranges` together with `words`); `parse` returns `words`. `decide` is unchanged: production accepts `reviewed` only.
- `AzkarTransformer` (`referencesFor`, map builder around line 875): carries the optional `words` with each range; `QuranSegmenter::segment` emits `word_from` and `word_to` on the segment (null otherwise) and keeps the integrity check (segments must reassemble to the source text, spans outside ﴿ ﴾ stay byte-for-byte).
- **Word validation needs word counts on the API side.** Recommended: a committed, generated `apps/api/resources/quran/word-map.json` (per verse key, the aligned Imlaei word list; count = length), emitted by the `packages/quran-text-check` word-map CLI, with a TS test that regenerating it gives the same file and that each verse's words rejoin to the Tanzil Simple line. A new `QuranWordMap` service reads it for import validation and for candidate generation. (Open question 3: this adds roughly 1 MB of derived Quran-text data to `apps/api`; the alternative is a 6,236-number counts file for validation only, with candidates located by a dev-only script outside the repo.)
- **Candidate generation.** Extend `QuranMapCandidatesCommand`/`QuranReferenceCandidates`: for an `unmatched` span whose best same-surah window is a verse or run of verses, find the contiguous word run of the aligned Imlaei words whose normalized text (`SearchTextNormalizer`) equals the normalized span, and write a `candidate` row with `words` and `evidence` `words:exact` or `words:similarity:0.xx`. Re-running keeps `reviewed` rows (existing rule). The existing `QuranSpanMatcher` thresholds stay for whole-verse rows.
- **Review sheet (generated, not typed):** `azkar:quran-map-candidates --words-sheet` writes `docs/plans/partial-verse-segments/words.md` in the style of `docs/plans/phase-6/quran-map-review.md`: for each of the five entries, the OpenDua span as received, then the Tanzil Uthmani verse with every word numbered, the proposed range marked, and a decision line. Claude does not mark rows `reviewed`; the developer does.
- `config/azkar.php` `excluded_entries`: an entry's key is removed only in the same change that holds `reviewed` rows for all its spans (entry 207 has two variations, outbound and returning; entries 235 and 236 are `standard:2`). `ExcludedEntriesConfigTest` already fails if an excluded entry holds a reviewed row, so the two cannot drift. Entries not reviewed stay excluded with `quran_partial_verse`. `EntryTypesCheckCommand` / `config/azkar_entry_types.php` need the entries' types decided (they are new to the import) in the same reviewed way as ADR 0091's types (open question 7).
- `azkar:topics-check` (ADR 0092 step 1) must see the returning entries: each needs a chapter with a reviewed topic row, or keeps its OpenDua tags until then (ADR 0092 decision 2).

### Checksum and integrity

- No Quran text is stored or altered. `verses` and `words` are the bundled Tanzil seed. `azkar_segments` holds numbers only. The 6,236-ayah checksum (`packages/quran-text-check`, on the backend mirror and inside a built pack) does not read these tables and is unaffected; the CI job still runs.
- New tests prove the renderer cannot alter text: for every verse in the Tanzil seed fixture, a segment whole-verse equals `verses.text_uthmani`; for the five reviewed ranges the joined words equal the exact substring of `verses.text_uthmani` between the first and last word (computed by splitting on the space the seed uses), so the result is byte-for-byte a slice of the stored verse.

### Compatibility, both ways

- **New app, old pack** (a pack built before the columns): `packSelectList` reads a nullable column the pack lacks as `NULL`, so `word_from` and `word_to` are NULL and every segment is whole, which is what such a pack means (the five entries are not in it).
- **Old app, new pack**: `content-sync.ts` copies only the columns it knows, so the extra columns are ignored and the pack installs. **The partial segments then render as whole verses on an old app.** This is the one unsafe direction: it shows words the dhikr does not quote. Mitigation by release order, not by code: ship the app by `eas update --channel production` first (JS only), wait for adoption, and only then take the five entries out of `excluded_entries` and deploy the API. The window for an app that has not yet applied its OTA update is one launch. There is no per-pack minimum app version in the manifest (`ContentManifestEntryResource` has none), and ADR 0060's minimum native version cannot see OTA. Alternatives are open question 1.
- **Change feed:** the Azkar group is pack-only (`EloquentPackSnapshotRepository` snapshot); `azkar_segments` has no `content_changes` entity, so no feed payload carries the new columns. The resource version bump from the new rows makes devices replace the pack (existing path).

### Native fingerprint

None. SQL migration and TS only: `drizzle` migrations are bundled JS (`migrations.js`), no package, no config plugin, no native field, no asset the fingerprint hashes (the seed `.db` is not changed). OTA. Gate: `npx eas-cli fingerprint:compare`.

### Design

Rendering reuses `DhikrText` and `QuranText` unchanged, so the existing Azkar and Duas frames still show the layout. Only if the developer wants a visible partial mark (ellipsis or a different bracket, open question 5) a new frame state is drawn first (ADR 0087): `screens/frames/azkar/AzkarReaderPartialVerse.html`, caption «(بانتظار الموافقة)», rebuilt with `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`, reviewed at `design/<stack>/AzkarReader/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded%2Clandscape`. Generated `design/` files are never hand-edited.

## Steps (each one reviewable change; API: `composer qa`; app: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; contract unaffected, `packages/api-contract` has no segment type, confirm with `npm run generate -w @quran/api-contract` and `git diff --exit-code`)

| # | Step | Files | Tests |
| --- | --- | --- | --- |
| 6.0 | Analysis only: run the matcher on the five entries, report per span: the verse(s), and whether the span is a contiguous word run of one verse, spans several verses, or is not in ﴿ ﴾ at all. No config change | none (command output) | n/a; decides open questions 2 and 7 |
| 6.1 | Word data for the API | `packages/quran-text-check/src/word-map-cli.ts` export, `apps/api/resources/quran/word-map.json`, `app/Support/QuranText/QuranWordMap.php` | TS: regenerate equals committed file, rejoin per verse; Pest: counts total 77,433 words and 6,236 verses, lookup, rejects out-of-range |
| 6.2 | MySQL and pack columns | new migration, `PackSchema.php`, `AzkarImportFingerprint.php` | Pest: migration up and down; pack build contains the columns; `PackSchemaTest`; fingerprint unchanged with all-null, changes with a partial row |
| 6.3 | Map row, policy, segmenter, transformer | `QuranReferencePolicy.php`, `QuranSegmenter.php`, `AzkarTransformer.php`, map header comments | Pest: `words` parse accepted and rejected shapes (negative, from > to, beyond the count, with `ranges`, both null); a partial row yields a segment with the numbers; whole-verse rows unchanged; segments reassemble to the source; candidate row blocked in production, reviewed accepted; a placeholder fixture only |
| 6.4 | Candidates and the review sheet | `QuranMapCandidatesCommand.php`, `QuranReferenceCandidates.php`, `docs/plans/partial-verse-segments/words.md` (generated) | Pest: exact run found, near-run is a candidate with similarity, no run stays `unmatched`, re-run keeps `reviewed`; the sheet lists the five entries and no unmarked row says `reviewed` |
| 6.5 | Device schema and read model | `core/db/content/schema.ts`, new `migrations/0018_*`, `meta`, `migrations.js`, `core/sync/content-tables.ts`, `features/azkar/data/{model,content-repository}.ts` | Jest: migration applies on a content.db at 0017; `content-tables` lists the columns; a pack without the columns installs (existing `packSelectList` test extended), a pack with them installs; `asSegment` carries them; `features/azkar/data/__fixtures__/dev-fixtures` stays valid |
| 6.6 | Renderer | `content-repository.ts` `getQuranSegmentTexts`, `quran-segments.ts` | Jest: whole verse equals `verses.text_uthmani`; partial in one verse; partial across two verses (first from, last to); only `word_from`; only `word_to`; missing words or out-of-range returns `[]` (never the whole verse); the joined result is an exact slice of `verses.text_uthmani`; share text and `DhikrText` show the same words; RTL and Dua Hisn detail show the same words |
| 6.7 | Developer review, then data | `config/azkar_quran_map.php` (rows marked `reviewed` by the developer), `config/azkar.php` (remove the reviewed entries from `excluded_entries`), `config/azkar_entry_types.php` and chapter topics for them | Pest: `ExcludedEntriesConfigTest`, `EntryTypesCheckCommandTest`, `azkar:topics-check`; import report lists the entries; production import still blocks any `candidate` row; counts: production ships 262 + N of 267 |
| 6.8 | Release (order matters) | none | Release the app OTA first (`fingerprint:compare`, `eas update --channel production`); then deploy the API (pack rebuild at web start). Device check on the five entries in Azkar and Duas: only the quoted words, in the Quran face, RTL; screenshot against the frame; `node .github/scripts/npm-audit.mjs` and `composer audit` only if dependencies changed (none expected) |

## Gates

- Every `words` range in production is `reviewed` by the developer after comparing with the generated sheet (religious interpretation: which words the dhikr quotes). No agent marks a row `reviewed`.
- Rendering from `content.db` only; renderer test proves an exact byte slice of `verses.text_uthmani` and that nothing falls back to the whole verse.
- `packages/quran-text-check` checksum passes (API and app CI); the API word-map file test passes.
- Pack schema version unchanged (1); a new-app/old-pack and an old-app/new-pack install test pass.
- Release order respected (app OTA before the entries leave `excluded_entries`).
- Fingerprint unchanged for the app (`fingerprint:compare`); API fingerprint unchanged while no partial row exists.
- `composer qa`; mobile checks; `npm run generate -w @quran/api-contract` with no diff.

## Risks

- **Old app shows the whole verse** for a partial segment (above). Release order is the only mitigation unless the developer picks an alternative (question 1). This is a content-accuracy risk, not a crash.
- **The five entries may not be what the plan assumes.** They are `unmatched` (best guesses 0.50 to 0.70 similarity), not known partial quotes. Some may quote text outside ﴿ ﴾, span two surahs, or paraphrase. Step 6.0 decides before any schema work ships data; the schema itself is useful only if at least one row is a contiguous word run.
- **Word positions are only as stable as the Tanzil word map.** A change to the split rules (`word-exceptions.json`) would move positions for stored rows. Mitigation: the API word-map file is generated and committed, and a test fails when the rules change a verse a reviewed row points at.
- **Pause marks at the quote's edges.** Tanzil attaches waqf and sajdah marks to the preceding word, so a quote ending mid-verse may end with a pause sign the dhikr text lacks. Shown as stored (non-negotiable 1).
- **Imlaei–Uthmani merges.** The matcher locates words in Simple text, positions are Uthmani's; they align by construction (word-segmentation plan step 6), but the five verses must be checked in the sheet (the sheet prints both).
- **Search and browse side effects.** New Quran segments add these entries to surah browse names (`features/azkar/data/hooks.ts` `azkar.browse.quranSurahName`) and the Duas grouping; Azkar search ignores Quran segments (spec §12). Check the entries land in the intended topic (ADR 0092 step 1).
- **Size**: the API word-map JSON (question 3).

## Open questions for the developer

1. **Old app on a new pack (blocks 6.7 and 6.8).** Accept release-order mitigation (app OTA first, then API) with a one-launch window, or require a safer encoding so an old app renders nothing for a partial segment (for example the partial row's `quran_verse_from` stays null on old-format readers and the real range lives in new columns; this costs a second set of columns and a fallback in the new renderer)? Recommended: the release-order route.
2. **Which words (blocks 6.7).** Only the developer can say which words each of the five entries quotes. Confirm the review will use the generated sheet (OpenDua span next to numbered Tanzil words) in 6.4. If a span is not a contiguous run in one surah, say whether the entry stays excluded.
3. **API word data (blocks 6.1).** Commit `apps/api/resources/quran/word-map.json` (about 1 MB, derived from the Tanzil Simple text, Tanzil licence notice carried) or only a verse word-count file? Recommended: the full aligned Imlaei map, for exact-run candidate matching.
4. **Pause signs at the quote's edges (blocks 6.7).** Show the stored word with its attached sign (recommended, text never altered), or choose the range to end before it?
5. **A visible partial mark (blocks the frame, optional).** Is the existing ﴿ ﴾ wrapper enough, or should a partial quote show an ellipsis or a different bracket? And should the card caption name the verse only (today) or say it is part of the verse? A new mark needs a frame approved first (ADR 0087).
6. **hisnmuslim.com adapter (not blocking).** Do the `hisn-al-muslim-hm` map rows for these entries need the same word ranges, or is only the OpenDua map used for production?
7. **Entry types and topics for the returning entries (blocks 6.7).** Each needs a reviewed entry type (`config/azkar_entry_types.php`, ADR 0091) and a topic row (ADR 0092 step 1) before it appears; say whether they are azkar, duas, or both homes.
8. **ADR.** ADR 0092 decision 4 already approves the direction. A short ADR 0093 «Word-range Quran segments» should record the definition above (`word_from` and `word_to` as `words.position`, partial rule, no fallback to the whole verse, release order) and the spec §5, §6, §12 lines; it needs the developer's acceptance before 6.2. Draft it with 6.1 if wanted.
