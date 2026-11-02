import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabContentClearance } from './tab-bar-clearance';
import { useIsShortWindow } from './useWindowClass';

/**
 * The bottom clearance a tab screen's scroll content keeps for the tab bar. iOS pads too, since the native bar does not
 * inset scroll views. Every window that is not short keeps it, tablets included (ADR 0051).
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const short = useIsShortWindow();
  return tabContentClearance(Platform.OS, insets.bottom, short);
}
