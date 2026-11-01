# Step 5 — Azkar mobile data layer

ADR 0031, `phase-6.md` (progress periods). Builds on step 2 (tables) and the `repeat_group` / `repeat_times` columns (migration `0009`). **No UI in this step.** Pure logic is unit-tested; repositories are tested against real SQLite, the way `src/features/khatma/data/repository.test.ts` and `__tests__/content-db.test.ts` do it.

## Files (`apps/mobile/src/features/azkar/`)
- `data/model.ts`: TS types for the content rows (reuse the enum constants exported from `src/core/db/content/schema.ts` and `src/core/db/user/schema.ts`) and the view types below.
- `data/content-repository.ts`: reads `content.db` through `SqlExecutor`, like `src/features/reader/data/verses.ts`. Functions take `db: SqlExecutor` first.
- `data/reader-units.ts`: pure. Builds reader units from items.
- `data/progress.ts`: pure. Period keys and the count state machine.
- `data/progress-repository.ts`, `data/favorites-repository.ts`: `user.db`, following `src/features/khatma/data/repository.ts` (injectable `db`, `now`).
- `data/live-queries.ts` and `data/hooks.ts`: Drizzle `useLiveQuery` for progress and favourites, like `features/khatma/data/hooks.ts`.
- `data/search.ts`, `data/share-text.ts`, `data/font-scale.ts`.
- `data/dev-fixtures.ts`: development fixtures (rules below).
- `data/index.ts`: barrel.

## Content repository
- `hasAzkarContent(db)`: true when any `azkar_entries` row exists. This gates every entry point.
- `listCategories(db)`: from `azkar_categories`, ordered by `kind` (`session` first) then `position`, each with its item count (see units).
- `listCategoryEntries(db, categoryId)`: entries joined through `azkar_entry_categories`, ordered by chapter `number`, then entry `position`. The variation filter keeps items whose `variation_key` equals the link's `variation_key`, or every variation when the link says `'*'`.
- `getEntry(db, entryKey)`: the entry with its chapter, items (ordered by `variation_key`, `position`), segments (ordered by `position`), notes grouped by `kind`, and recordings.
- `getQuranSegmentVerses(db, segment)`: uses `src/features/reader/data/verses.ts` (`verseKeyToId` + `getVerseRange`) to return the `VerseRecord`s for surah `quran_surah`, verses `quran_verse_from`..`(quran_verse_to ?? quran_verse_from)`. Quran text is **never** read from azkar tables.

## Reader units (`reader-units.ts`)
A unit is what the reader shows and counts.
- Walk an entry's items for one variation in order.
- `instruction` and `narration` items attach to the next counted unit as `preface`. Those after the last counted unit attach to it as `afterword`.
- Each `recitation` item outside a repeat group is one unit: `requiredCount = item.required_count` (nullable, **never defaulted**), `unitKey = item.item_key`.
- Items sharing a `repeat_group` form one unit: `requiredCount = repeat_times`, `unitKey = <entry_key>:<variation_key>:g<repeat_group>`; its items appear inside it in order.
- An entry with no `recitation` item becomes one unit of kind `read` with `requiredCount = null`.
- A category's units are the concatenation over its entries, in entry order.
- **Language:** a step with `text_ar = null` (English-only upstream) is dropped from the Arabic interface, and shown from `text_en` in the English one. `text_en` and `transliteration` are shown only in English and only when non-null.

## Progress (`progress.ts`, pure)
- `scopeKey`: `category:<id>` for a category, `entry:<entry_key>` for a single entry (opened from search or favourites).
- `periodKey(period, now, ctx)`:
  - `daily` → local `YYYY-MM-DD`
  - `nightly` → the local date of the evening (before 12:00 counts as the previous date)
  - `per_prayer` → `YYYY-MM-DD:<prayer>` of the most recent prayer passed, from `timesFor` / `prevPrayer` in `src/features/salah/data/prayer-times.ts` with the stored coordinates; without coordinates, falls back to `daily`
  - `session` → `'session'`

  The policy comes from `azkar_categories.progress_period`; `entry:` scopes use `session`. This is UX bookkeeping only; nothing claims when a dhikr is due.
- `applyTap(state, requiredCount, now)`:
  - with a count: increments `currentCount` up to `requiredCount`, never past it; sets `completedAt` when it reaches the count
  - with `requiredCount = null`: one tap marks the unit done (`completedAt`) and `currentCount` stays 0
  - after completion: a no-op
  - **double-tap guard:** a tap within 120 ms of the previous accepted tap is ignored. Return `{ state, accepted, completedNow }`.
- `categoryProgress(units, rows)` → `{ done, total }`.

## Repositories (`user.db`)
- **Progress:**
  - `getProgressRows(scope, period)`
  - `recordTap(scope, period, unitKey, requiredCount)`: one transaction applying `applyTap` and upserting `azkar_progress`; returns `completedNow` for haptics
  - `resetUnit(...)`, `resetScope(scope, period)`
  - `lastActiveScope()`: the scope with the newest `updated_at` that has at least one incomplete unit in its current period; drives Home's «تابع» card
- **Favourites:** `toggleFavorite(entryKey)`, `isFavorite`, `listFavorites` (newest first).
- **Hooks** (Drizzle `useLiveQuery`):
  - `useAzkarAvailable`, `useAzkarCategories`, `useCategoryUnits(categoryId)`, `useEntry(entryKey)`
  - `useScopeProgress(scope, period)`, `useFavorites`, `useIsFavorite(entryKey)`, `useContinueScope`
  - `useAzkarSearch(query)`, `useAzkarFontScale`

## Search (`search.ts`)
- Normalise the query with `normalizeForSearch` (`src/core/text/normalizeForSearch.ts`).
- Match `azkar_segments.text_search LIKE %q%` (text segments only; never Quran segments) and category labels (from i18n `azkar.categories.<id>`, matched in the hook).
- Return entry hits with the first matching segment's original `text_ar` for preview, plus the matched range found by mapping the normalised match back to the original string. If the range can't be mapped, highlight nothing; never alter the text.
- Under 150 ms on the full dataset (a few hundred rows). Cap at 50 results.

## Share text (`share-text.ts`)
`azkarShareText(unit, resolveQuran, source)`:
- The unit's Arabic segments joined in order, with Quran segments resolved to `text_uthmani` from `verses`, wrapped in ﴿ ﴾.
- Then a blank line, then the source line from i18n: «حصن المسلم · {{number}}» / "Hisn al-Muslim · {{number}}".
- Nothing else. No app name, no link, no emoji.

## Font scale (`font-scale.ts`)
MMKV key `storageKeys.azkar.fontScale` (add an `azkar` block to `src/core/storage/mmkv.ts`). Steps `[0.85, 1, 1.15, 1.3, 1.5]`, default 1, following the reader's font-scale stepper values if they exist; check `src/features/reader/settings`. It multiplies the `dhikr` type token.

## Development fixtures (`dev-fixtures.ts`)
- `loadAzkarDevFixtures(executor)` inserts a tiny set with `resource_id = -1`. Call it from `app/_layout.tsx` after the content DB is ready, **only** when `__DEV__ && process.env.EXPO_PUBLIC_AZKAR_DEV_FIXTURES === '1'`. It is idempotent: it deletes `resource_id = -1` rows first.
- **Every text is a marked placeholder:** «نص تجريبي ١ — ليس ذكرًا», `text_en` "FIXTURE text 1 — not a dhikr", `source_version = 'taybah-dev-fixture'`, `review_status = 'sourced'`, chapter `title_ar = '[عنوان تجريبي]'`.
- **Cover:** the 5 session categories and 3 browse categories; items with counts 3 and 33; items with `required_count = null`; one repeat group (`repeat_times` 3); one instruction-only entry; one entry with a preface instruction; one item with a `quran` segment pointing to an existing verse (1:1); one English-only narration (`text_ar = null`); no recordings; no notes, except one entry with one note of each kind (placeholder text, `source_name = '[مصدر تجريبي]'`) to exercise the details sheet.
- Add `EXPO_PUBLIC_AZKAR_DEV_FIXTURES=` (empty) to `apps/mobile/.env.example` with a comment.

## Tests
`*.test.ts` beside each file:
- reader units: prefaces, afterwords, repeat groups, `read` units, null counts kept null, variation filter, English-only steps per locale
- `periodKey` for every policy, including the noon edge for `nightly`, the prayer boundary for `per_prayer` (fixed coordinates and dates), the no-coordinates fallback, and a DST date (`Europe/London` 2026-03-29)
- `applyTap`: increments, cap, completion, null count → done, no-op after done, the 120 ms guard
- repositories against SQLite: tap persistence, reset, favourites toggle and order, `lastActiveScope`, `PERSONAL_TABLES` clearing
- search: normalisation and preview text unchanged
- share text exact output, with Quran resolved from `verses`
- fixtures load twice without duplicates, and are never loaded when the flag is off
