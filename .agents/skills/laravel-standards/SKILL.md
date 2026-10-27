---
name: laravel-standards
description: Use when implementing, reviewing, or modifying any CRUD, controller, Form Request, service, repository, resource/transformer, filter, migration, route, enum, or API endpoint in a Laravel project; also when writing PHPUnit/Pest feature or unit tests, handling soft-delete unique reuse (slug/code), building options/enum catalog endpoints, or wiring multitenant per-request client config.
---

# Laravel Standards

## Overview

Engineering standards for any Laravel project: layered architecture, CRUD discipline, validation, resources, testing. Derived from a shared `constitution.md` (bundled: [autoconnect-constitution.md](autoconnect-constitution.md)) and proven in real codebases.

**Reference implementations** (read these for exact shape): `autoconnect-apis` is the mature CRUD/architecture reference; `voc-be` is the test-quality reference. Paths under `/Applications/MAMP/htdocs/`.

**Core flow — universal, every project:**

```
Request (Form Request) → thin Controller → Service → Repository → Resource/Transformer
```

Business logic lives in **services**. Controllers only delegate + format. Repositories own persistence. Resources own output shape.

> **Do not** introduce `DTO → UseCase` layers unless the module you're editing already uses them. The constitution prescribes them; real code does not. Match the module.

## The layers

1. **Controller** (`Http/Controllers/`): thin. Constructor-inject the service. Each action calls the service and returns a resource (via the project's response convention). No business logic, no repo calls, no `validated()` parsing beyond passing the request.
2. **Form Request** (`Http/Requests/`): all validation. One shared `{Entity}Request` for store+update by default; split only when contracts genuinely differ. Route-param-aware unique rules.
3. **Service** (`Services/`): all logic — `$request->validated()`, transactions, friendly 404, soft-delete restore, side-effect dispatch.
4. **Repository** (`Repositories/`): extends the project base repository; entity-specific queries. `findOneOrFail`-style single fetch.
5. **Resource/Transformer**: explicit field-by-field output.

## File checklist per entity

| Layer | Path (modular nwidart shown; adapt to `app/` for non-modular) |
|---|---|
| Model | `Modules/{M}/app/Models/{Entity}.php` |
| Repository | `Modules/{M}/app/Repositories/{Entity}Repository.php` |
| Service | `Modules/{M}/app/Services/{Entity}Service.php` |
| Controller | `Modules/{M}/app/Http/Controllers/{Entity}Controller.php` (`Admin/` for admin APIs) |
| Form Request | `Modules/{M}/app/Http/Requests/{Entity}Request.php` |
| Resource | `Modules/{M}/app/Transformers/{Entity}Resource.php` (+ `Admin/` & `User/` variants if translatable) |
| Filter | `Modules/{M}/app/Http/Filters/{Entity}Filter.php` |
| Factory | `Modules/{M}/database/factories/{Entity}Factory.php` |
| Migration | `Modules/{M}/database/migrations/*` |
| Tests | `Modules/{M}/tests/Feature/*`, `Modules/{M}/tests/Unit/*` |

Non-modular project: `app/Models`, `app/Http/Controllers`, `app/Services`, `app/Repositories`, `app/Http/Resources`, `app/Http/Requests`, `tests/Feature`, `tests/Unit`.

## Hard rules

| Rule | How |
|---|---|
| **strict_types** | `declare(strict_types=1);` in every PHP file you own |
| **Type everything** | Params, returns, properties typed. No `mixed`/loose `array` across layers |
| **Validation = Form Requests** | Never validate ad-hoc in controllers |
| **Thin controllers** | No business logic / repo calls / `if` branching on data |
| **Friendly 404** | `throw new ModelNotFoundException(__('{Entity} not found'));` — never Laravel's "No query results for model [...]" |
| **Explicit resources** | Field-by-field array; `getTranslations('x')` for translatable; `whenLoaded('rel', ...)` for relations. Never `$model->toArray()` |
| **No timestamps in resources** | No `created_at`/`updated_at`/`deleted_at` unless the contract requires |
| **Pagination** | **Admin `index`/list endpoints (authed admin panel, ~90% of pagination) MUST return a paginator** (`per_page`, default 15). Return the paginator from the service; the response envelope/decorator fills `meta` — never paginate by hand in the controller. Plain unpaginated collection only for `options`/select (and typically public/user read lists) |
| **Soft-delete unique reuse** | Form Request unique rule ignores trashed (`...,deleted_at,NULL`) AND service looks up `withTrashed()` by the unique key and `restore()`s instead of duplicating |
| **Options endpoint** | Entities used as FK elsewhere expose a lightweight id/name/code list (unpaginated allowed) |
| **Enum catalog endpoint** | Every API-facing enum gets a read endpoint returning `{ value, label }` so the frontend never hardcodes options |
| **Enums / Value Objects** | Use for status/money/ids — no primitive obsession. Explicit domain exceptions, never `throw new \Exception()` |
| **No N+1 — always eager load** | Any relation a resource/loop touches MUST be eager-loaded (`with(...)` / `load(...)`) in the service or repository before render. Inspect every new query for N+1; never lazy-load inside a loop. Resources gate relations with `whenLoaded()` (so the controller controls loading via `relations` query param). Index filter/sort columns |
| **Transactions** | Wrap multi-write operations in `DB::transaction()` |
| **Relation attach/detach** | Pivot/morph tables expose attach (idempotent identity upsert) + detach (body-based identity payload, NOT row id) only — no full CRUD |

## Reference example (real, trimmed — autoconnect Vehicle/Warranty)

```php
// Controller — THIN. (setData()->customResponse() is autoconnect's envelope; use your project's.)
class WarrantyController extends Controller
{
    public function __construct(protected WarrantyService $service) {}

    public function index()
    {
        return $this->setData(WarrantyResource::collection($this->service->getAllForAdmin()))->customResponse();
    }
    public function store(WarrantyRequest $request)
    {
        return $this->setData(WarrantyResource::make($this->service->store($request)))->customResponse();
    }
    public function show($id)
    {
        return $this->setData(WarrantyResource::make($this->service->getById($id, ['vehicleModels'])))->customResponse();
    }
    public function update(WarrantyRequest $request, $id)
    {
        return $this->setData(WarrantyResource::make($this->service->update($request, $id)))->customResponse();
    }
    public function destroy($id)
    {
        return $this->setData($this->service->delete($id))->customResponse();
    }
}
```

```php
// Form Request — shared store/update; unique ignores soft-deleted
public function rules(): array
{
    $id = $this->route('warranty');
    return [
        'code' => ['required','string','max:50',
            $id ? "unique:warranties,code,$id,id,deleted_at,NULL"
                : 'unique:warranties,code,NULL,id,deleted_at,NULL'],
        'title'    => 'required|array',
        'title.en' => 'required|string|max:255',
        'title.ar' => 'nullable|string|max:255',
    ];
}
```

```php
// Service — restores trashed instead of duplicating; friendly 404
public function store($request)
{
    $validated = $request->validated();
    $existing  = $this->repository->getWarrantyByCodeWithTrashed($validated['code']);
    if ($existing && $existing->trashed()) {
        $existing->restore();
        return DB::transaction(fn () => $this->repository->findAndUpdate($existing->id, $validated));
    }
    return DB::transaction(fn () => $this->repository->create($validated));
}

public function getById($id, $relations = [])
{
    $entity = $this->repository->findOne($id, $relations);
    if (!$entity) {
        throw new ModelNotFoundException(__('Warranty not found'));
    }
    return $entity;
}
```

```php
// Resource — explicit fields, no timestamps
public function toArray(Request $request): array
{
    return [
        'id'         => $this->id,
        'code'       => $this->code,
        'title'      => $this->getTranslations('title'),
        'is_default' => $this->is_default,
        'vehicle_models' => $this->whenLoaded('vehicleModels',
            fn () => VehicleModelResource::collection($this->vehicleModels)),
    ];
}
```

## Translatable entities

Preferred: two resource variants — `Admin/{Entity}Resource` exposes full translation maps (`getTranslations('name')`); `User/{Entity}Resource` exposes locale-resolved values. Shared logic in one base resource; Admin composes Admin, User composes User.

**But match the module you're editing.** The split is partially adopted — newer entities use it; much of the autoconnect Vehicle module still uses flat `Transformers/{Entity}Resource`. Follow the existing convention of the module; use the split when starting fresh.

## Testing (NON-NEGOTIABLE)

Every change ships tests. Model them on the **voc-be** suite (Pest functional style; Mockery for unit isolation).

- **Feature** (HTTP contracts): `it('...', function () {...})`; boot context + auth, hit the endpoint, assert status + DB/JSON.
- **Unit** (services): build the service with `Mockery::mock()`ed repositories/gateways. **Mock I/O (mail, HTTP, DB gateways) — never the business rule under test.**
- **Mandatory regression** for soft-delete reusable ids: create → update keeping id → soft delete → recreate same id (passes at validation AND DB level).
- `declare(strict_types=1);` in test files. Test services first; keep feature tests to contracts.

Full feature + unit templates → **reference.md**.

## Multitenant (only if the project is multitenant)

Some projects (autoconnect-apis) resolve one active client per request. If so:

- **All reads** of resolved client config go through `App\HelperClasses\ClientConfig` (constructor-inject or `app(ClientConfig::class)`) + typed accessors (`getCode()`, `getDefaultLocale()`, …). **Never** `config('client')` / `config('client.*')` in application code.
- Wiring: `ClientConfig` bound singleton in `AppServiceProvider`; a `ClientConfigServiceProvider::boot()` resolves the client (by domain/code/env), caches it, and sets `config(['client' => ...])` from `storage/clients.json`. Setup detail + accessor list → **reference.md**.

Non-multitenant project: ignore this section entirely; standard `config()` is fine.

## Red flags — STOP

- `validated()`, repo calls, or business `if` in a controller → move to service
- Separate `StoreXRequest` + `UpdateXRequest` for identical payload → one shared `{Entity}Request`
- Adding `DTO`/`UseCase` because the constitution says so → not used; match the module
- `config('client.xxx')` in app code (multitenant project) → use `ClientConfig`
- Unique rule missing `deleted_at,NULL` on a soft-deletable reusable id → breaks delete-then-recreate
- `created_at`/`updated_at` leaking into a resource
- Raw unpaginated collection from `index`
- Accessing `$model->relation` in a resource or loop without eager-loading it first (N+1) → `with()`/`load()` in the service/repo
- Adding/touching a query without checking it for N+1 / missing index
- Shipping without tests, or mocking the business rule under test
- API change without updating Postman/Hoppscotch collections (see reference.md)

## Before "done" (governance gate)

Run the test suite (`php artisan test` + path filter) and the project QA script (e.g. **`composer qa`** — Pint/PHPStan/tests); fix everything. Re-read the change against these rules. Update API collections on any endpoint change. Full governance/Postman/enum/relation/multitenant detail → **reference.md**.
