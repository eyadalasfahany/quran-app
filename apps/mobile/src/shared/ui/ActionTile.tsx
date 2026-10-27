import { Pressable, Text } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { uiTextProps } from './textStyles';
import { useContrastColors } from './useContrastColors';

export function ActionTile({
  icon,
  label,
  onPress,
  variant = 'default',
  mirrorInRtl = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  // One primary tile per grid: the action people came for (play from here).
  variant?: 'default' | 'primary';
  mirrorInRtl?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const primary = variant === 'primary';
  const ink = primary ? theme.colors.onBrandSurface : theme.colors.ink;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
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
        borderWidth: 1,
        flex: 1,
        gap: theme.space[2],
        justifyContent: 'center',
        minHeight: 72,
        paddingHorizontal: theme.space[1],
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <Icon color={primary ? theme.colors.onBrandSurface : theme.colors.brand} mirrorInRtl={mirrorInRtl} name={icon} />
      <Text {...uiTextProps('label')} style={[theme.text.label, { color: ink, textAlign: 'center' }]}>
        {label}
      </Text>
    </Pressable>
  );
}
