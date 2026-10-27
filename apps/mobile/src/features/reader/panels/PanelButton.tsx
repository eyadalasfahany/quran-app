import { Pressable, Text } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, uiTextProps } from '@/shared/ui';
import { useContrastColors } from '@/shared/ui/useContrastColors';

const DISABLED_OPACITY = 0.45;

export type PanelButtonVariant = 'primary' | 'secondary' | 'danger';

export function PanelButton({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  icon,
  mirrorIconInRtl = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: PanelButtonVariant;
  disabled?: boolean;
  icon?: IconName;
  // Directional glyphs (previous and next ayah) flip with the layout.
  mirrorIconInRtl?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const primary = variant === 'primary';
  const ink = primary ? theme.colors.onBrand : variant === 'danger' ? theme.colors.danger : theme.colors.ink;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: primary ? theme.colors.brand : pressed ? theme.colors.fillSecondary : 'transparent',
        borderColor: primary ? theme.colors.brand : colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        flexDirection: 'row',
        gap: theme.space[2],
        justifyContent: 'center',
        minHeight: 44,
        opacity: disabled ? DISABLED_OPACITY : 1,
        paddingHorizontal: theme.space[4],
      })}
      testID={testID}
    >
      {icon ? <Icon color={ink} mirrorInRtl={mirrorIconInRtl} name={icon} size={17} /> : null}
      <Text {...uiTextProps('subhead')} style={[theme.text.subhead, { color: ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}
