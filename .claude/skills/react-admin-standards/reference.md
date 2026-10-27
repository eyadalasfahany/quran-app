# React Admin Standards — Reference Detail

Deep detail for `react-admin-standards`. Load when scaffolding a domain, wiring menus/permissions/drafts, extending tables/inputs, or setting up tests. Day-to-day rules live in SKILL.md.

## Enforced vs aspirational (constitution)

The bundled [autoconnect-constitution.md](autoconnect-constitution.md) (v2.0.0) predates recent repo changes. Follow live code + the rules below.

| Constitution says | Live reality in autoconnect-admin | Skill stance |
|---|---|---|
| Tailwind is a dep but **unused** | Tailwind v4 is live: `@tailwindcss/vite` in `vite.config.ts`, `src/styles/tailwind.css`, dark variant; `ReusableDataTable` is fully Tailwind | **New components use Tailwind + `cn`** |
| `cn` for conditional classes | `src/utils/cn.ts` is still a naive `join` | Upgrade `cn` to `twMerge(clsx(...))`; then mandate `cn` |
| Legacy div-grid tables (`.table_container`) | Being retired; `ReusableDataTable` used in 60+ modules | **Use `ReusableDataTable`** |
| REST helpers under `modules/<domain>/API/` | Hooks still take route strings in config; module `API/` exists for encapsulation + unit tests | Module `API/api.ts` required; hooks keep route strings in `route` / `singleGetApi` / `addApi` / `editApi` |
| All routes permission-gated | Many routes historically skipped guards | **Always wrap new routes in `PermittedRoutes`** |
| Vitest before merge | Zero tests today; libs installed | **Add unit + feature tests after every change** |
| Modules may compose via relative imports | Some cross-module imports exist (debt) | **No new cross-module imports** |

Still enforced & correct: single `axiosInstance` + interceptors (Bearer, `X-Client-Code`, `Accept-Language`, preview), provider order, i18n via JSON locales, Formik+Yup, golden-path hooks, `npm run build` as static gate.

## Feature vs module — API placement

- **Module** = a domain folder under `src/modules/<domain>/` owning an entity's CRUD. Add `src/modules/<domain>/API/api.ts` with named helpers wrapping `general*` (`getX`, `createX`, `updateX`, `deleteX`). Unit-test this file.
- **Golden-path hooks (standard CRUD)** — pass route strings directly in hook config. This is intentional:

```tsx
// List page — route string in hook config ✅
useModuleTableHelpers({ route: 'admin/promo-codes', queryKey: 'promo-codes', ... });

// Form — route strings in hook config ✅
useFormsIntegrationHelpers({
  singleGetApi: `/admin/promo-codes/${id}`,
  addApi: '/admin/promo-codes',
  editApi: `/admin/promo-codes/${id}`,
  ...
});
```

Do **not** refactor these hooks to call module API instead. Module API and hook config serve different layers.

- **Use module API from components** when making HTTP calls **outside** the golden-path hooks — custom `useQuery`/`useMutation`, batch actions, toggle endpoints, file upload helpers, etc.
- **Don't scatter** raw `generalGet('admin/...')` inline in module components when neither a hook nor a module API helper owns the call.
- **Feature** = cross-cutting / one-off (dashboard widget, revalidate). Call `generalGet('admin/...')` directly or via a shared util.
- Everything funnels through `axiosInstance`. Direct `axiosInstance` only for multipart upload/export and auth login/logout.

### `src/API/api.ts` helpers

`generalGet(route, { ignorePreviewOverride })`, `generalCreate({ route, values, method })`, `generalPut(route, data)`, `generalDelete(route)`, `generalToggleStatus(route, post?)`.

### Interceptor behavior (never duplicate at call sites)

Bearer token + `X-Client-Code` from cookies, optional `X-Client-Domain`, `Accept-Language` from `i18next`, preview query injection on GET. Response payloads: entity at `data?.data.data`, pagination at `data?.data.meta`.

## ReusableDataTable API

`src/components/ReusableDataTable.tsx`.

**Column type:**
```ts
type ReusableDataTableColumn<T> = {
  header: string;
  render?: (row: T, i: number) => ReactNode;
  colClassName?: string; headerClassName?: string; cellClassName?: string;
};
```

**Props:** `columns`, `data`, `emptyMessage`, `className`, `tableClassName`, `maxHeightClassName`, `getRowId`, `stickyLastColumn`, `onRowClick`, `getRowClassName`, `rowClassName`.

**Builders:**
- `columnsFromHeadersAndDefs<T>(tableHeaders, defs)` — pairs `tableHeaders` (the `{ label, customClass }[]` a list page already builds) with render defs. Preferred for CRUD tables.
- `columnsFromHeadersAndKeys<T>(headers, options)` — header-only columns.

Table container receives `ITableContainerProps<T>` from `src/types/Interfaces.tsx`. Memoize `columns` with `useMemo` and handlers with `useCallback`. Stop row-click propagation on the actions cell (`onClick={(e) => e.stopPropagation()}`). Dashboard analytics may use `src/components/dashboard/ui/table.tsx` instead.

## Inputs & the split-by-case principle

`src/components/formInputs/FieldWrapper.tsx` is the canonical example of principle #2: one `renderX` per input type (`renderRegularInput`, `renderControlledInput`, `renderTextArea`, `renderTextEditor`, `renderSelect`, `renderTimePicker`, `renderMultipleDates`, `renderSwitch`), dispatched by flat flags at the bottom — no nested branching.

Apply the same shape to any multi-case function you write or edit:
- Each business case → its own named function returning its result.
- Parent function = thin dispatcher (switch/flags), easy to test case-by-case.
- This makes per-case unit tests trivial (see Testing).

Available input flags on `FieldWrapper`: `input`, `controlledInput`, `textArea`, `textEditor`, `select` (+ `multi`, `search`, `clear`, `options`), `timePicker`, `multipleDates`, `switchInp`. Plus `maxLength`, `disabled`, `tooltip`, `showDraftIndicator`. Need a new type → add a `renderX` case here.

**`inputs_grid` + `gridSize`:** fields sit inside `<div className="inputs_grid">` (12-col grid, SCSS in `InputFieldsGeneralStyles.scss`). `FieldWrapper` `gridSize` (default `12`) renders `grid-{n}` → `grid-column: span n`. Two side-by-side fields: `gridSize={6}` each.

**Uploads:** `FormUpload` (single file/image/video) and `FormGalleryUpload` (multi-image gallery) in `src/components/formInputs/`. Formik-connected via `inputName`; support `drafted_by_attributes` badges. Use inside `inputs_grid` with `gridSize` like `FieldWrapper`.

**CDN Lambda images:** Admin does not use `next/image`. Display CDN assets via `buildCdnImageUrl()` + `CDN_IMAGE_WIDTHS` (`tableThumb`, `formPreview`, `galleryThumb`, etc.). Store original API URLs in Formik; append `w`/`q`/`ext=webp` only at render. Never bake resize params into API mappers or POST payloads. → [references/cdn-lambda-images.md](references/cdn-lambda-images.md)

## Page shell

`src/app/pages/<domain>/Create<Entity>.tsx` — breadcrumb + render form only:

```tsx
const { id } = useParams();
const title = id ? t('edit_bank') : t('create_bank');
dispatch(setBreadCrumbsData({ links: [{ label: title, path: '/banks/create-bank' }], page_title: title }));
return <CreateBankForm />;
```

List pages set breadcrumb in `useModuleTableHelpers({ withBreadcrumb: true })`, not in the page file.

## Cookies & localStorage

Cookies: **`js-cookie`**. localStorage: native API + JSON parse/stringify.

**New key — add a util file with getter + setter** (do not read/write storage in components):

```ts
// src/utils/myFeatureStorage.ts
import Cookies from 'js-cookie';

const STORAGE_KEY = 'my_feature_data';

export const getMyFeatureData = (): MyType[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setMyFeatureData = (data: MyType[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const removeMyFeatureData = () => localStorage.removeItem(STORAGE_KEY);

// Cookie variant
export const getMyCookie = () => Cookies.get('my_cookie') ?? '';
export const setMyCookie = (value: string) => Cookies.set('my_cookie', value);
export const removeMyCookie = () => Cookies.remove('my_cookie');
```

If a cookie is sent on API requests, read it in `config/axiosConfig.ts` only. Model: `src/utils/jobTracking.ts`.

### Existing keys

| Key | Storage | Set in | Read in |
|---|---|---|---|
| `token` | Cookie | Login/Verify | `axiosConfig`, `ProtectedRoutes`, `authData` |
| `market`, `market_name` | Cookie | Login market select | `axiosConfig` (`X-Client-Code`), `SideMenu` |
| `user_data` | localStorage | Login | `authData` initialState |
| `user_permissions` | localStorage | Login | `authData`, `PermittedRoutes`, `hasPermission` |
| `user_roles` | localStorage | Login | `authData` |
| `client_data` | localStorage | Login | `authData` |
| `autoconnect-color-scheme` | localStorage | `themeContext` | `themeContext` |

## Form layout & loaders

**Structure:** `form_section` → `Formik` → `Form` → `SectionHeader` → `inputs_grid` → `FieldWrapper` → `FormActionsWithDraft` → `form_button` → `Button`. See `modules/banks/components/CreateBankForm.tsx`.

**`FormDynamicSkeleton`** (`src/components/loaders/FormDynamicSkeleton.tsx`) — return when `getDataLoading`:

```tsx
if (getDataLoading)
  return (
    <FormDynamicSkeleton
      sections={[[
        { columns: 2, items: 2 },                        // row: 2 cols, 2 inputs
        { columns: 2, items: 1, type: 'textarea' }       // type?: input | textarea | image | switch
      ]]}
      buttons={1}
    />
  );
```

`sections`: outer = form sections (`SectionHeader` each); inner = rows; `columns` = grid width, `items` = filled slots. Match the real form's section/row layout. Legacy: `FormSkeleton` (roles/products). Lists: `TableSkeleton` when `apiDataLoading && !apiData`.

## Menu registration

All links live **inline** in `src/components/layout/sideMenu/SideMenuLinks.tsx` → `NavLinksGroup` / `TogglerNavLink` / `SingleNavLinks`.

```ts
const banksLinks = {
  header: t('links.banks'),
  baseRoute: '/banks',
  headerIcon: [listIcon],
  keyName: 'banksLinks',
  nestedLinks: filterValidNested([
    hasPermission(['banks.show']) && { label: t('links.banks'), link: '/banks', icon: [listIcon] },
    hasPermission(['banks.edit']) && { label: t('create_bank'), link: '/banks/create-bank', icon: [createIcon] },
  ])
};
// Add to menuGroups: { title, links: [banksLinks, ...] }
```

Icons from `src/config/variables.tsx`. Dynamic submenus (vehicle makes, general-form-types) use `useQuery` in the same file. Add `links.*` to both locale files.

## Permissions

| Mechanism | Path | Behavior |
|---|---|---|
| Auth gate | `src/utils/ProtectedRoutes.tsx` | Redirect to login if no token |
| Route permission gate | `src/utils/PermittedRoutes.tsx` | Reads `localStorage.user_permissions`; renders children or redirects |
| Inline gate | `hasPermission([...])` in `src/utils/HelperFunctions` | Hide buttons/columns/menu entries |

Route registration:

```tsx
// inside <ProtectedRoutes /> in App.tsx
<Route path="/banks" element={<PermittedRoutes permissions={['banks.show']}><Banks /></PermittedRoutes>} />
<Route path="/banks/create-bank" element={<PermittedRoutes permissions={['banks.edit']}><CreateBank /></PermittedRoutes>} />
<Route path="/banks/create-bank/:id" element={<PermittedRoutes permissions={['banks.edit']}><CreateBank /></PermittedRoutes>} />
```

Permission naming mirrors autoconnect-admin (`<resource>.show`, `<resource>.edit`, etc.). Match the names sibling routes/menu entries already use.

## Drafts & preview

Default ON for new entities unless told otherwise.

| Piece | Path | Role |
|---|---|---|
| Draft actions | `src/components/FormActionsWithDraft.tsx` | Publish/reject draft buttons; reads `is_draft`, `is_duplicated`, `draftType` |
| Draft API | `src/modules/drafting/API/api.ts` | `publishDrafts`, `rejectDrafts`, preview token |
| Preview context | `src/store/redux/previewContextData.ts` | Frontend preview URL state |
| Draft indicator | `src/modules/pages/components/TableDraftSign.tsx` | Draft badge (also used per-field by FieldWrapper) |
| Preview hook | `src/hooks/usePreviewLink.ts` | Build preview URLs |

Wiring a draftable form:
1. Keep `is_draft: Boolean(apiData?.is_draft)` in Formik initial values.
2. Wrap actions: `<FormActionsWithDraft draftType={...} queryKey={[...]} invalidateQueryKey={[...]}>{submit buttons}</FormActionsWithDraft>`.
3. Per-field draft highlight comes from `drafted_by_attributes` on form values; `FieldWrapper` matches field paths automatically (or pass `showDraftIndicator`).

## Testing (mandatory after every change)

Vitest + jsdom configured in `vite.config.ts` (glob `src/**/*.{test,spec}.{ts,tsx}`). Libs already installed: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.

**Conventions:**
- **Colocate** `*.test.tsx` next to the file under test.
- **Unit tests** — pure utils, per-case functions, **module `API/api.ts`** (mock `src/API/api.ts` via `vi.mock`). Assert each helper calls the right route/method.
- **Feature tests — prefer MSW** for anything that hits the axios gateway end-to-end:
  - **List pages** → MSW required (proves hook + table + API wiring).
  - **Table containers** → MSW or static props (both valid).
  - **Form components** → MSW when edit-mode + `useParams` + router setup is straightforward. **Mocking `useFormsIntegrationHelpers`** is acceptable when MSW + router params is brittle — still assert field rendering, validation errors, and loaded-data display via mocked `apiData`. Do not skip form tests entirely.
- **Minimum per new domain:** module API unit tests + at least **one MSW integration test** (list page) + form/table component tests.

**MSW handler tip:** register the `:id` GET handler **before** the list GET handler so MSW matches correctly:

```ts
http.get('*/admin/promo-codes/:id', ...),  // first
http.get('*/admin/promo-codes', ...),      // second
```

**One-time setup (add if missing):**
1. `npm i -D msw` and add a jest-dom setup file:
```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```
2. Register it in `vite.config.ts`:
```ts
test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], include: ['src/**/*.{test,spec}.{ts,tsx}'] }
```
3. MSW server in `src/test/server.ts` (`setupServer(...)`), started/stopped in setup.

**Priority when seeding the empty suite:** pure utils (`buildFormData`, `transformBackendValidations`, `columnsFromHeadersAndDefs`) → hooks (`useModuleTableHelpers`, `useFormsIntegrationHelpers`) → components (`FieldWrapper`, table containers) → form-submit feature flows.

Helpers: render with providers (Redux + QueryClient + AuthProvider + i18n + Router) via a shared `renderWithProviders` test util.

## Styling map

| Area | Location |
|---|---|
| Tailwind entry | `src/styles/tailwind.css` (`@import "tailwindcss/..."`, `dark` variant) |
| New components | Tailwind utilities + `cn` (`twMerge(clsx(...))`) |
| Global structural | `src/styles/app.scss` |
| RTL overrides | `src/styles/app-rtl.scss` |
| Legacy module SCSS | `src/modules/<domain>/styles/*.scss` (don't extend for new work) |
| Icons | `lucide-react`; legacy SVG icon set in `src/config/variables` |

`cn` upgrade target:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

## Scaffolding checklist — new CRUD domain

```
- [ ] modules/<d>/types/interfaces.ts — entity interface, bilingual {en,ar} fields
- [ ] modules/<d>/API/api.ts — module REST helpers (wrap general*)
- [ ] modules/<d>/components/Create<E>Form.tsx — Formik + useFormsIntegrationHelpers + FieldWrapper
- [ ] modules/<d>/components/<E>TableContainer.tsx — ReusableDataTable + columnsFromHeadersAndDefs
- [ ] app/pages/<d>/<E>List.tsx — useModuleTableHelpers
- [ ] app/pages/<d>/Create<E>.tsx — page shell: setBreadCrumbsData → form
- [ ] app/App.tsx — routes inside ProtectedRoutes, wrapped in PermittedRoutes
- [ ] *Links object in SideMenuLinks.tsx (hasPermission + filterValidNested)
- [ ] en + ar translation keys (links.*, labels, validation, empty states)
- [ ] Drafts via FormActionsWithDraft (unless told not to)
- [ ] *.test.tsx: module API unit tests + list page MSW integration + form/table component tests (form may mock useFormsIntegrationHelpers)
- [ ] npm run build + npm test + prettier
```

## Key reference files (autoconnect-admin)

```
src/app/App.tsx
src/app/Providers.tsx
src/config/axiosConfig.ts  src/config/APIs.ts  src/config/i18n.ts
src/API/api.ts
src/store/redux/store.ts  src/store/context/authContext.tsx
src/hooks/useModuleTableHelpers.tsx  src/hooks/useFormsIntegrationHelpers.tsx
src/components/ReusableDataTable.tsx
src/components/formInputs/FieldWrapper.tsx
src/components/FormActionsWithDraft.tsx
src/components/layout/sideMenu/SideMenuLinks.tsx
src/utils/ProtectedRoutes.tsx  src/utils/PermittedRoutes.tsx  src/utils/cn.ts
src/styles/tailwind.css  src/styles/app.scss
src/assets/locale/en/translation.json
```

Canonical CRUD examples: `app/pages/banks/Banks.tsx`, `modules/banks/components/CreateBankForm.tsx`, `modules/banks/components/BanksTableContainer.tsx`.

## Governance

Constitution amendments: update version + Sync Impact Report in the project's `.specify/memory/constitution.md`, then sync the copy here (`autoconnect-constitution.md`). The Tailwind adoption, `ReusableDataTable`, drafts-by-default, and mandatory testing should be folded into the constitution on its next revision.
