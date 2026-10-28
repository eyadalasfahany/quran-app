import { I18nManager } from 'react-native';
import type { NativeTabsProps } from 'expo-router/native-tabs';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

export type TabBarStyle = Pick<
  NativeTabsProps,
  'backgroundColor' | 'iconColor' | 'labelStyle' | 'tintColor' | 'unstable_nativeProps'
>;

export function useTabBarStyle(): TabBarStyle {
  const theme = useTheme();
  const colors = useContrastColors();

  return {
    backgroundColor: theme.colors.glassFallback,
    // UIKit ignores I18nManager.forceRTL, so the native tab bar would keep the first tab on the left in Arabic.
    // Passing the direction to react-native-screens sets the tab bar's layoutDirection instead.
    unstable_nativeProps: { direction: I18nManager.isRTL ? 'rtl' : 'ltr' },
    iconColor: { default: colors.inkMuted, selected: theme.colors.brand },
    labelStyle: {
      default: {
        color: colors.inkMuted,
        fontFamily: theme.text.label.fontFamily,
        fontSize: theme.text.label.fontSize,
      },
      selected: {
        color: theme.colors.brand,
        fontFamily: theme.text.headline.fontFamily,
        fontSize: theme.text.label.fontSize,
      },
    },
    tintColor: theme.colors.brand,
  };
}
