# 0036 — A short window keeps the phone layout: the height rule

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends spec §4 (responsive layout), the ADR 0030 §4 navigation rule and the ADR 0013 sheet card rule. Amends ADR 0033 only in that the floating bar stays on a landscape phone.

## Context

ADR 0032 and spec §4 choose the layout from the width alone: under 600 pt is compact, 600 to 839 medium, 840 and up expanded. A landscape phone is 780 to 932 pt wide, so it became expanded and drew the sidebar. The sidebar leaves about 500 pt of height for the content, and the Qibla dial, the misbaha ring and the Sibha chips no longer fit. Their screens overflowed.

The developer asked (1 Nov 2026) how a landscape phone should lay out. The answer: **keep the tab bar.** iOS apps keep their bottom tabs in landscape, and the phone layout (native tabs on iOS, the floating bar on Android, ADR 0033) is the one the app already tests. A sidebar belongs to a window that is both wide and tall enough to hold it.

## Decision

1. **Short window.** A window under **480 pt high** is a short window (a landscape phone). It keeps the compact layout with the bottom tab bar, whatever its width. The native tabs on iOS and the floating bar on Android stay.
2. **Sidebar.** The sidebar appears only on a window that is both wide (medium or expanded by width) and not short: iPads and open foldables. The developer's example windows resolve as follows:
   - 844 × 390 (landscape phone): compact, with tabs.
   - 956 × 440 (landscape phone, large): compact, with tabs.
   - 1024 × 768 (iPad or open foldable): expanded, with the sidebar.
   - 700 × 1000 (foldable, portrait): medium.
3. **Two hooks.** `useWindowClass()` is the layout class and includes the height rule. `useWidthClass()` is the width class alone, with the same ±16 hysteresis. Use it where width alone decides. `useIsShortWindow()` reports the height rule for layouts that must reflow (the Qibla dial, the misbaha ring).
4. **Width decides these, not the layout class.**
   - The reader sheet's centred card (560 pt at most, ADR 0013) uses the width class, so a landscape phone gets the centred card.
   - The menu grid uses three columns when the width is not compact, so a landscape phone gets three.
5. **Height decides these, through the layout class.**
   - The docked reader panel and the side panels follow `useWindowClass()`, so they never appear in a short window.
   - The sidebar, the expanded Home header and the expanded Azkar panel follow it too.
6. **Threshold.** 480 pt is the layout threshold. The reader sheet keeps its own 500 pt short-sheet threshold (ADR 0020, SHORT_WINDOW_HEIGHT), where a half-height sheet would hide its content. A window from 480 to 499 pt high is therefore compact with tabs, and its sheets open at full. The two thresholds are deliberately separate.
7. **Hysteresis.** The height rule is a hard threshold. A rotation is a jump, and the ±16 hysteresis remains on the width classes only.
8. **Short-window fitting.** The layouts that cannot scroll away their content lay out beside each other in a short window:
   - Qibla: the dial beside its bearing, status and meta panel.
   - Sibha: the chips and hint beside the counter.
   - Both size their dial or ring to the space they get (see the Qibla and Sibha frames, which await approval).

## Consequences

- A landscape phone shows the same tab bar as portrait, and the expanded sidebar is no longer drawn on it. Its navigation is unchanged.
- Width-only consumers (the sheet card, the menu columns) keep their wide layout on a landscape phone, so they need `useWidthClass()`. Any new consumer must choose between the two hooks deliberately.
- Tests cover the boundaries in `src/core/layout/window-class.test.ts` and `useWindowClass.test.tsx`, and each consumer's short and tall cases.
- The frames `QiblaLandscape` and `SibhaLandscape` (844 × 390) are drawn from the existing tokens and await the developer's approval (ADR 0010).

## Amendment: the tab rail in a short window (developer, 1 Nov 2026)

The developer decided (1 Nov 2026) that a short window shows the tabs as a **vertical rail** rather than a bottom bar, and that this applies on **iOS as well as Android**.

1. **Rail.** In a short window the five tabs stand in a vertical rail on the start edge: right in Arabic, left in English. It sits 12 pt past the start safe area and is vertically centred. It is 76 wide and 324 tall at most, and keeps 12 pt clear above and below in a shorter window. Items stack top to bottom in the same order. Each keeps its icon over its label, and the glass and tokens are unchanged. Labels stay, since five items fit in 324 pt.
2. **Which tabs.** A tall window is unchanged: iOS keeps its native tabs and Android keeps its floating bar (ADR 0033). A short window is the rail on both platforms. In `app/(main)/_layout.tsx` the choice is made by `tabBarMode(platform, short)`: headless tabs when the window is short or the platform is Android, native tabs otherwise. The platform matters only in tall windows, which is where the native tabs already applied.
3. **Route and stack survive a turn.** A rotation between a tall and a short window moves between the native and the headless navigator on iOS. The route, the open tab and its stack carry over through the router state. This was not yet verified on an iOS device; the developer's iPhone check is still needed.
4. **Screens clear the rail, not the bottom.** A short window has no bottom clearance for the tab screens (`tabContentClearance`). It reserves 100 pt on the start edge (`TAB_RAIL_CLEARANCE`: 12 offset, 76 width, 12 gap), which `Screen` adds after the start safe area, for tab screens only (`TabRailContext`). The mini player moves to the start clearance and the bottom safe area. The Menu search button clears the rail only in English, where the rail is on the left.
5. **Frame.** `MainLandscapeRail` (844 × 390, tokens only) in `quran-app-screens.html` awaits approval (ADR 0010).

The iOS tall-window behaviour is unchanged, and the native-tab props test still covers it.
