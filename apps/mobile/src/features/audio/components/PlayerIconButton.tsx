import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui/Icon';

// A player glyph in a hit area of at least 44 pt. Colours are the player tokens, never the theme's ink.
export function PlayerIconButton({
  icon,
  label,
  onPress,
  disabled = false,
  hitSize = 44,
  glyphSize = 22,
  background,
  radius,
  glyphColor,
  mirrorInRtl = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hitSize?: number;
  glyphSize?: number;
  background?: string;
  /** Corner radius; the default is a full circle. */
  radius?: number;
  glyphColor?: string;
  /** Directional glyphs flip with the layout direction, play included (it points left in Arabic). Pause is symmetric. */
  mirrorInRtl?: boolean;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: background ?? 'transparent',
        borderRadius: radius ?? theme.radius.pill,
        height: Math.max(hitSize, theme.size.touchTarget),
        justifyContent: 'center',
        opacity: disabled ? theme.opacity.disabled : 1,
        width: Math.max(hitSize, theme.size.touchTarget),
      }}
      testID={testID}
    >
      <Icon
        color={glyphColor ?? theme.colors.playerInk}
        mirrorInRtl={mirrorInRtl}
        name={icon}
        size={glyphSize}
        testID={testID ? `${testID}-icon` : undefined}
      />
    </Pressable>
  );
}
