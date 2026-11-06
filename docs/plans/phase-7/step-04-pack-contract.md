# Step 4 — Pack contract and hadith search normaliser

ADR 0042 §5, §6, §8, §11 (Accepted, with the 2 Nov and 7 Nov amendments), ADR 0045 (features on by default: no switch). Plan: `docs/plans/phase-7.md` (step 4 row and its tests row, D4, D11, D12, D13, "Pack size estimates"). Spec: `docs/technical-spec.md` §6 (hadith pack tables), §7 (point 7 normalisation, "Pack contents by group"). Read `docs/plans/phase-7/README.md`, `.claude/agent-rules.md` and `docs/plans/phase-7/step-03-schema.md` first. **No hadith text of any kind is written in this step.** Fixtures use only the placeholders listed under "Placeholders".

## Goal
Make a hadith collection deliverable as a content pack, and add the hadith search normaliser, with its TypeScript mirror.

1. API: add the pack group `hadith_collections` to `ResourceGroup` and `ServedResourceGroup`, the six pack tables to `PackSchema`, the six snapshot queries (with the grade filter), and the D12 delivery gate.
2. API: add `HadithSearchTextNormalizer` (PHP) and a golden fixture file.
3. Mobile: add `hadith_collections` to `PackGroup` and `CONTENT_GROUPS`, and add the TypeScript normaliser that reads the same golden fixture.

Nothing here imports hadith data. The packs can only be built from factory rows until step 6 (the importer) exists.

## What the existing code already does (read this before you plan)
- There is **no separate "pack builder" or "manifest" to write**. `PackBuilder::write()` loops over `PackSchema::tablesFor($group)` and fills each table through `PackSnapshotRepository::eachChunk()`. `ContentDeliveryService::manifest()` lists every active resource that has a pack file. Both are generic: once the group, the six tables and the six snapshot queries exist, a hadith pack builds and appears in the manifest with no further change.
- `ResourceGroup::Hadith = 'hadith'` already exists and stays the reserved, deferred HadeethEnc group (`hadith:{lang}`). It has no pack schema (`tablesFor` throws `PackBuildException` for it). Do not touch it.
- Step 3 created the six tables, models and factories. A hadith `resources` row has `group = 'hadith_collections'`. Until this step adds the enum case, `Resource::query()->find()` on such a row throws on the group cast. After this step it loads.
- The existing mobile test `lists exactly the shared pack contract` in `apps/mobile/__tests__/content-sync.test.ts` is the "content-tables mirrors PackSchema" test the plan names. It compares `contentContract()` (table names, column names in order, entity names and keys) with a literal list `README_CONTRACT`. Nullability and column kinds are **not** compared there; the column table below is the single source for both the PHP and the TS definitions.

## Rules for this step
- Branch `main` (CLAUDE.md, 6 Nov 2026). Check with `git branch --show-current`. Do not commit, push, switch branches or add dependencies.
- **Never open, print or edit `apps/api/.env`.**
- Do not edit `docs/technical-spec.md`, ADR 0042, `docs/plans/phase-7.md`, `docs/plans/phase-7/README.md` or `docs/adr/*`. Someone else owns them.
- **Step 5 is being implemented in parallel. Do not edit** `app/Integrations/HadithApiFawaz/**`, `app/Domains/Hadith/{Contracts,Sources,Console,Exceptions}/**`, `app/Domains/Hadith/HadithSourceServiceProvider.php`, `bootstrap/providers.php` or `config/hadith.php`. This step needs **no new config key** (`hadith.grades_visible` already exists). Its tests may call `config(['hadith.grades_visible' => true])`.
- Do not edit the step 3 files (migrations, models, factories, `HadithSchemaTest`, `HadithModelsTest`). Use them as they are.
- `apps/api/CLAUDE.md` and `apps/api/.ai/rules/*`: `declare(strict_types=1)`, full typing, Larastan level 8. Pest helper functions are **global**: prefix every new helper `hadithPack…` or `hadithNormaliser…`. Names already taken in `tests/Feature/Hadith`: `hadithMigration`, `hadithConfigFromFile`, `hadithConfigSetEnv`, `hadithTitlesExpected`, `hadithSchema*`, `hadithModels*`, `fawazRequestedPaths`, `snapshotRequestedPaths`, `snapshotPinLines`, `hadithCommit`, `hadithCdnBase`, `hadithCdnUrl`, `hadithFixture*`, `hadithEditFixture`, `hadithReload`, `hadithPinFixtures`, `hadithSetPins`, `hadithFakeCdn`, `hadithUseTempCache`, `hadithSourceContract`.
- Mobile rules (`apps/mobile/CLAUDE.md`): one file and one colocated test per module. No UI is built here.
- The Quran text rules do not change: **`app/Support/QuranText/**`, `packages/quran-text-check/**` and `apps/mobile/src/core/text/normalizeForSearch.ts` are not edited.**
- Shared files are edited additively, at the end of each list (plan, "Merge risk with Phase 6").

## Files

### API: create (paths under `apps/api/`)

| Path | Purpose |
| --- | --- |
| `app/Domains/Content/Packs/HadithPackReadiness.php` | D12 gate used by `PackBuilder` |
| `app/Support/HadithText/HadithSearchTextNormalizer.php` | the hadith `text_search` normaliser |
| `tests/Fixtures/hadith/search-normalizer.json` | golden parity fixture, read by PHP and Jest |
| `tests/Unit/Content/PackSchemaHadithTest.php` | table list, columns, nullability, keys |
| `tests/Unit/Support/HadithSearchTextNormalizerTest.php` | rules, golden fixture, agreement with the Quran normaliser |
| `tests/Feature/Hadith/HadithPackBuilderTest.php` | pack build, grade filter, gate, manifest |

### API: change

| Path | Change |
| --- | --- |
| `app/Domains/Content/Enums/ResourceGroup.php` | append case `HadithCollections = 'hadith_collections'` after `Duas` |
| `app/Domains/Content/Enums/ServedResourceGroup.php` | append case `HadithCollections = 'hadith_collections'` after `Duas` (**add both enums together**: `ContentManifestEntryResource` calls `ServedResourceGroup::fromResourceGroup()`, which throws if only one has the case) |
| `app/Domains/Content/Packs/PackSchema.php` | new arm in `tablesFor()`; six static methods appended before the private helpers |
| `app/Domains/Content/Packs/PackBuilder.php` | constructor gets `HadithPackReadiness $hadith`; one `if` before the temp path is created |
| `app/Domains/Content/Repositories/Eloquent/EloquentPackSnapshotRepository.php` | six arms in `query()`; one private method `visibleHadithGrades()` |
| `packages/api-contract/openapi.json`, `packages/api-contract/src/schema.d.ts` | regenerated (see Gates) |

### Mobile: create (paths under `apps/mobile/`)

| Path | Purpose |
| --- | --- |
| `src/core/text/normalizeHadithForSearch.ts` | TS mirror of the PHP normaliser; exports `normalizeHadithForSearch(text: string): string` |
| `src/core/text/normalizeHadithForSearch.test.ts` | rules and golden-fixture parity |

### Mobile: change

| Path | Change |
| --- | --- |
| `src/core/sync/content-tables.ts` | `PackGroup` gains `'hadith_collections'`; `CONTENT_GROUPS` gains one entry appended after `names` |
| `__tests__/content-sync.test.ts` | append the hadith group to `README_CONTRACT` |
| `__tests__/content-selection.test.ts` | add one test (a hadith pack is not auto-selected) |

## 1. Group enums

`ResourceGroup`: after `case Duas = 'duas';` add

```php
    // ADR 0042: one pack per hadith collection. `hadith` above stays reserved for the deferred HadeethEnc pack.
    case HadithCollections = 'hadith_collections';
```

`ServedResourceGroup`: add `case HadithCollections = 'hadith_collections';` after `Duas`. `isIgnored()` and `ignoredValues()` need no change (the new case is not ignored).

Existing tests `tests/Unit/Content/ServedResourceGroupTest.php` and `tests/Feature/Content/IgnoredResourceGroupTest.php` iterate `cases()` and `ignoredValues()`, so **neither needs an edit**. Run them; they must still pass.

## 2. Pack tables (`PackSchema`)

In `tablesFor()` add this arm after the `ResourceGroup::Names` arm (before `default`):

```php
ResourceGroup::HadithCollections => [
    self::hadithCollections(),
    self::hadithBooks(),
    self::hadithChapters(),
    self::hadithEntries(),
    self::hadithGrades(),
    self::hadithRefAliases(),
],
```

Add six `public static function …(): PackTable` after `duaCollectionBooks()` and before the private `integer()` / `text()` helpers, built with those helpers exactly like the Duas methods. **Do not change `PackSchema::VERSION`** (it stays `1`; the mobile `assertPackMeta` checks the string `'1'`). Do not touch `PackTable`, `PackColumn` or `SqlitePackWriter`.

Pack columns are the step 3 MySQL columns, **in the same order, minus `source_id` and `source_key`** (spec §6). `I` = `self::integer(...)`, `T` = `self::text(...)`, `?` = `nullable: true`.

| Method (table) | Columns in order |
| --- | --- |
| `hadithCollections()` (`hadith_collections`) | `resource_id` I, `id` I, `slug` T, `source_code` T, `title_ar` T?, `title_en` T?, `author_ar` T?, `author_en` T?, `attribution_ar` T, `attribution_en` T, `source_url` T?, `total_hadith` I, `books_count` I, `source_version` T, `imported_at` T |
| `hadithBooks()` (`hadith_books`) | `resource_id` I, `id` I, `book_number` T, `title_ar` T?, `title_en` T?, `position` I, `hadith_count` I |
| `hadithChapters()` (`hadith_chapters`) | `resource_id` I, `id` I, `book_id` I, `chapter_number` I, `source_chapter_key` T?, `title_ar` T?, `title_en` T?, `position` I, `hadith_count` I |
| `hadithEntries()` (`hadith_entries`) | `resource_id` I, `id` I, `book_id` I, `chapter_id` I?, `hadith_number` T, `arabic_number` T?, `position` I, `text_ar` T, `text_en` T?, `narrator_en` T?, `text_search` T, `source_url` T?, `source_text_sha256` T, `source_version` T, `imported_at` T |
| `hadithGrades()` (`hadith_grades`) | `resource_id` I, `id` I, `entry_id` I, `grade` T, `graded_by` T? |
| `hadithRefAliases()` (`hadith_ref_aliases`) | `resource_id` I, `old_number` T, `new_number` T?, `match` T, `since_version` I |

Keys (`primaryKey` and `orderBy` are the same list in every table, like the Duas tables):
- `hadith_collections`, `hadith_books`, `hadith_chapters`, `hadith_entries`, `hadith_grades`: `['resource_id', 'id']`.
- `hadith_ref_aliases`: `['resource_id', 'old_number', 'since_version']`.

Notes that stop common mistakes:
- **`imported_at` is declared `T` (text), not `I`.** The MySQL column is `datetime(6)`, which PDO returns as a string such as `2026-11-07 10:00:00.000000`. `EloquentPackSnapshotRepository::cell()` rejects a non-numeric string in an integer column. Ship the string as the database gave it (UTC, no conversion). This differs from Azkar, whose MySQL column is a bigint.
- `hadith_number`, `arabic_number`, `book_number`, `old_number`, `new_number` are text and must stay text in SQLite (a value such as `2787.2` must not become a number). The columns are declared `TEXT`; SQLite keeps the string.
- `text_ar`, `title_ar`, `author_ar`, `attribution_ar` ship exactly as stored. Nothing in this step trims, normalises or re-encodes them.
- `source_text_sha256`, `source_version` and `imported_at` **are kept** in the pack (spec §6 drops only `source_id` and `source_key`). The Duas pack dropped its equivalents; do not copy that. See Open question 3.
- The `(resource_id, hadith_number)` and `(resource_id, book_id, chapter_id, position)` indexes are **not** part of the pack: `PackTable` has no index support and the Duas pack works the same way. The device creates its indexes in step 10's `content.db` migration. Do not extend `PackTable`.
- `match` is a reserved word in MySQL. The snapshot repository builds `select hadith_ref_aliases.match as match` through Laravel's query builder, which quotes both parts, so it works. SQLite accepts `match` as a column name unquoted (checked with PDO sqlite 3.54). The pack test below proves both ends.

## 3. Snapshot queries (`EloquentPackSnapshotRepository`)

Add the model imports (`App\Domains\Hadith\Models\{HadithBook, HadithChapter, HadithCollection, HadithEntry, HadithGrade, HadithRefAlias}`), then six arms in `query()`'s `match`, after `names_notes` and before `default`. Use `Model::query()->toBase()->where('<table>.resource_id', $resourceId)` exactly like the Duas arms. **Do not use `DB::table`**: the arch test `repositories never touch HTTP or open transactions` forbids `Illuminate\Support\Facades\DB` in repositories.

```php
'hadith_collections' => HadithCollection::query()->toBase()->where('hadith_collections.resource_id', $resourceId),
'hadith_books' => HadithBook::query()->toBase()->where('hadith_books.resource_id', $resourceId),
'hadith_chapters' => HadithChapter::query()->toBase()->where('hadith_chapters.resource_id', $resourceId),
'hadith_entries' => HadithEntry::query()->toBase()->where('hadith_entries.resource_id', $resourceId),
'hadith_grades' => $this->visibleHadithGrades(
    HadithGrade::query()->toBase()->where('hadith_grades.resource_id', $resourceId),
),
'hadith_ref_aliases' => HadithRefAlias::query()->toBase()->where('hadith_ref_aliases.resource_id', $resourceId),
```

Add a private method:

```php
private function visibleHadithGrades(Builder $query): Builder
```

(`Builder` is the `Illuminate\Database\Query\Builder` already imported in the file.) Behaviour, from spec §5 and D4:
- When `config()->boolean('hadith.grades_visible')` is `false` (the value through all of Phase 7): return `$query->whereRaw('1 = 0')`. The pack's `hadith_grades` table is created and **empty**. The MySQL rows stay.
- When it is `true`: return `$query->whereNotNull('hadith_grades.graded_by')` (a grade without a named grader is never served).

Chunking uses the table's `orderBy` list, which the existing loop already applies; nothing to add for ordering.

## 4. Delivery gate (D12)

New file `app/Domains/Content/Packs/HadithPackReadiness.php`, `final class HadithPackReadiness`, modelled on `DuasPackReadiness`:

```php
public function assertReady(Resource $resource): void
```

- Load the source with `$resource->loadMissing('source')`.
- Allowed `content_sources.permission_status` values: `PermissionStatus::Granted` and `PermissionStatus::NotRequired` (developer, 7 Nov 2026, D12). `Pending` and `Denied` are refused. A missing source is refused.
- On refusal throw `PackBuildException` with a plain message: `The hadith content source is not deliverable (permission is pending or denied). The pack is not built.` No religious text.
- Keep the allowed set **private to this class** (a private constant or an `in_array` with the two cases). Do **not** add a method to `PermissionStatus` (ADR 0045 removed `allowsDelivery` by name) and do **not** change `DuasPackReadiness`, `NamesSourceGate` or any Duas or Names behaviour.

`PackBuilder`:
- Add `private readonly HadithPackReadiness $hadith,` as the last constructor parameter (the container autowires it; nothing constructs `PackBuilder` by hand).
- In `build()`, directly after the `ResourceGroup::Duas` block add:

```php
if ($resource->group === ResourceGroup::HadithCollections) {
    // D12 (7 Nov 2026): not_required counts as granted; pending and denied are not delivered.
    $this->hadith->assertReady($resource);
}
```

The gate runs at **build time only**, like Duas and Names. The manifest and pack endpoints are not changed (see Open question 2). The existing `content:ensure-packs` command already catches `PackBuildException` per resource and prints `FAIL`, so it needs no change.

## 5. Hadith search normaliser

`app/Support/HadithText/HadithSearchTextNormalizer.php`, `final class HadithSearchTextNormalizer` in namespace `App\Support\HadithText`, one method `public function normalize(string $text): string`. It is **self-contained**: do not call or extend `App\Support\QuranText\SearchTextNormalizer`. (The Quran normaliser's `\s` and `trim()` behave differently in PHP and JS, which would break parity.) It is used only to derive `text_search`; stored Arabic is never passed through it.

Rules, applied **in this order**, the same in PHP and TypeScript:

1. **Strip** every code point in this set (one regex character class, `u` flag):
   - U+200B–U+200F (zero-width space, ZWNJ, ZWJ, LRM, RLM)
   - U+061C (Arabic letter mark)
   - U+202A–U+202E (embeddings and overrides)
   - U+2066–U+2069 (isolates)
   - U+FEFF
   - U+0640 (tatweel)
   - U+064B–U+065F (harakat, including both ends)
   - U+0670 (dagger alef)
   - U+06D6–U+06ED (Quranic annotation marks, including both ends)
2. **Map** exactly these six code points, and no others: U+0622 → U+0627, U+0623 → U+0627, U+0625 → U+0627, U+0671 → U+0627, U+0629 → U+0647, U+0649 → U+064A.
3. **Collapse** every run of whitespace into one U+0020. Whitespace is this explicit set, **not** `\s`: U+0009–U+000D, U+0020, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000. (U+0085 and U+2060 are **not** in it and are not stripped: they stay in the output.)
4. **Trim** one leading and one trailing U+0020 (after step 3 at most one of each exists). Do not use PHP `trim()` or JS `.trim()`.

Not done, on purpose: no case folding, no hamza-seat mapping (U+0624, U+0626 stay), no digit mapping (Arabic-Indic and Extended digits stay), no NFC/NFD, no stripping of U+0610–U+061A (the same as the Quran normaliser; see Open question 5). Adding any of these would be a rule change for the developer.

Regex forms to use (both languages must express the same sets):

| Step | PHP (`preg_replace`, `u`) | TypeScript (`replace`, `gu`) |
| --- | --- | --- |
| strip | `'/[\x{200B}-\x{200F}\x{061C}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}\x{0640}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u'` | `/[​-‏؜‪-‮⁦-⁩﻿ـً-ٰٟۖ-ۭ]/gu` |
| whitespace | `'/[\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}]+/u'` | `/[\t-\r    -     　]+/gu` |
| trim | pattern `^ ` OR ` \z`, replaced by `''` | pattern `^ ` OR ` $`, replaced by `''`, `gu` |

(Write the trim as one alternation of "a space at the start" and "a space at the end": `/^ | \z/u` in PHP, `/^ | $/gu` in TypeScript. Use `\z`, not `$`, in PHP, because PHP's `$` also matches before a final newline.)

PHP failure mode: if a `preg_replace` returns `null` (text that is not valid UTF-8) throw `\UnexpectedValueException('Hadith search normalisation failed on text that is not valid UTF-8.')`, like the Quran normaliser.

TypeScript: `apps/mobile/src/core/text/normalizeHadithForSearch.ts` exports `normalizeHadithForSearch(text: string): string` with the same four steps. Create the `RegExp` literals inside the function (or without a shared `g` state problem), as `packages/quran-text-check/src/normalize.ts` does. Do not import `@quran/quran-text-check` or `normalizeForSearch`. Add a one-line comment naming the PHP twin and the fixture path.

### Golden parity fixture

File: **`apps/api/tests/Fixtures/hadith/search-normalizer.json`** (the server is the source of truth for `text_search`). PHP reads it with `base_path('tests/Fixtures/hadith/search-normalizer.json')`; Jest reads it with `readFileSync(join(process.cwd(), '../api/tests/Fixtures/hadith/search-normalizer.json'), 'utf8')` (`process.cwd()` is `apps/mobile` under `npm test`, the same assumption as `__tests__/content-sync.test.ts`). Both use `JSON.parse` / `json_decode`; do **not** `import` the JSON from the mobile code (it lies outside Jest's root).

Shape: `{"cases": [{"name": "...", "input": "...", "expected": "..."}, ...]}`. Write every non-ASCII character as a JSON `\uXXXX` escape (exactly as in the table; the `\u000B`, `\u000C`, `\u000D` escapes are valid JSON). **The expected values below were derived by hand from the rules above. Do not generate them by running either implementation.** Letters used: ب U+0628, ت U+062A, ث U+062B (placeholders, not text). `→` separates input from expected.

| # | name | input → expected |
| ---: | --- | --- |
| 1 | `empty` | `""` → `""` |
| 2 | `plain letters unchanged` | `بتث` → `بتث` |
| 3 | `fathah damma kasra stripped` | `بَتُثِ` → `بتث` |
| 4 | `shadda sukun tanwin dagger alef stripped` | `بّتْثًٰ` → `بتث` |
| 5 | `harakat range ends stripped, neighbours kept` | `ًبٟ٠ي` → `ب٠ي` |
| 6 | `tatweel stripped` | `بــت` → `بت` |
| 7 | `annotation marks range stripped, neighbours kept` | `ەبۖتۭۮ` → `ەبتۮ` |
| 8 | `U+0610 is not stripped` | `بؐ` → `بؐ` |
| 9 | `alef forms map to alef` | `آأإٱا` → `ااااا` |
| 10 | `ta marbuta and alef maksura` | `ةى` → `هي` |
| 11 | `LRM RLM and ALM stripped` | `ب‏ت‎ث؜` → `بتث` |
| 12 | `embeddings and overrides stripped` | `‪ب‫ت‬‭ث‮` → `بتث` |
| 13 | `isolates stripped` | `⁦ب⁧ت⁨ث⁩` → `بتث` |
| 14 | `zero width marks and BOM stripped` | `ب​ت‌ث‍﻿` → `بتث` |
| 15 | `zwnj between words` | `ب‌ ‌ت` → `ب ت` |
| 16 | `word joiner is kept` | `ب⁠ت` → `ب⁠ت` |
| 17 | `ascii whitespace collapsed and trimmed` | ` ب  ت\t\nث ` (leading space, two spaces after ب, tab and LF after ت, trailing space) → `ب ت ث` |
| 18 | `unicode whitespace collapsed and trimmed` | ` ب  ت　\u000B\u000C\u000Dث ` → `ب ت ث` |
| 19 | `next line U+0085 is not whitespace` | `ب\u0085ت` → `ب\u0085ت` |
| 20 | `marks between spaces collapse after stripping` | `ب ‏ ت` → `ب ت` |
| 21 | `marks at the edges then trim` | `‏ ب ‏` → `ب` |
| 22 | `only invisible marks` | `‏‪﻿` → `` (empty) |
| 23 | `digits unchanged` | `١٢۳` → `١٢۳` |
| 24 | `latin is not case folded` | `FIXTURE 12 ab` → `FIXTURE 12 ab` |
| 25 | `strip and map together` | `أَة‏` → `اه` |
| 26 | `placeholder sentence` | `نص تجريبي ١ — ليس حديثًا` → `نص تجريبي ١ — ليس حديثا` |

(#26 is the «نص تجريبي ١ — ليس حديثًا» placeholder: only U+064B is removed.)

## 6. Mobile contract

### `src/core/sync/content-tables.ts`
- `export type PackGroup = 'tafsirs' | 'mushafs' | 'chapter_recitations' | 'azkar' | 'duas' | 'names' | 'hadith_collections';`
- Append one entry to `CONTENT_GROUPS` after the `names` entry, using the file's own `table()`, `integer()`, `text()`, `entity()` helpers. `integer`/`text` take `true` for nullable. Columns are the table in section 2 (`I` → `integer`, `T` → `text`; `imported_at` is `text('imported_at')`).
- Entities (the device applies a change-feed row through these; the importer writes none today, but the contract lists them like every other group):

| entity | table | key columns | delete SQL |
| --- | --- | --- | --- |
| `hadith_collection` | `hadith_collections` | `['id']` | ``DELETE FROM hadith_collections WHERE id = ? AND ${RESOURCE}`` |
| `hadith_book` | `hadith_books` | `['id']` | same pattern |
| `hadith_chapter` | `hadith_chapters` | `['id']` | same pattern |
| `hadith_entry` | `hadith_entries` | `['id']` | same pattern |
| `hadith_grade` | `hadith_grades` | `['id']` | same pattern |
| `hadith_ref_alias` | `hadith_ref_aliases` | `['old_number', 'since_version']` | ``DELETE FROM hadith_ref_aliases WHERE old_number = ? AND since_version = ? AND ${RESOURCE}`` |

- `deleteResourceSql` (children first; each `` `DELETE FROM <table> WHERE ${RESOURCE}` ``), in this order: `hadith_ref_aliases`, `hadith_grades`, `hadith_entries`, `hadith_chapters`, `hadith_books`, `hadith_collections`.
- Do **not** add the group to `AUTO_SELECTED_PACK_GROUPS` in `src/core/sync/selection.ts`. A collection downloads only by the user's choice (plan open question 11, steps 10 and 13).
- **Interim state, stated so nobody is surprised:** `content.db` has no hadith tables until step 10 adds the numbered migration and the repositories. Until then an install of a `hadith_collections` resource would fail at the `INSERT … SELECT` and report `import`. Nothing selects one before step 13, so no user can reach it. **Do not add a `content.db` migration, Drizzle schema, journal entry or snapshot in this step.**

### `__tests__/content-sync.test.ts`
Append this object to `README_CONTRACT`, after the `names` object (it must equal `contentContract()` exactly):

```ts
  {
    group: 'hadith_collections',
    tables: [
      {
        name: 'hadith_collections',
        columns: ['resource_id', 'id', 'slug', 'source_code', 'title_ar', 'title_en', 'author_ar', 'author_en', 'attribution_ar', 'attribution_en', 'source_url', 'total_hadith', 'books_count', 'source_version', 'imported_at'],
      },
      { name: 'hadith_books', columns: ['resource_id', 'id', 'book_number', 'title_ar', 'title_en', 'position', 'hadith_count'] },
      { name: 'hadith_chapters', columns: ['resource_id', 'id', 'book_id', 'chapter_number', 'source_chapter_key', 'title_ar', 'title_en', 'position', 'hadith_count'] },
      {
        name: 'hadith_entries',
        columns: ['resource_id', 'id', 'book_id', 'chapter_id', 'hadith_number', 'arabic_number', 'position', 'text_ar', 'text_en', 'narrator_en', 'text_search', 'source_url', 'source_text_sha256', 'source_version', 'imported_at'],
      },
      { name: 'hadith_grades', columns: ['resource_id', 'id', 'entry_id', 'grade', 'graded_by'] },
      { name: 'hadith_ref_aliases', columns: ['resource_id', 'old_number', 'new_number', 'match', 'since_version'] },
    ],
    entities: [
      { entity: 'hadith_collection', key: 'id' },
      { entity: 'hadith_book', key: 'id' },
      { entity: 'hadith_chapter', key: 'id' },
      { entity: 'hadith_entry', key: 'id' },
      { entity: 'hadith_grade', key: 'id' },
      { entity: 'hadith_ref_alias', key: '{old_number}:{since_version}' },
    ],
  },
```

No other test in `apps/mobile` iterates `CONTENT_GROUPS` or `contentGroup()` (checked with a grep of `__tests__`, `jest` and `src`), so nothing else needs a change.

### `__tests__/content-selection.test.ts`
Add one test inside the existing `describe('content selection', …)`: a `resource({ id: 40, group: 'hadith_collections' })` added to the resource list is **not** in `selectedResourceIds(...)` and not in `defaultSelectedResourceIds(...)`, while the existing azkar/duas auto-selection is unchanged. The `group` literal type-checks only after the contract is regenerated (see Gates: run the generator before `tsc`).

## Existing tests to update (complete list)
- `apps/mobile/__tests__/content-sync.test.ts`: `README_CONTRACT` (above). It is the only exact-list test affected.
- No change needed: `tests/Unit/Content/ServedResourceGroupTest.php`, `tests/Feature/Content/IgnoredResourceGroupTest.php`, `tests/Feature/Content/PermissionStatusIsProvenanceTest.php` (do not edit it; see Open question 1), `tests/Feature/Content/MirrorSchemaTest.php`, `tests/Unit/Content/PackSchema{Azkar,Duas,Names}Test.php`.

## Tests

Pest, `declare(strict_types=1);` placeholders only (see below).

### Placeholders (the only text any test may use)
Same as step 3: Latin `FIXTURE text 1 — not a hadith` (`HadithEntryFactory::LATIN_TEXT`), bidi `HadithEntryFactory::BIDI_TEXT`, Arabic `HadithEntryFactory::ARABIC_TEXT`, titles `FIXTURE title — not a hadith`, `FIXTURE grade`, `FIXTURE grader`, `FIXTURE author`, `FIXTURE attribution`. The normaliser fixture uses only the letters and marks in the table above.

### `tests/Unit/Content/PackSchemaHadithTest.php`
No `uses(...)` (follow `PackSchemaDuasTest.php`).
- `it('declares the six hadith tables in contract order')`: names are `hadith_collections, hadith_books, hadith_chapters, hadith_entries, hadith_grades, hadith_ref_aliases`.
- `it('keys every hadith table by resource_id first and orders it by primary key')` (dataset over the six tables, like Duas): `columns[0]` is `resource_id`, `primaryKey[0]` is `resource_id`, `orderBy` equals `primaryKey`.
- `it('uses the contract primary keys')`: aliases `['resource_id','old_number','since_version']`; the other five `['resource_id','id']`.
- `it('gives every hadith table the columns of the canonical contract in order')` (dataset, six rows): the column-name lists of section 2, copied literally.
- `it('declares nullability and kinds as the backend does')`: for each table, the nullable column names equal exactly: collections `title_ar, title_en, author_ar, author_en, source_url`; books `title_ar, title_en`; chapters `source_chapter_key, title_ar, title_en`; entries `chapter_id, arabic_number, text_en, narrator_en, source_url`; grades `graded_by`; aliases `new_number`. The integer columns equal: collections `resource_id, id, total_hadith, books_count`; books `resource_id, id, position, hadith_count`; chapters `resource_id, id, book_id, chapter_number, position, hadith_count`; entries `resource_id, id, book_id, chapter_id, position`; grades `resource_id, id, entry_id`; aliases `resource_id, since_version`. Everything else is text (so `imported_at`, `hadith_number`, `old_number` are text).
- `it('omits source_id and source_key from every hadith table')`.
- `it('adds hadith_collections to both group enums with the same value')`: `ResourceGroup::HadithCollections->value` and `ServedResourceGroup::HadithCollections->value` are `'hadith_collections'`; `ResourceGroup::HadithCollections->isIgnored()` is false; `ServedResourceGroup::fromResourceGroup(ResourceGroup::HadithCollections)` is `ServedResourceGroup::HadithCollections`.
- `it('leaves the reserved hadith group without a pack schema')`: `PackSchema::tablesFor(ResourceGroup::Hadith)` throws `PackBuildException` (`hadith:{lang}` untouched).
- `it('keeps the pack schema version at 1')`: `PackSchema::VERSION` is `1`.

### `tests/Feature/Hadith/HadithPackBuilderTest.php`
`uses(RefreshDatabase::class);` `beforeEach`: `Http::preventStrayRequests(); Storage::fake('local');`. Helpers (global, prefixed): `hadithPackOpen(string $gzipped): PDO` (copy `openDuasContentPack` from `PackBuilderDuasTest.php`: `gzdecode`, temp file, `PDO('sqlite:…')`, exceptions on, `FETCH_ASSOC`), `hadithPackBuild(int $resourceId): ContentPackData` (loads `Resource::query()->findOrFail`, calls `app(PackBuilder::class)->build(...)`), and `hadithPackRows(PDO $pdo, string $table): array`. Create rows with the step 3 factories; pass the same `resource_id` explicitly so they share a resource (`HadithEntryFactory::new()->create()` makes the default resource; reuse its `resource_id` for the others).
- `it('builds a pack with the six hadith tables for a hadith_collections resource')`: one collection, book and entry under one resource; `meta` has `group` `hadith_collections` and `pack_schema_version` `1`; `sqlite_master` has the six tables; each table has the row counts created (chapters 0, grades 0, aliases 0).
- `it('matches the MySQL columns minus source_id and source_key, in order')`: for each of the six tables, `Schema::getColumnListing($table)` with `source_id` and `source_key` removed equals the pack table's column names from `PackSchema` (this guards drift against the step 3 migrations).
- `it('copies a collection row without server-only fields')`: the packed row has no `source_id` key; `slug`, `source_code`, `source_version` and `total_hadith` equal the factory values.
- `it('ships hadith text byte for byte, including a bidi mark and surrounding spaces')`: entries from `withBidiMark()` and `arabic()`, plus one created with `text_ar` = `" FIXTURE text 1 — not a hadith \u{200F}  "`; `bin2hex` of the packed `text_ar` equals `bin2hex` of the MySQL value. Also `source_text_sha256` is packed unchanged.
- `it('keeps hadith numbers as text')`: `decimalNumber()` entry; the packed `hadith_number` is the string `2787.2` and `SELECT typeof(hadith_number)` returns `text`.
- `it('ships a null chapter id and a chapter id')`: two entries (`inChapter(5)`); packed `chapter_id` values are `null` and `5`.
- `it('builds with empty chapters and empty aliases')`: only collection, book and entry rows exist; the pack builds; `row_count` equals the number of rows written (3).
- `it('leaves hadith_grades empty while grades_visible is false')`: assert `config('hadith.grades_visible')` is `false` first; create two grades; MySQL `hadith_grades` count is 2; the packed table has 0 rows; the pack still contains the table.
- `it('ships only graded rows when grades_visible is true')`: `config(['hadith.grades_visible' => true])`; one normal grade and one `ungraded()`; the pack has exactly 1 grade row and its `graded_by` is `FIXTURE grader`.
- `it('round trips an alias row whose column is named match')`: `HadithRefAliasFactory::new()->ofMatch(HadithAliasMatch::SimilarText)->create()` for the same resource, plus one `withoutNewNumber()`; the packed rows read back with `SELECT match FROM hadith_ref_aliases` give `similar_text` and `none`; `new_number` is `null` for the second. This proves the MySQL select and the SQLite table both accept the name.
- `it('packs only the rows of its own resource')`: two collections with different slugs (`HadithCollectionFactory::new()->state(['slug' => 'fixture-a'])`, `'fixture-b'`), each with one book and entries; each pack contains only its own `resource_id`.
- `it('builds from a source whose permission is granted or not_required')` (dataset `granted`, `not_required`): set `content_sources.permission_status` for code `fawazahmed0` and build.
- `it('refuses to build from a source whose permission is pending or denied')` (dataset `pending`, `denied`): `build()` throws `PackBuildException`; `content_packs` has no row for the resource; no file was stored (`Storage::disk('local')->allFiles('packs')` is empty).
- `it('lists a built hadith pack in the manifest')`: `getJson('/api/v1/content/manifest')` (set `Accept-Language`/headers like `ContentDeliveryTest`) has one resource, `group` `hadith_collections`, `id` the resource id, `version` the pack version, `pack_size_bytes` > 0.
- `it('lists one resource per collection for the ten canonical slugs')`: for each slug in `config('hadith.collections')` create a collection (state `slug`) with one book and one entry, build all ten packs, and assert the manifest has ten `hadith_collections` entries (no switch, ADR 0045).
- `it('does not list a hadith resource that has no pack')`: a collection row exists but nothing is built; the manifest `resources` is empty.
- `it('serves the built pack file')`: `getJson` of `/api/v1/content/packs/{id}/{version}` returns 200 for the built hadith resource (copy the request style from `ContentDeliveryTest.php`).

### `tests/Unit/Support/HadithSearchTextNormalizerTest.php`
- `it('matches the golden fixture')`: read `base_path('tests/Fixtures/hadith/search-normalizer.json')`, decode, expect at least 26 cases, and `normalize($case['input'])` `toBe($case['expected'])` for every case (dataset or loop; the case name in the failure message).
- `it('is idempotent on every golden case')`: `normalize($case['expected'])` equals `$case['expected']`.
- `it('strips every code point of the documented sets')`: loop over the ranges U+200B–U+200F, U+061C, U+202A–U+202E, U+2066–U+2069, U+FEFF, U+0640, U+064B–U+065F, U+0670, U+06D6–U+06ED; for each code point `normalize("\u{0628}".$char."\u{062A}")` equals `"\u{0628}\u{062A}"` (build the character with `mb_chr`).
- `it('maps exactly six code points and leaves hamza seats alone')`: the six maps; `U+0624` and `U+0626` unchanged.
- `it('treats the explicit whitespace set as whitespace and nothing else')`: each of U+0009–U+000D, U+0020, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 between two letters becomes one space; U+0085 and U+2060 stay.
- `it('throws on text that is not valid UTF-8')`: `"\xC3\x28"` throws `UnexpectedValueException`.
- `it('agrees with the Quran normaliser on text that has no invisible marks')`: for the inputs of golden cases 2, 3, 4, 5, 6, 9, 10, 17 and 23 (no bidi, zero-width, annotation-range mark and no non-ASCII whitespace), `(new HadithSearchTextNormalizer)->normalize($in)` equals `(new SearchTextNormalizer)->normalize($in)`. In the same test, assert the **difference**: for `"\u{0628}\u{200F}"` the Quran normaliser still returns the mark and the hadith normaliser removes it (this documents why a second normaliser exists and guards the Quran one against change).

### `apps/mobile/src/core/text/normalizeHadithForSearch.test.ts`
- `it('matches the golden fixture shared with the API')`: read the fixture as described, assert at least 26 cases, and `normalizeHadithForSearch(input)` `toBe(expected)` for each (`it.each` or a loop with the case name in the message).
- `it('is idempotent on every golden case')`.
- `it('strips the documented sets and maps exactly six code points')`: same loops as the PHP test with `String.fromCodePoint`.
- `it('uses the explicit whitespace set')`: same as the PHP test (U+0085 and U+2060 stay; U+FEFF is stripped, not treated as whitespace).
- `it('does not change the Quran normaliser')`: `normalizeForSearch('ب‏')` still contains `‏`.

### `apps/mobile/__tests__/content-selection.test.ts`
The one new test described above.

## Gates

macOS toolchain (not the Windows paths in the phase-6 README): PHP is `/opt/homebrew/bin/php`; `node` is not on the agent PATH, so run mobile and generator commands after `source ~/.nvm/nvm.sh && nvm use` (reads `.nvmrc`, Node 26). MySQL and Redis must be running (`brew services start mysql redis`).

Run in this order:

1. API, from `apps/api`: `composer qa` (`pint --test`, `phpstan analyse` level 8, `pest --parallel`). If Pint reports style issues, run `vendor/bin/pint` once and rerun.
2. Contract, from the repo root (needs PHP 8.5 on `PATH`): `grep -c '"duas"' packages/api-contract/openapi.json` first (note the number N), then `npm run generate -w @quran/api-contract`. **A contract diff is expected in this step** (unlike step 3): the manifest's `ServedResourceGroup` enum gains one value. The diff must add exactly N occurrences of `"hadith_collections"` in `openapi.json` and the matching union member in `schema.d.ts` (`ServedResourceGroup: … | "duas" | "hadith_collections"`) and **nothing else**. Anything more (a changed description, a reordered key, another file) means stop and report. Commit-ready means both files are changed and nothing else under `packages/api-contract`.
3. Mobile, from `apps/mobile` (**after** step 2, because `group: 'hadith_collections'` in the selection test only type-checks against the regenerated types): `npm run lint && npx tsc --noEmit && npm test`.
4. Unchanged-code guard, from the repo root: run `git status --short -- packages/quran-text-check apps/api/app/Support/QuranText apps/mobile/src/core/text/normalizeForSearch.ts` and expect **no output** (these three must be untouched). Then run `git status --short -- apps/api/config/hadith.php apps/api/app/Integrations apps/api/bootstrap/providers.php apps/api/app/Domains/Hadith/Contracts apps/api/app/Domains/Hadith/Sources apps/api/app/Domains/Hadith/Console`: step 5 may already show changes there; take this output before you start and again at the end, and the two must be identical (you changed none of them). Also run `npm test -w @quran/quran-text-check` (the checksum and normaliser tests still pass).
5. No dependency changes, so `composer audit`, `node .github/scripts/npm-audit.mjs` and `npx expo-doctor` are not required. No `app.config.ts` or native change, so no fingerprint check.

## Out of scope
- The importer, mapper, validator, `hadith:import`, the report and the scheduler entry (step 6). **Real pack sizes**: the plan's "step 4 and step 6 measure the real sizes" cannot be done here because no real hadith data exists until step 6; do not invent a size measurement from factory rows. Step 6 measures gzip sizes per collection (the extra `source_text_sha256` column adds about 64 bytes per hadith to the plan's 2.3 KB estimate, about 3%).
- The `hadith_collections` rows in the real database and the `resources` rows (the importer creates them). The `hadith:{lang}` pack and every HadeethEnc table.
- API endpoints, controllers, Resources, repositories for reading (steps 6 and 7). Any change to `ContentDeliveryService`, the manifest resource, the pack or change endpoints.
- `content.db` migration, Drizzle schema, journal, snapshots, `search_hadith` FTS5 table, repositories, hooks, install code (step 10). `user.db` tables and `PERSONAL_TABLES` (step 11). Any screen, route, i18n key or component.
- A change to `PermissionStatus`, `DuasPackReadiness`, `NamesSourceGate`, `PermissionStatusIsProvenanceTest`, the Quran normaliser, `packages/quran-text-check`, or `config/hadith.php`.
- Using the normaliser anywhere (the importer will call it in step 6; the FTS build and query call the TS mirror in steps 10 and 14).
- Any hadith, grade, title or section text.

## What later steps need from this step
- Step 6: `ResourceGroup::HadithCollections` (so `Resource` rows of this group load), `HadithSearchTextNormalizer::normalize()` to fill `hadith_entries.text_search` (for the pack and the device to agree), and the rule that the importer bumps `resources.version` and sets `changes_floor_version` so older devices get `410` and re-download.
- Step 10: the column table in section 2 is the `content.db` table definition (add the `hadith_entries (resource_id, hadith_number)` and `(resource_id, book_id, chapter_id, position)` indexes there), and `normalizeHadithForSearch()` builds the FTS5 `search_hadith` rows and the query.
- Step 7: the grade rule (`grades_visible` false means none, true means only rows with `graded_by`) is implemented inline in `visibleHadithGrades()`; the API repository repeats the same rule.

## Open questions for the developer

1. **D12 vs ADR 0045.** D12 (7 Nov 2026) makes the hadith pack build refuse a source whose status is `pending` or `denied`. The ADR 0045 amendment (2 Nov 2026) says permission locks were removed and `permission_status` is provenance only; `tests/Feature/Content/PermissionStatusIsProvenanceTest.php` asserts that for Azkar. This brief builds D12 as the later decision and does not touch that test or the other gates. The ADR 0042 hadith text or a new note should say hadith is the exception, and the `sunnahcom` row (`pending`) means a switch to it would be refused until its status changes.
2. **Gate at build time only.** The gate runs in `PackBuilder`, like Duas and Names. A pack built while the source was deliverable stays in the manifest and downloadable if the status later becomes `pending` or `denied`. Say so if the manifest and pack endpoints should also hide such a pack (a change to `ContentDeliveryService::isServed`).
3. **Pack columns beyond the spec minimum.** The pack keeps `source_text_sha256`, `source_version` and `imported_at` (spec §6 drops only `source_id` and `source_key`). The Duas pack dropped them. They cost about 3% of pack size (64 hex characters per hadith) and the device does not need them. Say so if you want them dropped from the pack; then the pack, `content-tables.ts` and the contract list lose them and the spec line stays as written. `imported_at` ships as the MySQL `datetime(6)` string (text), not a number.
4. **Plan tests row for step 4 is stale.** It says "builder builds nothing while the flag is off" and "manifest lists all ten when on and none when off". ADR 0045 removed the flag, so this brief tests "lists ten with ten packs" and "lists none without a pack" instead. The plan row should be corrected.
5. **Characters the normaliser leaves alone.** Per the spec §7 list and the Quran normaliser's ranges, U+0610–U+061A (including the Arabic signs for honorifics), U+2060, U+0085, hamza seats (U+0624, U+0626) and digits are not changed. Real hadith text may contain some of them, which would make a search for the plain form miss. Adding any is a rule change that must be made in PHP, TypeScript and the fixture together; say which, if any.
6. **Golden fixture location and CI.** The fixture is `apps/api/tests/Fixtures/hadith/search-normalizer.json`, read by Jest across the app boundary. The (paused) mobile workflow does not run on `apps/api/**` changes, so a fixture edit would not trigger Jest. Alternatives: `packages/quran-text-check/test-fixtures/` (rejected: the plan says that package stays unchanged) or `packages/api-contract/` (covered by both workflows' path filters, but it holds generated files). Say if you prefer one.
7. **Stale slugs elsewhere.** ADR 0042 §3 and §7, spec §7 and the plan's "Canonical slugs" paragraph still list `nawawi`, `qudsi`, `dehlawi`; D13 and `config/hadith.php` use `nawawi40`, `qudsi40`, `shahwaliullah40`. This step uses `config('hadith.collections')` and never spells the slugs. The documents still need updating (same as step 3 Open question 4).
8. **Spec snapshot folder.** Spec §7 says `hadith:snapshot` writes to `storage/app/hadith`; the plan and README say `storage/app/private/sources/hadith/{commit}` (ADR 0068). Not this step's concern; step 5 follows the README.

## Answers to the open questions (orchestrator, 7 Nov 2026)

These override anything above that conflicts with them.

1. **No hadith permission gate.** Do **not** create `HadithPackReadiness` and do not call anything from `PackBuilder` for hadith. `permission_status` is provenance only (ADR `0042-features-enabled-by-default`, amendment 2 Nov 2026; `PermissionStatusIsProvenanceTest`). Plan D12 now says so. Drop every test about a hadith gate.
2. Moot (no gate).
3. **Drop `source_text_sha256`, `source_version` and `imported_at` from the pack tables**, as Duas does. The pack `hadith_entries` columns are the step 3 columns minus `source_id`, `source_key`, `source_text_sha256`, `source_version` and `imported_at`; `hadith_collections` likewise drops `source_version` and `imported_at` if present. Update the snapshot repository arms and the mobile `content-tables.ts` to match.
4. Accepted: test "lists ten with ten packs" and "lists none without a pack".
5. Keep the normaliser's ranges as written (same as the Quran normaliser and spec §7). Revisit with real text in step 6.
6. Keep the fixture at `apps/api/tests/Fixtures/hadith/search-normalizer.json`.
7. Done: ADR 0042 has a 7 Nov amendment and spec §7 uses the `40` slugs.
8. Done: spec §7 now names the `SourceCache` path.
