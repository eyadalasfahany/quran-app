import type { PlatformOSType } from 'react-native';

// Where the mini player's bottom edge sits above the screen's bottom edge, on compact and medium windows.
// The native tab bar's height is not readable from JS (expo-router's NativeTabs exposes no measurement),
// so these are the frames' geometry: the iOS tab bar floats 28 above the edge and is 64 tall (#Main); the
// Android bar is 80 tall and sits above the system navigation bar (#HomeAndroid). Not measured on a device yet.
export const MINI_PLAYER_BOTTOM_GAP = 12;
const IOS_TAB_BAR_FOOTPRINT = 28 + 64;
const ANDROID_TAB_BAR_HEIGHT = 80;

export function miniPlayerBottom(platform: PlatformOSType, bottomInset: number): number {
  if (platform === 'android') {
    return Math.max(0, bottomInset) + ANDROID_TAB_BAR_HEIGHT + MINI_PLAYER_BOTTOM_GAP;
  }
  return IOS_TAB_BAR_FOOTPRINT + MINI_PLAYER_BOTTOM_GAP;
}
