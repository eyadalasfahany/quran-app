# Autoconnect Laravel CRUD — Reference Detail

Heavy detail for `autoconnect-laravel-crud`. Load when you reach Postman/Hoppscotch work, enum/relation endpoint semantics, the governance gate, or need the enforced-vs-aspirational map. Day-to-day CRUD rules live in SKILL.md.

## Enforced vs aspirational (constitution)

The bundled [autoconnect-constitution.md](autoconnect-constitution.md) (v1.1.7) — the shared template across these projects — mixes live rules with structure that was never adopted. Follow the live code. (Each project also keeps its own copy at `.specify/memory/constitution.md`.)

| Constitution prescribes | Reality in codebase | Skill stance |
|---|---|---|
| `Request → DTO → UseCase → Resource` | Controllers call services directly; UseCases only for Clone/Export (Vehicle), no per-action CRUD use cases anywhere | **Use `Request → Controller → Service → Resource`**. Add DTO/UseCase only if the module already has them |
| `Http/Requests/Admin/Upsert{Entity}Request` | Flat `Http/Requests/{Entity}Request`, single shared store/update | Flat shared `{Entity}Request` |
| Eloquent **guarded** attributes | Models use `$fillable` | `$fillable` |
| Pagination contract on every index | Some indexes (e.g. Warranty) return unpaginated collections | **Paginate** — constitution rule is right; some old code violates it. New code paginates |
| Soft-delete reuse via Form Request unique-ignore | Form Request ignore **+** service restores the trashed row | Do **both** |

These ARE live and enforced: friendly 404, transformer discipline (explicit fields, no timestamps, translations, `whenLoaded`), `BaseRepository`/`BaseFilters`, `MultiTenantable`+`Filterable`+`$filter`, `ClientConfig` for config reads, the `setData()->customResponse()` envelope, options + enum-catalog endpoints, Postman/Hoppscotch drift control.

**Partially adopted — match the module you're editing:** the `Transformers/Admin` + `Transformers/User` split is a constitution rule and is used by newer entities (e.g. City, Location, Warranty under `Transformers/Admin`), but most of the Vehicle module still uses **flat** `Transformers/{Entity}Resource`. When adding to a module, follow that module's existing convention; when starting fresh, prefer the Admin/User split for translatable entities.

## Response envelope

All admin responses go through `App\Traits\ApiResponse` on the base `Controller`:

```
{ "code": int, "errors": [...], "data": ..., "message": "...", "meta": {...} }
```

- `$this->setData($x)->customResponse()` — `setData` runs `App\Decorators\PaginatorDecorator::apply($x)`.
- `->setMessage('...')` / `->setCode(201)` chain before `customResponse()`.

### PaginatorDecorator (how pagination actually works)

`PaginatorDecorator::apply($data)`:
1. Unwraps a `JsonResource`/resource-collection to its underlying `->resource`.
2. If that underlying value is a `LengthAwarePaginator` / `Paginator` → returns `['data' => $original, 'meta' => {...}]` where `meta` has: `current_page`, `from`, `last_page`, `path`, `per_page`, `to`, `total`, `first_page_url`, `last_page_url`, `next_page_url`, `prev_page_url`, `links`.
3. Otherwise → `['data' => $original, 'meta' => null]`, and `setData` leaves `meta` as `{}`.

So: **pass `BrandResource::collection($paginator)` → full pagination `meta` for free. Pass a plain collection (options/select) → no `meta`.** Never paginate manually in the controller — return a paginator from the service and let the decorator build `meta`.

`BaseRepository::getAll(array $relations = [], ?bool $paginate = true, ...)` paginates by default; `per_page` query param, default 15. Pass `$paginate = false` for options/select lists.

**Where pagination applies:** ~90% on **admin** list endpoints (authenticated admin panel) — admin `index` MUST paginate. Public/user read lists and any `options`/select endpoint are typically unpaginated plain collections.

## Options endpoints

For any entity referenced as a FK elsewhere. Lightweight selector list (`id` + `name`/`code`), unpaginated allowed. Route under the admin prefix (or module API prefix for public read). Returns a plain collection through a slim resource.

## Enum catalog endpoints

Every API-facing enum (statuses, types, modes, rule catalogs) gets a dedicated read endpoint so the frontend never hardcodes options. Return selector-friendly shape:

```php
collect(VehicleStatusEnum::cases())->map(fn ($c) => [
    'value' => $c->value,
    'label' => __("enums.vehicle_status.{$c->value}"),
])->all();
```

Enums live in `Modules/{M}/app/Enums/`.

## Relation (pivot / polymorphic) endpoints

For relation tables (e.g. `exterior_colorables`, `interior_colorables`) expose **attach** and **detach** (or sync) only — never generic CRUD on the relation table.

- **Attach** = idempotent identity-based upsert. Repeating the same relation identity updates the existing row, never creates a duplicate. (`sync`/`updateOrCreate` keyed on the relation identity.)
- **Detach** = body-based, keyed by the minimal relation identity payload (e.g. `{exterior_color_id, vehicle_id}`), NOT by the relation table's row id.

## Soft-delete unique reuse — full pattern

When a soft-deletable entity has a reusable unique business id (`slug`, `code`, `email`, `mobile`):

1. **Form Request** — unique rule ignores trashed:
   `unique:{table},{col},{ignoreId},id,deleted_at,NULL` (store uses `NULL` as ignoreId).
2. **Service** — on store, look up `...WithTrashed()` by the unique key; if found and `trashed()`, `restore()` + update instead of inserting a duplicate.
3. **DB layer** — if a DB-level unique index exists on the reusable column, the stored value MUST be released on soft delete so later inserts don't fail at the DB. Constitution III: prefer a temporary per-client backfill command/service over an automatic migration for stale rows; **delete that command once run**.
4. **Test** — regression covering: create → update keeping same id → soft delete → recreate with same id (all must pass at validation AND DB level).

## Multitenant setup — provider wiring (autoconnect)

Pattern = **one active client per request; dynamic default DB connection per request** (not a connection per model). Boot chain:

1. **`MultiTenantServiceProvider::boot()`** registers the chain in order:
   ```php
   $this->app->register(ClientConfigServiceProvider::class);          // always
   if (! $this->app->runningInConsole()) {
       $this->app->register(MailServiceProvider::class);
       $this->app->register(DatabaseServiceProvider::class);
       $this->app->register(SocialiteServiceProvider::class);
   }
   ```
2. **`AppServiceProvider::register()`** binds the singletons:
   ```php
   $this->app->singleton(Settings::class, fn () => Settings::make(storage_path('clients.json')));
   $this->app->singleton(ClientConfig::class);
   ```
   `storage/clients.json` (via `settings()`) is the client registry.
3. **`ClientConfigServiceProvider::boot()`** resolves the client per request through `ClientDomainResolver` (by domain, `X-Client-Code`, or environment override), caches it (`Cache::rememberForever` keyed by domain/code/env; console resolves uncached), then applies it:
   ```php
   config(['client' => $clientData['config']]);
   config(['client.resolved_environment' => $clientData['environment']]);
   App::detectEnvironment(fn () => $clientData['environment']);
   // + app.timezone / date_default_timezone_set from client timezone
   ```
4. **`DatabaseServiceProvider::boot(ClientConfig $clientConfig)`** sets the tenant DB connection per request from the resolved client, and points the default + client queue at it:
   ```php
   $db = $clientConfig->getEnvironmentConfig('database');
   if (! $db) { throw new ServiceUnavailableHttpException(null, 'Connection failed. Please try again later.'); }
   $name = $db['database']; $db['connection'] = $name;
   config([
       "database.connections.{$name}" => $db,
       'database.default'             => $name,
       'queue.connections.client_queue' => [
           'driver' => 'database', 'connection' => $name,
           'table' => 'jobs', 'queue' => 'default', 'retry_after' => 1800,
       ],
   ]);
   ```
   Skips storage asset requests and webhook paths (`config('webhooks.paths')`) — those don't need a tenant DB.

Net effect: after boot, plain Eloquent uses the tenant DB automatically (default connection swapped), and app code reads tenant config via `ClientConfig` accessors — no per-model connection juggling.

## ClientConfig (constitution XII)

`app/HelperClasses/ClientConfig.php`. One active tenant client per request. ALL reads of resolved client config go through it.

```php
public function __construct(protected ClientConfig $clientConfig) {}
// or: app(ClientConfig::class)
$code   = $this->clientConfig->getCode();
$locale = $this->clientConfig->getDefaultLocale();
```

Typed accessors: `getName()`, `getSupportedLocales()`, `getDefaultLocale()`, `getTimezone()`, `getCurrency()`, `getSettingValue()`, `isFeatureEnabled()`, `getEnvironmentConfig()`, `getDatabaseConfig()`, `getMailConfig()`, `getWebsiteUrl()`. Need a new field → add an accessor, don't spread `config('client...')`.

**Allowed exceptions** (not application reads): inside `ClientConfig` itself; bootstrap code that *sets* context (middleware, providers, `setClientByDomain`, `config(['client' => ...])`); `loadAllClients()`/`clearClientCache()`; tests binding/mocking `ClientConfig`.

## Media

Use `App\Helpers\MediaHelper` + `App\Actions\Media\AttachMediaCommand`. In services: strip media keys from payload before create/update, then attach (`extractMediaPayload` / `attachMediaIfNeeded`). Models declare `getMediaCollectionNames()`; request file keys match collection names. Store/update with media use **form-data** bodies.

## Filters

Model: `use Filterable;` + `protected $filter = {Entity}Filter::class;`. Filter extends `App\Http\Filters\BaseFilters`, declares `protected $filters = ['search', 'is_active', ...]` and a method per filter key. Shared helpers only (`applyLikeFilter`, `applyExactFilter`, `applyBooleanFilter`, `applyDateFilter`, `applySearch` / `whereLike`). No cross-module base filter class. Query via `$model->filter()`.

## Postman / Hoppscotch collections

Location: `docs/postman/`. One main collection (`AutoConnect.postman_collection.json`) referencing per-module collections (`{Module}-API.postman_collection.json`).

**Coverage** — every CRUD, options/select, attach/detach, relation-aware, and enum-catalog endpoint has a working request. For id-based endpoints, examples for: success (200/201), validation failure (422), not found (404 with friendly `{Entity} not found`).

**Requests/examples** — real route paths + correct `originalRequest`; example bodies reflect actual transformer output (not placeholders); filter examples demonstrate every filterable column; relation query uses comma-separated values in `relations` param (not URL-encoded).

**Base URL/vars** — all URLs use collection var `url` = `http://127.0.0.1:8000/api`; never duplicate `/api` in path segments; align vars/scripts with Admin collection (`url`, `X_Client_Domain`, `X_Client_Code`, prerequest script adding `Accept: application/json` + client headers). Auth-bearing requests inherit auth from parent.

**Media** — form-data bodies; update-with-media uses `POST` + `_method=put`; expose all media collection keys as upload fields.

**Translatable** — create/update examples include each locale key (`en`, `ar`).

**Hoppscotch** — no top-level collection `variable` blocks unless approved; use environment config. Files valid UTF-8 JSON; no `????` / mojibake Arabic.

**Drift control** — any API/payload change updates the module Postman collection, module Hoppscotch collection, and the combined/root collections (content-synced, not just folder names).

## Public read APIs (non-auth entities)

Expose `index`, `show`, `options` under the module API prefix (`/api/{module}/...`), controllers under `Http/Controllers/API`. Don't build parallel `User` controller trees when API controllers are the contract.

## Testing (model on voc-be — this is the correct reference)

**Write new tests in the voc-be style: Pest functional (`it()` / `expect()`), per-test isolated tenant DB, Mockery for unit isolation.** voc-be does tests correctly — copy its patterns, not autoconnect's. (Some older autoconnect tests use classic `class extends TestCase` + `RefreshDatabase` + `#[Test]`; that is legacy — do NOT use it for new work.)

voc-be wiring (real):
- `tests/Pest.php`: `pest()->extend(Tests\TestCase::class)->in('Feature')` (and per-module dirs). No global `RefreshDatabase`.
- Tenant harness `Tests\Support\CreatesTenantSqliteDatabase`: `createIsolatedSqliteDatabasePath()` (touches a unique sqlite file under `storage/framework/testing/tenant-dbs`) + `sqliteTenantDbConfig($path)` (returns the `db_*` array for a `VocClient` factory).
- A feature test boots a tenant `VocClient` with that sqlite config, `Sanctum::actingAs(Admin::factory()->create(...), ['admin:*'])`, then hits endpoints with the `X-Tenant-Client-Code` header.

Harness class/helper names vary per project — check the target project's `tests/Pest.php`, `tests/Support/*`, `tests/TestCase.php` before copying.

### Feature test (HTTP contract + tenant boot) — voc-be pattern

```php
<?php

declare(strict_types=1);

use Laravel\Sanctum\Sanctum;
use Modules\Admin\Models\Admin;
use Modules\Core\Models\VocClient;
use Tests\Support\CreatesTenantSqliteDatabase;   // voc-be harness; confirm name per project

uses(CreatesTenantSqliteDatabase::class);

it('creates a brand with a reusable code', function (): void {
    $code = 'tenant_'.uniqid();
    $path = test()->createIsolatedSqliteDatabasePath();
    VocClient::factory()->create([
        'client_code' => $code,
        'db_config'   => test()->sqliteTenantDbConfig($path),
    ]);
    Sanctum::actingAs(Admin::factory()->create(['allowed_tenant_codes' => null]), ['admin:*']);

    $this->postJson('/api/v1/.../brands', [
        'name' => ['en' => 'Toyota', 'ar' => 'تويوتا'],
        'code' => 'TYT',
    ], ['X-Tenant-Client-Code' => $code])
        ->assertCreated()
        ->assertJsonPath('data.code', 'TYT');
});
```

### Soft-delete reuse regression (mandatory for reusable ids)

```php
it('reuses code after soft delete', function (): void {
    // ... boot tenant + auth as above ...
    $created = $this->postJson($url, ['name' => ['en' => 'A'], 'code' => 'DUP'], $headers)->assertCreated();
    $id = $created->json('data.id');

    $this->putJson("$url/$id", ['name' => ['en' => 'A2'], 'code' => 'DUP'], $headers)->assertOk();   // keep same code
    $this->deleteJson("$url/$id", [], $headers)->assertOk();                                          // soft delete
    $this->postJson($url, ['name' => ['en' => 'B'], 'code' => 'DUP'], $headers)->assertCreated();     // recreate same code
});
```

### Unit test (service, Mockery) — voc-be pattern

```php
<?php

declare(strict_types=1);

use Modules\Vehicle\Repositories\BrandRepository;
use Modules\Vehicle\Services\BrandService;
use Tests\TestCase;

uses(TestCase::class);

it('restores a trashed brand instead of duplicating on store', function (): void {
    $repo  = Mockery::mock(BrandRepository::class);
    $trashed = /* a Brand double that ->trashed() === true */;
    $repo->shouldReceive('getBrandByCodeWithTrashed')->once()->andReturn($trashed);
    $repo->shouldReceive('findAndUpdate')->once();
    $repo->shouldReceive('create')->never();

    (new BrandService($repo))->store($request);   // assert restore path taken
});
```

Rule: **mock I/O (mail, HTTP, DB gateways, repositories); never mock the business rule under test.** Test services/use-case logic first; keep feature tests to HTTP contracts.

## Governance gate (before push / ready-for-review)

1. **Tests cover the change** — feature tests for HTTP contracts + validation branches + regressions; unit tests for services where practical.
2. **`php artisan test`** (+ module/path filter) — all green.
3. **`composer qa`** — coding standard + static analysis (PHPStan, `phpstan.neon`) + tests — exits clean.
4. **Constitution compliance + polish** — thin controllers, shared Form Requests, friendly 404s, transformer discipline, N+1/eager loading, soft-delete uniqueness, `ClientConfig` reads, collection drift. Merge-ready, not just green.

## PR checklist

- Did it reduce complexity somewhere?
- Core logic testable without Laravel (services)?
- Query changes: indexes + N+1 checked?
- Side effects isolated (events/jobs)?
- Mid-level dev understands it in ~2 min?
