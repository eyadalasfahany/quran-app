import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText } from '@/shared/ui';

const CHECK = { ios: 'checkmark', android: 'check' } as const satisfies IconName;

/**
 * One choice in an Azkar player option list (repeat, speed, sleep). The chosen one carries a check mark, so the choice
 * never rests on colour alone. It is a radio, so a screen reader hears the group's choice.
 */
export function AzkarOptionChoiceRow({
  label,
  checked,
  onPress,
  testID,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[2],
        backgroundColor: pressed ? theme.colors.fillSecondary : 'transparent',
      })}
      testID={testID}
    >
      <UiText style={{ flex: 1 }} variant="body" weight={checked ? 600 : 400}>
        {label}
      </UiText>
      {checked ? <Icon color={theme.colors.brand} name={CHECK} size={theme.size.iconSm} testID={testID ? `${testID}-check` : undefined} /> : null}
    </Pressable>
  );
}
