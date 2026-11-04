# 0051 — Tablets use the phone tab bar; the expanded sidebar is no longer navigation

Date: 2026-11-02 · Status: accepted (developer, 2 Nov 2026) · Supersedes the navigation part of the expanded-window sidebar: ADR 0012 §8 ("the custom sidebar stays"), ADR 0005 and ADR 0010 for the sidebar drawing as a navigation bar, the sidebar lists in ADR 0030 §4 and ADR 0032 §4, and spec §4's "Sidebar" navigation for the expanded class. Amends ADR 0033 §3 (the bar is shown on expanded windows) and ADR 0036 §5 (the sidebar is not drawn). Amended by ADR 0059 (the tabs mini player shows only while audio loads or plays).

## Context

The expanded-window sidebar came in with the adaptive navigation commit (27 Oct 2026, `6abc951`). Its drawing is in `quran-app-screens.html` ("Expanded window", ADR 0005 and ADR 0010). Its navigation was kept in ADR 0012 §8 for the 840 breakpoint and Android parity. From that commit, a window at 840 pt or wider hid the tab bar and drew a 300 pt sidebar with the five tabs, الصلاة, and settings.

The developer decided on 2 Nov 2026 that tablets use the same horizontal tab bar as phones, as the app did before the sidebar. The sidebar is no longer used for navigation.

## Decision

1. **The tab bar shows on every window that is not short.** Compact, medium and expanded windows all get the phone tab bar: native tabs on iOS and the floating bar on Android (ADR 0033). Scroll-down hiding works on expanded windows as on phones. A short window (under 480 pt high) keeps the vertical rail (ADR 0036) and is unchanged.
2. **No sidebar.** `MainShell` no longer renders the sidebar on any window. The screens and the mini player clear the bottom tab bar exactly as on a phone. The feature layouts that use the expanded class for their content (the two-column Home, the reader's docked side panel, the Azkar details panel) do not change. Only the navigation chrome changes.
3. **Removed with the sidebar:** `Sidebar`, `SidebarItem` and `SidebarSearch` (and their tests), the `sidebarDestinations` list, and the mini player's sidebar footer (its `sidebar` variant and the inline progress track). The mini player in the tab bar slot shows on expanded windows, as on phones. The reader's own bar keeps its expanded placement (the panel).
4. **Search and the other destinations stay reachable.** Search was reachable from the sidebar's field only on expanded windows. The screens' own search buttons show on every window: the Home header search button returns on expanded windows (it was hidden there). The menu tab already has a search card. Settings and الصلاة are reached from the menu (ADR 0032), as on phones.
5. **Large screens: capped at the content column.** On a window wider than the 720 pt content column (`CONTENT_COLUMN_MAX_WIDTH`), the Android floating bar is no wider than that column and is centred, as the iPad's compact native tab bar is. A full-width capsule spread five items across a 1280 pt tablet. Below that width the bar keeps the #Main frame's 16 pt sides.

## Consequences

- Expanded windows render the same tab routes as phones. A tab switch keeps the open tab (no change in routes).
- `useTabBarClearance` returns the phone clearance on expanded windows, and `useMiniPlayerVisible('tabs')` no longer hides on expanded windows.
- The `quran-app-screens.html` expanded frames (`#ExpandedHome` and the other expanded-window frames) still draw the sidebar. The differences from those frames are approved here (the design rule in `CLAUDE.md`). The HTML and the Figma file are not edited in this change. Updating the expanded frames is a follow-up for the developer.
- `apps/mobile/CLAUDE.md` and `apps/mobile/AGENTS.md` still describe the expanded sidebar and the "Existing gap" for `Sidebar`. They are project instruction files and are left for the developer to update.
- Not checked on a device in this change. The iPad native tab bar under iOS 26 (NativeTabs on a wide window) needs a look on the iPad simulator, since UIKit may draw its own adaptive bar.

## Amended 2 Nov 2026: tablets use the vertical rail; the bottom bar is phones only

The developer decided later on 2 Nov 2026 that tablets do not use the bottom bar either. This amendment replaces decision 1's "every window that is not short" for expanded windows, and the consequences that depend on it. Decision 5 (the 720 pt cap) still applies to medium windows.

1. **Expanded windows show the rail.** A window in the expanded class (840 pt and wider, and not short) shows the five tabs as the vertical rail from ADR 0036 on the start edge: 12 pt past the start safe area, 76 wide, 324 tall at most, vertically centred, and shortened only where the window is shorter than the rail. It is the same on iOS and Android, so an expanded window on iOS uses the headless navigator, not native tabs.
2. **The bottom bar is for phones only.** Compact and medium windows that are tall keep the bottom bar: native tabs on iOS and the floating bar on Android (ADR 0033). A medium window still caps the floating bar at the 720 pt content column (decision 5).
3. **Short windows are unchanged.** A window under 480 pt high keeps the rail (ADR 0036).
4. **Clearances follow the rail, not the bottom.** A rail window has no bottom clearance for tab screens. The screens clear the rail on the start edge (`TabRailContext`, 100 pt). The mini player sits 116 pt from the start edge and 12 pt above the bottom safe area. Scroll-down hiding applies only to the bottom bar, so the rail never hides. The menu search button sits only above the bottom safe area.
5. **One rule in code.** `useTabRail()` (`src/core/layout/useTabRail.ts`) is `short || expanded`. Every navigation choice reads it: the tab layout, the shell, the rail's clearance and mini player, the scroll hiding, the bottom clearance and the menu search button. `useIsShortWindow()` stays for layouts that must reflow to fit their height (the Qibla dial, the misbaha ring, the Hijri and moon screens, the focus and Azkar layouts).
6. **Superseded parts of this ADR.** Decision 1's "every window that is not short", the expanded-window clearance in the consequences, and `useMiniPlayerVisible('tabs')` on expanded windows (still shown, now beside the rail) follow this amendment. Decision 3's `Sidebar` removal stands. Spec §4 is updated in the same change.
7. **Not done in this change.** The expanded frames in `quran-app-screens.html` still draw the sidebar, as before. The tablet rail reuses the tokens of `MainLandscapeRail` (ADR 0036), which still awaits the developer's approval (ADR 0010). The iPad simulator check of the rail and of the native-to-headless switch on iOS is still needed.
