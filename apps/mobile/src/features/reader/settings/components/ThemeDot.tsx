import { View } from 'react-native';

import { themes, useTheme, type Appearance } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

/** The 12 pt appearance dot on screens/ (Reader settings, theme segments). */
export const THEME_DOT_SIZE = 12;

/**
 * A page-coloured dot for one appearance. Automatic splits the dot: the left
 * half is the light page, the right half the dark page. The split row is set to
 * LTR so left and right stay physical in Arabic.
 */
export function ThemeDot({ appearance }: { appearance: Appearance }) {
  const theme = useTheme();
  const colors = useContrastColors();

  const halves =
    appearance === 'automatic'
      ? [themes.light.colors.surfacePage, themes.dark.colors.surfacePage]
      : [themes[appearance].colors.surfacePage];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        borderColor: colors.line,
        borderRadius: THEME_DOT_SIZE / 2,
        borderWidth: theme.stroke.hairline,
        direction: 'ltr',
        flexDirection: 'row',
        height: THEME_DOT_SIZE,
        overflow: 'hidden',
        width: THEME_DOT_SIZE,
      }}
      testID={`theme-dot-${appearance}`}
    >
      {halves.map((surface, index) => (
        <View key={index} style={{ backgroundColor: surface, flex: 1 }} testID={`theme-dot-${appearance}-half-${index}`} />
      ))}
    </View>
  );
}
