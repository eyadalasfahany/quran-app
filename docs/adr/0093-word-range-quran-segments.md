# 0093 — Word-range Quran segments (15 Nov 2026)

Date: 2026-11-15 · Status: **accepted** (developer, 15 Nov 2026: «apply all» for the proposed ranges of entries 50, 235 and 236, and the release order below). Plan: `docs/plans/partial-verse-segments.md`. Review sheet: `docs/plans/partial-verse-segments/words.md`. Amends ADR 0031 §4 (a `quran` segment covers whole verses) and ADR 0090 decision 2 (partial verses stay excluded until a segment can point to part of a verse). Implements ADR 0092 decision 4.

## Context

- ADR 0092 decision 4 brings back five Hisn al-Muslim entries (50, 206, 207, 235, 236) that quote part of a verse. A `quran` segment could only point to whole verses, so showing their Quran would show words the dhikr does not quote.
- The device already has the word split: the bundled Tanzil seed holds `words` (`verse_id`, `position`, `char_type`, `text_uthmani`, `text_imlaei`), with positions aligned to QF's `position_in_verse` (word-segmentation plan, `packages/quran-text-check/word-map-report.md`). The seed asserts that a verse's `word` rows joined with one space equal its stored text, so a run of words is an exact slice of the stored verse.

## Decision

1. **Definition.** A `quran` segment covers `quran_surah:quran_verse_from` to `quran_surah:quran_verse_to` (`null` = the same verse). Two new nullable columns on `azkar_segments`:
   - `word_from`: the first quoted word, a `words.position` in `quran_verse_from`. Null means from the start of that verse.
   - `word_to`: the last quoted word, a `words.position` in the last verse of the segment (`quran_verse_to`, or `quran_verse_from` when that is null). Null means to the end of that verse.
   - Both null is the existing meaning: whole verses. Verses between the two ends are whole. Only `char_type = 'word'` positions count; the `end` row is never a quoted word.
2. **Partial rule.** A partial segment is one range inside one surah. A span that crosses surahs stays whole. At import: both numbers are integers ≥ 1; `word_to` ≥ `word_from` in one verse; each number ≤ its verse's word count; every verse of the range is in the word map; a `words` pair of two nulls is refused (a whole verse has no `words`); a partial row never carries `ranges`.
3. **Word data.** The API gets `apps/api/resources/quran/word-map.json`, generated from the Tanzil seed by `npm run word-map:api` in `packages/quran-text-check` (Imla'i words per verse, 6,236 verses, 77,433 words) and checked by a TS test. It is derived Quran data in the repository, as the developer approved, and is never rendered by the API.
4. **No fallback to the whole verse.** The app renders a partial segment only from `words` by position. If a verse, a word or a position is missing, out of range, or the words do not run 1..n with the end row at n+1, the segment renders nothing (`[]`). It never shows the whole verse.
5. **Stored as written.** Trailing pause or sajdah marks that Tanzil attaches to the last quoted word are shown as stored. Nothing is trimmed, normalised or re-encoded.
6. **Schema versions.** Migration `add_word_range_to_azkar_segments_table` (MySQL, additive). Pack schema version stays `1`; the new columns are additive, and an older app ignores them. The device migration is `0019_azkar_segment_word_range` (SQLite, additive). A column is added to the native fingerprint input only when set, so a re-import with no partial rows has the same fingerprint.
7. **Entries returned.** Entries 50, 235 and 236 are `reviewed` with their word range, evidence `developer:2026-11-15`, and leave `excluded_entries`. Entry 50's type row copies its chapter-mate's (`dua`); 235 and 236 have no chapter-mate, so they keep no type row (they stay in Azkar, as any entry without a reviewed type). Entries 206 and 207 have no exact word run (one quoted token is not a Quran word in the word map), so they stay excluded with `quran_partial_verse`.
8. **Release order (developer, 15 Nov 2026).** The app ships first, as an EAS Update (JavaScript only, `fingerprint:compare` must match), then the API deploys and the pack rebuilds with the three entries. An app that has not taken the update would show a partial segment as the whole verse for one launch. This is the only unsafe window, and it is handled by order, not by code. The runbook (`docs/runbooks/railway-release.md`, «Partial-verse segments») says so.
9. **Visible mark.** No partial-quote mark is added. The existing ﴿ ﴾ wrapper and the card captions are unchanged, so no new frame is needed (ADR 0087).

## Consequences

- Spec §5 (MySQL `azkar_segments`), §6 (device `azkar_segments`) and §12 (search, which still ignores Quran segments) carry a pointer line to this ADR.
- The review of which words each entry quotes stays with the developer: `words.md` lists keys, verse references and word positions only, never text, and only the developer marks a row `reviewed`.
- Entries 206 and 207 remain open. Their ADR 0090 guess (43:13 and 43:14) differs from the matcher's (26:190–191); neither has an exact run, so they need a decision from the developer before any mapping.
