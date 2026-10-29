import { Text, View } from 'react-native';

import { displayFontFamilies, useTheme } from '@/core/theme';
import { Rosette } from '@/shared/ui/Rosette';

const ARTWORK_SIZE = 220;
const ORNAMENT_SIZE = 320;
const LETTER_SIZE = 96;
// The frame's 32 pt corner. There is no radius token at 32 (the nearest, xl, is 28), so the frame value is used.
const ARTWORK_RADIUS = 32;

// The reciter's tile on the full player: brand surface, a faint gold rosette and the reciter's initial in Amiri.
// Decorative, so it is hidden from screen readers; the title beneath carries the name.
export function ReciterArtwork({ letter }: { letter: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: theme.colors.brandSurface,
        borderRadius: ARTWORK_RADIUS,
        height: ARTWORK_SIZE,
        justifyContent: 'center',
        overflow: 'hidden',
        width: ARTWORK_SIZE,
      }}
      testID="reciter-artwork"
    >
      <Rosette color={theme.colors.goldOnBrandSurface} size={ORNAMENT_SIZE} style={{ opacity: 0.32, position: 'absolute' }} />
      <Text
        allowFontScaling={false}
        style={{
          color: theme.colors.playerAccent,
          fontFamily: displayFontFamilies[700],
          fontSize: LETTER_SIZE,
          lineHeight: LETTER_SIZE,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}
