import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

// Home's quick-access tile (quran-app-screens.html, #Main): a centred icon over a caption, on a
// raised surface with a hairline border. The row sets each tile to an equal share of the width.
export function HomeTile({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
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
        backgroundColor: pressed ? theme.colors.fillSecondary : theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.card,
        borderWidth: theme.stroke.hairline,
        flex: 1,
        gap: theme.space[2],
        paddingHorizontal: theme.size.homeTilePaddingX,
        paddingVertical: theme.size.homeTilePaddingY,
      })}
      testID={testID}
    >
      <Icon color={theme.colors.brand} name={icon} size={theme.size.icon} />
      <UiText align="center" variant="caption" weight={500}>
        {label}
      </UiText>
    </Pressable>
  );
}
