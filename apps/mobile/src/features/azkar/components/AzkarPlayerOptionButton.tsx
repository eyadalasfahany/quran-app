import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText } from '@/shared/ui';

/**
 * One item in the Azkar player's options bar: a glyph over a short label, in the reader's tokens (ADR 0031 §8). The
 * active item takes the brand colour and weight 600, so a set option is seen without colour alone (a label too).
 */
export function AzkarPlayerOptionButton({
  icon,
  label,
  accessibilityLabel,
  active = false,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const tone = active ? theme.colors.brand : theme.colors.ink;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderRadius: theme.radius.md,
        flex: 1,
        gap: theme.space[1],
        justifyContent: 'center',
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[1],
        paddingVertical: theme.space[2],
      })}
      testID={testID}
    >
      <Icon color={tone} name={icon} size={theme.size.icon} testID={testID ? `${testID}-icon` : undefined} />
      <UiText style={{ color: tone }} variant="label" weight={active ? 600 : 500}>
        {label}
      </UiText>
    </Pressable>
  );
}
