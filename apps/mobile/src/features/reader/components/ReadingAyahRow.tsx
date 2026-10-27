import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import type { HighlightColor } from '@/features/library/data/model';
import { AyahMarker } from '@/shared/ui';
import { quranText, uiTextProps } from '@/shared/ui/textStyles';
import { useContrastColors } from '@/shared/ui/useContrastColors';

import type { VerseTranslationBlock } from '../reading-list-types';

const highlightFill = {
  gold: 'highlightGold',
  green: 'highlightGreen',
  blue: 'highlightBlue',
  rose: 'highlightRose',
} as const;

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

  const quranBackground = active
    ? colors.highlightActive
    : highlightColor === null
      ? 'transparent'
      : colors[highlightFill[highlightColor]];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={{
        borderBottomColor: colors.line,
        borderBottomWidth: 1,
        paddingBottom: theme.space[4],
        paddingTop: theme.space[3],
      }}
      testID={testID}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[2] }}>
        <View
          style={{
            backgroundColor: quranBackground,
            borderRadius: theme.radius.sm,
            borderStartColor: active ? colors.brand : 'transparent',
            borderStartWidth: active ? 3 : 0,
            flex: 1,
            paddingHorizontal: theme.space[1],
            paddingVertical: theme.space[1],
          }}
        >
          <Text
            allowFontScaling={false}
            style={[
              quranText('quranReading', fontScale),
              { color: theme.colors.ink, textAlign: 'right', writingDirection: 'rtl' },
            ]}
          >
            {textUthmani}
          </Text>
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
        <TranslationBlock block={block} key={`${verseKey}-${block.resourceId}`} locale={locale} testID={testID} />
      ))}
    </Pressable>
  );
}

function TranslationBlock({
  block,
  locale,
  testID,
}: {
  block: VerseTranslationBlock;
  locale: Locale;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const attribution =
    block.meta.authorName === null
      ? t('reader.translationAttribution', { name: block.meta.name })
      : t('reader.translationAttributionWithAuthor', { author: block.meta.authorName, name: block.meta.name });

  return (
    <View style={{ gap: theme.space[1], marginTop: theme.space[2] }} testID={testID ? `${testID}-translation-${block.resourceId}` : undefined}>
      <Text
        {...uiTextProps('subhead')}
        style={[
          theme.text.subhead,
          {
            color: theme.colors.inkMuted,
            textAlign: block.meta.direction === 'rtl' ? 'right' : 'left',
            writingDirection: block.meta.direction,
          },
        ]}
      >
        {block.text}
      </Text>
      <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: colors.inkMuted }]}>
        {attribution}
      </Text>
    </View>
  );
}
