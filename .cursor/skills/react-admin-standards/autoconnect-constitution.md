<!--
Sync Impact Report
==================
Version change: 1.0.2 → 2.0.0 (MAJOR)
Rationale: Clean baseline ratification for repo-derived governance. Supersedes any
  prior constitution drafts (e.g. alternate UI/state/i18n stacks) that did not match
  this repository; obligations below are the single source of truth.

Principles (current set):
  I.   Type-Safe React SPA
  II.  Domain-Modular Architecture
  III. Single HTTP Gateway
  IV.  Internationalization & Bidirectional Layout
  V.   Centralized State Management
  VI.  Styling & UI Stack Cohesion
  VII. Quality Gates: Build, Test, Format

Templates verified aligned (.specify/templates/):
  - constitution-template.md ✅
  - plan-template.md         ✅
  - spec-template.md         ✅
  - tasks-template.md        ✅
  - checklist-template.md    ✅

Follow-up TODOs: none
-->

# autoconnect-admin Constitution

## Core Principles

### I. Type-Safe React SPA

The application is a React 18 single-page app compiled with TypeScript ~5.6 and Vite 6. Type safety is the primary static gate before container images ship.

- **MUST** keep `strict: true` and the `include: ["src"]` contract in `tsconfig.app.json`, and preserve the solution layout in `tsconfig.json` (project references to `tsconfig.app.json` / `tsconfig.node.json`). Widening compiler options or blanket `any` requires a justified exception in the feature plan’s **Complexity Tracking** table (see Governance).
- **MUST** keep the production build command in `package.json` intact: `tsc --noEmit -p tsconfig.app.json && vite build`. Pull requests that fail this step must not merge.
- **MUST** keep `jsx: "react-jsx"` and place all application source under `src/` as enforced by `tsconfig.app.json`.
- **SHOULD** place reusable cross-cutting types under `src/types/` instead of duplicating interfaces across modules.
- **SHOULD** read runtime configuration through `import.meta.env` using prefixes declared in `vite.config.ts` (`envPrefix: ['VITE_', 'REACT_APP_']`). Do not embed environment-specific URLs or secrets in source.

**Rationale**: GitHub Actions (`.github/workflows/cicd.yml`) builds Docker images and deploys with Helm; the workflow shown does not run `npm test`. The TypeScript pass inside `npm run build` is therefore the shared static gate before code reaches ECR/EKS.

### II. Domain-Modular Architecture

Domains live under `src/modules/<domain>/`; routing and shell composition live under `src/app/`. Shared cross-cutting code sits in top-level `src/` folders (`API/`, `components/`, `config/`, `hooks/`, `store/`, `styles/`, `types/`, `utils/`, `assets/`).

- **MUST** add new domain behavior under `src/modules/<domain>/` using the existing shape (`components/`, `API/`, `store/`, `styles/`, `types/`, etc., as present for that domain).
- **MUST** register new screens by adding page components under `src/app/pages/` and wiring routes in `src/app/App.tsx` (`react-router-dom`). The router graph stays centralized; modules must not create parallel routers.
- **MUST** keep cross-domain imports out of `src/modules/*` internals (modules today compose via shared layers and relative imports that stay within a domain). Pages may compose multiple modules explicitly (see existing pages importing several module entry components).
- **SHOULD** register new global Redux slices in `src/store/redux/store.ts` via `@reduxjs/toolkit` `configureStore`, following `src/modules/auth/store/redux/authData.ts` and `src/modules/findDeal/store/redux` registration patterns.
- **SHOULD** place reusable, non-domain-specific UI in `src/components/` (dashboard primitives under `src/components/dashboard/ui/`) before copying markup into a module.

**Rationale**: The tree under `src/modules/` already mirrors business areas (banks, orders, vehicles, etc.). Preserving that boundary keeps ownership clear and limits the size of `src/app/App.tsx` changes to routing glue.

### III. Single HTTP Gateway

All JSON HTTP calls go through the shared Axios instance so auth, preview, market headers, and language headers stay consistent.

- **MUST** use `axiosInstance` exported from `src/config/axiosConfig.ts` for backend requests. Base URLs and file URLs **MUST** come from `src/config/APIs.ts` (`import.meta.env.REACT_APP_API_URL`, `REACT_APP_API_FILE_URL`, `REACT_APP_X_CLIENT_DOMAIN`).
- **MUST** respect the interceptors already defined in `axiosConfig.ts` (Bearer token and `X-Client-Code` from `js-cookie`, optional `X-Client-Domain`, `Accept-Language` from `i18next`, preview query handling). Do not fork that logic at call sites.
- **MUST NOT** add a second HTTP client (`fetch` wrappers, another `axios.create`, `ky`, etc.) without a **Complexity Tracking** entry in the feature plan.
- **SHOULD** colocate REST helpers under `src/modules/<domain>/API/` or `src/API/` (top-level API folder exists) and pair reads/writes with `@tanstack/react-query` where caching or invalidation is needed.
- **SHOULD** use the existing `pusher-js` + `laravel-echo` stack for realtime events instead of ad-hoc WebSocket clients.

**Rationale**: `Dockerfile` and `.github/workflows/cicd.yml` inject `REACT_APP_*` values at image build time. A single gateway guarantees those environment-driven behaviors remain predictable for both tenant matrices (autoconnect + hyundai).

### IV. Internationalization & Bidirectional Layout

The admin supports English and Arabic with LTR/RTL layouts.

- **MUST** route user-visible copy through `react-i18next` (`useTranslation`, `t`, or `i18next.t` where already used). Source strings belong in `src/assets/locale/en/translation.json` and `src/assets/locale/ar/translation.json`.
- **MUST** initialize i18n exclusively through `src/config/i18n.ts` (imported from `src/index.tsx`) using `i18next-browser-languagedetector` and the resource map defined there.
- **MUST** keep global directional styling coherent: `src/app/App.tsx` imports both `src/styles/app.scss` and `src/styles/app-rtl.scss`; structural RTL differences **MUST** be expressed in those stylesheets (or module SCSS imported through the existing graph), not one-off magic numbers in JSX.
- **SHOULD** add new keys to **both** locale JSON files in the same change set.
- **SHOULD** prefer logical CSS directions (`margin-inline`, `padding-inline`, `inset-inline`, flex `row-reverse` only when justified) over hard-coded physical `left`/`right` pairs when authoring new layout rules.

**Rationale**: `index.html` advertises bilingual product context; breaking i18n or RTL erodes trust for MEA operators. Centralized resources plus paired SCSS entry points are the mechanisms already in place.

### V. Centralized State Management

Global client state uses Redux Toolkit; server-derived data uses TanStack Query; authentication uses React context.

- **MUST** keep the provider order in `src/app/Providers.tsx`: Redux `Provider` (`react-redux`) wrapping `QueryClientProvider` (`@tanstack/react-query`) wrapping `AuthProvider` (`src/store/context/authContext.tsx`).
- **MUST** register Redux reducers in `src/store/redux/store.ts` (`configureStore` from `@reduxjs/toolkit`) and type exports (`RootState`, `AppDispatch`) from that module.
- **MUST** preserve the `QueryClient` defaults already defined in `Providers.tsx` (e.g., `staleTime`) when adjusting behavior—document intentional behavioral changes in PR descriptions.
- **SHOULD** model remote data with `useQuery` / `useMutation` / `useQueryClient` from `@tanstack/react-query` (see `src/hooks/useModuleTableHelpers.tsx`, `src/modules/orders/components/StepCommentsItem.tsx`, etc.) and keep Redux slices for UI/session state that must survive unrelated refetches.
- **SHOULD NOT** introduce additional global state libraries without a **Complexity Tracking** exception.

**Rationale**: Contributors already navigate Redux + React Query + `AuthProvider`. A third global store pattern would fragment debugging and provider wiring across the 700+ files under `src/`.

### VI. Styling & UI Stack Cohesion

The repo combines SCSS entry bundles, MUI, Emotion, Radix primitives, and a small dashboard-specific className helper.

- **MUST** reuse established UI dependencies already declared in `package.json` for new work—including `@mui/material`, `@mui/styles`, `@mui/x-charts`, `@emotion/react`, `@emotion/styled`, Radix packages, `lucide-react`, `sass`, `formik`, `yup`, `recharts`, `leaflet`, `@tinymce/tinymce-react`—before adding parallel competitors.
- **MUST** compose conditional `className` strings with `cn` from `src/utils/cn.ts` instead of manual string concatenation.
- **SHOULD** keep global SCSS aggregation flowing through `src/styles/app.scss` (imported from `src/app/App.tsx`) and place module-specific rules under `src/modules/<domain>/styles/*.scss` or existing `src/styles/**` partials, matching current import patterns.
- **SHOULD** extend dashboard styling via `src/components/dashboard/ui/*` and related SCSS under `src/styles/dashboard/` and `src/components/dashboard/charts/` before inventing new design tokens elsewhere.
- **NOTE**: `tailwind-merge` and `class-variance-authority` are listed in `package.json` devDependencies but are **not** imported anywhere under `src/` today. New usage is allowed when justified, but reviewers **MUST** verify it does not duplicate `cn` behavior or introduce unused styling stacks.

**Rationale**: The dependency surface is already broad (charts, maps, rich text, drag-and-drop). Cohesion reduces bundle growth and keeps the Hyundai / autoconnect deployments visually consistent.

### VII. Quality Gates: Build, Test, Format

Local automation must compensate for CI that builds containers without running Vitest in `.github/workflows/cicd.yml`.

- **MUST** run `npm run build` before requesting review; it runs `tsc --noEmit -p tsconfig.app.json` and `vite build`, emitting to `build/` per `vite.config.ts`.
- **MUST** run `npm test` (`vitest run` in `package.json`) before merge; keep the suite green. `vite.config.ts` configures `environment: 'jsdom'` and includes `src/**/*.{test,spec}.{ts,tsx}`.
- **SHOULD** add `*.test.ts(x)` / `*.spec.ts(x)` beside new non-trivial logic (Vitest currently has **no** matching files under `src/`, so new tests are strongly encouraged to populate this gate).
- **MUST** format changes with Prettier 3 using `.prettierrc` (`semi: true`, `trailingComma: "none"`, `singleQuote: true`, `printWidth: 180`). There is **no** ESLint configuration file in the repository—do not add one silently in a feature PR without a constitution amendment or documented exception.
- **MUST** keep `Dockerfile` stages aligned with `package.json`: `npm ci` then `npm run build`, nginx serving `/app/build`. Any new `REACT_APP_*` build argument **MUST** be threaded through `Dockerfile`, `helm/*`, and `.github/workflows/cicd.yml` together.

**Rationale**: Because the shown CI job only docker-builds/pushes and helm-deploys, contributors carry the responsibility for tests and formatting prior to push.

## Technology Stack

Facts grounded in `package.json`, `vite.config.ts`, `tsconfig*.json`, and repository layout:

- **Runtime & language**: React 18 (`react`, `react-dom`), TypeScript ~5.6, ES modules, `jsx: react-jsx`.
- **Build & dev server**: Vite ^6 with `@vitejs/plugin-react`; `npm run dev` → `vite`; `npm run build` → `tsc --noEmit -p tsconfig.app.json && vite build`; `npm run preview` → `vite preview`.
- **Testing**: Vitest ^3 with `@vitest` config merged in `vite.config.ts` (`environment: 'jsdom'`, glob `src/**/*.{test,spec}.{ts,tsx}`).
- **Formatting**: Prettier ^3 with `.prettierrc` at repository root.
- **Routing & UX**: `react-router-dom` v6, `react-toastify`, `react-loading-skeleton`, `gsap`, `react-dnd`, assorted input widgets (`react-select`, `react-dropzone`, etc.).
- **State & data**: `@reduxjs/toolkit`, `react-redux`, `@tanstack/react-query`, `axios`, `js-cookie`, `immutability-helper`.
- **UI & styling**: `@mui/material`, `@mui/styles`, `@mui/x-charts`, `@emotion/react`, `@emotion/styled`, Radix UI primitives, `lucide-react`, `sass`, `clsx`, `tailwind-merge` (dependency only today), `class-variance-authority` (dependency only today), custom `cn` helper (`src/utils/cn.ts`).
- **Internationalization**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`, JSON dictionaries under `src/assets/locale/*/translation.json`.
- **Forms & validation**: `formik`, `yup`.
- **Charts, maps, editors**: `recharts`, `leaflet`, `leaflet-draw`, `@turf/turf`, `@tinymce/tinymce-react`.
- **Realtime**: `pusher-js`, `laravel-echo`.
- **Deployment artifacts**: multi-stage `Dockerfile` (Node Alpine build → nginx `1.29.0-alpine` runtime), Helm chart under `helm/`, GitHub Actions workflow `.github/workflows/cicd.yml` (AWS OIDC → ECR → EKS `helm upgrade` matrix for autoconnect + hyundai).

## Workflow & Review

Reviewers treat the following as mechanical checks (in addition to normal correctness review):

- **Structure & ownership**
  - Confirm new pages live under `src/app/pages/` and routes are appended in `src/app/App.tsx`.
  - Confirm domain code lives under `src/modules/<domain>/` and respects existing subfolders.
  - Search for imports that reach into another module’s deep paths from the wrong layer; pages may orchestrate multiple modules, modules should not become a cyclic web of relative imports.

- **HTTP & realtime**
  - `rg "\baxios\.create\(" src` and `rg "\bfetch\(" src` — only `src/config/axiosConfig.ts` should own `axios.create`.
  - Verify new calls import `axiosInstance` from `src/config/axiosConfig.ts` and env usage flows through `src/config/APIs.ts`.
  - Disallow new generic HTTP libraries in `package.json` without a **Complexity Tracking** entry.

- **State**
  - Inspect `src/app/Providers.tsx` for unauthorized provider reorder or extra global stores.
  - Ensure Redux additions touched `src/store/redux/store.ts`.

- **i18n / RTL**
  - Spot-check JSX for raw English/Arabic strings that belong in `src/assets/locale/en/translation.json` / `ar/translation.json`.
  - Ensure RTL-sensitive work updated `src/styles/app-rtl.scss` or the relevant SCSS partials, not only inline styles.

- **Styling / UI**
  - Ensure conditional classes use `cn` (`src/utils/cn.ts`).
  - Challenge new UI dependencies that overlap with MUI/Radix/Emotion already in `package.json`.

- **Commands**
  - `npm run build`
  - `npm test`
  - `npx prettier --check .` (or equivalent formatting verification) aligned with `.prettierrc`

- **Release plumbing**
  - If environment variables change, verify `Dockerfile` ARG/ENV lines, `helm/values*.yaml`, and `.github/workflows/cicd.yml` `build-arg` blocks stay synchronized.

## Governance

This constitution is the normative engineering contract for `autoconnect-admin`. It overrides informal habit when they conflict.

- **Amendments**: Propose changes via pull request. Update the semantic version and `**Last Amended**` date in the footer. Refresh the HTML **Sync Impact Report** at the top with the new version, principle deltas, and each `.specify/templates/*.md` file marked `pending` until explicitly brought into alignment. `**Ratified**` changes only on MAJOR rewrites or re-adoption events.
- **Semantic versioning (this document only)**:
  - **MAJOR**: Remove or materially redefine a principle such that previous compliant code becomes non-compliant; reset expectations for the whole repo.
  - **MINOR**: Add a principle, add a new normative section, or introduce new **MUST** rules.
  - **PATCH**: Clarify wording, tighten examples, or update paths/tooling references without changing obligations.
- **Exceptions**: Any deliberate violation of a **MUST** (extra HTTP client, new global store, skipping build/test gates, adding eslint without process, etc.) **MUST** be documented in the active feature plan under **Complexity Tracking** (the table in plans generated from `.specify/templates/plan-template.md`). Each row captures the violation, why it is needed, and why a simpler alternative is insufficient. Exceptions expire when the feature merges; repeat violations need a new row or a constitution amendment.
- **Reviews**: Maintainers verify PRs against this file for high-risk areas (HTTP, providers, i18n, new dependencies). Non-compliance blocks merge unless the **Complexity Tracking** table is filled and approved.

**Version**: 2.0.0 | **Ratified**: 2026-05-11 | **Last Amended**: 2026-05-11
