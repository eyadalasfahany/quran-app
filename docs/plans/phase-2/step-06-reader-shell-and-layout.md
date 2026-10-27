# Step 6 — Reader shell and adaptive layout (App)

Follow [README.md](README.md), including the **shared reader contract**. Needs steps 1 and 4 committed (step 5 if already merged; otherwise wire Mushaf mode behind its mode switch). Read also:
- Spec §4 ("Responsive layout", the window-class table).
- The approved `#tablet-reader` section of `quran-app-screens.html`, **especially its notes**.
- The `apple-design` skill: `layout.md` (resizing: hide tertiary columns first), `modality.md`, `liquid-glass.md`, `right-to-left.md`.

**Goal:**
- The full-window reader route and its glass toolbar.
- The approved adaptive behaviour: a docked or overlay side panel on expanded windows, sheets on compact and medium.

## Routes

- **`app/read/[verseKey].tsx`:** stack screen above the tabs, full window (tabs and sidebar hidden while reading). It renders `ReaderScreen` (`src/features/reader/screens/ReaderScreen.tsx`).
- **`app/ayah/[verseKey].tsx` and `app/tafsir/[verseKey].tsx`:** `formSheet` with detents (spec §12 motion: native sheets). They render the step 7 panels inside `SheetContainer` (a feature component). Placeholders are fine until step 7 lands.
- **Home and index wiring:** the Home "continue reading" card and the surah index (step 8) navigate to `read/[verseKey]`.

## Components (`src/features/reader/components/`, each with its own test)

| Component | Content |
| --- | --- |
| `ReaderToolbar` | Back (`IconButton` glass; the chevron mirrors in RTL), plus **one** glass group on the top edge (ADR 0012: at most one group per edge plus Back). That group holds the title (surah name; page and juz caption), **ayah actions** (opens actions for the selected or first visible ayah), bookmark-page, reader-settings (opens `reader-settings`) and, on expanded only, the **side-panel toggle** (`accessibilityState.selected` = panel open). Floats over content on the glass layer. Safe-area aware |
| `SidePanel` | 380 pt (`SIDE_PANEL_WIDTH`), on the trailing edge (left in Arabic, right in English), a glass surface, rounded, inset 16. Hosts a `SegmentedControl` (Options / Tafsir / Translation) and the step 7 panel for `selection.panelTab`. Close button. Labelled as a complementary region for screen readers |
| `AdaptiveReaderLayout` | Decides **docked** vs **overlay** vs **sheet**: expanded with window ≥ `PANEL_DOCK_MIN_WIDTH` (1,100) → docked beside the content, which recentres in the remaining width while the background extends under the panel. Expanded and < 1,100 → overlay over the page, with a tap outside closing it. Compact and medium → no panel: selecting pushes the sheet route. Switching classes while a selection exists moves it between panel and sheet without losing it |
| `ResumePill` | "Back to the current ayah" pill (spec §12 cancelling motion), shown when the user scrolled away from the selection or audio ayah. Used by Phase 3; build and test it now |

## Behaviour

- **Selection** (the `selection` store): tap an ayah to select it. On expanded windows the panel opens on its last tab; on compact and medium the `ayah/[verseKey]` sheet opens. Long-press also selects.
- **Mode switching** comes from reader settings (step 9) and keeps the anchor.
- **Resizing** (rotate, fold, unfold, Split View or Stage Manager) keeps the top ayah through `useReadingAnchor` and keeps the selection.
- **Mini-player slot:** reserve the bottom inset of the reading area, never under the panel. Phase 3 fills it.

## Tests

- `AdaptiveReaderLayout` at widths **375, 700, 900, 1,099, 1,100 and 1,366**: sheet / sheet / overlay / overlay / docked / docked.
- The panel's side in Arabic vs English.
- A tap outside closes the overlay; the docked panel doesn't close that way.
- Resizing 1,366 → 700 with a selection opens the sheet route for the same verse; 700 → 1,366 opens the panel.
- `ReaderToolbar`: the toggle shows only on expanded, the back chevron mirrors, and labels are present.
- Router test: `read/2:255` opens with the anchor at 2:255, and back returns to the tab that opened it.

## Leave untouched

The repositories, the list internals (steps 4–5) and the panel contents (step 7).
