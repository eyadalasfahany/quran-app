import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { BufferingRing } from '@/shared/ui/BufferingRing';
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
  starting = false,
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
  /** Previous/next glyphs flip with the layout direction; play and pause never do (ADR 0029). */
  mirrorInRtl?: boolean;
  /** Audio is starting from this button: the glyph is the caller's pause and a buffering ring turns around it. */
  starting?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const side = Math.max(hitSize, theme.size.touchTarget);
  const ringColor = glyphColor ?? theme.colors.playerInk;

  return (
    <BufferingRing active={starting} color={ringColor} size={side}
      testID={testID ? `${testID}-ring` : undefined}
    >
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: starting || undefined, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: background ?? 'transparent',
        borderRadius: radius ?? theme.radius.pill,
        height: side,
        justifyContent: 'center',
        opacity: disabled ? theme.opacity.disabled : 1,
        width: side,
      }}
      testID={testID}
    >
      <Icon
        color={ringColor}
        mirrorInRtl={mirrorInRtl}
        name={icon}
        size={glyphSize}
        testID={testID ? `${testID}-icon` : undefined}
      />
    </Pressable>
    </BufferingRing>
  );
}
