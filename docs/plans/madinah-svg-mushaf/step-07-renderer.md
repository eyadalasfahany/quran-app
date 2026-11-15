# Step 7 — App: the Mushaf page and list, drawn with Skia (ADR 0090 decisions 1, 4, 8, 10, 12; «Decided» 1–5)

Branch `ft/madinah-svg-mushaf` in worktree `/Applications/MAMP/htdocs/quran-app-mushaf` (check with `git branch --show-current`); never work in `/Applications/MAMP/htdocs/quran-app`. Stage and commit nothing. **Add no dependency**: `@shopify/react-native-skia` 2.14.0 and `fflate` 0.8.3 are already in `apps/mobile/package.json`. No API change, no `user.db` change, no new i18n key beyond those listed in D4. The old `HafsMushafList` and its code stay until step 10.

## Before you start

- Run `git status --short > /private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/45caaed8-c2a1-4fa5-a801-974871103e43/scratchpad/step7-before.txt`. The tree holds many unrelated modified and deleted files (reader, fonts, onboarding). Never revert, stage or edit them, except the files this brief names. At the end compare: the only new differences must be this step's files.
- Read `.claude/agent-rules.md`, root `CLAUDE.md`, `apps/mobile/CLAUDE.md`, and `.agents/skills/apple-design/SKILL.md`.
- **Prerequisite: step 5 must be merged.** `apps/mobile/src/core/mushaf-pack/` does not exist on 12 Nov 2026 (checked). If it is still missing when you start, stop and report. This brief builds on exactly these step 5 names (see `docs/plans/madinah-svg-mushaf/step-05-packs.md` B1, B6, B7), all imported from `@/core/mushaf-pack`:
  - `useSvgMushafPack(key: SvgMushafKey)` returning `{ status: 'absent' | 'downloading' | 'verifying' | 'waiting_wifi' | 'installed' | 'failed' | 'cancelled'; progress: number; error; installedVersion; availableVersion; updateAvailable; sizeBytes: number | null; hasWordBoxes: boolean; download(options?: { allowCellular?: boolean }): Promise<SvgMushafInstallResult>; cancel(): void; remove(): void; reader: SvgMushafPackReader | null }`.
  - `SvgMushafPackReader`: `pageCount`, `hasWordBoxes`, `getPage(page): Uint8Array | null` (the stored gzip), `regionsForPage(page): PageRegion[]`, `wordBoxesForPage(page): WordBox[]`, `pageForAyah(surah, ayah): number | null`, `pagesForAyah(surah, ayah): number[]`, `firstAyahOnPage(page): {surah; ayah} | null`.
  - Types `PageRegion = {surah; ayah; labelX: number | null; labelY: number | null; polygon: string}`, `WordBox = {line; surah; ayah; position; x0; y0; x1; y1}`, `SvgMushafKey`, `SVG_MUSHAF_KEYS`, `isSvgMushafKey`.
  - `labelX`/`labelY` are `null` for a region that continues from the previous page. `wordBoxesForPage` is `[]` when the pack has no boxes; never invent boxes.
  - Tests mock the hook and the reader; they never touch a pack file, a network or Quran artwork.

## Read first (all paths checked 12 Nov 2026)

- `docs/adr/0090-madinah-svg-mushaf.md`: decisions 1, 4, 8 (including the «Step 1 result»), 10, 12, «Decided» 1–5, and the W6 consequence (the Mushaf takes its page↔ayah mapping from the pack's regions, never from `verses.page`).
- `docs/technical-spec.md` §4 («Mushaf page sizing») and §12 («Reader», «Mushaf rendering», «Highlights»).
- Frames: `screens/frames/core/Mushaf.html`, `screens/frames/loading/LoadingMushaf.html`.
- Today's reader code: `src/features/reader/HafsMushafList.tsx`, `components/HafsMushafPage.tsx`, `components/HafsPage.tsx`, `useWordFollow.ts`, `word-follow.ts`, `word-pill.ts`, `follow-position.ts`, `components/RecitedWordPill.tsx`, `mushaf-top-ayah.ts`, `page-window.ts`, `saved-wash.ts`, `anchor/{page,useReadingAnchor,usePlaybackReadingPlace,reading-anchor}.ts`, `screens/ReaderScreen.tsx` (lines 100–235 and 395–440), `src/features/audio/active-ayah.ts`, `src/shared/ui/{highlight,useContrastColors}.ts`.
- ADRs: 0023, 0037, 0039, 0049 (the surah-header one is not this; the number clash is real), 0059, 0069–0073.
- The spike `apps/mobile/app/dev-svg-spike.tsx` (throwaway, deleted in step 10; read only, never import from it, never edit it).
- A real page for structure only: `design-assets/mushaf/hafs-050.svg`. **Never copy any artwork, path data or Quran text into tests or fixtures.**

## What the page SVG looks like (measured on `hafs-050.svg`)

```
<svg viewBox="0 0 345 550">
  <g transform="matrix(1.3333 0 0 -1.3333 -115 640)">          # the root group: one matrix
    <g id="ayah_markers">
      <g class="ayah-mark">                                    # one per ayah end
        <g class="ayah-mark-ornament" transform="translate(a b) scale(c d) matrix(a b c d e f)"><path d=… fill-rule="evenodd"/></g>
        <g transform="translate(a b)" ayah:x=… ayah:y=…><path d=…/></g>      # the ayah-number glyph
      </g>…
    </g>
    <g id="content">
      <g transform="translate(a b)"><path d=…/></g>…           # text contours; separator is a space or a comma
    </g>
  </g>
  <path class="ayahPolygon" fill-opacity="0" … d="M x y L …"/>  # polygons inside the SVG: IGNORE them
</svg>
```

- The `ayahPolygon` paths inside the SVG are not used: the pack's `regions` table carries the polygons. The parser must skip everything outside the root `<g transform="matrix(...)">`.
- Transforms seen: `translate(a b)`, `translate(a,b)`, `scale(c d)`, `matrix(a b c d e f)`, and compositions of them (the ornament has three). Any other transform function (`rotate`, `skewX`, `skewY`) is a parse failure for that element (see P1).

---

## Part A. Pure modules (no React, no Skia import; tested with Jest)

Folder: `apps/mobile/src/features/reader/mushaf-svg/` (new). One concern per file, each with a colocated `*.test.ts`.

### A1. `svg-page-model.ts`

Exports:

```ts
export type Matrix = readonly [a: number, b: number, c: number, d: number, e: number, f: number];
export const IDENTITY: Matrix;
export function multiply(p: Matrix, q: Matrix): Matrix;           // p applied after q, SVG order: M = p · q
export function parseTransform(value: string): Matrix | null;     // null = unsupported function or bad number
export type PagePathPiece = { d: string; matrix: Matrix };        // matrix = root · element chain, ready for Skia
export type SvgPageModel = { viewBox: { width: number; height: number }; pieces: readonly PagePathPiece[] };
export function parseSvgPage(svg: string): SvgPageModel;          // throws SvgPageParseError
export class SvgPageParseError extends Error {}
```

Rules:

1. `parseTransform` accepts a list of `translate`, `scale`, `matrix`, separated by spaces, and numbers separated by spaces and/or commas. `translate(a)` means `translate(a 0)`; `scale(a)` means `scale(a a)`. Functions apply left to right as SVG does (`M = T1 · T2 · …`). Numbers may be signed, decimal, or in exponent form (`1e-3`). Anything else returns `null`.
2. `parseSvgPage` reads the `viewBox` attribute of the root `<svg>` (must be `0 0 345 550`; any other value throws, because every overlay constant depends on it). It finds the root group: the first `<g transform="…">` that contains `id="ayah_markers"` or `id="content"`. If none is found, throw.
3. **Pieces, in document order, in two passes of the same reader:** first everything under `id="ayah_markers"` (every `<path>` under `.ayah-mark`, covering both the ornament groups and the ayah-number groups), then every `<g transform=…><path d=…>` under `id="content"`. For each path the matrix is `root · (chain of every ancestor `<g transform>` between the root group and the path)`. Handle nesting by a stack, not a regex per level: walk the markup tag by tag (`<g`, `</g>`, `<path`) with a small tokenizer; do not build a DOM and add no dependency.
4. `d` is taken byte for byte. Never trim, rewrite, round or re-encode a path (non-negotiable 1: the artwork is drawn as received). A `<path>` without a `d` is skipped. A `<path>` outside the root group is skipped.
5. A transform that `parseTransform` rejects makes the page throw `SvgPageParseError` (a page with a missing number or a skipped contour is wrong; the list shows the error state of D6, never a silently incomplete page).
6. Result invariants checked by `parseSvgPage` itself: `pieces.length > 0`.

Tests (synthetic SVG strings written in the test, with `d="M 0 0 L 1 0 L 1 1 Z"` style paths; no artwork):

- root matrix only; `translate` with a space and with a comma; the three-function ornament chain composes to the expected numbers (compute the expected matrix by hand in the test); nested `<g>` inside `<g>`; a path in `ayah_markers` and one in `content` both appear, markers first; document order kept;
- `ayahPolygon` paths and paths outside the root group are skipped;
- `rotate(…)` and a non-numeric value throw; wrong `viewBox` throws; missing root group throws; `d` is returned unchanged (assert with a string that has odd spacing);
- `multiply` associativity on two sample matrices; `IDENTITY` neutral.

### A2. `region-geometry.ts`

For hit-testing and follow without Skia.

```ts
export type Point = readonly [x: number, y: number];
export type Rect = { x0: number; y0: number; x1: number; y1: number };
export function parsePolygon(polygon: string): Point[][] | null;   // subpaths; null when the string uses an unsupported command
export function boundsOf(subpaths: readonly (readonly Point[])[]): Rect | null;
export function pointInPolygon(subpaths: readonly (readonly Point[])[], x: number, y: number): boolean;   // even-odd across subpaths
export function linesOf(subpaths: readonly (readonly Point[])[]): Rect[];   // one rect per subpath, top to bottom, right to left on ties
export type PageRegionGeometry = { surah: number; ayah: number; verseKey: string; continues: boolean; subpaths: Point[][]; bounds: Rect; lines: Rect[] };
export function buildRegionGeometry(regions: readonly PageRegion[]): PageRegionGeometry[];  // drops (with a __DEV__ console.warn) any region whose polygon parsePolygon rejects
export function regionAt(regions: readonly PageRegionGeometry[], x: number, y: number): PageRegionGeometry | null;
```

- `parsePolygon` supports absolute `M`, `L`, `H`, `V`, `Z` (upper case), numbers separated by spaces or commas. Lower-case commands, curves (`C Q A S T`) or anything else return `null`. This is the format seen in the step 2 fixtures and in the SVG's own `ayahPolygon` paths (`M 296.0 74.75 L 342.5 74.75 …`). **Assumption to verify on the device (D9, step 2 of the on-device check):** polygon coordinates are in the 345 × 550 viewBox space, the same space as `WordBox` coordinates. If the overlay does not sit on the printed lines, stop and report; do not add an offset.
- `verseKey` is `` `${surah}:${ayah}` ``. `continues` is `labelX === null`.
- `regionAt` returns the region whose polygon contains the point; when two contain it (adjacent rectangles share an edge) the one with the smaller area wins.
- Tests: rectangle, an L-shaped polygon, a two-subpath polygon (even-odd), a point on the edge, `H`/`V` forms, comma separators, an unsupported command returns `null`, `buildRegionGeometry` drops it without throwing, `regionAt` tie-break, `linesOf` order.

### A3. `page-layout.ts`

```ts
export const PAGE_VIEWBOX = { width: 345, height: 550 } as const;
export const MUSHAF_SVG_PAGE_MAX = 600;                       // ADR 0090 decision 8 / spec §4
export function pageWidthFor(windowWidth: number, gutters: number): number;   // min(windowWidth − gutters, 600), never below 0
export function pageHeightFor(width: number): number;         // width * 550 / 345
export function scaleFor(width: number): number;              // width / 345
export function pageItemHeight(width: number, dividerHeight: number): number;  // page height + divider; the FlashList item height
export function toPage(point: {x: number; y: number}, width: number): {x: number; y: number};  // screen → page units
export function toScreen(rect: Rect, width: number): Rect;                      // page units → screen units
```

Tests: 390-wide window with 16 gutters gives 358; 1024 gives 600; the heights follow 345:550; round trips.

### A4. `ayah-anchor.ts` (ADR 0073, with the pack's regions)

```ts
export function offsetForAyah(regions: readonly PageRegionGeometry[], verseKey: string, width: number): number | null;
// the top of the ayah's FIRST line inside its page, in screen units, for the page that holds its start (the page where `continues` is false)
export function topAyahAt(regions: readonly PageRegionGeometry[], yInPage: number): string | null;
// the ayah holding the first line (a rect from `lines`) whose centre is at or below yInPage on this page; null when none is
```

- `topAyahAt` implements ADR 0073 decision 1 with the geometry: ordered by `lines` top, then right edge descending; a line belongs to the ayah whose polygon holds it, so «a line that starts with the end mark of the ayah before it belongs to the next ayah» needs no special case (the polygons already decide).
- The list calls `topAyahAt` on the page under the viewport top (and, if it returns `null`, on the next page's first region via `reader.firstAyahOnPage(next)`), then reports `verseKey`.
- Tests with synthetic regions: a two-line ayah, a line shared by two ayahs, the null case, a continuing region (the first line of the page belongs to the ayah that started on the page before).

### A5. `page-picture.ts` is **not** pure (Skia); see Part B.

---

## Part B. Skia drawing (one module per concern; Jest mocks `@shopify/react-native-skia`)

Folder `apps/mobile/src/features/reader/mushaf-svg/`.

### B1. `page-source.ts` — inflate and cache

```ts
export function inflatePage(gz: Uint8Array): string;           // strFromU8(gunzipSync(gz)); throws on bad data
export class PageModelCache {                                   // LRU of SvgPageModel by `${key}:${version}:${page}`
  constructor(capacity: number);                                // 8 in production (this is a constant PAGE_MODEL_CACHE = 8)
  get(id: string): SvgPageModel | undefined;
  set(id: string, model: SvgPageModel): void;
  clear(): void;
}
export function loadPageModel(reader: SvgMushafPackReader, id: string, page: number, cache: PageModelCache): SvgPageModel;
// getPage → inflatePage → parseSvgPage; null bytes → throws MushafPageMissingError; a cache hit does no work
```

- Inflate is synchronous and cost ~62 ms in a dev build (ADR 0090 decision 8), so it must never run in a scroll frame for a page that is already visible: B4 prefetches.
- The raw SVG string is dropped as soon as `parseSvgPage` returns; only the model is cached.
- Tests: fixture gzip of a tiny synthetic SVG built with `fflate.gzipSync` in the test; cache hit does not call the reader again (spy); LRU eviction order; missing page throws; a corrupt gzip throws.

### B2. `page-picture.ts` — model → SkPath → SkPicture

```ts
export function buildPagePath(model: SvgPageModel): SkPath;     // Skia.PathBuilder.Make(); per piece: addPath(Skia.Path.MakeFromSVGString(d), Skia.Matrix(...)); setFillType(FillType.EvenOdd); build()
export function recordPagePicture(path: SkPath, color: string): SkPicture;   // Skia.PictureRecorder, 345 × 550 bounds, antialiased paint, drawPath
export class PagePictureCache {                                  // per page id: { path, pictures: Map<color, SkPicture> }; LRU capacity PAGE_MODEL_CACHE
  picture(id: string, model: SvgPageModel, color: string): SkPicture;
  clearPictures(): void;                                         // on theme change: pictures go, paths stay
}
```

- A piece whose `MakeFromSVGString` returns `null` makes the whole page throw `SvgPageParseError` (never a page with holes).
- `Skia.Matrix` takes the 3 × 3 row-major form: `[a, c, e, b, d, f, 0, 0, 1]` for the SVG matrix `(a b c d e f)`. The spike's `toSk` is the reference; assert this order in the test.
- Both the dark-ink picture and the pill's light picture come from the same cached `SkPath`; re-recording is a `drawPath` (about 4 ms, measured), not a re-parse.
- **Fill colour comes from a theme token, never a hex.** Use `colors.ink` for the page ink (the frame draws the artwork in its original near-black, which in the light theme is the ink token's role; confirm in D9 that the contrast matches the frame, and report if `ink` is visibly different from the printed `#231f20`; do not hard-code the artwork's colour). The light word uses `colors.onBrandSurface`.
- Tests (Skia mocked with a recorder that logs calls): path built once per page id; `clearPictures` drops pictures but not paths; the matrix order; a `null` path from `MakeFromSVGString` throws; even-odd fill type is set; a second colour records a second picture without rebuilding the path.

### B3. Layers: the order, bottom to top (ADR 0090 decision 8, spec §12)

All in **one** `<Canvas>` per page (one GPU surface per page, for low CPU; do not stack three canvases):

1. reader colour (`highlightFill(colors, color)`) or the saved green, a filled polygon per ayah of the page (`Skia.Path.MakeFromSVGString(region.polygon)`, drawn with rounded corners: radius `theme.radius.sm` expressed in page units, i.e. `theme.radius.sm / scale`; the frame uses 6 px);
2. the place wash (`colors.highlightActive`) for the reader's place (ADR 0070) and the audio-active ayah wash (`colors.highlightActive`), same shape rule; an ayah's own colour wins over both (ADR 0070 decision 3 / 0073 decision 5, as `HafsMushafPage` does today: `highlightFill(...) ?? (marked || place ? highlightActive : undefined)`);
3. the recited-word pill (`colors.brandSurface`, radius `theme.radius.sm`; the frame's 8 px), drawn from the word box;
4. the artwork `<Picture picture={ink} />`;
5. the light word: `<Group clip={pillRect}><Picture picture={light} /></Group>`, only while a pill exists. The light picture is the same path recorded with `colors.onBrandSurface`; it is clipped to the pill rectangle exactly as the frame clips a second light copy of the page (`clip-path: inset(...)` plus `brightness(0) invert(1)`).

Everything in the Canvas is scaled once: `transform={[{ scale: pageWidth / 345 }]}` on a root `<Group>` (the spike's `<Picture transform>` form is acceptable), so every coordinate in layers 1–3 and 5 is in page units.

The khatma marker (`khatmaMarkerVerseId`) is drawn as in `HafsMushafPage` today in meaning, not in form: check how `khatmaMarked` is rendered there (`components/MushafLine`/`HafsMushafPage` line ~181) and give the ayah polygon the same token fill; if that rendering is not a plain background colour, stop and report (open question Q6).

### B4. `MushafSvgPage` — component (`src/features/reader/components/MushafSvgPage.tsx` + `MushafSvgPage.test.tsx`)

Props:

```ts
type MushafSvgPageProps = {
  page: number;
  width: number;                                   // page width in screen units (pageWidthFor)
  model: SvgPageModel | null;                      // null: render the skeleton (below)
  regions: readonly PageRegionGeometry[];
  wordBoxes: readonly WordBox[];                   // [] when none
  mushafKey: SvgMushafKey;
  highlightByVerseKey?: ReadonlyMap<string, HighlightColor>;
  placeVerseKey?: string | null;
  recitedVerseKey?: string | null;
  recitedWord?: number | null;                     // 1-based, the app's word position
  khatmaMarkerVerseKey?: string | null;
  ayahLabel: (region: PageRegionGeometry) => string;   // built by the list (D3); keeps the component free of the content DB
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  testID?: string;
};
```

Behaviour:

1. **Skeleton.** `model === null` renders the existing `MushafPageSkeleton` (`components/MushafPageSkeleton.tsx`, reuse, do not restyle) at the page's size. Pages scrolling in are skeletons until the model is ready (prefetch in the list, B5), then the Canvas appears with `timing('fast')` opacity; under Reduce Motion it appears at once.
2. **Canvas.** The layers of B3, sized `width × pageHeightFor(width)`. `Canvas` gets `accessible={false}`, `importantForAccessibility="no"` (the Canvas is decoration; the elements below carry the meaning).
3. **Theme.** Pictures are taken from `PagePictureCache` for the current `colors.ink`; on a theme change (`useTheme().name` / colour value changes) the cache's pictures are cleared and the visible pages re-record. Re-record happens in a layout effect keyed on the colour, with no flash of the old colour.
4. **Pill rectangle.** From `wordBoxes`: the box with `surah:ayah` equal to `recitedVerseKey` and `position === recitedWord`. The pill rectangle is the box inflated by the constants `PILL_PAD_X` and `PILL_PAD_Y` (module constants in `word-pill-rect.ts`, page units), starting at 0 and tuned in the frame comparison (D9) until the pill matches the frame's `left 74.58%; top 20.52%; width 12.68%; height 6.71%` pill for the same word. Record the final values in the report. No word box, no pill: when the pack has no boxes (`wordBoxes` empty) only the ayah wash shows, which is the honest state until the Hafs boxes are approved.
5. **Pill motion** (ADR 0039 decision 4, kept): the pill slides (`timing('fast')`, no spring) when the next word is on the same `line`, and jumps on a new line, a new ayah or a new page. Under Reduce Motion (`useReducedMotion()`) it always jumps. Implement with Reanimated shared values (`x, y, w, h`) feeding Skia through `useDerivedValue` (Skia 2.14 accepts shared values as props with Reanimated 4.7). Both the pill and the clip of the light picture read the same shared values, so they cannot disagree. The light word therefore appears as the pill passes over it, not strictly on arrival: this differs from ADR 0039 decision 5 and is the frame's drawing (open question Q3). Add a pure `pillMove(prev: WordBox | null, next: WordBox | null): 'slide' | 'jump'` in `word-pill-rect.ts` (slide only when both exist and share `page` and `line`) with its test.
6. **Taps.** One `Pressable` covers the page (`accessible={false}`). `onPress` receives `locationX/locationY`, converts with `toPage`, and calls `regionAt`; a hit calls `onSelectVerseKey(verseKey)`. `onLongPress` does the same with `onOpenAyahActions`. A tap writes nothing and highlights nothing (ADR 0072). A miss does nothing. The hit area includes the whole polygon, so the tap target of a one-line ayah is its line (about 37 units, 50 pt at 358 width: above 44 pt).
7. **Accessibility elements (ADR 0090 decision 10).** Per `regions` entry, one absolutely positioned transparent `View` at `toScreen(bounds, width)`, `accessible`, `accessibilityRole="button"`, `accessibilityLabel={ayahLabel(region)}` (plus the highlight colour name when the ayah has one, as `HafsMushafPage` appends `t('ui.highlight.<colour>')`), `accessibilityState={{ selected: isRecited }}`, `accessibilityHint` = `t('player.nowPlaying')` for the recited ayah, `accessibilityActions` = the existing ayah-actions action(s) `HafsMushafPage` exposes (copy its names and handler; ADR 0012), and `pointerEvents="none"` so touches reach the page `Pressable`. Order by `(surah, ayah)`; a continuing region (the ayah started on the previous page) is last on the page only if its text continues, else keep numeric order. **Verify on the iOS simulator with VoiceOver that elements are reachable even with `pointerEvents="none"`** (D9); if not, report and use `onPress` on each element and drop the page `Pressable` hit-test for screen-reader mode only (Q5).
   - Mount these elements only when a screen reader is on (`AccessibilityInfo.isScreenReaderEnabled()` plus the `screenReaderChanged` listener, through a small hook `useScreenReaderEnabled` in `src/shared/` if none exists; none exists today: grep found no use of `isScreenReaderEnabled`). This keeps about 15 views per page off the normal path.
   - **Label text.** For Hafs: the ayah's Tanzil Imla'i text plus the ayah number, exactly as today (`${verse.textUthmani} ${t('ui.ayahNumber', …)}`); the list builds `ayahLabel` from `getVersesByPage`-style lookups of `content.db` by `surah:ayah` (`getVerseByKey`). A verse missing from `content.db` falls back to the surah-name form. For every other riwayah: surah name plus ayah number (`t('ui.ayahNumber', …)` with the chapter name from `listChapters`). Approved difference, ADR 0090 decision 10; no Quran text is ever invented.
9. **Wide windows.** The component is given `width`; centring and the 600 cap are the list's job (B5).

Tests (`MushafSvgPage.test.tsx`; Skia mocked; Jest mocks `useReducedMotion` per the app rule):

- render with `model` (Canvas present, no skeleton) and `model: null` (skeleton present);
- layer order: assert the mocked draw order: colour < place/recited wash < pill < artwork picture < clipped light picture; own colour wins over the wash; no pill without a box; no pill when `recitedWord` is null;
- pill: slide vs jump (`pillMove` unit test plus the component sets shared values with and without timing); Reduce Motion always jumps;
- taps: a tap at a point inside a region calls `onSelectVerseKey` with that verse key; a tap outside does nothing; a long press calls `onOpenAyahActions`; the handler writes nothing;
- accessibility: with the screen-reader hook mocked to `true`, one element per region with role `button`, the label from `ayahLabel`, `selected` for the recited ayah, hint for the recited ayah, the highlight colour name appended; with it `false`, none mounted;
- RTL: render under Arabic and English locales; geometry is **not** mirrored (page units are physical: the printed page does not flip), assert the same Canvas transform in both;
- theme: no raw hex in the component source (a test greps the file text for `#[0-9a-fA-F]{3,8}`), light and dark produce different `colors.ink` fills, and a theme change clears the pictures.

### B5. `MushafSvgList` — component (`src/features/reader/MushafSvgList.tsx` + `MushafSvgList.test.tsx`)

Props mirror `HafsMushafListProps` so the screen swap is one line (ReaderScreen props kept the same names):

```ts
export type MushafSvgListProps = {
  mushafKey: SvgMushafKey;
  reader: SvgMushafPackReader;                   // given by the container (B7), never null here
  anchorVerseKey: string;
  topInset?: number; bottomInset?: number; contentBottomInset?: number;
  recitedVerseKey?: string | null;
  recitedWord?: number | null;
  followKey?: string | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  khatmaMarkerVerseId?: number | null;
  placeVerseKey?: string | null;
  onVisiblePage?: (page: number, verseKey: string) => void;
  onTopAyah?: (page: number, verseKey: string) => void;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  onUserScrollStart?: () => void;
  testID?: string;
};
```

`fontScale` is not a prop: Mushaf pages always fit the width and ignore the text size (frame approval, plan step 6).

Behaviour:

1. **FlashList, vertical.** Same shape as `HafsMushafList`: `data` is the page window from `page-window.ts` (`pageWindowFrom`, `extendPageWindow`, `pagesIn`, reused unchanged), `keyExtractor` page number, `maintainVisibleContentPosition={{}}`, `onStartReached`/`onEndReached` extend the window, `showsVerticalScrollIndicator={false}`, `contentContainerStyle={{ paddingBottom: contentBottomInset, paddingHorizontal: theme.space[4] }}`.
2. **Fixed item height.** `pageItemHeight(pageWidth, dividerHeight)` for every item: the page (with the same gold double border the frame draws, around the page box) plus the divider that leads each page after the first of the window (`PageDivider` from `@/shared/ui`, as `HafsPage` uses). Pass `overrideItemLayout` (FlashList 2.x: check the 2.3.2 API in `node_modules/@shopify/flash-list` for the supported fixed-size prop; if there is none, rely on the estimated size equal to the real size) so FlashList never measures. Page width: `pageWidthFor(windowWidth, 2 * theme.space[4] + 2 * borderAndPadding)`, centred, from `useWindowDimensions()`; it recomputes on a size change and the list re-anchors (spec §4, `useReadingAnchor` unchanged).
3. **Which page holds an ayah (W6).** Every verse→page lookup uses `reader.pageForAyah(surah, ayah)` (the page where the ayah starts) and `reader.firstAyahOnPage(page)`. The list never reads `verses.page`. `onVisiblePage(page, verseKey)` reports `reader.firstAyahOnPage(page)`. If `pageForAyah` returns `null` for the anchor, open page 1.
   - Known impact: `ReaderScreen` and `anchor/*` still use `pageForVerse`/`firstVerseOfPage` (the `verses.page` column) for the saved place, toolbar page and playback place. On the 36 pages where the two prints differ these can disagree with the list by a page. This step does **not** change those helpers; it passes the pack's page in the callbacks and lets the screen use that (D7). Q2 asks the developer whether a follow-up should swap them.
4. **Anchor and exact place (ADR 0073).** On mount and when `anchorVerseKey` changes to another page, the page window is rebuilt from the pack page and the list scrolls so the ayah's first line sits at the top: `offsetForAyah(regionsOfThatPage, anchorVerseKey, width)` plus the divider offset gives `viewOffset` for `scrollToIndex`. Pages are fixed height, so the offset is known before the page draws (no «settle» wait, no focus-offset callbacks: the machinery `HafsMushafList` needs because its pages are measured is deleted here). The first ayah of a surah also shows the surah title above it because the artwork's title is the page's first line: for a surah start ayah (`ayah === 1`) scroll to the page top plus `0`, not to the ayah line (ADR 0073 decision 3).
5. **Top ayah on scroll end.** `onMomentumScrollEnd`/`onScrollEndDrag` compute the page under the viewport top and the `y` inside it from `getAbsoluteLastScrollOffset()`, `getLayout(index).y`, `getFirstItemOffset()` (`rowContentTop`), then `topAyahAt` and report `onTopAyah(page, verseKey)`. Only a hand scroll reports (as today). The report ignores programmatic scrolls (anchor jumps and follow-scrolls): set a `programmaticScrollRef` before every `scrollToIndex`/`scrollToOffset` and clear it when the scroll settles.
6. **Prefetch and loading.** A page's model is loaded for the viewable pages and one page either side, in an idle slot (`InteractionManager.runAfterInteractions`, one page per task, nearest first), never inside `renderItem`. `renderItem` reads the cache and passes `model={cache.get(id) ?? null}`; when a page finishes loading the list bumps a state counter used as `extraData`. Cap work to one inflate+parse+record per frame budget (do not batch several in one task).
   - A page whose `loadPageModel` throws renders the error row of D6 for that page only, with a retry press that clears its cache entry.
7. **Follow-scroll during playback (ADR 0023, 0037).**
   - When `followKey` changes page, scroll to that page (`pageForAyah`), animated unless Reduce Motion, the way `HafsMushafList` does through the anchor (`anchorVerseKey` is already `followKey` while following, see `ReaderScreen` `viewKey`).
   - Within a page, a new hook `useBoxFollow` (`src/features/reader/mushaf-svg/useBoxFollow.ts` + test) keeps the recited line in the comfort band. **It does not reuse `useWordFollow` itself**: that hook is built around a `Text` ref and `onTextLayout` lines (`textProps`, `lineForOffset`), which a Canvas does not have. It reuses everything pure from the same code: `comfortBand`, `scrollTargetForLine` (`word-follow.ts`), `capWordScrollStep`, `isPlausibleScreenTop`, `rowContentTop`, `followedTextScreenTop` (`follow-position.ts`), `WORD_SETTLE_MS` and the same settle behaviour (a scroll starts a 450 ms window during which checks wait; `noteScroll`). This is a deliberate deviation from plan step 7's wording («reuses `useWordFollow`»); flag it in the report (Q4).
   - The line to keep in view is, in this order: the word box line of `(recitedVerseKey, recitedWord)` (its `y0`/`y1` in page units × scale, relative to the page top) when `wordBoxes` has it; else the ayah's `lines` rect that holds the recited ayah's first line on this page (`PageRegionGeometry.lines[0]`; for an ayah that continues from the previous page, its rect on this page). Screen top of the line = `rowTop + borderOffset + lineY × scale − scrollOffset`.
   - Only active while `followKey !== null` (playing and not dragged away), the same gate as today. `onUserScrollStart` pauses following exactly as today (the screen owns that state).
8. **Recited word index.** `recitedWord` is the app's 1-based word position (the Tanzil Uthmani letter-token count, `recited-text.ts`), which equals `WordBox.position` (ADR 0090 decision 5). No conversion.
9. **Colours.** `highlightsByVerseId` is keyed by verse id; the list converts it once per change to a verse-key map with `idToVerseKey` (`features/reader/data/verses`) and `khatmaMarkerVerseId` the same way. These helpers are Hafs ids: this step serves Hafs numbering only. For a non-Hafs key, marks are keyed per riwayah in step 9: until then **pass an empty map** for non-Hafs keys so no Hafs mark lands on another print's ayah (flag if the screen cannot tell; see D7).
10. **FlashList repaint.** `extraData` is a memoised object of `recitedVerseKey, recitedWord, placeVerseKey, highlightByVerseKey, khatmaMarkerVerseKey, themeInk, modelsVersion`, as `pageExtraData` is today.
11. **Recycling and memory.** Pictures are not stored on the FlashList item; they live in the two caches (capacity 8). On unmount, `clear()` both. The lists never hold more than 8 page paths plus pictures (about 600 KB of path data each).

Tests (`MushafSvgList.test.tsx`; FlashList is the real one under the app's jest setup, or mocked as the `HafsMushafList.test.tsx` does — copy its approach; a fake reader built in the test):

- renders pages around the anchor; the anchor page comes from `reader.pageForAyah`, and `verses.page` is never queried (spy on the executor: no `FROM verses` with `page`);
- a pack-vs-`verses.page` disagreement: reader says page 12, content says 11, the list opens on 12;
- exact place: `scrollToIndex` receives the offset from `offsetForAyah`; ayah 1 of a surah scrolls to the page top;
- `onTopAyah` fires on a drag end with the ayah from `topAyahAt`, not on a programmatic scroll;
- follow: with `followKey` set and a word box off the comfort band, `scrollToOffset` is called with the capped target; inside the band, it is not; with no boxes it uses the ayah line; not following → never scrolls; Reduce Motion → `animated: false`;
- a tap forwards `onSelectVerseKey`; a long press `onOpenAyahActions`;
- a page whose load throws shows the error row and retries;
- non-Hafs key: highlight map empty;
- RTL under Arabic and English; 390 and 1024 window widths (page width 358 and 600, centred).

### B6. `useMushafPageLoader` (hook, `src/features/reader/mushaf-svg/useMushafPageLoader.ts` + test)

Owns `PageModelCache`, `PagePictureCache`, the prefetch queue of B5.6 and the `modelsVersion` counter. Returns `{ model(page), regions(page), wordBoxes(page), error(page), retry(page) }`. `regions` and `wordBoxes` are read from the reader once per page and kept in the same LRU (small). Clears everything when `reader` or `mushafKey` changes. Test with the fake reader: nearest-first order, one page per task (fake `InteractionManager`), errors recorded, retry clears.

---

## Part C. The reciter-riwayah rule (decision 12) — the hook point

Today every reciter is Hafs, and non-Hafs reciters do not exist. Build only the seam.

- New pure module `src/features/reader/mushaf-svg/shown-mushaf.ts`:
  ```ts
  export function shownMushafKey(input: { chosen: SvgMushafKey; playing: boolean; reciterRiwayah: SvgMushafKey | null }): SvgMushafKey;
  // playing && reciterRiwayah !== null → reciterRiwayah; playing and riwayah unknown → 'hafs'; not playing → chosen
  ```
  `playing` is `status === 'playing' || status === 'loading'` (the `active` flag `ReaderScreen` already computes). `reciterRiwayah` is a parameter that the screen passes as `null` until step 9b adds `riwayah` to the reciter data. «Unknown» means `'hafs'`, since every reciter today is Hafs. When playback stops the function returns the chosen mushaf and the place carries over (the anchor is a verse key, so the list simply re-opens at it; for a non-Hafs chosen mushaf the ayah-number caveat of ADR 0090 «Decided» 5 applies and is step 9's work).
- Where the screen reads the chosen mushaf: step 8 adds `mushaf` to `settings-model` and drops `quranFont`. **If step 8 is not merged, `useReaderSettings` has no `mushaf`:** read it through a one-line selector `useChosenMushafKey()` in `src/features/reader/mushaf-svg/useChosenMushafKey.ts` that returns `'hafs'` until step 8 lands (it reads `state.mushaf` and validates with `isSvgMushafKey`, falling back to `'hafs'`). Step 8 only has to make the field exist.
- Swapping the displayed mushaf while playing rebuilds the list at the same anchor; it must not write the chosen mushaf (the choice stays). Test `shownMushafKey` for the four cases, and a `MushafSvgContainer` test (D1) that a change of `playing` swaps the `mushafKey` passed to the list while the stored choice is unchanged.
- Not built here: reciter data, the riwayah label in the reciters list, non-Hafs audio (step 9b).

## Part D. The container, the not-downloaded state, and the screen swap

### D1. `MushafSvgContainer` (`src/features/reader/components/MushafSvgContainer.tsx` + test)

Props = `MushafSvgListProps` minus `mushafKey` and `reader`, plus `mushafKey` (the **shown** key from `shownMushafKey`), plus `onReadNow?: () => void`. It calls `useSvgMushafPack(mushafKey)` and renders:

- `status === 'installed'` and `reader !== null` → `<MushafSvgList … reader={reader} />`;
- `absent`, `downloading`, `verifying`, `waiting_wifi`, `failed`, `cancelled` → `<MushafDownloadCard … />` (D2).
- Opening the Mushaf with the pack `absent` does **not** start a download by itself (step 5 conflict 3). The card's primary action starts it; but ADR 0090 decision 9 says the Hafs pack «downloads when the Mushaf is first opened, with progress shown». To meet that, on first mount with `status === 'absent'` the container calls `download()` once (a `useRef` guard), honouring Wi-Fi-only (`waiting_wifi` shows the card with a «تنزيل بالبيانات» action, `download({ allowCellular: true })`). Q1 asks the developer to confirm auto-start versus an explicit tap.
- If the pack installs while the container is mounted, the list appears without remounting the screen.
- Errors: `failed` shows the card with the error string for `error` (D4) and a «إعادة المحاولة» action calling `download()`.

### D2. `MushafDownloadCard` (`src/features/reader/components/MushafDownloadCard.tsx` + test) — built from `screens/frames/loading/LoadingMushaf.html`

Draw exactly what the frame draws (read it; do not guess), at 390 × 844 in the light theme:

- a centred glass card (`left/right 16`, radius 24, padding 24/20, gap 14, the frame's shadow and hairline; `useGlass()` decides glass vs solid `glassFallback` + `line` hairline, per `apps/mobile/CLAUDE.md`), over the screen background;
- title «تنزيل المصحف» in the Quran-title style the frame uses (Amiri 22 bold, via the existing text variant for it; find the UI component the other loading cards use, `grep -rn "gx-sec-loading"` is not needed: reuse `UiText`/`GlassCard` from `src/shared/ui`, no one-off styles);
- subtitle «مصحف {name} · {size}» (muted 15): `{name}` is the riwayah's Arabic name, `{size}` is `sizeBytes` formatted in megabytes with the app's number formatter; **if `sizeBytes` is `null` the size part is omitted**;
- the progress row: a `role="progressbar"` track (height 8, radius 4, `colors.line`-class fill from tokens, brand fill growing from the start edge) and the percentage (`formatNumber`, `٪`), `accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}` and the label «تقدم التنزيل»;
- hint line «يمكنك القراءة في وضع القراءة أثناء التنزيل.»;
- primary button «القراءة الآن» (height 52, radius 26, brand fill, `onBrandSurface` text): calls `onReadNow`, which the screen wires to switch the mode to Reading (D7). The download keeps running;
- text button «إلغاء التنزيل» (min height 44): calls `cancel()`; visible only while `downloading` or `verifying`. After a cancel the card shows the idle state with a «تنزيل» action.

Props: `{ status; progress; sizeBytes: number | null; mushafName: string; error: SvgMushafInstallResult['reason'] | null; onDownload: () => void; onDownloadWithData?: () => void; onCancel: () => void; onReadNow: () => void; testID?: string }`. Under Reduce Motion the progress fill does not animate (it jumps); otherwise `timing('fast')`.

Tests: each status renders (absent → «تنزيل» action; downloading → progress with the right `accessibilityValue` and the cancel button; verifying → progress at the verifying value and no cancel; waiting_wifi → the data action; failed → the error string and retry; cancelled → idle), presses call the callbacks, the buttons have role `button` and 44 pt minimum targets, Arabic and English render, no raw hex, `useGlass` off gives the solid fallback.

The card replaces the list; the toolbar, the title pill and the mini player stay (they belong to the screen, as in the frame, which also draws them).

### D3. Ayah labels

`src/features/reader/mushaf-svg/ayah-label.ts` (+ test): `ayahLabelFor({ mushafKey, region, executor, locale, t }): string` — Hafs: Imla'i text from `getVerseByKey(executor, verseKey)` (the same field `HafsMushafPage` uses today, `textUthmani`, so the label is identical to today's) plus `t('ui.ayahNumber', { number: formatNumber(ayah, locale) })`; fallback or other riwayat: `${chapterName} ${ayah number string}`. The list memoises labels per page. The test uses a stub executor with placeholder strings («نص تجريبي — ليس قرآنًا» style; never real Quran text).

### D4. Strings (the only i18n additions; `ar.json` and `en.json`, namespace `reader.mushafDownload`)

`title`, `subtitle` (`{{name}}`, `{{size}}`), `subtitleNoSize` (`{{name}}`), `progressLabel`, `readWhileDownloading`, `readNow`, `cancel`, `download`, `downloadWithData`, `retry`, `waitingWifi`, `error.network`, `error.checksum`, `error.size`, `error.import`, `error.unavailable`, `error.storage`, `pageError`, `pageRetry`. **Arabic values for the frame's strings are exactly those listed in D2.** For the others the implementer writes plain Arabic and English; they are marked in the report for the developer to confirm (no religious text involved). The English UI strings are the developer's to approve; do not add the riwayah names (step 8 owns `reader.mushafs.*`): take `mushafName` from `reader.mushafs.<key>` if present, else from a constant table of the five Arabic names in ADR 0090 decision 2, and say which in the report.

### D5. Reduce Motion, Dynamic Type, contrast

- Reduce Motion: pill jumps, page fade-in is instant, progress fill jumps, follow-scroll is not animated (`reduceMotion` already feeds `useWordFollow`; pass it the same way).
- Dynamic Type: the page does not scale; the download card text scales (use the existing text components).
- Increase Contrast: the card uses `useContrastColors()`; the artwork ink uses `colors.ink` from the same source.

### D6. Error state for a page

A small `MushafPageError` component (`src/features/reader/components/MushafPageError.tsx` + test): at the page's size, centred text `reader.mushafDownload.pageError` and a 44 pt «إعادة المحاولة» button, `role="button"`.

### D7. How `ReaderScreen` switches (old list kept until step 10)

In `src/features/reader/screens/ReaderScreen.tsx`, only the Mushaf branch (lines ~405–438) changes:

- Add a constant `USE_SVG_MUSHAF` is **not** introduced (no flags). The switch is data-driven: render `MushafSvgContainer` when the chosen/shown mushaf's pack is installed, otherwise render the container too (it shows the download card). **Per ADR 0090 decision 4, until the word-box gate and the artwork check pass, «the current Mushaf stays».** Therefore the switch is gated by one existing fact: render the new container only when `useSvgMushafPack(shownKey).status === 'installed'` **or** the manifest lists that pack (the `availableVersion !== null` field from the hook). When the manifest has no `svg_mushafs` entry (which is the production state until `mushaf:publish` runs), the screen keeps rendering `HafsMushafList` unchanged. This one condition is the whole rollout switch, and it is the same code path the final release uses (no dead flag to delete in step 10).
- Pass the same props the old list gets (`anchorVerseKey={viewKey}`, `contentBottomInset`, `topInset`, `followKey`, `highlightsByVerseId={drawnHighlights}`, `khatmaMarkerVerseId`, `onOpenAyahActions={selectVerse}`, `onSelectVerseKey={selectVerse}`, `placeVerseKey`, `onUserScrollStart` (unchanged body), `recitedVerseKey`, `recitedWord={activeWord}`, `testID="reader-mushaf"`). `fontScale` is not passed to the new container.
- `onVisiblePage` / `onTopAyah` keep their bodies. They receive the **pack's** page. The two uses of `pageForVerse(executor, …)` inside those callbacks (comparing a page to `viewKey`'s page) must compare against `reader.pageForAyah(...)` when the new list is shown, so the visible-page check is consistent; pass a `pageOf: (verseKey) => number | undefined` from the container if needed (implementer's choice, one small addition to the container's props; mention in the report). The toolbar page/juz (`loadChrome`) and the saved place's page still come from `verses.page` in this step (Q2).
- `shownKey = shownMushafKey({ chosen: useChosenMushafKey(), playing: active, reciterRiwayah: null })`.
- `onReadNow` → `useReaderSettings.setState` or the existing setter that changes `mode` to `'reading'` (use the setter the mode toggle in `ReaderToolbar` uses; find it, do not add a new action). The anchor verse is kept (the anchor is shared, spec §12).
- Do not delete `HafsMushafList`, `HafsPage`, `HafsMushafPage` or their tests.
- Update `ReaderScreen.test.tsx`: (a) with the pack absent from the manifest, `HafsMushafList` renders; (b) with the pack installed, the container/list render; (c) with the pack `downloading`, the card renders and «القراءة الآن» switches to Reading. Mock `useSvgMushafPack`.

### D8. Spec edit (same change)

`docs/technical-spec.md` §12 «Mushaf rendering», first bullet: change «It is drawn with `react-native-svg`.» to «It is drawn with `@shopify/react-native-skia` (one `SkPicture` per page recorded from the page's paths; ADR 0090 decision 8, step 1 result).» Add one bullet under it: the recited word pill is drawn from the Hafs word box with the word light by clipping a second light picture, and without boxes only the ayah wash shows. Do not edit ADR 0090 (the coordinator does; see conflict 1).

---

## Conflicts and gaps found (do not resolve silently)

1. **ADR 0090 decision 8 and spec §4/§12 still say `react-native-svg`; step 1's result in the same ADR says Skia.** The brief follows the step 1 result (developer, final). D8 edits the spec phrase; the ADR's first bullet of decision 8 needs the coordinator's amendment.
2. **Plan step 7 says the follow «reuses `useWordFollow`».** That hook is Text-bound. The brief reuses its pure parts and writes `useBoxFollow` (B5.7). Deviation flagged.
3. **ADR 0039 decision 1 says Mushaf keeps the span highlight and decision 5 turns the word light on arrival.** The approved `Mushaf` frame (12 Nov 2026) draws a pill with the word turned light by clipping; the brief follows the frame. The clip reveals the light word as the pill passes over it, not on arrival.
4. **`layout.ts` has `MUSHAF_PAGE_MAX = 640`; ADR 0090 and spec §4 say 600.** The new `MUSHAF_SVG_PAGE_MAX = 600` is used; the old constant is left (the old list uses it). Remove in step 10.
5. **The page↔ayah source differs** (W6): `verses.page` in `ReaderScreen`, `anchor/*`, chrome vs the pack's regions in the new list. See B5.3 and Q2.
6. **Skia is a native package** (ADR 0090 decision 8, already in `package.json`). Shipping this is a store build, not OTA. This step ships nothing; the release is step 11.
7. **Step 5 is not merged** (`src/core/mushaf-pack/` absent on 12 Nov 2026). Hard prerequisite.
8. **Hafs word boxes are not approved** (ADR 0090 decision 6, status `failed`). The pill and box-based follow are built and tested with fixtures, but a real Hafs pack has no boxes until the developer signs off W7. With no boxes the page shows the ayah wash only. Decision 4 («Hafs ships only with word by word») means the new Mushaf must not be released before the boxes exist; D7's switch keeps the old Mushaf until a pack is published.

## Performance budget and the on-device check

Targets (iPhone 17 Pro simulator, dev build; the simulator is slower than a phone, so these are the spike's measured values with a margin):

- 60 fps scrolling of a 20-page animated scroll (spike: 60.2–60.3 fps, longest frame ≤ 24 ms). A longest frame above 33 ms fails.
- Per page: inflate ≈ 62 ms (once, prefetched, never in a visible frame), picture record ≈ 4 ms warm / 15 ms first, theme re-record ≈ 4 ms per visible page.
- Memory: at most 8 cached page paths and their pictures; no raw SVG string kept.
- CPU stays low: one Canvas per page; the pill animates only for about 150 ms per word; no timers while not following; no animation loops; accessibility elements only with a screen reader.

On-device check (**iOS simulator, iPhone 17 Pro only. No Android emulator, no Gradle or Android builds. Shut the simulator down when done**: `xcrun simctl shutdown booted`). Use the already booted iPhone 17 Pro; never create or boot another simulator (ask first). Metro dev build as the spike did:

1. Install a **test pack** on the simulator from the real API only if the developer has published one; otherwise stop at the unit tests and report that the on-device check waits for a published pack (the step 5 hook cannot install anything real yet). Do not fabricate artwork.
2. If a pack is available: open the Mushaf at a page; check the polygons sit on the printed lines (A2's assumption), scroll 20 pages and read the frame stats like the spike did (`useFrameCallback`; do not leave that probe in the code), toggle dark mode, and check VoiceOver reaches the ayah elements (B4.7). Play a recitation and check the follow-scroll and the pill.
3. Record the numbers and the pill padding constants in the report.

## Review against the frames (ADR 0087, root `CLAUDE.md`)

Frames are approved (12 Nov 2026) and are not edited here; do not touch `design/`.

1. `python3 packages/design-tokens/scripts/frame-shot.py Mushaf <scratchpad>/mushaf-frame.png` and `… LoadingMushaf <scratchpad>/loading-frame.png` (390 × 844).
2. Simulator screenshots: `xcrun simctl io booted screenshot <scratchpad>/mushaf-sim.png` with the Mushaf open on page 50 scrolled as the frame is (first box at `margin-top: -190px`), the recited ayah and word as the frame's overlay (A: 33.30% wide band on the first line, B: the second, pill on the word), and the download card state for `LoadingMushaf` at 42%.
3. Compare: page box and gold double border, page width 358 (390 − 2×16), artwork position, wash rectangles and radius 6, pill rectangle and radius 8, the light word, divider text, card layout and copy, button sizes. A visible mismatch is a failure unless it is listed in this brief. The reviewer also opens `design/core/Mushaf/index.html` and `design/loading/LoadingMushaf/index.html` (derived variants are drafts; a mismatch with one is a question for the developer).
4. If the pack is not available for step 3, the review covers the download card against `LoadingMushaf` and the page by unit tests; say so.

## Gates (run in this order, from `apps/mobile`; Node 26 through nvm; never two jest runs at once, `pkill -f jest` first)

```bash
npm run lint
npx tsc --noEmit
npx jest --maxWorkers=2 src/features/reader/mushaf-svg src/features/reader/MushafSvgList.test.tsx src/features/reader/components/MushafSvgPage.test.tsx src/features/reader/components/MushafSvgContainer.test.tsx src/features/reader/components/MushafDownloadCard.test.tsx src/features/reader/components/MushafPageError.test.tsx src/features/reader/screens/ReaderScreen.test.tsx
```

Then the full `npm test -- --maxWorkers=2` once. `npx expo-doctor` is not needed (no dependency changed). No `npm-audit`/`composer audit`. Also: the test greps for raw hex in the new component files, and `git status --short` compared with the saved list differs only by this step's files.

## Out of scope

- Reader settings sheet, Settings › Reading, onboarding, the mushaf picker, `settings-model` migration, Scheherazade removal (step 8). Only the read-only selector `useChosenMushafKey` is added here.
- Other riwayat's per-riwayah marks, bookmarks, notes, reading place, `user.db`, ayah-number maps, Reading/Focus switching to Hafs (step 9).
- Reciter `riwayah` data and list (step 9b); only `shownMushafKey` and its call are built.
- Removing `HafsMushafList`, `HafsPage`, `HafsMushafPage`, the QCF path, the 640 constant, the spike route (step 10).
- API, packs, contract, frames, `design/`, the Sources credit and website copy.
- The ayah-marker «fill brand» for the recited ayah (ADR 0012): the number ornaments are part of the artwork and are drawn as received; the frame shows no such fill.
- Store release and OTA (step 11), Android, iPad and foldable device checks (developer's rule: iOS simulator only).

## Done when

- Gates pass; every new component has its colocated test; no Quran text or artwork in any fixture; no raw hex in components; no new dependency.
- The report lists: files created and changed, the frame-comparison result, measured fps and longest frame (or why the on-device check waited), the final `PILL_PAD_X`/`PILL_PAD_Y`, the strings the developer must confirm (D4), and every disagreement between this brief and the code.

## Open questions for the developer (put in the report; do not decide)

- **Q1.** First open with the pack absent: start the Hafs download at once (ADR 0090 decision 9 wording, the brief's default, Wi-Fi-only respected) or wait for a tap on the card?
- **Q2.** Should the toolbar page/juz, the saved place and `usePlaybackReadingPlace` move to the pack's page↔ayah mapping too (36 pages differ)? The brief leaves them on `verses.page`.
- **Q3.** The light word follows the pill's motion (clip), not ADR 0039 decision 5's «turns light on arrival». OK, as the approved frame draws it?
- **Q4.** `useBoxFollow` instead of reusing `useWordFollow` itself (plan step 7 wording): OK?
- **Q5.** If VoiceOver cannot reach `pointerEvents="none"` elements on iOS, the fallback is per-element `onPress` in screen-reader mode. OK?
- **Q6.** How the khatma marker looks on a polygon (the old list uses a Text prop `khatmaMarked`): confirm the token fill the implementer finds, or draw a different mark.
- **Q7.** Is `colors.ink` the right page ink (the artwork's original is a near-black), or does the developer want a dedicated `mushafInk` token in `@quran/design-tokens`?


## Decisions on the conflicts and open questions (coordinator, 12 Nov 2026)

- **Q1, download:** start automatically on the first Mushaf open when the downloads setting allows it, which means on Wi-Fi if Wi-Fi only is on (ADR 0090 decision 9). Otherwise show `MushafDownloadCard` with its button.
- **Q2, page mapping:** in Mushaf mode, the toolbar page, the saved place and `usePlaybackReadingPlace` use the pack's page↔ayah mapping (ADR 0090 W6 consequence). Reading and Focus keep `verses.page`.
- **Q3, the light word:** it is revealed as the pill passes over it, as in the approved frame.
- **Q4:** `useBoxFollow` is accepted. Reuse the pure functions of `word-follow.ts` and do not fork them.
- **Q5, VoiceOver:** give each ayah its own accessible element with `onPress` while a screen reader is on.
- **Q6, khatma marker:** the existing khatma colour token, drawn as a polygon wash in the same layer as the reader's colours. No new design.
- **Q7, ink:** use the existing `colors.ink`. Add no new token.
- **Conflict 2:** ADR 0090 decision 8 now says Skia. Edit the spec §12 phrase as the brief says.
- **Conflict 5:** a page is capped at 600, as in the ADR and spec. Change only the Mushaf page cap and leave other uses of `layout.ts` alone.
- **Order:** step 7 starts after step 5 is merged into the working tree.

## Review (coordinator, 15 Nov 2026)

Built and tested; the simulator check is still to do. On 15 Nov 2026 the developer approved changing the two frames to existing tokens, rather than adding new tokens:
- the `LoadingMushaf` title is now 20 pt (`displaySm`);
- the `Mushaf` ayah washes now have 8 px corners (`radius.sm`).

Both frames were rebuilt. The code already used these values, so code and frames now match.
