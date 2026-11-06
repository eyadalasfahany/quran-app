import { Platform } from 'react-native';

// Android only. Loaded when called, as expo-clipboard is in AyahActionsPanel: a dev client built before this module
// was added would otherwise crash the reader on import. Such a build simply keeps the bar visible.
// Uses NavigationBar.setHidden, not the deprecated setVisibilityAsync. The native side hides the bar with
// BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE, so a swipe from the edge shows it briefly and no behaviour call is needed.
export function setAndroidNavigationBarHidden(hidden: boolean): void {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const navigationBar = require('expo-navigation-bar') as typeof import('expo-navigation-bar');
    // The SDK types setHidden as void, but a rejected promise must never reach the reader.
    const result: unknown = navigationBar.NavigationBar.setHidden(hidden);
    if (result instanceof Promise) {
      result.catch(() => undefined);
    }
  } catch {
    // The native module is missing from this build.
  }
}
