import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { AyahMarker, Divider, highlightFill, QuranText, useContrastColors, type HighlightColor } from '@/shared/ui';

import type { VerseTranslationBlock } from '../reading-list-types';
import { TranslationBlock } from './TranslationBlock';

export function ReadingAyahRow({
  verseKey,
  verseNumber,
  textUthmani,
  textImlaei,
  translations,
  fontScale = 1,
  selected = false,
  recited = false,
  highlightColor = null,
  onPress,
  onLongPress,
  onOpenActions,
  testID,
}: {
  verseKey: string;
  verseNumber: number;
  textUthmani: string;
  textImlaei: string | null;
  translations: readonly VerseTranslationBlock[];
  fontScale?: number;
  selected?: boolean;
  recited?: boolean;
  highlightColor?: HighlightColor | null;
  onPress?: () => void;
  onLongPress?: () => void;
  onOpenActions?: () => void;
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

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={{ paddingTop: theme.space[3] }}
      testID={testID}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[2] }}>
        <View
          style={{
            backgroundColor: quranBackground,
            borderRadius: theme.radius.sm,
            borderStartColor: active ? colors.brand : 'transparent',
            borderStartWidth: active ? theme.stroke.activeRule : 0,
            flex: 1,
            paddingHorizontal: theme.space[1],
            paddingVertical: theme.space[1],
          }}
        >
          <QuranText fontScale={fontScale} variant="quranReading">
            {textUthmani}
          </QuranText>
        </View>
        <AyahMarker
          active={active}
          fontScale={fontScale}
          number={verseNumber}
          onPress={onOpenActions}
          testID={testID ? `${testID}-marker` : undefined}
        />
      </View>
      {translations.map((block) => (
        <TranslationBlock
          block={block}
          key={`${verseKey}-${block.resourceId}`}
          testID={testID ? `${testID}-translation-${block.resourceId}` : undefined}
        />
      ))}
      <Divider style={{ marginTop: theme.space[4] }} testID={testID ? `${testID}-divider` : undefined} />
    </Pressable>
  );
}
