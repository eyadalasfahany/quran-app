import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

/** A 52 px grouped-list row on Duas home without a progress ring (quran-app-screens.html, #DuasHome). */
export function DuasSourceRow({
  title,
  detail,
  onPress,
  separator = true,
  accessibilityLabel,
  testID = 'duas-source-row',
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  separator?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const label = accessibilityLabel ?? (detail ? `${title}, ${detail}` : title);

  return (
    <Pressable
      accessibilityLabel={label}
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
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText variant="body" weight={600}>
          {title}
        </UiText>
        {detail ? (
          <UiText tone="muted" variant="caption">
            {detail}
          </UiText>
        ) : null}
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} />
    </Pressable>
  );
}
