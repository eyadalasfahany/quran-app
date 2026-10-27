import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { textToneColor, UiText, type TextTone } from './UiText';
import { useContrastColors } from './useContrastColors';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

// 'regular' is the design system's button (17 / 600); 'small' is the 13 / 600 button the frames draw
// inside sheets and panels.
export type ButtonSize = 'regular' | 'small';

const labelTone: Record<ButtonVariant, TextTone> = {
  primary: 'onBrand',
  secondary: 'ink',
  ghost: 'brand',
  danger: 'danger',
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'regular',
  disabled = false,
  icon,
  mirrorIconInRtl = false,
  stretch = false,
  accessibilityHint,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  icon?: IconName;
  // Directional glyphs (previous and next ayah) flip with the layout.
  mirrorIconInRtl?: boolean;
  // Fills the width of its container, as the full-width actions in empty states do.
  stretch?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const tone: TextTone = disabled ? 'muted' : labelTone[variant];
  const resting = {
    primary: theme.colors.brand,
    secondary: theme.colors.surfaceRaised,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];
  const border = variant === 'secondary' || variant === 'danger' ? colors.line : 'transparent';

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          alignSelf: stretch ? 'stretch' : 'flex-start',
          backgroundColor: disabled ? theme.colors.fillSecondary : resting,
          borderColor: disabled ? 'transparent' : border,
          borderRadius: theme.radius.pill,
          borderWidth: theme.stroke.hairline,
          flexDirection: 'row',
          gap: theme.space[2],
          justifyContent: 'center',
          minHeight: theme.size.touchTarget,
          opacity: pressed ? theme.opacity.pressed : 1,
          paddingHorizontal: size === 'small' ? theme.space[4] : theme.space[5],
        },
        style,
      ]}
      testID={testID}
    >
      {icon ? (
        <Icon
          color={textToneColor(colors, tone)}
          mirrorInRtl={mirrorIconInRtl}
          name={icon}
          size={size === 'small' ? theme.size.iconSm : theme.size.iconMd}
          testID={testID ? `${testID}-icon` : undefined}
        />
      ) : null}
      <UiText tone={tone} variant={size === 'small' ? 'caption' : 'headline'} weight={600}>
        {label}
      </UiText>
    </Pressable>
  );
}
