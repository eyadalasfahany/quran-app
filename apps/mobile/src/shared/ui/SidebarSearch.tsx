import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

const MAGNIFIER = { ios: 'magnifyingglass', android: 'search' } as const;

// The search entry at the top of the expanded sidebar. It opens the Search screen; it is not a field.
export function SidebarSearch({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[2],
        marginBottom: theme.space[2],
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[3],
      })}
      testID={testID}
    >
      <Icon color={colors.inkMuted} name={MAGNIFIER} size={theme.size.iconMd} />
      <UiText tone="muted" variant="body">
        {label}
      </UiText>
    </Pressable>
  );
}
