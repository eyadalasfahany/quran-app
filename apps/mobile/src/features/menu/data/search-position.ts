import type { PlatformOSType } from 'react-native';

import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';

// The floating search button sits 16 above the tab bar: the iOS bar's footprint is 28 + 64 (#Main), the Android bar
// is 80 above the system navigation bar (tab-bar-clearance.ts). When the tabs mini player shows, the button rises
// above it too.
const GAP = 16;
const IOS_TAB_BAR_FOOTPRINT = 28 + 64;
const ANDROID_TAB_BAR_HEIGHT = 80;

export function menuSearchBottom(platform: PlatformOSType, bottomInset: number, miniPlayerShown: boolean): number {
  const bar = platform === 'android' ? Math.max(0, bottomInset) + ANDROID_TAB_BAR_HEIGHT : IOS_TAB_BAR_FOOTPRINT;
  return bar + GAP + (miniPlayerShown ? MINI_PLAYER_TABS_FOOTPRINT : 0);
}
