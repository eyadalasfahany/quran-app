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
  titleVariant = 'body',
  chevron = true,
  density = 'default',
  testID,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  separator?: 'line' | 'strong';
  /** `displaySm` sets the title in Amiri, as the surah index does. */
  titleVariant?: 'body' | 'displaySm';
  /** Rows whose trailing content already reads as the destination (the index's page) drop the chevron. */
  chevron?: boolean;
  /**
   * `index`: the Surah index rows (quran-app-screens.html, #SurahIndex). At least 60 pt tall with no inset,
   * a 14 pt gap, the name in Amiri 19 and the meta line at 12 pt. `default` is every other list.
   */
  density?: 'default' | 'index';
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const index = density === 'index';
  const separatorStyle = separator
    ? {
        borderBottomColor: separator === 'strong' ? colors.lineStrong : colors.line,
        borderBottomWidth: theme.stroke.hairline,
      }
    : null;
  const titleStyle =
    index && titleVariant === 'displaySm'
      ? { fontSize: theme.size.indexNameSize, lineHeight: theme.size.indexNameLineHeight }
      : undefined;

  const content = (
    <>
      {leading}
      <View style={{ flex: 1, gap: index ? 0 : 2 }}>
        <UiText style={titleStyle} variant={titleVariant}>
          {title}
        </UiText>
        {subtitle ? (
          index ? (
            <UiText tone="muted" variant="label" weight={400}>
              {subtitle}
            </UiText>
          ) : (
            <UiText tone="muted" variant="caption">
              {subtitle}
            </UiText>
          )
        ) : null}
      </View>
      {trailing}
      {onPress && chevron ? <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} testID="list-row-chevron" /> : null}
    </>
  );

  const row = index
    ? {
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.size.indexRowGap,
        minHeight: theme.size.indexRowMinHeight,
      } as const
    : ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 52,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[2],
      } as const);

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
