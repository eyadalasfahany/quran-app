# Step 12 — Hadith UI components (one file and one test each, no screens)

Plan: `docs/plans/phase-7.md` ("Components (step 12)", the step 12 row and its tests row, D5 as updated 7 Nov 2026, D8, D9, D13, D14). Hadith ADR: `docs/adr/0042-hadith-collections-source.md` (§4 null titles, §6 no English hadith text, §10 covers). Approved frames (developer, 7 Nov 2026; `step-08-frames.md`, "Approval"): `screens/frames/hadith/HadithColl*.html` (ADR 0075). Sibling brief that owns the data types: `docs/plans/phase-7/step-10-mobile-content.md`.

## Read first
1. `.claude/agent-rules.md`, `CLAUDE.md`, `apps/mobile/CLAUDE.md`, `.agents/skills/apple-design/SKILL.md` (load `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `designing-for-ios.md`, `lists-and-tables.md`, `loading.md`, `dark-mode.md`, `cross-platform.md`).
2. `git branch --show-current` (expected `main`). **Do not commit, push, switch branches or add a dependency.** No package changes, so the release is an OTA update.
3. **Never write religious text.** Every hadith, book, chapter, collection and author string in a test or fixture is a marked placeholder (listed under "Test fixtures"). Never print religious text in a report: give counts, keys and paths.
4. Re-read before you edit the shared files: `apps/mobile/src/core/i18n/locales/ar.json` and `en.json` (append a block at the end only; another session may have edited them). Never rewrite a file from memory.

## Goal
Build the 24 components below (17 from the plan, 7 the frames need), each in its own file with a colocated test, plus three small helper modules. **No screen, route, hook, repository, store or i18n key outside `hadith.*`.** Screens are step 13 and search screens are step 14. Every component takes plain props, so it can be tested without a database.

## Rules that apply to every component
- **Hadith text is never altered.** Render the string you are given, byte for byte: no trim, normalise, re-encode or truncate in code (line clamping by `numberOfLines` is the only shortening). Splitting it into two spans at `chainEnd` must reproduce the original string exactly when joined.
- **Hadith text is never centred.** It is RTL, justified, with the last line at the start (frames: `text-align: justify; text-align-last: start`). It is always Arabic RTL in both UI languages (ADR 0042 §6, see Open question 3).
- **Amiri for hadith text.** Line height at least 2× in the reader (`dhikr`: 24 / 48) and at least 1.8× in previews (**36 for 19 pt**, the frames' value, 1.89×). `typeScale.dhikrList` is 19 / 34 (1.79×) and **fails the rule, so do not use it for hadith previews** (Open question 4).
- **The hadith text is the focus; the chrome is small and quiet.** Labels 12 to 13 pt, muted ink, hairlines only.
- **List rows are separate cards**, 12 gap between them (the screen sets the gap; each row is its own rounded card, radius 20 = `theme.radius.lg`).
- **The narrator chain** is drawn in `colors.brand` only when the caller passes `chainEnd` (a UTF-16 offset). fawazahmed0 does not mark it, so every caller passes `null` now and the text is one colour (`colors.ink`). The prop exists so a later source needs no component change.
- **Layout and tokens.** Colours, spacing, radii, strokes and type come from `useTheme()` / `useContrastColors()` and `UiText` / `displayText`. No raw `#` or `rgb(` literal in a component. Use `start` / `end` / `paddingStart` etc., never `left` / `right` (physical `left`/`right` only inside `arabicTextDirection`). Frame numbers that have no token (10, 14 and 18 spacings) become a named constant at the top of the file with the frame cited in a comment, as `CollectionCover.tsx` does.
- **No fixed heights on text or rows.** The frames set `height: 108px` / `72px` on clamped previews. Do **not** copy them: use `numberOfLines` plus `lineHeight`, and `minHeight` on rows, so Dynamic Type at the largest size never clips.
- **Text components.** Use `UiText` (it applies the window text factor and `maxFontSizeMultiplier = maxFontScale.content = 2`). Never set `fontWeight`; use `weight` (the per-weight font family).
- **Touch targets** are at least 44 × 44 (`theme.size.touchTarget`). Pressables use `opacity: pressed ? theme.opacity.pressed : 1` as `AzkarItemCard` does.
- **Icons** use `Icon` / `IconButton` with an `IconName` constant `{ ios: SFSymbol, android: AndroidSymbol }`. Directional glyphs pass `mirrorInRtl`.
- **Strings** are i18n keys `hadith.*` (ui keys that already exist are reused; see "i18n"). No hard-coded text. Number formatting: `formatNumber` from `@/core/i18n` for integers, `formatHadithNumber` (new, below) for hadith and book numbers (they are strings).
- **Colours map to tokens** (light values from `packages/design-tokens/src/colors.ts`; the dark frames use the same keys):

| Frame value | Token (`colors.`) |
| --- | --- |
| page `rgb(247,243,234)` | `surface` |
| card `rgb(255,253,248)` (dark `rgb(23,36,33)`) | `surfaceRaised` |
| hairline `rgb(231,223,204)` | `line` (use `useContrastColors()` so Increase Contrast works) |
| ink `rgb(19,35,31)`, muted `rgb(91,106,100)` | `ink`, `inkMuted` |
| brand `rgb(31,77,64)`, text on brand | `brand`, `onBrand` |
| medallion / pill fill `rgb(239,232,216)` | `fillSecondary` |
| number ring `rgb(160,124,51)` | `gold` |
| search match fill `rgb(243,227,181)` | `highlightGold` |
| failed text `rgb(163,57,43)` | `danger` |
| selected row fill `rgba(31,77,64,0.10)` | `glassSelected` |
| cover grounds, spine, ornament | already in `CollectionCover` (step 9); never re-implemented |

Every frame colour maps to an existing token; **step 12 adds no token.** If you meet a colour with no token, stop and report it.

## Existing code to reuse (paths checked)
- `apps/mobile/src/shared/ui/`: `CollectionCover` (props `slug: string | null`, `title: string | null`, `size: 'list' | 'header' | 'compact'` = 56 × 75, 96 × 128, 40 × 53; `accessibilityLabel`, `testID`), `Card` (`tone`, `radius`, `padding`, `bordered`), `UiText` (`variant`, `tone`, `weight`, `align`, `scale`, `style`), `displayText(token, scale)`, `arabicTextDirection`, `Icon`, `IconButton` (`icon`, `label`, `onPress`, `variant: 'plain' | 'filled' | 'track' | 'surface' | 'glass' | 'raised'`, `tone`, `pressed`, `disabled`, `mirrorInRtl`, `hint`, `testID`), `ToolbarPill` (the glass group), `Button` (`label`, `onPress`, `variant`, `size: 'small' | 'regular'`, `disabled`, `accessibilityLabel`; `small` is the 44 pt pill with a 13 / 600 label, exactly the frames' «تنزيل» pill), `EmptyState` (`title`, `body`, `action`, `icon`), `SearchField` (`value`, `onChangeText`, `placeholder`, `onSubmit`, `autoFocus`), `SkeletonGroup`, `SkeletonBlock` (`width`, `height`, `radius`, `tone`), `useContrastColors`, `BackButton`. (`BACK_ICON` is **not** exported from `@/shared/ui`; use a local constant, below.)
- Patterns to copy: `src/features/azkar/components/AzkarItemCard.tsx` (pressable card + label + test), `AzkarOfflinePill.tsx` (pill), `AzkarHomeSkeleton.tsx` (skeleton), `AzkarSearchBar.tsx` (back button + `SearchField`), `ReaderActionButtons.tsx` (bookmark and share icon names), `DhikrText.tsx` (display text with `displayText`).
- Tests: `apps/mobile/jest/render-ui.tsx` (`renderUi(ui, { locale, theme })`, `flatStyle`, `locales`), `apps/mobile/jest/feature-ui-source.ts` (`rawColorLiteralsInFeature('src/features/hadith/components/X.tsx')` returns the raw literals found; expect `[]`), `apps/mobile/jest/azkar-ui-fixtures.ts` (`press`).
- Existing ui keys reused, not duplicated: `ui.download.start` («تنزيل»), `ui.download.cancel` («إيقاف التنزيل»), `ui.download.failed` («تعذّر التنزيل»), `ui.download.size` («{{size}} م.ب» / «{{size}} MB»), `ui.clearSearch`.
- The existing nested `duas.hadith` block in the locales is a different thing (deferred HadeethEnc). There is **no** top-level `hadith` key today; add one.

## Types — `src/features/hadith/types.ts` (shared with step 10)
Step 10 (`step-10-mobile-content.md`, section 1) runs in parallel and creates this same file. **Rule: whichever step lands first creates the file; the other reuses it unchanged.**
- If `apps/mobile/src/features/hadith/types.ts` does **not** exist when you start, create it with exactly the block below (types only, no imports, no functions, no constants).
- If it exists, **do not edit it.** Compare it with the block. If any name, field, type or nullability differs, **stop and report**; never rename a field, never add one, never copy the types into another file.
- If a component needs a field the block lacks, it takes it as its own prop (see the component tables). Do not edit `types.ts` for it; list it under Open questions.

```ts
/** One installed hadith collection (a row of `hadith_collections`, one per pack). */
export type HadithCollection = {
  resourceId: number;
  id: number;
  /** Canonical slug: `bukhari`, `muslim`, `abudawud`, `tirmidhi`, `ibnmajah`, `nasai`, `malik`, `nawawi40`, `qudsi40`, `shahwaliullah40`. */
  slug: string;
  /** Fixed 1-based position of the slug in `HADITH_COLLECTION_SLUGS`; the n in «مجموعة {n}». Unknown slugs get 11, 12, ... in resource-id order. */
  number: number;
  /** Null until the developer supplies the name. Never replaced here. */
  titleAr: string | null;
  titleEn: string | null;
  authorAr: string | null;
  authorEn: string | null;
  attributionAr: string;
  attributionEn: string;
  sourceUrl: string | null;
  totalHadith: number;
  booksCount: number;
  /** The id of the only book that holds hadith, else null. Non-null means the UI opens the hadith list directly (nawawi40, qudsi40, shahwaliullah40). */
  soleBookId: number | null;
};

/** The few collection fields a hadith, a search hit or a breadcrumb needs. */
export type HadithCollectionRef = Pick<
  HadithCollection,
  'slug' | 'number' | 'titleAr' | 'titleEn' | 'attributionAr' | 'attributionEn'
>;

export type HadithBook = {
  resourceId: number;
  id: number;
  collectionSlug: string;
  /** Text. The n in «كتاب {n}». */
  bookNumber: string;
  titleAr: string | null;
  titleEn: string | null;
  position: number;
  hadithCount: number;
  /** Number of chapter rows of this book (0 for fawazahmed0). */
  chapterCount: number;
  /** `chapterCount > 0`. A book is either chaptered or flat (plan D14, option C). */
  hasChapters: boolean;
};

export type HadithChapter = {
  resourceId: number;
  id: number;
  bookId: number;
  chapterNumber: number;
  titleAr: string | null;
  titleEn: string | null;
  position: number;
  hadithCount: number;
};

/** A hadith as a list row. `textAr` is the stored text, byte for byte. The UI clamps lines; this layer never shortens it. */
export type HadithListItem = {
  resourceId: number;
  id: number;
  bookId: number;
  chapterId: number | null;
  /** Text, for example `'3.1'`. */
  hadithNumber: string;
  arabicNumber: string | null;
  position: number;
  textAr: string;
};

/** Where previous / next points. The route needs only the slug and `hadithNumber`. */
export type HadithRef = {
  hadithNumber: string;
  bookId: number;
  chapterId: number | null;
};

/** One hadith for the reader, with its breadcrumb and source credit. No grade, no English. */
export type HadithDetail = HadithListItem & {
  collection: HadithCollectionRef;
  book: Pick<HadithBook, 'id' | 'bookNumber' | 'titleAr' | 'titleEn' | 'position'>;
  chapter: Pick<HadithChapter, 'id' | 'chapterNumber' | 'titleAr' | 'titleEn'> | null;
  /** Null for fawazahmed0: the UI shows no link. */
  sourceUrl: string | null;
};

export type HadithReaderData = {
  hadith: HadithDetail;
  /** The hadith before this one in book order, across book (and chapter) boundaries; null at the start of the collection. */
  previous: HadithRef | null;
  next: HadithRef | null;
};

/** One row of the collections list, installed or not. */
export type HadithCatalogEntry = {
  resourceId: number;
  /** From `catalog_resources`. */
  name: string | null;
  nameAr: string | null;
  version: number;
  packSizeBytes: number;
  installed: boolean;
  /** Known only when installed (read from `hadith_collections`); null before install (Open question 1). */
  slug: string | null;
};

/** A highlighted span in `textAr`: UTF-16 offsets into the stored text, `end` exclusive. */
export type HadithTextRange = { start: number; end: number };

export type HadithSearchHit = {
  item: HadithListItem;
  collection: HadithCollectionRef;
  bookNumber: string;
  /** Sorted, non-overlapping, on the original `textAr`. */
  ranges: HadithTextRange[];
};

export type HadithSearchPage = { hits: HadithSearchHit[]; hasMore: boolean };
```

Components that need more than these types define their own **exported prop-data type in their own file** (named in the tables). Screens (step 13) map the step 10 and step 11 types onto those props.

## Files

### Create (helpers, `apps/mobile/src/features/hadith/`)
1. `types.ts` — only if absent (see above).
2. `format.ts` and `format.test.ts`.
3. `titles.ts` and `titles.test.ts`.

### Create (test fixtures, `apps/mobile/jest/`)
4. `hadith-ui-fixtures.ts` — see "Test fixtures".

### Create (components, `apps/mobile/src/features/hadith/components/`, each with `<Name>.test.tsx`)
`CollectionRow`, `CollectionHeader`, `CollectionDownloadButton`, `BookRow`, `ChapterRow`, `HadithCard`, `HadithText`, `HadithMeta`, `HadithSourceLine`, `HadithBreadcrumb`, `HadithPager`, `HadithBookmarkButton`, `SavedHadithRow`, `UnverifiedNotice`, `HadithSearchField`, `HadithSearchResultRow`, `HadithStateView` (the 17 from the plan), plus the 7 additions:

| Added | Why the plan's list misses it (frame) |
| --- | --- |
| `HadithNumberBadge` | The book row and the hadith card draw a gold-ring number (a 36 circle and a 28 pill). The shared `NumberMedallion` is a 38 eight-point star and does not match (`HadithCollBooks`, `HadithCollBook`) |
| `HadithListHeader` | Every list screen has a back button, a title with a subtitle and a trailing search button; `ScreenHeader` has no back button and no subtitle (`HadithCollBook`, `HadithCollChapters`, `HadithCollSaved`) |
| `HadithToolbar` | The reader's glass pill of save, copy and share (`HadithCollReaderPlain`) |
| `HadithReaderCard` | The reader's radius-24 card holding the number label, the text and the source line. A screen may not style it inline |
| `HadithOfflinePill` | The «غير متاح دون اتصال» pill of a not-installed row while offline (`HadithCollOfflineDownloaded`). Features do not import another feature's component, so `AzkarOfflinePill` is not reused |
| `HadithListSkeleton` | The loading frame's skeleton rows (`HadithCollLoading`) |
| `HadithDetailsPanel` | The docked «المصدر والتفاصيل» panel of the expanded reader (`HadithCollExpandedReader`) |

Not added, on purpose: a chapter-group header (no frame draws one; option C has no runs), scope chips and recent-search rows (step 14), the download sheet (step 13 composes `SheetHeader`, `ToggleRow` and `CollectionDownloadButton`), the Home tile and Menu card (step 13), grades (hidden, D4).

### Change (append only)
5. `apps/mobile/src/core/i18n/locales/ar.json` and `en.json` — one new top-level `"hadith"` block at the end (see "i18n"). Do not touch any other key.

Do not touch `src/shared/ui/*` (no shared component is needed; `CollectionCover` is already built and exported), `app/`, `packages/`, `quran-app-design-system.html`, `screens/`, `apps/api`, or `docs/technical-spec.md`. If you do add something to `src/shared/ui`, export it in `index.ts` (its index test fails otherwise); this brief adds nothing there.

## Helpers

### `format.ts`
```ts
import type { Locale } from '@/core/i18n';
/** Hadith and book numbers are text ('3.1', '2787.2', '12a'). Arabic: digits become Arabic-Indic and a '.' becomes '٫' (U+066B). English: unchanged. Never parses to a number. */
export function formatHadithNumber(value: string, locale: Locale): string;
/** Pack size in megabytes with one decimal: bytes / 1048576, rounded to 0.1, never below 0.1 for a positive size. Arabic digits in Arabic. Returns the number text only ('9.8' or '٩٫٨'); the unit is the i18n key `ui.download.size`. */
export function formatPackSizeMb(bytes: number, locale: Locale): string;
```
Use `arabizeDigits` from `@/core/i18n/numbers` (it is exported there, not from the index) and `formatNumber` from `@/core/i18n`. Tests (`format.test.ts`), exact names:
- `formatHadithNumber turns 2787.2 into ٢٧٨٧٫٢ in Arabic`
- `formatHadithNumber leaves letters and keeps them in place (12a)`
- `formatHadithNumber returns the string unchanged in English`
- `formatHadithNumber returns an empty string for an empty string`
- `formatPackSizeMb rounds 10276044 bytes to 9.8`
- `formatPackSizeMb shows 0.1 for a tiny positive size`
- `formatPackSizeMb uses Arabic digits and ٫ in Arabic`

### `titles.ts`
Display rules (ADR 0042 §4, D9, D14). A title that is `null` or `''` counts as missing. A missing title is never replaced by the other language's title; the UI shows the numbered label.
```ts
import type { TFunction } from 'i18next';
import type { Locale } from '@/core/i18n';
type Titles = { titleAr: string | null; titleEn: string | null };
/** Arabic UI: titleAr, else «مجموعة {n}». English UI: titleEn, else "Collection {n}". n = number. */
export function collectionTitle(c: Titles & { number: number }, locale: Locale, t: TFunction): string;
/** Arabic UI: titleAr, else «كتاب {n}». English UI: titleEn, else "Book {n}". n = formatHadithNumber(bookNumber). */
export function bookTitle(b: Titles & { bookNumber: string }, locale: Locale, t: TFunction): string;
/** Both UI languages: titleAr (no English chapter title exists, D14), else «باب {n}» / "Chapter {n}" with n = chapterNumber. */
export function chapterTitle(c: { titleAr: string | null; chapterNumber: number }, locale: Locale, t: TFunction): string;
/** The cover's title: Arabic UI titleAr, English UI titleEn, else null (ornament-only cover). No fallback text. */
export function coverTitle(c: Titles, locale: Locale): string | null;
/** The author line: Arabic UI authorAr, English UI authorEn, else null (the line is hidden). */
export function collectionAuthor(c: { authorAr: string | null; authorEn: string | null }, locale: Locale): string | null;
```
Tests (`titles.test.ts`), exact names: `collectionTitle uses titleAr in Arabic`, `collectionTitle uses titleEn in English`, `collectionTitle falls back to «مجموعة n» when titleAr is null, even if titleEn exists`, `collectionTitle falls back to "Collection n" when titleEn is null`, `collectionTitle treats an empty string as missing`, `bookTitle falls back to «كتاب n» with Arabic digits`, `bookTitle falls back to "Book n" in English`, `bookTitle formats a decimal book number`, `chapterTitle shows the Arabic title in English`, `chapterTitle falls back to «باب n»`, `coverTitle returns null when the title is missing`, `collectionAuthor returns null when missing`.

## Components

Conventions for all: the file exports the named function component and, where noted, an exported prop-data type. Every component accepts `testID` (default `kebab-case-name`) and passes it to its root; children use `` `${testID}-part` ``. Locale comes from `useLocale()` (`@/core/i18n/useLocale`), `t` from `useTranslation()`. Frame references name the file in `screens/frames/hadith/`.

### `HadithNumberBadge`
Props: `{ number: string; size: 'pill' | 'circle'; testID? }`.
- Decorative: `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"` (the row carries the label), like `NumberMedallion`.
- Both sizes use `minWidth` and `minHeight` (never a fixed `width` or `height`) plus padding, so the badge grows with the text at the largest Dynamic Type size and for wide numbers like «٢٧٨٧٫٢». The ring is `borderRadius` = half the `minHeight` (a pill when it grows).
- `pill` (hadith card, `HadithCollBook`): `minWidth 28`, `minHeight 28`, `paddingHorizontal 6`, `borderRadius 14`, `borderWidth 1` (`theme.stroke.hairline`) in `colors.gold`, centred; text `UiText variant="numeral"` with `style { fontSize: 13, lineHeight: 18 }`, `tone="muted"`.
- `circle` (book row, `HadithCollBooks`): `minWidth 36`, `minHeight 36`, `borderRadius 18`, `borderWidth theme.stroke.marker` (1.25) in `colors.gold`; text `variant="numeral"` (Amiri 14, `lineHeight` 18 override), `tone="brand"`.
- Text is `formatHadithNumber(number, locale)`; digits are Arabic-Indic in Arabic.

### `HadithText`
The one place hadith text is drawn. Props: `{ text: string; variant: 'reader' | 'preview'; numberOfLines?: number; chainEnd?: number | null; fontScale?: number; testID? }`.
- `reader` (`HadithCollReaderPlain`): `UiText variant="dhikr"` with `style [displayText('dhikr', fontScale), textStyle]`, 24 / 48 (× `fontScale`, default 1, the reader's text-size setting). No clamp.
- `preview` (`HadithCollBook`, `HadithCollSaved`, `HadithCollSearchResults`): `UiText variant="dhikrList"` with `style { fontSize: 19, lineHeight: 36 }` (constant `PREVIEW_LINE_HEIGHT = 36`, frame value), `numberOfLines` default 3. **No `height` style.**
- `textStyle = { textAlign: 'justify', writingDirection: 'rtl' }` on both. Do **not** use `arabicTextDirection` here (it right-aligns, which is not justified). Colour `colors.ink` (the frames draw previews in ink, not muted; the step-08 text is overridden by the frames).
- `chainEnd`: a number with `0 < chainEnd < text.length` renders `<UiText>` with two children, `<Text style={{ color: colors.brand }}>{text.slice(0, chainEnd)}</Text>` then `{text.slice(chainEnd)}` in ink. Any other value (`null`, `undefined`, `0`, negative, `>= text.length`, non-integer) renders the whole text in ink. `slice` only; never trim, never insert a space (the frame's gap is part of the source text).
- `accessibilityLanguage="ar"` on iOS so VoiceOver reads Arabic in the English UI (set the prop; no platform branch).
- Last-line placement of justified RTL text has no `text-align-last` in React Native. It is a simulator check item (see "Visual check"), not a guaranteed style.

### `HadithMeta`
One muted line `collection · book · number` (`HadithCollSaved`, `HadithCollSearchResults`). Props: `{ collectionTitle: string; bookTitle: string | null; hadithNumber: string | null; testID? }`.
- `UiText variant="caption" tone="muted"` (13 / 18), `numberOfLines={2}`. Segments joined with ` · `; a null `bookTitle` or `hadithNumber` leaves that segment out. Number via `formatHadithNumber`.
- `accessibilityLabel` = the same text joined with `, `.

### `HadithSourceLine`
The source credit and the attribution (`HadithCollReaderPlain`, `HadithCollBooks` header). Props: `{ attribution: string | null; sourceUrl: string | null; align?: 'start' | 'center'; testID? }`.
- Credit line: `t('hadith.source.credit')` («المصدر: fawazahmed0/hadith-api», proposed wording; the developer sets the final text), `UiText variant="label" weight={400} tone="muted"` (12). `align` default `'start'`.
- `sourceUrl` null (always, for fawazahmed0): plain text, **no link**. Non-null: the credit is a `Pressable` with `accessibilityRole="link"`, `accessibilityLabel` `t('hadith.source.open')`, `minHeight 44`, brand colour, `Linking.openURL(sourceUrl)`.
- `attribution` non-null and not `''`: a second line under the credit (gap 2, `theme.space[1]` would be 4, so use constant `LINE_GAP = 2`), `variant="label"` muted, Arabic, `arabicTextDirection` (frames keep it RTL and right-aligned even in English). Null: not drawn.
- Whether the English reader shows the attribution is Open question 5; the component draws it whenever it is given.

### `HadithBreadcrumb`
The reader's two-line place (`HadithCollReaderPlain`). Props: `{ collectionTitle: string; bookTitle: string; testID? }`.
- Line 1 `UiText variant="caption" weight={600}` (13), line 2 `variant="label" weight={400} tone="muted"` (12), `numberOfLines={1}` each, `flex: 1`, `minWidth 0`.
- `accessibilityRole="header"` on the container, `accessibilityLabel` = `` `${collectionTitle}, ${bookTitle}` ``.

### `HadithBookmarkButton`
Props: `{ saved: boolean; onToggle: () => void; variant?: IconButtonVariant; testID? }` (default variant `'plain'`; the toolbar passes `'glass'`).
- An `IconButton`: icon `saved ? { ios: 'bookmark.fill', android: 'bookmark_added' } : { ios: 'bookmark', android: 'bookmark' }`, `pressed={saved}`, `label` = `t(saved ? 'hadith.reader.unsave' : 'hadith.reader.save')`. The `pressed` prop sets `accessibilityState.selected`.

### `HadithToolbar`
Props: `{ saved: boolean; onToggleSave: () => void; onCopy: () => void; onShare: () => void; testID? }`.
- `ToolbarPill` with `label={t('hadith.reader.toolbar')}` holding, in this order, `HadithBookmarkButton variant="glass"`, an `IconButton variant="glass"` copy (`{ ios: 'doc.on.doc', android: 'content_copy' }`, label `hadith.reader.copy`) and an `IconButton variant="glass"` share (`{ ios: 'square.and.arrow.up', android: 'share' }`, label `hadith.reader.share`). Three 44 pt buttons (frame: 44 each in a pill with a 2 pt inset, which `ToolbarPill` draws).

### `HadithPager`
Props: `{ hasPrevious: boolean; hasNext: boolean; onPrevious: () => void; onNext: () => void; current: string; total: number | null; testID? }`.
- Row, `justifyContent: 'center'`, `alignItems: 'center'`, gap 16 (`theme.space[4]`). Order in the tree: previous, label, next, so Arabic puts previous on the right and English on the left (frames).
- Previous / next: `IconButton variant="raised"` (44 round, card fill, hairline), icons `{ ios: 'chevron.left', android: 'chevron_left' }` and `{ ios: 'chevron.right', android: 'chevron_right' }`, both `mirrorInRtl`, labels `hadith.pager.previous` / `hadith.pager.next`, `disabled={!has…}`.
- Label between them: `UiText variant="caption" tone="muted" align="center"` with `minWidth 96`. Text: `total === null ? formatHadithNumber(current, locale) : t('hadith.pager.position', { current: formatHadithNumber(current, locale), total: formatNumber(total, locale) })` («١٢٣٤ من ٧٥٦٣»). `accessibilityRole="text"`.
- Needs `collection.totalHadith`, which `HadithCollectionRef` lacks (Open question 6).

### `HadithReaderCard`
Props: `{ hadithNumber: string; text: string; chainEnd?: number | null; attribution: string | null; sourceUrl: string | null; fontScale?: number; testID? }`.
- `View` with `backgroundColor colors.surfaceRaised`, `borderRadius theme.radius.hero` (24), `paddingVertical theme.size.cardPadding` (22), `paddingHorizontal theme.space[5]` (20), `gap theme.size.blockGap` (14); **no border** (`HadithCollReaderPlain`).
- Children, in order: a number label `UiText variant="label" weight={400} tone="muted"` showing `t('hadith.reader.numberLabel', { number: formatHadithNumber(...) })` («حديث رقم ١٢٣٤»), start-aligned (not a centred chip, frame override of step 08); `HadithText variant="reader"`; `HadithSourceLine` with `paddingTop 6` (constant).
- The text is the focus: nothing else in the card is larger than 12 pt.

### `HadithCard`
A hadith row in a book or chapter list (`HadithCollBook`, `HadithCollSingle`, `HadithCollChapterHadith`). Props: `{ item: Pick<HadithListItem, 'hadithNumber' | 'textAr'>; saved?: boolean; selected?: boolean; numberOfLines?: number; chainEnd?: number | null; onPress: () => void; testID? }`.
- `Pressable`, row, `alignItems: 'flex-start'`, gap 12, padding 16, `borderRadius theme.radius.lg`, `backgroundColor selected ? colors.glassSelected : colors.surfaceRaised`, **no border**.
- Start: `HadithNumberBadge size="pill"`. Middle: `HadithText variant="preview"` (`flex: 1`, `minWidth 0`, `numberOfLines` default 3). End, only when `saved`: `Icon` `{ ios: 'bookmark.fill', android: 'bookmark_added' }`, `size theme.size.iconLg` (24), `colors.brand`, hidden from accessibility.
- `accessibilityRole="button"`, `accessibilityState={{ selected }}`, `accessibilityLabel` = `` `${t('hadith.reader.numberLabel', { number })}, ${item.textAr}` `` plus `, ${t('hadith.saved.mark')}` when saved.

### `CollectionDownloadButton`
The trailing control of a collection row. Exported type:
```ts
export type CollectionDownloadState =
  | { kind: 'installed' }
  | { kind: 'available'; sizeBytes: number; offline: boolean }
  | { kind: 'downloading'; progress: number } // 0 to 1
  | { kind: 'failed' };
```
Props: `{ state: CollectionDownloadState; collectionTitle: string; onDownload: () => void; onCancel: () => void; onRetry: () => void; testID? }`.
- `installed`: renders `null`.
- `available`, `offline: false`: `Button variant="primary" size="small"` label `t('ui.download.start')` («تنزيل»), `accessibilityLabel` `t('hadith.download.startFor', { title: collectionTitle })`. `offline: true`: the same `Button` with `disabled` (it draws `fillSecondary` and muted text, as `HadithCollOfflineDownloaded`), `onPress` not called.
- `downloading`: `IconButton variant="raised"` icon `{ ios: 'xmark', android: 'close' }`, label `t('ui.download.cancel')`, `hint` `t('hadith.download.progress', { percent })`.
- `failed`: `Button variant="primary" size="small"` label `t('hadith.download.retry')` («إعادة المحاولة»), calls `onRetry`.
- `percent = formatPercent(Math.round(clamped * 100), locale)` (`formatPercent` is exported from `@/core/i18n`; it takes a whole number and returns «٦٠٪» / "60%"), where `clamped` is `progress` limited to 0 to 1.

### `HadithOfflinePill`
Props: `{ testID? }`. A non-interactive pill (`HadithCollOfflineDownloaded`): row, `alignItems: 'center'`, gap 6 (`theme.space[2]` is 8, use constant 6), `paddingHorizontal 10`, `paddingVertical 4`, `borderRadius 12`, `backgroundColor colors.fillSecondary`; `Icon` `{ ios: 'wifi.slash', android: 'wifi_off' }` size 14 `inkMuted`, then `UiText variant="caption" weight={600} tone="muted"` text `t('hadith.download.offlineUnavailable')`. `accessibilityRole="text"`, label the same text.

### `CollectionRow`
A row of the collections list (`HadithCollList`, `HadithCollListEnglish`, `HadithCollUntitled*`, `HadithCollOfflineDownloaded`, `HadithCollDownloadFailed`). Exported type:
```ts
export type CollectionRowData = {
  slug: string | null; // null: not installed and the slug is unknown (Open question 1), draws the neutral cover
  number: number;
  titleAr: string | null;
  titleEn: string | null;
  authorAr: string | null;
  authorEn: string | null;
  totalHadith: number | null; // null until installed
  booksCount: number | null;
  soleBook: boolean; // true: counts read «٤٢ حديثًا · كتاب واحد»
};
```
Props: `{ collection: CollectionRowData; state: CollectionDownloadState; onPress: () => void; onDownload: () => void; onCancel: () => void; onRetry: () => void; testID? }`.
- Root `Pressable` card: row, `alignItems: 'center'`, gap 12, padding 16, `borderRadius theme.radius.lg`, `colors.surfaceRaised`, **no border**. `opacity 0.5` (`theme.opacity.disabled` is 0.45; use `0.5` constant from the frame) on the cover and text of a not-installed row while `state.offline`.
- `CollectionCover size="list"` with `slug={collection.slug}` and `title={coverTitle(collection, locale)}`.
- Text column (`flex: 1`, `minWidth 0`, gap 4): title via `collectionTitle(...)`, Amiri 19 / 700: `UiText variant="displaySm"` with `style { fontSize: 19, lineHeight: 33 }` (`theme.size.indexNameSize` / `indexNameLineHeight`, the surah index's Amiri title, so marks never clip; the frame's 1.35 is overridden, Open question 7); author `UiText variant="caption" tone="muted"` (13), **not drawn when `collectionAuthor(...)` is null**; then the status line:
  - `installed`: counts `UiText variant="label" weight={400} tone="muted"` (12) = `t(collection.soleBook ? 'hadith.count.collectionSummarySingle' : 'hadith.count.collectionSummary', { hadith: t('hadith.count.hadith', { count, n }), books: t('hadith.count.books', { count, n }) })` with `n` formatted by `formatNumber`. If `totalHadith` is null the line is not drawn.
  - `available`: the size, `t('ui.download.size', { size: formatPackSizeMb(sizeBytes, locale) })` (12 muted); when `offline` also `HadithOfflinePill` under it.
  - `downloading`: a progress bar then `t('hadith.download.progress', { percent })` (12 muted). The bar: track `height theme.size.progressHeight` (4), `borderRadius theme.radius.progress` (2), `colors.line`; fill the same height and radius, `colors.brand`, `width` = `` `${Math.round(progress * 100)}%` ``. `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}`. No animation.
  - `failed`: `UiText variant="label" weight={400}` coloured `colors.danger` with `t('ui.download.failed')`, then the **retry button inside the column** (frame `HadithCollDownloadFailed`), i.e. `CollectionDownloadButton` rendered here, not trailing.
- Trailing: `installed` shows a chevron `Icon` `{ ios: 'chevron.right', android: 'chevron_right' }`, size 16, `inkMuted`, `mirrorInRtl`. `available` and `downloading` show `CollectionDownloadButton` instead of the chevron. `failed` shows nothing.
- Structure (exact nesting, so two buttons are never nested):
```
<View card style: row, alignItems center, gap 12, padding 16, radius lg, surfaceRaised>
  <Pressable body (flex 1, role button, label) >          // installed, available, downloading
    <CollectionCover/>  <View textColumn>title, author, status line</View>  [chevron when installed]
  </Pressable>
  <CollectionDownloadButton/>                             // available, downloading only (trailing)
</View>
```
  For `failed` the card is instead:
```
<View card>
  <Pressable cover (role button, same label)><CollectionCover/></Pressable>
  <View textColumn (flex 1, gap 4)>
    <Pressable title+author (role button, same label)>title, author</Pressable>
    <UiText danger>failed text</UiText>
    <CollectionDownloadButton state=failed/>               // the retry pill, under the failed text
  </View>
</View>
```
  The `Pressable` body's `accessibilityLabel` = title, author (if any), then the status text. The row stays pressable in every state; the offline state disables only the download button.

### `CollectionHeader`
The collection's identity block (`HadithCollBooks`, `HadithCollSingle`). Props: `{ collection: Pick<CollectionRowData, 'slug' | 'number' | 'titleAr' | 'titleEn' | 'authorAr' | 'authorEn'>; totalHadith: number; booksCount: number; soleBook: boolean; attribution: string | null; variant: 'centered' | 'inline'; testID? }`.
- `centered`: column, `alignItems: 'center'`, gap 6 (constant), `textAlign: 'center'`: `CollectionCover size="header"`; title `collectionTitle`, Amiri 22 / 700 (`UiText variant="displaySm"`, `style { fontSize: 22, lineHeight: 39 }`, `marginTop 4`, `accessibilityRole="header"`); author `variant="subhead" tone="muted"` (15), hidden when null; counts `variant="caption" tone="muted"` (13) as in `CollectionRow`; then `HadithSourceLine align="center" attribution={null} sourceUrl={null}` (the frame's «المصدر: fawazahmed0/hadith-api», 12 muted).
- `inline` (single-book collection, `HadithCollSingle`): row, `alignItems: 'center'`, gap 14 (`theme.size.blockGap`): `CollectionCover size="compact"`, then a column (`flex: 1`, gap 2) with title (22 / 700, same style), author (15 muted) and counts (13 muted). No source line.
- `attribution` is accepted for the source line in `centered` only when the screen wants the attribution; pass `null` by default (frames draw the credit only).

### `BookRow`
A book of a collection (`HadithCollBooks`, `HadithCollUntitledBooks`, and the compact pane of `HadithCollExpanded`). Props: `{ book: Pick<HadithBook, 'bookNumber' | 'titleAr' | 'titleEn' | 'hadithCount'>; compact?: boolean; selected?: boolean; onPress: () => void; testID? }`.
- `Pressable` card: row, `alignItems: 'center'`, `borderRadius theme.radius.lg`, `backgroundColor selected ? colors.glassSelected : colors.surfaceRaised`, **no border**.
  - default: gap 12, `paddingVertical 10`, `paddingHorizontal 16`. Compact (expanded start pane): gap 10, `minHeight 52`, same padding.
- `HadithNumberBadge size="circle" number={book.bookNumber}`; title `bookTitle(...)` Amiri 700, default 19 (`lineHeight 33`), compact 17 (`lineHeight 30`), `flex: 1`, `minWidth 0`; count `UiText variant="caption" tone="muted"` (compact `variant="label" weight={400}`) = `t('hadith.count.hadith', { count, n })`, `flexShrink: 0`; trailing chevron (16, `mirrorInRtl`) **only when not compact** (frame).
- `accessibilityRole="button"`, `accessibilityState={{ selected }}`, label `` `${title}, ${count text}` ``.

### `ChapterRow` — **on hold** (Open question 2)
Specified from the current `HadithCollChapters` frame, which still carries the Sunnah.com caption. Build it, test it, but do not wire it: the 8b frame changes and ADR 0076 are not accepted. Props: `{ chapter: Pick<HadithChapter, 'chapterNumber' | 'titleAr' | 'hadithCount'>; onPress: () => void; testID? }`.
- `Pressable` card: row, `alignItems: 'center'`, gap 12, `minHeight theme.size.indexRowMinHeight` (60), padding 16, `borderRadius theme.radius.lg`, `colors.surfaceRaised`, no border.
- Column (`flex: 1`, gap 2): title `chapterTitle(...)` `UiText variant="headline"` (17 / 600) with `arabicTextDirection` **in both languages** (D14: the Arabic title is shown in the English UI, right to left); count `variant="label" weight={400} tone="muted"` (12) = `t('hadith.count.hadith', …)`. Trailing chevron 16 `mirrorInRtl`.

### `SavedHadithRow`
A saved item (`HadithCollSaved`, `HadithCollSavedUnverified`). Saved items are keyed by collection slug + hadith number, never by id (step 11). Exported type:
```ts
export type SavedHadithRowData = {
  collection: Pick<CollectionRowData, 'number' | 'titleAr' | 'titleEn'>;
  book: { bookNumber: string; titleAr: string | null; titleEn: string | null } | null;
  hadithNumber: string | null; // null when unverified
  textAr: string | null; // null when unverified: no preview
  unverified: boolean;
};
```
Props: `{ saved: SavedHadithRowData; onPress: () => void; testID? }`.
- `Pressable` card: row, `alignItems: 'flex-start'`, gap 12, padding 16, `borderRadius theme.radius.lg`, `colors.surfaceRaised`, **hairline border** `colors.line` (frames: saved and search cards have a border; list and book cards do not).
- Verified (`unverified: false`, text present): column (`flex: 1`, gap 4): `HadithMeta`, then `HadithText variant="preview" numberOfLines={2}`. Trailing: `Icon` bookmark.fill, 24, `colors.brand`, hidden from accessibility.
- Unverified: column (gap 4): a wrapping row (gap 8, `flexWrap: 'wrap'`, `alignItems: 'center'`) with the book title (`UiText variant="subhead"`, 15; `bookTitle(...)`, or the collection title when `book` is null) and a pill (`paddingHorizontal 10`, `paddingVertical 2`, `borderRadius 12`, `fillSecondary`, `UiText variant="label" weight={600}`) `t('hadith.saved.unverified')`; under it `UiText variant="subhead" tone="muted"` `t('hadith.saved.previouslySaved')`. No number, no text preview. Same trailing glyph.
- Label: verified = meta text, then the text; unverified = book title, `t('hadith.saved.unverified')`, `t('hadith.saved.previouslySaved')`.

### `UnverifiedNotice`
The banner under the Saved header (`HadithCollSavedUnverified`). Props: `{ testID? }`. `View` with `borderRadius theme.radius.tile` (16), `backgroundColor colors.fillSecondary`, `paddingVertical 12`, `paddingHorizontal 14`, gap 4; title `UiText variant="subhead" weight={600}` (15) `t('hadith.saved.noticeTitle')`; body `UiText variant="caption" tone="muted"` (13 / 18; the frame's 20 line height is a constant `BODY_LINE_HEIGHT = 20`) `t('hadith.saved.noticeBody')`. `accessibilityRole="summary"`, `accessible`, label = title plus body.

### `HadithSearchField`
The search row's field and its cancel text (`HadithCollSearch`). The back button is the screen's (`BackButton`). Props: `{ value: string; onChangeText: (text: string) => void; onSubmit: (text: string) => void; onCancel: () => void; autoFocus?: boolean; testID? }`.
- Row, `alignItems: 'center'`, gap 8. The shared `SearchField` (`flex: 1`, placeholder `t('hadith.search.placeholder')`, it keeps its own clear button) then a `Pressable` `minHeight 44`, `paddingHorizontal 4`, `UiText variant="body" weight={600} tone="brand"` `t('hadith.search.cancel')`, role `button`. The shared field is 48 high; the frame draws 46 (the Azkar frames use the same shared field), accepted (Open question 8).

### `HadithSearchResultRow`
A search hit (`HadithCollSearchResults`). Props: `{ hit: Pick<HadithSearchHit, 'item' | 'collection' | 'ranges'>; bookTitleText: string; onPress: () => void; testID? }`. `bookTitleText` is the screen-resolved book title (`HadithSearchHit` has only `bookNumber`; Open question 9).
- `Pressable` card: `padding 16`, `borderRadius theme.radius.lg`, `colors.surfaceRaised`, **hairline border** `colors.line`, gap 6, **column-reverse in the frame**: the preview is on top and the meta line under it. Build it with the preview first in the tree and `HadithMeta` second (visual order), and set `accessibilityLabel` in reading order (meta, then text).
- Preview: `UiText variant="dhikrList"` with `style { fontSize: 19, lineHeight: 36, textAlign: 'justify', writingDirection: 'rtl' }`, `numberOfLines={2}`. Highlight by position: split `item.textAr` at the sorted `ranges` (`start`, `end`, UTF-16, `end` exclusive) into plain and match parts with `slice`; each match is a nested `<Text style={{ backgroundColor: colors.highlightGold, color: colors.ink }}>` (**filled**, not outlined; frame override of step 08). Ranges outside `[0, length]`, overlapping or unsorted are clamped or skipped, never thrown on; the joined parts always equal the original text.
- `HadithMeta` with `collectionTitle(collection, locale, t)`, `bookTitleText`, `item.hadithNumber`.

### `HadithListHeader`
The back button, title and subtitle of a list screen. Props: `{ title?: string; subtitle?: string; titleSize?: 'lg' | 'md'; onBack: () => void; trailing?: ReactNode; testID? }`.
- Row, `alignItems: 'center'`, gap 8. Start: `IconButton variant="raised"` back (local constant `const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const`, as `AzkarSearchBar` does; `mirrorInRtl`; label `t('hadith.back')`). Middle: `flex: 1`, `minWidth 0`; with no `title` it is an empty spacer. End: `trailing` (the screen passes an `IconButton variant="raised"` search button).
- `titleSize 'lg'` (default; `HadithCollList`, `HadithCollChapters`, `HadithCollSaved`): Amiri 26 / 700, `lineHeight Math.round(26 * amiriNaturalLeading)` (46, from `@quran/design-tokens`), subtitle `UiText variant="caption" tone="muted"` (13). `'md'` (`HadithCollBook`, `HadithCollSingle`): Amiri 22 / 700, `lineHeight 39`, subtitle `variant="label" weight={400}` (12). The frames use 22 on the book screens and 26 on the others (Open question 10); the prop keeps both until the developer chooses one.
- Title `accessibilityRole="header"`, `numberOfLines={2}`.

### `HadithStateView`
Loading, empty and error states (`HadithCollLoading`, `HadithCollOffline`, `HadithCollError`, `HadithCollSavedEmpty`, `HadithCollSearchEmpty`). Props: `{ kind: 'loading' | 'offlineEmpty' | 'error' | 'savedEmpty' | 'noResults'; onAction?: () => void; testID? }`.
- `loading`: `HadithListSkeleton`.
- Otherwise the shared `EmptyState` with i18n title, body and (when `onAction` is given and the kind has one) `action`:

| kind | title | body | action | icon |
| --- | --- | --- | --- | --- |
| `offlineEmpty` | `hadith.states.offlineTitle` | `hadith.states.offlineBody` | none | `{ ios: 'icloud.slash', android: 'cloud_off' }` |
| `error` | `hadith.states.errorTitle` | `hadith.states.errorBody` | `hadith.states.retry` | same |
| `savedEmpty` | `hadith.states.savedEmptyTitle` | `hadith.states.savedEmptyBody` | `hadith.states.browse` | `{ ios: 'bookmark', android: 'bookmark' }` |
| `noResults` | `hadith.states.noResultsTitle` | `hadith.states.noResultsBody` | none | `{ ios: 'magnifyingglass', android: 'search' }` |

The frames draw a 120 pt star illustration with the glyph inside; the shared `EmptyState` draws a 48 pt icon. Azkar's empty states made the same choice (Open question 11).

### `HadithListSkeleton`
Props: `{ rows?: number; testID? }` (default 6, `HadithCollLoading`). A `SkeletonGroup` (it carries the `accessibilityLabel` `t('hadith.states.loading')` and the Reduce Motion handling) holding a hairline card (`borderRadius theme.radius.lg`, `borderWidth` hairline `colors.line`, `overflow: 'hidden'`) of rows: row = flex row, `alignItems: 'center'`, gap 12, `paddingVertical 12`, `paddingHorizontal 14`, a bottom hairline on every row but the last; `SkeletonBlock width 56 height 75 radius theme.radius.md` (14), then a column (`flex: 1`, gap 10) of `SkeletonBlock height 14 width '60%'` and `SkeletonBlock height 12 width '38%'`.

### `HadithDetailsPanel`
The docked «المصدر والتفاصيل» panel (`HadithCollExpandedReader`). Props: `{ collectionTitle: string; bookTitle: string; hadithNumber: string; attribution: string | null; sourceUrl: string | null; testID? }`. The screen sets the width (300 in the frame).
- `View`: `borderRadius theme.radius.xl` (28), `colors.surfaceRaised`, hairline border `colors.line`, `paddingVertical 18`, `paddingHorizontal 16`, gap 14. Title `UiText variant="headline"` (17 / 600) `t('hadith.details.title')`, `accessibilityRole="header"`.
- Four rows, each `paddingVertical 10`, gap 2, a bottom hairline `colors.line` on the first three: label `variant="label" weight={400} tone="muted"` (12), value `variant="subhead"` (15). Labels `hadith.details.collection`, `.book`, `.number` (value `formatHadithNumber`), `.source`; the source row's value is `HadithSourceLine` (credit and attribution, start-aligned). **No grade row** (D4).

## i18n (`hadith.*`)
One top-level `"hadith"` object appended after the last key of each locale file. Step 13 adds its own groups later (`hadith.home`, `hadith.routes`, …); **step 12 owns exactly the groups below**. Arabic strings are copied from the approved frames; English is plain UI copy. Count strings pass `count` (plural choice) and `n` (formatted number).

| Key | Arabic | English |
| --- | --- | --- |
| `hadith.title` | الحديث | Hadith |
| `hadith.back` | رجوع | Back |
| `hadith.untitled.collection` | مجموعة {{n}} | Collection {{n}} |
| `hadith.untitled.book` | كتاب {{n}} | Book {{n}} |
| `hadith.untitled.chapter` | باب {{n}} | Chapter {{n}} |
| `hadith.count.hadith_zero` / `_one` / `_two` / `_few` / `_many` / `_other` | لا أحاديث / حديث واحد / حديثان / {{n}} أحاديث / {{n}} حديثًا / {{n}} حديث | `_one`: 1 hadith, `_other`: {{n}} hadith |
| `hadith.count.books_zero` … `_other` | لا كتب / كتاب واحد / كتابان / {{n}} كتب / {{n}} كتابًا / {{n}} كتاب | `_one`: 1 book, `_other`: {{n}} books |
| `hadith.count.collectionSummary` | {{hadith}} · {{books}} | {{hadith}} · {{books}} |
| `hadith.count.collectionSummarySingle` | {{hadith}} · كتاب واحد | {{hadith}} · 1 book |
| `hadith.download.startFor` | تنزيل {{title}} | Download {{title}} |
| `hadith.download.progress` | جارٍ التنزيل · {{percent}} | Downloading · {{percent}} |
| `hadith.download.retry` | إعادة المحاولة | Retry |
| `hadith.download.offlineUnavailable` | غير متاح دون اتصال | Unavailable offline |
| `hadith.reader.numberLabel` | حديث رقم {{number}} | Hadith {{number}} |
| `hadith.reader.toolbar` | أدوات الحديث | Hadith actions |
| `hadith.reader.save` | حفظ الحديث | Save hadith |
| `hadith.reader.unsave` | إزالة من المحفوظات | Remove from saved |
| `hadith.reader.copy` | نسخ | Copy |
| `hadith.reader.share` | مشاركة | Share |
| `hadith.pager.previous` | السابق | Previous |
| `hadith.pager.next` | التالي | Next |
| `hadith.pager.position` | {{current}} من {{total}} | {{current}} of {{total}} |
| `hadith.source.credit` | المصدر: fawazahmed0/hadith-api | Source: fawazahmed0/hadith-api |
| `hadith.source.open` | فتح المصدر | Open source |
| `hadith.saved.mark` | محفوظ | Saved |
| `hadith.saved.unverified` | غير مؤكد | Unverified |
| `hadith.saved.previouslySaved` | حديث محفوظ سابقًا | Previously saved hadith |
| `hadith.saved.noticeTitle` | تغيّر مصدر الأحاديث | The hadith source changed |
| `hadith.saved.noticeBody` | تُعرض بعض المحفوظات على مستوى الكتاب حتى نتحقق منها. | Some saved items are shown at book level until we verify them. |
| `hadith.search.placeholder` | ابحث في الحديث | Search hadith |
| `hadith.search.cancel` | إلغاء | Cancel |
| `hadith.states.loading` | جارٍ تحميل الأحاديث | Loading hadith |
| `hadith.states.offlineTitle` | لا توجد مجموعات محمّلة | No collections downloaded |
| `hadith.states.offlineBody` | اتصل بالإنترنت لتنزيل مجموعة. | Connect to the internet to download a collection. |
| `hadith.states.errorTitle` | تعذّر تحميل المجموعات | Couldn't load the collections |
| `hadith.states.errorBody` | تحقق من الاتصال ثم حاول مرة أخرى. | Check your connection and try again. |
| `hadith.states.retry` | إعادة المحاولة | Try again |
| `hadith.states.savedEmptyTitle` | لا توجد أحاديث محفوظة بعد | No saved hadith yet |
| `hadith.states.savedEmptyBody` | اضغط على أيقونة الحفظ في أي حديث لتجده هنا. | Tap the save icon on any hadith to find it here. |
| `hadith.states.browse` | تصفّح المجموعات | Browse collections |
| `hadith.states.noResultsTitle` | لا توجد نتائج | No results |
| `hadith.states.noResultsBody` | جرّب كلمة أخرى أو اختر «الكل». | Try another word or choose “All”. |
| `hadith.details.title` | المصدر والتفاصيل | Source and details |
| `hadith.details.collection` / `.book` / `.number` / `.source` | المجموعة / الكتاب / رقم الحديث / المصدر | Collection / Book / Hadith number / Source |

The existing `ar.json` / `en.json` parity test (if present) must pass: every key in both files, Arabic with all six plural forms and English with `_one` and `_other`.

## Test fixtures — `apps/mobile/jest/hadith-ui-fixtures.ts`
Placeholders only; builders take `Partial<T>` overrides and return the type from `@/features/hadith/types` (or the data types of the component files).
- `PLACEHOLDER_TEXT = 'نص تجريبي ١ — ليس حديثًا'` and `PLACEHOLDER_TEXT_LONG` (the first repeated eight times, to force wrapping), `PLACEHOLDER_TEXT_MARKS = 'نَصٌّ تَجْرِيبِيٌّ مُشَكَّلٌ لِلْعَرْضِ فَقَطْ — لَيْسَ حَدِيثًا'` (diacritics, to prove the string passes through untouched), `PLACEHOLDER_CHAIN = '[سَنَدُ الحَدِيثِ: سِلْسِلَةُ الرُّوَاةِ]'`.
- `collectionFixture(over?)`: `slug 'bukhari'`, `number 1`, `titleAr '[اسم المجموعة]'`, `titleEn '[Collection name]'`, `authorAr '[اسم المؤلف]'`, `authorEn '[Author name]'`, `attributionAr '[سطر النسبة من المصدر]'`, `totalHadith 5432`, `booksCount 42`, `soleBookId null`, other fields filler.
- `bookFixture(over?)`: `bookNumber '1'`, `titleAr '[اسم الكتاب]'`, `titleEn '[Book name]'`, `hadithCount 123`.
- `chapterFixture(over?)`: `chapterNumber 1`, `titleAr '[اسم الباب]'`, `hadithCount 24`.
- `listItemFixture(over?)`: `hadithNumber '1234'`, `textAr PLACEHOLDER_TEXT`.
- `searchHitFixture(over?)`: an item with `PLACEHOLDER_TEXT` and `ranges [{ start: 4, end: 9 }]`.
No real name, grade, narrator or text appears anywhere.

## Tests
One `<Name>.test.tsx` per component, colocated, React Native Testing Library, using `renderUi` with `{ locale, theme }`. Every file has these checks; the names below are the exact `it(...)` strings with `<Name>` replaced:

1. `renders in Arabic and English` (`it.each(locales)`): the default props render, the Arabic strings show in `ar` and the English in `en`.
2. One `it` per variant and state listed in the component's section (names in the table below).
3. `calls onPress when pressed` (or the component's callbacks), and `does not call it when disabled` where a disabled state exists.
4. `uses start and end, never left and right`: the root and row styles contain no `left`, `right`, `marginLeft`, `marginRight`, `paddingLeft`, `paddingRight`; directional icons have `mirrorInRtl`. Where the component draws Arabic **data text** (hadith text, the attribution line, a chapter title, a search preview), also assert `writingDirection: 'rtl'` on that node in both languages. Ordinary UI labels, titles and counts rely on the layout direction and are not asserted for `writingDirection`.
5. `exposes its role, label and state`: `getByRole(...)` with the exact accessible name, including `selected`, `disabled`, `busy` where used.
6. `reads its colours from the theme` (`it.each(['light', 'sepia', 'dark'])`): at least one asserted style value equals `themes[name].colors.<token>`; and `has no raw colour literal`: `expect(rawColorLiteralsInFeature('src/features/hadith/components/<Name>.tsx')).toEqual([])`.
7. `keeps text scalable and unclipped at the largest size`: find the component's own `UiText` nodes by `testID` (give each text part a `testID` `` `${testID}-title` `` etc.) and assert `maxFontSizeMultiplier` equals `maxFontScale.content` (2, exported from `@/shared/ui`); assert no text node and no row has a `height` style (rows use `minHeight` or none); clamped text uses `numberOfLines` and a `lineHeight`. **Exemptions:** `SkeletonBlock` shapes in `HadithListSkeleton` (placeholders have fixed sizes), the title inside `CollectionCover` (capped at 1.2 by design in step 9) and nested `<Text>` spans (the chain span in `HadithText`, the match spans in `HadithSearchResultRow`), which inherit from their parent. Icon-only components (`HadithBookmarkButton`, `HadithToolbar`) assert the 44 pt minimum size instead.
8. Reduce Motion: only `HadithListSkeleton` animates, and only through `SkeletonGroup`, which already reads `useReducedMotion` and holds the bars still at opacity 1 when it is on. Its test copies the mock at the top of `src/features/azkar/components/AzkarCounter.test.tsx` (`jest.mock('react-native-reanimated', …)` returning `useReducedMotion: jest.fn(() => false)`, then `mockReduce.mockReturnValue(true)`) and asserts `holds the bars still with Reduce Motion on` (every `SkeletonBlock` opacity 1) and `keeps the group label with Reduce Motion on`. No other component animates; their tests need no motion check.
9. Hadith text components also assert the text is untouched: `passes the stored text through byte for byte` renders `PLACEHOLDER_TEXT_MARKS` and compares the rendered string with `toBe`.

Component-specific tests (exact `it` names; checks 1, 3 to 7 above are in addition):

| File | Specific tests |
| --- | --- |
| `HadithNumberBadge.test.tsx` | `draws the pill at 28 high with a 1 pt gold ring`, `draws the circle at 36 with a 1.25 gold ring and brand digits`, `grows the pill for a wide number`, `formats 2787.2 as ٢٧٨٧٫٢ in Arabic and 2787.2 in English`, `is hidden from screen readers` |
| `HadithText.test.tsx` | `draws the reader at 24 over 48`, `draws the preview at 19 over 36 and never 34`, `justifies and sets writing direction rtl in both languages and is never centred`, `clamps the preview with numberOfLines and sets no height`, `draws one colour when chainEnd is null`, `draws the chain in brand and the rest in ink when chainEnd is inside the text`, `joins the two spans back into the exact original string`, `ignores a chainEnd of 0, negative, equal to the length or beyond it`, `scales the reader with fontScale`, `passes the stored text through byte for byte` |
| `HadithMeta.test.tsx` | `joins collection, book and number with a dot`, `leaves out a null book and a null number`, `formats the number with Arabic digits in Arabic`, `clamps to two lines` |
| `HadithSourceLine.test.tsx` | `shows the credit without a link when sourceUrl is null`, `shows the credit as a link role when sourceUrl is set and opens it`, `shows the attribution under the credit`, `draws no attribution when null or empty`, `centres both lines for align center`, `keeps the attribution right to left in English` |
| `HadithBreadcrumb.test.tsx` | `shows the collection at 13 semibold over the book at 12 muted`, `is one header with a combined label`, `truncates to one line each` |
| `HadithBookmarkButton.test.tsx` | `shows the outline and the save label when not saved`, `shows the filled glyph and the remove label when saved`, `reports selected state`, `calls onToggle`, `uses the glass variant when asked` |
| `HadithToolbar.test.tsx` | `holds save, copy and share in that order`, `each button is 44 by 44`, `calls each callback`, `is a toolbar with a label` |
| `HadithPager.test.tsx` | `puts previous before next in the tree`, `shows «١٢٣٤ من ٧٥٦٣» in Arabic and "1234 of 7563" in English`, `shows only the number when total is null`, `disables previous at the start and next at the end`, `calls onPrevious and onNext`, `mirrors the chevrons in Arabic` |
| `HadithReaderCard.test.tsx` | `draws the number label, the text and the source line in that order`, `has radius 24, padding 22 and 20, and no border`, `shows the number label at the start, not centred`, `passes the chain through to the text`, `draws no link without a sourceUrl` |
| `HadithCard.test.tsx` | `shows the pill badge, the preview and no saved glyph by default`, `shows the filled bookmark glyph when saved`, `uses the selected fill when selected`, `clamps to three lines by default and to the given lines`, `is one button labelled with the number and the text`, `has no border`, `shows a decimal number in a wider badge` |
| `CollectionDownloadButton.test.tsx` | `renders nothing when installed`, `shows the download pill when available`, `disables the pill while offline and does not call onDownload`, `shows the cancel button with the percent as its hint while downloading`, `calls onCancel`, `shows the retry pill when failed and calls onRetry`, `clamps progress to 0 to 1` |
| `HadithOfflinePill.test.tsx` | `shows the unavailable-offline text with the wifi glyph`, `is text, not a button`, `uses the muted fill` |
| `CollectionRow.test.tsx` | `installed: shows the cover, title, author, counts and a chevron`, `installed single-book: shows «كتاب واحد» in the counts`, `hides the author line when null`, `shows «مجموعة n» and an ornament-only cover when titleAr is null in Arabic`, `shows "Collection n" when titleEn is null in English`, `available: shows the size and the download pill instead of the chevron`, `available offline: dims the row, shows the offline pill and a disabled button`, `downloading: shows a 4 pt bar at the given percent with progressbar role and a cancel button`, `failed: shows the failed text in the danger colour and the retry button inside the text column`, `row press and the trailing button are separate buttons, both reachable with getByRole`, `uses the neutral cover when slug is null`, `has no border` |
| `CollectionHeader.test.tsx` | `centered: shows the 96 by 128 cover, title, author, counts and the credit`, `inline: shows the 40 by 53 cover beside the text and no credit`, `hides the author when null`, `shows the numbered fallback title and an ornament-only cover when untitled`, `uses titleEn in English`, `shows the header role on the title` |
| `BookRow.test.tsx` | `shows the circle badge, title, count and chevron`, `shows «كتاب n» when untitled`, `uses the selected fill when selected`, `compact: 52 high, 17 point title, 12 point count, no chevron`, `reports selected state`, `has no border` |
| `ChapterRow.test.tsx` | `shows the title and count and a chevron`, `shows the Arabic title right to left in the English UI`, `falls back to «باب n»`, `is at least 60 high`, `calls onPress` |
| `SavedHadithRow.test.tsx` | `verified: shows the meta line, a two-line preview and the saved glyph`, `unverified: shows the book title, the pill and «حديث محفوظ سابقًا» and no preview`, `unverified without a book shows the collection title`, `has the hairline border`, `labels a verified row with meta then text`, `calls onPress` |
| `UnverifiedNotice.test.tsx` | `shows the title and the body`, `uses the fill-secondary fill and radius 16`, `is one summary element with a combined label` |
| `HadithSearchField.test.tsx` | `shows the placeholder`, `passes typing to onChangeText and submit to onSubmit`, `shows the clear button only when there is a value`, `calls onCancel from the cancel text`, `the cancel target is at least 44 high` |
| `HadithSearchResultRow.test.tsx` | `shows the preview above the meta line`, `fills each range with highlightGold`, `joins the parts back into the exact original text`, `skips ranges that overlap or fall outside the text`, `labels the row meta first, then the text`, `clamps to two lines`, `has the hairline border` |
| `HadithListHeader.test.tsx` | `shows the back button, title and subtitle`, `shows only back and trailing when there is no title`, `lg is 26 point, md is 22 point`, `mirrors the back chevron in Arabic`, `calls onBack`, `renders the trailing node` |
| `HadithStateView.test.tsx` | `loading shows the skeleton`, `offlineEmpty shows the title, body and no action`, `error shows a retry action and calls onAction`, `savedEmpty shows a browse action`, `noResults shows no action`, `each kind has its own icon` |
| `HadithListSkeleton.test.tsx` | `draws six rows by default and the given number otherwise`, `has the loading label`, `each row is 56 by 75 plus two bars` and check 8 |
| `HadithDetailsPanel.test.tsx` | `shows the title and four labelled rows in order`, `shows no grade row`, `formats the number`, `shows the credit and attribution`, `has radius 28 and a hairline border` |

## Gates
Run from `apps/mobile` (Node 26: `nvm use`). All must pass; fix what you touched, never edit a test that is not yours.
```bash
npm run lint && npx tsc --noEmit && npx jest src/features/hadith/components src/shared/ui
```
Also run, because the helpers and the locale files are new: `npx jest src/features/hadith/format.test.ts src/features/hadith/titles.test.ts src/core/i18n`. The full `npm test` and `npx expo-doctor` run before the developer commits (CLAUDE.md); known failures on `main` that are not yours: 4 tests in `__tests__/force-update-ios-route.test.tsx` and `__tests__/tmp-steps.test.tsx`. No endpoint changes, so no contract generation. No dependency changes, so no audit.

## Visual check (done by the orchestrator in step 13, listed here so nothing is forgotten)
Components alone have no screen. When step 13 mounts them, compare against the frames at 390 × 844 on the iPhone 17 simulator (`python3 packages/design-tokens/scripts/frame-shot.py <FrameId> out.png`; ids: `HadithCollList`, `HadithCollBooks`, `HadithCollBook`, `HadithCollSingle`, `HadithCollReaderPlain`, `HadithCollSaved`, `HadithCollSavedUnverified`, `HadithCollSearchResults`, `HadithCollDownloadFailed`, `HadithCollLoading`). Items to look at, because React Native differs from the HTML:
- Justified RTL text: where the last line sits (`text-align-last: start` has no React Native equivalent), in Arabic and English UI, on iOS and Android.
- Amiri tashkeel at 19 / 36 and 24 / 48: no mark clipped; the frames' known nit (mark tips of a hidden fourth line under list previews) must not appear with `numberOfLines`.
- Title line heights (33 / 39 / 46 instead of the frames' 1.35 and 1.3): rows are a little taller than the frames.
- The 120 pt illustration versus the 48 pt icon in state views.

## Out of scope
Screens, routes, hooks, repositories, stores, data fetching and the download engine (steps 10, 11, 13); search logic, scope chips, recent searches and the results count line (step 14); the download sheet and the offline banner composition (step 13; `OfflineBanner` already exists); the Home tile, Menu card and Sources row; expanded-window layouts and the vertical tab rail (step 13 and 15); grades and any grade UI; English hadith text; chapter components other than the on-hold `ChapterRow`; Sunnah.com; new tokens, shared components or dependencies; any change to `CollectionCover`, `CoverOrnament`, or `packages/design-tokens`.

## Open questions (for the developer; none is decided by this brief)
1. **Not-installed rows have no slug.** `HadithCatalogEntry.slug` is null before install (step 10, Open question 1), so a not-installed `CollectionRow` has no cover colour, no author and no `number` for «مجموعة {n}». The brief draws the neutral cover and hides the author, and `CollectionRowData.number` is the screen's job. Should the catalog carry the slug, author and number?
2. **Chapter components.** Plan row 8b says chapter components wait for the approved chapter frames, and ADR 0076 is proposed. `HadithCollChapters*` and `HadithCollChapterHadith*` still show the Sunnah.com caption and an English title placeholder. `ChapterRow` is specified from the current frame and built but not wired. Build it now, or drop it until 8b is approved? The chapter-hadith screen reuses `HadithCard`.
3. **English frames draw English hadith text.** `HadithCollReaderEnglish` and `HadithCollBookEnglish`/`HadithCollSingleEnglish`/`HadithCollChapterHadithEnglish` draw `dir="ltr"` placeholders («[Hadith text as in the source]»). ADR 0042 §6 and the step-08 rule say there is no English hadith text and the Arabic block stays RTL. This brief draws the Arabic text RTL, justified, in both languages. Confirm the English frames are placeholder artefacts.
4. **Preview line height.** `typeScale.dhikrList` is 19 / 34 (1.79×), below the developer's 1.8× rule; the frames use 36. The brief uses a local constant of 36 (as `CollectionCover` does for its title). Add a named token (for example `hadithList`: 19 / 36) in a later change?
5. **Attribution in the English reader.** `HadithCollReader` (Arabic) shows the attribution line «[سطر النسبة من المصدر]»; `HadithCollReaderEnglish` omits it. `HadithSourceLine` draws it whenever it is given. Should the English reader hide `attributionAr`, show `attributionEn`, or show the Arabic line?
6. **The pager needs a total.** The frame shows «١٢٣٤ من ٧٥٦٣»; `HadithCollectionRef` has no `totalHadith`. `HadithPager` takes `total: number | null` and shows only the number when it is null. Add `totalHadith` to `HadithCollectionRef` (a step 10 change), or drop the total from the frame?
7. **Title line heights.** The frames set Amiri titles at 1.35 (19 → 26). The brief uses Amiri's natural leading (the surah index precedent: 19 → 33) so hamza and madda marks never clip. Rows grow by about 7 pt. Keep the frames' 1.35 instead?
8. **Search field height.** The frame draws 46; the shared `SearchField` (reused, as Azkar does) is 48. Accept?
9. **Search hit has no book title.** `HadithSearchHit` carries `bookNumber` only, but the frame shows «[اسم الكتاب]». `HadithSearchResultRow` takes `bookTitleText` from the screen. Step 10 says to ask for a type change rather than compute it in a component; add `bookTitleAr` / `bookTitleEn` to `HadithSearchHit`?
10. **Header title sizes disagree between frames.** 22 on `HadithCollBooks`, `HadithCollBook`, `HadithCollSingle`; 26 on `HadithCollList`, `HadithCollChapters`, `HadithCollChapterHadith`, `HadithCollSaved`. `HadithListHeader` keeps a `titleSize` prop. Pick one?
11. **Empty-state illustration.** The frames draw a 120 pt star illustration with a glyph; the shared `EmptyState` draws a 48 pt icon (Azkar did the same). Accept the shared component, or draw the illustration as a new component?
12. **English title fallback.** With `titleEn` null and `titleAr` present the English UI shows "Collection {n}" (the frames' `HadithCollUntitledEnglish`, and D9's "never replaced"). Should the English UI fall back to the Arabic title instead?
13. **Step-08 text versus the approved frames.** Where `step-08-frames.md` differs from the approved frames (a centred number chip, outlined search highlight, muted previews, a centred reader text, a 38-pt star medallion), this brief follows the frames, as the developer's feedback rounds changed them. No action needed unless you disagree.

## Answers to the open questions (orchestrator, on the developer's behalf, 7 Nov 2026)

These override anything above that conflicts with them.

1. The slug is known before install from the manifest's new `key` field (step 10, answer 1). `HadithCatalogEntry.slug` is null only on an older server. Keep the neutral-cover fallback for null.
2. **Build `ChapterRow` now** from the current frame. Chapters come in step 6b (ADR 0076, decisions recorded); the chapter frames are revised in 8b only if needed.
3. Arabic RTL hadith text in both UI languages (ADR 0042 §6). English frames only change the labels.
4. Keep a local constant `HADITH_PREVIEW_LINE_HEIGHT = 36`, with a comment. No new token now.
5. The English reader shows the source line too (the licence credit applies in every language).
6. `HadithPager` takes `position` and `total` props; the screen supplies them. Don't change `types.ts`.
7. Accepted: natural Amiri line height for titles (tashkeel safety wins over the 1.35 in the frames).
8. Use the shared `SearchField` at 48 (HIG touch target).
9. Accepted: book title as a prop.
10. Accepted: a `titleSize` prop.
11. Use the shared `EmptyState`, as Azkar does.
12. Accepted.
13. Accepted: the frames win over the step-08 text.

The narrator chain: a `chainEnd` prop, null for now (no source marks it yet).
