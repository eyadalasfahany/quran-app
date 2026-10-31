# Prompt 6 — Android floating tab bar (ADR 0033)

You are working in the Taybah monorepo, Expo app `apps/mobile`, branch `ft/azkar`. Prompt 3 (the القائمة menu tab) is done: `destinations.ts` already lists the menu tab and keeps Salah's route hidden. Don't commit, add dependencies, or edit `apps/mobile/android/` or any Salah file.

**iOS must not change.** iOS keeps rendering `NativeTabs` exactly as now. Any change to iOS output fails the review.

**Read first:** @.claude/agent-rules.md @apps/mobile/CLAUDE.md @docs/adr/0033-android-floating-tab-bar.md @apps/mobile/app/(main)/_layout.tsx @apps/mobile/src/core/layout/destinations.ts @apps/mobile/src/core/layout/MainShell.tsx @apps/mobile/src/core/layout/useTabBarStyle.ts @apps/mobile/src/core/layout/tab-bar-clearance.ts @apps/mobile/__tests__/router.test.tsx. Read the installed `expo-router/ui` headless tabs API in `node_modules/expo-router/build/ui/*.d.ts` (`Tabs`, `TabSlot`, `TabList`, `TabTrigger`) and use it as typed. Don't guess.

**Frame:** render `#Main` and `MainMenuTab` with `python packages/design-tokens/scripts/frame-shot.py <id> <png>`. Copy the bar's geometry from ADR 0033 §2.

**Build:**
- **`src/shared/ui/FloatingTabBarItem.tsx`** (+ test):
  - props: icon (Material name), label, selected, onPress, testID
  - selected: `glassSelected` pill around icon and label, `brand` colour, headline font file; otherwise `inkMuted` and the label font file
  - accessibility role `tab`, `accessibilityState.selected`, label = the tab label
  - minimum 44 pt
  - Use the existing `Icon` component with the destination's Android icon names.
- **`src/shared/ui/FloatingTabBar.tsx`** (+ test): the capsule from ADR 0033 §2, positioned with `useSafeAreaInsets()`, role `tablist`, items laid out in a row that mirrors under RTL.
- **`app/(main)/_layout.tsx`:**
  - `Platform.OS === 'android'` → headless `Tabs` with `TabSlot` and a `TabList` of `TabTrigger`s for `tabDestinations` (same names, hrefs, testIDs), rendered through `FloatingTabBar` (`asChild` triggers or the custom-list pattern the API supports). The hidden Salah route must stay reachable, as it is under `NativeTabs`.
  - otherwise: the existing `NativeTabs` block, untouched
  - Hide the floating bar on expanded windows, as `NativeTabs` does (`hidden={expanded}`).
- **`tab-bar-clearance.ts`:** the Android footprint becomes the floating bar's (`bottomInset + 12 + 64`). Update its tests. Then check every screen that relies on the native bar's automatic bottom inset on Android, and give it the same clearance (`SectionScreen`, the lists, the mini player). No content may sit under the bar.
- **`useTabBarStyle.ts`:** remove the Android-only `labelVisibilityMode` / `indicatorColor` props added on 1 Nov (no longer used) and their tests. The iOS output stays byte-identical.

**Tests:**
- both components: render, selected and unselected, press, Arabic and English, accessibility
- `router.test.tsx` and `MainShell.test.tsx` under `Platform.OS = 'android'`: five tabs in order, selection follows navigation, hidden on expanded, Salah still reachable
- under `'ios'`: `NativeTabs` is still what renders
- `tab-bar-clearance`

**Gates** (Node 26, `apps/mobile`): `npm run lint`, `npx tsc --noEmit` (0), `npx jest src/shared/ui src/core/layout __tests__`.

**Report:** files, test counts, gates, and screenshots of the Android emulator (`adb exec-out screencap -p`) of Home and the menu tab next to `#Main` / `MainMenuTab`. Metro is already running; reload the app with `adb shell input text "RR"` or from the dev menu. Don't start a second Metro.
