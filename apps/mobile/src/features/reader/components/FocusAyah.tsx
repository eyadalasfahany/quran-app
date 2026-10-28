import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { AyahMarker, highlightFill, QuranText, useContrastColors, type HighlightColor } from '@/shared/ui';

// The current ayah of the Focus frame: centred Quran text over its active marker.
export function FocusAyah({
  verseNumber,
  textUthmani,
  textImlaei,
  fontScale = 1,
  highlightColor = null,
  onOpenActions,
  testID = 'focus-ayah',
}: {
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  fontScale?: number;
  highlightColor?: HighlightColor | null;
  onOpenActions?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const labelText = textImlaei ?? textUthmani;
  const ayahLabel = t('ui.ayahNumber', { number: formatNumber(verseNumber, locale) });
  const accessibilityLabel =
    highlightColor === null
      ? `${labelText} ${ayahLabel}`
      : `${labelText} ${ayahLabel} ${t(`ui.highlight.${highlightColor}`)}`;
  const background = highlightFill(colors, highlightColor);

  return (
    <View style={{ alignItems: 'center', gap: theme.space[4] }}>
      <QuranText
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
        align="center"
        fontScale={fontScale}
        style={background === undefined ? undefined : { backgroundColor: background }}
        testID={`${testID}-current`}
        variant="quranFocus"
      >
        {textUthmani}
      </QuranText>
      <AyahMarker
        active
        markerSize={theme.size.focusMarker}
        number={verseNumber}
        onPress={onOpenActions}
        testID={`${testID}-marker`}
      />
    </View>
  );
}
