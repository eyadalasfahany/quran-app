import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

export function ActionTile({
  icon,
  label,
  onPress,
  variant = 'default',
  mirrorInRtl = false,
  disabled = false,
  selected,
  accessibilityHint,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary';
  mirrorInRtl?: boolean;
  disabled?: boolean;
  selected?: boolean;
  accessibilityHint?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const primary = variant === 'primary';
  const state = selected === undefined ? { disabled } : { disabled, selected };

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={state}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: primary
          ? theme.colors.brandSurface
          : pressed
            ? theme.colors.fillSecondary
            : theme.colors.surfaceRaised,
        borderColor: primary ? theme.colors.brandSurface : colors.line,
        borderRadius: theme.radius.md,
        borderWidth: theme.stroke.hairline,
        flex: 1,
        gap: theme.space[2],
        justifyContent: 'center',
        minHeight: 72,
        opacity: disabled ? theme.opacity.disabled : 1,
        paddingHorizontal: theme.space[1],
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <Icon color={primary ? theme.colors.onBrandSurface : theme.colors.brand} mirrorInRtl={mirrorInRtl} name={icon} />
      <UiText align="center" style={primary ? { color: theme.colors.onBrandSurface } : null} variant="label">
        {label}
      </UiText>
    </Pressable>
  );
}
