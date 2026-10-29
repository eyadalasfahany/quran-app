import { Pressable, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { UiText } from '@/shared/ui/UiText';

// One item in the options bar: the glyph over a 12 pt label. The active item uses the accent at weight 600.
export function PlayerOptionButton({
  icon,
  label,
  accessibilityLabel,
  active = false,
  disabled = false,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const tone = active ? theme.colors.playerAccent : theme.colors.playerInk;
  const container: ViewStyle = {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: theme.size.touchTarget,
    paddingHorizontal: 2,
    paddingVertical: 8,
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={container}
      testID={testID}
    >
      <Icon color={tone} name={icon} size={22} testID={testID ? `${testID}-icon` : undefined} />
      <UiText style={{ color: tone }} variant="label" weight={active ? 600 : 500}>
        {label}
      </UiText>
    </Pressable>
  );
}
