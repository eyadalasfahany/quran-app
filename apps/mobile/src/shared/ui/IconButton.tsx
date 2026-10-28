import { size } from '@quran/design-tokens';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { useContrastColors } from './useContrastColors';

export const ICON_BUTTON_SIZE = size.touchTarget;

export type IconButtonVariant = 'plain' | 'filled' | 'track' | 'glass';
export type IconButtonTone = 'ink' | 'muted';

export function IconButton({
  icon,
  label,
  onPress,
  pressed,
  variant = 'plain',
  tone = 'ink',
  disabled = false,
  hint,
  mirrorInRtl = false,
  iconSize,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  pressed?: boolean;
  variant?: IconButtonVariant;
  /** `muted` draws the glyph in ink-muted, for secondary actions. */
  tone?: IconButtonTone;
  disabled?: boolean;
  /** Read after the label, for example why a disabled control is unavailable. */
  hint?: string;
  mirrorInRtl?: boolean;
  /** Point size of the glyph; omitted, the Icon default (22 pt) applies. */
  iconSize?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const glyph = pressed ? theme.colors.brand : tone === 'muted' ? colors.inkMuted : theme.colors.ink;
  const resting =
    variant === 'filled' ? theme.colors.fillSecondary : variant === 'track' ? theme.colors.fillTrack : 'transparent';

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={pressed === undefined && !disabled ? undefined : { disabled, selected: pressed }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed: touching }) => ({
        alignItems: 'center',
        backgroundColor: pressed || touching ? theme.colors.glassSelected : resting,
        borderRadius: theme.radius.pill,
        height: theme.size.touchTarget,
        justifyContent: 'center',
        opacity: disabled ? theme.opacity.disabled : 1,
        width: theme.size.touchTarget,
      })}
      testID={testID}
    >
      {variant === 'glass' ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={testID ? `${testID}-glass` : undefined}>
          <GlassSurface radius="pill" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <Icon
        color={glyph}
        mirrorInRtl={mirrorInRtl}
        name={icon}
        size={iconSize}
        testID={testID ? `${testID}-icon` : undefined}
      />
    </Pressable>
  );
}
