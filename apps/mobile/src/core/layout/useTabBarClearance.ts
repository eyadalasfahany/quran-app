import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabContentClearance } from './tab-bar-clearance';
import { useIsShortWindow } from './useWindowClass';

// The bottom padding a tab screen needs for the tab bar: the Android floating bar's footprint (ADR 0033), and
// nothing on iOS, where the native bar insets the content. In a short window the tabs are a rail on the start side,
// so there is no bottom clearance (ADR 0036; the side clearance comes from useTabRailSideInset).
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const short = useIsShortWindow();
  return tabContentClearance(Platform.OS, insets.bottom, short);
}
