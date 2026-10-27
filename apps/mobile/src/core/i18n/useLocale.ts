import { useTranslation } from 'react-i18next';

import type { Locale } from './locale';

// The interface language now showing, for components that format numbers or pick per-language text.
// It follows i18n rather than the saved choice, so a component re-renders when the language changes.
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? 'en' : 'ar';
}
