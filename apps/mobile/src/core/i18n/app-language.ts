import { Platform, Settings } from 'react-native';

import type { Locale } from './locale';

// On iOS, UIKit reads AppleLanguages once, at process launch. Writing it here makes the native
// chrome (tab bar order, alerts, system layout direction) follow the saved interface language on
// the next cold start. The JS reload in direction.ts does not relaunch the process, so the first
// launch after a switch can still show the old native chrome. Android has no equivalent here:
// its layout direction comes from I18nManager, and RN's Settings module only warns there.
export function syncNativeAppLanguage(locale: Locale): void {
  if (Platform.OS !== 'ios') {
    return;
  }
  Settings.set({ AppleLanguages: [locale] });
}
