# 0033 — Android uses the floating tab bar from #Main; iOS keeps native tabs

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends spec §12 "Motion" (native tabs) and `apps/mobile/CLAUDE.md` (tabs are native) for Android only

## Context

On iOS the tab bar is the native Liquid Glass bar, and it matches the `#Main` frame: a floating capsule, every label visible, and a soft brand pill around the selected icon and label. On Android the same `NativeTabs` render Material's bottom navigation:
- a full-width bar
- an indicator around the icon only
- (until 1 Nov) labels on the selected tab only and a lavender indicator

Its shape can't be configured to match the frame. The developer asked (1 Nov 2026) for Android to look like iOS, with iOS unchanged.

## Decision

1. **iOS: unchanged.** It keeps `NativeTabs` with the current `useTabBarStyle` output.
2. **Android: a custom floating tab bar** drawn from `#Main`'s geometry and the existing tokens, on the same routes, through `expo-router/ui` headless tabs (`Tabs`, `TabSlot`, `TabList`, `TabTrigger`).
   - **Position:** 16 from each side; the bottom sits 12 above the system navigation inset.
   - **Shape:** 64 tall, 6 padding, radius 32.
   - **Surface:** solid `glassFallback` (Android has no glass) with a `line` hairline and the token shadow.
   - **Items:** equal width with a 4 gap, radius 26. The selected item gets a `glassSelected` pill around icon **and** label, `brand` colour, the headline font file. Others are `inkMuted` with the label font file.
   - **Icons:** the Material symbols already in `destinations.ts`.
3. **Same behaviour as the native bar:**
   - same destinations, order and testIDs
   - hidden on expanded windows, where the sidebar takes over
   - RTL mirrors the order (first tab rightmost in Arabic)
   - role `tablist` / `tab` with selected state and labels; 44 pt+ targets
   - no custom tab-switch animation
4. Screens get bottom clearance for the floating bar on Android from `tab-bar-clearance.ts`, which already models the bar's footprint, so content and the mini player never sit under it.
5. The earlier Android-only `labelVisibilityMode` / `indicatorColor` props stop mattering once Android stops rendering `NativeTabs`. They are removed in the same change.

## Consequences

- Android loses Material's built-in tab motion and ripple. Taps use the pressed-state feedback of the design-system buttons.
- One more component pair to maintain (`FloatingTabBar`, `FloatingTabBarItem`), each tested on its own.
- iOS behaviour, layout and tests are unchanged. The review confirms `NativeTabs` is still what iOS renders.
