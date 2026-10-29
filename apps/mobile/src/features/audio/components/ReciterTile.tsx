import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

// The frame's tile is 46 pt with a 22 pt Amiri letter. No type token has 22, so the size is local.
const TILE_SIZE = 46;
const LETTER_SIZE = 22;
const LETTER_LINE_HEIGHT = 39; // round(22 × 1.758): Amiri's natural leading, so marks don't clip.

// The reciter's initial. Decorative: the row's label carries the name.
export function ReciterTile({ letter, selected, testID }: { letter: string; selected: boolean; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        backgroundColor: selected ? theme.colors.brandSurface : theme.colors.fillSecondary,
        borderRadius: theme.radius.md,
        height: TILE_SIZE,
        justifyContent: 'center',
        width: TILE_SIZE,
      }}
      testID={testID}
    >
      <UiText
        style={{
          color: selected ? theme.colors.onBrandSurface : theme.colors.brand,
          fontSize: LETTER_SIZE,
          lineHeight: LETTER_LINE_HEIGHT,
        }}
        variant="displaySm"
      >
        {letter}
      </UiText>
    </View>
  );
}
