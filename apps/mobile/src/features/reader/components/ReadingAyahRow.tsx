import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Divider, highlightFill, QuranText, useContrastColors, type HighlightColor } from '@/shared/ui';

import { ReadingAyahHeader } from './ReadingAyahHeader';

// The frame's article padding: 14 above the header, 16 above the hairline.
const ROW_PADDING_TOP = 14;

export function ReadingAyahRow({
  verseNumber,
  textUthmani,
  textImlaei,
  fontScale = 1,
  selected = false,
  recited = false,
  highlightColor = null,
  onPress,
  onLongPress,
  onOpenActions,
  onOpenTafsir,
  testID,
}: {
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  fontScale?: number;
  selected?: boolean;
  recited?: boolean;
  highlightColor?: HighlightColor | null;
  onPress?: () => void;
  onLongPress?: () => void;
  onOpenActions?: () => void;
  onOpenTafsir?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const active = selected || recited;
  const labelText = textImlaei ?? textUthmani;
  const ayahLabel = t('ui.ayahNumber', { number: formatNumber(verseNumber, locale) });
  const accessibilityLabel =
    highlightColor === null
      ? `${labelText} ${ayahLabel}`
      : `${labelText} ${ayahLabel} ${t(`ui.highlight.${highlightColor}`)}`;

  const quranBackground = active ? colors.highlightActive : (highlightFill(colors, highlightColor) ?? 'transparent');

  // The header's buttons sit outside the text's Pressable, so each one stays reachable by screen readers.
  return (
    <View style={{ gap: theme.space[2], paddingTop: ROW_PADDING_TOP }}>
      <ReadingAyahHeader
        active={active}
        fontScale={fontScale}
        onOpenActions={onOpenActions}
        onOpenTafsir={onOpenTafsir}
        testID={testID ? `${testID}-header` : undefined}
        verseNumber={verseNumber}
      />
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onLongPress={onLongPress}
        onPress={onPress}
        testID={testID}
      >
        <View
          style={{
            backgroundColor: quranBackground,
            borderRadius: theme.radius.sm,
            borderStartColor: active ? colors.brand : 'transparent',
            borderStartWidth: active ? theme.stroke.activeRule : 0,
            paddingHorizontal: theme.space[1],
            paddingVertical: theme.space[1],
          }}
        >
          <QuranText fontScale={fontScale} variant="quranReading">
            {textUthmani}
          </QuranText>
        </View>
      </Pressable>
      <Divider style={{ marginTop: theme.space[4] }} testID={testID ? `${testID}-divider` : undefined} />
    </View>
  );
}
