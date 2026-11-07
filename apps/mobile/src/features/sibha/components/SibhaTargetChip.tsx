import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

/**
 * One target chip (screens/, #Sibha): a 44 pt pill with the target in 15 pt semibold. The selected chip is
 * filled with the brand surface.
 */
export function SibhaTargetChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? theme.colors.brandSurface : pressed ? theme.colors.fillSecondary : theme.colors.surfaceRaised,
        borderColor: selected ? theme.colors.brandSurface : colors.line,
        borderRadius: theme.radius.chipPanel,
        borderWidth: theme.stroke.hairline,
        justifyContent: 'center',
        minHeight: theme.size.touchTarget,
        minWidth: theme.size.touchTarget + theme.space[3],
        paddingHorizontal: theme.size.chipPaddingX,
      })}
      testID={testID}
    >
      <UiText style={selected ? { color: theme.colors.onBrandSurface } : null} variant="subhead" weight={600}>
        {label}
      </UiText>
    </Pressable>
  );
}
