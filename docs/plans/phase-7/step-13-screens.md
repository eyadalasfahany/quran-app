# Step 13 — Hadith screens, routes and entry points

Plan: `docs/plans/phase-7.md` (the "API and routes" app routes list, the step 13 row and its tests row, D5, D13, D14 to D16, RB24). ADR: `docs/adr/0042-hadith-collections-source.md`, `docs/adr/0076-hadith-chapters-from-openiti.md` (decision 2 merged numbers, section 8 credits, section 7 option C), `docs/adr/0051-tablet-tab-bar.md` (rail). Approved frames (developer, 7 Nov 2026): `screens/frames/hadith/HadithColl*.html` (ADR 0075). Sibling briefs: `step-10-mobile-content.md` (data and hooks), `step-11-mobile-personal.md` (bookmarks, last-read; being built now), `step-12-components.md` (components), `step-06b-chapters-gaps.md` (chapters, merges; section 11 lists the mobile handoffs).

Branch `main` (`git branch --show-current`). Do not commit, push, switch branches or add a dependency. No package changes, so this ships as an OTA update (CLAUDE.md, «Releasing»).

## Read first
1. `.claude/agent-rules.md`, `CLAUDE.md`, `apps/mobile/CLAUDE.md`, `.agents/skills/apple-design/SKILL.md` (load `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `designing-for-ios.md`, `lists-and-tables.md`, `loading.md`, `dark-mode.md`, `cross-platform.md`).
2. **Never write religious text.** Tests and fixtures use only the placeholders listed under "Placeholders". Never print hadith, titles or grade strings in a report: give counts, keys and paths.
3. Re-read `apps/mobile/src/core/i18n/locales/ar.json` and `en.json` before editing them. Add keys **inside the existing top-level `"hadith"` object** (step 12 created it), after its last group. Never rewrite a file from memory.
4. Other agents are working in the same tree. **Do not edit** `apps/mobile/src/features/hadith/personal/**`, `apps/mobile/src/core/db/user/**`, `apps/mobile/src/features/hadith/types.ts`, `constants.ts`, `data/**`, `hooks/**`, `format.ts`, `titles.ts`, `counts.ts`, `apps/mobile/src/shared/ui/**`, `packages/**`, `screens/**`, `apps/api/**`. Run the "Tree guard" at the start and end (section 10).

## Goal
Build every Hadith screen and route, the download sheet, and the entry points, composing the step 10 hooks, the step 11 personal hooks and the step 12 components. Five parts, **built and reviewed in this order**; each part ends with its own gates and a visual check, and no part starts before the previous one is reviewed:

| Part | Content | Needs |
| --- | --- | --- |
| **13a** | Foundations (routes file, stack registration, i18n base, download store, availability hooks, number helper) + collections list + download sheet | steps 10, 12 |
| **13b** | Browse screens: collection (books, or the hadith list of a single-book collection), book (hadith list, or chapters), chapter hadith list, search stub | 13a |
| **13c** | Reader (bookmark, copy, share, pager, last-read) and Saved | 13a, step 11 |
| **13d** | Entry points: Home tile, Menu card, Sources rows | 13a |
| **13e** | Expanded-window layouts (two panes, details panel) | 13b, 13c |

## Rules for every part
- Frontend rule (CLAUDE.md): each UI piece is its own file with a colocated `*.test.tsx`; **screens only compose** components and hooks, with no inline styled UI. A screen file may contain layout `View`s (gap, padding from tokens) and list wiring only.
- Hadith text is never altered, trimmed or centred (RTL, justified; `HadithText` does it). Amiri, the text is the focus, separate cards 12 apart (`theme.space[3]`), no card borders on list rows (step 12 already styles them).
- Every collection that is installed is complete (RB24); the app never shows or computes completeness.
- Colours, spacing, radii from `useTheme()` / `useContrastColors()`; no raw `#` or `rgb(` literal. `start`/`end`, never `left`/`right`. No fixed heights on text or rows. Layout follows `useWindowClass()`, never a device name.
- Every string is an i18n key under `hadith.*` (section 7). Arabic and English both. Numbers through `formatNumber` / `formatHadithNumber`; counts through `src/features/hadith/counts.ts`; titles through `src/features/hadith/titles.ts` (a missing title shows «مجموعة n» / «كتاب n» / «باب n», never the other language).
- **No grade UI, no grade data read.** `hadith_grades` is never queried by screen code.
- No network on the path of a tap. Reading is from `content.db`; the only network calls are the pack download (13a) and the catalogue retry (`runDeviceContentSync`).
- `tsconfig` has `noUncheckedIndexedAccess`: guard indexed reads (`at()` from `jest/azkar-test-db.ts` in tests).
- Expo Router: **encode** dynamic segments (`encodeURIComponent`) when building hrefs; read them with `useLocalSearchParams` and treat them as strings.

## Existing code to reuse (paths checked)

Data and hooks (`apps/mobile/src/features/hadith/`):
- `hooks` (barrel `hooks/index.ts`): `useHadithAvailable()`, `useInstalledHadithCollections()`, `useHadithCollection(slug)`, `useHadithCatalog()` (entries `HadithCatalogEntry`), `useHadithBooks(slug)`, `useHadithBook(slug, bookId)`, `useBookChapters(slug, bookId)`, `useBookHadith(slug, bookId): PagedHadith` and `useChapterHadith(slug, chapterId): PagedHadith` (`{ items, hasMore, loadMore }`, page size 50), `useHadithReader(slug, hadithNumber): HadithReaderData | undefined`. They re-read when the catalogue version bumps (a pack import calls `bumpCatalogVersion()`), so an install refreshes every screen.
- `data` barrel: `HADITH_COLLECTION_SLUGS`, `hadithCollectionNumber(slug)`. `constants.ts`: `HADITH_COLLECTION_ORDER`.
- `types.ts`: `HadithCollection` (has `soleBookId`), `HadithBook` (has `hasChapters`, `chapterCount`), `HadithChapter`, `HadithListItem`, `HadithDetail`, `HadithReaderData`, `HadithCatalogEntry`.
- `format.ts` (`formatHadithNumber`, `formatPackSizeMb`), `titles.ts` (`collectionTitle`, `bookTitle`, `chapterTitle`, `coverTitle`, `collectionAuthor`), `counts.ts` (`countHadith`, `countBooks`, `collectionSummary`).
- Components (`components/`): `CollectionRow` (+ `CollectionRowData`), `CollectionDownloadButton` (+ `CollectionDownloadState`), `CollectionHeader` (`centered` / `inline`), `BookRow` (`compact`, `selected`), `ChapterRow`, `HadithCard`, `HadithListHeader` (`title`, `subtitle`, `titleSize`, `onBack`, `trailing`), `HadithStateView` (`loading`, `offlineEmpty`, `error`, `savedEmpty`, `noResults`), `HadithListSkeleton`, `HadithReaderCard`, `HadithBreadcrumb`, `HadithToolbar`, `HadithPager` (props `position: string`, `total: number | null`), `HadithBookmarkButton`, `SavedHadithRow` (+ `SavedHadithRowData`), `UnverifiedNotice`, `HadithDetailsPanel`, `HadithOfflinePill`, `HadithSearchField`, `HadithSourceLine`, `HadithMeta`.
- Shared: `CollectionCover`, `CoverOrnament`, `IconButton`, `Button`, `SheetHeader` (`title`, `onClose`, `closeLabel`, `closeTone`), `ToggleRow` (`title`, `value`, `onValueChange`), `Screen`, `EmptyState`. Layout: `ContentColumn`, `useWindowClass`, `useTabContentBottom` (`@/core/layout`). `goBackOr` (`@/core/navigation/go-back`). `useOnline` (`@/core/network/useOnline`). `useContentDb` (`@/core/db/content/open`).
- Personal (step 11, names from `step-11-mobile-personal.md`, import from `@/features/hadith/personal`): `useIsHadithBookmarked(slug, hadithNumber)`, `toggleHadithBookmark({ slug, hadithNumber, bookNumber })`, `saveHadithReadingPlace({ slug, hadithNumber, bookNumber })`, `useSavedHadithItems(): SavedHadithItem[]`, `useHadithBookmarks()`. **If these are not exported yet when you reach 13c, stop and report; do not write them.**
- Sync: `installResource(resourceId, { onProgress, signal })` and `runDeviceContentSync()` from `@/core/sync`. Model for the download store: `src/features/reader/panels/tafsir-downloads.ts` (zustand store, controllers outside the store).
- Wi-Fi only: `useAudioSettings` (`wifiOnlyDownloads`) and `setWifiOnlyDownloads(on)` from `@/features/audio/settings`; the gate logic is `networkGate` in `src/features/audio/downloads/manager.ts` (read its `expo-network` imports and copy the same call).
- Screens to imitate: `src/features/duas/routes.ts` and `routes.test.ts` (routes file), `src/features/duas/screens/DuasHomeScreen.tsx` (header, `ContentColumn`, `Screen`), `app/reader-settings.tsx` (sheet route with `SheetHost` and `sheetScreenOptions`), `src/features/reader/panels/AyahActionsPanel.tsx` lines 140 to 166 (copy with the lazy `require('expo-clipboard')`, `AccessibilityInfo.announceForAccessibility`, `Share.share`), `src/features/duas/components/MenuDuasCard.tsx`, `src/features/menu/screens/MenuScreen.tsx`, `src/features/home/screens/HomeScreen.tsx`, `src/features/reader/screens/SourcesScreen.tsx`.
- Tests: `jest/render-ui.tsx` (`renderUi`, `locales`, `flatStyle`), `jest/azkar-test-db.ts` (`openAzkarContentDb`, `at`), `src/features/hadith/data/__fixtures__/dev-fixtures.ts` (`loadHadithDevFixtures`, `FIXTURE_MULTI` slug `fixture-multi`, `FIXTURE_SINGLE` slug `fixture-single`; TEST ONLY), `jest/hadith-ui-fixtures.ts` (placeholders and builders from step 12), `jest/feature-ui-source.ts` (`rawColorLiteralsInFeature`).

## Routes and navigation

### `app/hadith/**` (files to create; each is 3 to 8 lines, default export, renders one screen)

| File | URL | Screen (in `src/features/hadith/screens/`) | Stack options |
| --- | --- | --- | --- |
| `app/hadith/index.tsx` | `/hadith` | `HadithCollectionsScreen` | `pushOptions` |
| `app/hadith/search.tsx` | `/hadith/search` | `HadithSearchScreen` (a stub until step 14) | `pushOptions` |
| `app/hadith/saved.tsx` | `/hadith/saved` | `HadithSavedScreen` | `pushOptions` |
| `app/hadith/downloads.tsx` | `/hadith/downloads?resource=<id>` | `HadithDownloadSheetScreen`, wrapped like `app/reader-settings.tsx` | `sheetScreenOptions` |
| `app/hadith/[collection]/index.tsx` | `/hadith/<slug>` | `HadithCollectionScreen` | `pushOptions` |
| `app/hadith/[collection]/books/[book]/index.tsx` | `/hadith/<slug>/books/<bookId>` | `HadithBookScreen` | `pushOptions` |
| `app/hadith/[collection]/books/[book]/chapters/[chapter].tsx` | `/hadith/<slug>/books/<bookId>/chapters/<chapterId>` | `HadithChapterScreen` | `pushOptions` |
| `app/hadith/[collection]/hadith/[number].tsx` | `/hadith/<slug>/hadith/<number>` | `HadithReaderScreen` | `pushOptions` |

- **Register all eight** in `apps/mobile/app/_layout.tsx` next to the `duas/*` entries: `<Stack.Screen name="hadith/index" options={pushOptions} />` and so on, using these exact `name` values: `hadith/index`, `hadith/search`, `hadith/saved`, `hadith/downloads` (`sheetScreenOptions`), `hadith/[collection]/index`, `hadith/[collection]/books/[book]/index`, `hadith/[collection]/books/[book]/chapters/[chapter]`, `hadith/[collection]/hadith/[number]`. Do not change any other line. Check `__tests__/router.test.tsx` and `__tests__/root-layout-azkar.test.tsx` still pass.
- `[collection]` is the canonical slug (`bukhari` … `shahwaliullah40`). `[book]` and `[chapter]` are **database ids** parsed with `Number.parseInt(value, 10)`; a non-numeric value or an id the hooks do not return shows the not-found state (below). `[number]` is the hadith number as text (`'3.1'`), URL-decoded by Expo Router, never parsed to a number. These are browsing keys only; saved items store slug + number (step 11).
- Static segments (`search`, `saved`, `downloads`) win over `[collection]` in Expo Router; no slug can equal them.

### `src/features/hadith/routes.ts`

```ts
import type { Href } from 'expo-router';

/** Hadith routes (app/hadith/*). Dynamic segments are encoded. `bookId` and `chapterId` are database ids (browsing keys only). */
export const hadithHref = {
  home: '/hadith' as Href,
  search: '/hadith/search' as Href,
  saved: '/hadith/saved' as Href,
  downloads: (resourceId?: number): Href =>
    (resourceId === undefined ? '/hadith/downloads' : `/hadith/downloads?resource=${resourceId}`) as Href,
  collection: (slug: string): Href => `/hadith/${encodeURIComponent(slug)}` as Href,
  book: (slug: string, bookId: number): Href => `/hadith/${encodeURIComponent(slug)}/books/${bookId}` as Href,
  chapter: (slug: string, bookId: number, chapterId: number): Href =>
    `/hadith/${encodeURIComponent(slug)}/books/${bookId}/chapters/${chapterId}` as Href,
  reader: (slug: string, hadithNumber: string): Href =>
    `/hadith/${encodeURIComponent(slug)}/hadith/${encodeURIComponent(hadithNumber)}` as Href,
  /** The Menu's home tab, where Hadith is reached from. */
  homeTab: '/(main)/(home)' as Href,
};

export { goBackOr } from '@/core/navigation/go-back';
```

`routes.test.ts` (colocated, like `duas/routes.test.ts`; mock `expo-router` the same way) asserts the strings, the encoding (`reader('bukhari', '3.1')` → `/hadith/bukhari/hadith/3.1`; a number with `/` or a space is encoded), `goBackOr` pops with history and replaces `/hadith` without. It does not use `satisfies keyof paths` (that is the API-contract type; app routes in this repo are `as Href` builders, see Open question 8).

### Navigation map (what each tap does)

| From | Tap | Goes to |
| --- | --- | --- |
| Home tile, Menu card | tile / card | `router.push(hadithHref.home)` |
| Collections list | installed row | `router.push(hadithHref.collection(slug))` |
| Collections list | «تنزيل» pill (available row) | `router.push(hadithHref.downloads(resourceId))` (the sheet; it starts nothing by itself) |
| Collections list | cancel (downloading row) | `useHadithDownloads.getState().cancel(resourceId)` |
| Collections list | retry (failed row) | `start(resourceId)` |
| Collections list | header search button | `router.push(hadithHref.search)` |
| Collections list | header downloads button (shown only when some catalogue entry is not installed) | `router.push(hadithHref.downloads(id))` where `id` is the entry that is downloading, else the first not-installed entry in list order |
| Collection (multi-book) | book row | `router.push(hadithHref.book(slug, book.id))` |
| Collection when `soleBookId !== null` | (opens its hadith list in place, no books screen) | hadith card → reader |
| Book | `hasChapters` true: chapter row | `router.push(hadithHref.chapter(slug, bookId, chapter.id))` |
| Book (no chapters), chapter, single-book list | hadith card | `router.push(hadithHref.reader(slug, item.hadithNumber))` |
| Reader | previous / next | `router.replace(hadithReader…)` with the neighbour's `hadithNumber` (replace, so Back returns to the list, not through every hadith read) |
| Reader | back | `goBackOr(hadithHref.collection(slug))` |
| Any list header | back | `goBackOr(parent href)`; parent of collection is `home`, of book is `collection(slug)`, of chapter is `book(...)` |
| Saved | verified row | `router.push(hadithHref.reader(slug, item.openNumber))` |
| Saved | unverified row | book level: `book(slug, book.id)` if both collection and book are known, else `collection(slug)` if installed, else `home` |
| Sources (Settings) | row | `Linking.openURL(url)` (existing behaviour) |

The single-book rule uses `HadithCollection.soleBookId !== null` (never a slug check). The book rule uses `HadithBook.hasChapters` (option C: a book is chaptered or flat; never both).

## Shared building blocks (13a)

### New files (each with a colocated test; all under `apps/mobile/src/features/hadith/`)

| File | Contents |
| --- | --- |
| `routes.ts`, `routes.test.ts` | above |
| `availability.ts`, `availability.test.tsx` | `useHadithHomeEntry(): { tile: boolean; menuCard: boolean }`. `tile` = `useHadithAvailable()` (at least one pack installed). `menuCard` = `tile || useHadithCatalog().length > 0` (the catalogue lists a hadith collection, so a new user can reach the list and download the first pack; Open question 1). Both false until `useContentDb().ready` is true |
| `downloads.ts`, `downloads.test.ts` | the download store (below) |
| `number-text.ts`, `number-text.test.ts` | `hadithNumberText(input: { hadithNumber: string; numberFirst?: string \| null; numberLast?: string \| null }): string`. Returns `hadithNumber` unless **both** `numberFirst` and `numberLast` are non-empty and differ, then `` `${numberFirst}–${numberLast}` `` (an en dash U+2013). **Every number label in the reader, the cards, the saved list and the pager goes through this helper**, passing only `hadithNumber` today. The mobile types have no range field yet (step 6b section 11 adds `number_first` / `number_last` to the pack and the repositories); when they land, only the callers' arguments change. `formatHadithNumber` already leaves the dash in place and converts the digits (`5709–5712` → «٥٧٠٩–٥٧١٢») |
| `share-text.ts`, `share-text.test.ts` | `buildHadithShareText(input: { textAr: string; collectionTitle: string; bookTitle: string; numberText: string; creditLine: string; attribution: string \| null }): string` → `` `${textAr}\n\n${collectionTitle} · ${bookTitle} · ${numberText}\n${creditLine}` `` plus `` `\n${attribution}` `` when non-empty. `textAr` is the first segment, byte for byte |
| `saved-row-data.ts`, `saved-row-data.test.ts` | `toSavedRowData(item: SavedHadithItem): SavedHadithRowData` and `savedItemHref(item: SavedHadithItem): Href` (rules in 13c) |

### The download store — `downloads.ts`

Copy the shape of `src/features/reader/panels/tafsir-downloads.ts` (zustand store, `AbortController`s outside the store, `installResource` from `@/core/sync`):

```ts
export type HadithDownloadEntry = {
  status: 'downloading' | 'failed';
  progress: number; // 0 to 1
  /** 'wifi': Wi-Fi only is on and the device is not on Wi-Fi, nothing was started. 'network': the install could not reach the network. */
  reason?: 'wifi' | 'network';
};
export const useHadithDownloads: UseBoundStore<StoreApi<{
  byId: Record<number, HadithDownloadEntry>;
  start: (resourceId: number) => Promise<void>;
  cancel: (resourceId: number) => void;
}>>;
export function resetHadithDownloads(): void; // aborts controllers, clears the store (tests)
export function downloadStateFor(
  resourceId: number,
  installed: boolean,
  sizeBytes: number,
  offline: boolean,
  byId: Record<number, HadithDownloadEntry>,
): CollectionDownloadState; // maps to the step 12 type
```
- `start(id)`: ignore if already `downloading`. If `getWifiOnlyDownloads()` is true and the device is not on Wi-Fi (same `expo-network` call as `networkGate`), set `{ status: 'failed', progress: 0, reason: 'wifi' }` and return. Else set `downloading` 0, call `installResource(id, { onProgress, signal })`, and on `installed` remove the entry; on `cancelled` remove it; on `failed` set `{ status: 'failed', progress: 0, reason: result.reason === 'network' ? 'network' : undefined }`. A thrown error sets `failed`.
- `downloadStateFor`: `installed` → `{ kind: 'installed' }`; entry `downloading` → `{ kind: 'downloading', progress }`; entry `failed` → `{ kind: 'failed' }`; else `{ kind: 'available', sizeBytes, offline }`.
- Tests (`downloads.test.ts`, mock `@/core/sync` and `expo-network` and the audio settings): `it('starts an install and tracks progress')`, `it('removes the entry when the install finishes')`, `it('removes the entry when the install is cancelled')`, `it('marks the entry failed with reason network when the install cannot reach the network')`, `it('does not start twice for the same resource')`, `it('cancel aborts the running install')`, `it('does not start on cellular when Wi-Fi only is on and records reason wifi')`, `it('starts on Wi-Fi when Wi-Fi only is on')`, `it('starts on cellular when Wi-Fi only is off')`, `it('downloadStateFor maps installed, downloading, failed and available')`.

## 13a — Collections list and the download sheet

### Components to create (`src/features/hadith/components/`, each with a test)

| Component | Props and content |
| --- | --- |
| `HadithListCredit` | `{ testID? }`. The footer under the collections list (frame `HadithCollList`: «المصدر: fawazahmed0/hadith-api · Unlicense», 12 pt muted, centred, `UiText variant="label" weight={400} tone="muted"`, text `t('hadith.list.credit')`; this is **UI chrome, not hadith text**, so centring is correct here) |
| `HadithDownloadProgress` | `{ percent: number /* 0..1 */; onCancel: () => void; testID? }`. The sheet's progress block (frame `HadithCollDownload`): text `t('hadith.download.progress', { percent: formatPercent(Math.round(clamped*100), locale) })` (`UiText variant="subhead"`), a 4 pt bar (same track and fill tokens as `CollectionRow`'s bar: `theme.size.progressHeight`, `theme.radius.progress`, `colors.line` and `colors.brand`, `accessibilityRole="progressbar"`, `accessibilityValue`), and a text button `t('hadith.download.cancel')` (`minHeight 44`, `UiText variant="body" weight={600} tone="brand"`, role `button`) |
| `HadithDownloadSheet` | The sheet body. Props: `{ title: string /* collection title */; slug: string \| null; coverTitle: string \| null; sizeBytes: number; state: CollectionDownloadState; wifiOnly: boolean; onWifiOnlyChange: (on: boolean) => void; waitingForWifi: boolean; onDownload: () => void; onCancel: () => void; onRetry: () => void; onClose: () => void; testID? }`. Top to bottom: `SheetHeader` (`title` `t('hadith.download.sheetTitle')`, `onClose`, `closeLabel` `t('hadith.download.close')`); a row with `CollectionCover size="compact"` and the collection title (Amiri, `UiText variant="displaySm"`, `style { fontSize: 19, lineHeight: 33 }`); a row `t('hadith.download.size')` / `t('ui.download.size', { size: formatPackSizeMb(sizeBytes, locale) })`; `ToggleRow` `t('hadith.download.wifiOnly')`; then by `state.kind`: `available` → `Button` primary regular `t('ui.download.start')` (`onDownload`; **not drawn in the frame**, Open question 5); `downloading` → `HadithDownloadProgress`; `failed` → `UiText` `t('ui.download.failed')` in `colors.danger` and a `Button` `t('hadith.download.retry')`; `installed` → nothing (the screen closes the sheet). When `waitingForWifi` is true a muted `caption` line `t('hadith.download.waitWifi')` shows above the button. Always last: the note `t('hadith.download.offlineNote')` (`UiText variant="caption" tone="muted"`). Rows are separate cards? No: this is a sheet; use one `Card` with the size and toggle rows divided by `Divider`, as the frame groups them |

### Screens to create (`src/features/hadith/screens/`, each with a test)

**`HadithCollectionsScreen`** (frames `HadithCollList`, `Dark`, `English`, `Untitled*`, `Offline`, `OfflineDownloaded`, `DownloadFailed`, `Loading`, `Error`). Composition:
- `Screen` > `ContentColumn gutter={theme.size.gutterHome}` > column with `paddingTop theme.space[2]`, `gap theme.space[4]`.
- `HadithListHeader` `title={t('hadith.title')}` (size `lg`), `onBack={() => goBackOr(hadithHref.homeTab)}`, `trailing`: a row of two `IconButton variant="raised"`: search (`{ ios: 'magnifyingglass', android: 'search' }`, label `t('hadith.list.search')`, → `hadithHref.search`) and, only when some entry is not installed, downloads (`{ ios: 'arrow.down.to.line', android: 'download' }`, label `t('hadith.list.downloads')`). Frame order: search then downloads.
- Data: `entries = useHadithCatalog()`, `installed = useInstalledHadithCollections()`, `byId = useHadithDownloads(s => s.byId)`, `online = useOnline()`, `{ ready } = useContentDb()`.
- Rows: one `CollectionRow` per entry, in `HADITH_COLLECTION_ORDER` position (entries whose `slug` is null or unknown last, by `resourceId`), 12 apart. `CollectionRowData`: for an installed entry take the matching `HadithCollection` (match on `resourceId`): `slug`, `number`, `titleAr`, `titleEn`, `authorAr`, `authorEn`, `totalHadith`, `booksCount`, `soleBook = soleBookId !== null`. For a not-installed entry: `slug = entry.slug`, `number = entry.slug === null ? 0 : hadithCollectionNumber(entry.slug)` (use the step 10 fallback numbering for an unknown slug; do not invent one: if `hadithCollectionNumber` returns a value use it), `titleAr = entry.nameAr`, `titleEn = entry.name`, authors `null`, counts `null`, `soleBook false`. `state = downloadStateFor(entry.resourceId, entry.installed, entry.packSizeBytes, !online, byId)`.
- Handlers per the navigation map. `onPress` of a not-installed row does nothing but is still a button (the row's pill is the action); an installed row opens the collection.
- Footer: `HadithListCredit`.
- States: `!ready` → `HadithStateView kind="loading"`; `ready && entries.length === 0 && !online` → `offlineEmpty`; `ready && entries.length === 0 && online` → `error` with `onAction={() => { void runDeviceContentSync(); }}`. (The global offline strip is `MainShell`'s; do not draw another.)
- `testID="screen-hadith-collections"`.

**`HadithDownloadSheetScreen`** (frame `HadithCollDownload`; route reads `resource` from `useLocalSearchParams`, parsed to an integer; a missing or unknown resource shows the not-found state inside the sheet). Composition: `HadithDownloadSheet` with: the entry from `useHadithCatalog()` (title = `collectionTitle` of the same `CollectionRowData` mapping as the list; extract that mapping into `src/features/hadith/collection-row-data.ts` + test and use it in both screens), `state = downloadStateFor(...)`, `wifiOnly = useAudioSettings(s => s.wifiOnlyDownloads)`, `onWifiOnlyChange = setWifiOnlyDownloads`, `waitingForWifi = byId[id]?.reason === 'wifi'`, `onDownload/onRetry = start(id)`, `onCancel = cancel(id)`, `onClose = () => goBackOr(hadithHref.home)`. When the entry becomes installed (effect on `state.kind === 'installed'`), close the sheet. Route file `app/hadith/downloads.tsx` wraps it like `app/reader-settings.tsx` (`Stack.Screen options={sheetScreenOptions}` + `SheetHost`).

**`HadithSearchScreen`** — a **stub**: `Screen` > `ContentColumn` > `HadithListHeader` (back only, no title) + `HadithSearchField` (`value ''` local state, `onSubmit` no-op, `onCancel = goBackOr(hadithHref.home)`, `autoFocus`). No results logic. Step 14 replaces the body. `testID="screen-hadith-search"`.

### 13a tests (exact `it` names)

`HadithListCredit.test.tsx`, `HadithDownloadProgress.test.tsx`, `HadithDownloadSheet.test.tsx`, `collection-row-data.test.ts`, `availability.test.tsx`, `downloads.test.ts`, `routes.test.ts`, `number-text.test.ts` plus the screens below. Component tests follow the step 12 checklist (both locales, roles and labels, tokens, no raw colour, start/end, `maxFontSizeMultiplier` on own text).

- `HadithListCredit.test.tsx`: `renders in Arabic and English`, `is centred muted text`, `has no raw colour literal`.
- `HadithDownloadProgress.test.tsx`: `shows the percent with Arabic digits in Arabic`, `draws a 4 pt bar at the given percent with progressbar role`, `clamps the percent to 0 to 1`, `calls onCancel from a 44 pt text button`.
- `HadithDownloadSheet.test.tsx`: `shows the title, the cover, the size and the Wi-Fi toggle`, `available shows the download button and calls onDownload`, `downloading shows the progress block and calls onCancel`, `failed shows the failed text and a retry button`, `installed shows no action button`, `shows the offline note in every state`, `shows the wait-for-Wi-Fi line only when waitingForWifi`, `the Wi-Fi toggle reports its change`, `the close button calls onClose`, `formats the size with Arabic digits in Arabic`.
- `number-text.test.ts`: `returns the number when there is no range`, `joins a range with an en dash`, `ignores a range whose ends are equal`, `ignores a half range`, `does not parse decimals (3.1 stays 3.1)`, `works with formatHadithNumber to give ٥٧٠٩–٥٧١٢ in Arabic`.
- `share-text.test.ts`: `starts with the stored text byte for byte`, `adds the meta line and the credit`, `adds the attribution line only when given`, `keeps a text with diacritics and U+200F untouched`.
- `availability.test.tsx`: `tile is false until a pack is installed`, `menuCard is true when the catalogue lists a collection even if none is installed`, `both are false while the content database is not ready`, `both are true when a pack is installed`.
- `collection-row-data.test.ts`: `maps an installed collection with its counts`, `marks a single-book collection as soleBook`, `maps a not-installed entry with the catalogue names and no counts`, `uses the neutral cover (slug null) when the entry has no slug`, `keeps a null title null`.
- `HadithCollectionsScreen.test.tsx` (mock the hooks and `expo-router`): `renders in Arabic and English`, `lists installed, available, downloading and failed rows from the catalogue`, `orders rows by the fixed collection order`, `an installed row opens the collection`, `the download pill opens the sheet for that resource`, `the cancel button cancels the install`, `the retry button restarts the install`, `shows the credit footer`, `the header search button opens search`, `the header downloads button shows only when something is not installed`, `shows the loading state before the content database is ready`, `shows the offline state when the catalogue is empty and the device is offline`, `shows the error state with a retry that runs a content sync`, `offline: installed rows still open and available rows are disabled with the offline pill`, `makes no network request on mount or on a row press` (spy on `global.fetch`), `shows no grade text`.
- `HadithDownloadSheetScreen.test.tsx`: `shows the sheet for the resource in the URL`, `starts the download from the button`, `shows progress and cancels`, `closes when the collection becomes installed`, `shows not-found for an unknown resource`, `the Wi-Fi toggle writes the audio setting`, `shows the wait-for-Wi-Fi line when the store records reason wifi`.
- `HadithSearchScreen.test.tsx`: `renders the search field and cancel in Arabic and English`, `cancel goes back`.

## 13b — Browse screens

### Components to create

| Component | Props and content |
| --- | --- |
| `HadithHadithList` | The paged list of hadith cards used by the book, chapter and single-book screens. Props: `{ items: HadithListItem[]; hasMore: boolean; onLoadMore: () => void; onOpen: (item: HadithListItem) => void; savedNumbers?: ReadonlySet<string>; header?: ReactElement; bottomInset?: number; testID? }`. A `FlatList` of `HadithCard` (`numberOfLines` default 3, `saved={savedNumbers?.has(item.hadithNumber)}`), `ItemSeparatorComponent` = a 12 pt `View`, `onEndReached={onLoadMore}` (only when `hasMore`), `ListHeaderComponent={header}`, `keyExtractor` `` `${item.id}` ``, `contentContainerStyle { paddingBottom: bottomInset }`. The number text passed to the card comes from `hadithNumberText` |
| `HadithBookList` | The books of a collection. Props: `{ books: HadithBook[]; header?: ReactElement; compact?: boolean; selectedBookId?: number; onOpen: (book: HadithBook) => void; testID? }`. `FlatList` of `BookRow` (12 apart), `header` as `ListHeaderComponent` |
| `HadithChapterList` | `{ chapters: HadithChapter[]; header?: ReactElement; onOpen: (chapter: HadithChapter) => void; testID? }`. `FlatList` of `ChapterRow` (12 apart) |

### Screens

All four use `Screen` > `ContentColumn gutter={theme.size.gutterHome}` and `useTabContentBottom()` is **not** used (pushed screens have no tab bar; use `theme.space[8]` bottom padding like `AzkarDownloadsScreen`). Each shows `HadithStateView kind="loading"` until `useContentDb().ready`, and the **not-found state** when ready and the thing is undefined (new `HadithStateView` kind `notFound`, see section 7; action «تصفّح المجموعات» → `router.replace(hadithHref.home)`).

**`HadithCollectionScreen`** (`slug` from params). `collection = useHadithCollection(slug)`.
- Multi-book (`soleBookId === null`; frames `HadithCollBooks`, `Dark`, `English`, `Untitled*`): `HadithBookList` with `header` = `HadithListHeader` (back, `trailing` search `IconButton` raised, no title) above `CollectionHeader variant="centered"` (`collection` mapped as in 13a, `totalHadith`, `booksCount`, `soleBook false`, `attribution null`). The frame shows the credit inside the header block (the `HadithSourceLine` that `CollectionHeader` draws). `books = useHadithBooks(slug)`.
- Single-book (`soleBookId !== null`; frames `HadithCollSingle`, `Dark`, `English`): `HadithHadithList` of `useBookHadith(slug, soleBookId)` with `header` = `HadithListHeader` (back, search) above `CollectionHeader variant="inline"` (`soleBook true`). Hadith cards open the reader. No books screen, no `book` route push.
- `testID="screen-hadith-collection"`.

**`HadithBookScreen`** (`slug`, `book` → `bookId`). `book = useHadithBook(slug, bookId)`, `collection = useHadithCollection(slug)`.
- Header: `HadithListHeader titleSize="md"` `title={bookTitle(book, locale, t)}`, `subtitle=` `` `${collectionTitle(collection…)} · ${countHadith(book.hadithCount…)}` ``, back → `goBackOr(hadithHref.collection(slug))`, trailing search.
- `book.hasChapters` → `HadithChapterList` (`useBookChapters`; frame `HadithCollChapters`, subtitle is the collection title only); else `HadithHadithList` (`useBookHadith`; frame `HadithCollBook`). The two never show together (option C).
- `testID="screen-hadith-book"`.

**`HadithChapterScreen`** (`slug`, `book`, `chapter`). `chapter` = the entry of `useBookChapters(slug, bookId)` whose `id` equals the param; `useChapterHadith(slug, chapter.id)`. Header `titleSize="lg"`, `title={chapterTitle(chapter…)}`, `subtitle=` `` `${bookTitle(book…)} · ${collectionTitle(collection…)}` ``. Frame `HadithCollChapterHadith`. `testID="screen-hadith-chapter"`.

**Saved marks on lists:** `savedNumbers` = the set of `hadithNumber` of `useHadithBookmarks()` rows whose `collectionSlug` equals the screen's slug (a `useMemo` in the screen). If the step 11 hooks are unavailable at this point, pass no set (cards show no glyph) and note it in the report.

### 13b tests (exact names)

- `HadithHadithList.test.tsx`: `renders one card per item 12 apart`, `calls onOpen with the item`, `calls onLoadMore near the end only when hasMore`, `marks saved numbers`, `renders the header`, `shows a decimal number as given`, `passes the stored text through byte for byte`.
- `HadithBookList.test.tsx`: `renders one row per book 12 apart`, `calls onOpen with the book`, `marks the selected book`, `uses compact rows when asked`, `shows «كتاب n» for an untitled book in Arabic`.
- `HadithChapterList.test.tsx`: `renders one row per chapter in the given order`, `calls onOpen with the chapter`, `shows the Arabic chapter title in the English UI`.
- `HadithCollectionScreen.test.tsx`: `renders in Arabic and English`, `multi-book: shows the centred header and one row per book`, `multi-book: a book row opens the book`, `single-book: shows the inline header and the hadith list directly`, `single-book: a hadith card opens the reader`, `single-book: does not render a books list`, `decides single-book from soleBookId, not from the slug`, `shows the numbered fallback for an untitled collection`, `shows not-found for a collection that is not installed`, `shows the loading state before the content database is ready`, `the search button opens search`, `shows no grade text`.
- `HadithBookScreen.test.tsx`: `a book without chapters lists its hadith`, `a book with chapters lists its chapters and no hadith`, `a chapter row opens the chapter list`, `a hadith card opens the reader`, `shows the book title and count in the header`, `shows «كتاب n» for an untitled book`, `shows not-found for an unknown or non-numeric book id`, `loads the next page near the end`, `renders in Arabic and English`.
- `HadithChapterScreen.test.tsx`: `lists the chapter's hadith in order`, `shows the Arabic chapter title in the English UI`, `shows not-found for an unknown chapter`, `a hadith card opens the reader`, `back returns to the book`.

These screen tests use `loadHadithDevFixtures(db)` through a mocked `openContentDb` for the multi-book (`fixture-multi`, includes a chaptered book and a flat book) and single-book (`fixture-single`) cases, and the real hooks. Read the fixture file for the actual book and chapter ids; do not hard-code them.

## 13c — Reader and Saved

### Components to create

| Component | Props and content |
| --- | --- |
| `HadithReaderHeader` | The reader's top row (frame `HadithCollReaderPlain`): `{ collectionTitle: string; bookTitle: string; saved: boolean; onBack: () => void; onToggleSave: () => void; onCopy: () => void; onShare: () => void; testID? }`. Row, `alignItems: 'center'`, gap 8: back `IconButton variant="raised"` (same constant and `mirrorInRtl` as `HadithListHeader`, label `t('hadith.back')`), `HadithBreadcrumb` (`flex: 1`), `HadithToolbar` |
| `HadithReaderContent` | The scrollable reading column, shared by the phone reader and the expanded reader pane (13e): `{ data: HadithReaderData; totalHadith: number \| null; saved: boolean; onToggleSave; onCopy; onShare; onPrevious: () => void; onNext: () => void; showHeader: boolean; onBack: () => void; fontScale?: number; testID? }`. Renders `HadithReaderHeader` (when `showHeader`), a `ScrollView` with `HadithReaderCard` (`hadithNumber={hadithNumberText({ hadithNumber })}`, `text={textAr}`, `chainEnd={null}`, `attribution={collection.attributionAr || null}`, `sourceUrl={hadith.sourceUrl}`), and `HadithPager` below it (`hasPrevious={previous !== null}`, `position={hadithNumberText(...)}`, `total={totalHadith}`). **No grade section.** The reader card's text is never centred |

### Screens

**`HadithReaderScreen`** (frames `HadithCollReaderPlain`, `Reader`, `ReaderDark`, `ReaderEnglish`; not `ReaderGrade`, which is the future grade state and is not built). `slug`, `number` from params; `data = useHadithReader(slug, number)`; `collection = useHadithCollection(slug)`.
- Not ready → loading; ready and `data === undefined` → not-found.
- Titles: `collectionTitle(data.hadith.collection, locale, t)`, `bookTitle(data.hadith.book, locale, t)`.
- Bookmark: `saved = useIsHadithBookmarked(slug, data.hadith.hadithNumber)`; toggle: `toggleHadithBookmark({ slug, hadithNumber: data.hadith.hadithNumber, bookNumber: data.hadith.book.bookNumber })` inside try/catch (an error leaves the live state as it was). Offline-first: a synchronous write.
- Copy: `buildHadithShareText({ textAr, collectionTitle, bookTitle, numberText, creditLine: t('hadith.source.credit'), attribution: collection.attributionAr || null })`, then the lazy `require('expo-clipboard')` pattern of `AyahActionsPanel` (`setStringAsync` in try/catch) and `AccessibilityInfo.announceForAccessibility(t('hadith.reader.copied'))`. Share: `void Share.share({ message })` with the same text. Copy and share are allowed with the source line (plan open question 12, decided).
- Previous / next: `router.replace(hadithHref.reader(slug, ref.hadithNumber))`. The hooks already cross book and chapter boundaries in `position` order.
- Last-read: an effect on `data.hadith.hadithNumber` calls `saveHadithReadingPlace({ slug, hadithNumber: data.hadith.hadithNumber, bookNumber: data.hadith.book.bookNumber })` in try/catch. No UI reads it in this step (Open question 12).
- `testID="screen-hadith-reader"`. No source link when `sourceUrl` is null (the component already does this).

**`HadithSavedScreen`** (frames `HadithCollSaved`, `SavedEmpty`, `SavedUnverified`). `items = useSavedHadithItems()`.
- `HadithListHeader` `title={t('hadith.saved.title')}` (`lg`), back → `goBackOr(hadithHref.home)`.
- Empty → `HadithStateView kind="savedEmpty"` with `onAction={() => router.replace(hadithHref.home)}`.
- `UnverifiedNotice` above the list when any `item.saved.unverified` is true.
- `SavedHadithRow` per item, 12 apart, newest first (the hook's order); `saved={toSavedRowData(item)}`, `onPress={() => router.push(savedItemHref(item))}`.
- `testID="screen-hadith-saved"`.

### Helpers (13c)

`toSavedRowData(item)`:
- `collection`: `item.collection` → `{ number, titleAr, titleEn }`; null → `{ number: hadithCollectionNumber(item.saved.collectionSlug), titleAr: null, titleEn: null }`.
- `book`: `item.book` → `{ bookNumber, titleAr, titleEn }`; null → `{ bookNumber: item.saved.bookNumber, titleAr: null, titleEn: null }`.
- `unverified = item.saved.unverified || item.hadith === null`.
- `hadithNumber = unverified ? null : item.hadith.hadithNumber`; `textAr = unverified ? null : item.hadith.textAr` (byte for byte).

`savedItemHref(item)`: verified (`!unverified && openNumber !== null`) → `hadithHref.reader(slug, openNumber)`; else `item.collection !== null && item.book !== null` → `hadithHref.book(slug, item.book.id)`; else `item.collection !== null` → `hadithHref.collection(slug)`; else `hadithHref.home`.

### 13c tests (exact names)

- `HadithReaderHeader.test.tsx`: `renders in Arabic and English`, `shows the back button, the breadcrumb and the toolbar`, `calls onBack, onToggleSave, onCopy and onShare`, `mirrors the back chevron in Arabic`, `shows the saved state on the bookmark button`.
- `HadithReaderContent.test.tsx`: `shows the reader card with the number label, the text and the source line`, `shows the pager with the number and the collection total`, `disables previous at the start and next at the end`, `shows a single number today`, `shows the range for a merged number when the caller passes one` (call the content with a `numberFirst`/`numberLast` through the helper; if the prop is not part of the component yet, assert via `hadithNumberText` in `number-text.test.ts` only and omit this test), `hides the header when showHeader is false`, `draws no grade section`, `passes the stored text through byte for byte`, `never centres the text`.
- `saved-row-data.test.ts`: `maps a verified item with its text and number`, `marks an item unverified when the saved flag is set`, `marks an item unverified when the hadith can no longer be found`, `falls back to the saved book number when the book is missing`, `falls back to the numbered collection when the collection is not installed`, `href: opens the reader for a verified item`, `href: opens the book for an unverified item`, `href: opens the collection when the book is unknown`, `href: opens the list when the collection is not installed`, `keeps the stored text byte for byte`.
- `HadithReaderScreen.test.tsx`: `renders in Arabic and English`, `shows the number label, the text and the source line without a link`, `shows the fallback titles when the collection and book are untitled`, `the bookmark button saves and removes the hadith by slug and number`, `the bookmark state is read from the live hook`, `copy writes the text with the source line to the clipboard and announces it`, `share passes the same text to Share`, `copy and share keep the stored text byte for byte`, `next replaces the route with the next hadith, across a book boundary`, `previous is disabled at the start of the collection`, `saves the reading place when the hadith opens`, `shows not-found for an unknown hadith number`, `shows loading before the content database is ready`, `works with no network` (spy on `global.fetch`; never called), `shows no grade text even when the pack holds a grade row` (insert one `hadith_grades` row with the text `FIXTURE grade` and grader `FIXTURE grader` into the content test db — read migration `0012_hadith_tables.sql` for the exact columns — and assert neither string is rendered and the table is not queried by screen code), `shows the single number for a decimal hadith number`.
- `HadithSavedScreen.test.tsx`: `renders in Arabic and English`, `lists saved items newest first`, `a verified row opens the reader`, `an unverified row opens its book`, `shows the notice only when an item is unverified`, `shows the empty state with a browse action`, `shows an item whose collection was removed at book level without a preview`, `reads only the personal tables and the pack, never the network`.

## 13d — Entry points

### Home tile
- In `src/features/home/screens/HomeScreen.tsx`: `const hadithEntry = useHadithHomeEntry();` and a tile inserted **second, right after Surahs** (the `Main` frame order: السور, الحديث, المحفوظات, القرّاء), shown only when `hadithEntry.tile`:
  `{ icon: HADITH_ICON, key: 'hadith', label: t('hadith.home.tile'), onPress: () => router.push(hadithHref.home) }` with `const HADITH_ICON: IconName = { ios: 'quote.opening', android: 'format_quote' };`. Add the imports next to the Azkar and Duas ones.
- Update `HomeScreen.test.tsx`: add a mock of `@/features/hadith/availability` like `mockDuas` (`const mockHadith = { tile: false, menuCard: false }`, default false in `beforeEach`). The existing test `renders the Surahs, Duas, Misbaha, Saved and Reciters tiles without Azkar content` keeps asserting `queryByRole('button', { name: 'الحديث' })` is null (hadith tile false) and the tile count of 5. New tests: `shows the Hadith tile when a hadith pack is installed`, `the Hadith tile opens the collections list`, `puts the Hadith tile second, after Surahs`, `hides the Hadith tile when no pack is installed`, `labels the Hadith tile in English as Hadith`.
- The `#Hadith` link in the old HadeethEnc frames (`frames/duas/DuasHome*.html`, `frames/hadith-daily/*`) is a **frame** link; no app code refers to it (checked: `apps/mobile` has no `#Hadith` target). The Duas screens keep their own `duasHref.hadith*` routes (deferred HadeethEnc). Nothing to retarget in code (Open question 17).

### Menu card
- New `src/features/hadith/components/MenuHadithCard.tsx` (+ test), the pattern of `MenuDuasCard`: `{ onPress; testID = 'menu-card-hadith' }` renders `MenuCard` with `icon={MENU_HADITH_ICON}` (`{ ios: 'quote.opening', android: 'format_quote' } as const`, exported), `caption={t('hadith.menu.caption')}`, `title={t('hadith.menu.title')}`, `preview={t('hadith.menu.subtitle')}`.
- In `MenuScreen.tsx`: `const hadithEntry = useHadithHomeEntry();` and, right after the Duas card in the `cards` array: `hadithEntry.menuCard ? <MenuHadithCard key="hadith" onPress={() => router.push(hadithHref.home)} /> : null`. (The frame `HadithCollMenu` puts it after the Hijri and Moon cards and before Khatma; the app's card order differs from that frame already, and the Azkar and Duas cards sit in that area, so after Duas is the least disruptive. Open question 11.)
- Update `MenuScreen.test.tsx` (mock `@/features/hadith/availability`): `shows the Hadith card when a hadith pack is installed`, `shows the Hadith card when the catalogue lists a collection but none is installed`, `hides the Hadith card when there is nothing to show`, `the Hadith card opens the collections list`, `does not change the other cards when the Hadith card is hidden`.
- `MenuHadithCard.test.tsx`: `renders in Arabic and English`, `is one button labelled caption, title and preview`, `calls onPress`, `has no raw colour literal`.

### Sources rows
`SourcesScreen.tsx` today builds `reader.sources.${key}.title/subtitle`. Change `SOURCES` entries to carry an optional `i18n` prefix: `{ key, url, ltr?, i18n?: string }`; the title and subtitle keys become `` `${source.i18n ?? 'reader.sources'}.${source.key}.title` `` (and `.subtitle`). Existing rows are untouched. **Append three rows after `fonts`** (the order of `HadithCollSources`, where the fawazahmed0 row is last):

| key | url | i18n prefix | Title (ar / en) | Subtitle (ar / en) |
| --- | --- | --- | --- | --- |
| `fawazahmed0` | `https://github.com/fawazahmed0/hadith-api` | `hadith.sources` | `fawazahmed0/hadith-api` / same | نص الأحاديث · Unlicense / Hadith text · Unlicense |
| `openiti` | `https://creativecommons.org/licenses/by-nc-sa/4.0/` (the licence deed: ADR 0076 §8.5 asks for a licence link) | `hadith.sources` | OpenITI · مبادرة النصوص الإسلامية المفتوحة / OpenITI · Open Islamicate Texts Initiative | the ADR 0076 §8.3 wording below |
| `hadithapicom` | `https://hadithapi.com` | `hadith.sources` | hadithapi.com / same | عناوين الكتب / Book titles |

OpenITI subtitle (ADR 0076 §8.3, **proposed wording, developer to accept**; the last sentence of §8.3 is dropped because the gap-fill decisions of 7 Nov 2026 made it untrue, see Open question 6):
- Arabic: «عناوين الأبواب: OpenITI (مبادرة النصوص الإسلامية المفتوحة)، الإصدار 2023.1.8، الترخيص CC BY-NC-SA 4.0. أُجريت تعديلات: حُذفت رموز التنسيق من العناوين وربطت الأبواب بترقيم أحاديث fawazahmed0/hadith-api.»
- English: «Chapter titles: OpenITI (Open Islamicate Texts Initiative), release 2023.1.8, CC BY-NC-SA 4.0. Changes were made: formatting markers removed from titles; chapters mapped to the hadith numbering of fawazahmed0/hadith-api.»

**Condition: show all three rows always.** Reason: the credit must travel with the data wherever it can be on a device; the device has no `content_sources` table (the plan's "taken from `content_sources`" cannot be done on the device, so the text is i18n, kept equal to the `content_sources` wording by hand); the screen already lists HadeethEnc whether or not its pack is installed; D15 makes the Hadith release wait for chapters (6b), so OpenITI data exists in every shipped build; the book titles from hadithapi.com are already part of D9 (ADR 0042 §4a). A condition would need a pack flag the device does not have. The developer may remove the `hadithapicom` row (Open question 6c).

Update `SourcesScreen.test.tsx` (read it first; its row-count assertions change): `shows the fawazahmed0, OpenITI and hadithapi.com rows after the fonts row`, `each new row opens its URL`, `shows the OpenITI credit in Arabic and English`, `the OpenITI row links to the licence deed`, `keeps the existing rows and their order`.

### 13d tests also
`i18n` parity: the existing locale parity test must pass with every new key in both files.

## 13e — Expanded windows

Frames `HadithCollExpanded` and `HadithCollExpandedReader` (1194 × 834). Layout follows `useWindowClass()`: **only `'expanded'`** switches; compact and medium keep the phone screens. The frames draw the vertical rail (`nav aria-label="التنقل الرئيسي"`) at the start edge. Hadith routes are pushed on the root Stack (like Azkar and Duas), outside `MainShell`, so the rail is not drawn on them and `useTabRailSideInset()` is its default. Default: follow that precedent, with **no rail** on the hadith screens (Open question 4); the panes keep the frame's proportions.

### Components to create
| Component | Content |
| --- | --- |
| `HadithPaneLayout` | `{ start: ReactNode; end: ReactNode; side?: ReactNode; testID? }`. A row: `start` pane `width 340` (frame), `end` pane `flex: 1, minWidth: 0`, optional `side` pane `width 300` (the details panel); gaps `theme.space[4]`; the panes scroll independently. No fixed heights |
| `HadithExpandedBrowser` | `{ slug: string; initialBookId: number \| null; initialNumber: string \| null; testID? }`. Local state `{ bookId, number }`. Start pane: `CollectionHeader variant="inline"` then `HadithBookList compact selectedBookId` (books of the collection, `useHadithBooks`), `accessibilityLabel` `t('hadith.expanded.books')`. End pane: `number === null` → `HadithListHeader titleSize="md"` (book title; subtitle `collection · count`; back = `goBackOr(hadithHref.home)`; trailing search) + `HadithHadithList` of the selected book; `number !== null` → `HadithReaderContent showHeader` for that hadith (with `onBack` = clear `number`), and `side` = `HadithDetailsPanel` (collection, book, number, attribution, source). Tapping a book sets `bookId` and clears `number`; tapping a hadith sets `number`; previous/next set `number` (no router calls). A single-book collection has no start pane list (frame `HadithCollSingle` has none): render the end pane only |

### Wiring
- `HadithCollectionScreen`, `HadithBookScreen` and `HadithReaderScreen` each start with `const expanded = useWindowClass() === 'expanded'; if (expanded) return <HadithExpandedBrowser … />;` (initial book/number from the route: collection → first book; book → that book; reader → the hadith's book and number). The hooks that run before the early return must not change order: put the `expanded` check first, then call phone-only hooks inside child components (`HadithCollectionPhone`, etc.), **not** conditionally in the same component. Create the phone bodies as `HadithCollectionPhoneScreen`, `HadithBookPhoneScreen`, `HadithReaderPhoneScreen` in their own files if needed to keep hook order stable.
- The collections list and the chapter screens stay single-column inside `ContentColumn` on expanded windows (no frame draws a different layout).

### 13e tests
`HadithPaneLayout.test.tsx`: `renders start and end side by side`, `start is 340 wide and side is 300 wide`, `omits the side pane when none is given`, `uses start and end, never left and right`. `HadithExpandedBrowser.test.tsx` (window width mocked to 1194 × 834 via `useWindowDimensions`): `shows the books on the start side and the first book's hadith`, `tapping a book changes the list without navigating`, `tapping a hadith shows the reader and the details panel`, `previous and next change the hadith in place`, `a single-book collection shows only the hadith list`, `phone-width windows render the phone screens`, `shows no grade text`.

## 7. i18n additions (inside `hadith`; Arabic from the frames, English plain UI copy)

| Key | Arabic | English |
| --- | --- | --- |
| `hadith.home.tile` | الحديث | Hadith |
| `hadith.menu.caption` | الأحاديث | Hadith |
| `hadith.menu.title` | الحديث | Hadith |
| `hadith.menu.subtitle` | المجموعات والكتب | Collections and books |
| `hadith.list.search` | بحث في الحديث | Search hadith |
| `hadith.list.downloads` | التنزيلات | Downloads |
| `hadith.list.credit` | المصدر: fawazahmed0/hadith-api · Unlicense | Source: fawazahmed0/hadith-api · Unlicense |
| `hadith.saved.title` | المحفوظات | Saved |
| `hadith.download.sheetTitle` | تنزيل المجموعة | Download collection |
| `hadith.download.size` | الحجم | Size |
| `hadith.download.wifiOnly` | على شبكة Wi-Fi فقط | Wi-Fi only |
| `hadith.download.cancel` | إلغاء | Cancel |
| `hadith.download.close` | إغلاق | Close |
| `hadith.download.offlineNote` | تعمل المجموعة بعد التنزيل دون إنترنت. | The collection works offline once downloaded. |
| `hadith.download.waitWifi` | يبدأ التنزيل عند الاتصال بشبكة Wi-Fi. | Download starts when you are on Wi-Fi. |
| `hadith.reader.copied` | تم النسخ | Copied |
| `hadith.states.notFoundTitle` | المحتوى غير متوفر | Not available |
| `hadith.states.notFoundBody` | قد لا تكون المجموعة محمّلة على هذا الجهاز. | The collection may not be downloaded on this device. |
| `hadith.expanded.books` | الكتب | Books |
| `hadith.sources.fawazahmed0.title` / `.subtitle` | fawazahmed0/hadith-api / نص الأحاديث · Unlicense | fawazahmed0/hadith-api / Hadith text · Unlicense |
| `hadith.sources.openiti.title` / `.subtitle` | OpenITI · مبادرة النصوص الإسلامية المفتوحة / (wording in 13d) | OpenITI · Open Islamicate Texts Initiative / (wording in 13d) |
| `hadith.sources.hadithapicom.title` / `.subtitle` | hadithapi.com / عناوين الكتب | hadithapi.com / Book titles |

Reuse (do not duplicate): `hadith.title`, `hadith.back`, `hadith.states.*`, `hadith.reader.*`, `hadith.source.credit`, `hadith.download.progress/retry/startFor/offlineUnavailable`, `ui.download.start/failed/size`.

`HadithStateView` (step 12 file) gains one kind, `notFound` (title `hadith.states.notFoundTitle`, body `hadith.states.notFoundBody`, action `hadith.states.browse`, icon `{ ios: 'book.closed', android: 'menu_book' }`). Extend its test with `notFound shows the title, the body and a browse action`. This is the only step 12 file this step edits.

## Placeholders
Arabic and English text in tests: `نص تجريبي ١ — ليس حديثًا`, `نَصٌّ تَجْرِيبِيٌّ مُشَكَّلٌ لِلْعَرْضِ فَقَطْ — لَيْسَ حَدِيثًا`, `[اسم المجموعة]`, `[اسم الكتاب]`, `[اسم الباب]`, `FIXTURE grade`, `FIXTURE grader`, slugs `fixture-multi`, `fixture-single`, numbers like `'1234'`, `'3.1'`, `'5709'`. Use the builders in `jest/hadith-ui-fixtures.ts`. The Sources subtitles above are source credits, not hadith text.

## 9. Visual check (after each part; the orchestrator reviews)

Mismatches with the frames are fixed before the part is done. Screenshots and renders go in `/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/687c3823-f84e-4b7e-af26-c7003bde091c/scratchpad/hadith-shots/` (never in the repo). **Never commit a screenshot, and never paste text read from a screenshot into a report**: real hadith text will be on screen. Compare layout, spacing, type size, colours and states only; the frames show bracketed placeholders where the app shows real titles.

### Seeding (no placeholder pack exists)
The app loads no placeholder content (the fixtures flag was removed on 2 Nov 2026; `dev-fixtures.ts` is test-only and no production code may import it, ADR 0042). So the simulator shows **real local data** from the API's pinned import. Steps, from the repo root:

1. Services: `brew services start mysql redis`. `cd apps/api && composer install && php artisan migrate`.
2. Import two small collections, one single-book and one multi-book, and build their packs (needs network once; ~tens of MB): `cd apps/api && php artisan hadith:import --download --build-packs --collection=nawawi40 --collection=abudawud`. Add `--collection=qudsi40` for a third row. If the importer refuses a collection (completeness, 6b.1), read its report and pick collections it accepts. The report is JSON under `apps/api/storage/app/hadith/reports/`; read counts only.
3. Serve: `cd apps/api && php artisan serve` (http://localhost:8000). Check: `curl -s http://localhost:8000/api/v1/content/manifest | python3 -c "import sys,json; d=json.load(sys.stdin); print([(r['id'], r.get('key'), r['pack_size_bytes']) for r in d['resources'] if r['group']=='hadith_collections'])"`. Expect one entry per imported collection with its slug in `key`.
4. App env: `apps/mobile/.env` has `EXPO_PUBLIC_API_URL=http://localhost:8000` (iOS simulator). No other variable.
5. Run: `cd apps/mobile && nvm use && npm ci` (first time), then `npx expo run:ios --device "iPhone 17"` the first time (builds the dev client, variant scheme `taybah-dev`), and `npx expo start --dev-client` afterwards. Boot the simulator first (`xcrun simctl boot "iPhone 17"; open -a Simulator`).
6. In the app: wait for the first content sync, open Menu → «الحديث» (the card shows once the catalogue lists the collections, Open question 1) → tap «تنزيل» on a row → the sheet → «تنزيل» → wait for the install. The list now shows the installed rows. To see a **mid-download** row, start the download and screenshot within a second or two (throttle by restarting `php artisan serve` is not needed; on a fast local server use a larger collection such as `abudawud`).
7. Deep links for direct screens: `xcrun simctl openurl booted "taybah-dev://hadith/nawawi40"`, `…/hadith/abudawud`, `…/hadith/nawawi40/hadith/1` (use a number that exists in the imported data).
8. Dark and English: `xcrun simctl ui booted appearance dark`; language and theme from the app's Settings (the same way earlier phases did).
9. Failed download: stop `php artisan serve`, tap download, screenshot, restart the server. Offline list: with the server stopped and nothing installed, the empty catalogue state appears only on a fresh install (clear the app's data); otherwise rely on the Jest state tests.

### Screenshot and frame commands (per screen)
```bash
cd /Applications/MAMP/htdocs/quran-app
OUT=/private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/687c3823-f84e-4b7e-af26-c7003bde091c/scratchpad/hadith-shots
mkdir -p "$OUT"
xcrun simctl io booted screenshot "$OUT/<name>-app.png"
python3 packages/design-tokens/scripts/frame-shot.py <FrameId> "$OUT/<name>-frame.png"   # 390 x 844 for phone frames
```
Compare each pair (the Read tool shows images).

| Screen | App state | Frame ids |
| --- | --- | --- |
| Collections list | installed, available, downloading | `HadithCollList`, `HadithCollListDark`, `HadithCollListEnglish` |
| Download sheet | in progress | `HadithCollDownload` |
| Failed download | server stopped | `HadithCollDownloadFailed` |
| Collection books | multi-book | `HadithCollBooks`, `HadithCollBooksDark`, `HadithCollBooksEnglish` |
| Single-book | `nawawi40` | `HadithCollSingle`, `HadithCollSingleDark`, `HadithCollSingleEnglish` |
| Book hadith list | a flat book | `HadithCollBook`, `HadithCollBookDark`, `HadithCollBookEnglish` |
| Reader | any hadith | `HadithCollReaderPlain`, `HadithCollReader`, `HadithCollReaderDark`, `HadithCollReaderEnglish` |
| Saved | after saving two hadith | `HadithCollSaved` (and `HadithCollSavedEmpty` before saving) |
| Search stub | the field only | `HadithCollSearch` (field and cancel only) |
| Menu card | card visible | `HadithCollMenu`, `MenuDark`-style check in dark |
| Home tile | one pack installed | `Main` (`frames/core/Main.html`: the frame id is `Main`) |
| Sources | scrolled to the new rows | `HadithCollSources` |
| Loading | right after launch | `HadithCollLoading` |
| Error / Offline | fresh install, server stopped | `HadithCollError`, `HadithCollOffline` |
| Expanded | iPad Pro 11-inch simulator, landscape (1194 × 834) | `HadithCollExpanded`, `HadithCollExpandedReader` (frame-shot renders them at 1194 × 834) |

There is no frame called `HadithCollStates`; the states are `Loading`, `Offline`, `OfflineDownloaded`, `DownloadFailed`, `Error`. **Not checkable on real data until later:** chaptered books (`HadithCollChapters*`, `HadithCollChapterHadith*`) need step 6b.5 data and the frames still carry the Sunnah.com caption (step 8b), so they are checked in step 16; `HadithCollUntitled*` needs a collection with null titles; `HadithCollSavedUnverified` needs an alias (step 18). Their behaviour is covered by the Jest tests.

Look especially at: justified RTL text and its last line; Amiri marks not clipped at 19/36 and 24/48; row heights (titles use Amiri's natural leading, a little taller than the frames, accepted in step 12); the 48 pt search field versus the frame's 46 (accepted); the shared `EmptyState` icon versus the frame's 120 pt illustration (accepted).

## 10. Gates

Tree guard (run before starting and after finishing; the two outputs must be identical):
```bash
cd /Applications/MAMP/htdocs/quran-app && git status --short -- apps/mobile/src/features/hadith/personal apps/mobile/src/core/db/user apps/mobile/src/features/hadith/types.ts apps/mobile/src/features/hadith/constants.ts apps/mobile/src/features/hadith/data apps/mobile/src/features/hadith/hooks apps/mobile/src/shared/ui packages screens apps/api
```

Gates, from `apps/mobile` (`source ~/.nvm/nvm.sh && nvm use`, Node 26), after **each** part and at the end:
```bash
npm run lint && npx tsc --noEmit && npm test
```
Known failures that are not yours: 4 tests in `__tests__/force-update-ios-route.test.tsx` (and `__tests__/tmp-steps.test.tsx` if it exists). Any other failing test is yours. Also run `npx jest src/features/hadith src/features/home src/features/menu src/features/reader/screens/SourcesScreen.test.tsx __tests__/router.test.tsx` as a quick loop while working. No dependency, native or `app.config.ts` change, so no `expo-doctor`, audit or fingerprint check is needed; no endpoint change, so no contract generation. Before the final report, grep: `grep -rn "left:\|right:\|marginLeft\|marginRight\|paddingLeft\|paddingRight" apps/mobile/src/features/hadith/screens apps/mobile/src/features/hadith/components` (no hit except `arabicTextDirection` uses) and `grep -rniE "grade" apps/mobile/src/features/hadith/screens` (no hit outside tests).

## Out of scope
Search logic, scope chips, history, highlighted results (step 14; only the entry button and the stub screen are here); offline, loading and error hardening beyond the states listed, Dynamic Type sweeps and resize-keeps-position (step 15); the exit check (step 16); grades and any grade UI (`HadithCollReaderGrade` is a future state); English hadith text; the real merged-number data and ranges (step 6b follow-ups; only the formatting helper is here); the `Sunnah.com` switch (step 18); the alias applier call (step 11 Open question 2); a continue-reading entry from last-read (no frame); Settings → Downloads storage rows for hadith; chapter frame changes (step 8b); expanded rail on pushed screens; new tokens, shared components or dependencies; editing frames, `screens/`, the API, `types.ts`, the personal layer or the data and hooks layers.

## Open questions (none is decided by the implementer; defaults are what this brief builds)

1. **Entry deadlock.** Hadith packs are not auto-selected and install only from the list (step 10), but the Home tile and Menu card are to show only once a pack is installed (plan decision 10). A new user could never reach the list. *Default (built):* the **Menu card** shows when a pack is installed **or** the synced catalogue lists a hadith collection; the **Home tile** shows only when a pack is installed. If you want the plan's literal rule, the Menu card needs another way in (for example a row in Settings → Downloads).
2. **Header «التنزيلات» button.** The frame `HadithCollList` draws it and links it to the download sheet, but the sheet draws one collection. *Default:* shown only while some collection is not installed; opens the sheet for the one downloading, else the first not-installed row.
3. **Saved list entry.** `HadithCollSaved` exists and the plan's route list has no saved route, but no frame draws a way to reach it (the list header has only search and downloads). *Default:* the route `/hadith/saved` and screen are built and tested, with **no visible entry** (frame-faithful). Without one, saved hadith are not reachable in the UI. Suggested: a bookmark `IconButton` in the collections list header, which needs a frame update first (ADR 0010), or a row in the Saved tab (`my-quran`).
4. **Rail on expanded windows.** The expanded frames draw the tab rail, but hadith routes are pushed over the tabs (as Azkar and Duas are), where `MainShell` and its rail are not shown. *Default:* no rail on the hadith screens, panes as in the frames. Moving Hadith into the tab layout is a larger change.
5. **Download sheet pieces the frame does not draw.** The frame shows the in-progress state only. *Default:* a «تنزيل» button for the not-started state, a retry button for failure, a wait-for-Wi-Fi line, auto-close on install. The «Wi-Fi only» toggle writes the existing global audio setting (`wifiOnlyDownloads`), and the hadith download store honours it (pack installs did not before). Say if Hadith needs its own setting.
6. **Sources.** (a) The OpenITI subtitle drops the last sentence of ADR 0076 §8.3 («لا يؤخذ من OpenITI نص حديث») because the gap-fill decisions make it untrue (6b Q4a); approve the final wording. (b) The credit is i18n text, not generated from `content_sources` (no such table on the device). (c) The hadithapi.com row (a `pending` source with no terms, RB16) is shown because its titles are already used (D9); remove it if you prefer. (d) All three rows show always (justified in 13d).
7. **Search button before step 14.** *Default:* the button and a stub route `/hadith/search` (field and cancel only) so there is no dead link. The alternative is to hide the button until step 14.
8. **`satisfies keyof paths` in `routes.test.ts`.** The plan's wording refers to the API-contract type; app routes in this repo are `as Href` builders with string assertions (Duas, Azkar). *Default:* the repo pattern.
9. **«Sidebar link» (plan step 13 row).** ADR 0051 removed the sidebar. *Default:* no sidebar entry.
10. **`notFound` state.** `HadithStateView` has no not-found kind. *Default:* add one (the only step 12 file edited).
11. **Order of the Home tile and Menu card.** Frame `Main` puts the Hadith tile second; the app also has Azkar, Duas and Misbaha tiles the frame lacks. *Default:* second, after Surahs; the Menu card after Duas. The Menu frame draws no caption on the card, while `MenuCard` requires one (Names and Duas pass one); *Default caption:* «الأحاديث».
12. **Last-read has no UI.** It is saved on every reader open; no frame shows a resume point. *Default:* save only.
13. **Merged numbers on the device.** The pack and the mobile types have no range field yet (6b section 11). *Default:* all labels go through `hadithNumberText`, which shows one number today; the data wiring is the 6b follow-up for steps 7b and 10.
14. **Simulator data is real.** There is no placeholder pack path. If you want one (for example a dev-only API seeder that builds a pack from the Pest fixtures), it is a separate API task. *Default:* the real local import above, with the rule that screenshots stay outside the repo and out of reports.
15. **Chapters.** `ChapterRow` and the chapter screens are built from the current frames (which still say «Sunnah.com» and show an English title placeholder; step 8b). They cannot be checked on real data before step 6b.5; step 16 does it.
16. **`HadithCollStates`** (named in the task) does not exist; the state frames are listed in section 9.
17. **The old `#Hadith` link.** Only frames link to it (`DuasHome*`, `hadith-daily/*`); no app code does. Retargeting those frames is a frame edit for the developer.

## Answers to the open questions (orchestrator, on the developer's behalf, 7 Nov 2026)

All defaults are accepted, with these specifics:
1. The Menu card shows when a pack is installed **or** the synced catalogue lists a hadith collection. The Home tile shows only with an installed pack.
2. Accepted.
3. Build `/hadith/saved`. **The entry is a bookmark icon button in the collections list header**, next to search and downloads (44 pt, same style; label «المحفوظات» / "Saved"). This frame change is approved by the orchestrator for the developer; note it in the step 8 brief's Approval section.
4. No rail on pushed hadith screens, as with Azkar and Duas.
5. Accepted (start, retry, wait-for-Wi-Fi line, auto-close; reuse `wifiOnlyDownloads`).
6. Keep all three Sources rows, with i18n text. Use the ADR 0076 Q4 wording from `step-06b-chapters-gaps.md` («عناوين الأبواب وبعض نصوص الأحاديث: مشروع OpenITI …», «بعض نصوص الأحاديث: hadithapi.com»).
7–13. Accepted. For 11, the caption is «الأحاديث» / "Hadith".
14. Use real local data as the brief describes.
15. Accepted.
16. Leave the frame links alone (the other session owns `screens/`).

Step 11's personal hooks are committed (`5d0c07d`) and exported from `src/features/hadith/personal`.
