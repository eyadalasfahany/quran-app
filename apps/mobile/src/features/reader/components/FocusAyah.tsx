import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { AyahMarker, QuranText } from '@/shared/ui';

// The current ayah of the Focus frame: centred Quran text over its active marker.
export function FocusAyah({
  verseNumber,
  textUthmani,
  textImlaei,
  fontScale = 1,
  onOpenActions,
  testID = 'focus-ayah',
}: {
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  fontScale?: number;
  onOpenActions?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const labelText = textImlaei ?? textUthmani;

  return (
    <View style={{ alignItems: 'center', gap: theme.space[4] }}>
      <QuranText
        accessibilityLabel={`${labelText} ${t('ui.ayahNumber', { number: formatNumber(verseNumber, locale) })}`}
        accessibilityRole="text"
        align="center"
        fontScale={fontScale}
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
