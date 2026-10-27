---
name: react-admin-standards
description: Engineering standards for company React admin SPAs (Vite/CRA, TypeScript, domain modules, axios gateway, React Query, Redux, Formik, i18n/RTL, Tailwind+cn, CDN Lambda images). Use when implementing, reviewing, or scaffolding pages, routes, CRUD lists, forms, tables, inputs, API calls, permissions, drafts, menu entries, image uploads/previews, or styling in any company admin frontend.
user-invocable: true
---

# React Admin Standards

Mandatory engineering standards for every company React admin SPA (Vite or CRA). Apply these BEFORE writing or reviewing admin frontend code.

## Overview

Engineering standards for company admin SPAs: domain-modular React 18 + TypeScript, single axios gateway, React Query for server state, Redux for session/UI, Formik+Yup forms, bilingual i18n/RTL, Tailwind v4 + `cn`. Derived from [autoconnect-constitution.md](autoconnect-constitution.md) and the live **autoconnect-admin** repo (`d:\Work\autoconnect-admin`).

Projects are mostly identical in shape; build tooling may differ (Vite or CRA). Keep guidance framework-tolerant — don't assume Vite-only APIs unless the project uses Vite.

## How to use this skill

1. **Company rules first.** Start with this file for CRUD flows, golden-path hooks, red flags, and the governance gate.
2. **Deep detail second.** Load [reference.md](reference.md) when scaffolding a domain, wiring menus/permissions/drafts, extending tables/inputs, testing (MSW/Vitest), or upgrading `cn`/Tailwind.
3. **CDN images third.** Any table thumb, upload preview, or gallery → [references/cdn-lambda-images.md](references/cdn-lambda-images.md). Public Next.js sites use [nextjs-standards](../nextjs-standards/SKILL.md) (`references/images.md`) instead — same Lambda contract, different display API (`<img>` + `buildCdnImageUrl`, not `next/image`).
4. **Match live code.** When this skill or the constitution disagree with the repo you're editing, follow live code and the enforced-vs-aspirational map in **reference.md**.

**Reference implementations** exist in company admin codebases; read real files for patterns in practice, but treat **this skill** (not any single project) as the source of truth — copy intent, not incidental debt.

### Decision table

| When you are… | Read |
| --- | --- |
| Scaffolding a new CRUD domain | This file (file checklist) → [reference.md](reference.md) (Scaffolding checklist) |
| List page, pagination, search | `useModuleTableHelpers` below → [reference.md](reference.md) (ReusableDataTable API) |
| Create/edit form, Yup, loaders | Formik section below → [reference.md](reference.md) (Form layout & loaders) |
| Drafts / preview | Drafts section below → [reference.md](reference.md) (Drafts & preview) |
| Table columns, row actions | ReusableDataTable below → [reference.md](reference.md) (ReusableDataTable API) |
| HTTP / module API vs `general*` | HTTP rule below → [reference.md](reference.md) (Feature vs module) |
| Sidebar menu + route permissions | Menu + Permissions below → [reference.md](reference.md) (Menu registration, Permissions) |
| File/image uploads + CDN display | Inputs below → [references/cdn-lambda-images.md](references/cdn-lambda-images.md) |
| Unit / feature / MSW tests | Universal principles #3 → [reference.md](reference.md) (Testing) |
| Tailwind, `cn`, RTL | Styling below → [reference.md](reference.md) (Styling map) |
| Cookies / localStorage | Section below → [reference.md](reference.md) (Cookies & localStorage) |

**Core flow — CRUD list page:**

```
app/pages/<domain>/List.tsx → useModuleTableHelpers → generalGet → <DomainTableContainer> (ReusableDataTable)
```

**Core flow — create/edit form:**

```
app/pages/<domain>/Create*.tsx (page shell) → modules/<domain>/components/Create*Form → useFormsIntegrationHelpers → generalCreate
```

> **Match the project you're editing.** Where this skill and the constitution disagree with live code, follow live code and the rules below. Enforced-vs-aspirational map → **reference.md**.

## Universal engineering principles (apply to every task)

1. **Reusable-first.** Before writing UI/logic, look for an existing reusable component/hook (`src/components/`, `src/components/formInputs/`, `src/hooks/`, `ReusableDataTable`, `FieldWrapper`). Use it. If none fits, **propose creating a reusable one** in the shared layer rather than a one-off — and say so.
2. **Split by business case.** When creating or editing a function that handles several cases/branches, split each case into its own named function (one `renderX`/`handleX` per case) and keep the parent a thin dispatcher. Model it on `FieldWrapper` (`renderRegularInput`, `renderSelect`, `renderTextArea`, …). Don't grow one function with deep `if/else`.
3. **Tests after every change.** After implementing anything non-trivial, add **unit tests** (utils/hooks/module API) and **feature tests** (component render/flow) colocated as `*.test.tsx`. List pages and table containers: MSW end-to-end. Form components: MSW when practical; **mocking `useFormsIntegrationHelpers` is acceptable** when MSW + router/`useParams` setup is awkward — still test fields, validation, and loaded-data rendering. Every new domain needs **at least one MSW integration test** (typically the list page). Details → **reference.md**.
4. **Build before done.** Always run `npm run build` (`tsc --noEmit && vite build`) at the end so we know production won't fail. Fix all type/build errors.
5. **No cross-module imports.** A module under `src/modules/<domain>/` MUST NOT import from another module's internals. Share via `src/components/`, `src/hooks/`, `src/utils/`, `src/types/`. Pages may compose multiple modules; modules may not reach into each other.
6. **TypeScript strict.** No `any` escapes across layers; keep `strict: true`. Build is the static gate.

## Project layout

| Layer | Path | Role |
|---|---|---|
| Pages / routes | `src/app/pages/<domain>/` | Page shell: breadcrumb dispatch + module component |
| Router | `src/app/App.tsx` | Central route graph; wrap with `ProtectedRoutes` + `PermittedRoutes` |
| Domain | `src/modules/<domain>/` | `components/`, `types/`, `API/`, optional `store/`, `hooks/` |
| Feature HTTP | `src/API/api.ts` | `generalGet`, `generalCreate`, `generalDelete`, `generalPut`, `generalToggleStatus` |
| Gateway | `src/config/axiosConfig.ts`, `src/config/APIs.ts` | Single `axiosInstance`; env URLs |
| Hooks | `src/hooks/` | `useModuleTableHelpers`, `useFormsIntegrationHelpers` |
| Shared UI | `src/components/` | `ReusableDataTable`, `formInputs/FieldWrapper`, buttons, loaders, modals |
| State | `src/store/redux/store.ts`, `src/store/context/authContext.tsx` | Redux slices + auth/error bridge |
| i18n | `src/config/i18n.ts`, `src/assets/locale/{en,ar}/translation.json` | All user-visible copy |
| Menu | `src/components/layout/sideMenu/SideMenuLinks.tsx` | Inline link objects + `hasPermission` |
| Styles | `src/styles/tailwind.css`, `src/styles/app.scss`, `app-rtl.scss` | Tailwind v4 + global SCSS |

## File checklist — new CRUD domain

| Piece | Path pattern |
|---|---|
| Types | `src/modules/<domain>/types/interfaces.ts` |
| Module API | `src/modules/<domain>/API/api.ts` (when building inside a module — see API rule) |
| Form | `src/modules/<domain>/components/Create<Entity>Form.tsx` |
| Table | `src/modules/<domain>/components/<Entities>TableContainer.tsx` (ReusableDataTable) |
| List page | `src/app/pages/<domain>/<Entities>.tsx` |
| Create/edit shell | `src/app/pages/<domain>/Create<Entity>.tsx` — `setBreadCrumbsData` + `<Create*Form />` |
| Routes | imports + `<Route>` (inside `ProtectedRoutes`, wrapped in `PermittedRoutes`) in `src/app/App.tsx` |
| Menu | `*Links` object in `SideMenuLinks.tsx`, gated by `hasPermission` |
| i18n | keys in **both** `en/translation.json` and `ar/translation.json` |
| Tests | `*.test.tsx` colocated for the form, table, and any new hook/util |

Route conventions: list `/banks`, create `/banks/create-bank`, edit `/banks/create-bank/:id` (same form component, `id` from `useParams`).
API route convention: `admin/<resource>` (e.g. `admin/banks`, `/admin/banks/${id}`).

## HTTP rule — feature vs module

- **Feature / one-off / cross-cutting call** → use `generalGet` / `generalCreate` / etc. from `src/API/api.ts` with a route string.
- **Working inside a domain module** → add `src/modules/<domain>/API/api.ts` wrapping `general*` (named helpers like `getPromoCodes`, `createPromoCode`). Unit-test the module API here.
- **Golden-path hooks are the exception:** `useModuleTableHelpers({ route: 'admin/...' })` and `useFormsIntegrationHelpers({ singleGetApi, addApi, editApi })` **must** receive route strings in their config — that is correct and matches banks. Do not refactor hooks to import module API; the module API is for direct calls (custom queries, mutations outside the hooks, delete/upload flows) and testability, not for replacing hook config.
- **Don't scatter** ad-hoc `generalGet('admin/...')` calls inside module **components** when the call isn't going through a hook or module API helper.
- All calls ultimately go through the single `axiosInstance`. Never add a second HTTP client or raw `fetch` to the backend. Direct `axiosInstance` only for multipart upload/export or auth.
- Base URLs come from `src/config/APIs.ts` (`REACT_APP_*`). Never hardcode API URLs.

## Golden-path hooks

### List pages — `useModuleTableHelpers` (use whenever the page shows a table)

```tsx
const { apiData, apiDataLoading, paginationEle } = useModuleTableHelpers({
  route: 'admin/banks',
  withBreadcrumb: true,
  breadcrumbTitle: t('links.banks'),
  withPagination: true,
  withSearch: true,        // optional
  queryKey: 'banks',       // or ['banks', id]
  extraParams: {},         // optional filters
});
```

### Forms — `useFormsIntegrationHelpers` (use on every form)

```tsx
const { apiData, getDataLoading, handleSubmit, submitLoading } = useFormsIntegrationHelpers({
  queryKey: ['banks', id],
  invalidateQueryKey: ['banks'],
  id,
  singleGetApi: `/admin/banks/${id}`,
  addApi: '/admin/banks',
  editApi: `/admin/banks/${id}`,
  itemName: t('bank'),
  listRoute: '/banks'
});
```

Handles edit-load, FormData submit via `generalCreate`, toast, navigate-back, query invalidation, and preview/draft context. Pass route strings (`singleGetApi`, `addApi`, `editApi`) — do not wire this hook through module `API/api.ts`.

## Tables — `ReusableDataTable` (the standard; the old `.table_container` div-grid is retired)

Build columns with `columnsFromHeadersAndDefs<T>(tableHeaders, defs)`, memoize, render via `ReusableDataTable`. Use `TableActionButton` + `DeleteButton` for the actions column, Tailwind classes for cells.

```tsx
const columns = useMemo(
  () => columnsFromHeadersAndDefs<IBank>(tableHeaders, [
    { render: (item) => <span className="text-neutral-800 dark:text-neutral-100">{item?.id ?? '-'}</span> },
    { render: (item) => <span className="capitalize ...">{item?.name?.[i18n.language as 'en' | 'ar'] || '-'}</span> },
    { colClassName: 'w-px', render: (item) => (
        <div className="flex flex-nowrap items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <TableActionButton type="edit" title={t('edit')} onClick={(e) => navigateRoute(e, editPath(item.id), navigate)} />
          <TableActionButton type="delete" title={t('delete')}>
            <DeleteButton deleteRoute="/admin/banks" queryKey="banks" id={item.id} />
          </TableActionButton>
        </div>
      ) },
  ]),
  [tableHeaders, i18n.language, t, navigate, editPath],
);
return <ReusableDataTable columns={columns} data={data} emptyMessage={noDataMessage} stickyLastColumn onRowClick={handleRowClick} />;
```

## Page shell

Thin page in `src/app/pages/<domain>/` — no Formik or API logic here.

- **Create/edit:** dispatch `setBreadCrumbsData({ links, page_title })` (title from `id ? t('edit_*') : t('create_*')`), render `<Create*Form />`. Canonical: `app/pages/banks/CreateBank.tsx`.
- **List:** breadcrumb via `useModuleTableHelpers({ withBreadcrumb: true, breadcrumbTitle })` — not dispatched in the page.

## Inputs — `FieldWrapper` + uploads

Text/select/textarea/rich-text/switch/date go through `src/components/formInputs/FieldWrapper.tsx`. **File/image uploads** use `FormUpload` or `FormGalleryUpload` (dropzone, Formik `inputName`, draft badges) — not `FieldWrapper`. Don't write raw `<input>`/`<select>`. New input type → add a `renderX` case to `FieldWrapper`.

**CDN images:** table thumbs, upload previews, and galleries must use `buildCdnImageUrl()` + `CDN_IMAGE_WIDTHS` presets — never raw CDN URLs or inline `?w=` strings. Store original URLs from the API; resize only at display. Full rules → [references/cdn-lambda-images.md](references/cdn-lambda-images.md).

**Grid layout:** wrap fields in `<div className="inputs_grid">` (12-column CSS grid). Each `FieldWrapper` takes `gridSize` (1–12, default `12`) → applies `grid-{gridSize}` for column span. Example: two half-width fields → both `gridSize={6}`; full-width → `gridSize={12}` or omit.

## Forms — Formik + Yup

**Layout** (canonical: `modules/banks/components/CreateBankForm.tsx`):

```
div.form_section (ref=formRef)
  └── Formik (enableReinitialize, validateOnMount)
        └── Form
              ├── SectionHeader (title) → div.inputs_grid → FieldWrapper (gridSize, inputName="name.en")
              └── FormActionsWithDraft → div.form_button → Button (loading={submitLoading})
```

- **Submit:** in `onSubmit`, set `_method: 'POST'` (create) or `'PUT'` (when `id`), then `handleSubmit(values, setErrors)`. On save click: `scrollToError(!formik.isValid, formRef)`.
- **Translatable fields `{ en, ar }`** — Yup + `FieldWrapper` with `inputName="name.en"` / `"name.ar"`.
- **Loading:** `if (getDataLoading) return <FormDynamicSkeleton sections={[[{ columns: 2, items: 2 }]]} buttons={1} />` — `sections` mirrors real layout (sections → rows → `{ columns, items, type? }`). Lists: `TableSkeleton`.
- **Large forms:** split fields into `Create*FormInputs.tsx` using `useFormikContext`.
- Errors: `authContext` `catchError` → Formik `setErrors` + toast; 401/403 → logout.

## Sidebar menu

All links are defined **inline** in `src/components/layout/sideMenu/SideMenuLinks.tsx`:

1. Add a `*Links` object: `{ header, baseRoute, headerIcon, keyName, nestedLinks }`.
2. Build `nestedLinks` with `filterValidNested([ hasPermission(['x.show']) && { label, link, icon }, ... ])`.
3. Place in the right `menuGroups` entry (or standalone `TogglerNavLink`). Icons from `src/config/variables.tsx`. Add `links.*` to both locale files.

## Styling — Tailwind v4 + `cn`

- **New components use Tailwind utility classes + `cn`** (match `ReusableDataTable`). SCSS is only for global/structural rules (`app.scss`, `app-rtl.scss`) and existing legacy files.
- `cn` MUST be conflict-safe: `twMerge(clsx(...))`. If the project's `src/utils/cn.ts` is still a naive `join`, upgrade it to `tailwind-merge` + `clsx` first, then use `cn` for all conditional classes.
- Support dark mode via the `dark:` variant where the design calls for it.
- RTL: structural direction in SCSS / logical Tailwind utilities; `document.documentElement.dir` is set from i18n in `App.tsx`. Don't add new `react-toastify`/MUI competitors — reuse what's in `package.json`.

## Permissions

- **Always** put protected screens inside `ProtectedRoutes` and wrap each route in `PermittedRoutes` with the right permission(s).
- Permission strings follow the existing autoconnect-admin naming (`banks.show`, `banks.edit`, `models.show`, `colors.edit`, …). Managed by an authenticated admin with the relevant permission.
- For inline UI gating (buttons, columns, menu entries) use `hasPermission([...])`.

## Drafts (default ON for new entities)

Any new entity supports drafts **unless explicitly told not to**. Wrap form actions in `FormActionsWithDraft` with the entity's `draftType`, keep `is_draft` in Formik values, and show per-field draft indicators (`FieldWrapper` reads `drafted_by_attributes`). Detail → **reference.md**.

## i18n

- All user-visible copy via `react-i18next`; add keys to **both** locale files in the same change.
- Nav labels under `links.*`; display bilingual values as `item?.name?.[i18n.language]`.

## Cookies & localStorage

Cookies: **`js-cookie`** (`Cookies.set` / `get` / `remove`). localStorage: `setItem` / `getItem` / `removeItem` + `JSON.stringify` / `JSON.parse`.

**Adding new persisted state:** create a util file (e.g. `src/utils/myFeatureStorage.ts`) with **getter + setter** (and `remove` if needed). Components call the util — never `Cookies` or `localStorage` directly.

- **Cookie** — simple string values; if axios must send it, read in `axiosConfig.ts` interceptor only.
- **localStorage** — JSON objects/arrays; use `try/catch` and a `STORAGE_KEY` constant in the util.

Examples: `src/utils/jobTracking.ts`, login helpers in `modules/auth/components/LoginForm.tsx`. Existing keys → **reference.md**.

## State — when to use what

| Need | Tool |
|---|---|
| Lists, single-entity fetch, mutations | React Query (golden-path hooks or `useQuery`/`useMutation`) |
| Auth session, roles/permissions, breadcrumbs, preview context, notifications | Redux slices (`src/store/redux/store.ts`) |
| Auth actions + global error bridge | `AuthProvider` / `authContext` |
| Sidebar / filter accordion / dashboard filters / theme | React context |

Provider order in `src/app/Providers.tsx` (Redux → QueryClient → ThemeProvider → AuthProvider) must not change. No new global state libraries.

## Red flags — STOP

- Raw `fetch`/new `axios.create` to the backend → use `axiosInstance` / `general*` / module API
- Module importing another module's internals → share via `components`/`hooks`/`utils`
- New `.table_container` div-grid table → use `ReusableDataTable`
- Raw `<input>`/`<select>` in a form → use `FieldWrapper`
- One giant function with many `if/else` cases → split per case
- Manual `className` string concat → `cn`
- Raw CDN URL in `<img>` without `buildCdnImageUrl` → use [references/cdn-lambda-images.md](references/cdn-lambda-images.md)
- Raw `localStorage` / `Cookies` in components → use a util getter/setter file
- New route without `PermittedRoutes`
- New domain without a menu entry / without both en+ar keys
- Translatable field stored as a flat string instead of `{ en, ar }`
- Shipping without tests or without `npm run build` passing
- Building a one-off when a reusable component exists (or should)

## Before "done" (governance gate)

1. Reusable components used (or a new shared one proposed)
2. Functions split by business case where applicable
3. **Unit + feature tests added** (`*.test.tsx`) and passing (`npm test`)
4. Routes registered with `PermittedRoutes`; menu entry added; both locale files updated
5. `npx prettier --check .`
6. **CDN images** use `buildCdnImageUrl` + presets where applicable — [references/cdn-lambda-images.md](references/cdn-lambda-images.md)
7. **`npm run build` passes** — production won't fail

Deep detail (feature-vs-module API, menu workflow, testing/MSW setup, drafts, ReusableDataTable API, CDN Lambda images) → **reference.md** and [references/cdn-lambda-images.md](references/cdn-lambda-images.md).
