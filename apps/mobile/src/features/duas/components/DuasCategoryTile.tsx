import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

// The frame's 2 px gap between a tile's name and its caption (no space step).
const LINE_GAP = 2;

/** A Duas category tile (screens/, #DuasHomeCategories): the name over its count and source, on a raised card. */
export function DuasCategoryTile({
  name,
  caption,
  onPress,
  testID = 'duas-category-tile',
}: {
  name: string;
  caption: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: name, title: caption })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.card,
        borderWidth: theme.stroke.hairline,
        flex: 1,
        gap: LINE_GAP,
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.size.blockGap,
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <UiText variant="headline" weight={600}>
        {name}
      </UiText>
      <UiText tone="muted" variant="label" weight={400}>
        {caption}
      </UiText>
    </Pressable>
  );
}
