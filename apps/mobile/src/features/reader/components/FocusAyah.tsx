import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { AyahMarker, highlightFill, useContrastColors, type HighlightColor } from '@/shared/ui';

import { RecitedQuranText } from './RecitedQuranText';

// The current ayah of the Focus frame: centred Quran text over its active marker.
export function FocusAyah({
  verseNumber,
  textUthmani,
  textImlaei,
  fontScale = 1,
  highlightColor = null,
  recited = false,
  activeWord = null,
  onOpenActions,
  testID = 'focus-ayah',
}: {
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  fontScale?: number;
  highlightColor?: HighlightColor | null;
  /** The ayah the player is reciting: the neutral wash and the brand marker (ADR 0012). */
  recited?: boolean;
  /** The recited word (1-based), when the ayah has word segments. */
  activeWord?: number | null;
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
  // The user's colour fills the ayah; the recitation's wash shows only without one (ADR 0012).
  const background = highlightFill(colors, highlightColor) ?? (recited ? colors.highlightActive : undefined);

  return (
    <View style={{ alignItems: 'center', gap: theme.space[4] }}>
      <RecitedQuranText
        accessibilityHint={recited ? t('player.nowPlaying') : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
        activeWord={recited ? activeWord : null}
        align="center"
        fontScale={fontScale}
        style={background === undefined ? undefined : { backgroundColor: background }}
        testID={`${testID}-current`}
        text={textUthmani}
        variant="quranFocus"
      />
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
