# Prompt 2 — Azkar home, category, search, favourites, Home tile (step 6b)

You are working in the Taybah monorepo, Expo app `apps/mobile`, branch `ft/azkar`. Don't commit, add dependencies, or edit `apps/mobile/android/`, `src/features/salah/**` or `app/(main)/(salah)/**`. Prompt 1 is done: the reader exists. Reuse its components.

**Read first:** @AGENTS.md @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/plans/phase-6/README.md @docs/adr/0031-azkar.md (§10 Placement) @docs/plans/phase-6/step-06-mobile-ui.md (section **6b — Browse and entry points**, and its Rules) @docs/adr/0017-home-tiles-follow-features.md.

**Build** (one component per file plus a colocated test; screens only compose):
- **Components:**
  - `ContinueAzkarCard`: brand card from `useContinueScope`; hidden when there's nothing to continue
  - `AzkarSessionRow` with `AzkarProgressRing`
  - `AzkarTopicTile`, `AzkarCategoryHeader`
  - `AzkarItemCard`: `NumberMedallion`, 2-line `dhikrList` preview, `AzkarCountChip` only when the count is sourced, completed state
  - `AzkarSearchResultRow`: highlights the data layer's match range, never alters the text
  - `AzkarHomeSkeleton`
- **Screens and routes:**
  - `AzkarHomeScreen` → `app/azkar/index.tsx`
    - header buttons: search, favourites, reminders (`/azkar/reminders` is built in prompt 4; until then, hide the reminders button)
    - section «أذكار اليوم»: the session categories with their progress
    - section «المواضيع»: the browse categories
  - `AzkarCategoryScreen` → `app/azkar/category/[id].tsx`: header, progress «١٢ من ٢٤», item cards, pinned «ابدأ» / «تابع» button opening the reader
  - `AzkarSearchScreen` → `app/azkar/search.tsx`: results plus the empty-query state with recent searches
  - `AzkarFavoritesScreen` → `app/azkar/favorites.tsx`: list, plus the empty state (reuse `EmptyState`)
  - The unavailable state when `hasAzkarContent` is false
- **Home tile:** an «الأذكار» tile in `HomeTileRow` (`src/features/home/screens/HomeScreen.tsx`) opening `/azkar`, **only when** `useAzkarAvailable()` is true (ADR 0017). Update Home's tests for both states.
- **Salah:** do **not** add anything (ADR 0031 §10, updated).

**Must hold:**
- Counts are «X من Y» with Arabic-Indic digits in Arabic, "X of Y" in English.
- Category labels come from `azkar.categories.<id>` (already in i18n).
- Chapter titles: Arabic `title_ar` is null in production (pending a licensed source). Never show the English title in the Arabic interface. Show «حصن المسلم · {{count}} ذكرًا» instead.
- Light and dark through tokens; RTL and LTR.

**Frames:** `AzkarHome`, `AzkarHomeDark`, `AzkarHomeEnglish`, `AzkarCategory`, `AzkarSearch`, `AzkarSearchEmpty`, `AzkarFavorites`, `AzkarFavoritesEmpty`, `AzkarLoading`, `AzkarUnavailable`, `MainAzkar`. Render them with `packages/design-tokens/scripts/frame-shot.py`.

**Gates** (Node 26, `apps/mobile`): `npm run lint`, `npx tsc --noEmit` (0), `npx jest src/features/azkar src/features/home __tests__`.

**Report:** files, test counts, gates, deviations. No religious text.
