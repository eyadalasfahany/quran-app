import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabContentClearance } from './tab-bar-clearance';

// The bottom padding a tab screen needs for the tab bar: the Android floating bar's footprint (ADR 0033), and
// nothing on iOS, where the native bar insets the content.
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return tabContentClearance(Platform.OS, insets.bottom);
}
