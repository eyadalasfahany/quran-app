# Step 3 — MySQL schema (six hadith tables, models, factories)

ADR 0042 §2, §5, §7, §9 (Accepted). Plan: `docs/plans/phase-7.md` (step 3 row, its tests row, "Data design", D8, D12, D13). Spec: `docs/technical-spec.md` §5, "Hadith: full collections (ADR 0042)". Read `docs/plans/phase-7/README.md` and `.claude/agent-rules.md` first. **No hadith text of any kind is written in this step.** Fixtures use only the placeholders listed under "Placeholders".

## Goal
Add the six canonical hadith tables to MySQL (migrations), with their models and factories, so step 4 (pack contract) and step 6 (importer) can build on them. Additive only. No pack, importer, endpoint, enum case in `ResourceGroup`, route, command or mobile file is added here.

## Rules for this step
- Branch: `main` (the developer works on `main`, CLAUDE.md 6 Nov 2026). Check with `git branch --show-current`. Do not commit, push, switch branches or add dependencies.
- **Never open, print or edit `apps/api/.env`.**
- `docs/technical-spec.md`, ADR 0042 and `docs/plans/phase-7.md` are edited by someone else. Do not touch them.
- Follow `apps/api/CLAUDE.md` and `apps/api/.ai/rules/{migrations,models,enums}.md`: `declare(strict_types=1)`, full typing, categorical values stored as strings and cast to a backed enum, datetimes cast `immutable_datetime`, foreign keys declared explicitly.
- Copy the patterns of `database/migrations/2026_10_31_100002_create_azkar_entries_table.php` (table options, composite primary key, `resource_id` FK cascade) and `2026_11_03_100004_create_dua_hadith_table.php` (`bin` collation columns, `source_id` FK). Copy the model, factory and test patterns of the Duas domain (`app/Domains/Duas/Models/DuaItem.php`, `database/factories/DuaItemFactory.php`, `database/factories/Concerns/CreatesDuasResource.php`, `tests/Feature/Content/DuasMigrationTest.php`).
- Migration timestamps use the `2026_11_01_12xxxx` series (step 2 used `11xxxx`, Azkar `10xxxx`). Do not renumber.
- Slugs are frozen (D13): `bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi40`, `qudsi40`, `shahwaliullah40` (`config('hadith.collections')`). The schema stores a slug as text and does not restrict it.

## Files

Create (migrations, in this order; each an anonymous `Migration` with `up()` and `down()` = `Schema::dropIfExists('<table>')`):

| Path (under `apps/api/`) | Table |
| --- | --- |
| `database/migrations/2026_11_01_120001_create_hadith_collections_table.php` | `hadith_collections` |
| `database/migrations/2026_11_01_120002_create_hadith_books_table.php` | `hadith_books` |
| `database/migrations/2026_11_01_120003_create_hadith_chapters_table.php` | `hadith_chapters` |
| `database/migrations/2026_11_01_120004_create_hadith_entries_table.php` | `hadith_entries` |
| `database/migrations/2026_11_01_120005_create_hadith_grades_table.php` | `hadith_grades` |
| `database/migrations/2026_11_01_120006_create_hadith_ref_aliases_table.php` | `hadith_ref_aliases` |

Create (enum, models, factories, tests):

| Path | Purpose |
| --- | --- |
| `app/Domains/Hadith/Enums/HadithAliasMatch.php` | string-backed enum for `hadith_ref_aliases.match` |
| `app/Domains/Hadith/Models/HadithCollection.php` | model |
| `app/Domains/Hadith/Models/HadithBook.php` | model |
| `app/Domains/Hadith/Models/HadithChapter.php` | model |
| `app/Domains/Hadith/Models/HadithEntry.php` | model |
| `app/Domains/Hadith/Models/HadithGrade.php` | model |
| `app/Domains/Hadith/Models/HadithRefAlias.php` | model |
| `database/factories/Concerns/CreatesHadithResource.php` | trait: get-or-create the collection's `resources` row and the source id |
| `database/factories/HadithCollectionFactory.php` | factory |
| `database/factories/HadithBookFactory.php` | factory |
| `database/factories/HadithChapterFactory.php` | factory |
| `database/factories/HadithEntryFactory.php` | factory |
| `database/factories/HadithGradeFactory.php` | factory |
| `database/factories/HadithRefAliasFactory.php` | factory |
| `tests/Feature/Hadith/HadithSchemaTest.php` | tables, columns, keys, collations, round trips |
| `tests/Feature/Hadith/HadithModelsTest.php` | casts, relations, factories, states |

Change:

| Path | Change |
| --- | --- |
| `tests/Feature/Content/MirrorSchemaTest.php` | add six column names to the binary-collation list (see "Existing tests to update") |
| `tests/Unit/ArchitectureTest.php` | append two `arch()` rules (see Tests) |

`app/Domains/Hadith/` holds only `.gitkeep`. Leave `.gitkeep` in place. No service provider is added (the models need none; the Hadith provider arrives with the importer in step 6).

## Common table rules (every migration)

Start each `Schema::create` closure with exactly the Azkar header:

```php
$table->charset('utf8mb4');
$table->collation('utf8mb4_0900_ai_ci');
$table->innoDb();
```

- `resource_id`: `$table->foreignId('resource_id');` first column; then `$table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();`.
- `source_id`: `$table->foreignId('source_id');` and `$table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();` (same as `dua_hadith`).
- Own ids (`id`, `book_id`, `chapter_id`, `entry_id`, counts, positions, versions): `unsignedInteger`.
- No FK between the hadith tables themselves (composite keys; the importer keeps them consistent, like Azkar and Duas). Only `resource_id` and `source_id` FKs.
- Datetimes: `$table->dateTime('imported_at', 6);` (UTC `datetime(6)`).
- **Binary collation** columns are declared exactly like this (and only these six columns in the whole step get it):

```php
$table->string('title_ar', 200)->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
```

  The six `bin` columns: `hadith_collections.title_ar`, `hadith_collections.author_ar`, `hadith_collections.attribution_ar`, `hadith_books.title_ar`, `hadith_chapters.title_ar`, `hadith_entries.text_ar`. Rule: every `*_ar` column is `bin` (Arabic bytes are stored as received); `text_search`, English, number, key and grade columns stay `ai_ci`.
- Column order in each table is the order listed below. Do not add `created_at`, `updated_at`, `review_status`, `deleted_at` or any column not listed.
- Index names are fixed below (all under 64 characters).

## Tables (columns in order; "null" = nullable, everything else not null)

### `hadith_collections` (one row per collection, one per pack)

| # | Column | Type |
| ---: | --- | --- |
| 1 | `resource_id` | `foreignId` |
| 2 | `id` | `unsignedInteger` |
| 3 | `slug` | `string(32)` |
| 4 | `source_id` | `foreignId` |
| 5 | `source_code` | `string(32)` |
| 6 | `title_ar` | `string(200)` null, **bin** |
| 7 | `title_en` | `string(200)` null |
| 8 | `author_ar` | `string(200)` null, **bin** |
| 9 | `author_en` | `string(200)` null |
| 10 | `attribution_ar` | `text`, **bin** |
| 11 | `attribution_en` | `text` |
| 12 | `source_url` | `string(500)` null |
| 13 | `total_hadith` | `unsignedInteger` |
| 14 | `books_count` | `unsignedInteger` |
| 15 | `source_version` | `string(64)` |
| 16 | `imported_at` | `dateTime(6)` |

Keys: primary (`resource_id`, `id`); unique `hadith_collections_slug_unique` on `slug`; FKs per "Common table rules".

### `hadith_books`

| # | Column | Type |
| ---: | --- | --- |
| 1 | `resource_id` | `foreignId` |
| 2 | `id` | `unsignedInteger` |
| 3 | `book_number` | `string(16)` (text, never numeric) |
| 4 | `title_ar` | `string(500)` null, **bin** |
| 5 | `title_en` | `string(500)` null |
| 6 | `position` | `unsignedInteger` |
| 7 | `hadith_count` | `unsignedInteger` |
| 8 | `source_id` | `foreignId` |
| 9 | `source_key` | `string(96)` |

Keys: primary (`resource_id`, `id`); unique `hadith_books_source_key_unique` on (`source_id`, `source_key`); index `hadith_books_position_index` on (`resource_id`, `position`).

### `hadith_chapters` (empty for fawazahmed0; exists for Sunnah.com)

| # | Column | Type |
| ---: | --- | --- |
| 1 | `resource_id` | `foreignId` |
| 2 | `id` | `unsignedInteger` |
| 3 | `book_id` | `unsignedInteger` |
| 4 | `chapter_number` | `unsignedInteger` (Taybah ordinal in the book; not stable across sources) |
| 5 | `source_chapter_key` | `string(32)` null (Sunnah.com float id as text) |
| 6 | `title_ar` | `text` null, **bin** |
| 7 | `title_en` | `text` null |
| 8 | `position` | `unsignedInteger` |
| 9 | `hadith_count` | `unsignedInteger` |
| 10 | `source_id` | `foreignId` |
| 11 | `source_key` | `string(96)` |

Keys: primary (`resource_id`, `id`); unique `hadith_chapters_source_key_unique` on (`source_id`, `source_key`); index `hadith_chapters_book_position_index` on (`resource_id`, `book_id`, `position`).

### `hadith_entries` (one row per hadith)

| # | Column | Type |
| ---: | --- | --- |
| 1 | `resource_id` | `foreignId` |
| 2 | `id` | `unsignedInteger` |
| 3 | `book_id` | `unsignedInteger` |
| 4 | `chapter_id` | `unsignedInteger` null |
| 5 | `hadith_number` | `string(32)` (text: `2787.2`-style and suffixed numbers exist) |
| 6 | `arabic_number` | `string(32)` null |
| 7 | `position` | `unsignedInteger` |
| 8 | `text_ar` | `mediumText`, **bin** (byte-exact) |
| 9 | `text_en` | `mediumText` null (empty for fawazahmed0) |
| 10 | `narrator_en` | `mediumText` null (empty for fawazahmed0) |
| 11 | `text_search` | `mediumText` |
| 12 | `source_url` | `string(500)` null (null for fawazahmed0) |
| 13 | `source_id` | `foreignId` |
| 14 | `source_key` | `string(96)` |
| 15 | `source_text_sha256` | `char('source_text_sha256', 64)` |
| 16 | `source_version` | `string(64)` |
| 17 | `imported_at` | `dateTime(6)` |

Keys: primary (`resource_id`, `id`); unique `hadith_entries_source_key_unique` on (`source_id`, `source_key`); **non-unique** index `hadith_entries_number_index` on (`resource_id`, `hadith_number`) (not unique until the import dry run shows whether duplicates exist; do not make it unique); index `hadith_entries_book_position_index` on (`resource_id`, `book_id`, `chapter_id`, `position`).

`mediumText` (not the spec's plain `text`) for `text_ar`, `text_en`, `narrator_en`, `text_search` so no long hadith can hit the 64 KB limit; it is the same SQLite `text` type in the pack. See Open question 2.

### `hadith_grades` (every grade stored; none served while `hadith.grades_visible` is false)

| # | Column | Type |
| ---: | --- | --- |
| 1 | `resource_id` | `foreignId` |
| 2 | `id` | `unsignedInteger` |
| 3 | `entry_id` | `unsignedInteger` |
| 4 | `grade` | `string(120)` (as received) |
| 5 | `graded_by` | `string(200)` null |
| 6 | `source_id` | `foreignId` |
| 7 | `source_key` | `string(96)` |

Keys: primary (`resource_id`, `id`); index `hadith_grades_entry_index` on (`resource_id`, `entry_id`). No unique on (`source_id`, `source_key`) (the spec lists none), no `review_status`.

### `hadith_ref_aliases` (empty until a source switch)

| # | Column | Type |
| ---: | --- | --- |
| 1 | `resource_id` | `foreignId` |
| 2 | `old_number` | `string(32)` |
| 3 | `new_number` | `string(32)` null |
| 4 | `match` | `string(16)` (stores a `HadithAliasMatch` value; **not** a MySQL `enum`, see Open question 1) |
| 5 | `since_version` | `unsignedInteger` |

Keys: primary (`resource_id`, `old_number`, `since_version`); FK `resource_id` only (no `source_id`). `match` is a reserved word in MySQL; Laravel's schema builder and Eloquent quote it, but any raw SQL you write must write it as `` `match` ``.

## Enum

`app/Domains/Hadith/Enums/HadithAliasMatch.php`: `enum HadithAliasMatch: string` in namespace `App\Domains\Hadith\Enums`, cases `ExactText = 'exact_text'`, `SimilarText = 'similar_text'`, `NumberOnly = 'number_only'`, `None = 'none'`. No methods.

## Models (namespace `App\Domains\Hadith\Models`, all `final`)

Copy `app/Domains/Duas/Models/DuaItem.php`. Each model has: `use HasFactory` with `/** @use HasFactory<XFactory> */`, `protected $table`, `public $incrementing = false;`, `public $timestamps = false;`, `protected static function newFactory(): XFactory { return XFactory::new(); }`, a class PHPDoc listing every column as `@property` with its PHP type, and a `casts()` method as below. Composite keys: Eloquent does not support them, so models are read with `->where(...)` and written through factories or `insert`; do not call `find()`, `save()` or `update()` on them (comment this once on `HadithCollection`, like `AzkarEntry`). Do not set `$fillable`, `$guarded` or `#[Fillable]` (factories create rows through Laravel's unguarded factory path, as the Duas models do).

Casts (`casts(): array<string, string>`):

| Model (table) | Casts |
| --- | --- |
| `HadithCollection` (`hadith_collections`) | `resource_id`, `id`, `source_id`, `total_hadith`, `books_count` => `integer`; `imported_at` => `immutable_datetime` |
| `HadithBook` (`hadith_books`) | `resource_id`, `id`, `position`, `hadith_count`, `source_id` => `integer`; `book_number` stays string |
| `HadithChapter` (`hadith_chapters`) | `resource_id`, `id`, `book_id`, `chapter_number`, `position`, `hadith_count`, `source_id` => `integer` |
| `HadithEntry` (`hadith_entries`) | `resource_id`, `id`, `book_id`, `chapter_id`, `position`, `source_id` => `integer` (`chapter_id` null stays null); `imported_at` => `immutable_datetime`; `hadith_number` and `arabic_number` stay string (never cast to int or float) |
| `HadithGrade` (`hadith_grades`) | `resource_id`, `id`, `entry_id`, `source_id` => `integer` |
| `HadithRefAlias` (`hadith_ref_aliases`) | `resource_id`, `since_version` => `integer`; `match` => `HadithAliasMatch::class` |

Relations (typed with generics, like `Resource::source()`):
- Every model except `HadithRefAlias`: `source(): BelongsTo<ContentSource, $this>` = `belongsTo(ContentSource::class, 'source_id')`.
- Every model: `resource(): BelongsTo<Resource, $this>` = `belongsTo(Resource::class, 'resource_id')` (import `App\Domains\Content\Models\Resource` and `ContentSource`).
- No parent/child relations between hadith models (the keys are composite; a plain `hasMany` on `book_id` would cross resources). Step 4/6/7 query children with `where('resource_id', …)` explicitly. Do not edit `Resource` here.
- Model code must not call `Resource` through its `group` cast for hadith rows: until step 4 adds the enum case, `Resource::query()->find()` on a `hadith_collections` row throws on the cast. Tests and factories therefore create and read that resource with `DB::table('resources')` only.

## Factories (namespace `Database\Factories`, `@extends Factory<Model>`, `protected $model = X::class;`)

### Trait `database/factories/Concerns/CreatesHadithResource.php`

Copy `CreatesDuasResource` with two methods:

- `protected function hadithSourceId(): int`: return `DB::table('content_sources')->where('code', 'fawazahmed0')->value('id')` when it is an int (the step 2 migration inserts it); otherwise insert a row with `code` `fawazahmed0`, `name` `FIXTURE fawazahmed0`, `licence_url` `https://example.com/licence`, `attribution_ar` `FIXTURE`, `attribution_en` `FIXTURE`, `permission_status` `not_required`, `notes` `FIXTURE`, `created_at`/`updated_at` `now()` and return the new id.
- `protected function hadithResourceId(string $slug = 'fixture-collection'): int`: return the id of the `resources` row with `group` `hadith_collections` and `source_key` `$slug` when it exists; otherwise `DB::table('resources')->insertGetId([...])` with `source_id` = `hadithSourceId()`, `group` `hadith_collections`, `source_key` `$slug`, `name` `FIXTURE hadith collection`, `language_code` `ar`, `direction` `rtl`, `version` 1, `is_active` true, `created_at`/`updated_at` `now()`.

### Common to all factories
`private static int $nextId = 1;` counter, used as `'id' => self::$nextId++`. Default `resource_id` is `fn (): int => $this->hadithResourceId()` (all rows of a test share one default resource, so books/entries/grades/chapters made without arguments live together), except `HadithCollectionFactory` (below). `source_id` is `fn (): int => $this->hadithSourceId()`. Every `source_key` is unique per call (use the counter). The test passes `resource_id`, `book_id` etc. explicitly when it needs rows to match.

### Placeholders (the only text any factory or test may use)
- Hadith body: `FIXTURE text 1 — not a hadith` (Latin), or «نص تجريبي ١ — ليس حديثًا» (Arabic).
- Titles: `FIXTURE title — not a hadith` and the Arabic «عنوان تجريبي — ليس عنوانًا».
- Grade: `FIXTURE grade`. Grader: `FIXTURE grader`.
- Authors and attribution: `FIXTURE author`, `FIXTURE attribution`.
- Source: code `fawazahmed0` in `source_code`; `source_version` `df57907be35291c91ad6a6691180e22ca9920784` (copy from `config('hadith.commit')`, do not retype).
- A bidi test value built in code: `"FIXTURE text 1 — not a hadith \u{200F}"`.

### Per factory

- **`HadithCollectionFactory`**: `resource_id` => `fn (array $attributes): int => $this->hadithResourceId((string) $attributes['slug'])` (so each slug gets its own resource; a slug given by the test is honoured), `id` => counter, `slug` => `fake()->unique()->numerify('fixture-####')` (≤ 32 chars), `source_id` => `hadithSourceId()`, `source_code` `fawazahmed0`, `title_ar` `FIXTURE title — not a hadith`, `title_en` `FIXTURE title`, `author_ar` `FIXTURE author`, `author_en` `FIXTURE author`, `attribution_ar` `FIXTURE attribution`, `attribution_en` `FIXTURE attribution`, `source_url` null, `total_hadith` 1, `books_count` 1, `source_version` = `config('hadith.commit')`, `imported_at` `now()`. States: `untitled()` (`title_ar`, `title_en`, `author_ar`, `author_en` all null; the D9 «مجموعة {n}» case); `arabicTitled()` (`title_ar` = «عنوان تجريبي — ليس عنوانًا»).
- **`HadithBookFactory`**: `book_number` => `(string) $counter` placeholder via `(string) fake()->unique()->numberBetween(1, 99999)`, `title_ar` and `title_en` placeholders, `position` 1, `hadith_count` 1, `source_key` => `'fawazahmed0:fixture:book:'.counter`. States: `untitled()` (`title_ar` null, `title_en` null); `sectionZero()` (`book_number` `0`, titles null).
- **`HadithChapterFactory`**: `book_id` 1, `chapter_number` 1, `source_chapter_key` null, titles placeholders, `position` 1, `hadith_count` 1, `source_key` => `'sunnahcom:fixture:chapter:'.counter`. State `withChapterKey(string $key = '1.5')` sets `source_chapter_key`.
- **`HadithEntryFactory`**: `book_id` 1, `chapter_id` null, `hadith_number` => `(string) counter`, `arabic_number` null, `position` 1, `text_ar` `FIXTURE text 1 — not a hadith`, `text_en` null, `narrator_en` null, `text_search` `fixture text 1 not a hadith`, `source_url` null, `source_key` => `'fawazahmed0:fixture:'.counter`, `source_text_sha256` => `hash('sha256', <the text_ar value>)` (compute from the same string variable), `source_version` = `config('hadith.commit')`, `imported_at` `now()`. States: `inChapter(int $chapterId)`; `decimalNumber()` (`hadith_number` `2787.2`, `arabic_number` `2787.2`); `withBidiMark()` (`text_ar` = `"FIXTURE text 1 — not a hadith \u{200F}"`, and `source_text_sha256` recomputed from it); `arabic()` (`text_ar` «نص تجريبي ١ — ليس حديثًا», sha recomputed).
- **`HadithGradeFactory`**: `entry_id` 1, `grade` `FIXTURE grade`, `graded_by` `FIXTURE grader`, `source_key` => `'fawazahmed0:fixture:grade:'.counter`. State `ungraded()` (`graded_by` null).
- **`HadithRefAliasFactory`**: `old_number` => `(string) fake()->unique()->numberBetween(1, 99999)`, `new_number` => same value, `match` => `HadithAliasMatch::ExactText`, `since_version` 1. States: `withoutNewNumber()` (`new_number` null, `match` `None`); `ofMatch(HadithAliasMatch $match)`.

## Existing tests to update

`tests/Feature/Content/MirrorSchemaTest.php`, test `it('stores quran text in the binary collation and no other text column', …)` asserts the exact sorted list of `utf8mb4_0900_bin` columns, so it fails as soon as the migrations run. Replace the expected array with this (sorted as PHP `sort()` orders it; the six new names sit between `dua_hadith.title` and `names.name_ar`), and extend the existing comment on `names.name_ar` style with one line for the new rows:

```php
expect($binary)->toBe([
    'dua_groups.title',
    'dua_hadith.attribution',
    'dua_hadith.explanation',
    'dua_hadith.grade',
    'dua_hadith.hadeeth',
    'dua_hadith.reference',
    'dua_hadith.title',
    // Hadith Arabic is source text stored byte-for-byte (ADR 0042), like the dua and names source columns.
    'hadith_books.title_ar',
    'hadith_chapters.title_ar',
    'hadith_collections.attribution_ar',
    'hadith_collections.author_ar',
    'hadith_collections.title_ar',
    'hadith_entries.text_ar',
    // Names of Allah are source text stored byte-for-byte (ADR 0043 A2), like the dua source columns.
    'names.name_ar',
    'tafsir_entries.html',
    'word_layouts.glyph',
]);
```

Do not touch the `ContentSource` count test in that file (step 2 already updated it). No other existing test lists all tables or collations (checked with a grep of `tests/` and `app/` for `information_schema`, `getTables` and `TABLE_NAME`: only `MirrorSchemaTest` and `DuasMigrationTest`; the latter filters on `dua_%`).

## Tests (Pest, `declare(strict_types=1)`, placeholders only)

Both new files use `uses(RefreshDatabase::class);`. Helper function names are global in Pest: prefix every helper `hadithSchema…` or `hadithModels…` and do **not** reuse `hadithMigration`, `hadithConfigFromFile`, `hadithConfigSetEnv` or `hadithTitlesExpected` (they exist in step 2's tests).

### `tests/Feature/Hadith/HadithSchemaTest.php`
Helpers (copy from `DuasMigrationTest.php`): `hadithSchemaContract()` returning, per table, `columns` (list in order, nullable ones suffixed `?`, exactly as in the tables above), `primary`, `indexes` (name => columns), `uniques` (names); `hadithSchemaCreateNames()` returning `create_<table>_table` for the six tables; `hadithSchemaMigration(string $name): object` (glob `database_path('migrations/*_'.$name.'.php')`, expect one match, `require` it); `hadithSchemaColumnsOf(string $table): list<string>` (`Schema::getColumns`, `name` plus `?` when nullable).

- `it('creates the six hadith tables with the canonical columns, keys and indexes', …)`: run `down()` in reverse, then `up()` in order; for each table: it exists, `hadithSchemaColumnsOf` equals the contract list, the primary key columns equal, each named index has the listed columns, each named unique is unique, and the foreign keys include `resources` with `on_delete` `cascade`; for the five tables that have `source_id`, a foreign key to `content_sources` with `on_delete` `restrict`; `hadith_ref_aliases` has no `content_sources` foreign key.
- `it('drops every hadith table on down and restores it on up', …)`.
- `it('stores the Arabic columns in the binary collation and every other hadith column in ai_ci', …)`: query `information_schema.COLUMNS` for `TABLE_NAME like 'hadith\_%'` (escape the underscore) with a non-null `COLLATION_NAME`; the `utf8mb4_0900_bin` set equals exactly the six columns listed in "Common table rules"; every other text column (`text_search`, `title_en`, `grade`, `hadith_number`, `source_key`, …) is `utf8mb4_0900_ai_ci`.
- `it('keeps hadith numbers as text and round-trips a decimal number', …)`: `HadithEntry::factory()->decimalNumber()->create()`; read it back with `DB::table('hadith_entries')`; `hadith_number` `toBe('2787.2')` (identical, a string), and the column type reported by `Schema::getColumns` is `varchar(32)`.
- `it('round-trips Arabic text byte for byte including a bidi mark and surrounding spaces', …)`: sample `" FIXTURE text 1 — not a hadith \u{200F}  "` plus the Arabic placeholder with a shadda and fatha (`"نص تجريبي \u{0651}\u{064E} ١ — ليس حديثًا"`) in `text_ar`, `HadithCollection` `title_ar` and `HadithBook` `title_ar`; `bin2hex` of the stored value equals `bin2hex` of the sample (no trim, no normalisation).
- `it('treats two Arabic strings that differ only by a diacritic as different values', …)`: store two entries whose `text_ar` differ only by one harakah, then `where('text_ar', $a)` returns only the first (proves `bin`, not `ai_ci`).
- `it('rejects a duplicate (source_id, source_key) in books, chapters and entries', …)`: three `toThrow(QueryException::class)` expectations with the same `source_id` and `source_key`.
- `it('allows the same source_key under a different source', …)`: an entry with the same `source_key` but another `source_id` (insert a second content source row with a unique code, `FIXTURE`) succeeds.
- `it('does not make (resource_id, hadith_number) unique', …)`: two entries with the same `resource_id` and `hadith_number` and different `source_key` both insert; the `hadith_entries_number_index` index has `unique` false.
- `it('allows a null chapter_id and a chapter id', …)`: entry without a chapter has `chapter_id` null; `inChapter(5)` stores 5.
- `it('rejects a duplicate collection slug', …)` and `it('keeps the resource primary key composite', …)` (two collections in different resources may both have `id` 1; the same `resource_id` and `id` throws).
- `it('removes every hadith row when its resource is deleted', …)`: create one row in each of the six tables under one resource (aliases included), `DB::table('resources')->where('id', $resourceId)->delete()`, all six tables are empty for that `resource_id`.
- `it('refuses to delete a content source that hadith rows use', …)`: deleting the `fawazahmed0` source while an entry exists throws `QueryException` (restrict).
- `it('stores a grade without a grader', …)`: `HadithGrade::factory()->ungraded()->create()`; `graded_by` is null.
- `it('stores the alias match as a string value', …)`: create `HadithRefAlias::factory()->ofMatch(HadithAliasMatch::SimilarText)->create()`; the raw column from `DB::table` is `'similar_text'`.

### `tests/Feature/Hadith/HadithModelsTest.php`
- `it('creates a valid row from every hadith factory', …)` (six `toBeInstanceOf` checks).
- `it('casts integers, dates and the alias match', …)`: types of `id`, `book_id`, `imported_at` (`CarbonImmutable`), `match` (`HadithAliasMatch`); `hadith_number` is a `string`.
- `it('resolves the resource and the source relations', …)`: for a `HadithEntry`, `source->code` is `fawazahmed0`; `resource()` is a `BelongsTo` (assert `$entry->resource()->getRelated()` is `Resource`, **without** loading a hadith resource row, because the group cast has no enum case until step 4). `HadithRefAlias` has `resource()` and no `source()` method (`method_exists` false).
- `it('builds the untitled and arabic states', …)`: `HadithCollection::factory()->untitled()` has null `title_ar`; `HadithBook::factory()->sectionZero()` has `book_number` `0`; `HadithEntry::factory()->withBidiMark()` stores a `source_text_sha256` equal to `hash('sha256', $entry->text_ar)`.
- `it('uses only placeholder text in the factories', …)`: for each created row, no string column contains Arabic letters other than the two allowed Arabic placeholders (assert every Arabic value `toBeIn([...two placeholders...])`), and the Latin text columns start with `FIXTURE`.

### `tests/Unit/ArchitectureTest.php` (append at the end of the file)
```php
arch('hadith models extend eloquent')
    ->expect('App\Domains\Hadith\Models')
    ->toExtend(Model::class);

arch('hadith enums are string backed')
    ->expect('App\Domains\Hadith\Enums')
    ->toBeStringBackedEnums();
```
(If the installed Pest has no `toBeStringBackedEnums`, use `->toBeEnums()` and a plain test asserting `HadithAliasMatch::from('exact_text')`.) Models must not import `Illuminate\Http`: add `->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation'])` to the models rule.

## What step 4 (pack contract) needs from this step
- Table and column names above are the contract. The pack tables are these columns **in the same order, without `source_id` and `source_key`** (spec §6 "as backend without `source_id` and `source_key`"). Concretely: `hadith_collections` drops `source_id` and keeps `source_code`; `hadith_books`, `hadith_chapters`, `hadith_entries` and `hadith_grades` drop `source_id`, `source_key`. `hadith_ref_aliases` has neither and ships whole. Primary keys and the `hadith_entries` index (`resource_id`, `hadith_number`) carry over.
- `PackSchema` and the pack builder must read with `DB::table(...)` or the models via `toBase()`; composite keys mean no `find()`.
- A `resources` row for a collection is `group = 'hadith_collections'`, `source_key` = canonical slug, `language_code = 'ar'`, `direction = 'rtl'`. Step 4 adds `ResourceGroup::HadithCollections` (`'hadith_collections'`) and `ServedResourceGroup::HadithCollections`; the factories here insert that string directly, so step 4 needs no factory change. After step 4 lands, `Resource` rows of this group can be loaded through the model.
- Step 4's gate treats `content_sources.permission_status` `not_required` as deliverable like `granted` (D12). The `fawazahmed0` row from step 2 is `not_required`; the factory trait reuses that row.
- `hadith_grades` is filled by the importer but the builder leaves the pack table empty while `config('hadith.grades_visible')` is false; nothing here enforces that.
- Per-collection pack = all rows with one `resource_id`; the collection row is `hadith_collections` where `resource_id` = the resource.
- Normalised search: `text_search` is written by the step 4 `HadithSearchTextNormalizer`; this step only stores whatever it is given.
- `dua_collection_refs.collection_slug` and `dua_collection_books.collection_slug` (Duas, ADR 0044) hold collection slugs; their fixtures use `bukhari`. If real Duas data ever references `nawawi`, `qudsi` or `dehlawi`, it must use the D13 slugs. Nothing to change in this step.

## Gates
Run from `apps/api` with the local PHP 8.5 (`/opt/homebrew/bin/php`, MySQL and Redis running):

```bash
composer qa
```

(`pint --test`, `phpstan analyse` at level 8, `pest --parallel`.) If Pint reports style issues, run `vendor/bin/pint` once, then rerun `composer qa`. Also run the migrations once by hand to prove the down path: `php artisan migrate:rollback --step=6 && php artisan migrate` on the local database (or rely on the schema tests). No dependency changes, so `composer audit` and `node .github/scripts/npm-audit.mjs` are not required. **No OpenAPI change is expected** (no route, controller, resource or schema change): `npm run generate -w @quran/api-contract` must produce no diff in `openapi.json` or `schema.d.ts`. If it does, stop and report.

## Out of scope
- `ResourceGroup`, `ServedResourceGroup`, `PackSchema`, the pack builder, the manifest, the grade filter, `HadithSearchTextNormalizer` and every mobile file (step 4).
- The fawazahmed0 client, snapshot, source interface and DTOs (step 5); the mapper, validator, `hadith:import`, report, matcher command and scheduler entry (step 6); repositories, services, controllers, resources and routes (steps 6 and 7); a Hadith service provider.
- Composite foreign keys between hadith tables, any column not listed, `review_status`, soft deletes, timestamps.
- Seeding any row into the six tables (the importer does it). No hadith text, grade text, section name or title anywhere. Editing `docs/technical-spec.md`, ADR 0042, `docs/plans/phase-7.md`, `config/hadith.php`, `config/hadith_titles.php` or the `.env` files.
- The Duas `collection_slug` columns and the Azkar tables.

## Open questions for the developer

1. **`hadith_ref_aliases.match` type.** Spec §5 says `enum(exact_text,similar_text,number_only,none)`, but `apps/api/.ai/rules/migrations.md` and `models.md` say store categorical values as `varchar` and cast to a backed PHP enum so a new case needs no migration. This brief follows the rule file: `string(16)` plus `HadithAliasMatch`. If you want a real MySQL `enum`, say so; the spec line then stays as written.
2. **`text` vs `mediumText`.** The spec lists `text_ar`, `text_en`, `narrator_en`, `text_search` as `text`; Azkar and Duas use `mediumText` for source text (the Azkar rule: never truncate religious text). This brief uses `mediumText` (same SQLite `text` in the pack, no contract change). Confirm or ask for `text`.
3. **Which columns are `bin`.** The spec says "Arabic columns are `utf8mb4_0900_bin`" but lists none by name. This brief picks every `*_ar` column (six, including `attribution_ar` and `author_ar`), and leaves English, number, key and grade columns `ai_ci`. Hadith numbers with letter suffixes (Sunnah.com) are compared case-insensitively under `ai_ci`; say so if you want `hadith_number` and `old_number` binary too.
4. **Stale slugs in other documents (conflict, not changed here).** D13 and `config/hadith.php` freeze `nawawi40`, `qudsi40`, `shahwaliullah40`, but ADR 0042 §7 and §3, spec §7 (the "Hadith collections are not synced from QF" bullet), the plan's "Canonical slugs" paragraph and README still list `nawawi`, `qudsi`, `dehlawi`; the step 2 brief's `config/hadith_titles.php` table is also keyed by the old slugs while the shipped file uses the new ones. The code follows D13. Someone should update those documents.
5. **Parent/child relations.** No `hasMany`/`belongsTo` between hadith models is defined (composite keys would cross resources). Step 6/7 repositories join with an explicit `resource_id`. Say so if you want constrained relations added.
