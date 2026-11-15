import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** The «الكل» pill: an action (not a filter) that clears the timeline's selected age. 36 pt tall, 44 pt to touch. */
export function ClearChip({
  label,
  hint,
  onPress,
  testID,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={theme.space[1]}
      // Frame SeerahMapRegionYear: a 36 pt pill on the brand tint, the label in brand at 15, weight 600.
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.glassSelected,
        borderRadius: theme.radius.pill,
        justifyContent: 'center',
        minHeight: theme.size.touchTarget - 2 * theme.space[1],
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.size.chipPaddingX,
      })}
      testID={testID}
    >
      <UiText scale="bar" tone="brand" variant="subhead" weight={600}>
        {label}
      </UiText>
    </Pressable>
  );
}
