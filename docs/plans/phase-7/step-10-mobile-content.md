# Step 10 — Mobile data layer: content (`content.db`, install, repositories, hooks, search index)

ADR 0042 §5, §6, §8, §11 (Accepted, with the 2 Nov and 7 Nov amendments), ADR 0045 (no switch), ADR 0076 (chapters, proposed). Plan: `docs/plans/phase-7.md` (step 10 row and its tests row, "Data design", D8, D11, D13, D14, D16, RB24). Spec: `docs/technical-spec.md` §6 (hadith pack tables, `search_hadith`), §12 (Search). Read `.claude/agent-rules.md`, `apps/mobile/CLAUDE.md` and `docs/plans/phase-7/step-04-pack-contract.md` (pack tables, answers section) first. **No hadith text of any kind is written in this step.** Fixtures and tests use only the placeholders listed under "Placeholders".

Branch `main` (check with `git branch --show-current`). Do not commit, push, switch branches or add dependencies.

## Goal

Make an installed hadith collection readable and searchable offline, with no UI:

1. A `content.db` migration for the six pack tables, plus the FTS5 table `search_hadith`.
2. Pack install for `hadith_collections` that fills `search_hadith` in the same transaction, and that survives the next sync.
3. Repositories (collections, books, chapters, hadith, one hadith by slug + number, previous/next, search) returning the view-model types in `src/features/hadith/types.ts`.
4. Hooks that read them.
5. Test-only fixtures with placeholder rows.

Step 12 (components) is being written in parallel in `src/features/hadith/components` and `src/shared/ui`. **Step 10 does not touch those folders.** Step 12 imports only `src/features/hadith/types.ts`. Step 10 imports nothing from `components/`.

## Rules for this step

- Hadith text is stored and returned **byte for byte**. Nothing trims, normalises, re-encodes or truncates `text_ar`, `title_ar`, `author_ar` or `attribution_ar`. Only `text_search` is normalised, and it arrives already normalised in the pack. The device normalises **queries** with `normalizeHadithForSearch` (`src/core/text/normalizeHadithForSearch.ts`, committed in step 4). Never use `normalizeForSearch` (the Quran normaliser) for hadith.
- A null Arabic title stays `null` in the view model. Do not substitute «مجموعة {n}» / «كتاب {n}» here; the UI does that with i18n labels and the numbers the view model provides (`HadithCollection.number`, `HadithBook.bookNumber`).
- **There is no grade in any view model.** The `hadith_grades` table is created (it ships in the pack, empty through Phase 7) and is **never read** by step 10 code. No `text_en` or `narrator_en` either: Arabic only (D7).
- **No personal data in `content.db`** (bookmarks and the last-read place are `user.db`, step 11). Nothing here writes to `user.db`.
- Repositories take `db: SqlExecutor` first (`src/core/db/sql-executor.ts`), like `src/features/duas/data/content-repository.ts`. Use SQL strings with `?` parameters. Never build SQL from a slug or a number by string concatenation.
- Hadith numbers are **text** (`'3.1'`, `'2787.2'`). Never parse them to numbers, never sort by them numerically; order by `position`.
- Frontend rules apply to later steps. This step builds no component, screen, route or i18n key.
- Known failures on `main` and on HEAD: 4 tests in `__tests__/force-update-ios-route.test.tsx` and `__tests__/tmp-steps.test.tsx`. `tmp-steps.test.tsx` is not in `__tests__` today (it may be a temporary file); failures are allowed only in those two files, if present. They are not yours; do not touch or look for them. Any other failing test is yours to fix or report.
- `tsconfig.json` has `noUncheckedIndexedAccess: true`. Every indexed read (`array[i]`, `record[key]`) is `T | undefined`. Guard it, or use `at()` in tests (`jest/azkar-test-db.ts`). In `mapHadithText` build `starts`/`ends` with `push` and read them with a helper `function unit(list: readonly number[], index: number): number { const value = list[index]; if (value === undefined) { throw new Error('Offset index out of range.'); } return value; }`; in repositories read `rows[0]` into a variable and test for `undefined` before use.

## What already exists (checked)

- `src/core/sync/content-tables.ts` already has the `hadith_collections` group (13/9/9/12/5/5 columns, no `source_id`, `source_key`, `source_text_sha256`, `source_version`, `imported_at`; the step 4 answers). Its `deleteResourceSql` lists `hadith_ref_aliases, hadith_grades, hadith_entries, hadith_chapters, hadith_books, hadith_collections`. **The table columns of this group are the column order of the `content.db` tables below.**
- `src/core/sync/content-sync.ts`: `importPack` → `copyPack` runs `deleteResourceSql`, then `INSERT INTO t (cols) SELECT cols FROM pack.t` per table, then `upsertInstalled`, all inside one `db.transaction`. It is generic and needs one small hook (see section 3).
- `src/core/sync/install-resource.ts` (`installResourceWith`) installs any resource whose group has a schema. For `tafsirs` it calls `keepOnDemand(...)` so the next `syncContent` does not remove the pack. Hadith needs the same (section 3).
- `src/core/sync/selection.ts`: hadith is **not** auto-selected (step 4). A collection installs only when the user picks it (step 13 calls `installResource`).
- `src/core/text/normalizeHadithForSearch.ts` (+ test) and the golden fixture `apps/api/tests/Fixtures/hadith/search-normalizer.json` exist.
- `src/features/search/ftsQuery.ts` exports `buildFtsMatch(tokens)` (quoted prefix terms joined by space). Reuse it.
- `src/features/duas/data/{content-repository,hooks,availability,active-resource}.ts` and `src/features/azkar/data/__fixtures__/dev-fixtures.ts` are the patterns to copy (injected `SqlExecutor`, `useCatalogVersion` revision, `readOr`, test-only fixtures with `resource_id = -1`).
- Jest helpers: `jest/node-sqlite-executor.ts` (`openNodeSqlite`), `jest/apply-content-migrations.ts` (`applyContentMigrations`), `jest/azkar-test-db.ts` (`openAzkarContentDb`, `at`). `openAzkarContentDb()` applies every content migration, so it will include the hadith tables once the migration exists.
- Installed state lives in `installed_resources` (`"group"`, `resource_id`); the catalogue of everything the manifest lists lives in `catalog_resources` (`resource_id`, `"group"`, `name`, `name_ar`, `version`, `pack_size_bytes`). The manifest does **not** carry the collection slug (Open question 1).

## Files

All paths are under `apps/mobile/`.

### Create

| Path | Purpose |
| --- | --- |
| `src/features/hadith/types.ts` | The view-model types step 12 imports (section 1). Types only, no runtime code |
| `src/features/hadith/data/collection-order.ts` | `HADITH_COLLECTION_SLUGS`, `hadithCollectionNumber()` |
| `src/features/hadith/data/collection-order.test.ts` | |
| `src/features/hadith/data/active-resource.ts` | `hadithResourceId(db, slug)` |
| `src/features/hadith/data/content-repository.ts` | Collections, books, chapters, hadith lists, one hadith, neighbours, catalogue |
| `src/features/hadith/data/content-repository.test.ts` | |
| `src/features/hadith/data/text-map.ts` | `mapHadithText`, `queryTokens`, `highlightRanges` |
| `src/features/hadith/data/text-map.test.ts` | |
| `src/features/hadith/data/search.ts` | `searchHadith` |
| `src/features/hadith/data/search.test.ts` | |
| `src/features/hadith/data/install.test.ts` | Pack install, FTS fill, rollback, survives sync |
| `src/features/hadith/data/content-migration.test.ts` | Migration, Drizzle schema and `content-tables.ts` agree; no personal data |
| `src/features/hadith/data/__fixtures__/dev-fixtures.ts` | TEST ONLY placeholder rows (section 6) |
| `src/features/hadith/data/__fixtures__/dev-fixtures.test.ts` | |
| `src/features/hadith/data/__fixtures__/pack-test-helpers.ts` | TEST ONLY: builds a gzipped hadith pack and install deps for `install.test.ts` |
| `src/features/hadith/data/index.ts` | Barrel of the repository functions and types |
| `src/features/hadith/hooks/useHadithContent.ts` | Shared read hook |
| `src/features/hadith/hooks/useHadithContent.test.tsx` | |
| `src/features/hadith/hooks/hooks.ts` | The named hooks (section 5), one function each |
| `src/features/hadith/hooks/hooks.test.tsx` | |
| `src/features/hadith/hooks/index.ts` | Barrel |
| `src/core/db/content/migrations/0012_hadith_tables.sql` | Generated, then edited (section 2) |
| `src/core/db/content/migrations/0013_search_hadith.sql` | Custom (FTS5) |
| `src/core/db/content/migrations/meta/0012_snapshot.json`, `0013_snapshot.json` | Written by drizzle-kit |

### Change

| Path | Change |
| --- | --- |
| `src/core/db/content/schema.ts` | Append six Drizzle tables at the end (section 2) |
| `src/core/db/content/migrations/meta/_journal.json`, `migrations.js`, `migrations.d.ts` (if drizzle-kit rewrites it) | Written by drizzle-kit |
| `src/core/sync/content-tables.ts` | `ContentGroupSchema` gains optional `afterImportSql`; the hadith group sets it and adds a `search_hadith` delete (section 3) |
| `src/core/sync/content-sync.ts` | `copyPack` runs `afterImportSql` inside its transaction (section 3) |
| `src/core/sync/install-resource.ts` | `hadith_collections` is kept on demand (section 3) |
| `__tests__/content-sync.test.ts` | Only if a test there asserts the exact shape of `ContentGroupSchema` (it does not today; run it and leave it alone otherwise) |

Do **not** edit: `src/features/hadith/components/**`, `src/shared/ui/**`, `app/**`, `src/core/i18n/**`, `src/core/db/user/**` (step 11 owns `PERSONAL_TABLES`), `selection.ts`, `src/core/text/**`, `packages/**`, anything under `apps/api`, `docs/technical-spec.md`, ADRs, `docs/plans/phase-7.md`.

## 1. View-model types — `src/features/hadith/types.ts`

Exactly these exports and field names. Step 12 builds components against them; renaming a field breaks that work. Types only: no functions, no constants, no imports. **Write this file first, verbatim, before anything else**, so step 12 can import it at once. Before you start run `ls src/features/hadith`: if `types.ts` or other files already exist (step 12 runs in parallel), keep any exports step 12 added, reconcile the names with this section, and state it in your report.

```ts
/** One installed hadith collection (a row of `hadith_collections`, one per pack). */
export type HadithCollection = {
  resourceId: number;
  id: number;
  /** Canonical slug: `bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi40`, `qudsi40`, `shahwaliullah40`. */
  slug: string;
  /** Fixed 1-based position of the slug in `HADITH_COLLECTION_SLUGS`; the n in «مجموعة {n}». Unknown slugs get 11, 12, ... in resource-id order. */
  number: number;
  /** Null until the developer supplies the name. Never replaced here. */
  titleAr: string | null;
  titleEn: string | null;
  authorAr: string | null;
  authorEn: string | null;
  attributionAr: string;
  attributionEn: string;
  sourceUrl: string | null;
  totalHadith: number;
  booksCount: number;
  /** The id of the only book that holds hadith, else null. Non-null means the UI opens the hadith list directly (nawawi40, qudsi40, shahwaliullah40). */
  soleBookId: number | null;
};

/** The few collection fields a hadith, a search hit or a breadcrumb needs. */
export type HadithCollectionRef = Pick<
  HadithCollection,
  'slug' | 'number' | 'titleAr' | 'titleEn' | 'attributionAr' | 'attributionEn'
>;

export type HadithBook = {
  resourceId: number;
  id: number;
  collectionSlug: string;
  /** Text. The n in «كتاب {n}». */
  bookNumber: string;
  titleAr: string | null;
  titleEn: string | null;
  position: number;
  hadithCount: number;
  /** Number of chapter rows of this book (0 for fawazahmed0). */
  chapterCount: number;
  /** `chapterCount > 0`. A book is either chaptered or flat (plan D14, option C). */
  hasChapters: boolean;
};

export type HadithChapter = {
  resourceId: number;
  id: number;
  bookId: number;
  chapterNumber: number;
  titleAr: string | null;
  titleEn: string | null;
  position: number;
  hadithCount: number;
};

/** A hadith as a list row. `textAr` is the stored text, byte for byte. The UI clamps lines; this layer never shortens it. */
export type HadithListItem = {
  resourceId: number;
  id: number;
  bookId: number;
  chapterId: number | null;
  /** Text, for example `'3.1'`. */
  hadithNumber: string;
  arabicNumber: string | null;
  position: number;
  textAr: string;
};

/** Where previous / next points. The route needs only the slug and `hadithNumber`. */
export type HadithRef = {
  hadithNumber: string;
  bookId: number;
  chapterId: number | null;
};

/** One hadith for the reader, with its breadcrumb and source credit. No grade, no English. */
export type HadithDetail = HadithListItem & {
  collection: HadithCollectionRef;
  book: Pick<HadithBook, 'id' | 'bookNumber' | 'titleAr' | 'titleEn' | 'position'>;
  chapter: Pick<HadithChapter, 'id' | 'chapterNumber' | 'titleAr' | 'titleEn'> | null;
  /** Null for fawazahmed0: the UI shows no link. */
  sourceUrl: string | null;
};

export type HadithReaderData = {
  hadith: HadithDetail;
  /** The hadith before this one in book order, across book (and chapter) boundaries; null at the start of the collection. */
  previous: HadithRef | null;
  next: HadithRef | null;
};

/** One row of the collections list, installed or not. */
export type HadithCatalogEntry = {
  resourceId: number;
  /** From `catalog_resources`. */
  name: string | null;
  nameAr: string | null;
  version: number;
  packSizeBytes: number;
  installed: boolean;
  /** Known only when installed (read from `hadith_collections`); null before install (Open question 1). */
  slug: string | null;
};

/** A highlighted span in `textAr`: UTF-16 offsets into the stored text, `end` exclusive. */
export type HadithTextRange = { start: number; end: number };

export type HadithSearchHit = {
  item: HadithListItem;
  collection: HadithCollectionRef;
  bookNumber: string;
  /** Sorted, non-overlapping, on the original `textAr`. */
  ranges: HadithTextRange[];
};

export type HadithSearchPage = { hits: HadithSearchHit[]; hasMore: boolean };
```

## 2. `content.db` migration

### 2.1 Tables

Pack columns are the `content.db` columns, **same names, same order** as `CONTENT_GROUPS` in `content-tables.ts` (the group `hadith_collections`). `I` = integer, `T` = text, `?` = nullable, otherwise `NOT NULL`. SQLite names are snake_case.

| Table | Columns in order | Primary key | Other indexes |
| --- | --- | --- | --- |
| `hadith_collections` | `resource_id` I, `id` I, `slug` T, `source_code` T, `title_ar` T?, `title_en` T?, `author_ar` T?, `author_en` T?, `attribution_ar` T, `attribution_en` T, `source_url` T?, `total_hadith` I, `books_count` I | (`resource_id`, `id`) | unique `hadith_collections_slug_unique` on (`slug`) |
| `hadith_books` | `resource_id` I, `id` I, `book_number` T, `title_ar` T?, `title_en` T?, `position` I, `hadith_count` I | (`resource_id`, `id`) | `hadith_books_position_idx` on (`resource_id`, `position`) |
| `hadith_chapters` | `resource_id` I, `id` I, `book_id` I, `chapter_number` I, `source_chapter_key` T?, `title_ar` T?, `title_en` T?, `position` I, `hadith_count` I | (`resource_id`, `id`) | `hadith_chapters_book_position_idx` on (`resource_id`, `book_id`, `position`) |
| `hadith_entries` | `resource_id` I, `id` I, `book_id` I, `chapter_id` I?, `hadith_number` T, `arabic_number` T?, `position` I, `text_ar` T, `text_en` T?, `narrator_en` T?, `text_search` T, `source_url` T? | (`resource_id`, `id`) | `hadith_entries_number_idx` on (`resource_id`, `hadith_number`) **not unique**; `hadith_entries_book_position_idx` on (`resource_id`, `book_id`, `chapter_id`, `position`) |
| `hadith_grades` | `resource_id` I, `id` I, `entry_id` I, `grade` T, `graded_by` T? | (`resource_id`, `id`) | `hadith_grades_entry_idx` on (`resource_id`, `entry_id`) |
| `hadith_ref_aliases` | `resource_id` I, `old_number` T, `new_number` T?, `match` T, `since_version` I | (`resource_id`, `old_number`, `since_version`) | none |

No foreign keys (the other pack tables have none). The two entry indexes are the ones step 4 said belong here.

### 2.2 Drizzle schema

Append to `src/core/db/content/schema.ts`, after `namesNotes`, in the style of `duaItems` (`sqliteTable`, `integer`, `text`, `primaryKey`, `index`, `uniqueIndex` imports already used in the file; add the import only if missing): `hadithCollections`, `hadithBooks`, `hadithChapters`, `hadithEntries`, `hadithGrades`, `hadithRefAliases`. TypeScript property names are camelCase of the column names (`resourceId`, `bookId`, `textAr`, `textSearch`, `hadithNumber`, `sinceVersion`, `match`). Index names exactly as in the table above.

### 2.3 Generate the migrations (order matters)

Run from `apps/mobile` with Node 26 (`source ~/.nvm/nvm.sh && nvm use`):

1. `npx drizzle-kit generate --name hadith_tables`. This writes `0012_hadith_tables.sql`, `meta/0012_snapshot.json`, a journal entry and `migrations.js`.
2. **Known trap: the `0011` snapshot does not contain the Names tables** (`0010_names_pack` was hand-written and has no snapshot), so the generated SQL will also contain `CREATE TABLE` statements for `names_lists`, `names`, `names_verses`, `names_notes` and their indexes. **Delete those statements from `0012_hadith_tables.sql`** (they already exist from `0010`). Keep the generated snapshot as it is: it now records the Names tables, which repairs the drift. Statements are separated by `--> statement-breakpoint`; keep that separator between the remaining statements and none dangling at the end.
3. After the edit `0012_hadith_tables.sql` must contain exactly: six `CREATE TABLE` (`hadith_*` only), one `CREATE UNIQUE INDEX`, five `CREATE INDEX`. If it contains anything else (a column change on another table, a `DROP`, an `ALTER`), **stop and report**; do not edit further.
4. `npx drizzle-kit generate --custom --name search_hadith`. This writes an empty `0013_search_hadith.sql`, a snapshot and a journal entry. Put exactly this in the SQL file (same shape as `0001_search_quran.sql`):

```sql
CREATE VIRTUAL TABLE `search_hadith` USING fts5(
	entry_id UNINDEXED,
	resource_id UNINDEXED,
	text_search,
	tokenize = 'unicode61 remove_diacritics 2'
);
```

5. Check `migrations/meta/_journal.json`: two new entries `idx` 12 and 13, tags `0012_hadith_tables` and `0013_search_hadith`, `when` values greater than `1793733247339` and increasing, and `migrations.js` imports `m0012` and `m0013`. Do not hand-edit the journal except to fix an ordering mistake.
6. If the numbers 0012 and 0013 are taken when you start (check `ls src/core/db/content/migrations`), take the next two free numbers and use them everywhere in this brief.

The migration must be additive: it creates tables only and does not touch existing ones. Existing installs migrate by running `0012` and `0013`.

## 3. Pack install changes (three small edits to shared sync files)

These three edits are the only changes to core sync code. Keep each minimal.

### 3.1 `src/core/sync/content-tables.ts`

- In `ContentGroupSchema` add an optional field `afterImportSql?: readonly string[]` with a one-line comment: "Statements run after the tables are copied, in the same transaction, each with `[resource_id]`."
- In the `hadith_collections` group:
  - add `` `DELETE FROM search_hadith WHERE ${RESOURCE}` `` as the **first** item of `deleteResourceSql` (before `hadith_ref_aliases`);
  - add `afterImportSql: [ 'INSERT INTO search_hadith (entry_id, resource_id, text_search) SELECT id, resource_id, text_search FROM hadith_entries WHERE resource_id = ?' ]`.
- `contentContract()` and the `README_CONTRACT` test compare table names, columns and entities only; they are unaffected. Do not change any table or entity.

### 3.2 `src/core/sync/content-sync.ts`

In `copyPack`, inside the existing `db.transaction`, after the `for (const table of group.tables)` loop and before `upsertInstalled(...)`:

```ts
for (const sql of group.afterImportSql ?? []) {
  db.run(sql, [resource.id]);
}
```

So the FTS rows are written in the same transaction as the pack tables: if any statement fails, the transaction rolls back and no hadith row, no FTS row and no `installed_resources` row remains. `removeResource` already runs `deleteResourceSql`, so removing a collection also clears its FTS rows.

### 3.3 `src/core/sync/install-resource.ts`

Where the code does `if (resource.group === 'tafsirs') { keepOnDemand(...)  ... }`, add a separate branch before `onProgress?.(1)`:

```ts
if (resource.group === 'hadith_collections') {
  // Not auto-selected: without this the next sync would remove the collection the user chose.
  keepOnDemand(deps.db, [resource.id]);
}
```

Do not touch the tafsir branch. `keepOnDemand` is already imported there.

## 4. Repositories

### 4.1 `data/collection-order.ts`

```ts
export const HADITH_COLLECTION_SLUGS: readonly string[]; // exactly the ten, in this order
export function hadithCollectionNumber(slug: string): number | undefined; // index + 1, undefined if unknown
```

Order: `bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi40`, `qudsi40`, `shahwaliullah40` (the order of `collections` in `apps/api/config/hadith.php`).

### 4.2 `data/active-resource.ts`

```ts
export function hadithResourceId(db: SqlExecutor, slug: string): number | undefined;
```

`SELECT c.resource_id AS resourceId FROM hadith_collections c JOIN installed_resources r ON r.resource_id = c.resource_id AND r."group" = 'hadith_collections' WHERE c.slug = ? LIMIT 1`. Returns `undefined` for an unknown or uninstalled slug (every repository function returns `[]` / `undefined` / `false` then).

### 4.3 `data/content-repository.ts`

Signatures (exact). `db` first, then the slug, then ids/keys. All return the types of section 1.

```ts
export function hasHadithContent(db: SqlExecutor): boolean;
export function listInstalledCollections(db: SqlExecutor): HadithCollection[];
export function getCollection(db: SqlExecutor, slug: string): HadithCollection | undefined;
export function listBooks(db: SqlExecutor, slug: string): HadithBook[];
export function getBook(db: SqlExecutor, slug: string, bookId: number): HadithBook | undefined;
export function listChapters(db: SqlExecutor, slug: string, bookId: number): HadithChapter[];
export function listBookHadith(db: SqlExecutor, slug: string, bookId: number, page?: { limit: number; offset: number }): HadithListItem[];
export function listChapterHadith(db: SqlExecutor, slug: string, chapterId: number, page?: { limit: number; offset: number }): HadithListItem[];
export function getHadith(db: SqlExecutor, slug: string, hadithNumber: string): HadithDetail | undefined;
export function getHadithNeighbours(db: SqlExecutor, slug: string, hadithId: number): { previous: HadithRef | null; next: HadithRef | null };
export function getHadithReaderData(db: SqlExecutor, slug: string, hadithNumber: string): HadithReaderData | undefined;
export function listHadithCatalog(db: SqlExecutor): HadithCatalogEntry[];
```

Behaviour:

- **`hasHadithContent`**: `SELECT 1 AS one FROM hadith_collections c JOIN installed_resources r ON r.resource_id = c.resource_id AND r."group" = 'hadith_collections' LIMIT 1` defined → `true`. Wrap in `try/catch` returning `false` (a missing table reads as false, like `hasDuasContent`).
- **`listInstalledCollections`**:

```sql
SELECT c.resource_id AS resourceId, c.id, c.slug,
       c.title_ar AS titleAr, c.title_en AS titleEn, c.author_ar AS authorAr, c.author_en AS authorEn,
       c.attribution_ar AS attributionAr, c.attribution_en AS attributionEn, c.source_url AS sourceUrl,
       c.total_hadith AS totalHadith, c.books_count AS booksCount,
       (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(b.id) END
          FROM hadith_books b WHERE b.resource_id = c.resource_id AND b.hadith_count > 0) AS soleBookId
FROM hadith_collections c
JOIN installed_resources r ON r.resource_id = c.resource_id AND r."group" = 'hadith_collections'
ORDER BY c.resource_id
```

  Then in TypeScript set `number` (`hadithCollectionNumber(slug)`; unknown slugs get 11, 12, ... in the SQL order) and sort by `number`. Null titles stay `null`. `getCollection` is the same query with `AND c.slug = ?` and `LIMIT 1`; factor one private `COLLECTION_SELECT` string.
- **`listBooks`**: books of the slug's resource ordered by `position`, with
  `(SELECT COUNT(*) FROM hadith_chapters ch WHERE ch.resource_id = b.resource_id AND ch.book_id = b.id) AS chapterCount`; `hasChapters = chapterCount > 0`; `collectionSlug` is the argument. **Books with `hadith_count = 0` are returned too** (the UI decides). `book_number` stays text.
- **`getBook`**: one book by id, same columns.
- **`listChapters`**: `ORDER BY position, id`. An empty array is the normal answer for a flat book ("no chapters").
- **`listBookHadith`**: all entries of the book (`WHERE resource_id = ? AND book_id = ?`), `ORDER BY position, id`, in book order **across chapters** (chapter_id may be null or set). With `page`, append `LIMIT ? OFFSET ?`.
- **`listChapterHadith`**: `WHERE resource_id = ? AND chapter_id = ?` `ORDER BY position, id`.
- **`getHadith`**: by slug + `hadith_number` (text compare, exact string). The (`resource_id`, `hadith_number`) index is not unique until a dry run proves it; if two rows match, return the lower `id` (`ORDER BY id LIMIT 1`). Joins `hadith_collections`, `hadith_books` and a `LEFT JOIN hadith_chapters`. `textAr` is the stored text untouched. The returned object has **no** `textSearch`, `textEn`, `narratorEn`, `grade` or `grades` property (tests assert the exact key set).
- **`getHadithNeighbours`** (by entry id, the id of the current hadith in the slug's resource). Order is the reading order: books by `position`, then entries by `position` inside a book. Next:

```sql
SELECT e.hadith_number AS hadithNumber, e.book_id AS bookId, e.chapter_id AS chapterId
FROM hadith_entries e
JOIN hadith_books b ON b.resource_id = e.resource_id AND b.id = e.book_id
WHERE e.resource_id = ?
  AND (b.position > ? OR (b.position = ? AND e.position > ?))
ORDER BY b.position ASC, e.position ASC
LIMIT 1
```

  Previous: same with `<` and `ORDER BY b.position DESC, e.position DESC`. The current hadith's `b.position` and `e.position` come from one lookup first. A book with no entries is skipped naturally. At the first and last hadith the result is `null`.
- **`getHadithReaderData`**: `getHadith` then `getHadithNeighbours(db, slug, detail.id)`; `undefined` when the hadith does not exist.
- **`listHadithCatalog`**: every `catalog_resources` row with `"group" = 'hadith_collections'`, ordered by `resource_id`, with `installed` = a matching `installed_resources` row, and `slug` from `hadith_collections` for installed ones (null otherwise). Columns: `resourceId`, `name`, `nameAr`, `version`, `packSizeBytes`, `installed`, `slug`. Use a `LEFT JOIN` on `installed_resources` and a `LEFT JOIN` on `hadith_collections` (both by `resource_id`).

Stored text stays exact: select columns as they are, with no `trim`, `replace`, `substr`, `lower` or `COALESCE` on `text_ar`, `title_ar`, `author_ar`, `attribution_ar`.

### 4.4 `data/text-map.ts` — highlight positions on the original text

The FTS index is built from the normalised `text_search`; the screen shows the original `text_ar`. These helpers map a match back to offsets in the original.

```ts
export type MappedHadithText = {
  normalized: string;
  /** For each UTF-16 unit of `normalized`, the offset in the original where its source character starts. */
  starts: number[];
  /** Same, where its source character ends (exclusive), extended over the stripped marks that directly follow it. */
  ends: number[];
};
export function mapHadithText(original: string): MappedHadithText;
export function queryTokens(rawQuery: string): string[];
export function highlightRanges(original: string, tokens: readonly string[]): HadithTextRange[];
```

`mapHadithText` re-implements the four steps of `normalizeHadithForSearch` in **one pass** that records offsets. Iterate by code point (`for (const char of original)`), tracking the UTF-16 offset:

1. A code point in the strip set (same set as the normaliser: U+200B–U+200F, U+061C, U+202A–U+202E, U+2066–U+2069, U+FEFF, U+0640, U+064B–U+065F, U+0670, U+06D6–U+06ED) is skipped. If something was already emitted, extend `ends` of the last emitted character to cover it.
2. A code point in the whitespace set (U+0009–U+000D, U+0020, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000): emit one `' '` only if something was already emitted and the last emitted character is not a `' '`; otherwise skip.
3. Any other code point: map U+0622, U+0623, U+0625, U+0671 → U+0627; U+0629 → U+0647; U+0649 → U+064A; emit it (a code point outside the BMP emits two UTF-16 units; give both units the same `starts`/`ends`).
4. At the end, remove one trailing `' '` if present (and its `starts`/`ends` entries).

Do not import the regexes from the normaliser; copy the sets as `RegExp` tests on a single code point inside the function or as `Set` lookups. A comment names `normalizeHadithForSearch.ts` as the twin. **Parity test is mandatory** (below): `mapHadithText(x).normalized === normalizeHadithForSearch(x)` for every golden case.

`queryTokens(rawQuery)`: `normalizeHadithForSearch(rawQuery).match(/[\p{L}\p{N}]+/gu) ?? []`, de-duplicated, order kept.

`highlightRanges(original, tokens)`: with `m = mapHadithText(original)`, find every word in `m.normalized` with `/[\p{L}\p{N}]+/gu`; a word is highlighted when it equals or starts with any token (same rule as `src/features/search/highlight.ts`). For a highlighted word at normalised `[a, b)` the range is `{ start: m.starts[a], end: m.ends[b - 1] }`. Merge ranges that touch or overlap; return them sorted. Empty tokens → `[]`.

### 4.5 `data/search.ts`

```ts
export const HADITH_SEARCH_PAGE_SIZE = 50;
export function searchHadith(
  db: SqlExecutor,
  rawQuery: string,
  options?: { slugs?: readonly string[]; limit?: number; offset?: number },
): HadithSearchPage;
```

- `tokens = queryTokens(rawQuery)`; no tokens → `{ hits: [], hasMore: false }`.
- `match = buildFtsMatch(tokens)` from `@/features/search/ftsQuery`.
- Scope: when `options.slugs` is given, resolve each with `hadithResourceId`; unknown slugs are dropped; if none remain, return an empty page. Otherwise search every installed collection.
- Query (placeholders only for values; the `IN` list is built from `?` marks, one per resource id):

```sql
SELECT entry_id AS entryId, resource_id AS resourceId
FROM search_hadith
WHERE search_hadith MATCH ?
  [AND resource_id IN (?, ?, ...)]
ORDER BY bm25(search_hadith), resource_id, entry_id
LIMIT ? OFFSET ?
```

  Fetch `limit + 1` rows; `hasMore = rows.length > limit`. `limit` defaults to `HADITH_SEARCH_PAGE_SIZE`, `offset` to 0.
- For each hit, load the entry, its book number and its collection (one query by `resource_id` + `id`, joining `hadith_entries`, `hadith_books`, `hadith_collections`). Skip a hit whose row is missing. `item.textAr` is the stored text; `ranges = highlightRanges(item.textAr, tokens)`.
- The query is normalised with the hadith normaliser (through `queryTokens`), never with `normalizeForSearch`. Search never reads or returns `text_search`.

## 5. Hooks — `src/features/hadith/hooks/`

`useHadithContent.ts`:

```ts
export function useHadithContent<T>(fallback: T, read: (db: SqlExecutor) => T, deps: readonly unknown[]): T;
```

It follows `src/features/duas/data/hooks.ts`: `const revision = useCatalogVersion((state) => state.version)`; `useMemo(() => readOr(fallback, () => read(openContentDb().executor)), [revision, ...deps])`, with the same `eslint-disable-next-line react-hooks/exhaustive-deps` comment. A thrown error (database not open yet, table missing) returns `fallback`. Callers pass **module-level constants** as the fallback (`EMPTY_LIST`) so the returned reference is stable.

`hooks.ts` exports, one function each, each a thin call to `useHadithContent` and the repository function of the same name:

| Hook | Returns | Repository call |
| --- | --- | --- |
| `useHadithAvailable()` | `boolean` | `hasHadithContent` |
| `useInstalledHadithCollections()` | `HadithCollection[]` | `listInstalledCollections` |
| `useHadithCollection(slug)` | `HadithCollection \| undefined` | `getCollection` |
| `useHadithCatalog()` | `HadithCatalogEntry[]` | `listHadithCatalog` |
| `useHadithBooks(slug)` | `HadithBook[]` | `listBooks` |
| `useHadithBook(slug, bookId)` | `HadithBook \| undefined` | `getBook` |
| `useBookChapters(slug, bookId)` | `HadithChapter[]` | `listChapters` |
| `useBookHadith(slug, bookId)` | `HadithListItem[]` | `listBookHadith` (no paging) |
| `useChapterHadith(slug, chapterId)` | `HadithListItem[]` | `listChapterHadith` (no paging) |
| `useHadithReader(slug, hadithNumber)` | `HadithReaderData \| undefined` | `getHadithReaderData` |

No search hook (step 14). No personal-data hook (step 11). `hooks/index.ts` re-exports everything. The data barrel `data/index.ts` re-exports the repository functions, `searchHadith`, `highlightRanges`, `queryTokens`, `HADITH_COLLECTION_SLUGS` and `hadithCollectionNumber`. It does **not** export anything from `__fixtures__`.

## 6. Dev fixtures — `data/__fixtures__/dev-fixtures.ts` (TEST ONLY)

Header comment (same rule as the Azkar fixtures): placeholder rows for Jest; never a hadith; never packed; **no production code may import this module** (ADR 0042, 2 Nov 2026). Exports:

```ts
export const FIXTURE_SOURCE_CODE = 'taybah-dev-fixture';
export const FIXTURE_MULTI = { resourceId: -1, slug: 'fixture-multi' } as const;
export const FIXTURE_SINGLE = { resourceId: -2, slug: 'fixture-single' } as const;
export function loadHadithDevFixtures(db: SqlExecutor): void; // idempotent: deletes both fixture resources first
```

`loadHadithDevFixtures` runs in one transaction. It first deletes the fixture rows from the six tables, `search_hadith` and `installed_resources` for resource ids -1 and -2, then inserts the rows below, one `installed_resources` row per fixture resource (`"group"` `hadith_collections`, `version` 1, `sha256` `'fixture'`, `last_checked_at` 0), one `catalog_resources` row per fixture resource (`name` `'FIXTURE title — not a hadith'`, `name_ar` null, `version` 1, `pack_size_bytes` 1024, `is_default` 0), and one `search_hadith` row per entry (`entry_id`, `resource_id`, `text_search`).

`text_search` of every entry is `normalizeHadithForSearch(textAr)` (import it from `@/core/text/normalizeHadithForSearch`).

Text placeholders (the only text allowed): Latin `FIXTURE text N — not a hadith` (N = entry id); Arabic `نص تجريبي ١ — ليس حديثًا`; bidi `FIXTURE text N — not a hadith` followed by U+200F; titles `FIXTURE title — not a hadith` and `[عنوان تجريبي]`; attribution `FIXTURE attribution`; author `FIXTURE author`; `source_code` `taybah-dev-fixture`.

**Collection -1 (`fixture-multi`):** collection id 1, `title_ar` **null**, `title_en` `FIXTURE title — not a hadith`, `author_ar` null, `author_en` `FIXTURE author`, `attribution_ar` and `attribution_en` `FIXTURE attribution`, `source_url` null, `total_hadith` 7, `books_count` 3.

| Book id | `book_number` | `title_ar` | `title_en` | position | `hadith_count` |
| ---: | --- | --- | --- | ---: | ---: |
| 1 | `'1'` | null | null | 1 | 2 (chaptered) |
| 2 | `'2'` | `[عنوان تجريبي]` | `FIXTURE title — not a hadith` | 2 | 3 (flat) |
| 3 | `'3'` | null | null | 3 | 2 (flat) |

Chapters (book 1): id 1 (`chapter_number` 1, `source_chapter_key` null, `title_ar` null, `title_en` null, position 1, `hadith_count` 1); id 2 (`chapter_number` 2, `title_ar` `[عنوان تجريبي]`, position 2, `hadith_count` 1).

| Entry id | book | chapter | `hadith_number` | `arabic_number` | position | `text_ar` |
| ---: | ---: | --- | --- | --- | ---: | --- |
| 1 | 1 | 1 | `'1'` | null | 1 | Latin N=1 |
| 2 | 1 | 2 | `'2'` | null | 2 | Latin N=2 |
| 3 | 2 | null | `'3'` | null | 1 | Latin N=3 |
| 4 | 2 | null | `'3.1'` | `'3.1'` | 2 | Latin N=4 |
| 5 | 2 | null | `'4'` | null | 3 | Arabic placeholder |
| 6 | 3 | null | `'5'` | null | 1 | bidi N=6 |
| 7 | 3 | null | `'6'` | null | 2 | Latin N=7 |

**Collection -2 (`fixture-single`):** collection id 1, `title_ar` `[عنوان تجريبي]`, `title_en` null, other fields as above, `total_hadith` 3, `books_count` 2. Books: id 1 (`'1'`, position 1, `hadith_count` 3), id 2 (`'0'`, position 2, `hadith_count` 0). Entries (ids reuse 1 to 3 on purpose, to test resource scoping): ids 1, 2, 3 in book 1, numbers `'1'`, `'2'`, `'3'`, positions 1 to 3, no chapter, Latin N = the entry id.

Fixtures insert **no** rows into `hadith_grades` and `hadith_ref_aliases`.

## 7. Tests

All Jest, TypeScript, colocated. Fixtures and placeholders only. Test names below are the exact `it(...)` strings. Use `openAzkarContentDb()` (it already applies every migration) and `at()` from `jest/azkar-test-db.ts`; close `database` in `afterEach`.

### `collection-order.test.ts`
- `it('lists the ten canonical slugs in the order of config/hadith.php')`: read `apps/api/config/hadith.php` with `readFileSync(join(process.cwd(), '../api/config/hadith.php'), 'utf8')`, take the text between `'collections' => [` and the next `]`, extract the single-quoted strings with `/'([a-z0-9]+)'/g`, and expect equality with `HADITH_COLLECTION_SLUGS`.
- `it('numbers a known slug from 1 and returns undefined for an unknown one')`.

### `content-migration.test.ts`
- `it('creates the six hadith tables and search_hadith')`: `sqlite_master` has the six names and `search_hadith`.
- `it('matches the pack columns of content-tables in order')`: for each table of `contentGroup('hadith_collections')`, `pragma_table_info` names (in `cid` order) equal the table's column names.
- `it('matches the Drizzle schema columns')`: for each of the six Drizzle tables, `getTableColumns` names equal the SQLite columns.
- `it('declares nullability as the pack contract does')`: for each table, the column's `notnull` flag is `0` exactly for the columns `nullable: true` in `content-tables.ts`.
- `it('keeps hadith_number text and not unique')`: insert two entries with the same (`resource_id`, `hadith_number`) without error; `typeof(hadith_number)` of `'2787.2'` is `text`.
- `it('creates the documented indexes')`: the seven index names exist, `hadith_entries_number_idx` and `hadith_books_position_idx` are not unique, `hadith_collections_slug_unique` is unique.
- `it('creates search_hadith as FTS5 with unindexed ids')`: the `sql` in `sqlite_master` contains `fts5`, `unicode61 remove_diacritics 2`, and `entry_id UNINDEXED`, `resource_id UNINDEXED`.
- `it('holds no personal data: every hadith table is a pack table')`: tables in `sqlite_master` whose name starts with `hadith_` equal exactly the six; none of `hadith_bookmarks`, `hadith_reading_position`, `hadith_search_history` exists.
- `it('lists the new migrations in the journal in order')`: tags `0012_hadith_tables` and `0013_search_hadith` follow `0011_duas_tables`, `idx` increasing, `when` increasing.
- `it('applies on top of a database migrated up to 0011')`: apply the first 12 journal entries, insert one `installed_resources` row, apply `0012` and `0013`, the row is still there.

### `install.test.ts` (uses `__fixtures__/pack-test-helpers.ts`)
`pack-test-helpers.ts` copies the helpers `sha256`, `resource` (group `'hadith_collections'`), `manifestBody`, `fileStore`, `parentDir`, `packIdFromUrl`, `serveFrom`, `apiWith`, `installDeps` and `withContentDb` from `__tests__/install-resource.test.ts`, and replaces `gzipPack` with `gzipHadithPack(resourceId, rows)` that creates the `meta` table (`pack_schema_version` `'1'`, `resource_id`) and the six tables with the column lists of `contentGroup('hadith_collections')` (read from `content-tables.ts`, so the test cannot drift), then inserts the given rows. Set `process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000'` and mock `console.log` in `beforeEach`, as that test does.

- `it('copies an alias row whose column is named match')`: the pack carries one `hadith_ref_aliases` row (`old_number` `'1'`, `new_number` null, `match` `'none'`, `since_version` 1); after install `SELECT match FROM hadith_ref_aliases` returns `'none'` and `new_number` is null. (`match` is copied unquoted by `copyPack`; this proves SQLite accepts it on the device.)
- `it('installs a hadith pack, fills search_hadith and records the resource')`: after `installResourceWith`, status `installed`, `installed_resources` has `group = 'hadith_collections'`, the six tables hold the pack rows, `search_hadith` has one row per entry for that resource.
- `it('stores Arabic text and titles byte for byte')`: the pack carries `text_ar` = Arabic placeholder with U+200F and a leading and trailing space, a `title_ar` of `[عنوان تجريبي]` and an `attribution_ar`; after install `hex(text_ar)` (selected as hex through SQL `hex()`) equals the pack's.
- `it('leaves text_search as shipped')`: `text_search` after install equals the pack's value for every entry.
- `it('keeps a null Arabic title null')`.
- `it('rolls the whole install back when the FTS step fails')`: install into a database where `search_hadith` has been dropped (`DROP TABLE search_hadith`) → result `failed` with reason `import`; `hadith_collections`, `hadith_books`, `hadith_entries` and `installed_resources` have no row for the resource.
- `it('rolls back a hadith pack when a table is missing from the pack')`: build the pack without `hadith_entries` → `failed`, no rows left.
- `it('reinstalling replaces the collection rows and its FTS rows')`: install version 1, then a pack with fewer entries for the same resource id → entries and `search_hadith` rows equal the second pack; no duplicates.
- `it('rebuilds content.db from packs')`: install into a fresh database, record `SELECT` of every hadith table and `search_hadith`, install the same pack into a second fresh database, both equal.
- `it('keeps the collection through the next sync')`: after `installResourceWith`, run `syncContent` (see `syncDeps` in the copied helpers) with `selection: selectedResourceIds`-like `() => []` and a manifest listing the resource: the status for the resource is not `removed` and its rows are still present (the on-demand list contains its id).
- `it('removes the FTS rows with the collection')`: remove it through `syncContent` with the resource no longer published; no `search_hadith` row for it remains.
- `it('does not touch another collection when one is installed')`: install resource 71 and resource 72 (different slugs); reinstalling 71 leaves 72's rows and FTS rows unchanged.

### `content-repository.test.ts`
(uses `loadHadithDevFixtures`)
- `it('reports no content until a collection is installed')`: `hasHadithContent` false before the loader, true after.
- `it('lists installed collections in the fixed order and omits uninstalled rows')`: with an extra `hadith_collections` row that has no `installed_resources` row, it is not listed. Also insert (test-local, with matching `installed_resources` rows, resource ids 81 and 82, deliberately in reverse order) collections `muslim` then `bukhari`: the list puts `bukhari` (`number` 1) before `muslim` (`number` 2), and both before the fixture collections (11, 12).
- `it('opens a canonical single-book collection straight to its hadith')`: insert a `nawawi40` collection (resource 83, installed) with two books of which one has `hadith_count` 0: its `soleBookId` is the id of the other book, and `number` is 8.
- `it('numbers unknown slugs after the ten canonical ones')`: unknown slugs are numbered in ascending `resource_id` order, so `fixture-single` (resource -2) is 11 and `fixture-multi` (resource -1) is 12.
- `it('keeps a null Arabic collection title null')`: `fixture-multi.titleAr` is `null`; `fixture-single.titleAr` is `'[عنوان تجريبي]'`.
- `it('marks a single-book collection with its sole book id')`: `fixture-single.soleBookId` is `1` (book 2 holds no hadith); `fixture-multi.soleBookId` is `null`.
- `it('lists the books of a collection in position order with chapter flags')`: `fixture-multi` books ids `[1, 2, 3]`; `hasChapters` `[true, false, false]`; `chapterCount` `[2, 0, 0]`; `bookNumber` is the string `'1'`; null titles stay null.
- `it('returns an empty chapter list for a flat book')`.
- `it('lists chapters of a chaptered book in order')`: ids `[1, 2]`.
- `it('lists the hadith of a chapter in position order')`: chapter 1 → entry 1, chapter 2 → entry 2.
- `it('lists the hadith of a chaptered book across its chapters in position order')`: book 1 → numbers `['1', '2']`.
- `it('lists the hadith of a flat book directly')`: book 2 → numbers `['3', '3.1', '4']` in position order.
- `it('sums chapter hadith counts to the book count for a chaptered book')`: the sum over `listChapters` equals `getBook(...).hadithCount` (2).
- `it('pages a book list with limit and offset')`.
- `it('finds one hadith by slug and number')`: `getHadith(db, 'fixture-multi', '3.1')` returns entry 4 with `hadithNumber` the string `'3.1'`; `getHadith(db, 'fixture-single', '1')` returns the single-collection row, not `fixture-multi`'s (resource scoping).
- `it('returns undefined for an unknown slug or number')`.
- `it('returns the breadcrumb, chapter and source fields of a hadith')`: entry 1 has `collection.slug`, `book.bookNumber` `'1'`, `chapter.id` 1; entry 3 has `chapter` `null`; `sourceUrl` null.
- `it('returns Arabic text byte for byte')`: entry 6's `textAr` equals the stored string with its U+200F, compared with `Buffer.from(...).toString('hex')`.
- `it('has no grade, English or search field in the view model')`: `Object.keys(detail).sort()` equals the exact key list of `HadithDetail`; insert a row into `hadith_grades` for entry 1 first and expect the keys unchanged (the table is never read).
- `it('gives previous and next within a book')`: for `'3.1'`: previous `'3'`, next `'4'`.
- `it('crosses a chapter boundary in position order')`: for `'1'`: previous null; next `'2'` (chapter 1 to chapter 2).
- `it('crosses a book boundary')`: for `'4'` (last of book 2): next `'5'` (first of book 3); for `'5'`: previous `'4'`.
- `it('returns no next at the end of the collection and no previous at the start')`: `'6'` next null; `'1'` previous null.
- `it('skips a book with no hadith when moving between books')`: add a book with `hadith_count` 0 between books 1 and 2 in a test-local insert; neighbours of entry 2 still point across it.
- `it('lists the catalogue with install state and slug')`: fixture resources are `installed: true` with their slugs; add a `catalog_resources` row for resource 90 (group `hadith_collections`, not installed) → `installed: false`, `slug: null`, `packSizeBytes` kept; rows of other groups are not listed.

### `text-map.test.ts`
- `it('maps to the same normalised text as normalizeHadithForSearch for every golden case')`: read the golden fixture (`join(process.cwd(), '../api/tests/Fixtures/hadith/search-normalizer.json')`), at least 26 cases; `mapHadithText(input).normalized` equals both `expected` and `normalizeHadithForSearch(input)`.
- `it('records one start and one end per normalised unit')`: `starts.length === ends.length === normalized.length`, for every golden case.
- `it('maps offsets back to the original letters')`: for the placeholder letters ب ت ث with fatha after ب (`'بَتث'`): `normalized` `'بتث'`, `starts` `[0, 2, 3]`, `ends` `[2, 3, 4]` (the fatha belongs to the letter before it).
- `it('collapses whitespace and invisible marks without losing offsets')`: `' ب ‏ ت '` → normalized `'ب ت'`, the range of `ت` points at its original offset.
- `it('maps the six code points')`: an input containing U+0623 gives `'ا'` and the start/end of the original character.
- `it('highlights a whole word including its marks')`: original `'نص تجريبي ١ — ليس حديثًا'`, tokens `queryTokens('حديثا')`: one range, and `original.slice(range.start, range.end)` equals `'حديثًا'`.
- `it('highlights by prefix on word starts')`: token `'تجر'` highlights `'تجريبي'` and not other words.
- `it('merges adjacent ranges and returns them sorted')`.
- `it('returns no range for an empty token list or no match')`.
- `it('queryTokens normalises with the hadith normaliser and drops punctuation')`: `queryTokens('  أَب   ‏')` → `['اب']`; `queryTokens('') ` → `[]`; the Quran normaliser is not used (a U+200F inside a token is removed).
- `it('handles a code point outside the BMP')`: an astral character (use `'\u{1F600}'`, not text) in the middle keeps later offsets correct.

### `search.test.ts`
(uses `loadHadithDevFixtures`)
- `it('finds a hadith by a normalised query')`: query `'تجريبي'` returns entry 5 of `fixture-multi`.
- `it('matches diacritic and alef variants')`: query `'حديثًا'` and `'حديثا'` return the same hit; a query with `أ` finds text normalised to `ا` (build the case from `FIXTURE`-style letters in the test, no real text).
- `it('matches Latin placeholder words case-insensitively')`: `'fixture'` returns all Latin entries across both collections.
- `it('scopes by slug')`: `slugs: ['fixture-single']` returns only that collection's three entries; an unknown slug returns an empty page.
- `it('returns highlight ranges on the original text')`: the range slices back to the matched word (as in the text-map test).
- `it('returns the original text, not text_search')`: `hit.item.textAr` of entry 6 keeps its U+200F.
- `it('returns an empty page for an empty or punctuation-only query')`.
- `it('pages with limit, offset and hasMore')`.
- `it('does not search a removed collection')`: remove the fixture's FTS rows for one resource (`DELETE FROM search_hadith WHERE resource_id = -1`); its hits disappear, the other collection's stay.
- `it('does not use the Quran index')`: `search_quran` is untouched (count unchanged by the loader).

### `__fixtures__/dev-fixtures.test.ts`
- `it('leaves content.db without hadith rows until loaded')`.
- `it('loads twice without duplicates')`: counts per table for both resource ids are equal after the second load; expected counts: `hadith_collections` 1 + 1, `hadith_books` 3 + 2, `hadith_chapters` 2 + 0, `hadith_entries` 7 + 3, `search_hadith` 7 + 3, `hadith_grades` 0, `hadith_ref_aliases` 0.
- `it('uses only placeholder text and the dev-fixture source')`: every `text_ar` starts with `FIXTURE text` or equals the Arabic placeholder; `source_code` is `taybah-dev-fixture` for both collections.
- `it('derives text_search with the hadith normaliser')`: for every entry, `text_search === normalizeHadithForSearch(text_ar)`.
- `it('is not imported by production code')`: scan `src/features/hadith` and `src/core` (`.ts`/`.tsx`, skipping `*.test.*` and `__fixtures__/`) with `readdirSync`/`readFileSync` for the string `__fixtures__`; none found.

### `hooks/useHadithContent.test.tsx` and `hooks/hooks.test.tsx`
Mock `@/core/db/content/open` (`openContentDb`) to return `{ executor }` from an in-memory database (pattern: the Duas/Azkar hook tests in `src/features/azkar/data/hooks.test.tsx`).
- `it('returns the fallback when the database is not open')` (the mock throws).
- `it('returns the fallback constant by reference so renders stay stable')`.
- `it('re-reads when the catalogue version changes')`: bump `useCatalogVersion` (as `bumpCatalogVersion` does) and the hook returns the new data.
- `it('re-reads when the arguments change')` (slug).
- One test per hook in the section 5 table: `it('useHadithAvailable is false before and true after the fixtures load')`, `it('useInstalledHadithCollections lists both fixture collections')`, `it('useHadithCollection returns undefined for an unknown slug')`, `it('useHadithCatalog lists the catalogue')`, `it('useHadithBooks lists the books')`, `it('useHadithBook returns one book')`, `it('useBookChapters is empty for a flat book')`, `it('useBookHadith lists a flat book')`, `it('useChapterHadith lists one chapter')`, `it('useHadithReader returns previous and next')`.

### Existing tests that must still pass unchanged
`__tests__/content-sync.test.ts` (`lists exactly the shared pack contract`), `__tests__/install-resource.test.ts`, `__tests__/content-db.test.ts`, `__tests__/content-selection.test.ts`, the Azkar, Duas and Names suites (they now also apply `0012` and `0013`), `src/core/text/normalizeHadithForSearch.test.ts`.

## Gates

macOS toolchain. From `apps/mobile`, after `source ~/.nvm/nvm.sh && nvm use` (Node 26):

1. `npm run lint && npx tsc --noEmit && npm test`
2. Failures are allowed only in `__tests__/force-update-ios-route.test.tsx` and `__tests__/tmp-steps.test.tsx` (if present; the known 4). Report any other failing test name.
3. Check the migration state before finishing: `git status --short -- src/core/db/content/migrations` shows only `0012_hadith_tables.sql`, `0013_search_hadith.sql`, `meta/0012_snapshot.json`, `meta/0013_snapshot.json`, `meta/_journal.json`, `migrations.js` (and `migrations.d.ts` only if drizzle-kit rewrote it). No existing migration file was edited.
4. Check the untouched list: `git status --short -- src/features/hadith/components src/shared/ui app src/core/i18n src/core/db/user src/core/text packages ../api` shows nothing from this step (step 12 may show its own changes in `components` and `src/shared/ui`; take the output before you start and at the end, and the two must be identical).
5. Check no hadith religious text was written: the only Arabic strings added are the placeholders in this brief.

No API, OpenAPI or contract change, no dependency change, no `app.config.ts` or native change: `composer qa`, the contract generator, `npm-audit`, `expo-doctor` and the fingerprint check are not required. The change is JavaScript and a SQLite migration, so it ships by OTA (CLAUDE.md, «Releasing»).

## Out of scope

- Any component, screen, route, i18n key, Home tile, Menu card or sidebar link (steps 12, 13).
- `user.db` tables (`hadith_bookmarks`, `hadith_reading_position`), `PERSONAL_TABLES`, the alias applier (step 11).
- The search screen, scope chips, history, a search hook (step 14). Only `searchHadith` and `highlightRanges` are built here.
- Deleting an installed collection from the UI (no uninstall function is built; `syncContent` still removes a pack that is no longer published).
- Option B of plan D14 (unchaptered runs between chapters). This brief builds option C: a book is chaptered or flat. If the developer picks B, a repository function for the runs is added in a later change.
- Applying change-feed rows to `search_hadith`: the importer writes no hadith change rows, and a source change bumps the floor so the device re-downloads the pack. See Open question 4.
- Download progress, Wi-Fi-only and cancel state for the sheet `HadithCollDownload` (step 13 wires `installResource` and its `onProgress` and `AbortSignal`). `src/features/downloads` is the storage screen for tafsirs, audio and fonts; step 13 decides whether hadith gets a storage row there. Step 10 exposes only `useHadithCatalog()` (size, installed) for it.
- Reading `hadith_grades` or `hadith_ref_aliases` (grades are hidden through Phase 7; aliases are for step 11).
- The API, the pack contract, `normalizeHadithForSearch`, the golden fixture.
- Real hadith data, real pack sizes, performance budgets (step 15 measures).

## Open questions

1. **The manifest has no slug.** `ContentManifestResource` carries `name` / `name_ar` but not the collection slug (`resources.source_key` is not exposed). A collection that is not installed has no slug on the device, so the downloads list cannot pick its cover (`CollectionCover` is keyed by slug) or its fixed «مجموعة {n}» number from the manifest alone. This brief returns `slug: null` for uninstalled catalogue entries. Choose: (a) add `slug` to the manifest resource (an API and contract change, a separate step), or (b) rely on resource-id order (not stable), or (c) show a neutral cover until install. Step 13 needs the answer.
2. **Plan D14 option B or C.** Built here: option C (a book is chaptered or flat, `hasChapters`). Under option B, a book can mix chapters with chapter-less runs and the repositories need a run list. RB22 is still open.
3. **Spec §6 / plan step 10 wording vs. step 4 answers.** The spec's pack-contents line says the pack columns are "as backend without `source_id` and `source_key`", but the step 4 answers also dropped `source_text_sha256`, `source_version` and `imported_at` (and the code does). This brief follows the code. The spec line is stale and should be corrected by its owner.
4. **Change-feed rows and `search_hadith`.** `applyChanges` does not touch `search_hadith`, so a hadith upsert or delete arriving through the change feed would leave the index stale. Today no such rows exist. If the importer ever emits hadith change rows, `afterImportSql` must also run after `applyChanges`.
5. **Duplicate hadith numbers.** `(resource_id, hadith_number)` is not unique until the import dry run proves it. `getHadith` returns the lowest `id`. If the real data has duplicates, route keys need a tiebreaker (decision for step 13 and the importer report).
6. **Large books.** `useBookHadith` loads a whole book with full text (Bukhari has books with hundreds of hadith). The repository supports `limit`/`offset`; the hooks do not page. Measure on a device in step 15 and decide whether the list screen needs paging.
7. **Core files edited.** Sections 3.1 to 3.3 edit three shared sync files outside the folders this step owns (`content-tables.ts`, `content-sync.ts`, `install-resource.ts`), each by a few lines, because the FTS fill must share the install transaction and the pack must survive the next sync. Step 12 does not touch these files; confirm no other agent does.
8. **Step 12 depends on `types.ts` only.** If step 12 needs a field that is not in section 1 (for example a chapter count on `HadithBook`, a `bookTitle` on a search hit), it asks for the change here instead of computing it in a component.
9. **Doc disagreements found while writing this brief** (none block step 10):
   - Plan step 10 tests row says a null Arabic title is "omitted, not replaced"; the developer's rule and this brief say it stays `null` in the view model and the UI shows the numbered label.
   - Plan step 13 row still lists `nawawi`, `qudsi`, `dehlawi`; D13 and `config/hadith.php` use `nawawi40`, `qudsi40`, `shahwaliullah40`.
   - Plan line 335 and ADR 0076 line 113 say RB17 to RB23 block only the chapter files and the release is not held; D15 and ADR 0076 decision 2 say the Hadith release waits for chapters. The data layer works with or without chapter rows either way.
   - Plan step 10 row calls for fixtures for a partly chaptered book "(B only)"; none are built here (option C).

## Answers to the open questions (orchestrator, on the developer's behalf, 7 Nov 2026)

These override anything above that conflicts with them.

1. **Slug before install:** step 7 adds an additive `key` field (= `resources.source_key`, which is the canonical slug for hadith) to every manifest entry. Read `resource.key` from the manifest for uninstalled collections (cover tone, «مجموعة {n}» position = index of the slug in the fixed list, mirrored as a TS constant `HADITH_COLLECTION_ORDER` in `src/features/hadith/constants.ts`). If `key` is absent (an older server), fall back to `slug: null`. Regenerate the mobile API types only after step 7 lands; until then, read `key` defensively from the raw JSON with a type guard.
2. Build option C (a book is either chaptered or flat). Option B is decided after the 6b per-book report and added then if chosen.
3. Follow the code. Spec §6 gets corrected at step 16.
4. Accepted. Add a guard test: if `applyChanges` ever touches a `hadith_*` table, it reruns `afterImportSql` for that resource. If that's too much now, add a TODO-free assertion in a test that the importer emits no hadith change rows (API side, step 6b).
5. Accepted (lowest id).
6. **Page the hooks now:** book hadith lists load 50 at a time with `onEndReached`, and the reader loads one hadith plus its previous/next refs. No whole-book full-text load.
7. Confirmed: no other agent edits `content-tables.ts`, `content-sync.ts` or `install-resource.ts` right now. Re-read each before editing.
8. Accepted.
9. Doc disagreements: corrected at step 16. For the null title, keep it null in the data and let the UI show the fallback label.
