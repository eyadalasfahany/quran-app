# Step 1 — Design-system components and reading fonts (App)

Follow [README.md](README.md). **Start only after the design-token work (ADR 0012) is committed, including its type-scale step** (text styles mapped to Dynamic Type). It adds `fillSecondary`, `lineStrong`, `onBrandSurfaceMuted`, `playerLine` and a `highContrast` set, and recolours `highlightActive`, and these components read those tokens through `useTheme()`. Read `docs/adr/0012-design-follows-apple-hig.md`. Read also:
- `apps/mobile/src/core/theme/*`: tokens, `useGlass` and the motion helpers.
- The existing `Sidebar` and `SidebarItem` as the house style.
- `quran-app-design-system.html`, the "Components" section.

**Goal:** the shared building blocks the reader screens compose. Each is one file in `apps/mobile/src/shared/ui/` with its own colocated test, and each is exported from `src/shared/ui/index.ts`.

## Fonts

- Amiri 1.003 is already in `apps/mobile/assets/fonts/Amiri/` (`Amiri-Regular.ttf`, `Amiri-Bold.ttf`, `AmiriQuran.ttf`, `OFL.txt`) with pinned hashes. Don't download anything.
- Register them next to IBM Plex in `src/core/theme/fonts.ts`, and load them behind the splash screen, as the UI fonts are.
- Add font-family tokens for `quran` (Amiri Quran) and `display` (Amiri) if the token work hasn't already added them. Check first, and never duplicate.
- Text using them never sets `fontWeight` (the house rule): use the per-weight family.

## Components

Visual source is the frame where each first appears in `quran-app-screens.html` (`#tablet-reader` frames use the same parts).

| Component | Source frame | Props (minimum) | Notes |
| --- | --- | --- | --- |
| `GlassSurface` | Mushaf top bar, sidebar | `children`, `radius`, `style` | Native glass when `useGlass()`, otherwise solid `glassFallback` plus a `line` hairline. **Never** animates opacity |
| `IconButton` | Top bar buttons | `icon` (SF Symbol + Material name), `label`, `onPress`, `pressed?`, `variant: 'plain' \| 'filled' \| 'glass'` | 44 × 44 hit area. `accessibilityState.selected` when pressed |
| `ToolbarPill` | Mushaf top bar (bookmark, settings) | `children` | A glass pill grouping `IconButton`s |
| `TitlePill` | Mushaf top bar title | `title`, `subtitle` | Title in Amiri, subtitle caption |
| `SegmentedControl` | Tablet panel tabs | `options: {key,label}[]`, `value`, `onChange` | `tablist` / `tab` roles, 44 pt segments. Selection feedback through `expo-haptics` (`selectionAsync`): add it with `npx expo install expo-haptics` and to the version table |
| `Chip` | Tafsir picker | `label`, `caption?`, `selected`, `onPress`, `role: 'radio' \| 'button'` | `radio` sets `accessibilityState.checked` |
| `ListRow` | Settings and Surah index rows | `title`, `subtitle?`, `leading?`, `trailing?`, `onPress?` | Chevron mirrors in RTL |
| `SearchField` | Search screen | `value`, `onChangeText`, `placeholder` (from i18n), `onSubmit` | Clear button, 44 pt |
| `ActionTile` | Ayah actions grid | `icon`, `label`, `onPress`, `variant: 'default' \| 'primary'` | The primary variant uses `brandSurface` / `onBrandSurface` |
| `SegmentedControl` track and `ListRow` separators | — | — | Use `fillSecondary` for tracks and `lineStrong` for separators that must stay visible, as ADR 0012 specifies |
| `HighlightSwatch` | Ayah actions colours | `color: 'gold' \| 'green' \| 'blue' \| 'rose'`, `selected`, `onPress` | 44 pt hit area, 28 pt dot. The selected ring is not colour-only: also `accessibilityState.selected`, and the label names the colour |
| `EmptyState` | Empty My Quran | `title`, `body`, `action?` | |
| `AyahMarker` | Mushaf ayah numbers | `number`, `active?`, `onPress?` | Arabic-Indic digits through `formatNumber`. Amiri; gold ring at rest; **`active` = filled brand marker** (ADR 0012). Pressable: opens ayah actions. Used in Reading and Focus modes; page-exact QCF uses the font's own marker glyph |
| `SurahCartouche` | Mushaf surah banner | `name` | Amiri bold, gold frame |
| `WordMeaningChip` | Ayah actions word chips | `word` (Uthmani), `meaning` | The word in Amiri Quran **byte for byte**; the meaning is LTR text when it's English |

## Tests

One colocated test file per component (README checklist), plus `src/shared/ui/index.test.ts` asserting every component file is exported. The shared "no raw hex" check covers every file in `src/shared/ui/`.

## Leave untouched

The token package and theme values (the other session owns them), the routes, and the reader feature code.
