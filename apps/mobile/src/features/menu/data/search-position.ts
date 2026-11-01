import type { PlatformOSType } from 'react-native';

import { tabBarFootprint } from '@/core/layout/tab-bar-clearance';
import { MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';

// The floating search button sits 16 above the tab bar: the iOS bar's footprint is 28 + 64 (#Main), the Android
// floating bar is 12 + 64 above the system navigation bar (ADR 0033, tab-bar-clearance.ts). When the tabs mini
// player shows, the button rises above it too. In a short window the tabs are a rail on the side (ADR 0036), so the
// button sits only above the safe area.
const GAP = 16;

export function menuSearchBottom(
  platform: PlatformOSType,
  bottomInset: number,
  miniPlayerShown: boolean,
  short = false,
): number {
  return tabBarFootprint(platform, bottomInset, short) + GAP + (miniPlayerShown ? MINI_PLAYER_TABS_FOOTPRINT : 0);
}
