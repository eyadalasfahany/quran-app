import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/shared/ui/Icon';
import { UiText } from '@/shared/ui/UiText';

import { CHECK_ICON } from './player-icons';

// One choice in a player menu. The chosen one carries a check mark, so the choice never rests on colour alone.
export function PlayerChoiceRow({
  label,
  checked = false,
  disabled = false,
  onPress,
  testID,
}: {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const tone = disabled ? theme.colors.playerMuted : theme.colors.playerInk;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[2],
        backgroundColor: pressed ? theme.colors.playerGlassFill : 'transparent',
      })}
      testID={testID}
    >
      <UiText style={{ color: tone, flex: 1 }} variant="body" weight={checked ? 600 : 400}>
        {label}
      </UiText>
      {checked ? (
        <Icon color={theme.colors.playerAccent} name={CHECK_ICON} size={18} testID={testID ? `${testID}-check` : undefined} />
      ) : null}
    </Pressable>
  );
}
