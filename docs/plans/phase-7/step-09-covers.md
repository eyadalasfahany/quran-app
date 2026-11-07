# Step 9 — Cover tokens and `CollectionCover`

Plan: `docs/plans/phase-7.md` (step 9 row, tests row 9, D5, D9, D13, RB11). Hadith ADR: `docs/adr/0042-hadith-collections-source.md` §4 (null titles) and §10 (covers are a rendered component). Approved frames: `screens/frames/hadith/HadithCollCovers.html`, `HadithCollCoversSepia.html`, `HadithCollCoversDark.html` (approved by the developer, 7 Nov 2026), plus the cover uses in `HadithCollList*.html`, `HadithCollBooks*.html`, `HadithCollSingle*.html`, `HadithCollUntitled*.html`, `HadithCollDownload.html`.

## Read first
1. `.claude/agent-rules.md`, `CLAUDE.md`, `apps/mobile/CLAUDE.md`, `.agents/skills/apple-design/SKILL.md` (load `color.md`, `accessibility.md`, `dark-mode.md`).
2. `git branch --show-current` (expected `main`). **Do not commit, do not switch branches, do not add a dependency.**
3. **Re-read before you edit** `packages/design-tokens/src/colors.ts`, `quran-app-design-system.html` (line 3), `apps/mobile/src/shared/ui/index.ts` and both `apps/mobile/src/core/i18n/locales/{ar,en}.json`. Another session has uncommitted changes in `packages/design-tokens/src/{colors,motion,scale,typography}.ts` and in `src/shared/ui`. Edit the current content, append only, never rewrite a file from memory, and never revert changes you did not make.
4. Do not edit anything under `screens/`. Do not edit `docs/technical-spec.md`.

## Goal
Add the cover colour tokens (light, sepia, dark) to the design system and to `packages/design-tokens`, then build `CollectionCover`: a bound book drawn from tokens (spine, page edge, gold frame line, one of three ornaments, cream title). It matches the approved frames. UI only; no data, no API, no screens (the screens are step 12).

**Dependencies:** `react-native-svg` 15.16.0 is already in `apps/mobile/package.json` (used by `Rosette.tsx`). Use it. No new dependency, no `expo install`. Because only JS changes (no package, no config plugin, no native field), the native fingerprint does not change and the release is an OTA update.

## What the approved frames show (the source of every number below)
- The covers are bound books. Four muted binding tones plus a neutral ground. **The grounds are identical in light, sepia and dark** (the three specimen frames use the same hex values; only the page behind them changes). The dark frames have **no cover border**. This overrides the older "Cover palette" table in `step-08-frames.md` (ten grounds, a darkened dark ground, a 1 px dark border): see Open question 1.
- Title colour is the cream `#F7F3EA`; ornament is the gold `#C9A961` at opacity 0.8; frame line is gold at alpha 0.7.
- Contrast of the title on each ground (WCAG, recomputed): green 8.64, maroon 9.45, navy 10.18, brown 8.41, neutral 6.57. All at least 4.5 : 1 in all three themes.

| Tone | Ground | Contrast with the title | Slugs |
| --- | --- | :---: | --- |
| green (brand) | `#1f4d40` | 8.64 | `bukhari`, `nasai`, `shahwaliullah40` |
| maroon | `#6b2a34` | 9.45 | `muslim`, `malik`, `qudsi40` |
| navy | `#243b5e` | 10.18 | `abudawud`, `nawawi40` |
| brown | `#5c4130` | 8.41 | `tirmidhi`, `ibnmajah` |
| neutral | `#4a5a55` | 6.57 | fallback: a `null` or unknown slug |

Ornament per slug (as drawn in the frames; the fallback and the ornament-only cover use `star`):

| Slug | Ornament |
| --- | --- |
| `bukhari`, `nawawi40`, `qudsi40` | `star` |
| `muslim`, `tirmidhi`, `nasai` | `rings` |
| `abudawud`, `ibnmajah`, `malik`, `shahwaliullah40` | `diamond` |
| fallback (null or unknown slug) | `star` |

## Files

### Create
1. `apps/mobile/src/shared/ui/collection-cover.ts` — pure data: types, slug map, size metrics, ornament shapes.
2. `apps/mobile/src/shared/ui/collection-cover.test.ts`
3. `apps/mobile/src/shared/ui/CoverOrnament.tsx` — the SVG ornament (its own file, per the frontend rule).
4. `apps/mobile/src/shared/ui/CoverOrnament.test.tsx`
5. `apps/mobile/src/shared/ui/CollectionCover.tsx`
6. `apps/mobile/src/shared/ui/CollectionCover.test.tsx`

### Change (append only)
7. `quran-app-design-system.html` — line 3 only (the `<style>` token block that `check-html.mjs` reads).
8. `packages/design-tokens/src/colors.ts` — the `ColorTokens` type and the three theme objects.
9. `apps/mobile/src/shared/ui/index.ts` — export `CollectionCover` and `CoverOrnament` (the index test fails without them), plus the types `CoverSize`, `CoverSlug`.
10. `apps/mobile/src/core/i18n/locales/ar.json` and `en.json` — two keys under `ui` (see "Strings").

Do not touch `scripts/check-html.mjs`, `gen-swift.mjs` (it uses a fixed key list; the new tokens do not go to the widgets), `scale.ts`, `typography.ts`, `motion.ts`, or any file under `screens/`.

## 1. Tokens

### 1a. The 13 new colour tokens (same value in `light`, `sepia`, `dark`)

| CSS variable (design system) | `ColorTokens` key | Value | Use |
| --- | --- | --- | --- |
| `--cover-green` | `coverGreen` | `#1f4d40` | binding ground |
| `--cover-maroon` | `coverMaroon` | `#6b2a34` | binding ground |
| `--cover-navy` | `coverNavy` | `#243b5e` | binding ground |
| `--cover-brown` | `coverBrown` | `#5c4130` | binding ground |
| `--cover-neutral` | `coverNeutral` | `#4a5a55` | fallback ground |
| `--cover-title` | `coverTitle` | `#f7f3ea` | title text |
| `--cover-ornament` | `coverOrnament` | `#c9a961` | ornament stroke |
| `--cover-frame-line` | `coverFrameLine` | `rgba(201, 169, 97, 0.7)` | inset frame line |
| `--cover-spine` | `coverSpine` | `rgba(0, 0, 0, 0.28)` | spine band |
| `--cover-spine-edge` | `coverSpineEdge` | `rgba(201, 169, 97, 0.45)` | 1 px gold line on the spine's edge |
| `--cover-page-edge` | `coverPageEdge` | `#efe6d2` | page-block strip |
| `--cover-shadow` | `coverShadow` | `rgba(19, 35, 31, 0.28)` | drop shadow, near layer |
| `--cover-shadow-soft` | `coverShadowSoft` | `rgba(19, 35, 31, 0.14)` | drop shadow, soft layer |

Write the strings exactly as shown: hex lowercase, `rgba(` with a space after each comma and a leading-zero alpha (`0.28`), because `check-html.mjs` compares the strings. Do not name a variable with a prefix the checker treats as a scale (`shadow-`, `space-`, `radius-`, `blur-`, `font-`, `duration-`, `ease-`, `spring-`); `--cover-shadow` starts with `cover-`, which is a colour.

### 1b. `quran-app-design-system.html` (line 3)
Line 3 is one long line. The three theme blocks are `:root,[data-theme=light]{…}`, `[data-theme=sepia]{…}` and `[data-theme=dark]{…}`; each ends with `…--shadow-raised:<value>;}`. In **each of the three blocks**, insert the 13 declarations immediately before that block's closing `}`, after the existing last `;`, in the table's order, as `--cover-green:#1f4d40;--cover-maroon:#6b2a34;…--cover-shadow-soft:rgba(19, 35, 31, 0.14);`. Do not touch the `[data-contrast=more]` blocks. Do not add a visible swatch section to the page body (out of scope). Do not reformat anything else on the line. Use a targeted edit of the three insertion points, not a rewrite of the file.

### 1c. `packages/design-tokens/src/colors.ts`
- In `ColorTokens`, after `qiblaCounterweight: string;`, add the 13 keys as `string`, in the table's order, with a one-line comment above the group: `/** Hadith collection covers (screens/frames/hadith, HadithCollCovers*). Same in every theme. */`.
- In each of the three theme objects (`light`, `sepia`, `dark`), after `qiblaCounterweight: …,`, add the 13 entries with the table's values.
- Nothing else changes in the file.

## 2. `collection-cover.ts` (exact exports)

```ts
import type { ColorTokens } from '@quran/design-tokens';

export const coverSlugs = [
  'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'ibnmajah',
  'nasai', 'malik', 'nawawi40', 'qudsi40', 'shahwaliullah40',
] as const;
export type CoverSlug = (typeof coverSlugs)[number];

export type CoverSize = 'list' | 'header' | 'compact';
export type CoverOrnamentShape = 'star' | 'rings' | 'diamond';
export type CoverGround = 'coverGreen' | 'coverMaroon' | 'coverNavy' | 'coverBrown' | 'coverNeutral'; // keys of ColorTokens

export type CoverMetrics = {
  width: number; height: number;
  spineWidth: number; pageEdgeWidth: number;
  frameInsetY: number; frameInsetStart: number; frameInsetEnd: number;
  ornamentSize: number; ornamentTop: number; ornamentStart: number;
  titleSize: number; titleBottom: number; titleInsetStart: number; titleInsetEnd: number;
};

export const coverMetrics: Record<CoverSize, CoverMetrics>;
export const coverGrounds: Record<CoverSlug, CoverGround>;       // tone per slug (table above)
export const coverOrnaments: Record<CoverSlug, CoverOrnamentShape>; // ornament per slug (table above)
export const fallbackGround: CoverGround;                         // 'coverNeutral'
export const fallbackOrnament: CoverOrnamentShape;                // 'star'
export function isCoverSlug(value: string | null | undefined): value is CoverSlug;
export function coverGround(slug: string | null | undefined): CoverGround;       // unknown or null -> fallbackGround
export function coverOrnament(slug: string | null | undefined): CoverOrnamentShape; // unknown or null -> fallbackOrnament
```

`coverMetrics` values (all in dp, from the frames; the `header` size is the 96 × 128 cover of `HadithCollBooks`, the `list` size is the 56 × 75 thumbnail of `HadithCollList`, the `compact` size is the 40 × 53 cover of `HadithCollSingle` and `HadithCollDownload`):

| Key | `list` | `header` | `compact` |
| --- | :---: | :---: | :---: |
| `width` | 56 | 96 | 40 |
| `height` | 75 | 128 | 53 |
| `spineWidth` | 6 | 11 | 5 |
| `pageEdgeWidth` | 2 | 4 | 2 |
| `frameInsetY` (top and bottom) | 7 | 7 | 7 |
| `frameInsetStart` | 10 | 15 | 9 |
| `frameInsetEnd` | 6 | 8 | 6 |
| `ornamentSize` | 19 | 33 | 14 |
| `ornamentTop` | 16 | 28 | 12 |
| `ornamentStart` | 20 | 35 | 14 |
| `titleSize` | 11 | 12 | 11 |
| `titleBottom` | 12 | 12 | 12 |
| `titleInsetStart` | 13 | 18 | 12 |
| `titleInsetEnd` | 9 | 11 | 9 |

No raw colour (`#…` or `rgb(`) in this file, not even in comments (the shared-ui test scans every source file for them).

## 3. `CoverOrnament.tsx`

```ts
export function CoverOrnament({ shape, size, color, testID }: {
  shape: CoverOrnamentShape; size: number; color: string; testID?: string;
}) // no return type annotation, as the other components in this folder
```
- A `View` (`width`/`height` = `size`, `opacity: 0.8`, `pointerEvents="none"`, `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`) holding an `Svg` from `react-native-svg` with `viewBox="0 0 100 100"`, `width={size}`, `height={size}`, `fill="none"`, stroke `color`, `strokeWidth={2.2}`. Pattern: `Rosette.tsx` (same folder). The opacity is a named constant in the file (`ORNAMENT_OPACITY = 0.8`), not an inline literal.
- Shapes (copied from the frames' SVG):
  - `star`: `<Path d="M50 4l13 33 33 13-33 13-13 33-13-33L4 50l33-13z" />` and `<Circle cx={50} cy={50} r={10} />`
  - `rings`: `<Circle cx={50} cy={50} r={30} />` and `<Circle cx={50} cy={50} r={14} />`
  - `diamond`: `<Path d="M50 14 L86 50 L50 86 L14 50 Z" />` and `<Circle cx={50} cy={50} r={7} />`
- Tests (`CoverOrnament.test.tsx`), named:
  - `draws the star as one path and one circle`
  - `draws the rings as two circles`
  - `draws the diamond as one path and one circle`
  - `strokes with the colour it is given at width 2.2` (use `svgPaint` from `jest/render-ui.tsx` if you assert the native props, as `Rosette.test.tsx` does; read that file first)
  - `is hidden from screen readers`
  - `has no raw colour literals` (`rawColorLiterals('CoverOrnament.tsx')` is `[]`)

## 4. `CollectionCover.tsx`

```ts
export function CollectionCover({ slug, title, size = 'list', accessibilityLabel, testID }: {
  slug: string | null;        // a collection slug; null or unknown uses the neutral fallback
  title: string | null;       // the Arabic title (Arabic UI) or the source title_en (English UI); null = ornament only
  size?: CoverSize;           // 'list' (56 x 75) | 'header' (96 x 128) | 'compact' (40 x 53)
  accessibilityLabel?: string;
  testID?: string;
}) // no return type annotation, as the other components in this folder
```

Structure, back to front (all `position: 'absolute'` inside the cover `View`, which has `overflow: 'hidden'`). Use `useTheme()` for every colour; use `start`/`end` (logical) for the inline positions the frames call `inset-inline-start`/`-end`:
1. **Cover `View`**: `width`/`height` from `coverMetrics[size]`, `backgroundColor: theme.colors[coverGround(slug)]`, `borderTopLeftRadius: 4`, `borderBottomLeftRadius: 4`, `borderTopRightRadius: 6`, `borderBottomRightRadius: 6` (physical corners, as the frames draw them; Open question 4), `boxShadow: '3px 6px 12px ' + theme.colors.coverShadow + ', 0px 1px 2px ' + theme.colors.coverShadowSoft` (React Native's `boxShadow` style takes CSS strings; `QiblaHub.tsx` already uses it). `testID={testID}`.
2. **Spine**: `top: 0, bottom: 0, start: 0, width: spineWidth, backgroundColor: coverSpine`, `boxShadow: 'inset -1px 0 0 ' + coverSpineEdge`.
3. **Page edge**: `top: 2, bottom: 2, end: 0, width: pageEdgeWidth, backgroundColor: coverPageEdge, borderTopRightRadius: 2, borderBottomRightRadius: 2`.
4. **Frame line**: `top: frameInsetY, bottom: frameInsetY, start: frameInsetStart, end: frameInsetEnd, borderWidth: theme.stroke.hairline, borderColor: coverFrameLine, borderRadius: 2`.
5. **Ornament**: `CoverOrnament` with `shape = coverOrnament(slug)`, `size = ornamentSize`, `color = coverOrnament` token, inside a wrapper `View` at `top: ornamentTop, start: ornamentStart`. Name the local variable differently from the token to avoid a clash with the imported function.
6. **Title** (only when `title` is not `null` and not `''`; do not trim): a `Text` at `bottom: titleBottom, start: titleInsetStart, end: titleInsetEnd`, `textAlign: 'center'`, `fontFamily: displayFontFamilies[700]` (from `@/core/theme`, gives Amiri Bold), `fontSize: titleSize`, `lineHeight: Math.round(titleSize * 1.3)`, `color: coverTitle`, `numberOfLines={2}`, `maxFontSizeMultiplier` = a named constant `TITLE_MAX_FONT_SCALE = 1.2` (Open question 3). Do not force `writingDirection`; the Arabic title is RTL by itself and an English title stays LTR.
   - **A `null` title renders no `Text` at all** (the ornament-only cover, D9). The Arabic UI never passes the English name: that is the caller's rule, and the component never substitutes anything for a missing title.

Accessibility (on the cover `View`): `accessible`, `accessibilityRole="image"`, `accessibilityLabel = accessibilityLabel ?? (title ? t('ui.collectionCover.titled', { title }) : t('ui.collectionCover.untitled'))`. Use `useTranslation` from `react-i18next` (pattern: `DownloadRow.tsx`). The inner pieces are decorative; the ornament is already hidden from screen readers, and the title `Text` needs no separate focus because the parent is the single accessible element.

### Strings (`ui` object, append at the end of the object in both files)
- `ar.json`: `"collectionCover": { "titled": "غلاف {{title}}", "untitled": "غلاف مجموعة" }`
- `en.json`: `"collectionCover": { "titled": "Cover of {{title}}", "untitled": "Collection cover" }`

No other strings. No hard-coded text in the component.

## 5. Tests

`apps/mobile/src/shared/ui/collection-cover.test.ts`:
- `maps every slug to its tone` (each of the ten slugs against the table; `it.each`)
- `maps every slug to its ornament` (ten slugs against the ornament table)
- `uses the neutral ground and the star for null and unknown slugs` (`null`, `'unknown'`, `''`, and a near-miss such as `'nawawi'`, the pre-D13 slug, which must be unknown)
- `lists exactly the ten canonical slugs` (D13: `nawawi40`, `qudsi40`, `shahwaliullah40`)
- `defines metrics for list, header and compact` (spot-check `width`/`height` 56 × 75, 96 × 128, 40 × 53)
- `has no raw colour literals` (`rawColorLiterals('collection-cover.ts')` is `[]`)

`apps/mobile/src/shared/ui/CollectionCover.test.tsx` (use `renderUi`, `flatStyle`, `locales` from `jest/render-ui.tsx`, `rawColorLiterals` from `jest/ui-source.ts`, `themes` from `@/core/theme`; pattern: `GoldFrame.test.tsx`, `NumberMedallion.test.tsx`). Use the placeholder title `'نص تجريبي — ليس اسم مجموعة'` (and `'FIXTURE title — not a collection name'` for English); never a real collection name or religious text.
- `draws each of the ten slugs on its tone` (`it.each` over the ten slugs: the cover's `backgroundColor` equals `themes.light.colors[tone]`; also assert the ornament shape via the ornament's `testID` if you give it `${testID}-ornament`, or via the number of `Circle` children)
- `draws the fallback on the neutral ground for a null and an unknown slug`
- `draws the title in the cream colour, Amiri Bold, centred` (colour `coverTitle`, `fontFamily: 'Amiri-Bold'`, `textAlign: 'center'`, `numberOfLines` 2)
- `draws no title text when the title is null` (the cover has no `Text`; the ornament is still there)
- `draws no title text for an empty title`
- `never shows the English name in the Arabic UI` (render with `locale: 'ar'` and `title: null`: no text node at all on the cover)
- `renders the three sizes at the frame dimensions` (`it.each`: `list` 56 × 75, `header` 96 × 128, `compact` 40 × 53; spine, page edge and ornament sizes from `coverMetrics`)
- `draws the spine, the page edge and the gold frame line` (colours from the theme tokens)
- `uses the same ground in light, sepia and dark` (`it.each(['light', 'sepia', 'dark'])` with `renderUi(…, { theme })`: the background equals `themes[theme].colors.coverGreen` for `bukhari`, and so on for one slug per tone)
- `renders under %s` (`it.each(locales)`: the cover shows in `ar` (RTL) and `en` (LTR); the spine sits on the start side: assert `start: 0` on the spine style, not a left/right value)
- `exposes an image role with a label from the title` (`getByRole('image', { name: … })` or props check: `accessibilityRole` is `'image'`, label contains the title, both locales)
- `labels an untitled cover without a title` (`ui.collectionCover.untitled` in `ar` and `en`)
- `lets the caller override the label`
- `has no raw colour literals` (`rawColorLiterals('CollectionCover.tsx')` is `[]`)

**Contrast test** (in `CollectionCover.test.tsx`, a `describe('title contrast')`): write a small local `contrastRatio(hexA, hexB)` using the WCAG relative-luminance formula (sRGB channel `c ≤ 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`; `L = 0.2126 R + 0.7152 G + 0.0722 B`; ratio `(Lhi + 0.05) / (Llo + 0.05)`). Import `colors` and `themeNames` from `@quran/design-tokens`.
- `title on every ground is at least 4.5 : 1 in light, sepia and dark` (`it.each` over 3 themes × 5 grounds = 15 cases; `colors[theme].coverTitle` against `colors[theme][ground]`)
- `matches the contrast values drawn in the approved frames` (`toBeCloseTo`, 2 digits: green 8.64, maroon 9.45, navy 10.18, brown 8.41, neutral 6.57)
- `has the same cover tokens in every theme` (all 13 keys equal across `light`, `sepia`, `dark`)
- `has the frame token values` (the 13 values of the table in section 1a, for `light`)

The ornament-only cover has no text, so the 4.5 : 1 rule does not apply to it (accepted: `step-08-frames.md`, Q11).

The existing `src/shared/ui/index.test.ts` checks that every component file is exported from `index.ts`, has a colocated test, and has no raw colour literal. It must pass.

## 6. Gates (run all, from the folder shown, Node 26 through nvm)

From `/Applications/MAMP/htdocs/quran-app`:
```bash
npm run check:html -w @quran/design-tokens      # must report 0 mismatches (it now also checks the 13 new tokens in all three themes)
npm run typecheck -w @quran/design-tokens
```
From `/Applications/MAMP/htdocs/quran-app/apps/mobile`:
```bash
npm run lint && npx tsc --noEmit && npx jest src/shared/ui/CollectionCover
npx jest src/shared/ui/collection-cover src/shared/ui/CoverOrnament src/shared/ui/index.test.ts
```
The first jest command matches only `CollectionCover.test.tsx`; the second covers `collection-cover.test.ts`, the ornament test and the shared-ui index test. Run both. Also run `git status --short` and confirm that nothing under `screens/` changed because of this step, and that `git diff --stat` for `quran-app-design-system.html` shows one changed line.

If a gate fails, fix it. Do not weaken a test, edit `check-html.mjs`, or add an allowlist entry.

## Visual check (done by the reviewing agent, not the implementer)
Step 12 builds the screens; this step has no screen. The reviewer renders a throwaway test harness or the component in isolation and compares it with `HadithCollCovers`, `HadithCollCoversDark` and the `HadithCollList` thumbnails (`python3 packages/design-tokens/scripts/frame-shot.py HadithCollCovers <out.png>`) on the iPhone 17 simulator. A mismatch fails the review.

## Out of scope
- Any screen, route, list row, header, download sheet or pack code (steps 11 to 13). Any `slug` or `title` data from the API or the pack.
- A visible cover swatch section in the body of `quran-app-design-system.html`.
- A dark-mode border or a darker dark ground (the approved frames have neither).
- Per-collection ornament choice beyond the table; new slugs; images.
- Android-specific shadows (`boxShadow` is used as in `QiblaHub.tsx`; step 16 reports any Android difference).
- `gen-swift.mjs`, widgets, watch.
- Editing `docs/plans/phase-7.md`, ADR 0042 or `step-08-frames.md` (the wording differences below are for the developer).

## Open questions (for the developer)
1. **Palette: the approved frames differ from the written plan.** Plan step 9, D5 and ADR 0042 §10 say "ten palette tokens plus fallback"; `step-08-frames.md` ("Cover palette") lists ten different grounds, a dark ground mixed 30% toward the page, and a 1 px dark border. The approved frames (7 Nov 2026) show **four binding tones plus a neutral**, the **same hex in all three themes**, and **no dark border**. This brief follows the frames: five ground tokens, not eleven, and no per-theme difference. If the developer wants darker dark grounds or a dark border, that is a change to the frames first. The plan, ADR 0042 and step 8 text should be updated to say "four tones plus neutral".
2. **Three sizes, not two.** The task named `list` and `header`. The approved frames also draw a `compact` cover (40 × 53) in `HadithCollSingle*` and `HadithCollDownload`, so the brief adds `compact`. The `header` cover is 96 × 128 as in `HadithCollBooks`; `step-08-frames.md` said 132 × 176 and the covers specimen uses 98 × 131. Remove `compact` if the developer wants strictly two.
3. **Title line height and Dynamic Type.** The frames set the title at line-height 1.3. The codebase notes that Amiri needs about 1.758 to avoid clipping marks above letters on iOS (`amiriNaturalLeading`, `typography.ts`), but at the list size that would push a two-line title into the ornament. The brief follows the frames (1.3) and caps the title's text scaling at 1.2 (`TITLE_MAX_FONT_SCALE`), because the cover has a fixed size. If the simulator check shows clipped marks, the developer decides between a taller line, one line only, or a smaller ornament.
4. **Physical versus logical edges.** In the Arabic (RTL) frames the corner radii (4 left, 6 right), the page-edge rounding and the spine's inset gold line are drawn on physical sides (CSS `border-radius`, `box-shadow`), while the spine and page edge themselves sit on logical sides. In Arabic that rounds the spine side by 6 and puts the spine's gold line on its outer edge. The brief copies the frames exactly (physical corners and inset shadow, logical positions). A fully mirrored book would be a 2 px, 1 px change on the frames; the developer decides.
5. **Accessibility label wording.** «غلاف {title}» / "Cover of {title}" and «غلاف مجموعة» / "Collection cover" are drafted UI copy for the developer to confirm. The list row and header already carry the visible name («مجموعة {n}» when untitled), so screens may pass their own `accessibilityLabel`.
6. **Raw `Text` for the title, not `UiText`.** Plan line 264 lists `UiText` for `CollectionCover`. The title needs Amiri Bold at 11 or 12 pt with line height 1.3; `UiText` takes only the type-scale variants and applies the window text factor (ADR 0043), which would grow a fixed-size cover. The brief therefore uses `Text` (as `AyahEndMark.tsx` and `SearchField.tsx` do; no lint rule forbids it) and caps scaling itself. Also, the plan's list of reused components (`Card`, `Divider`, `ScreenHeader`, `SheetHeader`) does not apply to a cover. Confirm, or ask for `UiText` with style overrides.
7. **Shadow as two colour tokens.** The shadow is two colour tokens (`coverShadow`, `coverShadowSoft`) with the offsets in the component. A `--shadow-cover` entry in the existing `shadows` family (CSS string, checked by `check-html`) is the alternative; say if the developer prefers it.
8. **Slug-less caller.** `slug` is `string | null`, not `CoverSlug`, because the pack can later contain a collection the app does not know (ADR 0042 §10, "an unknown slug uses a neutral fallback palette"). A known slug with a null title keeps its tone and shows the ornament only; only an unknown or null slug uses the neutral ground.

## Answers to the open questions (orchestrator, 7 Nov 2026)

These override anything above that conflicts with them.

1. Follow the approved frames: four tones plus a neutral, the same values in every theme, no dark border. The plan's D5 now says so.
2. Keep `compact` (40×53). Keep the header at 96×128, as in the frames.
3. Follow the frames (line height 1.3, text scaling capped at 1.2). Check for clipped marks on the iPhone 17 simulator at step 13.
4. Copy the frames exactly. No mirroring change.
5. Accept the drafted accessibility labels.
6. Use raw `Text` for the cover title, with a comment explaining why (fixed-size cover, no `UiText` variant).
7. Keep the two shadow colour tokens.
8. Accept `slug: string | null` with the neutral fallback for null or unknown slugs.
