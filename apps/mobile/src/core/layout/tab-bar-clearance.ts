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

// The space the tab bar takes from the bottom edge, measured from the bottom safe area.
export function tabBarFootprint(platform: PlatformOSType, bottomInset: number): number {
  if (platform === 'android') {
    return Math.max(0, bottomInset) + FLOATING_TAB_BAR.offset + FLOATING_TAB_BAR.height;
  }
  return IOS_TAB_BAR_FOOTPRINT;
}

export function miniPlayerBottom(platform: PlatformOSType, bottomInset: number): number {
  return tabBarFootprint(platform, bottomInset) + MINI_PLAYER_BOTTOM_GAP;
}

// The bottom padding a tab screen's scroll content needs for the bar. The native bar insets its content on iOS,
// so iOS needs none; the Android floating bar draws over the content, so Android pads by its footprint.
export function tabContentClearance(platform: PlatformOSType, bottomInset: number): number {
  return platform === 'android' ? tabBarFootprint(platform, bottomInset) : 0;
}
