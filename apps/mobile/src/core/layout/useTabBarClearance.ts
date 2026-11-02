import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabContentClearance } from './tab-bar-clearance';
import { useTabRail } from './useTabRail';

/**
 * The bottom clearance a tab screen's scroll content keeps for the bottom bar. iOS pads too, since the native bar does not
 * inset scroll views. A rail window (a short window or a tablet, ADR 0036 and ADR 0051 as amended 2 Nov 2026) has no
 * bottom bar, so it keeps none; the rail clears the start edge instead (TabRailContext).
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return tabContentClearance(Platform.OS, insets.bottom, useTabRail());
}
