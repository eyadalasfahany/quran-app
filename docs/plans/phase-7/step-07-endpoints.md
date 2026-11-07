# Step 7 — Hadith API endpoints and the OpenAPI contract

ADR 0042 (Accepted, with the 2 Nov and 7 Nov amendments; ADR `0042-features-enabled-by-default` for "no switch"), ADR 0076 (Proposed, only its "Rule, 7 Nov 2026" completeness section and the chapter seam), ADR 0006 (API Resources), spec §8 and §9. Plan: `docs/plans/phase-7.md` ("API and routes", the step 7 row, its tests row, D4, D12 to D16, RB24). Read `docs/plans/phase-7/README.md`, `.claude/agent-rules.md`, `apps/api/CLAUDE.md`, `apps/api/.ai/rules/*`, the `scramble-development` skill (`apps/api/.claude/skills/scramble-development/SKILL.md`) and `docs/plans/phase-7/step-06-importer.md` first. **No hadith text of any kind is written in this step**: code, tests, fixtures and your final report use the factory placeholders only (`HadithEntryFactory::LATIN_TEXT`, `::ARABIC_TEXT`, `::BIDI_TEXT`, `FIXTURE grade`, `FIXTURE grader`, `HadithCollectionFactory::ARABIC_TITLE`). Reports give counts, keys and paths only.

## Goal
Five read-only, public endpoints under `/api/v1/hadith/collections…` that serve the catalogue of the hadith collections that are **served** (see "The served rule"), and the OpenAPI document and TypeScript types regenerated in the same change. The app reads hadith **packs** for reading (plan "API and routes"); these endpoints serve the collection catalogue before a pack is installed and the contract.

## Rules for this step
- Branch `main` (CLAUDE.md, 6 Nov 2026). Check with `git branch --show-current`. Do not commit, push, switch branches or add dependencies.
- **Another agent is working in `apps/mobile` (steps 10 and 12) and another on the OpenITI gap measurement. Another session may run tests at the same time.** Every test that touches the database uses `RefreshDatabase`. Do not run `php artisan migrate` against the shared database. Do not run mobile gates (their errors would be noise).
- Do not touch these (other sessions' or earlier steps' files): `CLAUDE.md`, `docs/**` (all of it, including the spec, the plan, ADR 0076 and `docs/plans/phase-7/gapfill-report.md`), anything under `apps/mobile/`, the importer and its files (`app/Domains/Hadith/{Import,Console,Sources,Contracts,Validation,Exceptions}/**`, `HadithImportServiceProvider`, `HadithSourceServiceProvider`, `Services/{HadithImporter,HadithMapper,HadithImportFingerprint,HadithTextIntegrityChecker,HadithTitles,HadithRangeCorrections,HadithSectionTitleMatcher,HadithSectionTitleProposer}.php`, `Repositories/**/HadithImportRepository*`, `EloquentHadithImportRepository`), the migrations, the models, the factories, `PackSchema`, `PackBuilder`, `config/hadith*.php`. Chapters and the pack-builder refusal belong to step 6b.
- Shared files are edited **additively and at the end**: `bootstrap/providers.php` (append one line and one `use`), `lang/en/problems.php` and `lang/ar/problems.php` (append keys), `app/Support/ProblemDetails/ProblemDetailsRenderer.php` (one new `match` arm), `app/Domains/Content/Services/ContentDeliveryService.php` (one small refactor, below).
- Laravel standards (`apps/api/CLAUDE.md`): `declare(strict_types=1)`, full typing, `final` classes, domain exceptions, Larastan level 8. Controller → FormRequest → Data → Service → Repository contract → Eloquent repository → Model; response through an API Resource (ADR 0006). Services never touch `Illuminate\Http`; repositories never use the `DB` facade and open no transaction; controllers never touch Eloquent. `App\Domains\Hadith\Data` classes **must extend `Spatie\LaravelData\Data`** (`tests/Unit/ArchitectureTest.php`), so every class in that namespace does.
- The hadith tables have **composite keys** (`resource_id`, `id`) and no relations between them. Read with `where('resource_id', …)->where('id', …)`, never `find()`.
- Hadith text is never altered: no `trim`, no normalisation, no re-encoding of `text_ar`. `text_search`, `text_en`, `narrator_en`, `source_text_sha256`, `source_key`, `source_id`, `source_version`, `imported_at` and every internal `id` of a book, chapter or hadith are **never** in a response.
- No grade is in any response while `config('hadith.grades_visible')` is `false` (D4): no `grades` key at all, not even an empty list.
- `Accept-Language` never changes content. It changes only the problem-details `title` and `detail`.

## Facts this brief rests on (checked in the code on `main`, 7 Nov 2026)
- Models `HadithCollection`, `HadithBook`, `HadithChapter`, `HadithEntry`, `HadithGrade` exist in `app/Domains/Hadith/Models` with the columns in the step 3 migrations. Factories `HadithCollectionFactory`, `HadithBookFactory`, `HadithChapterFactory`, `HadithEntryFactory`, `HadithGradeFactory` exist (with the trait `Database\Factories\Concerns\CreatesHadithResource`, which creates the `resources` row, group `hadith_collections`, and the `fawazahmed0` content source).
- **Factory traps.** `HadithCollectionFactory` makes its own `resources` row from `slug`; its default slug is `fixture-####`, which the route regex below rejects, so tests always pass a canonical slug (`bukhari`, `muslim`, `nawawi40`, …). `HadithBookFactory`, `HadithChapterFactory`, `HadithEntryFactory`, `HadithGradeFactory` default `resource_id` to the resource of slug `fixture-collection`, **not** the collection's: always pass `'resource_id' => $collection->resource_id`. They default `position => 1`, `book_id => 1`, `chapter_id => null`; pagination tests set explicit distinct `position` values. `HadithBookFactory` generates a random `book_number`; set it when a test needs a known one.
- Importer shape (step 6): `hadith_books.position` is 1..n per collection, `hadith_entries.position` is 1..n **per book**, chapters carry `position` per book. `hadith_number` and `book_number` are text. `(resource_id, hadith_number)` is a **non-unique** index (step 6 rejects duplicates, so none exist in real data, but the schema allows them).
- `ContentDeliveryService::manifest()` decides what is served: active resource (`ResourceRepository::activeWithPacks()`), `isServed()`, newest `content_packs` row by version, and the pack file exists on disk `local`. `ServedResourceGroup::HadithCollections` and `ResourceGroup::HadithCollections` exist. There is no hadith gate (D12). The Azkar-style `PackBuilder` guard (`assertReady`) is how step 6b will refuse an incomplete collection.
- `ProblemDetailsRenderer` takes `code` from the HTTP status only (`not_found`, `validation_failed`, …). A `ModelNotFoundException` with a friendly message renders `code: not_found` and that message as `detail` (`LocalizedProblemsTest`). It cannot emit a domain code such as `hadith_collection_unavailable` today (see "Problem codes").
- Cursor helpers exist: `App\Domains\Content\Packs\ChangeCursor::encode(int): string` / `decode(string): ?int` (opaque base64url of a positive int) and `App\Domains\Content\Http\Requests\ChangeCursorRule` (message key `content.cursor_invalid`). This step reuses them for a **position** cursor; the name says "change" but they are generic.
- Laravel's `cache.headers` middleware (alias registered by default) sets `ETag` and `Cache-Control` and answers `If-None-Match` with `304`; it skips non-2xx responses (`app/Support/Http/Middleware/NoStore.php` comment).
- Rate limiter `content` (300/min per IP) is registered in `ContentServiceProvider::boot()`; reuse it with `throttle:content`.
- `ProblemDetailsResourceTypeToSchema` types `code` as a plain string, so a new code value changes no schema.
- Hadith has no `routes.php` and no HTTP code yet; `app/Domains/Hadith/Data`, `Http`, `Repositories/Contracts/HadithCatalogue*` do not exist.

## The served rule (incomplete collections are held back, ADR 0076 "Rule, 7 Nov 2026", RB24)
**A collection is served if and only if its `resources` row would be listed in `GET /api/v1/content/manifest`**: active, not ignored, with a `content_packs` row, and the newest pack's file present on disk `local`. These endpoints never decide completeness themselves.

Why this is the right gate: an incomplete collection is **not packed** (the pack-builder refusal is added in step 6b), so it has no pack and is therefore not served, not listed and 404 on every route. A collection is also not served when its pack file is missing (ephemeral disk), when its resource is inactive, or when it has a pack but no `hadith_collections` row.

How: one predicate, shared with the manifest so the two cannot drift.
1. In `ContentDeliveryService` extract the manifest's per-resource check into `private function servedPack(Resource $resource): ?ContentPack` (returns null when `! $this->isServed($resource)`, when there is no pack, or when `Storage::disk('local')->exists($pack->path)` is false; otherwise the newest pack by `version`). `manifest()` calls it and `continue`s on null. **Behaviour of `manifest()` must not change**; `tests/Feature/Content/ContentDeliveryTest.php` and the other Content tests stay green and unedited.
2. Add `public function servedResourceIds(ResourceGroup $group): array` (`@return list<int>`): loops `$this->resources->activeWithPacks()`, keeps resources whose `group === $group` and for which `servedPack()` is not null, returns their ids (ascending).
3. `HadithCatalogueService` calls `servedResourceIds(ResourceGroup::HadithCollections)` once per request and passes the ids to the repository, which only ever returns collections whose `resource_id` is in that list.

An unknown slug, a held-back slug and a slug with no pack all give the **same** answer (`404 hadith_collection_unavailable`): the endpoint cannot tell them apart and does not leak which collections exist. The endpoints do not re-verify completeness at request time (open question 5).

## Files

Create (production, under `apps/api/`):

| Path | Purpose |
| --- | --- |
| `app/Support/ProblemDetails/ProvidesProblemCode.php` | interface: `problemStatus(): int`, `problemCode(): string` |
| `app/Domains/Hadith/Exceptions/HadithCollectionUnavailableException.php` | `final class … extends RuntimeException implements ProvidesProblemCode`; 404, code `hadith_collection_unavailable` |
| `app/Domains/Hadith/HadithServiceProvider.php` | binds the catalogue repository, registers `routes.php` |
| `app/Domains/Hadith/routes.php` | the five routes |
| `app/Domains/Hadith/Http/Controllers/HadithCollectionController.php` | `index` |
| `app/Domains/Hadith/Http/Controllers/HadithBookController.php` | `index` |
| `app/Domains/Hadith/Http/Controllers/HadithChapterController.php` | `index` |
| `app/Domains/Hadith/Http/Controllers/HadithEntryController.php` | `index` (a book's hadith), `show` (one hadith) |
| `app/Domains/Hadith/Http/Requests/HadithPageRequest.php` | `limit`, `cursor` (books and chapters) |
| `app/Domains/Hadith/Http/Requests/HadithEntriesRequest.php` | `limit`, `cursor`, `chapter` |
| `app/Domains/Hadith/Http/Resources/HadithCollectionResource.php` | one collection |
| `app/Domains/Hadith/Http/Resources/HadithCollectionsResource.php` | list envelope of collections |
| `app/Domains/Hadith/Http/Resources/HadithBookResource.php` | one book |
| `app/Domains/Hadith/Http/Resources/HadithBooksResource.php` | list envelope of books |
| `app/Domains/Hadith/Http/Resources/HadithChapterResource.php` | one chapter |
| `app/Domains/Hadith/Http/Resources/HadithChaptersResource.php` | list envelope of chapters |
| `app/Domains/Hadith/Http/Resources/HadithEntryResource.php` | one hadith (list item) |
| `app/Domains/Hadith/Http/Resources/HadithEntriesResource.php` | list envelope of hadith |
| `app/Domains/Hadith/Http/Resources/HadithEntryDetailResource.php` | one hadith with its breadcrumb and credit |
| `app/Domains/Hadith/Data/HadithCollectionData.php`, `HadithBookData.php`, `HadithChapterData.php`, `HadithGradeData.php`, `HadithEntryData.php`, `HadithEntryDetailData.php`, `HadithPageQueryData.php`, `HadithEntriesQueryData.php`, `HadithBooksPageData.php`, `HadithChaptersPageData.php`, `HadithEntriesPageData.php` | values between layers (below) |
| `app/Domains/Hadith/Services/HadithCatalogueService.php` | the five reads, the served rule, grade visibility |
| `app/Domains/Hadith/Repositories/Contracts/HadithCatalogueRepository.php` | read contract |
| `app/Domains/Hadith/Repositories/Eloquent/EloquentHadithCatalogueRepository.php` | implementation (`extends App\Support\Repositories\EloquentRepository`) |

Create (tests, under `apps/api/tests/Feature/Hadith/Api/`; `Pest.php` already extends `TestCase` for `Feature`):

| Path | Purpose |
| --- | --- |
| `Support/HadithApiFixtures.php` | helper functions, not a test file |
| `HadithCollectionsEndpointTest.php` | endpoint 1 |
| `HadithBooksEndpointTest.php` | endpoint 2 |
| `HadithChaptersEndpointTest.php` | endpoint 3 |
| `HadithEntriesEndpointTest.php` | endpoints 4 and 5 |
| `HadithServedRuleTest.php` | held-back proof, manifest consistency |
| `HadithRouteOrderTest.php` | route order against the deferred `/hadith/{id}` |
| `HadithApiProblemDetailsTest.php` | codes, titles in both languages, renderer arm |
| `HadithApiArchTest.php` | layering |

Change:

| Path | Change |
| --- | --- |
| `app/Domains/Content/Services/ContentDeliveryService.php` | `servedPack()` extraction and `servedResourceIds()` (above) |
| `app/Support/ProblemDetails/ProblemDetailsRenderer.php` | new first `match` arm for `ProvidesProblemCode` |
| `lang/en/problems.php`, `lang/ar/problems.php` | append the keys below |
| `bootstrap/providers.php` | append `HadithServiceProvider::class` after `HadithImportServiceProvider::class` (add the `use` in alphabetical position) |
| `packages/api-contract/openapi.json`, `packages/api-contract/src/schema.d.ts` | regenerated, not hand-edited |

## Routes (`app/Domains/Hadith/routes.php`, registered by `HadithServiceProvider::boot()`)

Provider boot, exactly as `ContentServiceProvider` does: `Route::middleware('api')->prefix('api/v1')->name('v1.')->group(__DIR__.'/routes.php');`. Provider has `public array $bindings = [HadithCatalogueRepository::class => EloquentHadithCatalogueRepository::class]`.

All five routes sit in one group: `Route::middleware(['throttle:content', 'cache.headers:public;max_age=300;etag'])->group(...)`. `GET` only.

| Route name (final, with `v1.`) | Path under `/api/v1` | Action | Constraints |
| --- | --- | --- | --- |
| `v1.hadith.collections.index` | `hadith/collections` | `[HadithCollectionController::class, 'index']` | none |
| `v1.hadith.books.index` | `hadith/collections/{slug}/books` | `[HadithBookController::class, 'index']` | `slug` |
| `v1.hadith.chapters.index` | `hadith/collections/{slug}/books/{book}/chapters` | `[HadithChapterController::class, 'index']` | `slug`, `book` |
| `v1.hadith.entries.index` | `hadith/collections/{slug}/books/{book}/hadiths` | `[HadithEntryController::class, 'index']` | `slug`, `book` |
| `v1.hadith.entries.show` | `hadith/collections/{slug}/hadiths/{number}` | `[HadithEntryController::class, 'show']` | `slug`, `number` |

Parameter regexes (`->where([...])`, **not** `whereNumber`): `slug` = `[a-z0-9]{1,32}`; `book` = `[A-Za-z0-9._-]{1,16}` (a `book_number`, `0` is valid); `number` = `[A-Za-z0-9._-]{1,32}` (must accept `2787.2` and suffixed numbers). A value that fails its regex is the framework's plain `404 not_found`.

Route-order rule: `hadith/collections` is a literal segment and is registered in this provider. The deferred HadeethEnc routes (`/hadith/categories`, `/hadith/{id}`, `/hadith/daily`) do not exist and are **not built here**; when they are built they must be registered after this group and `{id}` must use `whereNumber`. A test proves a later `hadith/{id}` route cannot shadow these.

## Keys and lookups (decided here; open question 4)
- `{book}` is `hadith_books.book_number` (text). Lookup: `where resource_id, book_number`, ordered by `position`, `first()`.
- `?chapter=` is `hadith_chapters.chapter_number` (int ≥ 1) **within that book**. Lookup: `where resource_id, book_id, chapter_number`, ordered by `position`, `first()`. A chapter of another book is "unknown" (404).
- `{number}` is `hadith_entries.hadith_number` (text). Lookup: `where resource_id, hadith_number`, ordered by `id`, `first()` (no duplicates exist today; the index is not unique).
- No response carries a database `id` of a book, chapter or hadith. The collection response carries `resource_id` (the pack resource id the manifest uses).

## Data objects (`App\Domains\Hadith\Data`, `final class X extends Data`, public readonly promoted constructor, like `ContentManifestEntryData`)

| Class | Constructor |
| --- | --- |
| `HadithCollectionData` | `int $resourceId, string $slug, ?string $titleAr, ?string $titleEn, ?string $authorAr, ?string $authorEn, string $attributionAr, string $attributionEn, ?string $sourceUrl, int $totalHadith, int $booksCount` |
| `HadithBookData` | `string $bookNumber, ?string $titleAr, ?string $titleEn, int $position, int $hadithCount` |
| `HadithChapterData` | `int $chapterNumber, ?string $titleAr, ?string $titleEn, int $position, int $hadithCount` |
| `HadithGradeData` | `string $grade, string $gradedBy` |
| `HadithEntryData` | `string $hadithNumber, ?string $arabicNumber, int $position, string $textAr, ?string $sourceUrl, string $bookNumber, ?int $chapterNumber, ?array $grades` — `@param list<HadithGradeData>\|null $grades`; **`null` means "grades not visible" (no key in the response)**, a list (possibly empty) means visible |
| `HadithEntryDetailData` | `HadithEntryData $entry, HadithCollectionData $collection, HadithBookData $book, ?HadithChapterData $chapter` |
| `HadithPageQueryData` | `int $limit, ?int $afterPosition` |
| `HadithEntriesQueryData` | `int $limit, ?int $afterPosition, ?int $chapterNumber` |
| `HadithBooksPageData` | `array $items` (`list<HadithBookData>`), `?string $nextCursor` |
| `HadithChaptersPageData` | same with `list<HadithChapterData>` |
| `HadithEntriesPageData` | same with `list<HadithEntryData>` |

## Requests
- `HadithPageRequest` (`authorize()` true): rules `limit` => `['sometimes', 'integer', 'min:1', 'max:500']`, `cursor` => `['sometimes', 'nullable', 'string', new ChangeCursorRule]`. `public function toData(): HadithPageQueryData` — limit default **50** (spec §8), `afterPosition` = `ChangeCursor::decode($cursor)` when a cursor is given (a failed decode throws `ValidationException::withMessages(['cursor' => __('content.cursor_invalid')])`, as `ContentChangesRequest::toData()` does), else `null`.
- `HadithEntriesRequest`: the same rules plus `chapter` => `['sometimes', 'integer', 'min:1']`; `toData(): HadithEntriesQueryData` with `chapterNumber` = `$this->integer('chapter')` when present, else `null`.
- Collections and the single-hadith route take no query input and have no request class (like the manifest controller).

## Repository contract `HadithCatalogueRepository` (`App\Domains\Hadith\Repositories\Contracts`)
All methods scope by `resource_id`. `Collection` is `Illuminate\Database\Eloquent\Collection`.
```php
/** @param list<int> $resourceIds @return Collection<int, HadithCollection> */
public function collections(array $resourceIds): Collection;                       // where resource_id in ids, order by id

/** @param list<int> $resourceIds */
public function findCollection(string $slug, array $resourceIds): ?HadithCollection; // where slug and resource_id in ids

/** @return Collection<int, HadithBook> */   // position > $afterPosition (when not null), order by position asc, limit $limit
public function booksAfter(int $resourceId, ?int $afterPosition, int $limit): Collection;
public function findBook(int $resourceId, string $bookNumber): ?HadithBook;
public function findBookById(int $resourceId, int $bookId): ?HadithBook;

/** @return Collection<int, HadithChapter> */ // same, within one book
public function chaptersAfter(int $resourceId, int $bookId, ?int $afterPosition, int $limit): Collection;
public function findChapter(int $resourceId, int $bookId, int $chapterNumber): ?HadithChapter;
public function findChapterById(int $resourceId, int $chapterId): ?HadithChapter;

/** @return Collection<int, HadithEntry> */   // within one book, optionally one chapter, position > after, order by position asc
public function entriesAfter(int $resourceId, int $bookId, ?int $chapterId, ?int $afterPosition, int $limit): Collection;
public function findEntryByNumber(int $resourceId, string $hadithNumber): ?HadithEntry;

/** @param list<int> $chapterIds @return array<int, int> chapter id => chapter_number */
public function chapterNumbers(int $resourceId, array $chapterIds): array;
/** @param list<int> $entryIds @return Collection<int, HadithGrade> */  // order by id
public function gradesForEntries(int $resourceId, array $entryIds): Collection;
```
The Eloquent implementation uses `Model::query()` through the base class. No `DB` facade, no transaction.

## `HadithCatalogueService` (`App\Domains\Hadith\Services`, `final`)
Constructor: `(ContentDeliveryService $delivery, HadithCatalogueRepository $repository)`. No HTTP types.
```php
/** @return list<HadithCollectionData> */
public function collections(): array;
public function books(string $slug, HadithPageQueryData $query): HadithBooksPageData;
public function chapters(string $slug, string $bookNumber, HadithPageQueryData $query): HadithChaptersPageData;
public function entries(string $slug, string $bookNumber, HadithEntriesQueryData $query): HadithEntriesPageData;
public function entry(string $slug, string $hadithNumber): HadithEntryDetailData;
```
Rules:
- Private `servedCollection(string $slug): HadithCollection`: `$ids = $this->delivery->servedResourceIds(ResourceGroup::HadithCollections)`; `$this->repository->findCollection($slug, $ids)` or throw `HadithCollectionUnavailableException`. Every method other than `collections()` calls it first.
- `collections()`: map to `HadithCollectionData`; order by the index in `config('hadith.collections')`; a slug not in that list sorts after the listed ones, by slug. Titles and authors pass through as stored (null stays null, never replaced).
- Pagination (books, chapters, entries): ask the repository for `limit + 1` rows; `hasMore = count > limit`; keep the first `limit`; `nextCursor = hasMore ? ChangeCursor::encode($lastKept->position) : null`.
- A missing book throws `new ModelNotFoundException(__('problems.hadith_book_not_found'))`; a missing chapter (`chapterNumber` given but not found in that book) throws `ModelNotFoundException(__('problems.hadith_chapter_not_found'))`; a missing hadith throws `ModelNotFoundException(__('problems.hadith_not_found'))`. These render as `404 not_found` with the translated detail (existing pattern).
- `entries()`: resolve the book, resolve the chapter when `chapterNumber !== null`, fetch the page, map each entry with `bookNumber` = the book's number and `chapterNumber` from `chapterNumbers()` (null when `chapter_id` is null). Chapters are optional: a book with no chapters lists all its hadith; `?chapter=` on a book with no chapters is a 404.
- `chapters()`: a book with no chapter rows returns an empty page (`items: []`, `nextCursor: null`). That is the normal answer until step 6b.
- `entry()`: load the entry, its book (`findBookById`), its chapter when `chapter_id` is not null (`findChapterById`), and the collection data. If the book row is missing (corrupt data) throw `ModelNotFoundException(__('problems.hadith_not_found'))`.
- Grades: `$visible = config('hadith.grades_visible') === true`. When false, `HadithEntryData::$grades` is `null` and `gradesForEntries()` is **not called**. When true, load grades for the page's entry ids in one query, drop rows whose `graded_by` is null or `''`, and build `HadithGradeData(grade, gradedBy)` per remaining row, grouped by `entry_id` in `id` order; an entry with none gets `[]`. (ADR 0042 section 5: "serialised only when true and `graded_by` is not null". The branch is dead through Phase 7 and is tested by overriding the config.)

## Resources (`App\Domains\Hadith\Http\Resources`, `final … extends JsonResource`, `public static $wrap = null;`, docblock `@property XData $resource`, explicit `toArray(Request $request): array` with an `@return array{…}` shape on every `toArray`, because free Scramble cannot read Data objects)
List envelope resources follow `ContentChangesResource`: build `data` by looping `(new XResource($item))->toArray($request)`, return `['data' => $data, 'next_cursor' => …]`. **No `withResponse()` override**: headers come from the route middleware.

| Resource | Wraps | `toArray()` keys (all always present unless marked) |
| --- | --- | --- |
| `HadithCollectionResource` | `HadithCollectionData` | `resource_id` int, `slug` string, `title_ar` ?string, `title_en` ?string, `author_ar` ?string, `author_en` ?string, `attribution_ar` string, `attribution_en` string, `source_url` ?string, `total_hadith` int, `books_count` int |
| `HadithCollectionsResource` | `list<HadithCollectionData>` (the resource is the array) | `data` list of the above, `next_cursor` `null` (always null; the envelope matches spec §8) |
| `HadithBookResource` | `HadithBookData` | `book_number` string, `title_ar` ?string, `title_en` ?string, `position` int, `hadith_count` int |
| `HadithBooksResource` | `HadithBooksPageData` | `data`, `next_cursor` ?string |
| `HadithChapterResource` | `HadithChapterData` | `chapter_number` int, `title_ar` ?string, `title_en` ?string, `position` int, `hadith_count` int (**no source URL, no text**; D14) |
| `HadithChaptersResource` | `HadithChaptersPageData` | `data`, `next_cursor` |
| `HadithEntryResource` | `HadithEntryData` | `hadith_number` string, `arabic_number` ?string, `position` int, `text_ar` string, `source_url` ?string, `book_number` string, `chapter_number` ?int, and **only when `$this->resource->grades !== null`**: `grades` list of `{grade: string, graded_by: string}`. Document the optional key in the docblock as `grades?: list<array{grade: string, graded_by: string}>` and add it with `if (...) { $data['grades'] = …; }` after building the array |
| `HadithEntriesResource` | `HadithEntriesPageData` | `data`, `next_cursor` |
| `HadithEntryDetailResource` | `HadithEntryDetailData` | every key of `HadithEntryResource` (call `(new HadithEntryResource($this->resource->entry))->toArray($request)` and merge), plus `collection` (the `HadithCollectionResource` shape), `book` (the `HadithBookResource` shape), `chapter` (the `HadithChapterResource` shape or `null`) |

If Scramble cannot type the optional `grades` key or the nested merge under `--fail-on-unknown`, change the docblock shape (not the behaviour) until the export is clean; if it still fails, stop and report the diagnostic. Do not hand-edit `openapi.json`.

## Controllers (`App\Domains\Hadith\Http\Controllers`, `final … extends App\Http\Controllers\Controller`, constructor `private readonly HadithCatalogueService $catalogue`)
```php
HadithCollectionController::index(): HadithCollectionsResource
HadithBookController::index(string $slug, HadithPageRequest $request): HadithBooksResource
HadithChapterController::index(string $slug, string $book, HadithPageRequest $request): HadithChaptersResource
HadithEntryController::index(string $slug, string $book, HadithEntriesRequest $request): HadithEntriesResource
HadithEntryController::show(string $slug, string $number): HadithEntryDetailResource
```
Each method is one line: call the service, return the resource. Attributes on **every** method (as in `ContentManifestController` and `ContentPackController`): `#[Response(304, 'Not modified.', type: 'null')]` and `#[Response(404, 'The collection is unavailable, or the book, chapter or hadith was not found.', mediaType: 'application/problem+json', type: '\App\Support\ProblemDetails\ProblemDetailsResource')]` (`use Dedoc\Scramble\Attributes\Response;`). The 422 for `limit`/`cursor`/`chapter` is inferred from the FormRequest; add nothing for it.

## Problem codes
Exactly one new domain code, because the plan names it: `hadith_collection_unavailable` (status 404).
- `ProvidesProblemCode` (interface in `App\Support\ProblemDetails`): `public function problemStatus(): int;` `public function problemCode(): string;`.
- `HadithCollectionUnavailableException`: constructor with no argument, `parent::__construct(__('problems.hadith_collection_unavailable_detail'))`; `problemStatus()` returns `404`; `problemCode()` returns `'hadith_collection_unavailable'`. No slug in the message.
- `ProblemDetailsRenderer::render()`: add **as the first arm** of the `match (true)`: `$exception instanceof ProvidesProblemCode => new ProblemDetails(status: $exception->problemStatus(), code: $exception->problemCode(), title: __('problems.'.$exception->problemCode()), detail: $exception->getMessage() === '' ? null : $exception->getMessage())`. Nothing else in the renderer changes, so every existing code and test is unaffected.
- `code` stays a plain string in the contract (`ProblemDetailsResourceTypeToSchema`), so the schema does not change for the new value.
- Every other 404 here is the existing `not_found` with a translated `detail`.

Language keys to append (the wording is a proposal; the developer may change it):

| Key | `lang/en/problems.php` | `lang/ar/problems.php` |
| --- | --- | --- |
| `hadith_collection_unavailable` | `Collection unavailable` | `المجموعة غير متاحة` |
| `hadith_collection_unavailable_detail` | `This collection is not available.` | `هذه المجموعة غير متاحة الآن.` |
| `hadith_book_not_found` | `The book was not found.` | `الكتاب غير موجود.` |
| `hadith_chapter_not_found` | `The chapter was not found.` | `الباب غير موجود.` |
| `hadith_not_found` | `The hadith was not found.` | `الحديث غير موجود.` |

## Caching and pagination behaviour
- `cache.headers:public;max_age=300;etag` produces `Cache-Control: max-age=300, public` and a quoted `ETag` (an MD5 of the body, computed by Laravel). A request with the same `If-None-Match` gets `304` with an empty body. The ETag depends only on the body, so `Accept-Language: ar` and `en` give the same body and the same ETag on every 200.
- Lists are `{ "data": [...], "next_cursor": string|null }`. `limit` defaults to 50, maximum 500. Cursors are opaque (`ChangeCursor`) and carry the last `position`. No offset pagination.

## Tests (Pest, `declare(strict_types=1)`, `uses(RefreshDatabase::class)` in every file that touches the database, `Http::preventStrayRequests()`, `Storage::fake('local')`, `beforeEach` sets `Accept: application/json` and `Accept-Language: en`)

### `Support/HadithApiFixtures.php` (use `require_once __DIR__.'/Support/HadithApiFixtures.php';` at the top of each test file, the pattern of `tests/Feature/Content/ContentDeliveryTest.php`)
Functions, all returning what they create:
- `hadithApiCollection(string $slug = 'bukhari', array $state = []): HadithCollection` — `HadithCollectionFactory::new()->state([...$state, 'slug' => $slug])->create()`. **Not served yet.**
- `hadithApiServe(HadithCollection $collection): HadithCollection` — makes it served: `ContentPack::query()->create(['resource_id' => $collection->resource_id, 'version' => 1, 'path' => 'packs/hadith-fixture-'.$collection->resource_id.'.sqlite.gz', 'size_bytes' => 1, 'sha256' => str_repeat('a', 64), 'row_count' => 1, 'schema_version' => 1, 'built_at' => now()])` and `Storage::disk('local')->put($path, 'x')`. (Do **not** use `PackBuilder` in endpoint tests: step 6b adds a completeness refusal there that could break fixtures. One test in `HadithServedRuleTest` uses `PackBuilder` on purpose.)
- `hadithApiBook(HadithCollection $c, int $position, string $number, array $state = []): HadithBook`, `hadithApiChapter(HadithCollection $c, HadithBook $b, int $position, int $number, array $state = []): HadithChapter` (sets `book_id`), `hadithApiEntry(HadithCollection $c, HadithBook $b, int $position, string $number, array $state = []): HadithEntry` (sets `book_id`; pass `'chapter_id' => $chapter->id` in `$state` for a chaptered hadith). All pass `'resource_id' => $c->resource_id`.

### `HadithCollectionsEndpointTest.php`
- `it('lists the served collections in the configured order with the exact key set')` — serve `muslim` then `bukhari` (created in that order); expect order `bukhari`, `muslim`; each item's keys equal exactly `resource_id, slug, title_ar, title_en, author_ar, author_en, attribution_ar, attribution_en, source_url, total_hadith, books_count`; `next_cursor` is `null`; `resource_id` equals the collection's `resource_id`.
- `it('sorts a slug that is not in config/hadith.php after the configured ones')`.
- `it('keeps null titles null')` — `->untitled()` state; `title_ar`, `title_en`, `author_ar`, `author_en` are `null` in the JSON.
- `it('returns source_url null and no text, grade or internal columns')` — no `grades`, `text_search`, `source_key`, `source_id`, `source_version`, `imported_at` keys anywhere.
- `it('returns an empty list when nothing is served')` — `{"data": [], "next_cursor": null}`.
- `it('sends a public cache header and an ETag, and answers If-None-Match with 304')`.
- `it('returns the same body and ETag for Accept-Language ar and en')`.

### `HadithBooksEndpointTest.php`
- `it('lists books in position order with the exact key set')` — keys `book_number, title_ar, title_en, position, hadith_count`; no `id`.
- `it('pages books by cursor')` — 5 books, `limit=2`: pages of 2, 2, 1; `next_cursor` null on the last; following the cursor never repeats a book; a book with `book_number` `'0'` is listable.
- `it('rejects a malformed cursor, limit 0 and limit 501 with 422 validation_failed')`.
- `it('does not show books of another served collection')` — two served collections.
- `it('returns 404 hadith_collection_unavailable for an unknown slug')` (`zzz` passes the regex).
- `it('returns plain 404 not_found for a slug that fails the route pattern')` (`BAD_SLUG`).
- `it('sends an ETag and answers 304')`, `it('returns the same body for ar and en')`.

### `HadithChaptersEndpointTest.php`
- `it('returns an empty list for a book that has no chapters')` — the shape is `{"data": [], "next_cursor": null}` and the status 200 (this is the answer for every collection until step 6b).
- `it('returns factory chapters in position order with the exact key set')` — keys `chapter_number, title_ar, title_en, position, hadith_count`; there is no `source_url`, no `text_ar`, no `id`, no `source_chapter_key`.
- `it('lists only the chapters of the requested book')`.
- `it('pages chapters by cursor')`.
- `it('returns 404 not_found for an unknown book number')` with the `hadith_book_not_found` detail in `en` and `ar`.
- `it('returns 404 hadith_collection_unavailable for an unserved collection')`.
- `it('sends an ETag and answers 304')`.

### `HadithEntriesEndpointTest.php`
List (`entries.index`):
- `it('lists a book hadith in position order with the exact key set')` — keys `hadith_number, arabic_number, position, text_ar, source_url, book_number, chapter_number`; `chapter_number` is `null` for an unchaptered hadith; `source_url` is `null`.
- `it('returns text_ar byte for byte')` — `HadithEntryFactory::new()->withBidiMark()` returns exactly `HadithEntryFactory::BIDI_TEXT` (including the U+200F mark); an `->arabic()` entry returns exactly `HadithEntryFactory::ARABIC_TEXT`.
- `it('never returns text_search, text_en, narrator_en, source_text_sha256, source_key or an internal id')`.
- `it('returns no grades key while grades_visible is false, even when grade rows exist')` — create `HadithGradeFactory` rows for the entry; assert `array_key_exists('grades', $item)` is false on the list and the detail.
- `it('returns grades when grades_visible is true and omits a grade with no grader')` — `config(['hadith.grades_visible' => true])`; one graded row (`FIXTURE grade` / `FIXTURE grader`) and one `->ungraded()` row: the list item has `grades` with exactly one `{grade, graded_by}`; an entry with no grade rows has `grades: []`.
- `it('filters by ?chapter= and returns only that chapter hadith in position order')` — chapter numbers 1 and 2; items carry the right `chapter_number`.
- `it('returns 404 for an unknown chapter number, and for a chapter of another book')`.
- `it('returns 422 for a non-integer or zero chapter')`.
- `it('returns 404 for ?chapter= on a book with no chapters')`.
- `it('pages hadith by cursor and never repeats or skips one')` — 7 hadith, `limit=3`; also with `?chapter=` (the cursor survives the filter).
- `it('returns an empty list for a book with no hadith')`.
- `it('returns 404 not_found for an unknown book and 404 hadith_collection_unavailable for an unserved collection')`.
- `it('sends an ETag and answers 304')`, `it('returns the same body for ar and en')`.

Detail (`entries.show`):
- `it('returns one hadith with its breadcrumb and source credit')` — the entry keys plus `collection` (the collection key set), `book` (the book key set), `chapter` (`null` when unchaptered; the chapter key set when chaptered).
- `it('finds a decimal hadith number such as 2787.2')` (`HadithEntryFactory::decimalNumber()`).
- `it('returns the entry with the lowest id when a number is repeated')`.
- `it('returns 404 not_found with the hadith_not_found detail for an unknown number')` in `en` and `ar`.
- `it('does not find a hadith through another collection')`.
- `it('returns 404 hadith_collection_unavailable for an unserved collection')`.
- `it('sends an ETag and answers 304')`.

### `HadithServedRuleTest.php` — the proof that an incomplete collection is hidden
- `it('hides a collection that has full rows but no pack on every endpoint')` — dataset over the five URLs. Create `bukhari` (served) and `muslim` (complete-looking rows: one book, one chapter, one hadith, **no `content_packs` row**). `GET` each of the five URLs for `muslim`: `404`, `code` `hadith_collection_unavailable`, `Content-Type` `application/problem+json`. `/hadith/collections` lists only `bukhari`. This is how an incomplete collection looks to the API: step 6b makes the pack builder refuse it, so it never gets a pack.
- `it('hides a collection whose pack row exists but whose file is missing')` — delete the file with `Storage::disk('local')->delete($path)`.
- `it('hides a collection whose resource is inactive')`.
- `it('hides a collection that has a pack but no hadith_collections row')`.
- `it('serves a collection once a pack exists and hides it again when the pack file is removed')` (same collection, flips both ways within one test).
- `it('lists exactly the hadith_collections resources that the content manifest lists')` — serve three collections, hide a fourth; the sorted `resource_id`s from `/api/v1/hadith/collections` equal the sorted `id`s of `resources` with `group === 'hadith_collections'` in `/api/v1/content/manifest`.
- `it('serves a collection whose pack was built by PackBuilder')` — create a book and an entry for the collection, `app(PackBuilder::class)->build(Resource::query()->findOrFail($collection->resource_id))`, then it is listed (the only test that uses the builder).
- `it('ContentDeliveryService::servedResourceIds returns only active, packed, present, same-group ids in ascending order')` — includes a `tafsirs` resource that is also packed (must not appear).

### `HadithRouteOrderTest.php`
- `it('resolves /hadith/collections to the collections controller')` — `Route::getRoutes()->match(Request::create('/api/v1/hadith/collections'))->getActionName()` ends with `HadithCollectionController@index`, and the route name is `v1.hadith.collections.index`.
- `it('is not shadowed by a later hadith/{id} route')` — in the test, register `Route::middleware('api')->prefix('api/v1')->get('hadith/{id}', fn () => response('deferred'))->whereNumber('id')` after boot (call `app('router')->getRoutes()->refreshNameLookups()` and `refreshActionLookups()` if needed); `GET /api/v1/hadith/collections` is still the collections endpoint (200 JSON, key `data`), and `/api/v1/hadith/123` reaches the stub.
- `it('returns 404 for the deferred routes that do not exist')` — `/api/v1/hadith/daily`, `/api/v1/hadith/categories` return 404.
- `it('names the five routes')` — `route('v1.hadith.collections.index')` etc. resolve to the paths in the table.

### `HadithApiProblemDetailsTest.php`
- `it('renders hadith_collection_unavailable in both languages')` — dataset `ar` → `المجموعة غير متاحة`, `en` → `Collection unavailable`; asserts `status` 404, `code`, `title`, and `detail` (the `_detail` key in that language).
- `it('translates the detail of a missing book, chapter and hadith')` — `ar` and `en` for each of the three keys; `code` is `not_found`.
- `it('renders any ProvidesProblemCode exception through the renderer')` — a test-registered route under `api/v1/_hadith_test` throws an anonymous class implementing `ProvidesProblemCode` (status 409, code `fixture_code`, add the title with `app('translator')->addLines(['problems.fixture_code' => 'Fixture title'], 'en')`); the body has that status, code, title.
- `it('leaves the existing codes unchanged')` — unknown route still `not_found`.

### `HadithApiArchTest.php` (pure `arch()`, no database)
- hadith controllers use no `Illuminate\Database`, no `App\Domains\Hadith\Models`, no `Illuminate\Support\Facades\DB`;
- `App\Domains\Hadith\Services\HadithCatalogueService` uses no `Illuminate\Http`, no `Symfony\Component\HttpFoundation`;
- `App\Domains\Hadith\Repositories\Eloquent\EloquentHadithCatalogueRepository` uses no `Illuminate\Support\Facades\DB`, no `Illuminate\Http`; the contract is an interface;
- `App\Domains\Hadith\Http\Resources` extend `JsonResource`; `App\Domains\Hadith\Data` extend `Spatie\LaravelData\Data` and use no `Illuminate\Http`;
- the new Hadith HTTP code does not use `App\Domains\Hadith\Import`, `App\Domains\Hadith\Sources` or `App\Integrations` (the read side never imports the write side);
- `App\Domains\Hadith\Http` and `Services\HadithCatalogueService` do not use `HadithSearchTextNormalizer` and never reference a column named `text_search`, `text_en` or `narrator_en` (a file-content scan of the Resources and the repository `select`/`pluck` lists is enough: assert that `file_get_contents` of each Resource file does not contain those three names).

Existing tests that must stay green and unedited: `tests/Feature/Content/ContentDeliveryTest.php` and the rest of `tests/Feature/Content`, `tests/Feature/ProblemDetails/LocalizedProblemsTest.php`, `tests/Feature/Support/ProblemDetailsTest.php`, `tests/Unit/ArchitectureTest.php`, all of `tests/Feature/Hadith/**` from steps 3 to 6.

## Reuse (paths checked)
`app/Domains/Content/Services/ContentDeliveryService.php`, `app/Domains/Content/Packs/ChangeCursor.php`, `app/Domains/Content/Http/Requests/ChangeCursorRule.php`, `app/Domains/Content/Http/Requests/ContentChangesRequest.php` (the `toData()` pattern), `app/Domains/Content/Http/Resources/ContentChangesResource.php` (list envelope and docblock shape), `app/Domains/Content/Http/Controllers/ContentManifestController.php` (`#[Response]` attributes), `app/Domains/Content/ContentServiceProvider.php` (route registration, the `content` limiter), `app/Support/Repositories/EloquentRepository.php`, `app/Support/ProblemDetails/{ProblemDetailsRenderer,ProblemDetails,ProblemDetailsResource}.php`, `app/Domains/Content/Models/ContentPack.php`, the factories in `database/factories/Hadith*Factory.php` and `database/factories/Concerns/CreatesHadithResource.php`, `tests/Feature/Hadith/HadithPackBuilderTest.php` (how a hadith pack is built in a test), `tests/Feature/ProblemDetails/LocalizedProblemsTest.php` (the language-test pattern).

## Gates
Run from `apps/api` with the local PHP 8.5 (Homebrew `php`):
1. While building, scope the contract export (route names from the table above):
   `php artisan scramble:export --routes=v1.hadith.collections.index,v1.hadith.books.index,v1.hadith.chapters.index,v1.hadith.entries.index,v1.hadith.entries.show --stdout --fail-on-unknown`
   Confirm the five paths appear under the `/api/v1` server base, that each response is `{data, next_cursor}` (or the detail object), that `grades` is optional (not required) on the hadith item, that each operation lists 200, 304, 404 (and 422 where a request class exists), and that no property is typed `mixed` or left unknown.
2. `composer qa` (`pint --test`, `phpstan analyse` at level 8, `pest --parallel`). If Pint reports style issues, run `vendor/bin/pint` once and rerun.
3. `php artisan route:list --path=hadith -v` lists exactly the five routes with the `throttle:content` and `cache.headers` middleware.

Then from the repo root with Node 26 (`nvm use`):
4. `npm run generate -w @quran/api-contract` (Scramble export with `--fail-on-unknown`, then `openapi-typescript`).
5. `npm run typecheck -w @quran/api-contract`.
6. `git status --short -- packages/api-contract` shows only `openapi.json` and `src/schema.d.ts` modified. `git diff --stat -- packages/api-contract` shows **additions only for the hadith paths and their schemas** (the `.github/workflows/contract.yml` drift job fails on any other change; it is paused and runs by hand, but the same rule applies). If other paths changed, stop and report.
7. `git status --short` shows no change under `apps/mobile`, `docs`, `CLAUDE.md`, `database/migrations`, `docker/` or `apps/api/storage/`.

No dependency change, so no `composer audit` or `npm-audit`. Do not run the mobile gates.

## Out of scope
- Chapters data, the chapter matcher, `hadith_chapters` rows, the pack-builder completeness refusal, gap filling (step 6b). This step only reads whatever rows exist.
- Search endpoints, a categories, daily or `/hadith/{id}` route (deferred HadeethEnc work), writes of any kind, auth, sync, personal data.
- Any mobile file, hook, route or type use (`packages/api-contract/src/index.ts` is untouched; the mobile steps consume the generated types).
- Importer, pack, schema, factory, config or migration changes; `docker/*.sh`; Cloudflare R2.
- A kill switch or flag (ADR 0045), a permission gate (D12), English or translated content, Quran text.
- Editing docs (spec §9 field lists, the plan's step 7 tests row, the README status). The orchestrator does that after review.

## Open questions for the developer
1. **Plan tests row vs no switch.** The plan's step 7 tests row says "flag off returns an empty list and 404s". There is no flag (ADR 0042 amendment, D12). This brief replaces that line with the served-rule tests in `HadithServedRuleTest`. ADR 0042 section 5 ("What the kill switch does") also still says a flag gates `/hadith/collections`; it is superseded by the amendment, and the plan and ADR text should be corrected.
2. **A domain problem code needs a renderer change.** `ProblemDetailsRenderer` derives `code` from the status only, so `hadith_collection_unavailable` (named in the plan and in the task) needs the small `ProvidesProblemCode` arm described above. The alternative is to follow the existing pattern (`404 not_found` plus a translated `detail`) and drop the named code. Confirm option (a). The contract does not change either way.
3. **Spec §8 says `Accept-Language` "picks … hadith translation".** Hadith is Arabic only (ADR 0042). This brief makes `Accept-Language` affect only the problem-details `title` and `detail`. The spec line should say so.
4. **Browsing keys.** `{book}` = `book_number`, `?chapter=` = `chapter_number`, `{number}` = `hadith_number`; no database id is exposed. The chapter number is Taybah's ordinal and "not stable across sources" (spec §5), so it may change at the Sunnah.com switch; the app never stores it. Confirm, or name ids instead.
5. **No request-time completeness check, and a stale pack.** "Served" means "listed in the manifest". If a collection that was complete becomes incomplete after a re-import, step 6b's builder refusal stops a **new** pack, but the manifest takes the newest pack by version, so the **old** pack row and file keep the collection served unless 6b removes the pack or deactivates the resource. Step 6b must decide this (and add its own test); this step does not change pack pruning.
6. **Pagination on short lists.** Books and chapters are paginated too (spec §8: "no offset pagination anywhere", `limit` default 50), so Bukhari's books need two pages at the default limit. The collections list always returns `next_cursor: null`. The app reads packs, so this has no screen impact. Say if you want a higher default for books and chapters.
7. **Same code for unknown and held-back slugs.** Both give `404 hadith_collection_unavailable`, so a held-back collection cannot be told apart from one that does not exist. Confirm.
8. **The `grades_visible = true` branch** is built (ADR 0042 section 5, "grade filter" in the plan) but dead through Phase 7 and tested only by overriding config. Confirm it should ship now rather than at the phase that turns grades on.
9. **Cache lifetime.** `public, max-age=300` (the manifest's value) and a Laravel MD5 ETag, not the manifest's SHA-256. Hadith content only changes on a deploy, so a longer lifetime would also be safe.
10. **Wording of the five new `problems` strings** (Arabic and English above) is a proposal for the developer to approve.

## Answers to the open questions (orchestrator, on the developer's behalf, 7 Nov 2026)

These override anything above that conflicts with them.

1. Accepted: served-rule tests replace the flag tests. The plan and ADR text get corrected at step 16.
2. **No renderer change.** Use the existing `not_found` code with a translated detail: «هذه المجموعة غير متاحة» / "This collection isn't available". Drop the `ProvidesProblemCode` interface. Keep the domain exception `HadithCollectionUnavailableException`; it renders as 404 `not_found`.
3. Accepted: `Accept-Language` affects only problem-detail text.
4. Accepted: `book_number`, `chapter_number`, `hadith_number`. Saved items store only slug + number (step 11).
5. Accepted. Step 6b must deactivate the resource or remove its pack when a re-import makes a collection incomplete, with a test. This is recorded for 6b.
6. Accepted: everything is paginated. Default `limit` 100 for books and chapters, 50 for hadith.
7–9. Accepted.
10. Accepted with the wording in 2 for the unavailable case. Other strings as proposed.
