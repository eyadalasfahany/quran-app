import { getLocales } from 'expo-localization';

import type { Locale } from '@/core/i18n';

/** First onboarding language pre-selection (content-plan: device language). */
export function suggestLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'ar';
}
