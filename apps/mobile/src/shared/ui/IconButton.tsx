import { size } from '@quran/design-tokens';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { useContrastColors } from './useContrastColors';

export const ICON_BUTTON_SIZE = size.touchTarget;

// `raised`: a surfaceRaised disc with a hairline, the header search button (screens/, #Main).
export type IconButtonVariant = 'plain' | 'filled' | 'track' | 'surface' | 'glass' | 'raised';
// `brand` draws the glyph in the brand colour, for an on state that is not a selected fill (the «أدعيتي» bell).
export type IconButtonTone = 'ink' | 'muted' | 'brand';

export function IconButton({
  icon,
  label,
  onPress,
  pressed,
  variant = 'plain',
  tone = 'ink',
  disabled = false,
  busy = false,
  hint,
  mirrorInRtl = false,
  iconSize,
  /** Translucent glassFill on the solid fallback. Use over Quran text so the disc is not a wash lookalike. */
  frosted = false,
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
  /** The action is starting (audio loading): screen readers read the button as busy. */
  busy?: boolean;
  /** Read after the label, for example why a disabled control is unavailable. */
  hint?: string;
  mirrorInRtl?: boolean;
  /** Point size of the glyph; omitted, the Icon default (22 pt) applies. */
  iconSize?: number;
  frosted?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const glyph = pressed || tone === 'brand' ? theme.colors.brand : tone === 'muted' ? colors.inkMuted : theme.colors.ink;
  const resting = {
    filled: theme.colors.fillSecondary,
    track: theme.colors.fillTrack,
    surface: theme.colors.surface,
    plain: 'transparent',
    glass: 'transparent',
    raised: theme.colors.surfaceRaised,
  }[variant];
  const raised = variant === 'raised';

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={pressed === undefined && !disabled && !busy ? undefined : { busy: busy || undefined, disabled, selected: pressed }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed: touching }) => ({
        alignItems: 'center',
        backgroundColor: pressed || touching ? theme.colors.glassSelected : resting,
        borderColor: raised ? colors.line : undefined,
        borderRadius: theme.radius.pill,
        borderWidth: raised ? theme.stroke.hairline : 0,
        height: theme.size.touchTarget,
        justifyContent: 'center',
        opacity: disabled ? theme.opacity.disabled : 1,
        width: theme.size.touchTarget,
      })}
      testID={testID}
    >
      {variant === 'glass' ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={testID ? `${testID}-glass` : undefined}>
          <GlassSurface
            radius="pill"
            style={[
              StyleSheet.absoluteFill,
              frosted
                ? {
                    backgroundColor: theme.colors.glassFill,
                    borderColor: theme.colors.glassStroke,
                    borderWidth: StyleSheet.hairlineWidth,
                    boxShadow: theme.shadows.glass,
                  }
                : null,
            ]}
          />
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
