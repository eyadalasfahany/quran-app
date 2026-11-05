import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

// The frame's tile is 46 pt with a 22 pt Amiri letter. No type token has 22, so the size is local (as in ReciterTile).
const TILE_SIZE = 46;
const LETTER_SIZE = 22;
const LETTER_LINE_HEIGHT = 39; // round(22 × 1.758): Amiri's natural leading, so marks don't clip.

// The reciter's initial on the dark player. The current reciter's tile is the brand surface with a gold letter; the
// others are the player's glass fill. A dimmed tile (a reciter without the surah) has a muted letter.
// Decorative: the row's label carries the name.
export function PlayerReciterTile({
  letter,
  selected,
  dimmed = false,
  testID,
}: {
  letter: string;
  selected: boolean;
  dimmed?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const letterColor = dimmed ? theme.colors.playerMuted : theme.colors.playerAccent;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: 'center',
        backgroundColor: selected ? theme.colors.brandSurface : theme.colors.playerGlassFill,
        borderRadius: theme.radius.md,
        height: TILE_SIZE,
        justifyContent: 'center',
        width: TILE_SIZE,
      }}
      testID={testID}
    >
      <UiText
        style={{ color: letterColor, fontSize: LETTER_SIZE, lineHeight: LETTER_LINE_HEIGHT }}
        variant="displaySm"
      >
        {letter}
      </UiText>
    </View>
  );
}
