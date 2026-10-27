<!--
Sync Impact Report
- Version change: 1.1.6 → 1.1.7
- Modified principles: (none renamed)
- Added sections: XII. Client Configuration Access
- Removed sections: (none)
- Templates: ✅ .specify/templates/plan-template.md (Constitution Check) | ⚠ .specify/templates/spec-template.md (no change needed) | ⚠ .specify/templates/tasks-template.md (no change needed)
- Follow-up TODOs: (none)
-->

# Autoconnect multitenant Constitution

## Core Principles

### I. API Contracts & Validation

- Clear API contracts for all public endpoints (request/response schemas, status codes).
- Request validation via **Laravel Form Requests** only; no ad-hoc validation in controllers.
- Create and update for the same entity SHOULD share a single Form Request by default (for example `UpsertEntityRequest`) when the payload shape is materially the same; split into separate store/update requests only when the validation contract is genuinely different enough to justify separate classes.
- Dedicated `show` Form Requests SHOULD NOT be created by default. Use them only when the show endpoint has meaningful reusable query validation or normalization beyond trivial route params.
- All new work must not break existing public APIs without a **documented migration path**.
- For soft-deletable entities with unique business identifiers (for example `slug`, `code`, `email`, `mobile`), Form Request uniqueness rules MUST ignore soft-deleted rows when the business rule allows reuse after delete.

### II. Layered Architecture

- **Thin controllers**: request → DTO → UseCase → Resource.
- **Business logic only in UseCases/Domain**, never in controllers, models, or helpers.
- **Domain is framework-free**: no Facades, Eloquent, Request/Response, or `config()` inside Domain.
- **Infrastructure behind interfaces** (repositories, mailer, cache, external APIs).

### III. Service Layer & Persistence

- **One responsibility per class** (if it queries + formats + sends → split).
- Eloquent models with **guarded attributes**; schema changes via **migrations** only.
- Use **Service Providers** for bindings; no `app()` calls scattered in core logic.
- For soft-deletable tables that keep database-level unique indexes on reusable business identifiers (for example `slug` or `code`), the stored unique value MUST be released during soft delete so later inserts do not fail at the database layer.
- When old soft-deleted rows must be backfilled to release stale unique values, prefer a temporary explicit command/service executed per client context rather than an automatic migration, unless automatic migration behavior is explicitly required.
- Temporary one-time backfill commands/services created only for deployment or repair MUST be deleted after they are executed in the target environments and are no longer needed.

### IV. Testing (NON-NEGOTIABLE)

- All new work must include **PHPUnit tests**:
    - **Feature tests** for HTTP endpoints and happy-path contracts.
    - **Unit tests** for services/UseCases (fast, no Laravel bootstrap where possible).
- Test **UseCases/Domain** first; minimal feature tests for HTTP contracts only.
- Don’t mock business rules; mock **I/O** (mail, HTTP, DB gateways).

### V. Code Style & Contracts

- `declare(strict_types=1);` in every PHP file we own.
- **Type everything**: params, returns, and properties (no `mixed`/`array` unless in DTOs).
- **No magic arrays across layers** → use **DTOs / Value Objects**.
- **No primitive obsession**: use **Enums / Value Objects** for status, money, ids, etc.
- **Explicit domain exceptions** (never `throw new \Exception()`).
- Every enum used in API-facing workflows or payload contracts MUST have a dedicated read API endpoint that exposes its allowed values in a frontend-friendly shape, so frontend clients do not hardcode enum options.

### VI. Laravel-Specific Discipline

- **No Facades inside core logic** (wrap Mail, Cache, Log in adapters).
- **Events for side effects** (email, notifications, cache invalidation).
- **Client configuration reads** MUST use `App\HelperClasses\ClientConfig` (see **XII. Client Configuration Access**); do not read `config('client')` or `config('client.*')` directly in application code.

### VII. Database & Performance

- **No N+1**: must eager load or redesign query.
- Always consider **indexes** for filter/sort columns (composite order matters).
- Use `select()` intentionally; avoid pulling unused columns.
- For large data: `chunkById()` / `cursor()`; avoid loading big collections.
- Measure with **EXPLAIN / Telescope** before “optimizing”.

### VIII. Reliability & Scaling

- **Idempotency** for critical actions (payments, status transitions, emails).
- Queue jobs must be **safe to retry** (no duplicate side effects).
- Use **transactions** around multi-write operations.
- Cache must have an **invalidation strategy** (events/tags/versioning), not “forever”.

### IX. Readability & Maintainability

- Methods **&lt; 30 lines** (extract or redesign).
- Names read like sentences: `markAsPaid()`, `calculateTotal()`.
- Comments explain **why**, not what.
- Prefer composition over inheritance.

---

## Folder & Module Structure

- We use the **standard Laravel folder structure** (`app/`, `routes/`, `config/`, `database/`, `resources/`, `tests/`, etc.) plus **nwidart/laravel-modules** for feature modules under `Modules/{Name}`.
- Inside each module we use a **Laravel-like structure**, not the full DDD split (Domain/Application/Infrastructure/Presentation/Providers/Tests with all subfolders). For example:
    - `Modules/Order/Http/Controllers`, `Modules/Order/Http/Requests`, `Modules/Order/Models`, `Modules/Order/Services`, `Modules/Order/Routes`, `Modules/Order/Providers`, `Modules/Order/Tests`.
- The detailed per-module structure below **is not required**:
    - `Domain/Entities`, `Domain/ValueObjects`, `Domain/Aggregates`, `Domain/Repositories`, `Domain/Services`, `Domain/Events`, `Domain/Policies`, `Domain/Exceptions`
    - `Application/UseCases`, `Application/DTOs`, `Application/Commands`, `Application/Queries`, `Application/Handlers`, `Application/Mappers`
    - `Infrastructure/Persistence/{Eloquent,Repositories,Migrations}`, `Infrastructure/Mail`, `Infrastructure/Queue`, `Infrastructure/Cache`, `Infrastructure/External`
    - `Presentation/Http/{Controllers,Requests,Resources,Middleware}`, `Presentation/Routes/{api.php,web.php}`
    - `Providers/{ModuleServiceProvider,RouteServiceProvider}`, `Tests/{Unit,Feature}`
- Controllers, Form Requests, services, and other classes can live in the **simpler Laravel-style module folders** or under `app/` (for example `app/Http/Controllers`, `app/Http/Requests`, `app/Services`) as long as they respect the core principles above (thin controllers, no business logic in controllers, tests, no N+1, etc.).

---

## X. CRUD Implementation Standard

All new module CRUDs (Create, Read, Update, Delete and related operations) MUST follow this standard. The Admin and Offer modules are the reference implementation.

### CRUD actions to implement per entity

- **List** (index): paginated list with filters, sort, and optional relation query param.
- **Pagination contract**: every CRUD `index` and read-list endpoint MUST return a paginator-backed response through the shared API response envelope. The top-level `meta` key MUST be a JSON object and MUST include pagination metadata (`current_page`, `per_page`, `from`, `to`, `path`, `links`, and when length-aware, `last_page` and `total`). Returning an unpaginated Eloquent collection from an index/list endpoint is prohibited unless the route is explicitly an `options`/`select` endpoint or a write-action result.
- **Show** (show): single resource by id with optional relations.
- **Create** (store): validate via Form Request, build DTO, run Create use case, return resource.
- **Update** (update): validate via Form Request, build DTO, run Update use case, return resource.
- **Delete** (destroy): run Delete use case; return consistent success message.
- **Options** (options): list suitable for dropdowns/selectors (e.g. id, name/code); used for FK selection. Implement where the entity is referenced as a foreign key elsewhere.
- **Enum catalog endpoints**: every API-facing enum used by the module (statuses, types, rule catalogs, modes, etc.) MUST have a dedicated read endpoint returning selector-friendly values (for example `{ value, label }`, plus metadata where needed).
- **Relation attach/detach** (where applicable): for polymorphic or pivot relation tables (e.g. exterior_colorables, interior_colorables), expose attach and detach (or sync) endpoints only; do not expose generic full CRUD for the relation table.
- **Relation attach semantics**: attach operations on relation tables MUST be idempotent identity-based upserts. Repeating the same relation identity MUST update the existing row instead of creating a duplicate relation row.
- **Relation detach semantics**: detach operations for relation tables MUST be body-based and keyed by the minimal relation identity payload, not by relation table row ids.
- **Soft-delete reuse semantics**: when a CRUD entity is soft deletable and uses reusable unique identifiers such as `slug` or `code`, delete then recreate with the same identifier MUST work at both validation and database levels.
- **Unique reuse regression coverage**: CRUDs with reusable unique identifiers on soft-deletable models MUST include automated tests for create, update while keeping the same identifier, soft delete, and recreate with the same identifier.

### Files to implement per CRUD entity (inside the module)

| Layer                | Path pattern                                                                                                                                                                                                | Purpose                                                                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model                | `Modules/{Module}/app/Models/{Entity}.php`                                                                                                                                                                  | Eloquent model, relations, guarded, casts, translatable if needed, `getMediaCollectionNames()` if media.                                                                                                                                          |
| Repository           | `Modules/{Module}/app/Repositories/{Entity}Repository.php`                                                                                                                                                  | Extend `App\Repositories\BaseRepository`; no module-local base repository.                                                                                                                                                                        |
| Service              | `Modules/{Module}/app/Services/{Entity}Service.php`                                                                                                                                                         |
| Controller           | `Modules/{Module}/app/Http/Controllers/Admin/{Entity}Controller.php`                                                                                                                                        | Thin: request → DTO → use case → resource. Namespace **Admin**, not Api.                                                                                                                                                                          |
| Form Request         | `Modules/{Module}/app/Http/Requests/Admin/Upsert{Entity}Request.php`                                                                                                                                        | Shared validation rules for create/update by default; split only when the contracts are materially different.                                                                                                                                     |
| DTOs                 | `Modules/{Module}/app/DTOs/Create{Entity}DTO.php`, `Update{Entity}DTO.php`, `EntityIdDTO.php` (shared)                                                                                                      | From array / from request; used by use cases.                                                                                                                                                                                                     |
| Use cases            | `Modules/{Module}/app/UseCases/List{Entity}UseCase.php`, `Show{Entity}UseCase.php`, `Create{Entity}UseCase.php`, `Update{Entity}UseCase.php`, `Delete{Entity}UseCase.php`, `List{Entity}OptionsUseCase.php` | One use case per controller action; call service/repository.                                                                                                                                                                                      |
| Resource/Transformer | `Modules/{Module}/app/Transformers/{Entity}Resource.php`                                                                                                                                                    | Explicit field-by-field array; no raw `$model->toArray()`. Use `whenLoaded()` for relations. Do not include `created_at`/`updated_at`/`deleted_at` unless required.                                                                               |
| Filter               | `Modules/{Module}/app/Http/Filters/{Entity}Filter.php` (or module filters)                                                                                                                                  | Extend `App\Http\Filters\BaseFilters`; use only shared helpers (`applyLikeFilter`, `applyExactFilter`, `applyBooleanFilter`, `applyDateFilter`, `applySearch`). No cross-module base filter class. Per-column filter methods in the filter class. |
| Factory              | `Modules/{Module}/database/factories/{Entity}Factory.php`                                                                                                                                                   | For tests and seeders.                                                                                                                                                                                                                            |
| Seeder               | `Modules/{Module}/database/seeders/{Entity}Seeder.php`                                                                                                                                                      | Where applicable; respect relations.                                                                                                                                                                                                              |
| Feature tests        | `Modules/{Module}/Tests/Feature/*`                                                                                                                                                                          | Cover list, show, create, update, delete, options, and relation endpoints; use DB transactions.                                                                                                                                                   |
| Postman              | `docs/postman/{Module}-API.postman_collection.json` + examples                                                                                                                                              | All CRUD + options + relation endpoints; auth and examples aligned with Admin; base_url `http://127.0.0.1:8000/api`.                                                                                                                              |

### Controller flow (mandatory)

- **Request** → **DTO** (from Form Request validated data) → **Use case** (execute) → **Resource** (make/collection).
- No business logic or repository calls in the controller; only delegation to use cases and formatting responses.
- For `index` endpoints, use a Form Request only when the list endpoint validates meaningful filter/query params. Do not create empty or trivial read-only request classes just for symmetry.
- For `show` endpoints, prefer direct route params and a plain `Request` unless there is real query validation or normalization that justifies a dedicated Form Request.

### Routes and permissions

- CRUD routes MUST be registered under the **admin** prefix: e.g. `/api/{Module}/admin/*`.
- Permission names: `{module}.{entity}.{action}` (e.g. `offer.category.show`, `vehicle.model.create`). Action: show, create, edit, delete (or equivalent).
- **super-admin** role MUST receive all registered permissions automatically in seeders (no manual subset in storage/permissions.json).

### Shared infrastructure (do not duplicate in module)

- **Repository base**: Use `App\Repositories\BaseRepository`; repositories extend it and pass the model. Use `findOneOrFail` for single-record fetch.
- **Filters**: Use `App\Http\Filters\BaseFilters` and its helpers only; each module defines its own filter classes with per-column methods.
- **Media**: Use `App\Helpers\MediaHelper` and `App\Actions\Media\AttachMediaCommand`. In services: strip media keys from payload before create/update, then call media attach (e.g. `extractMediaPayload` / `attachMediaIfNeeded` pattern). Models that support uploads declare `getMediaCollectionNames()`; request file keys match collection names.

### Resource and relation output

- Resources MUST return explicit arrays; no passthrough of `$model->toArray()`.
- Resource classes MUST follow the VehicleResource implementation style as the normative reference (for example `Modules\Vehicle\Transformers\API\VehicleResource.php`).
- Resource field access MUST use normal direct resource access (`$this->field`, `$this->relation`, `$this->getTranslations(...)`, `$this->translatedOrOriginal(...)`) rather than assigning `$model = $this->resource` for straightforward field mapping.
- Resource classes SHOULD declare an appropriate model hint such as `/** @mixin ModelClass */` when needed for static analysis so the direct `$this->...` style remains PHPStan-safe.
- Local `$model = $this->resource` variables are allowed only when they are materially necessary for complex branching, polymorphic resolution, or static-analysis constraints that cannot be handled cleanly with the normal direct-access style.
- Relation loading MUST support both direct relation names and typed aliases (e.g. `zones`, `buildings`) and eager-load underlying morph targets when requested.
- Resources MUST include only the required business fields and loaded relations; they MUST NOT include `created_at`, `updated_at`, or `deleted_at` unless explicitly required by the contract.
- For entities with translatable fields, there MUST be exactly two resource variants per model, under `Transformers/Admin` and `Transformers/User` (or equivalent Admin/User folders). Admin resources expose full translation maps for translatable fields (e.g. `$this->getTranslations('name')`), while User resources expose locale-resolved values for the current/selected locale. Any shared base logic MUST live in a single reusable base resource consumed by both variants; no third root-level resource variant is allowed.
- For **fixed known relations**, resources MUST call explicit nested resource classes directly in `whenLoaded()` (for example `CityResource::make($this->city)` or `VehicleResource::collection($this->vehicle)`). Admin resources MUST compose Admin resources, and User resources MUST compose User resources. Shared generic resource-resolution helpers are allowed only for truly polymorphic targets (for example `parentable`, `childable`, `exteriorColorable`, `interiorColorable`).

### Translatable and locale

- Translatable columns MUST be declared on models (e.g. Spatie `HasTranslations`, `$translatable`, casts). Locale-aware filtering MUST support app locales (and fallback e.g. en, ar). Postman examples for translatable fields MUST include examples for each locale (e.g. en and ar).

### Error handling

- Missing-model (404) responses MUST return friendly messages (e.g. "vehicle not found", "exterior_color not found"), not Laravel default "No query results for model [...]".

### QA gate

- Before considering a CRUD feature complete: satisfy the **Governance** pre-push gate below (tests, **`composer qa`**, constitution compliance, and polish). Postman/collection updates MUST stay aligned per this section’s standards when APIs change.

### Postman collections standard

All modules that expose HTTP APIs MUST ship and maintain Postman collections that follow these rules. The Admin and CoreStructure/Geo/LocationMasterPlans collections are the reference.

- **Collections and location**
    - Collections MUST live under `docs/postman`.
    - There MUST be one **main project collection** (e.g. `AutoConnect.postman_collection.json`) that includes folders/requests for all modules.
    - Each module exposing APIs MUST have its own module collection (e.g. `Admin-API.postman_collection.json`, `{Module}-API.postman_collection.json`) referenced from the main collection.
- **Coverage**
    - Every CRUD, options/select, attach/detach, and relation-aware endpoint MUST have a working request entry.
    - Every enum catalog endpoint MUST have a working request entry.
    - For id-based endpoints (e.g. `/entity/{id}` or `/relations/{id}`), examples MUST exist at minimum for:
        - Success (`200`/`201` as appropriate),
        - Validation failure (`422` where applicable),
        - Not found (`404`), with friendly `<Entity> not found` messages matching the API.
- **Requests & examples**
    - Example requests MUST use real route paths and correct `originalRequest` metadata so Postman can open examples; no blank or placeholder routes.
    - Example response bodies MUST reflect the actual resource/transformer output for that endpoint, not generic placeholders.
    - Filter examples MUST demonstrate all filterable columns for each model.
    - Relation query examples MUST use comma-separated relation values in the `relations` (or equivalent) query param, not URL-encoded comma text.
- **Base URL and variables**
    - All URLs MUST use a collection variable `url` with value `http://127.0.0.1:8000/api`.
    - Route paths MUST NOT duplicate `/api` inside the path segments.
    - Collection-level variables and scripts MUST align with the Admin collection pattern, including:
        - `url`,
        - client header variables such as `X_Client_Domain`, `X_Client_Code`,
        - a prerequest script adding `Accept: application/json` and optional client headers.
- **Authentication**
    - Auth-bearing requests MUST inherit auth from parent.
- **Media**
    - Store and update requests that may upload media MUST use **form-data** bodies, not raw JSON.
    - Update-with-media examples SHOULD use `POST` with `_method=put` where multipart semantics are required, matching Laravel handling.
    - Media request bodies MUST expose all supported media collection keys as upload fields, matching model media collection names.
- **Relation requests**
    - Relation detach requests MUST use the implemented body-based identity payloads, not relation table row ids.
    - Relation attach examples MUST reflect final idempotent upsert semantics rather than duplicate-row creation.
- **Translatable**
    - For translatable fields, create/update examples MUST include payload keys for each supported locale (at minimum `en` and `ar`), aligned with the module’s locale-aware filtering behaviour.
- **Drift control**
    - After any API or payload change, Postman collections and their examples MUST be updated so they remain aligned with the implemented endpoints and final API envelopes.

---

## PR Standard (Checklist)

Before merge, verify:

- Did this PR **reduce complexity** somewhere?
- Is **core logic testable without Laravel** (at least UseCases/Domain)?
- Any query changes: **indexes + N+1** checked?
- Are **side effects isolated** (events/jobs)?
- Would a mid-level developer understand it in **~2 minutes**?

---

## Governance

- This constitution guides all specification, planning, and implementation.
- PRs and reviews must verify compliance with these principles.
- Amendments require documentation and an explicit migration plan where behavior or structure changes.

### Mandatory gate before pushing any feature implementation

Before a branch or commits that deliver **new or changed product behavior** are pushed (or marked ready for review), the implementer MUST complete the following and resolve every failure before the work is considered done:

1. **Test coverage for the change** — Automated tests MUST cover the new or modified code, logic, and user-visible behavior (HTTP contracts, validation branches, jobs, filters, and regressions as appropriate). Align with **IV. Testing** (feature tests for endpoints; unit tests for services/use cases where practical).
2. **Run tests** — Execute the relevant test scope locally (for example **`php artisan test`** plus any module or path filters for touched code) and confirm **all tests pass**.
3. **Run `composer qa` and fix errors** — Run **`composer qa`** (project coding standard, static analysis, and the test script defined in `composer.json`) and fix every reported issue until it exits cleanly.
4. **Constitution compliance and final polish** — Re-read affected areas against this document (thin controllers, Form Requests, friendly 404s, resources, N+1, soft-delete uniqueness rules where relevant, collection drift rules for API changes, client config reads via `ClientConfig` per **XII**, etc.) and apply final polish so the change is merge-ready, not only “green locally.”

---

## XI. Public Read APIs & Documentation Consistency

### Public read API contract (non-auth entities)

- For non-authenticatable entities, public read endpoints MUST expose `index`, `show`, and `options` under the module API prefix (for example `/api/{module}/...`), not admin prefixes.
- Public read controllers MUST live under `Http/Controllers/API` unless a different namespace is explicitly required and documented.
- Do not create parallel `User` controller trees for public APIs by default when API controllers are the intended contract.

### Postman/Hoppscotch drift control

- Any API contract or payload change MUST update:
    - module Postman collection,
    - module Hoppscotch collection,
    - combined/root Postman and Hoppscotch collections.
- Combined/root collections MUST remain content-synchronized with module collections (not just folder names).

### Collection encoding and integrity

- API collection files MUST be valid UTF-8 JSON and parse successfully after edits.
- Collections MUST NOT include corrupted Arabic placeholders (for example `????`) or mojibake/garbled encoded Arabic.

### Hoppscotch collection variables policy

- Hoppscotch collection files MUST NOT include top-level collection `variable` blocks unless explicitly approved by project policy.
- Environment-specific values for Hoppscotch SHOULD be provided through environment configuration rather than embedded collection variables.

---

## XII. Client Configuration Access

This project resolves one active tenant client per request (the `config('client')` array). All **reads** of that resolved client configuration in application code MUST go through `App\HelperClasses\ClientConfig` (`app/HelperClasses/ClientConfig.php`), not direct `config('client')` or `config('client.*')` calls.

### Required access pattern

- Resolve `ClientConfig` via **constructor injection** or `app(ClientConfig::class)`.
- Prefer the class’s **typed accessor methods** over ad-hoc array keys. Examples:
    - Client code: `getCode()` (see `ClientConfig::getCode()` around line 218).
    - General info: `getName()`, `getSupportedLocales()`, `getDefaultLocale()`, `getTimezone()`, `getCurrency()`.
    - Feature settings: `getSettingValue()`, `getSettingConfig()`, `isFeatureEnabled()`.
    - Environment-scoped values: `getEnvironmentConfig()`, `getDatabaseConfig()`, `getMailConfig()`, `getWebsiteUrl()`, and related payment/CRM/integration helpers on the same class.
- When adding a new commonly used client field, add or extend an accessor on `ClientConfig` rather than spreading new `config('client...')` reads across the codebase.

### Allowed exceptions (not application reads)

- Inside `ClientConfig` itself and in bootstrap code that **sets** client context (middleware, service providers, `setClientByDomain`, `config(['client' => ...])`).
- Cross-tenant registry operations: `ClientConfig::loadAllClients()` and `ClientConfig::clearClientCache()`.
- Automated tests MAY bind or mock `ClientConfig` in the container.

### Rationale

A single accessor layer keeps multitenant config shape consistent, avoids typo-prone dotted keys, and makes refactors to `clients.json` / client resolution safer across modules.

**Version**: 1.1.7 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-05-21 (XII: client configuration access via `ClientConfig`)
