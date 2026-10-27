# Step 11 — Design conformance (App)

Follow [README.md](README.md). Needs steps 1–9. Decisions: [ADR 0013](../../adr/0013-screens-html-wins.md).

**Goal:** every built screen matches its frame in `quran-app-screens.html`, and every visual is owned by one component, so a later design fix is made once.

**Rules for this step (ADR 0013):**
- Where the screens HTML disagrees with the spec or the design system, the screens HTML wins.
- Restyle what is built. Frame elements for features that aren't built wait for their feature (Home content, the player, the script picker, search filters, the offline banner, word chips).
- Built features the frames don't draw stay, styled with the frames' tokens: tabs inside phone sheets, the resume pill, translations in reader settings, the tafsir and translation tiles.

## 11a — Shared owners (no intended visual change)

**Status: done** (27 Oct 2026). In the working tree, not committed. Do not reimplement. Also landed: `Screen`, `MainShell` and `useTabBarStyle` (the `(main)` route only composes), `PanelTabs` (shared by `SidePanel` and `SheetContainer`), `MeasuredRow`, `SearchMessage`, `SurahRow variant="result"` (replaces the duplicate search row), and `FocusAyah` as the one owner of the current Focus ayah. `ReadingList` no longer has a Focus branch. `PanelButton` and `MushafPageBreak` are deleted. Small visual changes that came with the owners: `Button` is 17/600 everywhere (was 15/400 in panels), translation toggles are the platform `Switch`, the sheet grabber is 40×5, the QCF page uses the page frame (6/1.5), and muted text and lines follow Increase Contrast.

Gaps carried into 11b: `IconButton` has no tone, size or disabled prop; `Card` has no surface tone or zero padding; `ListRow` has no content slot, so `SearchResultRow` keeps its own row; no token yet for the 52-pt row height or the 16-pt chevron; no shared text-field owner for `NoteEditor`.

**Tokens** (`packages/design-tokens/src/scale.ts`):
- `size`: touch target 44, icon sizes, sidebar 300, side panel 380, ayah marker 28 and Focus marker 34, swatch 28, grabber.
- `stroke`: hairline 1, marker ring 1.25, swatch ring 1.5, active-ayah rule 3.

**Components** (`src/shared/ui/`, each with its own test):
- **`UiText`:** every interface and display string. `variant` (any type token), `tone` (ink, muted, brand, danger, onBrand, goldInk), optional `weight`, `scale` (`bar` or `content`). Sets the per-weight family, Dynamic Type and the contrast colours.
- **`QuranText`:** every Quran string. `variant` (Quran type token), `fontScale`, `tone`. Never scales with the system size.
- **`Button`:** pill buttons (primary, secondary, danger, ghost), promoted from `PanelButton`. `EmptyState`'s action and `SearchShowMore` use it.
- **`Card`:** the raised card (surface, line border, radius, padding).
- **`Divider`:** the one separator line.
- **`ScreenHeader`:** the large screen title with an optional subtitle and trailing slot.
- **`SheetHeader`:** a sheet or panel title with its close button.
- **`GoldFrame`:** the double gold frame of the Mushaf page and the surah cartouche.
- **`PageDivider`:** the Mushaf page break (was `MushafPageBreak` inside `HafsMushafPage.tsx`).
- **`ToggleRow`:** a `ListRow` with the platform `Switch` (ADR 0012 §7).
- **One highlight-colour map** (`highlightFill`) shared by every reader component.

**Moves:** components defined inside another component's file move to their own file with a test (`HafsPage`, `MushafListPage`, `TranslationBlock`). `Sidebar` wraps `GlassSurface`.

## 11b onwards — Visual fixes

Each fix lands in the component that owns the visual. Order: shared components (segmented control, chips, action tiles, sheet card, title pill, toolbar), then the Mushaf page, the ayah and settings sheets, the index and search, Reading, Focus and Tafsir, and the tablet layouts. The 27 Oct audit's findings per frame are the checklist.

## Tests

Each new component gets the README checklist. Existing tests keep passing; a test that pinned a value the frame changes is updated with the frame's value.
