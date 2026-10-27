import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon } from './Icon';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right' } as const;

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  separator,
  testID,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const separatorStyle = separator
    ? {
        borderBottomColor: separator === 'strong' ? colors.lineStrong : colors.line,
        borderBottomWidth: theme.stroke.hairline,
      }
    : null;

  const content = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <UiText variant="body">{title}</UiText>
        {subtitle ? (
          <UiText tone="muted" variant="caption">
            {subtitle}
          </UiText>
        ) : null}
      </View>
      {trailing}
      {onPress ? <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} testID="list-row-chevron" /> : null}
    </>
  );

  const row = {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.space[3],
    minHeight: 52,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  } as const;

  if (!onPress) {
    return (
      <View style={[row, separatorStyle]} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [row, separatorStyle, pressed ? { backgroundColor: theme.colors.fillSecondary } : null]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}
