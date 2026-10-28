import RenderHtml, { type MixedStyleRecord } from '@native-html/render';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { uiFontFamilies, useTheme } from '@/core/theme';
import { Card, Chip, EmptyState, maxFontScale, QuranText, UiText } from '@/shared/ui';

import { AyahStepper } from './AyahStepper';
import type { TextDirection } from './panel-text';

const EMPTY_ICON = { ios: 'book.closed', android: 'menu_book' } as const;
const SYSTEM_FONTS = Object.values(uiFontFamilies);
// Bold picks the bold face; a fontWeight on top would fake-bold it on Android.
const TAGS_STYLES: MixedStyleRecord = {
  b: { fontFamily: uiFontFamilies[700], fontWeight: 'normal' },
  strong: { fontFamily: uiFontFamilies[700], fontWeight: 'normal' },
};

export type TafsirOption = {
  resourceId: number;
  name: string;
  authorName: string | null;
  // «مختصر» or «مفصّل» when the catalogue says so.
  lengthTag?: string | null;
  direction?: TextDirection | null;
};

// 'sheet' is the phone sheet: a horizontal row of tafsirs and a floating previous and next bar.
// 'panel' is the side panel: the tafsirs wrap and the previous and next buttons sit at its foot.
export type TafsirPanelLayout = 'sheet' | 'panel';

export function TafsirPanel({
  tafsirs,
  selectedId,
  onSelect,
  verseNumber,
  textUthmani,
  ayahLabel,
  html,
  coverage,
  fontScale = 1,
  onPrevious,
  onNext,
  downloadTafsirId,
  onDownload,
  layout = 'panel',
  testID = 'tafsir-panel',
}: {
  // Installed tafsirs only.
  tafsirs: readonly TafsirOption[];
  selectedId: number | null;
  onSelect: (resourceId: number) => void;
  verseNumber: number;
  // Uthmani text exactly as stored.
  textUthmani: string;
  // Screen readers hear the Imla'i text and the ayah number.
  ayahLabel?: string;
  // Sanitized server-side and rendered as received; null when the tafsir has no passage here.
  html: string | null;
  // Ayah numbers the passage spans, when it covers more than this ayah.
  coverage: { from: number; to: number } | null;
  fontScale?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  // The tafsir the empty state offers to download, when one is known.
  downloadTafsirId: number | null;
  onDownload: (resourceId: number) => void;
  layout?: TafsirPanelLayout;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const windowWidth = useWindowDimensions().width;
  const [width, setWidth] = useState<number | null>(null);
  const selected = tafsirs.find((tafsir) => tafsir.resourceId === selectedId) ?? null;
  const direction = selected?.direction ?? null;

  const { fontSize = 17, lineHeight = 26 } = theme.text.body;
  const baseStyle = {
    color: theme.colors.ink,
    fontFamily: uiFontFamilies[400],
    fontSize: fontSize * fontScale,
    lineHeight: lineHeight * fontScale,
    ...(direction === null ? {} : { textAlign: direction === 'rtl' ? ('right' as const) : ('left' as const) }),
  };

  // The sheet's floating bar sits over the scroll, so the scroll keeps clear of it.
  const scrollBottom = layout === 'sheet' ? theme.size.touchTarget * 2 : theme.space[4];
  const stepper = (
    <AyahStepper
      onNext={onNext}
      onPrevious={onPrevious}
      testID={`${testID}-steps`}
      variant={layout === 'sheet' ? 'pill' : 'split'}
    />
  );

  if (tafsirs.length === 0) {
    return (
      <View style={{ flex: 1 }} testID={testID}>
        <ScrollView contentContainerStyle={{ gap: theme.size.sheetGap, paddingBottom: scrollBottom, paddingVertical: theme.space[6] }}>
          <EmptyState
            action={
              downloadTafsirId === null
                ? undefined
                : { label: t('reader.tafsir.download'), onPress: () => onDownload(downloadTafsirId) }
            }
            body={t('reader.tafsir.emptyBody')}
            icon={EMPTY_ICON}
            testID={`${testID}-empty`}
            title={t('reader.tafsir.emptyTitle')}
          />
        </ScrollView>
        {stepper}
      </View>
    );
  }

  // The credit line is 12 on the phone sheet and 13 in the side panel, weight 400 in both.
  const credit =
    layout === 'sheet'
      ? { style: { lineHeight: theme.size.creditLineHeight }, variant: 'label' as const, weight: 400 as const }
      : { variant: 'caption' as const };
  const chips = tafsirs.map((tafsir) => (
    <Chip
      caption={tafsir.lengthTag ?? undefined}
      key={tafsir.resourceId}
      label={tafsir.name}
      layout={layout}
      onPress={() => onSelect(tafsir.resourceId)}
      role="radio"
      selected={tafsir.resourceId === selectedId}
      testID={`${testID}-option-${tafsir.resourceId}`}
    />
  ));
  const picker =
    layout === 'sheet' ? (
      <ScrollView
        accessibilityLabel={t('reader.tafsir.pickerLabel')}
        accessibilityRole="radiogroup"
        contentContainerStyle={{ gap: theme.space[2] }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {chips}
      </ScrollView>
    ) : (
      <View
        accessibilityLabel={t('reader.tafsir.pickerLabel')}
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
      >
        {chips}
      </View>
    );
  // The passage's own range, or this ayah alone; no passage means no range to name.
  const coverageLabel =
    html === null
      ? null
      : coverage === null
        ? t('reader.tafsir.coverageOne', { ayah: formatNumber(verseNumber, locale) })
        : t('reader.tafsir.coverage', { from: formatNumber(coverage.from, locale), to: formatNumber(coverage.to, locale) });

  return (
    <View style={{ flex: 1 }} testID={testID}>
      <ScrollView contentContainerStyle={{ gap: theme.size.sheetGap, paddingBottom: scrollBottom }}>
        {picker}
        <Card
          accessibilityLabel={ayahLabel}
          accessible={ayahLabel !== undefined}
          radius="card"
          style={{ paddingVertical: theme.space[3] }}
          testID={`${testID}-ayah`}
          tone="page"
        >
          <QuranText fontScale={fontScale} testID={`${testID}-ayah-block`} variant="quranPanel">
            <Text testID={`${testID}-ayah-text`}>{textUthmani}</Text>
            {` ﴿${formatNumber(verseNumber, 'ar')}﴾`}
          </QuranText>
        </Card>
        {selected === null ? null : (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], justifyContent: 'space-between' }}>
            <UiText variant="caption" weight={600}>
              {selected.name}
            </UiText>
            {coverageLabel === null ? null : (
              <UiText testID={`${testID}-coverage`} tone="muted" {...credit}>
                {coverageLabel}
              </UiText>
            )}
          </View>
        )}
        <View style={{ gap: theme.size.bodyCreditGap }}>
          <View
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            style={direction === null ? undefined : { direction }}
            testID={`${testID}-body`}
          >
            {html === null ? (
              <UiText testID={`${testID}-no-entry`} tone="muted">
                {t('reader.tafsir.noEntry')}
              </UiText>
            ) : (
              <RenderHtml
                baseStyle={baseStyle}
                contentWidth={width ?? windowWidth}
                defaultTextProps={{ maxFontSizeMultiplier: maxFontScale.content }}
                source={{ html }}
                systemFonts={SYSTEM_FONTS}
                tagsStyles={TAGS_STYLES}
              />
            )}
          </View>
          {selected === null ? null : (
            <UiText testID={`${testID}-source`} tone="muted" {...credit}>
              {t('reader.tafsir.source', { author: selected.authorName ?? selected.name })}
            </UiText>
          )}
        </View>
      </ScrollView>
      {stepper}
    </View>
  );
}
