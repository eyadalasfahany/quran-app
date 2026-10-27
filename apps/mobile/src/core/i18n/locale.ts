import { getLocales } from 'expo-localization';

import { storage, storageKeys } from '@/core/storage/mmkv';

export type Locale = 'ar' | 'en';

function isLocale(value: string | undefined): value is Locale {
  return value === 'ar' || value === 'en';
}

// Arabic is the default. English is selected only when the device language is English.
function deviceLocale(): Locale {
  const code = getLocales()[0].languageCode?.toLowerCase();
  return code === 'en' ? 'en' : 'ar';
}

export function getLocale(): Locale {
  const saved = storage.getString(storageKeys.locale);
  return isLocale(saved) ? saved : deviceLocale();
}

export function saveLocale(locale: Locale): void {
  storage.set(storageKeys.locale, locale);
}
