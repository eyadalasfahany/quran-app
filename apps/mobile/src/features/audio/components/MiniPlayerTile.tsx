import { amiriNaturalLeading } from '@quran/design-tokens';
import { Text, View } from 'react-native';

import { displayFontFamilies, useTheme } from '@/core/theme';

const LETTER_SIZE = 22;

// The reciter's initial on a tile, in Amiri 22/700. Decorative: the reciter's name beside it carries the name.
export function MiniPlayerTile({
  letter,
  size,
  radius,
  glyph,
}: {
  letter: string;
  size: number;
  radius: number;
  glyph: 'brand' | 'ink';
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: radius,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
      testID="mini-player-tile"
    >
      <Text
        allowFontScaling={false}
        style={{
          color: glyph === 'brand' ? theme.colors.brand : theme.colors.ink,
          fontFamily: displayFontFamilies[700],
          fontSize: LETTER_SIZE,
          // Amiri's natural leading, so the marks above the letters are not clipped.
          lineHeight: Math.round(LETTER_SIZE * amiriNaturalLeading),
        }}
      >
        {letter}
      </Text>
    </View>
  );
}
