# Step 11 — Mobile personal data: saved hadith, last-read place, «مسح البيانات», alias applier (`user.db`)

ADR 0042 §8 (switch remap policy, Accepted), ADR 0027 (v1 is local-only), ADR 0028 (the Quran's last-read stays separate), ADR 0076 decision 2 (merged numbers). Plan: `docs/plans/phase-7.md` (step 11 row and its tests row, line 193 «A saved item never stores a book or chapter key», D14 to D16, open question 14). Spec: `docs/technical-spec.md` §5 line 324 (`hadith_ref_aliases`) and §6 (device tables). Read `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md` and `docs/plans/phase-7/step-10-mobile-content.md` first. **No hadith text of any kind is written in this step.** Fixtures use only marked placeholders (see «Placeholders»).

Branch `main` (check with `git branch --show-current`). Do not commit, push, switch branches or add dependencies.

## Goal

Let the user save hadith and keep one reading place per collection, offline, with no UI:

1. Two `user.db` tables: `hadith_bookmarks` and `hadith_reading_position` (migration `0007`).
2. A repository and live hooks for them, in a new folder `src/features/hadith/personal/`.
3. Both tables added to `PERSONAL_TABLES`, so «مسح البيانات» clears them.
4. The **alias applier**: code that rewrites or marks saved items from `hadith_ref_aliases`. It is finished and tested but **dormant**: nothing calls it, and it changes nothing while the pack has no alias rows (they ship empty until the Sunnah.com switch, step 18).
5. A resolver seam so a saved number that is merged into a covering hadith opens that hadith (ADR 0076).

## Ownership (parallel work)

Step 12 (components) and the step 10 follow-up run at the same time. This step owns **only**:

| Path | |
| --- | --- |
| `apps/mobile/src/features/hadith/personal/**` | new folder, everything below |
| `apps/mobile/src/core/db/user/schema.ts` | add two tables |
| `apps/mobile/src/core/db/user/migrations/0007_hadith_personal.sql`, `migrations/migrations.js`, `migrations/meta/_journal.json` | new migration |
| `apps/mobile/src/core/db/user/clear.ts`, `clear.test.ts` | `PERSONAL_TABLES` and tests |
| `apps/mobile/src/core/db/user/user-db.test.ts` | two exact lists (table names, journal tags) |

**Do not touch** `src/features/hadith/{types.ts,constants.ts,format.ts,data/**,hooks/**,components/**}`, `src/shared/ui`, `app/`, `src/core/i18n`, `src/core/sync`, `src/core/db/content`, `jest/hadith-ui-fixtures.ts`. Read-only imports from `../types` and `../data` are fine (their names are checked below). If a function you need is missing from `../data`, write it inside `personal/` and list it in your report. Do not edit `data/index.ts`.

## Rules for this step

- **A saved item stores `{slug}:{hadith_number}` plus the book number as a fallback place.** Never a database id, `resource_id`, book id or chapter id (plan line 193, D14). No chapter key at all. Hadith and book numbers are **text** (`'3.1'`, `'12a'`): never parse them to numbers.
- **Local only (ADR 0027).** The tables have no `client_updated_at`, `deleted_at` or `dirty` columns and **nothing is written to `outbox`**. Same shape as `azkar_favorites`, `dua_favorites` and `names_favorites`. Deletes are hard deletes.
- **Last-read is one row per collection**, keyed by slug. It is separate from the Quran's `reading_position` table and from the MMKV keys `readerLastVerseKey` and `readerLastPage` (ADR 0028). Do not read or write either.
- No hadith text is stored in `user.db`. Previews come from `content.db` at read time.
- Repositories take the executor first or in a store object, like `src/features/duas/data/favorites-repository.ts` (`{ db: SqlExecutor; now?: () => number }`). SQL with `?` parameters only. Never build SQL from a slug or number by concatenation.
- Offline-first: every write is a synchronous SQLite write on the tap path. No network.
- Known failures on `main`: 4 tests in `__tests__/force-update-ios-route.test.tsx` and `__tests__/tmp-steps.test.tsx` (the second may not exist). They are not yours; any other failing test is.
- `tsconfig.json` has `noUncheckedIndexedAccess: true`. Guard every indexed read; in tests use `at()` from `jest/azkar-test-db.ts`.
- Do not put UI strings anywhere. This step adds no i18n key.

## What already exists (checked)

- `src/core/db/user/schema.ts`: Drizzle schema; local-only tables `azkarFavorites`, `duaFavorites`, `namesFavorites` are the pattern (no sync columns).
- `src/core/db/user/migrations/`: `0000` to `0006`. **The next free number is `0007`.** Snapshots exist only for `0000` to `0004`; `0005_my_duas.sql` and `0006_names_favorites.sql` were written by hand with a journal entry and no snapshot. Do the same for `0007` (do not run `drizzle-kit`). The last journal entry is `idx 6`, `when` `1793535000000`, tag `0006_names_favorites`.
- `src/core/db/user/clear.ts`: `PERSONAL_TABLES` (14 names, `as const`) and `clearLocalUserData(executor?)`, which runs `DELETE FROM` for each and swallows a missing table. `clear.test.ts` asserts the list **exactly** with `toEqual`. `user-db.test.ts` asserts the table names (`creates the personal tables and no content tables`, sorted) and the journal tags (`registers migration 0001 in the journal after 0000`) exactly.
- `jest/azkar-test-db.ts`: `openAzkarUserDb()` (in-memory `user.db` with every user migration), `openAzkarContentDb()` (every content migration, hadith tables included), `at()`.
- `src/features/hadith/data/__fixtures__/dev-fixtures.ts`: `loadHadithDevFixtures(db)`, `FIXTURE_MULTI` (`resourceId -1`, slug `fixture-multi`), `FIXTURE_SINGLE` (`-2`, `fixture-single`). TEST ONLY.
- `src/features/hadith/data` (exported from `data/index.ts`): `hadithResourceId(db, slug)`, `getCollection(db, slug)`, `listBooks(db, slug)`, `getHadith(db, slug, hadithNumber)` (exact `hadith_number` match, lowest `id` wins; returns `HadithDetail`), `HADITH_COLLECTION_SLUGS`. `src/features/hadith/types.ts`: `HadithCollection`, `HadithCollectionRef`, `HadithBook`, `HadithDetail`.
- `content.db` table `hadith_ref_aliases` (Drizzle `hadithRefAliases` in `src/core/db/content/schema.ts`): `resource_id`, `old_number` text, `new_number` text null, `match` text, `since_version` integer; PK (`resource_id`, `old_number`, `since_version`). `match` is one of `exact_text`, `similar_text`, `number_only`, `none` (spec §5 line 324, `apps/api/app/Domains/Hadith/Enums/HadithAliasMatch.php`). Empty until the switch.
- Live-query pattern: `src/features/duas/data/live-queries.ts` and `hooks.ts` (`useIsDuaFavorite`, `useDuaFavoriteCards`: `useLiveQuery` from `drizzle-orm/expo-sqlite`, `useCatalogVersion` revision, `readOr`).
- `src/core/db/content/open.ts` `openContentDb()` and `src/core/db/user/open.ts` `openUserDb()` (both return `{ db, executor }`).
- Step 12's `SavedHadithRow` takes `SavedHadithRowData` (`hadithNumber` and `textAr` null when unverified; `book` null → collection title). `listSavedHadithItems` below returns the data a screen needs to build it; step 13 does the mapping.

**Not in the code today, and not invented here:** how a merged number (ADR 0076) is stored in the pack. No column, table or API field carries a number range (`hadith_entries` has only `hadith_number` and `arabic_number`; step 6b has no brief yet). See «Merged numbers» and Open question 1.

## Files

All paths under `apps/mobile/`.

### Create

| Path | Purpose |
| --- | --- |
| `src/core/db/user/migrations/0007_hadith_personal.sql` | the two tables |
| `src/features/hadith/personal/model.ts` | types |
| `src/features/hadith/personal/covering-number.ts` | `resolveCoveringNumber`, `canonicalHadithNumber` |
| `src/features/hadith/personal/covering-number.test.ts` | |
| `src/features/hadith/personal/bookmarks-repository.ts` | add, remove, toggle, is, list |
| `src/features/hadith/personal/bookmarks-repository.test.ts` | |
| `src/features/hadith/personal/position-repository.ts` | one reading place per collection |
| `src/features/hadith/personal/position-repository.test.ts` | |
| `src/features/hadith/personal/saved-items.ts` | `listSavedHadithItems` (saved rows joined with `content.db`) |
| `src/features/hadith/personal/saved-items.test.ts` | |
| `src/features/hadith/personal/alias-applier.ts` | `applyHadithAliases` |
| `src/features/hadith/personal/alias-applier.test.ts` | |
| `src/features/hadith/personal/live-queries.ts` | Drizzle live queries |
| `src/features/hadith/personal/hooks.ts` | the hooks |
| `src/features/hadith/personal/hooks.test.tsx` | |
| `src/features/hadith/personal/__fixtures__/personal-test-db.ts` | TEST ONLY helpers (see «Tests») |
| `src/features/hadith/personal/index.ts` | public exports |

### Change

| Path | Change |
| --- | --- |
| `src/core/db/user/schema.ts` | add `hadithBookmarks`, `hadithReadingPosition` (section 1) |
| `src/core/db/user/migrations/migrations.js` | import `m0007` and add it to `migrations` |
| `src/core/db/user/migrations/meta/_journal.json` | add entry `idx 7` |
| `src/core/db/user/clear.ts` | append the two table names to `PERSONAL_TABLES` |
| `src/core/db/user/clear.test.ts` | exact list and a new test (section 7) |
| `src/core/db/user/user-db.test.ts` | table-name list and journal tags (section 7) |

## 1. Schema and migration `0007`

### 1.1 Drizzle (`schema.ts`, append at the end)

```ts
// Hadith personal state (ADR 0042 §8, plan step 11). Local only (ADR 0027): no sync columns, no outbox.
// A saved item is a collection slug + hadith number (text), never a database id, book id or chapter id.
// `book_number` is the fallback place when the hadith cannot be confirmed (after a source switch).
// `alias_version` is the highest `hadith_ref_aliases.since_version` already applied to the row (0 = none).
export const hadithBookmarks = sqliteTable(
  'hadith_bookmarks',
  {
    collectionSlug: text('collection_slug').notNull(),
    hadithNumber: text('hadith_number').notNull(),
    bookNumber: text('book_number').notNull(),
    unverified: integer('unverified').notNull().default(0),
    aliasVersion: integer('alias_version').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.collectionSlug, table.hadithNumber] })],
);

// One reading place per collection, separate from the Quran's `reading_position` (ADR 0028).
export const hadithReadingPosition = sqliteTable('hadith_reading_position', {
  collectionSlug: text('collection_slug').primaryKey(),
  hadithNumber: text('hadith_number').notNull(),
  bookNumber: text('book_number').notNull(),
  unverified: integer('unverified').notNull().default(0),
  aliasVersion: integer('alias_version').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});
```

### 1.2 `0007_hadith_personal.sql` (exact text, same style as `0005`)

```sql
CREATE TABLE `hadith_bookmarks` (
	`collection_slug` text NOT NULL,
	`hadith_number` text NOT NULL,
	`book_number` text NOT NULL,
	`unverified` integer DEFAULT 0 NOT NULL,
	`alias_version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`collection_slug`, `hadith_number`)
);
--> statement-breakpoint
CREATE TABLE `hadith_reading_position` (
	`collection_slug` text PRIMARY KEY NOT NULL,
	`hadith_number` text NOT NULL,
	`book_number` text NOT NULL,
	`unverified` integer DEFAULT 0 NOT NULL,
	`alias_version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
```

Column order is exactly as written. Journal entry (append after `idx 6`; `when` must be larger than `1793535000000`):

```json
{ "idx": 7, "version": "6", "when": 1793536000000, "tag": "0007_hadith_personal", "breakpoints": true }
```

`migrations.js`: add `import m0007 from './0007_hadith_personal.sql';` and `m0007` after `m0006` in `migrations` (keep the file's existing layout). Do not create a snapshot, do not edit `migrations.d.ts`.

## 2. Types — `personal/model.ts`

```ts
import type { SqlExecutor } from '@/core/db/sql-executor';
import type { HadithBook, HadithCollectionRef, HadithDetail } from '../types';

/** What the reader knows when the user saves or reads: the slug, the number as printed, and the book number. */
export type HadithPlaceInput = { slug: string; hadithNumber: string; bookNumber: string };

export type SavedHadith = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  /** True after an alias that is not `exact_text` (or an `exact_text` with no new number). Shown at book level. */
  unverified: boolean;
  createdAt: number;
};

export type HadithReadingPlace = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  unverified: boolean;
  updatedAt: number;
};

/**
 * Maps a number that is not a hadith of its own (merged into a covering hadith, ADR 0076) to the covering hadith's
 * `hadith_number`. Returns null when the number is not merged. Never throws.
 */
export type HadithNumberResolver = (content: SqlExecutor, slug: string, hadithNumber: string) => string | null;

/** The databases and clock the repositories use. Every field has a default; tests pass all of them. */
export type HadithPersonalStore = {
  /** `user.db`. Default `openUserDb().executor`. */
  db?: SqlExecutor;
  /** `content.db`. Default `openContentDb().executor`; if it cannot be opened, content lookups are skipped. */
  content?: SqlExecutor;
  /** Default `resolveCoveringNumber`. */
  resolver?: HadithNumberResolver;
  /** Default `Date.now`. */
  now?: () => number;
};

/** One saved hadith joined with `content.db`, for the saved list (step 13 builds `SavedHadithRowData` from it). */
export type SavedHadithItem = {
  saved: SavedHadith;
  /** Null when the collection is not installed. */
  collection: HadithCollectionRef | null;
  /** The saved book number looked up in the collection; null when not installed or the book no longer exists. */
  book: Pick<HadithBook, 'id' | 'bookNumber' | 'titleAr' | 'titleEn'> | null;
  /** The hadith the item opens, confirmed in the pack (merged numbers resolved). Null when unverified or missing. */
  hadith: HadithDetail | null;
  /** `hadith.hadithNumber` when verified, else null. This is the number the reader route opens. */
  openNumber: string | null;
};

export type AliasApplyResult = { rewritten: number; unverified: number; unchanged: number };
```

A tiny helper in the same file is allowed: `export function hadithKey(slug: string, hadithNumber: string): string { return \`${slug}:${hadithNumber}\`; }` for React keys, tests and logs. It is never stored.

## 3. Merged numbers — `personal/covering-number.ts`

ADR 0076 decision 2: a merged number such as `5710` resolves to the covering hadith `5709` (shown as «٥٧٠٩–٥٧١٢»). "The merged numbers resolve to it for lookup, bookmarks and search by number." **The data that says which numbers are merged does not exist yet** (Open question 1). So this step builds the seam and proves the bookmark wiring with a fixture; step 6b supplies the real resolver.

```ts
/** TODO-free seam: the real lookup arrives with the merge data (plan step 6b, Open question 1). Until then no number is merged. */
export const resolveCoveringNumber: HadithNumberResolver = () => null;

/**
 * The number to store or open for `hadithNumber`: itself when `content.db` has a hadith with that exact number
 * (`hadith_entries.hadith_number`, the same test `getHadith` uses), else the resolver's covering number, else the
 * number unchanged. Returns the input when the collection is not installed or `content` is unavailable.
 */
export function canonicalHadithNumber(
  content: SqlExecutor | undefined,
  slug: string,
  hadithNumber: string,
  resolver: HadithNumberResolver = resolveCoveringNumber,
): string
```

Rules:

- No `content` → return `hadithNumber` unchanged.
- Use `hadithResourceId(content, slug)`; `undefined` → unchanged.
- Exact match exists (`SELECT 1 FROM hadith_entries WHERE resource_id = ? AND hadith_number = ? LIMIT 1`) → unchanged. **An exact number always wins over the resolver.**
- Otherwise `resolver(content, slug, hadithNumber)`; use its result only when it is non-null **and** an exact `hadith_entries` row exists for it; else unchanged. (Nothing is pointed at a hadith the pack does not hold.)
- Wrap the resolver call in try/catch; a throw means unchanged.

Where it is used: `addHadithBookmark`/`toggleHadithBookmark` store the **canonical** number, `isHadithBookmarked`/`removeHadithBookmark` look up the canonical number and the raw number, and `listSavedHadithItems` resolves each saved number when it opens the hadith. So a bookmark made on `5710` (a deep link, a search by number) is stored as `5709`, and a row stored as `5710` earlier still opens `5709`.

## 4. Bookmarks — `personal/bookmarks-repository.ts`

All functions take an optional last argument `store?: HadithPersonalStore`; resolve defaults in one private `resolveStore(store)` (db: `store?.db ?? openUserDb().executor`; content: `store?.content` else `openContentDb().executor` inside try/catch, `undefined` on failure; resolver; now).

```ts
export function addHadithBookmark(input: HadithPlaceInput, store?: HadithPersonalStore): void;
export function removeHadithBookmark(slug: string, hadithNumber: string, store?: HadithPersonalStore): void;
/** Adds or removes. Returns whether the hadith is saved afterwards. */
export function toggleHadithBookmark(input: HadithPlaceInput, store?: HadithPersonalStore): boolean;
export function isHadithBookmarked(slug: string, hadithNumber: string, store?: HadithPersonalStore): boolean;
/** Newest first (`created_at DESC`, then `collection_slug`, `hadith_number`). With `slug`, only that collection. */
export function listHadithBookmarks(slug?: string, store?: HadithPersonalStore): SavedHadith[];
```

Rules:

- `add`: `canonical = canonicalHadithNumber(content, slug, hadithNumber, resolver)`; `INSERT OR IGNORE INTO hadith_bookmarks (collection_slug, hadith_number, book_number, unverified, alias_version, created_at) VALUES (?, ?, ?, 0, ?, ?)`. Saving the same hadith twice keeps one row and the first `created_at`. `alias_version` is `currentAliasVersion(content, slug)` (section 6): a row saved after the aliases arrived must not be rewritten by them.
- `remove`: delete the row for the canonical number **and** the row for the raw number (both, in one transaction), so an older row stored under a merged number can still be removed.
- `toggle`: inside `db.transaction`; if `is…` is true remove, else add; return the new state.
- `is…`: true when a row exists for the canonical or the raw number.
- `unverified` is returned as a boolean (`row.unverified === 1`).
- `bookNumber` is stored exactly as given. Empty `slug`, `hadithNumber` or `bookNumber` → throw `new Error('A saved hadith needs a slug, a number and a book number.')`.

## 5. Last-read — `personal/position-repository.ts`

```ts
/** Writes the place, replacing the collection's previous one. Always verified (`unverified` 0). */
export function saveHadithReadingPlace(input: HadithPlaceInput, store?: HadithPersonalStore): void;
export function getHadithReadingPlace(slug: string, store?: HadithPersonalStore): HadithReadingPlace | undefined;
export function listHadithReadingPlaces(store?: HadithPersonalStore): HadithReadingPlace[]; // newest first
export function clearHadithReadingPlace(slug: string, store?: HadithPersonalStore): void;
```

- Upsert: `INSERT INTO hadith_reading_position (collection_slug, hadith_number, book_number, unverified, alias_version, updated_at) VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT(collection_slug) DO UPDATE SET hadith_number = excluded.hadith_number, book_number = excluded.book_number, unverified = 0, alias_version = excluded.alias_version, updated_at = excluded.updated_at`.
- The number is canonicalised exactly as in section 4 (so the place is the covering hadith).
- One row per collection; two collections have two rows.
- It never touches the `reading_position` table or any MMKV key.

## 6. Alias applier — `personal/alias-applier.ts` (dormant)

```ts
/** Highest `since_version` in `hadith_ref_aliases` for the collection, 0 when the collection or the table has none. */
export function currentAliasVersion(content: SqlExecutor | undefined, slug: string): number;

/**
 * ADR 0042 §8, plan open question 14. Applies `hadith_ref_aliases` of `content` to the saved hadith and the reading
 * places of `user`. Safe to call on every start: with no alias rows it reads and writes nothing. Not called by any
 * app code in this step (step 13 or 18 wires it; Open question 2).
 */
export function applyHadithAliases(user: SqlExecutor, content: SqlExecutor): AliasApplyResult;
```

Behaviour, per row of `hadith_bookmarks` and of `hadith_reading_position` with `unverified = 0`:

1. `resourceId = hadithResourceId(content, row.collection_slug)`. Undefined (collection not installed) → count `unchanged`, **do not touch the row**.
2. `number = row.hadith_number`, `version = row.alias_version`, `outcome = 'none'`. Loop: read one alias `SELECT new_number, match, since_version FROM hadith_ref_aliases WHERE resource_id = ? AND old_number = ? AND since_version > ? ORDER BY since_version ASC LIMIT 1` with `(resourceId, number, version)`.
   - No alias → stop.
   - `match === 'exact_text'` and `new_number` non-null → `number = new_number`, `version = since_version`, `outcome = 'rewritten'`, continue the loop (a later switch may move it again).
   - Anything else (`similar_text`, `number_only`, `none`, an unknown value, or `exact_text` with a null `new_number`) → `version = since_version`, `outcome = 'unverified'`, **stop**. The hadith number and `book_number` stay as saved (book-level place); nothing is pointed at a hadith the match could not confirm.
3. `outcome === 'none'` → count `unchanged`, no write (the loop found no alias at all).
4. `rewritten` → in `user.transaction`: bookmarks: update `hadith_number = number`, `alias_version = version`, `book_number` = the book number of the new hadith when `getHadith(content, slug, number)` finds it, else the saved one. If a row for `(slug, number)` already exists, **delete the old row and keep the existing one** (no duplicate, no primary-key error). Reading place: update the same columns in place (the slug is the key).
5. `unverified` → `UPDATE … SET unverified = 1, alias_version = version`.
6. Wrap the whole run in `user.transaction`. If `hadith_ref_aliases` cannot be read (missing table), return zeros without throwing.

Idempotent: after a run every touched row has `alias_version >= since_version` of the last alias used, and the query only reads aliases with a larger `since_version`, so a second run finds none and changes nothing. A row with `unverified = 1` is never touched again by the applier. Do not "re-verify" it in this step (Open question 3).

Why `alias_version`: an alias says «old number X is now Y». A hadith saved **after** the switch uses the new numbering, and its number could equal some old number. Stamping new saves with `currentAliasVersion` stops the applier from moving them.

## 7. Saved list — `personal/saved-items.ts`

```ts
export function listSavedHadithItems(store?: HadithPersonalStore): SavedHadithItem[];
```

For each `listHadithBookmarks(undefined, store)` row, in that order:

- `collection = getCollection(content, slug)` mapped to `HadithCollectionRef` (`slug`, `number`, `titleAr`, `titleEn`, `attributionAr`, `attributionEn`); `null` if not installed or `content` unavailable.
- `book` = the entry of `listBooks(content, slug)` whose `bookNumber === saved.bookNumber`, reduced to `id`, `bookNumber`, `titleAr`, `titleEn`; else `null`.
- Not unverified: `openNumber = canonicalHadithNumber(content, slug, saved.hadithNumber, resolver)`; `hadith = getHadith(content, slug, openNumber) ?? null`. If `hadith` is null, `openNumber` is null.
- Unverified: `hadith = null`, `openNumber = null` (the screen shows it at book level, with no number and no text).
- `saved` is returned as stored. Nothing is trimmed or changed in `hadith.textAr`.
- Wrap content reads so a failure yields `collection: null, book: null, hadith: null, openNumber: null` for that row, never a thrown error.

## 8. Live queries and hooks

`personal/live-queries.ts` (Drizzle, like `duas/data/live-queries.ts`; `import { asc, desc, eq, and } from 'drizzle-orm'`):

```ts
export function liveHadithBookmarksQuery(db: UserDatabase);      // newest first, all rows
export function liveIsHadithBookmarkedQuery(db: UserDatabase, slug: string, hadithNumbers: readonly string[]); // rows for any of the numbers, limit 1; use `inArray`
export function liveHadithReadingPlaceQuery(db: UserDatabase, slug: string);   // limit 1
```

`personal/hooks.ts` (same `readOr` and `useContentRevision` helpers as `duas/data/hooks.ts`; copy the two small helpers, do not import from `duas`):

| Hook | Returns | How |
| --- | --- | --- |
| `useIsHadithBookmarked(slug: string, hadithNumber: string): boolean` | boolean | canonical number via `canonicalHadithNumber(openContentDb().executor, …)` inside `readOr(hadithNumber, …)` and `useMemo` on the content revision; then `useLiveQuery(liveIsHadithBookmarkedQuery(db, slug, [canonical, hadithNumber]), [slug, canonical, hadithNumber])`; true when `data.length > 0` |
| `useHadithBookmarks(): SavedHadith[]` | list, newest first | `useLiveQuery(liveHadithBookmarksQuery(db))`, rows mapped to `SavedHadith` (`unverified` boolean) |
| `useSavedHadithItems(): SavedHadithItem[]` | list | live bookmarks as a dependency, then `readOr([], () => listSavedHadithItems({ db: userExecutor, content: contentExecutor }))`, memoised on the live data and the content revision |
| `useHadithReadingPlace(slug: string): HadithReadingPlace \| undefined` | one place | `useLiveQuery(liveHadithReadingPlaceQuery(db, slug), [slug])` |

Constant fallbacks (`const EMPTY_SAVED: SavedHadithItem[] = []` etc.) so renders stay referentially stable. Mutations are the plain repository functions (`toggleHadithBookmark`, `saveHadithReadingPlace`); there is no mutation hook.

`personal/index.ts` exports every function, hook and type named in sections 2 to 8, and nothing else. No default export.

## 9. «مسح البيانات» — `clear.ts`

Append `'hadith_bookmarks'` and `'hadith_reading_position'` to `PERSONAL_TABLES`, **after** `'names_favorites'`, in that order. No new MMKV key is added (nothing hadith-related is kept in MMKV); do not change `PERSONAL_STORAGE_KEYS` or `SCHEDULE_CACHE_KEYS`. `clearLocalUserData` needs no other change. The settings screen's confirmation text is not touched (step 13 checks whether it lists data kinds).

## 10. Tests

Write all test names exactly. Fixtures: `personal/__fixtures__/personal-test-db.ts` (TEST ONLY, comment says so) exports:

- `openPersonalDbs()` → `{ user: SqlExecutor; content: SqlExecutor; close(): void }`: `openAzkarUserDb()` and `openAzkarContentDb()` plus `loadHadithDevFixtures(content)`.
- `addEntry(content, { resourceId, id, bookId, hadithNumber, position })`: inserts one `hadith_entries` row with `text_ar` `'نص تجريبي — ليس حديثًا'`, `text_search` `'نص تجريبي'` and the other nullable columns null. Use ids that do not collide with the fixtures (start at `9001`).
- `addAlias(content, { resourceId, oldNumber, newNumber, match, sinceVersion })`: inserts one `hadith_ref_aliases` row.
- `mergeResolver(map: Record<string, string>): HadithNumberResolver`: returns `map[hadithNumber] ?? null`.
- `fixedNow(value)`.

Read the fixture's real numbers at run time (`listBookHadith(content, FIXTURE_MULTI.slug, bookId)`), do not hard-code them. Use `FIXTURE_MULTI.slug` as the slug.

### `covering-number.test.ts`
- `it('returns the number unchanged when it exists as a hadith')`
- `it('returns the number unchanged when the collection is not installed')`
- `it('returns the number unchanged when no content database is given')`
- `it('uses the resolver only when the number is not a hadith of its own')` (resolver spy not called for an exact number)
- `it('resolves a merged number to the covering hadith')` (`addEntry` numbers `'5709'` and `'5711'` placeholders; resolver maps `'5710'` → `'5709'`; result `'5709'`)
- `it('ignores a resolver result that is not a hadith in the pack')`
- `it('ignores a resolver that throws')`
- `it('the default resolver merges nothing')` (`resolveCoveringNumber(content, slug, '5710')` is `null`)

### `bookmarks-repository.test.ts`
- `it('adds a bookmark by slug and number and lists it')`
- `it('stores the slug, the number as text and the book number, and no id')` (read the row with `SELECT *`; the columns are exactly `collection_slug, hadith_number, book_number, unverified, alias_version, created_at`; a number like `'3.1'` round-trips as that string)
- `it('saving the same hadith twice keeps one row and the first created_at')`
- `it('removes a bookmark')`
- `it('toggle adds then removes and returns the new state')`
- `it('lists newest first and can filter by collection')`
- `it('keeps bookmarks of two collections apart')`
- `it('writes nothing to the outbox')` (`SELECT count(*) FROM outbox` is 0 after add, toggle and remove)
- `it('rejects an empty slug, number or book number')`
- `it('stores the covering number when a bookmark is made on a merged number')` (see below)
- `it('reports a merged number as bookmarked once its covering hadith is saved')`
- `it('removes a row stored under a merged number')` (insert the raw row `'5710'` by SQL, then `removeHadithBookmark(slug, '5710', …)` with the resolver; no row remains)
- `it('stamps a new bookmark with the current alias version')` (`addAlias` `sinceVersion` 3; after `add`, `alias_version` is 3)
- `it('works with no content database')` (store `content` undefined and `openContentDb` mocked to throw: the row is saved under the given number)

### `position-repository.test.ts`
- `it('has no place before anything is read')`
- `it('saves one place per collection and replaces the previous one')`
- `it('keeps two collections apart')`
- `it('lists places newest first')`
- `it('always saves a verified place')` (a row with `unverified = 1` becomes `0` after a save)
- `it('stores the covering number for a merged number')`
- `it('does not touch the Quran reading_position table')` (that table has 0 rows after saves)
- `it('clears one collection')`

### `saved-items.test.ts`
- `it('returns the saved hadith with its collection, book and confirmed hadith')`
- `it('opens the covering hadith for a bookmark stored on a merged number')` — **the merged-number proof.** Fixture: `addEntry` hadith `'5709'` (`text_ar` placeholder) and `'5711'` in a fixture book; insert the bookmark row for `'5710'` directly by SQL (book number of that book); `mergeResolver({ '5710': '5709' })`. `listSavedHadithItems` returns one item with `saved.hadithNumber === '5710'` (as stored), `openNumber === '5709'` and `hadith.hadithNumber === '5709'`, `hadith.textAr` equal to the inserted bytes.
- `it('opens the covering hadith for a bookmark made on a merged number')` — same fixture, but made through `addHadithBookmark` on `'5710'`: the stored row is `'5709'` and the item opens `'5709'`.
- `it('leaves a number that matches nothing as a missing hadith')` (`hadith` null, `openNumber` null, `collection` and `book` still set)
- `it('returns collection and book null when the collection is not installed')`
- `it('returns no hadith and no number for an unverified item')`
- `it('uses the book number as the fallback place')` (an unverified item still resolves `book` from `book_number`)
- `it('does not throw when content reads fail')`

### `alias-applier.test.ts`
- `it('does nothing while the pack has no aliases')` (rows and `alias_version` unchanged; result `{ rewritten: 0, unverified: 0, unchanged: n }`)
- `it('rewrites an exact_text alias silently')` (bookmark and reading place move to the new number, stay `unverified` 0, `alias_version` set to `since_version`)
- `it('takes the new book number from the new hadith')`
- `it('marks similar_text, number_only and none as unverified and keeps the number and book')` (one row each)
- `it('marks an exact_text alias with no new number as unverified')`
- `it('leaves an item with no alias unchanged')`
- `it('leaves items of an uninstalled collection untouched and applies later')` (the collection installs, the next run applies)
- `it('applying twice changes nothing')` (snapshot of both tables equal after run 1 and run 2; second result has `rewritten: 0, unverified: 0`)
- `it('follows an item through two switches')` (aliases `A→B` at version 1 and `B→C` at version 2; one run ends at `C`, `alias_version` 2)
- `it('does not rewrite an item saved after the aliases arrived')` (alias `100 → 101` version 1; add the bookmark `100` through `addHadithBookmark` after the alias row exists; run the applier; still `100`)
- `it('keeps the existing bookmark when a rewrite would duplicate it')` (bookmarks `100` and `101`, alias `100 → 101`; one row `101` remains and the original `101` keeps its `created_at`)
- `it('never touches an item that is already unverified')`
- `it('stores no database id after a rewrite')` (the table columns are unchanged)
- `it('returns zeros when the alias table is missing')`

### `hooks.test.tsx`
Mock `drizzle-orm/expo-sqlite` (`useLiveQuery`), `@/core/db/user/open` and `@/core/db/content/open` (return the in-memory executors from `openPersonalDbs()`); the live query is mocked to return a fixed array. Use `renderHook`.
- `it('useIsHadithBookmarked is false when the live query returns nothing')`
- `it('useIsHadithBookmarked is true when the live query returns a row')`
- `it('useIsHadithBookmarked asks for the covering number and the given number')` (assert the numbers passed to `liveIsHadithBookmarkedQuery`)
- `it('useHadithBookmarks maps unverified to a boolean')`
- `it('useSavedHadithItems joins the live rows with the pack')`
- `it('useSavedHadithItems returns the stable empty list when the content database cannot be opened')`
- `it('useHadithReadingPlace returns undefined, then the live row')`

### `clear.test.ts`
- Update `defines the expected personal tables list`: the list ends `…'names_favorites', 'hadith_bookmarks', 'hadith_reading_position'`.
- New `it('empties the hadith personal tables')`: insert one row into each by SQL (placeholder slug `'fixture-multi'`, numbers `'1'`, book `'1'`), run `clearLocalUserData(executor)`, assert both counts are 0 (same style as `empties the azkar personal tables`).

### `user-db.test.ts`
- Add `'hadith_bookmarks'` and `'hadith_reading_position'` to the sorted table list in `creates the personal tables and no content tables` (alphabetical: `hadith_bookmarks`, `hadith_reading_position` go after `dua_favorites` and before `highlights`).
- Add `'0007_hadith_personal'` to the journal tags list.
- Add `it('creates the two hadith personal tables with their keys')`: column names in order and primary keys exactly as section 1.2 (use the `PRAGMA table_info` pattern the neighbouring azkar test uses).

### Existing tests that must still pass unchanged
The Azkar, Duas and Names suites, `__tests__/content-db.test.ts`, every `src/features/hadith/**` test written by steps 10 and 12.

## Placeholders

Arabic text in tests and fixtures is only: `نص تجريبي — ليس حديثًا` and `نص تجريبي ٥٧٠٩ — ليس حديثًا`. Slugs: `fixture-multi`, `fixture-single`. Numbers like `'5709'`, `'5710'`, `'100'`, `'3.1'` are test data, not references to real hadith. Never write a real hadith, collection title, book title or ruling.

## Gates

macOS toolchain. From `apps/mobile`, after `source ~/.nvm/nvm.sh && nvm use` (Node 26):

1. `npm run lint && npx tsc --noEmit && npm test`
2. Failures are allowed only in `__tests__/force-update-ios-route.test.tsx` and `__tests__/tmp-steps.test.tsx` (the known 4). Report any other failing test name.
3. Before you start and at the end run `git status --short -- src/features/hadith/types.ts src/features/hadith/constants.ts src/features/hadith/data src/features/hadith/hooks src/features/hadith/components src/shared/ui app src/core/i18n src/core/sync src/core/db/content`. The two outputs must be identical (other agents may change these; you must not).
4. `git status --short -- src/core/db/user` shows only: `schema.ts`, `clear.ts`, `clear.test.ts`, `user-db.test.ts`, `migrations/0007_hadith_personal.sql`, `migrations/migrations.js`, `migrations/meta/_journal.json`. No existing migration file was edited.
5. No id is stored: the only `resource_id`, `book_id` or `chapter_id` in `src/features/hadith/personal` (non-test files) are in SQL against `content.db` in `alias-applier.ts`, `covering-number.ts` and `saved-items.ts`; none in `bookmarks-repository.ts`, `position-repository.ts`, `live-queries.ts` or the schema.
6. No hadith religious text was written: the only Arabic strings added are the placeholders above.

No API, OpenAPI or contract change, no dependency change, no `app.config.ts` or native change: `composer qa`, the contract generator, `npm-audit` and `expo-doctor` are not required. The change is JavaScript plus a SQLite migration, so it ships by OTA (CLAUDE.md, «Releasing»).

## Out of scope

- Any component, screen, route, i18n key, settings text, Home tile or Menu card (steps 12 and 13). `HadithBookmarkButton` and `SavedHadithRow` already exist from step 12; wiring them to these hooks is step 13.
- **Calling `applyHadithAliases` from anywhere.** No startup hook, no post-sync call (Open question 2).
- The real merged-number resolver and the pack data behind it (step 6b).
- Re-verifying an `unverified` item later (Open question 3).
- Cloud sync, accounts, outbox rows (ADR 0027), `deleted_at` tombstones.
- Notes, highlights or reminders on hadith (not in Phase 7).
- Any change to `content.db`, the sync files, the pack contract, `types.ts`, `data/**` or `hooks/**` of the hadith feature.
- Shared sheets, export or share of saved items.

## Open questions (recommended defaults are what this brief builds)

1. **Where merged numbers live is undecided.** ADR 0076 decision 2 says merged numbers "resolve to the covering hadith for lookup, bookmarks and search by number", and the plan assigns the repository work to step 10 or 6b. Neither has it: step 10's `getHadith` is an exact `hadith_number` match, no pack table or column carries a range, and `docs/plans/phase-7/` has no 6b brief. *Default:* step 11 builds the seam (`HadithNumberResolver`, `canonicalHadithNumber`, default resolver returns null) and proves bookmarks with a fixture resolver. Step 6b must choose the storage (for example a nullable range-end text column on `hadith_entries`, which is a pack-contract change, or rows in `hadith_ref_aliases`, which is **not** suitable because aliases mean a source switch) and then replace `resolveCoveringNumber`'s body and add a test on real merged data. Step 10's `getHadith` should use the same resolver so reader links and bookmarks agree. Decision for the developer and orchestrator.
2. **Who calls the alias applier, and when?** The plan says only "dormant until a pack has aliases". *Default:* nobody in this step. Wire it at step 18 (the Sunnah.com switch), after a content sync that installed a pack with alias rows: `applyHadithAliases(openUserDb().executor, openContentDb().executor)`. Because it is a no-op with no rows, step 13 may call it earlier (after each hadith install) without harm if the developer prefers.
3. **Can an `unverified` item recover?** Plan open question 14 says non-`exact_text` matches become unverified at book level and stops there. *Default:* terminal. The row stays at book level, shown with «حديث محفوظ سابقًا» (frame `HadithCollSavedUnverified`); the user removes it or saves the hadith again. A later `exact_text` alias does not revive it. No UI for re-saving is built here.
4. **Local-only wording vs. the plan's `user.db` sync mentions.** ADR 0027 keeps the `outbox` table dormant and says personal data never leaves the device. *Default:* the two tables follow the Azkar/Duas/Names pattern (no sync columns, hard deletes). If sync returns later, a new migration adds the columns; nothing here blocks it.
5. **Stored book number in the stored row vs. plan line 193.** The plan says the fallback place is "a book number"; `book_number` is `NOT NULL`. A reader screen that opens a hadith without a book (not possible today, every hadith has one) would have no value. *Default:* keep `NOT NULL`; `add…` throws on an empty value.
6. **Plan step 11 row names `PERSONAL_TABLES` "updated" only.** `user-db.test.ts` also asserts exact lists and must change. *Default:* included in this brief (section 10). No spec change is needed; spec §6 does not list `user.db` tables.

## Answers to the open questions (orchestrator, on the developer's behalf, 7 Nov 2026)

All six defaults are accepted as written:
1. Step 11 builds the resolver seam; step 6b picks the storage and replaces `resolveCoveringNumber`; step 10's `getHadith` adopts the same resolver in 6b.
2. Nobody calls the alias applier now.
3. An `unverified` item stays unverified.
4. No sync columns; hard deletes.
5. Throw on an empty slug, number or book.
6. Include `user-db.test.ts`.

Naming: step 13 maps `SavedHadithItem` → `SavedHadithRowData`.
