# Step 8 — Surah and juz index, and search (App)

**Status: done** (27 Oct 2026). In the working tree, not committed. Do not reimplement. Import `normalizeForSearch` from `@quran/quran-text-check/normalize`. `SearchResultRow` stays a custom row so Quran text is not truncated. The `/read/[verseKey]` route arrives in step 6.

Follow [README.md](README.md). Needs steps 1 and 2 committed. Read also:
- The `Surah index` and `Search` phone frames in `quran-app-screens.html`.
- Spec §12 ("Search": the 150 ms budget).
- Phase 1 step 11: `text_search` is derived from the Imla'i text, and `search_quran` is FTS5.

**Goal:**
- The Mushaf tab's index (surahs and juz).
- The Search screen.
- Both open the reader at a verse.

## Index (`src/features/library/`)

**Components, each with its own test:**
- **`SurahRow`:** number, Arabic name (Amiri), transliterated name, revelation place and ayah count, as a `ListRow`.
- **`JuzRow`:** juz number and start verse.
- **`IndexSegment`:** a `SegmentedControl` switching surahs and juz.

**Screen:** `src/features/library/screens/IndexScreen.tsx`, used by `app/(main)/(mushaf)/index.tsx`.
- A FlashList of 114 surahs or 30 juz.
- Tapping navigates to `read/{verseKey}`.
- The last-read row is pinned at the top (from `useReadingAnchor`).
- On expanded windows the list sits in `ContentColumn`.

## Search (`src/features/search/`)

**Normalization:**
- The query is normalized with `normalizeForSearch` from `@quran/quran-text-check` (the same rules as the index).
- **FTS5 MATCH:** a prefix query over normalized tokens, ranked by bm25 and then `verse_id`. Results are capped at 50, with "show more" paging.

**Query parser:**
- **Surah numbers:** a number 1–114 also offers that surah.
- **Verse references:** `2:255` and Arabic-Indic `٢:٢٥٥` jump directly.
- **Surah names:** a prefix match on Arabic and transliterated names, ignoring diacritics and `ال`.

**Components, each with its own test:**
- **`SearchResultRow`:**
  - The Uthmani text of the ayah **as stored**, with the matched words highlighted by **word position**: map matched normalized tokens to positions through the `words` table (Imla'i per position). Don't highlight by substring on Uthmani.
  - The reference, plus the surah name and ayah number.
- **`SurahResultRow`.**
- **`RecentSearches`:** local only. Phase 2 keeps them in MMKV (cap 20), since `search_history` belongs to `user.db` in Phase 4.

**Screen:** `src/features/search/screens/SearchScreen.tsx` with `SearchField`. Debounce 150 ms. Empty and no-results states.

## Tests

- **Queries** against a `node:sqlite` `content.db` built from the real seed:
  - «الحمد لله» finds 1:2 first.
  - «العالمين» finds 1:2. This is the Imla'i regression from Phase 1.
  - `2:255` and `٢:٢٥٥` resolve, and «البقرة» finds surah 2.
  - Highlighted word positions are correct for 1:2.
- **Performance:** a three-letter query over all 6,236 verses completes in under 150 ms in Node (record the timing in the report). The device budget is checked in step 10.
- **Each component** (README checklist).

## Leave untouched

The schema (report any index that's needed), the reader lists and the tokens.
