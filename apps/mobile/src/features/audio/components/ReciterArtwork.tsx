import { Text, View } from 'react-native';

import { displayFontFamilies, useTheme } from '@/core/theme';
import { Rosette } from '@/shared/ui/Rosette';

/** The artwork's size at the frame's 220 pt tile. */
export const ARTWORK_SIZE = 220;
const ORNAMENT_SIZE = 320;
const LETTER_SIZE = 96;
// The frame's 32 pt corner. There is no radius token at 32 (the nearest, xl, is 28), so the frame value is used.
const ARTWORK_RADIUS = 32;

// The reciter's tile on the full player: brand surface, a faint gold rosette and the reciter's initial in Amiri.
// The tile is square and `size` pt wide; the radius, rosette and letter scale with it from the 220 pt frame.
// Decorative, so it is hidden from screen readers; the title beneath carries the name.
export function ReciterArtwork({ letter, size = ARTWORK_SIZE }: { letter: string; size?: number }) {
  const theme = useTheme();
  const scale = size / ARTWORK_SIZE;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: theme.colors.brandSurface,
        borderRadius: ARTWORK_RADIUS * scale,
        height: size,
        justifyContent: 'center',
        overflow: 'hidden',
        width: size,
      }}
      testID="reciter-artwork"
    >
      <Rosette
        color={theme.colors.goldOnBrandSurface}
        size={ORNAMENT_SIZE * scale}
        style={{ opacity: 0.32, position: 'absolute' }}
      />
      <Text
        allowFontScaling={false}
        style={{
          color: theme.colors.playerAccent,
          fontFamily: displayFontFamilies[700],
          fontSize: LETTER_SIZE * scale,
          lineHeight: LETTER_SIZE * scale,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}
