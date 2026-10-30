# Step 2 — My Quran Library

Spec §15 & ADR 0027. Frames `#MyQuran` and `#EmptyMyQuran` in `quran-app-screens.html`.

## Goal
Build the personal library screen (`app/(main)/(my-quran)/index.tsx`) backed by the local `user.db` SQLite database, with no account or sign-in banner.

## Scope
1. **Header:**
   - Title «مصحفي».
   - Settings gear icon button navigating to `/settings`.
2. **No Sign-In Banner:**
   - Omit the `#SignIn` prompt banner («احفظ علاماتك على كل أجهزتك») per ADR 0027.
3. **Segmented Tabs:**
   - Tabs: Bookmarks («العلامات»), Highlights («التظليلات»), Notes («الملاحظات»), Khatma («الختمة»).
4. **Tab Views:**
   - **Bookmark:** one bookmark only (ADR 0028). Tapping bookmark on an ayah replaces the previous one. The row shows that ayah. Tapping it opens the reader there. Khatma progress is calculated from this ayah.
   - **Highlights:** lists highlighted verses, with color filter chips (gold, green, blue, rose). Tapping navigates to that verse. Option to remove highlight.
   - **Notes:** lists ayah notes showing surah/ayah header, note text preview, and updated date. Tapping navigates to the verse; tapping edit opens the note editor.
   - **Empty States:** when a tab has no items, render an empty state following frame `#EmptyMyQuran` with an icon, title, description, and action button (e.g., "Start reading").
5. **Persistence:**
   - Reactive queries to `user.db` via Drizzle/SQLite hooks.
   - Instant optimistic updates on deletion or addition.

## Deliverables
- Tab components and row components in `apps/mobile/src/features/my-quran/components/`.
- Screen at `apps/mobile/src/features/my-quran/screens/MyQuranScreen.tsx` and route `apps/mobile/app/(main)/(my-quran)/index.tsx`.
- Colocated tests for all components.
- i18n keys in `ar.json` and `en.json`.

