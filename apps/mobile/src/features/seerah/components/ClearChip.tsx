import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** The «الكل» pill: an action (not a filter) that clears the timeline's selected age. 44 pt tall. */
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
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed ? theme.colors.glassSelected : theme.colors.fillSecondary,
        borderRadius: theme.radius.pill,
        justifyContent: 'center',
        minHeight: theme.size.touchTarget,
        minWidth: theme.size.touchTarget + 20,
        paddingHorizontal: theme.space[4],
      })}
      testID={testID}
    >
      <UiText scale="bar" tone="brand" variant="headline">
        {label}
      </UiText>
    </Pressable>
  );
}
