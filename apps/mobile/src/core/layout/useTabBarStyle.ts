import { I18nManager, Platform } from 'react-native';
import type { NativeTabsProps } from 'expo-router/native-tabs';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

export type TabBarStyle = Pick<
  NativeTabsProps,
  | 'backgroundColor'
  | 'iconColor'
  | 'labelStyle'
  | 'tintColor'
  | 'unstable_nativeProps'
  | 'labelVisibilityMode'
  | 'indicatorColor'
>;

export function useTabBarStyle(): TabBarStyle {
  const theme = useTheme();
  const colors = useContrastColors();
  // Android only (#HomeAndroid): every tab keeps its label, and the active indicator is the brand wash
  // (glassSelected), not Material's default tint. iOS output is unchanged.
  const android: Pick<TabBarStyle, 'labelVisibilityMode' | 'indicatorColor'> =
    Platform.OS === 'android' ? { labelVisibilityMode: 'labeled', indicatorColor: theme.colors.glassSelected } : {};

  return {
    ...android,
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
