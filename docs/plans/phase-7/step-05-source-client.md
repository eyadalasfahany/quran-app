# Step 5 — Source interface, fawazahmed0 client, `hadith:snapshot`

ADR 0042 §3, §4 (Accepted), ADR 0068 (source cache), ADR 0045 (no switch). Plan: `docs/plans/phase-7.md` (step 5 row, its tests row, "Facts the plan relies on", D3, D7, D10, D13). Read `docs/plans/phase-7/README.md` and `.claude/agent-rules.md` first. **No hadith text of any kind is written in this step**: fixtures use placeholders only (`FIXTURE text 1 — not a hadith`, «نص تجريبي ١ — ليس حديثًا», `FIXTURE grade`, `FIXTURE grader`, `FIXTURE section 1`). Reports give counts, keys and paths only.

## Goal
Fetch the pinned fawazahmed0 files safely and hand them to the rest of Phase 7 through a source-neutral interface:

1. A transport-only HTTP client (`app/Integrations/HadithApiFawaz`): pinned jsDelivr URL builder, retry with backoff, User-Agent with the contact email, size cap, truncation check.
2. A verifier that checks every file against the SHA-256 in `config/hadith.php` `files`.
3. `HadithCollectionSource` (contract), `FawazHadithSource` (adapter), `HadithSourceRegistry`, and plain-PHP records. Step 18's `SunnahComSource` must be able to implement the same contract.
4. `php artisan hadith:snapshot`: downloads the 12 pinned files into the source cache and prints the hash map for the developer to review. It never writes `config/`.

No table, model, migration, factory, endpoint, pack or importer is added. Step 3 (MySQL schema) runs in parallel: nothing here may import a hadith model or touch the database.

## Rules for this step
- Branch: `main` (CLAUDE.md, 6 Nov 2026). Check with `git branch --show-current`. Do not commit, push, switch branches or add dependencies (`Http`, `File`, `hash()` are enough).
- **Never open, print or edit `apps/api/.env`.**
- Step 2 is implemented but not committed: `apps/api/config/hadith.php` exists and is the input. Read it; do not change any existing key or value in it.
- Keep files apart from step 3: do not create anything under `database/`, `app/Domains/Hadith/Models`, `Repositories`, `Data`, or `database/factories`. Do not create `app/Domains/Hadith/HadithServiceProvider.php` (step 3 or 7 will); this step's provider is named `HadithSourceServiceProvider`.
- Shared files are edited additively and at the end: `config/hadith.php` (append one key), `bootstrap/providers.php` (append two lines).
- `docs/technical-spec.md`, ADR 0042 and `docs/plans/phase-7.md` are edited by someone else. Do not touch them.
- **Never fetch** `ara-{c}1` (diacritics-removed) files or any English edition (D7). The client refuses any path that is not a key of `config('hadith.files')` (see below), so this holds by construction.
- Bytes are stored exactly as received: no trimming, no BOM stripping on disk, no re-encoding. Decoding for parsing happens in memory only.
- Laravel code follows `apps/api/CLAUDE.md`: `declare(strict_types=1)`, full typing, domain exceptions (never bare `\Exception`), `final` classes, `.ai/rules/integrations.md` (an integration never imports `App\Domains`; `tests/Unit/ArchitectureTest.php` enforces it).
- **DTO namespace.** `ArchitectureTest` requires every class under `App\Domains\*\Data` to extend `Spatie\LaravelData\Data`. These records are plain PHP (so step 3 has no coupling), therefore they live in `App\Domains\Hadith\Sources\Records`, not in a `Data` namespace. Do not create `App\Domains\Hadith\Data`.

## Files

Create (production):

| Path | Purpose |
| --- | --- |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazConfig.php` | validated config value object |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazClient.php` | URL builder and download |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazServiceProvider.php` | container bindings |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazException.php` | base exception (non-final) |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazConfigException.php` | bad config |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazPathException.php` | path not allowed |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazNotFoundException.php` | HTTP 404 |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazRequestException.php` | other HTTP or network failure |
| `apps/api/app/Integrations/HadithApiFawaz/HadithApiFawazBodyException.php` | empty, oversized or truncated body |
| `apps/api/app/Domains/Hadith/Contracts/HadithCollectionSource.php` | the source contract |
| `apps/api/app/Domains/Hadith/Sources/FawazHadithSource.php` | fawazahmed0 adapter |
| `apps/api/app/Domains/Hadith/Sources/HadithSourceRegistry.php` | sources by code, primary source |
| `apps/api/app/Domains/Hadith/Sources/PinnedFileVerifier.php` | SHA-256 check against `config('hadith.files')` |
| `apps/api/app/Domains/Hadith/Sources/SnapshotStore.php` | cache directory read/write |
| `apps/api/app/Domains/Hadith/Sources/HadithSnapshotter.php` | the download loop used by the command |
| `apps/api/app/Domains/Hadith/Sources/Records/SourceCollection.php` | record |
| `apps/api/app/Domains/Hadith/Sources/Records/SourceCollectionInfo.php` | record |
| `apps/api/app/Domains/Hadith/Sources/Records/SourceSection.php` | record |
| `apps/api/app/Domains/Hadith/Sources/Records/SourceHadith.php` | record |
| `apps/api/app/Domains/Hadith/Sources/Records/SourceGrade.php` | record |
| `apps/api/app/Domains/Hadith/Sources/Records/SnapshotFileResult.php` | record |
| `apps/api/app/Domains/Hadith/Exceptions/HadithPinException.php` | pin missing or mismatch |
| `apps/api/app/Domains/Hadith/Exceptions/HadithSourceFormatException.php` | a file is not the expected shape |
| `apps/api/app/Domains/Hadith/Exceptions/UnknownHadithSourceException.php` | registry miss |
| `apps/api/app/Domains/Hadith/Console/HadithSnapshotCommand.php` | `hadith:snapshot` |
| `apps/api/app/Domains/Hadith/HadithSourceServiceProvider.php` | registers the registry and the command |

Create (tests; all under `apps/api/tests/Feature/Hadith/`, they extend `TestCase` through `Pest.php`):

| Path | Purpose |
| --- | --- |
| `Support/HadithFixtureFiles.php` | helper functions (placeholder JSON, fake CDN, pin helper); not a test file |
| `Support/HadithSourceContract.php` | shared contract test, reusable by `SunnahComSource` |
| `Source/HadithApiFawazClientTest.php` | client |
| `Source/PinnedFileVerifierTest.php` | verifier |
| `Source/FawazHadithSourceTest.php` | adapter and the shared contract |
| `Source/HadithSourceRegistryTest.php` | registry |
| `Source/HadithSnapshotCommandTest.php` | `hadith:snapshot` |

Change:

| Path | Change |
| --- | --- |
| `apps/api/config/hadith.php` | append the `download` key after `api_key` (below) |
| `apps/api/bootstrap/providers.php` | append `HadithApiFawazServiceProvider::class` and `HadithSourceServiceProvider::class` at the end of the list (the file lists providers from `AppServiceProvider` to `FeedbackServiceProvider`; add after the last one) |

Do not create `.gitignore` entries: the cache folder is already ignored (see "Where files go").

## Config: append to `config/hadith.php`

After the `api_key` key (the last one), add, with a short comment above it:

```php
    // Transport settings for the pinned download (step 5). Not secrets, not switches.
    'download' => [
        'timeout_seconds' => 60,
        'tries' => 3,
        'retry_delay_ms' => 1000,   // base delay; attempt n waits retry_delay_ms * 2^(n-1)
        'gap_ms' => 300,            // pause between two files in one snapshot
        'max_bytes' => 30_000_000,  // per file; ara-bukhari.json is 9.8 MB
    ],
```

`config/hadith.php` is otherwise untouched, so `HadithConfigTest` still passes. Tests set these to `0` delay and small caps with `config([...])`.

## Where files go (ADR 0068; the plan's "storage/app/hadith" is superseded)

The plan row and README say `storage/app/hadith`. ADR 0068 (6 Nov 2026) later moved every downloaded upstream file to one cache root, so this step follows the ADR: **`SourceCache::path('hadith/'.config('hadith.commit'))`** (`App\Support\Storage\SourceCache`, root `config('content_sources.cache_root')` = `storage/app/private/sources`, on the Railway volume). That folder is git-ignored by `apps/api/storage/app/private/.gitignore` (`*`). A folder per commit means a SHA bump leaves the old folder beside the new one, as ADR 0068 describes. Layout inside it mirrors the repository paths:

```
{cache_root}/hadith/{commit}/editions.json
{cache_root}/hadith/{commit}/info.json
{cache_root}/hadith/{commit}/editions/ara-bukhari.json   (and the other nine)
```

## `HadithApiFawazConfig` (`App\Integrations\HadithApiFawaz`)

`final readonly class`. Constructor (all public readonly): `string $cdnBase`, `string $commit`, `list<string> $allowedPaths`, `int $timeoutSeconds`, `int $tries`, `int $retryDelayMs`, `int $maxBytes`, `string $userAgent`.

`public static function fromConfig(): self`, reading:
- `hadith.cdn_base` (string; `rtrim($v, '/')`), `hadith.commit` (string), `array_keys(config('hadith.files'))` for `allowedPaths` (all strings), `hadith.download.timeout_seconds`, `.tries`, `.retry_delay_ms`, `.max_bytes` (ints; `max(1, …)` for timeout, tries and max_bytes, `max(0, …)` for delay).
- `userAgent`: `Taybah/1.0 (+mailto:{email})` when `config('quran.qf.contact_email')` is a non-empty string, else `Taybah/1.0` (same rule as `HisnMuslimSnapshotter::userAgent()` and `CatalogueDownloader::userAgent()`).

It throws `HadithApiFawazConfigException` when: `commit` does not match `/^[0-9a-f]{40}$/`; `cdn_base` contains `@` or is empty; a value has the wrong type; `files` is empty. The message names the config key, never a value.

## `HadithApiFawazClient`

`final class`. Constructor: `private readonly HadithApiFawazConfig $config`.

```php
public function url(string $path): string;      // "{cdnBase}@{commit}/{path}", e.g. https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@<40 hex>/editions.json
public function fetch(string $path): string;    // the body bytes, exactly as received
```

Rules:
- `url()` and `fetch()` throw `HadithApiFawazPathException` unless `$path` is exactly one of `config->allowedPaths` (strict `in_array`). No request is made for a refused path. The URL always contains the full commit and never `@1`.
- `fetch()` uses `Http::withUserAgent(...)->timeout(...)->connectTimeout(...)->retry(...)`. Retry only on `ConnectionException`, HTTP 429 and HTTP >= 500; other 4xx fail at once. Pattern: `HisnMuslimSnapshotter::fetch()`. Use `retry($tries, Closure $sleep, $when, throw: true)` where the closure takes `int $attempt` and returns `retryDelayMs * 2 ** ($attempt - 1)`. When a 429 carries a numeric `Retry-After` of at most 60, the wait is that many seconds instead (tests keep `retry_delay_ms` at 0 and do not use Retry-After).
- 404 → `HadithApiFawazNotFoundException` with the message `The pinned file [{path}] was not found at the pinned commit.` (the path is public and safe to print).
- Any other final failure (connection error, 429/5xx after the last try, other 4xx) → `HadithApiFawazRequestException` (extra `public readonly ?int $status` property; message `The source answered HTTP {status} for [{path}].` or `The source could not be reached for [{path}].`). Do not chain the previous exception (transport errors can carry headers).
- Body checks, in this order, each throwing `HadithApiFawazBodyException`: empty body (`''`); `strlen($body) > maxBytes`; a `Content-Length` header that is a digit string and differs from `strlen($body)` (truncated). Messages name the path and the numbers.
- The client does not decode JSON and does not verify hashes. It writes nothing.

`HadithApiFawazException extends \RuntimeException` (not final); every other exception in the folder extends it. `HadithApiFawazServiceProvider` (final, `extends ServiceProvider`): `register()` binds `HadithApiFawazConfig` and `HadithApiFawazClient` as singletons (`Dorar\DorarServiceProvider` is the pattern). Singletons must not freeze config for tests: bind with closures (`fn () => HadithApiFawazConfig::fromConfig()`) and, in tests, call `app()->forgetInstance(...)` after changing `config()` (the helper below does it).

## Records (`App\Domains\Hadith\Sources\Records`)

All `final readonly class`, constructor property promotion, no methods except where stated, no Eloquent, no laravel-data. Numbers are **text**: hadith numbers can be decimal (`2787.2`), so no int or float is ever stored.

| Class | Fields, in order |
| --- | --- |
| `SourceGrade` | `?string $gradedBy`, `string $grade` (both exactly as received) |
| `SourceHadith` | `string $number`, `?string $arabicNumber`, `?string $text` (exact bytes; `null` only when the key is absent), `list<SourceGrade> $grades`, `?string $referenceBook`, `?string $referenceHadith` |
| `SourceSection` | `string $key` (the JSON key, `'0'`, `'1'`, …), `?string $titleEn` (`null` when the source name is `''`), `?string $firstHadithNumber`, `?string $lastHadithNumber`, `?string $firstArabicNumber`, `?string $lastArabicNumber` |
| `SourceCollection` | `string $slug` (canonical), `string $sourceSlug`, `string $editionName`, `?string $titleEn`, `list<SourceSection> $sections` (in file order), `list<SourceHadith> $hadiths` (in file order) |
| `SourceCollectionInfo` | `string $slug`, `string $sourceSlug`, `?string $titleEn`, `?string $lastHadithNumber`, `int $hadithCount` (length of `info.json`'s `hadiths` list for that collection), `int $sectionCount` |
| `SnapshotFileResult` | `string $path`, `int $bytes`, `string $sha256`, `string $status` (`verified`, `cached`, `new`, `same` or `DIFFERS`) |

`SourceCollection`, `SourceHadith` etc. carry no `source_id`, `resource_id` or database id. `text` may be `''` (a hadith with no text): the adapter does not decide whether to skip it (step 6 does).

## `HadithCollectionSource` (`App\Domains\Hadith\Contracts`)

```php
interface HadithCollectionSource
{
    /** The content_sources code, e.g. 'fawazahmed0'. */
    public function code(): string;

    /** The pinned revision the data comes from (the commit SHA for fawazahmed0). Stored later as source_version. */
    public function version(): string;

    /** Canonical slugs this source serves, in config('hadith.collections') order. */
    public function slugs(): array;                      // @return list<string>

    /** Counts and names from the source's index file, no hadith text. @throws HadithPinException|HadithSourceFormatException|HadithApiFawazException */
    public function info(string $slug): SourceCollectionInfo;

    /** The whole collection. @throws HadithPinException|HadithSourceFormatException|HadithApiFawazException|\InvalidArgumentException for a slug the source does not serve */
    public function collection(string $slug): SourceCollection;
}
```

The interface carries no chapter (باب) type: fawazahmed0 has none. Step 18 adds one additively when `SunnahComSource` needs it.

## `PinnedFileVerifier` (`App\Domains\Hadith\Sources`)

`final class`, no constructor args; reads `config('hadith.files')` on every call (so tests can change it).

```php
public function expected(string $path): ?string;             // the pin, or null when not recorded; throws HadithPinException for a path that is not a key of files
public function assertAllRecorded(): void;                   // throws HadithPinException listing every path whose value is null
public function verify(string $path, string $bytes): void;  // throws on null pin or mismatch; returns nothing on success
public function matches(string $path, string $bytes): bool;  // false (never throws) for a null pin or mismatch; used for cache hits
```

Rules:
- **A `null` pin is a refusal, unconditionally** (no `app()->runningUnitTests()` branch). Tests supply real pins by setting `config('hadith.files')` to the hashes of their fixtures (helper below). `verify()` with a `null` pin throws `HadithPinException` with the message `The pin for [{path}] is not recorded in config/hadith.php; run hadith:snapshot --record and have the developer approve the hashes.`
- A mismatch throws `HadithPinException`: `The bytes for [{path}] do not match the pinned SHA-256; nothing was written.` Compare with `hash_equals(expected, hash('sha256', $bytes))`. Messages contain paths only, never hashes of a file the developer has not seen, never content.

## `SnapshotStore`

`final class`. All paths go through `SourceCache::path('hadith/'.config('hadith.commit').'/'.$path)`.

```php
public function directory(): string;                         // SourceCache::path('hadith/'.commit)
public function path(string $relative): string;              // directory().'/'.relative
public function has(string $relative): bool;
public function read(string $relative): string;              // File::get; the caller checks has() first
public function write(string $relative, string $bytes): void; // ensureDirectoryExists on the parent, write to "{path}.{8 hex}.part", then File::move over the target (pattern: CatalogueDownloader)
public function delete(string $relative): void;
```

`$relative` must be a key of `config('hadith.files')`; otherwise throw `\InvalidArgumentException` (blocks `..` and absolute paths).

## `FawazHadithSource`

`final class FawazHadithSource implements HadithCollectionSource`. Constructor: `HadithApiFawazClient $client`, `PinnedFileVerifier $verifier`, `SnapshotStore $store`.

- `code()` returns `config('hadith.source_code')` (`'fawazahmed0'`). `version()` returns `config('hadith.commit')`. `slugs()` returns `config('hadith.collections')`.
- **Slug mapping (D13).** Canonical slug → fawazahmed0 slug: the key of `config('hadith.slug_map.fawazahmed0')` whose value equals the canonical slug (so `nawawi40` → `nawawi`, `qudsi40` → `qudsi`, `shahwaliullah40` → `dehlawi`); any other canonical slug maps to itself. Edition file: `editions/ara-{sourceSlug}.json`, edition name `ara-{sourceSlug}`. Add `public function sourceSlug(string $slug): string` (public, tested).
- `bytes(string $path): string` (private): if `store->has($path)` and `verifier->matches($path, store->read($path))` return the cached bytes (no network); if it has a file that does not match, `store->delete($path)`; otherwise `$bytes = client->fetch($path)`, `verifier->verify($path, $bytes)` **before** `store->write(...)`, return the bytes. An unverified file is never written by this method.
- `info(slug)`: reads `info.json`, decodes (below) and picks the object for `sourceSlug(slug)`. Expected shape (developer facts, plan): per source slug, `metadata{name, sections{n: name}, last_hadithnumber, section_details}` and `hadiths[...]`. Missing collection key or a non-array → `HadithSourceFormatException('info.json has no usable entry for [{sourceSlug}].')`.
- `collection(slug)`: reads `editions/ara-{sourceSlug}.json`. Expected shape: `metadata{name, sections{n: name}, section_details{n: {hadithnumber_first, hadithnumber_last, arabicnumber_first, arabicnumber_last}}}` and `hadiths[{hadithnumber, arabicnumber, text, grades[{name, grade}], reference{book, hadith}}]`.
  - `sections`: iterate `metadata.sections` in file order; `titleEn` is the name or `null` when `''`; the four number fields come from `section_details[key]` when present, else `null`.
  - `hadiths`: in file order. `number` = `hadithnumber`; `arabicNumber` = `arabicnumber` or `null` when absent; `text` = the string unchanged (`null` only when the key is absent; a non-string value → `HadithSourceFormatException`); `grades` from `grades[]` (`name` → `gradedBy`, `grade` → `grade`; an item without a string `grade` → format exception); `referenceBook` / `referenceHadith` from `reference.book` / `reference.hadith`, `null` when absent.
  - **Number text.** `hadithnumber`, `arabicnumber`, `reference.*` and the `section_details` numbers can be int, float or string in JSON. Convert with one private function `numberText(int|float|string|null $v): ?string`: int → `(string) $v`; string → as is; float → `(string) $v` (PHP's `serialize_precision = -1` gives the shortest round-trip form, so `2787.2` stays `2787.2`); anything else → format exception. Because `json_decode` cannot keep a trailing zero (`1.10` would become `1.1`), before decoding scan the raw bytes with `/"(?:hadithnumber|arabicnumber)"\s*:\s*-?\d+\.\d*0\s*[,}\]]/` and throw `HadithSourceFormatException` (`A hadith number in [{path}] would lose a trailing zero; the parser must be extended.`) if it matches. This keeps decimals byte-exact or fails loudly.
  - The `metadata.name` becomes `titleEn` (`null` when missing or `''`).
- Decoding helper (private): strip a leading UTF-8 BOM **in memory only**, `json_decode($body, true, 512, JSON_THROW_ON_ERROR)`; invalid JSON or a non-array → `HadithSourceFormatException('[{path}] is not valid UTF-8 JSON.')`. Never catches and echoes `JsonException` text that could hold content.
- `editionNames(): array` (public, `@return array<string, list<string>>`): from `editions.json`, source slug → list of edition `name`s. Expected shape: top-level object keyed by source slug, each value an object whose `collection` key is a list of edition objects with a string `name`. If a collection lacks a usable `collection` list → `HadithSourceFormatException('editions.json has no edition list for [{sourceSlug}].')`. (See open question 2: the container key name is not in the plan's facts.)
- An unknown canonical slug passed to `info()` or `collection()` → `\InvalidArgumentException('Unknown Hadith collection [{slug}].')` before any file access.
- `ara-{c}1` and English editions are never requested (the client refuses them) and `editionNames()` does not return them to a caller as importable: it returns what `editions.json` lists, and `collection()` only ever reads the `ara-{sourceSlug}` edition.

## `HadithSourceRegistry`

`final class`. Constructor: `FawazHadithSource $fawaz`. Private `array<string, HadithCollectionSource> $sources` keyed by `code()`. Pattern: `AzkarSourceRegistry`.

```php
public function for(string $code): HadithCollectionSource;   // UnknownHadithSourceException('Unknown Hadith source [{code}]. Use one of: …') on a miss
public function primary(): HadithCollectionSource;           // for($this->primaryCode())
public function primaryCode(): string;                       // (string) config('hadith.primary_source')
/** @return list<string> */ public function codes(): array;
```

`HadithSourceServiceProvider` (final, `extends ServiceProvider`): `register()` binds `HadithSourceRegistry` as a singleton; `boot()` calls `$this->commands([HadithSnapshotCommand::class])`. Bind `HadithCollectionSource::class` to `fn () => app(HadithSourceRegistry::class)->primary()`.

## `HadithSnapshotter`

`final class`. Constructor: `HadithApiFawazClient $client`, `PinnedFileVerifier $verifier`, `SnapshotStore $store`, `FawazHadithSource $source`.

```php
/**
 * @return list<SnapshotFileResult>
 * @throws HadithPinException|HadithSourceFormatException|HadithApiFawazException
 */
public function take(bool $record): array;
```

Algorithm (paths are `array_keys(config('hadith.files'))` in config order):
1. `$record === false`: call `verifier->assertAllRecorded()` first. If any pin is `null` it throws before any request, and the command tells the developer to use `--record`.
2. Fetch `editions.json` first. Verified mode: it must pass `verifier->verify()` before it is written. Record mode: write it unverified.
3. **Edition-name check.** Using the bytes just fetched, for every canonical slug confirm that `ara-{sourceSlug}` is among the names `editions.json` lists for that source slug. Collect every difference and throw one `HadithSourceFormatException` whose message lists them as `[{sourceSlug}] edition [ara-{sourceSlug}] is not listed in editions.json` (names only). Nothing else is downloaded after a difference. This is the plan's "confirm against `editions.json`, report differences instead of guessing".
4. For each remaining path: `usleep(gap_ms * 1000)` when `gap_ms > 0`, then fetch.
   - Verified mode: if `store->has($path)` and `verifier->matches(...)` → result status `cached`, no request. Otherwise fetch, `verifier->verify` before `store->write`, status `verified`.
   - Record mode: always fetch (never trust the cache), write the bytes, and compute `sha256`. Status: `new` when the pin is `null`, `same` when it equals the hash, `DIFFERS` when a recorded pin differs.
5. Return the results in config order. `SnapshotFileResult::bytes` is `strlen`.

Record mode writes unverified bytes into the cache. This is safe only because **every reader goes through `FawazHadithSource::bytes()` (or `PinnedFileVerifier`), which re-hashes cached bytes against the pin and deletes a mismatch** (ADR 0068 §2). Step 6 must not read the folder directly.

## `HadithSnapshotCommand` (`App\Domains\Hadith\Console`)

`final class extends Illuminate\Console\Command`.

```php
protected $signature = 'hadith:snapshot
    {--record : Download without verifying and print the hashes to pin (developer review; never in production)}';

protected $description = 'Download the pinned fawazahmed0 hadith files into the source cache and print the SHA-256 map (ADR 0042).';

public function handle(HadithSnapshotter $snapshotter): int;
```

Behaviour:
- **Default mode (no option)** verifies: it needs every pin recorded. If a value in `config('hadith.files')` is `null` it prints `error`: `Some pins are not recorded. Run: php artisan hadith:snapshot --record` (plus the missing paths, one per line) and returns `FAILURE` without a request. When all pins are set it downloads or reuses cached files, verifies each, prints the table and returns `SUCCESS`. A pin mismatch deletes nothing already verified, writes nothing for the bad file, prints the `HadithPinException` message and returns `FAILURE`.
- **`--record`** is the way to record the first hashes: it downloads all 12 files with no pin check (it still enforces the allowed-path list, the size cap and the truncation check) and prints the map. It refuses with `error` `hadith:snapshot --record is for the developer's machine; it is disabled in production.` and `FAILURE` when `app()->isProduction()`.
- On any `HadithApiFawazException`, `HadithPinException` or `HadithSourceFormatException`: `$this->error($e->getMessage())`, return `FAILURE`. No stack trace, no content.
- **It never writes `config/`** (no `File::put` to a config path anywhere in this step).

Output (use `$this->line` / `$this->info`; tests assert on `expectsOutputToContain`):

```
Snapshot directory: {SourceCache path}
{path}  {bytes} bytes  sha256 {64 hex}  [{status}]        # one line per file, config order
{n} files, {total bytes} bytes total.
Pin for config/hadith.php ('files'), for the developer to review and paste:
        'editions.json' => '{hash}',
        'info.json' => '{hash}',
        'editions/ara-bukhari.json' => '{hash}',
        ...
```

The paste block is printed in both modes (verified mode prints the pins it just verified). In record mode, if any status is `DIFFERS`, add `{k} file(s) differ from the recorded pin; a SHA bump is a change the developer approves.` Exit code stays `SUCCESS`.

## Tests (Pest, `declare(strict_types=1)`, placeholders only, never live network)

Every test file starts with `Http::preventStrayRequests();` in `beforeEach` and uses `Http::fake`. Hashes are of the fixtures, never of real data.

### `Support/HadithFixtureFiles.php` (helpers; global function names prefixed `hadith`)
Not a Pest test (its file name does not end in `Test.php`). Test files load it with `require_once __DIR__.'/../Support/HadithFixtureFiles.php';` (and the contract file the same way).
- `hadithFixtureFiles(): array<string, string>`: path → JSON bytes for the 12 keys of `config('hadith.files')`. For each of the ten source slugs derive the source slug from the config (`nawawi`, `qudsi`, `dehlawi` for the three renamed ones). `editions.json`: `{"{sourceSlug}": {"name": "FIXTURE collection {n}", "collection": [{"name": "ara-{sourceSlug}", "author": "FIXTURE author", "language": "Arabic", "direction": "rtl", "has_sections": true, "link": "FIXTURE", "linkmin": "FIXTURE"}]}}`. `info.json`: per source slug `{"metadata": {"name": "FIXTURE collection {n}", "last_hadithnumber": 3, "sections": {"0": "", "1": "FIXTURE section 1"}}, "hadiths": [3 items {"hadithnumber": n, "arabicnumber": n, "grades": [], "reference": {"book": 1, "hadith": n}}]}`. Each `editions/ara-{sourceSlug}.json`: `metadata{name, sections{"0": "", "1": "FIXTURE section 1", "2": "FIXTURE section 2"}, section_details{"0": {...}, "1": {hadithnumber_first 1, hadithnumber_last 2, arabicnumber_first 1, arabicnumber_last 2}, "2": {...3...}}}` and `hadiths`: number `1` with text `FIXTURE text 1 — not a hadith` and one grade `{"name": "FIXTURE grader", "grade": "FIXTURE grade"}`; number `2787.2` (decimal) with text «نص تجريبي ١ — ليس حديثًا» plus a `U+200F` after the dash (to prove byte-exactness) and no grades; number `3` with `"text": ""` (no text). Encode with `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`. Build the strings with `json_encode`; the decimal `2787.2` encodes as `2787.2`.
- `hadithPinFixtures(array $files): void`: `config(['hadith.files' => array_map(fn (string $bytes): string => hash('sha256', $bytes), $files)])` and set `config(['hadith.download.retry_delay_ms' => 0, 'hadith.download.gap_ms' => 0])`; then `app()->forgetInstance(HadithApiFawazConfig::class)`, `forgetInstance(HadithApiFawazClient::class)`, `forgetInstance(HadithSourceRegistry::class)` so singletons rebuild.
- `hadithFakeCdn(array $files): void`: `Http::fake` for the pattern `cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@{commit}/*` with a closure that takes the part of the request URL after `@{commit}/` and returns `Http::response($files[$path])`, or `Http::response('', 404)` for a path not in `$files`.
- `hadithUseTempCache(): string`: sets `config(['content_sources.cache_root' => storage_path('framework/testing/hadith-'.bin2hex(random_bytes(4)))])` and returns it; test files call it in `beforeEach` and `File::deleteDirectory($root)` in `afterEach`. This replaces Azkar's back-up-and-restore of the real cache folder: a real cache is never touched.

### `Source/HadithApiFawazClientTest.php`
- `it('builds URLs from the pinned commit and never uses @1')`: `url('editions.json')` equals `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@df57907be35291c91ad6a6691180e22ca9920784/editions.json`; it does not contain `@1`; a request sent through `fetch()` has the same URL (`Http::assertSent`).
- `it('refuses a path that is not a pinned file and sends no request')`: `editions/ara-bukhari1.json`, `editions/eng-bukhari.json`, `../info.json` and `info.min.json` throw `HadithApiFawazPathException`; `Http::assertNothingSent()`.
- `it('sends the Taybah user agent with the contact email')`: `config(['quran.qf.contact_email' => 'fixture@example.test'])`; the request header equals `Taybah/1.0 (+mailto:fixture@example.test)`; with an empty email it equals `Taybah/1.0`.
- `it('retries on 503 and then succeeds')`: `Http::sequence()` 503, 503, 200 → bytes returned, `Http::assertSentCount(3)`.
- `it('retries on a connection error')`: first call throws `ConnectionException` (via `Http::fake` closure), second succeeds.
- `it('retries on 429 and fails after the last try with the status')`: three 429 → `HadithApiFawazRequestException` with `status` 429, three requests.
- `it('does not retry a 404 and reports the missing path')`: `HadithApiFawazNotFoundException`, message contains the path, one request.
- `it('does not retry another 4xx')`: 403 → `HadithApiFawazRequestException`, one request.
- `it('refuses an oversized body')`: `config(['hadith.download.max_bytes' => 10])`, body of 11 bytes → `HadithApiFawazBodyException`.
- `it('refuses a truncated body')`: header `Content-Length: 100` with a 10-byte body → `HadithApiFawazBodyException`.
- `it('refuses an empty body')`.
- `it('rejects a commit that is not 40 hex characters')`: `config(['hadith.commit' => '1'])` and `config(['hadith.cdn_base' => 'https://cdn.example.test/x@1'])` each make `HadithApiFawazConfig::fromConfig()` throw `HadithApiFawazConfigException`.

### `Source/PinnedFileVerifierTest.php`
- `it('refuses a file whose SHA-256 differs from config')`: pin `editions.json` to the hash of A, `verify('editions.json', B)` throws `HadithPinException` (message contains `do not match`).
- `it('accepts matching bytes')`.
- `it('refuses a null pin unconditionally')`: `config(['hadith.files' => [the 12 keys, all null]])`: `verify()` throws with `not recorded`; `matches()` returns `false`; `assertAllRecorded()` throws and its message lists every null path.
- `it('refuses a path that is not a pinned file')`.

### `Source/FawazHadithSourceTest.php`
- `it('passes the shared source contract')`: calls `hadithSourceContract(fn () => app(FawazHadithSource::class))` (the helper is defined below). Setup in `beforeEach`: `hadithUseTempCache()`, `$files = hadithFixtureFiles()`, `hadithPinFixtures($files)`, `hadithFakeCdn($files)`.
- `it('maps the three renamed slugs to fawazahmed0 edition names')`: `sourceSlug('nawawi40')` is `nawawi`, `sourceSlug('qudsi40')` is `qudsi`, `sourceSlug('shahwaliullah40')` is `dehlawi`, `sourceSlug('bukhari')` is `bukhari`; `collection('nawawi40')->editionName` is `ara-nawawi`; the request URL ends with `editions/ara-nawawi.json`.
- `it('requests only ara editions and never ara-{c}1 or English')`: after `collection()` for all ten slugs, every recorded request path starts with `editions/ara-` or is `editions.json`/`info.json`, none ends in `1.json`, none contains `eng-`.
- `it('returns the text byte for byte, including U+200F')`: the second hadith's `text` is `===` the fixture string and `strlen` equals the fixture's.
- `it('keeps a decimal hadith number as text')`: number `'2787.2'` (string, `toBe`).
- `it('keeps a hadith with no text and does not decide to skip it')`: number `'3'`, `text === ''`; the collection still has 3 hadiths.
- `it('keeps grades as received and a hadith without grades has an empty list')`.
- `it('reads section names and ranges and maps an empty name to null')`: section `'0'` has `titleEn === null`; section `'1'` has `firstHadithNumber '1'`, `lastHadithNumber '2'`.
- `it('refuses a downloaded file whose hash differs from the pin and writes nothing')`: fake serves different bytes for `editions/ara-bukhari.json`; `collection('bukhari')` throws `HadithPinException`; the file does not exist in the cache folder.
- `it('serves a verified cached file without a second request')`: call `collection('bukhari')` twice; the file was requested once (`Http::assertSentCount` counts via a recorded list).
- `it('deletes a corrupted cached file and downloads it again')`: write junk to the cache path, call `collection()`; the cache file now equals the fixture bytes.
- `it('fails with a format error when a collection is missing its sections or hadith list')` and `it('fails when a hadith number would lose a trailing zero')` (raw `"hadithnumber": 1.10`).
- `it('fails when editions.json lacks the edition list for a collection')`.
- `it('rejects an unknown slug without touching a file')`: `\InvalidArgumentException`, `Http::assertNothingSent()`.
- `it('reports a 404 on one collection with its path')`: fake 404 for `editions/ara-malik.json` → `HadithApiFawazNotFoundException`, message contains `editions/ara-malik.json`.
- `it('exposes counts from info.json without any hadith text')`: `info('bukhari')` returns `hadithCount 3`, `sectionCount 2`, `lastHadithNumber '3'`.

### `Support/HadithSourceContract.php`
`function hadithSourceContract(Closure $make): void` registers (via `it()` calls inside, so they run as part of the calling file) these assertions against `$make()`; `FawazHadithSource` now, `SunnahComSource` in step 18:
- `code()` is a non-empty string and `version()` is a non-empty string.
- `slugs()` is identical to `config('hadith.collections')` (ten canonical slugs).
- For every slug: `info($slug)->slug === $slug` and `collection($slug)->slug === $slug`; every `SourceHadith::$number` is a non-empty string; every section key is a string; every `SourceGrade::$grade` is a string; no record carries an `int`/`float` where the table above says `string`.
- An unknown slug throws `InvalidArgumentException`.

Use a Pest dataset-free approach: because `it()` names must be unique per file, prefix them `contract: …`.

### `Source/HadithSourceRegistryTest.php`
- `it('returns the fawazahmed0 source for its code and as the primary')`: `for('fawazahmed0')`, `primary()` same class, `primaryCode()` is `fawazahmed0`, `codes()` is `['fawazahmed0']`.
- `it('throws a domain exception for an unknown code')`: `UnknownHadithSourceException`, message names the code and the valid codes.
- `it('resolves the contract from the container to the primary source')`: `app(HadithCollectionSource::class)` is a `FawazHadithSource`.

### `Source/HadithSnapshotCommandTest.php`
`beforeEach` as in the source test. Each test sets its own pins (`hadithPinFixtures`) or leaves them `null`.
- `it('refuses default mode while any pin is null, makes no request and tells the developer to use --record')`: all `files` null; `artisan('hadith:snapshot')` exits 1, output contains `--record` and `editions.json`; `Http::assertNothingSent()`.
- `it('records: downloads all twelve files without pins and prints the hash map')`: pins null; `artisan('hadith:snapshot', ['--record' => true])` exits 0; output contains each of the 12 paths, `sha256`, the 64-hex hash of `editions.json`'s fixture bytes and the line `'editions.json' => '{hash}',`; all 12 files exist in `SourceCache::path('hadith/'.commit)`; exactly 12 requests.
- `it('record mode never writes config')`: `config_path('hadith.php')` contents (hash) are the same before and after.
- `it('record mode flags a changed pin')`: pin `info.json` to the zero hash; output contains `DIFFERS` and `differ from the recorded pin`; exit 0.
- `it('record mode is disabled in production')`: `$this->app['env'] = 'production'` (restore in `afterEach`); exit 1, output contains `disabled in production`, no request.
- `it('verifies with recorded pins and prints the same map')`: `hadithPinFixtures`; default mode exits 0; statuses are `verified`; the paste block lines equal the pins.
- `it('snapshot is stable: a second run uses the cache, makes no request and prints identical hashes')`: run twice, compare the two outputs' hash lines (`Artisan::output()`), second run statuses are `cached`, total requests stay 12.
- `it('stops on a pin mismatch, writes nothing for that file and exits 1')`: serve different bytes for `editions/ara-muslim.json`; exit 1, output contains `do not match`; that file is absent from the cache.
- `it('stops when editions.json does not list an expected edition and downloads nothing else')`: `editions.json` fixture without `ara-malik`; exit 1, output contains `edition [ara-malik]`; requests made: 1 (only `editions.json`).
- `it('reports a 404 and exits 1')`: 404 for `editions/ara-nasai.json`; output contains that path.
- `it('requests no ara-1 and no English edition')` (same assertion as the source test, over a full run).
- `it('prints no hadith text')`: output contains none of the fixture texts.
- `it('is registered and not scheduled')`: `Artisan::all()` has `hadith:snapshot`; `app(Illuminate\Console\Scheduling\Schedule::class)->events()` has no event whose command contains `hadith:snapshot`.
- Architecture (add to `Source/HadithSnapshotCommandTest.php` or a new `Source/HadithSourceArchTest.php`): `arch('the fawazahmed0 client imports no domain')->expect('App\Integrations\HadithApiFawaz')->not->toUse('App\Domains')` and `arch('hadith source records are plain PHP')->expect('App\Domains\Hadith\Sources\Records')->not->toUse(['Illuminate\Database', 'Spatie\LaravelData', 'Illuminate\Http'])`, and `->toUseStrictTypes()` for `App\Domains\Hadith` and `App\Integrations\HadithApiFawaz`.

## Reuse (paths checked)
- `apps/api/app/Domains/Azkar/Sources/HisnMuslimSnapshotter.php` (retry predicate, BOM, user agent, gap, manifest write)
- `apps/api/app/Domains/Azkar/OpenDua/CatalogueDownloader.php` (verify before write, `.part` then move)
- `apps/api/app/Domains/Azkar/Sources/PinnedSnapshotVerifier.php` (re-hash cached files)
- `apps/api/app/Domains/Azkar/Console/SnapshotCommand.php` (command shape, printed pin block)
- `apps/api/app/Domains/Azkar/Sources/AzkarSourceRegistry.php` (registry), `AzkarCatalogueSource.php` (contract style)
- `apps/api/app/Integrations/Dorar/DorarServiceProvider.php`, `DorarConfig.php`, `DorarException.php` (integration provider, config object, exception style)
- `apps/api/app/Support/Storage/SourceCache.php`, `apps/api/config/content_sources.php`, ADR 0068
- `apps/api/tests/Feature/Azkar/SnapshotPinnedTest.php`, `CatalogueDownloadTest.php` (fake-HTTP test style)
- `apps/api/tests/Unit/ArchitectureTest.php` (the layering rules these classes must satisfy)
- `apps/api/config/hadith.php` (step 2, uncommitted), `apps/api/config/quran.php` (`qf.contact_email`)

## Gates
Run from `apps/api` with the local PHP 8.5:

```bash
composer qa
```

(`pint --test`, `phpstan analyse` at level 8, `pest --parallel`.) If Pint reports style issues, run `vendor/bin/pint` once, then rerun `composer qa`. No dependency changes, so `composer audit` and `node .github/scripts/npm-audit.mjs` are not required. **No OpenAPI change is expected** (no route, controller, resource or schema change): `npm run generate -w @quran/api-contract` must produce no diff in `openapi.json` or `schema.d.ts`. If it does, stop and report. Also run `git status --short` and confirm nothing exists under `apps/api/storage/` as a tracked or untracked change, and that no `database/` file was added.

Do not run `hadith:snapshot` against the live network as part of this step: the real first snapshot is the developer's decision (open question 1).

## Out of scope
- Any table, model, factory, migration, repository, Data object, API Resource, route or OpenAPI change (steps 3 and 7).
- Pack contract, `ResourceGroup`, `PackSchema`, the manifest, the normaliser (step 4); mobile files.
- The mapper (section → book, ranges vs `reference.book`), validator, `hadith:import`, `hadith:match-section-titles`, the scheduler entry, `source_text_sha256`, reports (step 6). This step never decides whether a hadith with `text === ''` is skipped.
- `docker/release.sh`, the runbook and any use of `hadith:snapshot` there (step 17).
- Filling in the real SHA-256 values in `config/hadith.php`: the developer reviews the printed map and approves the paste (RB9). Do not edit `files` values.
- `SunnahComSource`, `Integrations/SunnahCom`, `Integrations/HadithApiCom` (the matcher's client; step 6/18). A chapter type in the contract (step 18, additive).
- Fetching `info.min.json`, `.min.json` variants, per-section files, `ara-{c}1` or English editions.
- Running the live download in this step. Editing `.gitignore` (already covered), `docs/technical-spec.md`, ADR 0042, `docs/plans/phase-7.md` or the README.

## Open questions for the developer

1. **First hashes: `--record`.** The plan says `hadith:snapshot` "prints the hash map for review" but also that the verifier refuses while a pin is `null`; the two meet only if the first run skips verification. This brief adds `hadith:snapshot --record` (downloads all 12 files with no pin check, prints the map, never writes `config/`, disabled in production) and makes the default run verify against the pins. Confirm, or name another mechanism. Also confirm that `--record` may write unverified bytes into the cache (safe because every reader re-hashes, see `HadithSnapshotter`), or choose to discard them after printing.
2. **`editions.json` container key.** The plan's facts say `editions.json` lists, per collection, editions with `name`, `language`, `direction`, `has_sections`, `link`, `linkmin`, but do not name the key that holds the list. The brief assumes it is `collection` (from memory of the upstream repo; not re-fetched, not in the plan). The parser fails with a clear message if it differs, and `--record` will show it. Confirm the key on the first `--record` run, or say now.
3. **Cache location.** The plan and README say `storage/app/hadith`; ADR 0068 (later) says all downloaded upstream files go under `content_sources.cache_root` (`storage/app/private/sources`). This brief follows ADR 0068 (`hadith/{commit}/…`). The plan row and the README «Environment» sentence should be updated by whoever owns them; I did not edit them.
4. **Download limits** (`config/hadith.php` `download`): 60 s timeout, 3 tries, 1 s base backoff doubling, 300 ms gap, 30 MB per file. These mirror the Azkar snapshotters and are assumptions, not measured; `--record` prints each file's size so the cap can be checked against real data. Total download is about 47 MB per the plan.
5. **Where the DTOs live.** `ArchitectureTest` forces everything under `App\Domains\*\Data` to extend laravel-data, so the plain-PHP records are in `App\Domains\Hadith\Sources\Records`. If step 3 or 4 plans a `Hadith\Data` namespace for laravel-data objects, there is no clash.
6. **Interface scope.** The contract exposes `code`, `version`, `slugs`, `info`, `collection`. It has no chapter type and no per-hadith book assignment, because fawazahmed0 has neither (step 6 assigns books from section ranges). Step 18 will extend the records additively when Sunnah.com's shape is known; say now if the contract should already carry `bookKey` / `chapterKey` fields on `SourceHadith`.
7. **Decimal numbers.** JSON decoding cannot keep `1.10`; the brief makes the parser fail loudly on a trailing-zero decimal rather than guess. If the real files contain one, the parser needs a raw-number reader (a step-5 follow-up, not a silent change).
8. **Branch.** The plan header says `ft/hadith`; the developer now works on `main` (CLAUDE.md, 6 Nov 2026) and step 2 did the same. This brief assumes `main`.
