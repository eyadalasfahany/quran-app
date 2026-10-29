# Phase 2 — implementation briefs

One file per step of [`../phase-2.md`](../phase-2.md). Use them the same way as Phase 1: send an agent *"Implement `docs/plans/phase-2/step-NN-….md`. Follow `docs/plans/phase-2/README.md`."* Then the reviewer checks the work, and the developer commits.

Progress and the handoff for the next agent are in [`../phase-2.md`](../phase-2.md) under **Status**. Do not reimplement a step marked done.

| Step | Brief | Needs | Status |
| --- | --- | --- | --- |
| 1 | [step-01-design-system-components.md](step-01-design-system-components.md) | Design-token work finished | Done. Committed (`05b931e`) |
| 2 | [step-02-reader-data.md](step-02-reader-data.md) | Phase 1 | Done. Committed (`05b931e`) |
| 3 | [step-03-local-user-data.md](step-03-local-user-data.md) | — | Done. Committed (`05b931e`) |
| 4 | [step-04-reading-and-focus-modes.md](step-04-reading-and-focus-modes.md) | 1, 2 | Done. Committed |
| 5 | [step-05-mushaf-mode.md](step-05-mushaf-mode.md) | 1, 2 | Done. Committed |
| 6 | [step-06-reader-shell-and-layout.md](step-06-reader-shell-and-layout.md) | 1, 4 | Done. Committed |
| 7 | [step-07-ayah-panels.md](step-07-ayah-panels.md) | 1, 3, 6 | Done. Committed |
| 8 | [step-08-index-and-search.md](step-08-index-and-search.md) | 1, 2 | Done. Committed |
| 9 | [step-09-reader-settings.md](step-09-reader-settings.md) | 1, 4 | Done. Committed |
| 10 | [step-10-exit-check.md](step-10-exit-check.md) | all | After 11b and 13 |
| 11 | [step-11-design-conformance.md](step-11-design-conformance.md) | 1–9 | 11a done; 11b in progress |
| 12 | [step-12-resource-names.md](step-12-resource-names.md) | 11 | Done on prelive. Production sync waits for QF production keys |
| 13 | [step-13-tafsir-downloads.md](step-13-tafsir-downloads.md) | 12 | Done, not committed (29 Oct 2026): `author_ar` (API, contract, migration 0005), the download store, `TafsirDownloadList`, the panel's list, reading and offline states. Checked on the iPhone 17 simulator against `#TafsirDownload` |
| 14 | [step-14-sheet-detents.md](step-14-sheet-detents.md) | 13 | Done, not committed (29 Oct 2026): part A frames approved; part B detents, slide-down dismiss and `SheetScrollView` in the working tree (ADR 0020). Device check and recordings pending on the iPhone 17 simulator |

## Rules for every step

Everything in [`../phase-1/README.md`](../phase-1/README.md), "Rules for every step", applies: secrets and network, Quran text never altered, the gates table, git, and the report. These are added for UI work.

### Components and screens (the developer's rule)
- **One component per file:** every UI component is its own file, in `apps/mobile/src/shared/ui/` (design system) or `src/features/<feature>/components/`.
- **One test per component:** each has its own colocated test, `ComponentName.test.tsx`, with React Native Testing Library. It covers:
  - Rendering with default props and with **each variant**.
  - Interaction: presses, and callbacks called with the right arguments.
  - **RTL:** rendered under Arabic (`rtl`) and English (`ltr`), with layout-direction-sensitive styles checked.
  - **Accessibility:** `accessibilityRole`, `accessibilityLabel` and `accessibilityState` where relevant, plus a 44 pt minimum hit area.
  - **Theme:** colours come from `useTheme()`. A test fails if a raw hex literal appears in the component file (a shared helper in `apps/mobile/jest/` can grep the source).
- **Screens only compose:** screens (`app/` routes and `src/features/<feature>/screens/`) compose components and wire data. Layout containers are fine; one-off styled UI inside a screen is not.
- **Feature folders:** feature code lives in `src/features/reader/`, `src/features/search/` and so on. Routes in `app/` stay thin: read params, render a feature screen.

### Design: the `apple-design` skill and the HTML sources
- **Identical to the HTML:** the reviewer compares every change with its frame in `quran-app-screens.html`. The built UI matches the frame exactly unless the developer has approved a difference (an ADR or the step brief).
- **Delegation:** implementation goes to a subagent on the cheapest available model (Haiku); the orchestrator writes the brief and reviews.
- **Visual check:** the reviewer screenshots the running app on the iPhone 17 simulator and compares it with the frame rendered at 390 × 844.
- **Before building UI,** read `.agents/skills/apple-design/SKILL.md`. Then read the references it routes to: at minimum `references/hig/accessibility.md`, `color.md`, `layout.md`, `typography.md` and `right-to-left.md`, plus `liquid-glass.md` for glass surfaces and `modality.md` for sheets.
- **Design sources** (ADR 0010):
  - `quran-app-screens.html`: the phone frames (Mushaf page, Ayah actions, Reading mode, Focus mode, Tafsir, Reader settings, Surah index, Search) and the **approved** tablet section `#tablet-reader`.
  - `quran-app-design-system.html`: tokens and components.
  - Match their spacing, radii, type and colours **through `useTheme()` tokens**; never copy hex values.
- **Checklist before done:**
  - **Touch targets:** at least 44 × 44 pt.
  - **Text scaling:** UI text scales with the system font size (`allowFontScaling`, sensible `maxFontSizeMultiplier`). Quran text scales with the reader's font-scale setting (80–160%).
  - **Contrast:** at least 4.5:1 for body text, in the light, sepia and dark themes.
  - **RTL:** layout mirrors in Arabic. Media and progress controls are **not** mirrored (`apps/mobile/CLAUDE.md`).
  - **Increase Contrast:** when the system setting is on, components use the `highContrast` tokens (ADR 0012) for lines, muted ink and glass strokes.
  - **Reduce Motion:** slides become fades through `src/core/theme/motion.ts`. **Reduce Transparency:** glass becomes solid `glassFallback` through `useGlass()`.
  - **Screen readers:** every control has a label. Each ayah's label is its Imla'i text plus «الآية ٥» (spec §12).

### ADR 0012 reader rules (they win over older frames)

The `#tablet-reader` drawings predate ADR 0012 and are being updated. Where a frame disagrees with these rules, **the rules win**:
- **Recited or selected ayah:** a neutral `highlightActive` wash plus a **filled brand ayah marker**, never gold.
- **Page-exact QCF Mushaf:** the ayah marker is a font glyph and is **never recoloured**. Show the active ayah with a brand margin rule beside each of its lines instead.
- **Opening ayah actions:** from a tap on the ayah, a tap on its marker, or an ayah-actions glass button in the toolbar.
- **Audio progress** fills from the right (media controls are not mirrored).
- **Glass groups:** at most **one** per screen edge, plus Back.
- **My Quran** uses the bookmark glyph.
- **Text styles:** follow the type scale from the design-token work (ADR 0012, its type-scale step). Each UI style maps to a Dynamic Type style. **Don't hard-code sizes**; use the theme's text styles.

### Shared reader contract (steps 4–9 must agree)

**Layout constants** in `src/features/reader/layout.ts`:

| Name | Value | Meaning |
| --- | --- | --- |
| `READING_COLUMN_MAX` | 720 | Reading and Focus column cap (spec §4) |
| `MUSHAF_PAGE_MAX` | 600 | Mushaf page width cap (ADR 0013) |
| `SIDE_PANEL_WIDTH` | 380 | Expanded side panel |
| `PANEL_DOCK_MIN_WIDTH` | 1100 | At or above: the panel docks beside the page; 840–1,099: it overlays the page |

**Reader selection** (`src/features/reader/selection.ts`, a small Zustand store, version-table pin 5.0.16):
- State: `{ verseKey: string | null; panelTab: 'actions' | 'tafsir'; panelOpen: boolean }` (the 'translation' tab was removed by ADR 0014).
- Selecting an ayah sets `verseKey`.
  - On expanded windows it opens the panel.
  - On compact and medium windows it pushes the `ayah/[verseKey]` sheet route.

**Reading position:**
- `useReadingAnchor` (step 2) records the top visible `verse_key` in MMKV (`reader.lastVerseKey`, `reader.lastPage`, `reader.mode`).
- Every list restores to it after a mode switch, rotation, fold or unfold, or resize.

**Routes:**
- `app/read/[verseKey].tsx`: the reader, full window. The sidebar and tabs are hidden while reading.
- `app/ayah/[verseKey].tsx`: the actions sheet.
- `app/tafsir/[verseKey].tsx`: the tafsir sheet.
- `app/reader-settings.tsx`: the settings sheet.

**Fonts:**
- Bundled: IBM Plex Sans Arabic (Phase 0), plus Amiri and Amiri Quran, from `assets/fonts/Amiri/` (step 1).
- QCF V2 page fonts load at runtime from QF's CDN (step 5, ADR 0011).

### Gates for app steps
`cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`, plus `npm run typecheck`, plus `node .github/scripts/npm-audit.mjs` when dependencies change.
