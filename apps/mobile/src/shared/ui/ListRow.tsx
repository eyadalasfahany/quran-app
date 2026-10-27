import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon } from './Icon';
import { uiTextProps } from './textStyles';
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
  // A pressable row navigates, so it ends in a chevron that points forward in either direction.
  onPress?: () => void;
  // 'strong' for separators that must stay visible over fillSecondary or busy surfaces (ADR 0012).
  separator?: 'line' | 'strong';
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const separatorStyle = separator
    ? { borderBottomColor: separator === 'strong' ? colors.lineStrong : colors.line, borderBottomWidth: 1 }
    : null;

  const content = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text {...uiTextProps('body')} style={[theme.text.body, { color: theme.colors.ink }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: colors.inkMuted }]}>
            {subtitle}
          </Text>
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
