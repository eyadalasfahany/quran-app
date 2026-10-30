import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

// The My Quran saved rows (quran-app-screens.html, #MyQuran): 14 pt padding inside an 18 pt card.
// No space token matches the padding, so it stays local.
const ROW_PADDING = 14;

// One saved item (bookmark, highlight, note): a leading glyph, the «سورة · الآية» title over a meta
// line, and a trailing affordance. Tapping the row opens the reader at that ayah.
export function SavedVerseRow({
  title,
  subtitle,
  subtitleLines = 1,
  footnote,
  leading,
  trailing,
  onPress,
  testID,
}: {
  title: string;
  subtitle?: string;
  /** The note preview allows two lines; every other meta line is one. */
  subtitleLines?: number;
  /** A muted caption under the meta line — the note's updated date (step brief). */
  footnote?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.card,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: ROW_PADDING,
      })}
      testID={testID}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <UiText variant="headline">{title}</UiText>
        {subtitle ? (
          <UiText numberOfLines={subtitleLines} tone="muted" variant="label" weight={400}>
            {subtitle}
          </UiText>
        ) : null}
        {footnote ? (
          <UiText numberOfLines={1} tone="muted" variant="caption">
            {footnote}
          </UiText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}
