# Step 14 — Hadith search (in-section, Arabic, installed collections)

Plan: `docs/plans/phase-7.md` (step 14 row, "Search" tests row, `HadithCollSearch*` frames row, D13). ADR: `docs/adr/0042-hadith-collections-source.md` §8, `docs/adr/0076-hadith-chapters-from-openiti.md` decision 2 (merged numbers). Approved frames (developer, 7 Nov 2026; ADR 0075): `screens/frames/hadith/HadithCollSearch.html` (idle, recent searches), `HadithCollSearchResults.html` (results), `HadithCollSearchEmpty.html` (no results). Siblings: `step-10-mobile-content.md` (data), `step-12-components.md` (components), `step-13-screens.md` (the stub this step replaces; section "HadithSearchScreen").

Branch `main` (`git branch --show-current`). Do not commit, push, switch branches or add a dependency. No package change, so this ships as an OTA update.

## Read first
1. `.claude/agent-rules.md`, `CLAUDE.md`, `apps/mobile/CLAUDE.md`, `.agents/skills/apple-design/SKILL.md` (load `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `lists-and-tables.md`, `loading.md`, `dark-mode.md`).
2. **Never write religious text.** Tests use the placeholders in `apps/mobile/jest/hadith-ui-fixtures.ts` (`PLACEHOLDER_TEXT`, `searchHitFixture`) and the Latin/«نص تجريبي» fixtures in `src/features/hadith/data/__fixtures__/dev-fixtures.ts`. Never print hadith text or titles in a report: counts, keys and paths only.
3. Re-read `apps/mobile/src/core/i18n/locales/ar.json` and `en.json` before editing. Add keys **inside the existing `hadith.search` object** (it holds `placeholder` and `cancel` today). Never rewrite a file from memory.
4. **Another agent is editing these files right now. Do not edit them:** `src/core/sync/content-tables.ts`, `src/core/db/content/migrations/**`, `src/features/hadith/data/content-repository.ts`, `src/features/hadith/personal/covering-number.ts`, `src/features/hadith/number-text.ts`, and the reader source line (`HadithSourceLine.tsx`, `HadithReaderContent.tsx`, `HadithDetailsPanel.tsx`). Also do not edit `src/features/hadith/types.ts` (the same agent adds `numberFirst` / `numberLast` there), `src/features/search/**` (Quran search must stay byte-identical; read it only), `packages/**`, `apps/api/**`. Run `git status --short apps/mobile` at the start and the end; your diff must contain only the files in "Files" below.
5. `tsconfig` has `noUncheckedIndexedAccess`: guard indexed reads (`at()` from `jest/azkar-test-db.ts` in tests).

## Goal
Replace the step 13b stub `HadithSearchScreen` with the real search: a normalised Arabic query over the installed hadith collections, scope chips (the first chip «الكل», then one per installed collection), result rows with the match highlighted on the original text, paging, recent searches (20, newest first), and the idle and no-results states. A tap on a result opens the reader. Quran and Azkar search are untouched.

## Existing code to reuse (paths checked)
Under `apps/mobile/src/features/hadith/` unless stated.
- `data/search.ts`: `searchHadith(db, rawQuery, { slugs?, limit?, offset? }): HadithSearchPage` and `HADITH_SEARCH_PAGE_SIZE = 50`. It normalises with `queryTokens` (hadith normaliser, never the Quran one), filters by `slugs`, orders by `bm25`, returns `{ hits, hasMore }`. Each hit is `{ item: HadithListItem, collection: HadithCollectionRef, bookNumber, ranges }`, `ranges` being UTF-16 offsets into the stored `item.textAr` (from `data/text-map.ts` `highlightRanges`). It does not return a total or the book title. `text_search` is never returned.
- `data/text-map.ts`: `queryTokens(raw)` (distinct normalised words), `highlightRanges`.
- `data/index.ts` (barrel exports `searchHadith`, `HADITH_SEARCH_PAGE_SIZE`, `hadithResourceId`).
- `hooks/useHadithContent.ts`: `useHadithContent(fallback, read(db), deps)` (re-reads when the catalogue version changes; returns `fallback` on a thrown error; the fallback must be a module-level constant). `hooks`: `useInstalledHadithCollections()` (`HadithCollection[]`, includes `slug`, `number`, `titleAr`, `titleEn`), `useHadithAvailable()`.
- `components/HadithSearchField.tsx` (props `value`, `onChangeText`, `onSubmit(text)`, `onCancel`, `autoFocus?`, `testID?`), `components/HadithSearchResultRow.tsx` (props `hit: Pick<HadithSearchHit,'item'|'collection'|'ranges'>`, `bookTitleText`, `onPress`, `testID?`; already RTL justified, `dhikrList` variant (Amiri) 19 over 36, two lines, `highlightGold` marks, meta line), `components/HadithMeta.tsx`, `components/HadithListHeader.tsx` (`onBack`, no title), `components/HadithStateView.tsx` (kind `'noResults'` already exists with `hadith.states.noResultsTitle/Body`, and `'loading'`, `'offlineEmpty'`, `'notFound'`), `components/HadithListSkeleton.tsx`.
- `titles.ts`: `collectionTitle(c, locale, t)`, `bookTitle({ bookNumber, titleAr, titleEn }, locale, t)` (numbered fallback «كتاب n», never the other language). `format.ts`: `formatHadithNumber`, `formatNumber` from `@/core/i18n`. `number-text.ts`: `hadithNumberText({ hadithNumber, numberFirst?, numberLast? })` (read only; do not edit). `routes.ts`: `hadithHref.reader(slug, hadithNumber)`, `hadithHref.home`, `goBackOr`.
- Shared UI (`@/shared/ui`): `Chip` (`label`, `selected`, `onPress`, `role: 'radio'|'button'`, `layout: 'sheet'|'panel'`, `testID`), `ListRow`, `IconButton`, `UiText`, `Screen`. Layout: `ContentColumn`, `useTabContentBottom` from `@/core/layout`. `useLocale` from `@/core/i18n/useLocale`.
- Quran search pattern (read only): `src/features/search/recentSearches.ts` (MMKV: `readRecentSearches`, `addRecentSearch`, `removeRecentSearch`, `clearRecentSearches`, `RECENT_SEARCHES_MAX = 20`, stored as a JSON string array under `storageKeys.searchRecentQueries`), `src/features/search/components/RecentSearches.tsx`, `src/features/search/hooks/useDebouncedValue.ts` (`useDebouncedValue(value, delayMs)`), `src/features/search/screens/SearchScreen.tsx` (debounce 150 ms, `resultLimit` that grows by `SEARCH_PAGE_SIZE`, `addRecentSearch` on submit and on selecting a result), `src/features/azkar/data/recent-searches.ts` (the Azkar copy of the same pattern with its own key).
- Clear path: `src/core/db/user/clear.ts` (`PERSONAL_TABLES` for `user.db`; `PERSONAL_STORAGE_KEYS` for MMKV) and `src/core/db/user/clear.test.ts`. The Quran history lives in **MMKV** (`storageKeys.searchRecentQueries`), not in `user.db`, and the Azkar one is a second MMKV key in `PERSONAL_STORAGE_KEYS`. **Hadith history therefore goes to MMKV with its own key and is added to `PERSONAL_STORAGE_KEYS`. `PERSONAL_TABLES` does not change** (the `clear.test.ts` list test stays as is). The existing `search_history` table is not used.
- `src/core/storage/mmkv.ts`: `storage`, `storageKeys` (the nested `azkar` object is the model).
- Test helpers: `jest/render-ui.tsx` (`renderUi`, `locales`, `flatStyle`), `jest/azkar-test-db.ts` (`openAzkarContentDb`, `at`), `jest/azkar-ui-fixtures.ts` (`press`), `jest/hadith-ui-fixtures.ts`, `src/features/hadith/data/__fixtures__/dev-fixtures.ts` (`loadHadithDevFixtures`, `FIXTURE_MULTI` slug `fixture-multi`, `FIXTURE_SINGLE` slug `fixture-single`; TEST ONLY), `jest/feature-ui-source.ts` (`rawColorLiteralsInFeature`).

## Behaviour rules

### The query
- Input goes through `searchHadith` only. Diacritics, tatweel, bidi marks and alef/ya/ta-marbuta variants already match (the hadith normaliser); do not normalise in the screen. The raw string is shown in the field as typed.
- Search runs **as the user types**, debounced at **150 ms** (same as Quran), and on keyboard submit (immediate). A query with no token (empty, spaces, only punctuation) is the idle state, not "no results".
- The scope is `null` (all installed) or one slug. Pass `slugs: scope === null ? undefined : [scope]`. A slug that is not installed returns an empty page (handled by `searchHadith`).
- Changing the query or the scope resets paging to the first page and scrolls the list to the top.

### Scope chips
- A wrapping row (`flexWrap: 'wrap'`, gap `theme.space[2]`) in a `View` with `accessibilityRole="radiogroup"` and `accessibilityLabel` `t('hadith.search.scopeLabel')`. First `Chip` «الكل» (`t('hadith.search.scopeAll')`), then one `Chip` per installed collection, **in the fixed collection order** (sort by `collection.number`), label `collectionTitle(c, locale, t)`. `layout="sheet"`, `role="radio"`, `selected` for the active one. The frame's chip is 44 high, radius 18 and 13 pt semibold; use the shared `Chip` as is (its sheet radius and padding are the approved shared tokens) and record any difference in the report.
- Only installed collections get a chip (the list comes from `useInstalledHadithCollections`). With one installed collection the row still shows «الكل» and that one chip.
- The chosen scope is kept in screen state for the visit. It is not persisted (no MMKV key) and it resets to «الكل» if the chosen collection disappears from the installed list.

### Results
- List: `FlatList` of `HadithSearchResultRow`, gap `theme.space[3]` (12) between rows (as in `HadithHadithList`), `keyExtractor` `${resourceId}:${id}`, `onEndReached` (threshold 0.5) calls `loadMore` when `hasMore`. Header of the list: the count line (below).
- Result text is the stored `textAr` rendered by `HadithSearchResultRow`: RTL, justified, Amiri (`dhikrList`), 19 over 36, two lines, matches filled with `highlightGold` by position on the original text. **Do not change how the row renders the text or the ranges.** The text is never trimmed, normalised or re-encoded.
- Count line (frame: «٣٢ نتيجة», 13 pt semibold muted): shows the **total number of matches** for the query and scope, with plural keys, through `formatNumber`. Because `searchHadith` pages with `hasMore` and returns no total, add `countHadithSearch` in `data/search.ts` (see "Files"); the count runs once per query and scope, not per page.
- Paging: `HADITH_SEARCH_PAGE_SIZE` (50) hits per page. State `limit` starts at 50 and grows by 50 on `loadMore` (the Quran pattern; the query re-runs with `{ limit, offset: 0 }`). `loadMore` does nothing when `hasMore` is false. `limit` resets to 50 when the query or scope changes. The list keeps its scroll position while it grows.
- A tap on a row: add the current trimmed query to the recent searches (step "History"), then `router.push(hadithHref.reader(hit.collection.slug, hit.item.hadithNumber))`. It opens the reader at that hadith (the reader's own previous/next and last-read work as usual). The hadith number is text and is never parsed.
- Book title of each hit: `bookTitle({ bookNumber, titleAr, titleEn }, locale, t)`. The hit carries only `bookNumber`, so `searchHadith` is widened (see "Files") to also return the book titles.
- Merged ranges: the row's number segment uses `hadithNumberText({ hadithNumber, numberFirst, numberLast })`. The parallel agent adds optional `numberFirst` / `numberLast` to `HadithListItem` in `types.ts`; **read them as optional** and write the row so it compiles with or without them: `const bounds = hit.item as HadithListItem & { numberFirst?: string | null; numberLast?: string | null };`. When the item has no bounds (or they are equal) the label is the plain `hadithNumber`. The label (not the raw `hadithNumber`) goes to `HadithMeta`'s `hadithNumber` prop and to the row's `accessibilityLabel`; `HadithMeta` applies `formatHadithNumber`, which keeps the en dash. **Do not add `number_first` / `number_last` to the SQL in `search.ts` in this step**: the columns may not exist yet in `content.db`. Until the data layer returns them the label is always the plain number. Open question 1.
- No grade text anywhere; `hadith_grades` is never queried.

### Idle state (query empty)
- If there are recent searches: the section from frame `HadithCollSearch`: a header row with the title «عمليات البحث الأخيرة» (13 pt semibold muted) and a text button «مسح السجل» (13 pt semibold brand, 44 high), then one rounded card (radius 20, hairline border, `surfaceRaised`) of rows, each min height 52: a leading clock icon (muted), the query in **Amiri 17**, a trailing remove `IconButton` (xmark; label «إزالة {query}»). Tapping a row fills the field, runs the search and moves it to the top of the history. Tapping the remove button removes that entry only.
- «مسح السجل» clears **only the hadith history** (not Quran, not Azkar), at once, no confirmation (same as Quran's clear on its own list). It is hidden with the section when the list is empty.
- Below the card, the hint line «البحث يتجاهل التشكيل والهمزات.» (13 over 18, muted). It shows in the idle state whether or not there is history.
- If there is no history the idle state shows only the hint (frame-faithful: no illustration).
- Recent searches are **per device, local only, capped at 20, newest first, de-duplicated by exact trimmed string**. Stored under a new MMKV key (below). Never synced, never sent anywhere.
- «مسح البيانات» (Settings, `clearPersonalData`) removes this key because it is in `PERSONAL_STORAGE_KEYS`.

### History writes
- A query is added to the history when the user **submits** (keyboard search key) or **taps a result**, never on every keystroke. Empty or token-less queries are not stored. Trim only for the stored copy; the field keeps what was typed.

### No-results state
- The query has tokens, the scope has at least one installed collection, and `hits.length === 0`: the chips stay, the list is replaced by `HadithStateView kind="noResults"` (frame `HadithCollSearchEmpty`: icon, «لا توجد نتائج», «جرّب كلمة أخرى أو اختر «الكل».»). No count line.
- Loading: the first search is synchronous (SQLite); show `HadithListSkeleton` only while the content database is not ready (`useContentDb().ready` false, as `SearchScreen` does). No spinner per keystroke.
- If no collection is installed (`useHadithAvailable()` false): show `HadithStateView kind="offlineEmpty"` instead of the chips and the list (the field stays). Do not add a new state kind.

### Layout and accessibility
- Compact and expanded: the same single column in `ContentColumn gutter={theme.size.gutterHome}` (the frames draw the phone only; an expanded window uses the wider centred column; no second pane). Layout follows `useWindowClass()` through `ContentColumn`; no device checks.
- Keep the stub's structure: `HadithListHeader onBack` (back button, no title), then `HadithSearchField`, unchanged, as 13b built it and the developer reviewed it. The frame draws back + field + cancel in one row; if the stub's two-row layout differs from the frame, that is a 13b fidelity issue, reported in Open question 4, not fixed here.
- Cancel (`HadithSearchField` cancel) and back both call `goBackOr(hadithHref.home)`. Cancel does not clear the history.
- Field: `autoFocus`, `returnKeyType` search is already handled by `SearchField`; do not change it.
- Every control is at least 44 high; all text scales with Dynamic Type; no fixed heights on text or rows; `start`/`end`, never `left`/`right`; colours from `useTheme()` / `useContrastColors()`, no `#` or `rgb(` literal. Chips: `accessibilityRole="radio"` with `checked`. Result rows keep the row's existing label. The count line is plain text with `accessibilityLiveRegion="polite"` so the new count is announced after a search.

## Files

### Create (all under `apps/mobile/src/features/hadith/`, each with a colocated test)
| File | Content |
| --- | --- |
| `recent-searches.ts` + `recent-searches.test.ts` | Hadith search history in MMKV. Exports `HADITH_RECENT_SEARCHES_MAX = 20`, `readHadithRecentSearches(): string[]`, `addHadithRecentSearch(query: string): string[]`, `removeHadithRecentSearch(query: string): string[]`, `clearHadithRecentSearches(): string[]` (returns `[]`). Same behaviour as `src/features/search/recentSearches.ts` (trim, drop empty, de-dupe moving to the front, slice to 20, tolerate bad JSON by returning `[]`), key `storageKeys.hadith.searchRecent`. |
| `hooks/useHadithSearch.ts` + `hooks/useHadithSearch.test.tsx` | `useHadithSearch({ query, scope, limit }: { query: string; scope: string \| null; limit: number }): { hits: HadithSearchHit[]; hasMore: boolean; total: number; hasTokens: boolean }`. Uses `useHadithContent` (module-level fallback constant `EMPTY_SEARCH`), `queryTokens(query).length > 0` for `hasTokens`, `searchHadith(db, query, { slugs, limit })` and `countHadithSearch`. Returns the fallback when `hasTokens` is false. Export it from `hooks/index.ts` (one added line; do not reorder the others). |
| `components/HadithScopeChips.tsx` + `.test.tsx` | Props `{ collections: readonly Pick<HadithCollection,'slug'|'number'|'titleAr'|'titleEn'>[]; scope: string \| null; onChange: (scope: string \| null) => void; testID?: string }`. The radiogroup of chips described above. testIDs: `${testID}-all`, `${testID}-${slug}`; default `testID` `hadith-scope-chips`. |
| `components/HadithRecentSearches.tsx` + `.test.tsx` | Props `{ queries: readonly string[]; onSelect: (query: string) => void; onRemove: (query: string) => void; onClear: () => void; testID?: string }`. Returns `null` for an empty list. Title, «مسح السجل» button (`accessibilityRole="button"`, label `t('hadith.search.clearRecent')`), the card of rows (use `ListRow` with `title` in Amiri 17 via `UiText` `style={{ fontFamily: ... }}` from the same Amiri variant `HadithSearchResultRow` uses, a leading clock icon `{ ios: 'clock', android: 'schedule' }` and a trailing `IconButton` `{ ios: 'xmark', android: 'close' }` labelled `t('hadith.search.removeRecent', { query })`). testIDs: `${testID}-clear`, `${testID}-row-${query}`, `${testID}-remove-${query}`; default `hadith-recent-searches`. |
| `components/HadithSearchResults.tsx` + `.test.tsx` | Props `{ hits: readonly HadithSearchResultHit[]; total: number; hasMore: boolean; onLoadMore: () => void; onOpen: (hit: HadithSearchResultHit) => void; bottomInset?: number; header?: ReactElement; testID?: string }`. The `FlatList`, the count line (first list header element), rows via `HadithSearchResultRow` with `bookTitleText` resolved by `bookTitle(...)` and `useLocale()`. Default `testID` `hadith-search-results`; rows `${testID}-item-${resourceId}-${id}`; count `${testID}-count`. |
| `components/HadithSearchHint.tsx` + `.test.tsx` | Props `{ testID?: string }`. The muted 13/18 hint line (`t('hadith.search.hint')`). Default `testID` `hadith-search-hint`. |

### Edit
| File | Change |
| --- | --- |
| `data/search.ts` | (a) Export `type HadithSearchResultHit = HadithSearchHit & { book: { bookNumber: string; titleAr: string \| null; titleEn: string \| null } }` and make `searchHadith` return `{ hits: HadithSearchResultHit[]; hasMore: boolean }` (still assignable to `HadithSearchPage`). In `HitDetailRow` and the `loadHit` SQL add `b.title_ar AS bookTitleAr, b.title_en AS bookTitleEn` and fill `book`. Keep every existing field of the hit unchanged. (b) Export `countHadithSearch(db: SqlExecutor, rawQuery: string, options: { slugs?: readonly string[] } = {}): number`: same tokens, `buildFtsMatch`, `scopeResourceIds`; `SELECT count(*) FROM search_hadith WHERE search_hadith MATCH ? AND resource_id IN (...)`; returns 0 when there is no match expression or no resource ids. Do not touch the ordering, paging or highlight logic. `data/index.ts`: add `countHadithSearch` and the type to the existing `./search` export line. If an existing `search.test.ts` assertion uses `toEqual` on a whole hit, update it for the new `book` field. |
| `components/HadithSearchResultRow.tsx` + `.test.tsx` | Number label through `hadithNumberText` as above (optional `numberFirst`/`numberLast`), used for `HadithMeta` and for the `accessibilityLabel`; drop the now unused direct `formatHadithNumber` import only if nothing else uses it. Existing tests stay green; add the tests listed below. Do not change the preview rendering. |
| `screens/HadithSearchScreen.tsx` + `.test.tsx` | Replace the stub body (see "Screen"). Keep `testID="screen-hadith-search"` and the prop `testID?`. |
| `src/core/storage/mmkv.ts` | In `storageKeys` add `hadith: { searchRecent: 'hadith.searchRecent' }` (a short comment: JSON array of recent Hadith search queries, newest first, capped at 20), after the `azkar` object. No other change. |
| `src/core/db/user/clear.ts` | Add `storageKeys.hadith.searchRecent` to `PERSONAL_STORAGE_KEYS` after `storageKeys.azkar.searchRecent`; add «the Hadith search history» to the doc comment's personal list. `PERSONAL_TABLES` unchanged. |
| `src/core/db/user/clear.test.ts` | In the existing clear test set `storage.set(storageKeys.hadith.searchRecent, JSON.stringify(['FIXTURE query']))` before the clear and assert `storage.contains(...)` is false after, next to the Quran key assertions. |
| `src/core/i18n/locales/ar.json`, `en.json` | New keys in `hadith.search` (below). |

`app/hadith/search.tsx` already renders `HadithSearchScreen` and is registered in `app/_layout.tsx` (13a): no change.

### Screen — `HadithSearchScreen`
State: `value` (field text), `submitted` is not needed; `scope: string | null` (null = all), `limit` (starts `HADITH_SEARCH_PAGE_SIZE`), `recent` (`useState(readHadithRecentSearches)`).
- `debounced = useDebouncedValue(value, 150)`; `query = debounced`. On submit (`onSubmit(text)`) set `value` and also run immediately: simplest is `setValue(text)` plus `addHadithRecentSearch(text)` and `setRecent(...)` (the debounced value follows within 150 ms; a test advances timers).
- `collections = useInstalledHadithCollections()`, sorted by `number`. `scope` falls back to `null` if its slug is not in `collections`.
- `result = useHadithSearch({ query, scope, limit })`. `limit` is reset to 50 in the handlers `onChangeText` and `onChangeScope` (not in an effect).
- Render, inside `Screen` > `ContentColumn`, a column with gap `theme.space[4]`, padding top `theme.space[2]`:
  1. `HadithListHeader onBack`; 2. `HadithSearchField` (as the stub); 3. `HadithScopeChips` (only when `collections.length > 0`);
  4. the body, exactly one of: `HadithListSkeleton` (db not ready); `HadithStateView kind="offlineEmpty"` (no collection installed); idle (`!result.hasTokens`): `HadithRecentSearches` then `HadithSearchHint`; no results (`hasTokens && hits.length === 0`): `HadithStateView kind="noResults"`; results: `HadithSearchResults`.
- `onOpen(hit)`: `setRecent(addHadithRecentSearch(value))`, `router.push(hadithHref.reader(hit.collection.slug, hit.item.hadithNumber))`.
- `bottomInset` from `useTabContentBottom()`.
- The screen contains layout `View`s and wiring only; no one-off styled UI.

### i18n keys (inside `hadith.search`; Arabic first)
| Key | ar | en |
| --- | --- | --- |
| `scopeLabel` | نوع النتائج | Search in |
| `scopeAll` | الكل | All |
| `recentTitle` | عمليات البحث الأخيرة | Recent searches |
| `clearRecent` | مسح السجل | Clear history |
| `removeRecent` | إزالة {{query}} | Remove {{query}} |
| `hint` | البحث يتجاهل التشكيل والهمزات. | Search ignores diacritics and hamza forms. |
| `resultCount_zero` / `_one` / `_two` / `_few` / `_many` / `_other` | لا نتائج / نتيجة واحدة / نتيجتان / {{n}} نتائج / {{n}} نتيجة / {{n}} نتيجة | `_one`: 1 result; `_other`: {{n}} results |

The `{{n}}` value passed to `t` is `formatNumber(total, locale)` (Arabic-Indic digits in Arabic), with `count: total` for plural selection (follow how `hadith.count.hadith_*` is used in `counts.ts`). `states.noResultsTitle` / `noResultsBody` already exist.

## Tests (exact `it` names; Jest, `renderUi`, no network)
Plan tests row for step 14: normalised query matches diacritic and alef variants; scope chips; highlight positions on the original text; empty and no-results; history capped at 20 and cleared by «مسح البيانات»; Quran search unaffected.

- `data/search.test.ts` (extend): `returns the book title fields on each hit`, `countHadithSearch counts all matches across installed collections`, `countHadithSearch honours the slug scope`, `countHadithSearch returns 0 for a query with no token`, `countHadithSearch returns 0 for an uninstalled slug`, `normalised query matches diacritic and alef variants (count)`. The existing tests (diacritic and alef variants, paging, highlight ranges on the original) stay green.
- `recent-searches.test.ts`: `reads an empty list when nothing is stored`, `adds a trimmed query at the front`, `moves a repeated query to the front without duplicating it`, `ignores an empty or whitespace query`, `caps the list at 20 and drops the oldest`, `removes one query`, `clear removes the key and returns an empty list`, `tolerates invalid stored JSON`, `does not touch the Quran or Azkar histories`.
- `hooks/useHadithSearch.test.tsx` (mock `openContentDb` as `hooks.test.tsx` does, or use the fixtures db): `returns nothing and hasTokens false for an empty query`, `finds hits with ranges on the original text`, `scope limits the hits to one collection`, `limit and hasMore page the hits`, `total counts every match, not the page`.
- `components/HadithScopeChips.test.tsx`: `renders in Arabic and English`, `shows All then one chip per collection in the given order`, `marks the selected chip`, `tapping a chip calls onChange with its slug`, `tapping All calls onChange with null`, `chips have the radio role and a 44 point target`, `uses theme colours only`.
- `components/HadithRecentSearches.test.tsx`: `renders in Arabic and English`, `renders nothing for an empty list`, `selecting a row calls onSelect with the query`, `the remove button calls onRemove for that query only`, `the clear button calls onClear`, `rows show the query in the Amiri font`, `buttons have roles and labels`, `uses start and end, never left or right`.
- `components/HadithSearchResults.test.tsx`: `renders in Arabic and English`, `shows the count line with Arabic digits in Arabic`, `renders one row per hit`, `tapping a row calls onOpen with that hit`, `calls onLoadMore at the end only when hasMore`, `the count line is a polite live region`.
- `components/HadithSearchHint.test.tsx`: `renders in Arabic and English`, `is muted caption text`.
- `components/HadithSearchResultRow.test.tsx` (extend): `shows the plain number when the item has no bounds`, `shows the merged range with an en dash when the bounds differ`, `shows the plain number when the bounds are equal`, `the accessibility label carries the merged range`.
- `screens/HadithSearchScreen.test.tsx` (mock `expo-router` as the existing test does, and `react-native-safe-area-context`; seed with `loadHadithDevFixtures`; fake timers for the debounce):
  - keep: `renders the search field and cancel in Arabic and English`, `cancel goes back`;
  - add: `shows the hint and no results before typing`, `shows recent searches before typing and fills the field when one is tapped`, `typing a diacritic or alef variant finds the same hadith as the plain word`, `shows one chip per installed collection after All, in order`, `choosing a collection chip narrows the results`, `choosing All shows every installed collection again`, `highlights the match on the original text by position`, `renders result text right to left and justified`, `shows the result count`, `shows the no-results state and keeps the chips`, `a token-less query is idle, not no-results`, `scrolling to the end loads the next page of 50`, `a new query resets paging`, `tapping a result opens the reader with the slug and number`, `tapping a result saves the query to the history`, `submitting a query saves it to the history`, `typing alone does not save to the history`, `the history keeps 20 entries, newest first`, `remove deletes one recent search`, `clear history empties the hadith history only`, `clear history leaves the Quran and Azkar histories`, `shows the offline-empty state when no collection is installed`, `makes no network request` (spy on `global.fetch`), `shows no grade text`.
- `core/db/user/clear.test.ts` (extend as above): `clears the hadith search history`. Also `src/core/db/user/clear.ts` must keep `PERSONAL_TABLES` equal to the existing list (the existing list test).
- Quran unaffected: run unchanged `src/features/search/**` tests (`recentSearches.test.ts`, `SearchScreen.test.tsx`, `SearchScreen.azkar-scope.test.tsx`) and add to `recent-searches.test.ts` the case above; add no test that edits Quran code. `git diff --stat apps/mobile/src/features/search` must be empty.
- Static: `rawColorLiteralsInFeature` finds no raw colour in the new files.

## Gates (from `apps/mobile`)
```bash
npm run lint && npx tsc --noEmit && npm test
```
Also run `cd apps/mobile && npx jest src/features/hadith src/features/search src/core/db/user` once on its own and report the counts. If a failure is in a file you must not edit, stop and report it.

## Visual check (the orchestrator reviews)
Compare the running app on the iPhone 17 simulator with the three frames at 390 × 844 (`python3 packages/design-tokens/scripts/frame-shot.py HadithCollSearch /tmp/x.png`, same for `HadithCollSearchResults` and `HadithCollSearchEmpty`), light and dark, Arabic. Look at: chip wrap and 44 pt height; justified RTL result text and its last line; Amiri marks not clipped at 19/36; the highlight fill; the count line; the recent card (row height 52, Amiri 17 query); the hint line. Seeding needs placeholder packs (see `step-13-screens.md`, "Seeding"). Known accepted differences (step 12/13): the 48 pt shared search field versus the frame's 46; the shared `EmptyState` icon versus the frame's 120 pt illustration.

## Out of scope
- Searching Quran, Azkar, tafsir or the Names inside the hadith screen, and hadith inside the Quran search screen (no scope chip is added to `src/features/search`).
- Grade filters, grade text, English text search (Arabic only, D7), search inside one book or chapter, sort options, fuzzy or root matching.
- Server search, any network call, syncing the history.
- Migrations, `content-tables.ts`, `content-repository.ts`, `number-text.ts`, `covering-number.ts`, `types.ts`, the reader source line (another agent). Adding `number_first` / `number_last` to the search SQL.
- The expanded-window two-pane search.
- Changing the stub's header layout to the frame's single row (Open question 4).

## Open questions (recommended defaults; the implementer follows the default)
1. **Merged-range label in results.** `numberFirst` / `numberLast` are not yet in `HadithListItem` or the search SQL. *Default:* the row reads them as optional (compiles either way) and shows the plain number until the data layer returns them; a follow-up one-line change adds `e.number_first`, `e.number_last` to `loadHit` once the other agent's migration and `types.ts` are committed. The alternative is to wait for them before starting step 14.
2. **Result count.** The frame shows a total («٣٢ نتيجة»). *Default:* a separate `countHadithSearch` query (cheap on FTS5, once per query and scope). The alternative is a count of loaded hits with a «+» suffix while `hasMore`, which needs no new SQL but is less exact.
3. **History per scope or global.** *Default:* one global hadith history of 20 (as the Quran one), not per collection. A recent query keeps the current scope unchanged when tapped.
4. **Header layout.** The frames draw back, field and cancel in one row; the 13b stub has `HadithListHeader` above `HadithSearchField` (back on its own row). *Default:* keep the stub's structure here and let the orchestrator's visual check decide whether to merge the rows in a small follow-up (a layout change to `HadithSearchField` / `HadithListHeader` is a 13b component edit).
5. **When a query is stored.** *Default:* on keyboard submit and on tapping a result (never per keystroke). The alternative, storing the debounced query when it returns results, saves partial words.
6. **Order of results.** *Default:* `bm25` relevance as built in `searchHadith`, then collection and entry id. A "by collection order" sort is not offered.
7. **Scope kept between visits.** *Default:* not persisted; each visit starts on «الكل» (the Quran search keeps its scope for the session; hadith has no such rule in the plan).
8. **Chip row with many collections.** Ten collections wrap to about three rows on a phone, as the frame's wrap shows. *Default:* keep the wrapping row (frame-faithful); a horizontal scroller needs a frame change (ADR 0010).

## Answers to the open questions (orchestrator, on the developer's behalf, 7 Nov 2026)

All eight defaults are accepted, with one addition: placeholder rows (`source_code` = 'unavailable', empty text) never appear in results. FTS skips them already; assert it in a test. For 1: add `e.number_first, e.number_last` to the search SQL only if `content-tables.ts` already has those columns when you start (check `git log -1 -- apps/mobile/src/core/sync/content-tables.ts`); otherwise leave the documented follow-up.
