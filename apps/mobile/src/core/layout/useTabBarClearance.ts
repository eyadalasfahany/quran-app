import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabContentClearance } from './tab-bar-clearance';
import { useIsShortWindow, useWindowClass } from './useWindowClass';

/**
 * The bottom clearance a tab screen's scroll content keeps for the tab bar. iOS pads too, since the native bar does not
 * inset scroll views. An expanded window needs none: the sidebar replaces the tab bar.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const short = useIsShortWindow();
  const expanded = useWindowClass() === 'expanded';
  if (expanded) {
    return 0;
  }
  return tabContentClearance(Platform.OS, insets.bottom, short);
}
