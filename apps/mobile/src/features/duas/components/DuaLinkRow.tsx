import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/** A link row on prophetic dua detail (Hisn or a hadith collection). */
export function DuaLinkRow({
  title,
  onPress,
  separator = true,
  accessibilityLabel,
  testID = 'dua-link-row',
}: {
  title: string;
  onPress: () => void;
  separator?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderBottomColor: colors.line,
        borderBottomWidth: separator ? theme.stroke.hairline : 0,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[3],
      })}
      testID={testID}
    >
      <View style={{ flex: 1 }}>
        <UiText tone="brand" variant="subhead" weight={600}>
          {title}
        </UiText>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} />
    </Pressable>
  );
}
