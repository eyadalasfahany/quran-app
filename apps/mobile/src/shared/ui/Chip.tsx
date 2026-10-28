import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

// 'sheet' is the phone sheet's chip (radius 19); 'panel' is the side panel's (radius 22).
export type ChipLayout = 'sheet' | 'panel';

export function Chip({
  label,
  selected,
  onPress,
  role = 'button',
  layout = 'panel',
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: 'radio' | 'button';
  layout?: ChipLayout;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected
          ? theme.colors.brandSurface
          : pressed
            ? theme.colors.fillSecondary
            : theme.colors.surfaceRaised,
        borderColor: selected ? theme.colors.brandSurface : colors.line,
        borderRadius: layout === 'sheet' ? theme.radius.chipSheet : theme.radius.chipPanel,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        minHeight: theme.size.touchTarget,
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
