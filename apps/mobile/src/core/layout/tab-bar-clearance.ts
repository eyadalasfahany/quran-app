import type { PlatformOSType } from 'react-native';

// Where the mini player's bottom edge sits above the screen's bottom edge, on compact and medium windows.
// The native tab bar's height is not readable from JS (expo-router's NativeTabs exposes no measurement),
// so these are the frames' geometry: the iOS tab bar floats 28 above the edge and is 64 tall (#Main).
// Not measured on a device yet.
export const MINI_PLAYER_BOTTOM_GAP = 12;
const IOS_TAB_BAR_FOOTPRINT = 28 + 64;

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

// A short window (a landscape phone, ADR 0036) shows the tabs as a vertical rail on the leading edge, on both platforms
// (developer, 1 Nov 2026). It sits 12 past the start safe area, is 76 wide and 324 tall at most, and its five items
// keep labels under the icons. The screens clear it on that side, not at the bottom.
export const TAB_RAIL = {
  offset: 12,
  width: 76,
  height: 324,
  gap: 12,
} as const;

/** The side clearance a screen keeps from its start edge for the rail, measured from the start safe area. */
export const TAB_RAIL_CLEARANCE = TAB_RAIL.offset + TAB_RAIL.width + TAB_RAIL.gap;

/** Whether the tabs are the rail: a short window, on either platform. */
export function tabRailShown(short: boolean): boolean {
  return short;
}

/**
 * How the tabs are drawn (developer, 1 Nov 2026). A short window always gets the rail. A tall window keeps the native
 * tabs on iOS and the floating bar on Android. The only platform branch is native versus headless, and only in tall
 * windows.
 */
export function tabBarMode(platform: PlatformOSType, short: boolean): 'native' | 'headless' {
  if (short) {
    return 'headless';
  }
  return platform === 'android' ? 'headless' : 'native';
}

/** The side inset a tab screen's content keeps from the start edge: the rail's clearance in a short window, else 0. */
export function tabBarSideClearance(short: boolean): number {
  return tabRailShown(short) ? TAB_RAIL_CLEARANCE : 0;
}

// The space the tab bar takes from the bottom edge, measured from the bottom safe area. A rail takes none; it keeps only
// the bottom safe area, so the mini player still clears the home indicator.
export function tabBarFootprint(platform: PlatformOSType, bottomInset: number, short = false): number {
  if (short) {
    return Math.max(0, bottomInset);
  }
  if (platform === 'android') {
    return Math.max(0, bottomInset) + FLOATING_TAB_BAR.offset + FLOATING_TAB_BAR.height;
  }
  return IOS_TAB_BAR_FOOTPRINT;
}

export function miniPlayerBottom(platform: PlatformOSType, bottomInset: number, short = false): number {
  return tabBarFootprint(platform, bottomInset, short) + MINI_PLAYER_BOTTOM_GAP;
}

// The bottom padding a tab screen's scroll content needs for the bar. The native bar insets its content on iOS,
// so iOS needs none; the Android floating bar draws over the content, so Android pads by its footprint. A rail has no
// bottom bar, so a short window pads by the safe area alone.
export function tabContentClearance(platform: PlatformOSType, bottomInset: number, short = false): number {
  if (short) {
    return 0;
  }
  return platform === 'android' ? tabBarFootprint(platform, bottomInset) : 0;
}
