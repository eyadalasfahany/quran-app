# Phase 0 — Setup and foundations

Spec §15. Exit criterion: the app runs on a phone, an iPad and a foldable emulator with the window-class switch working.

Each step is one reviewable change. After each step the checks below run and their real output is shown; the developer reviews and commits before the next step starts. A check that can't run yet is reported as N/A, never as passed.

## Decisions (27 Oct 2026)

| Topic | Decision | Record |
| --- | --- | --- |
| Toolchain | PHP 8.5.12 from Homebrew (`php`, linked globally) and Node 26.12.1 through nvm, both local | ADR 0003 |
| Local web server | `php artisan serve` on port 8000; no Caddy until staging | ADR 0003 |
| Redis client | `predis/predis`; no `phpredis` extension | content plan |
| Health route | `GET /api/v1/health` in `Domains/Sync`, added to spec §9 | ADR 0001 |
| Laravel standards | `laravel-standards` skill adopted; spec wins on envelope, pagination, collections, test DB | ADR 0002 |
| Contract tools | `dedoc/scramble` 0.13.51, `openapi-typescript` 7.13.0 | content plan |
| Design | Tokens and UI components pulled from the Figma file; the HTML design system is a cross-check | spec §1 |
| Bundle ID | Placeholder `com.example.quran` (`.dev`, `.preview` variants) until the real one is chosen | spec §13 |
| Git | The developer commits and pushes; Claude doesn't commit | — |

Host ports (MAMP-style services already use 3306 and 8080): MySQL 33306, Redis 16379, Mailpit 18025 (SMTP 11025), API 8000.

## Steps

### 0. Toolchain — done

- `brew upgrade php` → 8.5.12, linked as `php`; `nvm install 26` → v26.12.1.
- Done early: IBM Plex Sans Arabic copied to `apps/mobile/assets/fonts/IBMPlexSansArabic/` with its OFL licence; root `.gitignore` written.
- Open: delete the root `IBM-Plex-Sans-Arabic/` copy (`git rm -r`) once the app copy is committed.

### 1. Monorepo skeleton

- Creates:
  - Root `package.json` with workspaces `apps/mobile` and `packages/*`, plus `engines.node` and `.nvmrc` (26).
  - `packages/api-contract`, `packages/design-tokens`, `packages/quran-text-check`, each with a `package.json` named `@quran/*`, a `tsconfig` and a stub `src/index.ts`.
  - The `quran-text-check` stub throws "not implemented (Phase 1)", so it can never report a pass.
  - `renovate.json`: weekly grouped PRs for npm and Composer; patch and minor auto-merge; majors and Expo-pinned packages merged by hand.
  - `.easignore` (excludes `apps/api`, `infra`).
- Verify: `npm install` writes the lockfile, `npm ls --workspaces`, `npx renovate-config-validator`. App checks are N/A.

### 2. Laravel 13 skeleton

- Creates:
  - `composer create-project laravel/laravel` in the scratchpad, moved into `apps/api`, keeping `apps/api/CLAUDE.md`.
  - Sanctum (`install:api`), Horizon, Pulse, `spatie/laravel-data`, `predis/predis`.
  - Pest 5 replacing PHPUnit examples, Larastan level 8 (`phpstan.neon`), Pint (Laravel preset).
  - `composer qa` script.
  - `.env.example` pointing at the compose services and port 8000; `.env` stays out of git.
- Verify: `composer qa`, `php artisan migrate` against compose MySQL, `curl localhost:8000/up`.

### 3. Domains and the Sync example

- Creates:
  - The §3 tree: `Domains/*`, `Integrations/*`, `Support/` (`.gitkeep` where empty).
  - `Support/Repositories` Eloquent base class.
  - A minimal RFC 9457 renderer so errors under `/api/v1` return problem details.
  - In `Domains/Sync`:
    - `SyncServiceProvider`: binds the contract and registers `/api/v1` routes.
    - Repository contract plus Eloquent implementation; the database check goes through the `users` table.
    - `HealthService`.
    - Thin `HealthController`.
    - `HealthData`.
  - Health behaviour: 503 when a check fails; `Cache-Control: no-store`.
  - Tests:
    - `arch()`: controllers don't use models; services don't use `Illuminate\Http`; `Integrations` never import `Domains`; PHP preset.
    - Feature test for `/api/v1/health` (200, payload, headers) and for a 404 as problem details.
    - Mockery unit test for `HealthService`.
- Verify: `composer qa`.

### 4. Docker Compose

- Creates `infra/docker-compose.yml`:
  - `mysql:9.7`, `redis:8.10` and Mailpit, with healthchecks.
  - An `app` service (PHP 8.5 image running `artisan serve`) for anyone who prefers the container.
  - `horizon` and `scheduler`, both from the same image.
- Verify: `docker compose config`; all services healthy; `php artisan horizon:status`; scheduler logs a tick; `curl localhost:8000/api/v1/health` returns 200 with both checks true.

### 5. Expo SDK 58 app

- Creates:
  - SDK 58 template moved into `apps/mobile` (keeping `CLAUDE.md` and `assets/fonts`).
  - `app.config.ts` with `APP_VARIANT` → `com.example.quran.dev`, `com.example.quran.preview`, `com.example.quran`.
  - `orientation: "default"`, `ios.supportsTablet`, all four iPad orientations, `supportsRTL`.
  - `eas.json` with development, preview and production profiles.
  - The §4 folder layout, ESLint, and Jest (jest-expo + Testing Library, transforming `@quran/*`).
- Packages: every Expo-managed package via `npx expo install`. `ios/` and `android/` are generated and ignored.
- Verify: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.

### 6. Design tokens from Figma

- Creates:
  - `@quran/design-tokens` built from Figma variables and text styles: colors for light, sepia and dark (aliases resolved), spacing, radii, glass and shadow, type scale.
  - `src/core/theme` reading them.
  - IBM Plex Sans Arabic weights the design uses, loaded with `expo-font`.
  - Only the components the nav shell needs (tab and sidebar items) go into `src/shared/ui`; the rest arrive with the phase that uses them.
- Verify: every theme has the same keys; values cross-checked against `quran-app-design-system.html`; any disagreement is raised, not resolved silently. Mobile checks.

### 7. i18n and RTL

- Creates:
  - `src/core/i18n` with `ar.json` and `en.json`, i18next, `expo-localization` detection; Arabic is the default.
  - Language saved in MMKV.
  - Switching calls `I18nManager.forceRTL` then `Updates.reloadAsync` (`DevSettings.reload` in dev).
  - MMKV needs a dev build, so Expo Go is not used.
- Verify: the two string files have identical keys; RTL switch unit test. Mobile checks.

### 8. Adaptive nav shell

- Creates:
  - `useWindowClass`: compact under 600, medium 600–839, expanded 840 and up, with ±16 hysteresis.
  - `ContentColumn`.
  - `(main)/_layout.tsx`: Expo Router native tabs on compact and medium, sidebar on expanded.
  - Placeholder Home, Mushaf, Listen and My Quran screens, with every string from i18n.
- Verify:
  - Jest at the boundaries: 583, 584, 599, 616, 823, 824, 856.
  - Router test: switching tabs and sidebar keeps the active tab.
  - Mobile checks.

### 9. Contract flow

- Creates:
  - Scramble limited to `api/v1`.
  - Export to `packages/api-contract/openapi.json`.
  - `openapi-typescript` → `packages/api-contract/src/schema.d.ts` and an exported `HealthResponse` type.
  - `apps/mobile/src/core/api/health.ts` typed from it, with a test.
- Verify:
  - Regenerate, then `git diff --exit-code`.
  - Change a field on purpose to confirm `tsc` fails, then revert.
  - API and mobile checks.

### 10. CI

- Creates:
  - `.github/workflows/api.yml`:
    - Paths: `apps/api/**`, `packages/api-contract/**`.
    - PHP 8.5 with MySQL 9.7 and Redis 8.10 services.
    - Runs `composer qa` and `composer audit`.
  - `mobile.yml`:
    - Paths: `apps/mobile/**`, `packages/**`.
    - Node 26.
    - Runs lint, `tsc`, Jest, `expo-doctor` and `npm audit --audit-level=high`.
  - `contract.yml`:
    - Paths: `apps/api/**`, `apps/mobile/**`, `packages/api-contract/**`.
    - Regenerates OpenAPI and TS types and fails on drift.
- Left out until they can work: staging deploy, EAS build and submit, `release-api.yml`.
- Verify: `actionlint` locally; a real run after the developer pushes.

### 11. Exit check

- Claude runs:
  - `expo run:ios` on an iPhone and an iPad simulator.
  - `expo run:android` on a Pixel Fold emulator.
  - Screenshots of compact and expanded windows in Arabic and English.
- The developer checks by hand: iPad Split View and Stage Manager live resize, fold and unfold.

## Not in Phase 0

Sentry, Filament, `config/quran.php`, Caddy and PHP-FPM images, staging, any schema beyond Laravel's, Sanctum's and Pulse's tables. QF prelive keys and the questions to QF are the developer's.
