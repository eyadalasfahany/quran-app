import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';

import { arabicTextDirection, displayText } from './textStyles';
import { highlightFill } from './highlight';
import { NumberMedallion } from './NumberMedallion';
import { UiText } from './UiText';
import { useContrastColors } from './useContrastColors';

export type MatchRange = { start: number; end: number };

/**
 * One search hit (screens/, Azkar and Duas search): the number medallion, the matching text with its match highlighted,
 * and an optional muted caption under it (the category's name). The preview is split at the data layer's range and
 * never rewritten. `highlight` null shows the preview plain.
 */
export function SearchResultRow({
  number,
  preview,
  highlight,
  caption = null,
  onPress,
  testID = 'search-result',
}: {
  number: number;
  preview: string;
  highlight: MatchRange | null;
  caption?: string | null;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const fill = highlightFill(theme.colors, 'gold');

  const before = highlight ? preview.slice(0, highlight.start) : preview;
  const match = highlight ? preview.slice(highlight.start, highlight.end) : '';
  const after = highlight ? preview.slice(highlight.end) : '';
  const spoken = caption ? t('common.a11yPair', { label: preview, title: caption }) : preview;

  return (
    <Pressable
      accessibilityLabel={t('common.a11yPair', { label: formatNumber(number, locale), title: spoken })}
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
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
          {before}
          {match ? <Text style={fill ? { backgroundColor: fill } : undefined}>{match}</Text> : null}
          {after}
        </UiText>
        {caption ? (
          <UiText numberOfLines={1} style={{ color: colors.inkMuted }} testID={`${testID}-caption`} variant="caption">
            {caption}
          </UiText>
        ) : null}
      </View>
    </Pressable>
  );
}
