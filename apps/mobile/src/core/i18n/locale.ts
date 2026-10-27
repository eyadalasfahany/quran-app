import { storage, storageKeys } from '@/core/storage/mmkv';

export type Locale = 'ar' | 'en';

function isLocale(value: string | undefined): value is Locale {
  return value === 'ar' || value === 'en';
}

// Arabic is the default. English is selected only when the device language is English.
// Arabic is the app's language for now, whatever the device language. English is used only once the
// reader has chosen it, which saves the choice.
export function getLocale(): Locale {
  const saved = storage.getString(storageKeys.locale);
  return isLocale(saved) ? saved : 'ar';
}

export function saveLocale(locale: Locale): void {
  storage.set(storageKeys.locale, locale);
}
