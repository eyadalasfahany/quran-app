import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';
import { getLocale } from './locale';

export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: getLocale(),
  fallbackLng: 'ar',
  supportedLngs: ['ar', 'en'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
