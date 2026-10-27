import type { NativeTabsProps } from 'expo-router/native-tabs';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

export type TabBarStyle = Pick<NativeTabsProps, 'backgroundColor' | 'iconColor' | 'labelStyle' | 'tintColor'>;

export function useTabBarStyle(): TabBarStyle {
  const theme = useTheme();
  const colors = useContrastColors();

  return {
    backgroundColor: theme.colors.glassFallback,
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
