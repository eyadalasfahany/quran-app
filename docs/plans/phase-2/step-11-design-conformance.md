# Step 11 — Design conformance (App)

> **Removed by ADR 0014 (28 Oct 2026):** Quran translations, word-by-word meanings, word chips and the translation panel, tab and settings. Lines below that mention them are history; do not build them.

Follow [README.md](README.md). Needs steps 1–9. Decisions: [ADR 0013](../../adr/0013-screens-html-wins.md).

**Goal:** every built screen matches its frame in `quran-app-screens.html`, and every visual is owned by one component, so a later design fix is made once.

**Rules for this step (ADR 0013):**
- Where the screens HTML disagrees with the spec or the design system, the screens HTML wins.
- Restyle what is built. Frame elements for features that aren't built wait for their feature (Home content, the player, the script picker, search filters, the offline banner).
- Built features the frames don't draw stay, styled with the frames' tokens: tabs inside phone sheets, the resume pill, the tafsir tile.

## 11a — Shared owners (no intended visual change)

**Status: done** (27 Oct 2026). In the working tree, not committed. Do not reimplement. Also landed: `Screen`, `MainShell` and `useTabBarStyle` (the `(main)` route only composes), `PanelTabs` (shared by `SidePanel` and `SheetContainer`), `MeasuredRow`, `SearchMessage`, `SurahRow variant="result"` (replaces the duplicate search row), and `FocusAyah` as the one owner of the current Focus ayah. `ReadingList` no longer has a Focus branch. `PanelButton` and `MushafPageBreak` are deleted. Small visual changes that came with the owners: `Button` is 17/600 everywhere (was 15/400 in panels), translation toggles (since removed by ADR 0014) were the platform `Switch`, the sheet grabber is 40×5, the QCF page uses the page frame (6/1.5), and muted text and lines follow Increase Contrast.

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

**Moves:** components defined inside another component's file move to their own file with a test (`HafsPage`, `MushafListPage`, `TranslationBlock`, removed by ADR 0014). `Sidebar` wraps `GlassSurface`.

## 11b onwards — Visual fixes

Each fix lands in the component that owns the visual. Order: shared components (segmented control, chips, action tiles, sheet card, title pill, toolbar), then the Mushaf page, the ayah and settings sheets, the index and search, Reading, Focus and Tafsir, and the tablet layouts. The 27 Oct audit's findings per frame are the checklist.

**Status: in progress** (28 Oct 2026, working tree). Done:
- Mushaf page: ayahs flow inline per surah; ayah numbers are the `﴿n﴾` mark (`AyahEndMark`, ADR 0012 amended) in every view.
- Reader: Back points to the leading edge; Reading starts below the toolbar with the 20 pt gutter; Focus hides the toolbar and resume pill and insets its exit bar.
- Sheets: a `scrim` behind every reader sheet; tafsir takes the full-width sheet at 52 pt (the translation sheet was removed by ADR 0014) (`AyahSheetScreen` sizes the sheet by tab).
- Index: `SurahRow` (medallion, Amiri name, «مدنية · ٢٨٦ آية», «ص ٢», no chevron), the last-read card.
- Home: the brand Continue reading card, with the design's gold rosette (`Rosette`, `goldOnBrandSurface` at `opacity.ornament`).
- Surah cartouche: the pointed double frame from the design, with an eight-pointed star (۞) in each end, in `react-native-svg` (needs a native rebuild). It and the rosette draw in once when they first scroll into view (spec §12 Motion).
- Basmala: set between the gold ornate parentheses of the end-of-ayah mark (﴿ ﴾), drawn by the app outside the stored text.
- Search: Cancel beside the field (`SearchBar`), card results, matches outlined (`stroke.match`).
- Numbers go through `formatNumber` with `useLocale()`; Arabic plurals work on Hermes (`plural-rules.ts`).
- Ayah sheet: `HighlightRow` (label and swatches on one `surface` row, radius 16, padding 6/14, swatch gap 6); `ActionTile` radius `radius.tile` (16), gap 6, padding 12/2, no min height, primary label 600; 14 pt between sheet blocks.

- Reader settings: `SettingsSection` (13 pt muted label, stacked gap 6 or inline row), mode and theme as `SegmentedControl` (track `fillTrack`, 40 pt segments with 2 pt hit slop, selected ink 600, unselected muted 500, optional leading glyph), `ThemeDot` (12 pt page-colour dot, Automatic split light/dark), `FontScaleStepper` as a track with Amiri «أ−» 16 and «أ+» 20 and the percent 15/600; the Quran preview is gone; sheet padding 10/18/20 and gap 14; grabber 10 pt from the top in every card sheet. Arabic labels «مصحف · قراءة · تركيز» and «حجم خط المصحف».

- Sheets follow their own frame: `SheetHeader closeTone` (`fill` for ayah and tafsir, `track` for settings) and `SheetFrame grabber` (`strong` 40×5 `lineStrong` for ayah, tafsir and delete account; `muted` 36×5 ink-muted at 0.4 for settings). `shadows.raised` (light) is 0.08. `fillTrack` and `goldOnBrandSurface` are in `quran-app-design-system.html`; `check:html` reports 0 mismatches.
- Native iOS chrome follows RTL: the tab bar gets `direction` from `I18nManager.isRTL`, and Arabic is the iOS app language (`CFBundleDevelopmentRegion: ar`, `AppleLanguages` kept in step with the saved locale).

Open:
- Reader settings and ayah sheet checked on the iPhone 17 against their frames (28 Oct): the percent is right-to-left («٪١٠٠»), the «أ−»/«أ+» lines are tall enough for the hamza (Amiri's own leading), and every sheet's close glyph is `size.closeGlyph` (12).

Open:
- Bug (reported 28 Oct, iPhone 17): the reader's Back chevron does nothing in portrait (compact window); it works in landscape (expanded, 874 pt). Under investigation: touch blocked in compact vs `router.back()` popping an invisible sheet route.
- Reader settings: the script picker («خط المصحف») waits for its feature.
- `radius.tile` (16) is not a token in `quran-app-design-system.html` yet.
- Resource names: `installed_resources` keeps no name, so tafsir labels fall back to «تفسير {id}». The manifest already sends `name`, `author_name`, `language_code` and `direction`; storing them is a `content.db` schema change.
- Reader settings, the tafsir panel (header, named chips, source credit, download), the Reading ayah header row with its actions, the Index and Home headers, and the tablet frames.

## Tests

Each new component gets the README checklist. Existing tests keep passing; a test that pinned a value the frame changes is updated with the frame's value.
