# Step 6 — My Mushaf Profile Icon & Sidebar Order

ADR 0010 (frames), ADR 0027 (no accounts). Frames `#ExpandedHome` and `#ExpandedHomeDark` in `quran-app-screens.html` are edited in this step; the tab bar has no frame (native component) — the icon change is recorded here.

## Goal
Make مصحفي (My Quran) read as the reader's personal "profile" destination: a person-circle symbol in the tab bar and sidebar, and the **first** item in the expanded-window sidebar. The My Quran screen itself does not change.

## Decisions (developer, 31 Oct 2026)
- **Icon only, no profile screen.** مصحفي keeps its current screen (bookmarks, highlights, notes, khatma). Only the navigation symbol and sidebar position change. No account or profile UI is reintroduced (ADR 0027 stands).
- **New symbol:** SF `person.crop.circle`, Material `account_circle`. Label stays «مصحفي» / `tabs.myQuran`.
- **Tab order is unchanged in this step.** Four tabs have no true middle; مصحفي takes the center when the الصلاة tab lands as the fifth tab (Phase 5, `docs/plans/phase-5.md`). Muscle memory changes once.
- **Sidebar order becomes:** مصحفي → الرئيسية → المصحف → الاستماع → الإعدادات (Settings stays last, outside `destinations`). One source per context: `tabDestinations` (bar order) and `sidebarDestinations` (sidebar order), both derived from the same destination records so icons/labels/routes can never drift.
- **Frames updated in the same change** (ADR 0010): `#ExpandedHome` and `#ExpandedHomeDark` sidebars are redrawn with مصحفي first and the person-circle glyph, so the frames stay the source of truth.

## Scope
1. `src/core/layout/destinations.ts`:
   - `(my-quran)` symbol → `person.crop.circle`, androidIcon → `account_circle`.
   - Export `tabDestinations` (current order) and `sidebarDestinations` (مصحفي first) instead of the single `destinations` array.
2. `app/(main)/_layout.tsx`: maps `tabDestinations`.
3. `src/core/layout/MainShell.tsx`: maps `sidebarDestinations`; Settings item stays appended last.
4. `quran-app-screens.html`: redraw the two expanded sidebar frames per the decision above.
5. Tests: update `MainShell.test.tsx`, the router test and `__tests__/sidebar-glass.test.tsx` for the new order/icon; add an ordering test asserting tab vs sidebar order and that both derive from the same records.
6. Closes the standing gap noted in `apps/mobile/CLAUDE.md`: `Sidebar`/`SidebarItem` already gained colocated tests in Phase 4 — this step only updates fixtures, no new components.

## Deliverables
- Updated `destinations.ts`, `_layout.tsx`, `MainShell.tsx` and their tests.
- Updated `#ExpandedHome` / `#ExpandedHomeDark` frames.
- No i18n changes (labels unchanged). No new dependencies.
