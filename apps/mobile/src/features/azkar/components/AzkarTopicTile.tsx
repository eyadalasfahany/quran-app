import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

/** A browse topic (quran-app-screens.html, #AzkarHome «المواضيع»): the name over its dhikr count, on a raised card. */
export function AzkarTopicTile({
  title,
  countText,
  onPress,
  testID = 'azkar-topic-tile',
}: {
  title: string;
  countText: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={`${title}, ${countText}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.fillSecondary : theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.card,
        borderWidth: theme.stroke.hairline,
        flex: 1,
        gap: theme.space[2],
        minHeight: theme.size.touchTarget * 2,
        padding: theme.space[4],
        justifyContent: 'center',
      })}
      testID={testID}
    >
      <UiText variant="body" weight={600}>
        {title}
      </UiText>
      <UiText tone="muted" variant="caption">
        {countText}
      </UiText>
    </Pressable>
  );
}
