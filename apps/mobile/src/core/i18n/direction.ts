import * as Updates from 'expo-updates';
import { DevSettings, I18nManager } from 'react-native';

import type { Locale } from './locale';

function isRtlLocale(locale: Locale): boolean {
  return locale === 'ar';
}

export function directionMatches(locale: Locale): boolean {
  return I18nManager.isRTL === isRtlLocale(locale);
}

// forceRTL(false) only clears the force flag. An Arabic device stays RTL unless
// allowRTL is also false. Arabic turns both on so an English device still flips.
export function applyDirection(locale: Locale): void {
  const rtl = isRtlLocale(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

// Resolves false when the reload failed, so the caller can carry on in the current direction.
export async function reloadApp(isDev: boolean = __DEV__): Promise<boolean> {
  if (isDev) {
    DevSettings.reload();
    return true;
  }
  try {
    await Updates.reloadAsync();
    return true;
  } catch (error) {
    console.warn('Reloading after a layout direction change failed.', error);
    return false;
  }
}
