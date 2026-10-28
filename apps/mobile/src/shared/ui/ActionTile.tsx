import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

// Ayah actions frame (quran-app-screens.html): tile gap and horizontal padding. No space token
// matches these, so they stay local.
const TILE_GAP = 6;
const TILE_PADDING_HORIZONTAL = 2;

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
        borderRadius: theme.radius.tile,
        borderWidth: theme.stroke.hairline,
        flex: 1,
        gap: TILE_GAP,
        justifyContent: 'center',
        opacity: disabled ? theme.opacity.disabled : 1,
        paddingHorizontal: TILE_PADDING_HORIZONTAL,
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <Icon color={primary ? theme.colors.onBrandSurface : theme.colors.brand} mirrorInRtl={mirrorInRtl} name={icon} />
      <UiText
        align="center"
        style={primary ? { color: theme.colors.onBrandSurface } : null}
        variant="label"
        weight={primary ? 600 : undefined}
      >
        {label}
      </UiText>
    </Pressable>
  );
}
