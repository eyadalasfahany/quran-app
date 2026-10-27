import type { ThemeName } from '@quran/design-tokens';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nManager, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { i18n, type Locale } from '@/core/i18n';
import { ThemeProvider } from '@/core/theme';

// Arabic renders right to left and English left to right, as on a device after the direction reload.
export async function renderUi(
  ui: ReactElement,
  { locale = 'ar', theme = 'light' }: { locale?: Locale; theme?: ThemeName } = {},
) {
  I18nManager.isRTL = locale === 'ar';
  await i18n.changeLanguage(locale);
  return render(<ThemeProvider name={theme}>{ui}</ThemeProvider>);
}

export function flatStyle(style: unknown): ViewStyle & TextStyle {
  if (typeof style === 'function') {
    return flatStyle((style as (state: { pressed: boolean }) => unknown)({ pressed: false }));
  }
  return StyleSheet.flatten(style as StyleProp<ViewStyle & TextStyle>) ?? {};
}

export const locales = ['ar', 'en'] as const satisfies readonly Locale[];
