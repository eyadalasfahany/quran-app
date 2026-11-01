import { Pressable, Text, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, highlightFill, NumberMedallion, UiText, useContrastColors } from '@/shared/ui';

export type MatchRange = { start: number; end: number };

/**
 * One matching dhikr in Azkar search (quran-app-screens.html, #AzkarSearch). The match is highlighted in place: the
 * preview is split at the data layer's range and never rewritten. `highlight` null shows the preview plain.
 */
export function AzkarSearchResultRow({
  number,
  preview,
  highlight,
  onPress,
  testID = 'azkar-search-result',
}: {
  number: number;
  preview: string;
  highlight: MatchRange | null;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const fill = highlightFill(theme.colors, 'gold');

  const before = highlight ? preview.slice(0, highlight.start) : preview;
  const match = highlight ? preview.slice(highlight.start, highlight.end) : '';
  const after = highlight ? preview.slice(highlight.end) : '';

  return (
    <Pressable
      accessibilityLabel={`${formatNumber(number, locale)}, ${preview}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: theme.space[4],
      })}
      testID={testID}
    >
      <NumberMedallion number={number} testID={`${testID}-medallion`} />
      <View style={{ flex: 1 }}>
        <UiText numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
          {before}
          {match ? <Text style={fill ? { backgroundColor: fill } : undefined}>{match}</Text> : null}
          {after}
        </UiText>
      </View>
    </Pressable>
  );
}
