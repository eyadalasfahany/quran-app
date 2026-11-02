import type { PlatformOSType } from 'react-native';

// Where the mini player's bottom edge sits above the screen's bottom edge, on compact and medium windows.
// The native tab bar's height is not readable from JS (expo-router's NativeTabs exposes no measurement),
// so these are the frames' geometry: the iOS tab bar floats 28 above the edge and is 64 tall (#Main).
// Not measured on a device yet.
export const MINI_PLAYER_BOTTOM_GAP = 12;
const IOS_TAB_BAR_BOTTOM = 28;
const IOS_TAB_BAR_HEIGHT = 64;
const IOS_TAB_BAR_FOOTPRINT = IOS_TAB_BAR_BOTTOM + IOS_TAB_BAR_HEIGHT;

// Android draws its own floating bar (ADR 0033 §2): 16 from each side, 12 above the system navigation inset,
// 64 tall. The screens and the mini player keep clear of it.
export const FLOATING_TAB_BAR = {
  side: 16,
  offset: 12,
  height: 64,
  radius: 32,
  padding: 6,
  gap: 4,
  itemRadius: 26,
} as const;

// The vertical rail on the start edge (ADR 0036, ADR 0051 as amended 2 Nov 2026). It shows on a short window (a landscape
// phone) and on an expanded window (a tablet), on both platforms (developer, 1 Nov and 2 Nov 2026). It sits 12 past the
// start safe area, is 76 wide and 324 tall at most, and its five items keep labels under the icons. The screens clear it
// on that side, not at the bottom.
export const TAB_RAIL = {
  offset: 12,
  width: 76,
  height: 324,
  gap: 12,
} as const;

/** The side clearance a screen keeps from its start edge for the rail, measured from the start safe area. */
export const TAB_RAIL_CLEARANCE = TAB_RAIL.offset + TAB_RAIL.width + TAB_RAIL.gap;

/** Whether the tabs are the rail. Every navigation argument named `rail` comes from `useTabRail()` (ADR 0051, amended). */
export function tabRailShown(rail: boolean): boolean {
  return rail;
}

/**
 * How the tabs are drawn. The rail always gets the headless navigator. A bottom-bar window keeps the native tabs on iOS
 * and the floating bar on Android. The only platform branch is native versus headless, and only where there is no rail.
 */
export function tabBarMode(platform: PlatformOSType, rail: boolean): 'native' | 'headless' {
  if (rail) {
    return 'headless';
  }
  return platform === 'android' ? 'headless' : 'native';
}

/** The side inset a tab screen's content keeps from the start edge: the rail's clearance when the tabs are a rail, else 0. */
export function tabBarSideClearance(rail: boolean): number {
  return tabRailShown(rail) ? TAB_RAIL_CLEARANCE : 0;
}

// The space the tab bar takes from the bottom edge, measured from the bottom safe area. A rail takes none; it keeps only
// the bottom safe area, so the mini player still clears the home indicator.
export function tabBarFootprint(platform: PlatformOSType, bottomInset: number, rail = false): number {
  if (rail) {
    return Math.max(0, bottomInset);
  }
  if (platform === 'android') {
    return Math.max(0, bottomInset) + FLOATING_TAB_BAR.offset + FLOATING_TAB_BAR.height;
  }
  return IOS_TAB_BAR_FOOTPRINT;
}

export function miniPlayerBottom(platform: PlatformOSType, bottomInset: number, rail = false): number {
  return tabBarFootprint(platform, bottomInset, rail) + MINI_PLAYER_BOTTOM_GAP;
}

/** While scrolling has hidden the tab bar, the mini player drops into the bar's own slot: the bar and the player are both 64 tall. */
export function miniPlayerHiddenTabsBottom(platform: PlatformOSType, bottomInset: number, rail = false): number {
  if (rail) {
    return miniPlayerBottom(platform, bottomInset, true);
  }
  if (platform === 'android') {
    return Math.max(0, bottomInset) + FLOATING_TAB_BAR.offset;
  }
  return IOS_TAB_BAR_BOTTOM;
}

/**
 * The bottom padding a tab screen's scroll content needs for the bar. Neither bar insets React Native scroll views (the
 * iOS native bar was measured on the iPhone 17 Pro simulator, iOS 26.4, 1 Nov 2026), so both platforms pad by the bar's
 * footprint. A rail has no bottom bar, so a rail window needs none.
 */
export function tabContentClearance(platform: PlatformOSType, bottomInset: number, rail = false): number {
  if (rail) {
    return 0;
  }
  return tabBarFootprint(platform, bottomInset);
}
