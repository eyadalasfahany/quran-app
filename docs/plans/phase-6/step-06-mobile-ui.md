# Step 6 — Azkar mobile UI

ADR 0031, spec §12 (Azkar), frames in the «الأذكار — Azkar» section of `quran-app-screens.html`. Builds on step 5 (data layer, hooks). Two parts, run in order: **6a reader** (the core), then **6b browse and entry points**. Reminders UI is step 7; audio and downloads UI is step 8.

## Rules
- `apps/mobile/CLAUDE.md` in full:
  - one component per file in `src/features/azkar/components/`, each with its colocated `*.test.tsx` (render, variants, interaction, Arabic and English, accessibility role/label/state, no raw hex)
  - screens in `src/features/azkar/screens/` only compose components
  - routes in `app/azkar/` are thin
  - tokens via `useTheme()`; text through `UiText` / text style tokens; motion via `src/core/theme/motion.ts`
- **Reuse before writing:**
  - from `src/shared/ui`: `SectionScreen`, `Screen`, `ScreenHeader`, `IconButton`, `ListRow`, `Card`, `NumberMedallion`, `EmptyState`, `SearchField`, `SkeletonBlock` / `SkeletonGroup`, `Button`, `SegmentedControl`, `ToggleRow`, `QuranText`
  - from features: the reader's font-scale stepper (`src/features/reader/settings/components/FontScaleStepper`), the sheet pattern (`src/features/reader/form-sheet` `sheetScreenOptions`, ADR 0013/0020)
  - check `src/core/layout` for the expanded side panel the reader uses
- **Typography:**
  - dhikr text uses the new `dhikr` type token (display, Amiri), scaled by `useAzkarFontScale`; list previews use `dhikrList`
  - Quran segments render through `QuranText` with Quran typography from `verses.text_uthmani`, never in the dhikr font
  - Text never truncates in the reader; list previews may clamp to 2 lines.
- **Hidden-when-empty:** any sourced section without data renders nothing. No "not available" sentences.
- **Counter:** `requiredCount` sourced → `AzkarCounter`; `null` → `AzkarDoneButton`. Never «١ / ١».
- **Haptics:** `Haptics.selectionAsync()` per accepted tap, `notificationAsync(Success)` when a unit completes. Wrap in `.catch(() => undefined)` like `features/khatma/mark-position.ts`.
- **Accessibility:**
  - the counter has role `button`, a label with the dhikr's position, value «٢ من ٣», and an accessibility action to reset
  - 44 pt+ targets (counter 120 pt)
  - Reduce Motion: no ring animation, instant state
- **Share** uses React Native `Share.share({ message: azkarShareText(...) })`, the same pattern as `AyahActionsPanel`.
- **No audio controls** in this step (step 8 adds them only for licensed recordings).
- i18n keys under `azkar.*` in both `ar.json` and `en.json`. Some exist from step 5; add only what's missing.

## 6a — Reader (frames `AzkarReader`, `AzkarReaderDone`, `AzkarReaderComplete`, `AzkarDetails`, `AzkarDetailsFull`, `AzkarExpanded`)
- **Components:**
  - `AzkarReaderTopBar`: close, category title, «٥ من ٢٤», progress bar
  - `AzkarProgressBar`
  - `DhikrText`: renders a unit's segments in order: `text` in `dhikr`, `quran` via the resolved verses in `QuranText`
  - `AzkarStepNote`: preface or afterword (instruction/narration, subhead, muted; the repeat-group header «تُكرَّر هذه المجموعة ٣ مرات» when the unit is a repeat group)
  - `AzkarCounter`, `AzkarDoneButton`
  - `AzkarReaderActions`: favourite toggle, share, text size
  - `AzkarTextSizeControl`
  - `AzkarSourceLine`: «حصن المسلم · {{number}}» plus the info button opening details
  - `AzkarCompletion`
  - `AzkarDetailsSection`: title, body, source caption
  - `AzkarDetailsContent`: sections in order المناسبة، التعليمات، السياق، المعنى، الفضل، المرجع، الدرجة, each only when present; occasion from `azkar.occasions.<code>`; the attribution line from the content source
- **Screens and routes:**
  - `AzkarReaderScreen`, routed by `app/azkar/read/[categoryId].tsx` (param `unit?`, resuming at the first incomplete unit) and `app/azkar/entry/[entryKey].tsx` (single-entry scope)
  - Previous and next move between units; the last completed unit shows `AzkarCompletion` with «البدء من جديد» (`resetScope`)
  - `AzkarDetailsScreen` routed by `app/azkar/details/[entryKey].tsx`: a sheet on compact and medium (register in `app/_layout.tsx` with `sheetScreenOptions`); the side panel on expanded, following the reader's ayah-panel approach
- **Tests:**
  - counter taps persist and complete; the 120 ms guard; null count shows Done
  - completion screen and reset
  - favourite toggles; share message exact
  - details hides empty sections and shows all when populated (fixtures)
  - Quran segment rendered from verses
  - Arabic and English, compact and expanded

## 6b — Browse and entry points (frames `AzkarHome`, `AzkarHomeDark`, `AzkarHomeEnglish`, `AzkarCategory`, `AzkarSearch`, `AzkarFavorites`, `AzkarFavoritesEmpty`, `AzkarLoading`, `AzkarUnavailable`, `MainAzkar`; `SalahAzkar` withdrawn, ADR 0031 §10)
- **Components:**
  - `ContinueAzkarCard`: brand card from `useContinueScope`; hidden when none
  - `AzkarSessionRow` with `AzkarProgressRing`
  - `AzkarTopicTile`, `AzkarCategoryHeader`, `AzkarItemCard` (medallion, preview, `AzkarCountChip` when sourced, completed state)
  - `AzkarSearchResultRow` (highlight range from step 5)
  - `AzkarHomeSkeleton`
- **Screens and routes:**
  - `AzkarHomeScreen` → `app/azkar/index.tsx`: header buttons search, favourites, reminders (reminders opens `/azkar/reminders`, built in step 7)
  - `AzkarCategoryScreen` → `app/azkar/category/[id].tsx`
  - `AzkarSearchScreen` → `app/azkar/search.tsx`
  - `AzkarFavoritesScreen` → `app/azkar/favorites.tsx`
  - The unavailable state (`AzkarUnavailable`) when `hasAzkarContent` is false
- **Entry points (only when `hasAzkarContent`):**
  - **Home:** add an «الأذكار» tile to `HomeTileRow` in `HomeScreen` (ADR 0017), opening `/azkar`
  - **Menu:** the «الأذكار» card in the القائمة grid (ADR 0032; built with the menu tab). **No change to the Salah screen** (ADR 0031 §10).
  - Update the existing Home tests: without content, no tile. Salah code and tests are not touched
- **Tests:** home lists session and browse categories with progress; the continue card; category list order and count chips; search results and the empty query; favourites list and empty state; the entry points gated by content; Arabic and English; light and dark (token use).

## Gates
From `apps/mobile`, with Node 26 on PATH:
- `npm run lint` (0 errors)
- `npx tsc --noEmit` (0 errors)
- `npx jest src/features/azkar src/features/home src/features/salah __tests__`

Then check on the Android emulator with dev fixtures on (`docs/plans/phase-6/README.md`): screenshot the reader, done, completion, details, home and category, and compare with the frames.
