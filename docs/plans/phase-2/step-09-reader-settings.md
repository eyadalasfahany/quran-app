# Step 9 — Reader settings (App)

Follow [README.md](README.md). Needs steps 1 and 4 committed. Read also:
- The `Reader settings` phone frame in `quran-app-screens.html`.
- Spec §12 (motion: cross-fade on mode and script change; haptics).
- `src/core/theme` (themes: light, sepia, dark).

**Goal:** the reader-settings sheet, persisted settings, and the reader applying them live.

## Settings model (`src/features/reader/settings.ts`)

- **A Zustand store persisted to MMKV** (key `reader.settings`), versioned for migrations:
  - `mode`: `'mushaf' | 'reading' | 'focus'`
  - `fontScale`: 0.8–1.6, step 0.1
  - `theme`: `'system' | 'light' | 'sepia' | 'dark'`
  - `showTranslations`: boolean
  - `translationIds`: number[]
  - `tafsirId`: number | null
- **Reads are synchronous** at start (MMKV), so the first frame uses them (cold-start budget, spec §4).
- **Changing `translationIds`** (or any downloaded-resource choice) also updates `content.selectedResourceIds` and **clears `meta.manifest_etag`**. Otherwise a 304 manifest would skip installing the newly chosen resources until the server's manifest changes (Phase 1 step 8 review).
- **The theme setting drives `ThemeProvider`**, which today is hard-coded `light` in `app/_layout.tsx`. Make it read the store, with `system` following the OS appearance.

## Components (`src/features/reader/settings/components/`, each with its own test)

- **`ModePicker`:** a `SegmentedControl` (Mushaf / Reading / Focus) with haptic selection.
- **`FontScaleStepper`:** − and + buttons and a live preview ayah. Arabic-Indic percentage in Arabic.
- **`ThemePicker`:** swatches for System, Light, Sepia and Dark. Not colour-only: labels too.
- **`TranslationToggleList`:** the installed translations, as toggle rows.

## Screen

`app/reader-settings.tsx`: a `formSheet` with detents that renders `ReaderSettingsSheet` (feature screen), composing the components above.

**Changes apply live:**
- A mode change cross-fades and keeps the anchor (step 4 and 5 lists).
- A font-scale change clears the reading-mode height cache and restores the anchor.

## Tests

- **The store:** persistence round trip, migration from an older or absent version, and clamping `fontScale`.
- **Each component** (README checklist).
- **Integration:**
  - Changing the theme re-renders with sepia tokens.
  - Changing the mode keeps the anchor ayah.
  - Haptics are called on mode change and not on font scale.

## Leave untouched

The token values, the repositories and the panels.
