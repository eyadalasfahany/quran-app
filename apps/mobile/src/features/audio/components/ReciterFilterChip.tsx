import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

// One filter chip of the Listen frame: 44 pt tall, 14 pt side padding, an 18 pt radius (the frame's chip
// radius; theme.radius.card shares the value but names a card), and a 13 pt weight-600 label.
export function ReciterFilterChip({
  label,
  selected,
  disabled = false,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected
          ? theme.colors.brandSurface
          : pressed
            ? theme.colors.fillSecondary
            : theme.colors.surfaceRaised,
        borderColor: selected ? theme.colors.brandSurface : colors.line,
        borderRadius: theme.radius.card,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        minHeight: theme.size.touchTarget,
        opacity: disabled ? theme.opacity.disabled : 1,
        paddingHorizontal: theme.size.chipPaddingX,
      })}
      testID={testID}
    >
      <UiText style={selected ? { color: theme.colors.onBrandSurface } : null} variant="caption" weight={600}>
        {label}
      </UiText>
    </Pressable>
  );
}
