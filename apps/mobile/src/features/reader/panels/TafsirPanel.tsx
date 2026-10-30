import RenderHtml, { type MixedStyleRecord } from '@native-html/render';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { uiFontFamilies, useTheme } from '@/core/theme';
import { Card, Chip, EmptyState, maxFontScale, QuranText, SkeletonGroup, UiText } from '@/shared/ui';

import { SheetScrollView } from '../components/SheetScrollView';
import { TafsirTextSkeleton } from './TafsirTextSkeleton';
import { AyahStepper } from './AyahStepper';
import { TafsirDownloadList, type TafsirDownloadItem } from './TafsirDownloadList';
import { tafsirAuthorName, tafsirDisplayName, type TextDirection } from './panel-text';

const EMPTY_ICON = { ios: 'book.closed', android: 'menu_book' } as const;
const SYSTEM_FONTS = Object.values(uiFontFamilies);
// Bold picks the bold face; a fontWeight on top would fake-bold it on Android.
const TAGS_STYLES: MixedStyleRecord = {
  b: { fontFamily: uiFontFamilies[700], fontWeight: 'normal' },
  strong: { fontFamily: uiFontFamilies[700], fontWeight: 'normal' },
};

export type TafsirOption = {
  resourceId: number;
  name: string | null;
  nameAr: string | null;
  authorName: string | null;
  authorAr: string | null;
  direction?: TextDirection | null;
};

// 'sheet' is the phone sheet: a horizontal row of tafsirs and a floating previous and next bar.
// 'panel' is the side panel: the tafsirs wrap and the previous and next buttons sit at its foot.
export type TafsirPanelLayout = 'sheet' | 'panel';

/**
 * list: nothing readable yet, so the download list only. reading: the passage, with the selected tafsir's
 * download row in its place when it isn't readable. offline: no catalogue and nothing installed.
 */
export type TafsirPanelMode = 'list' | 'reading' | 'offline';

export function TafsirPanel({
  tafsirs,
  selectedId,
  onSelect,
  verseNumber,
  textUthmani,
  ayahLabel,
  html,
  loading = false,
  coverage,
  fontScale = 1,
  onPrevious,
  onNext,
  mode,
  downloadItems,
  selectedDownload,
  onDownloadTafsir,
  onCancelDownload,
  onOpenTafsir,
  onRetry,
  layout = 'panel',
  testID = 'tafsir-panel',
}: {
  /** Every catalogue tafsir, installed or not, for the chip row. */
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
  /** The selected tafsir is downloading: the passage place shows placeholder lines, not the html or the missing message. */
  loading?: boolean;
  // Ayah numbers the passage spans, when it covers more than this ayah.
  coverage: { from: number; to: number } | null;
  fontScale?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  mode: TafsirPanelMode;
  /** Every catalogue tafsir as a download row, shown in list mode. */
  downloadItems: TafsirDownloadItem[];
  /** The selected tafsir's row when it isn't readable; it replaces the passage. */
  selectedDownload: TafsirDownloadItem | null;
  onDownloadTafsir: (resourceId: number) => void;
  onCancelDownload: (resourceId: number) => void;
  onOpenTafsir: (resourceId: number) => void;
  onRetry: () => void;
  layout?: TafsirPanelLayout;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const displayName = (tafsir: TafsirOption): string =>
    tafsirDisplayName(tafsir, locale, t('reader.tafsir.fallbackName', { id: tafsir.resourceId }));
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

  if (mode === 'list') {
    return (
      <View style={{ flex: 1 }} testID={testID}>
        <SheetScrollView contentContainerStyle={{ gap: theme.size.sheetGap, paddingBottom: scrollBottom }}>
          <TafsirDownloadList
            items={downloadItems}
            onCancel={onCancelDownload}
            onDownload={onDownloadTafsir}
            onOpen={onOpenTafsir}
            testID={`${testID}-downloads`}
          />
        </SheetScrollView>
      </View>
    );
  }

  if (mode === 'offline') {
    return (
      <View style={{ flex: 1 }} testID={testID}>
        <SheetScrollView contentContainerStyle={{ gap: theme.size.sheetGap, paddingBottom: scrollBottom, paddingVertical: theme.space[6] }}>
          <EmptyState
            action={{ label: t('reader.tafsir.retry'), onPress: onRetry }}
            body={t('reader.tafsir.emptyBody')}
            icon={EMPTY_ICON}
            testID={`${testID}-empty`}
            title={t('reader.tafsir.emptyTitle')}
          />
        </SheetScrollView>
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
      key={tafsir.resourceId}
      label={displayName(tafsir)}
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

  // While the tafsir downloads, the passage place shows placeholder lines; otherwise the passage, or the missing message.
  const passage = loading ? (
    <SkeletonGroup testID={`${testID}-loading`}>
      <TafsirTextSkeleton testID={`${testID}-skeleton`} />
    </SkeletonGroup>
  ) : html === null ? (
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
  );

  return (
    <View style={{ flex: 1 }} testID={testID}>
      <SheetScrollView contentContainerStyle={{ gap: theme.size.sheetGap, paddingBottom: scrollBottom }}>
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
        {selectedDownload === null ? null : (
          <TafsirDownloadList
            items={[selectedDownload]}
            onCancel={onCancelDownload}
            onDownload={onDownloadTafsir}
            onOpen={onOpenTafsir}
            showIntro={false}
            testID={`${testID}-download`}
          />
        )}
        {selectedDownload !== null || selected === null ? null : (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2], justifyContent: 'space-between' }}>
            <UiText testID={`${testID}-name`} variant="caption" weight={600}>
              {displayName(selected)}
            </UiText>
            {coverageLabel === null ? null : (
              <UiText testID={`${testID}-coverage`} tone="muted" {...credit}>
                {coverageLabel}
              </UiText>
            )}
          </View>
        )}
        {selectedDownload === null ? (
          <View style={{ gap: theme.size.bodyCreditGap }}>
            <View
              onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
              style={direction === null ? undefined : { direction }}
              testID={`${testID}-body`}
            >
              {passage}
            </View>
            {selected === null ? null : (
              <UiText testID={`${testID}-source`} tone="muted" {...credit}>
                {t('reader.tafsir.source', { author: tafsirAuthorName(selected, locale) ?? displayName(selected) })}
              </UiText>
            )}
          </View>
        ) : null}
      </SheetScrollView>
      {stepper}
    </View>
  );
}
