import RenderHtml, { type MixedStyleRecord } from '@native-html/render';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { uiFontFamilies, useTheme } from '@/core/theme';
import { Button, Card, Chip, EmptyState, maxFontScale, QuranText, UiText } from '@/shared/ui';

import type { TextDirection } from './panel-text';

const PREVIOUS = { ios: 'chevron.backward', android: 'chevron_left' } as const;
const NEXT = { ios: 'chevron.forward', android: 'chevron_right' } as const;
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

  const navigation = (
    <View style={{ flexDirection: 'row', gap: theme.space[2], justifyContent: 'space-between' }}>
      <Button
        disabled={!onPrevious}
        icon={PREVIOUS}
        label={t('reader.tafsir.previous')}
        mirrorIconInRtl
        onPress={() => onPrevious?.()}
        testID={`${testID}-previous`}
      />
      <Button
        disabled={!onNext}
        icon={NEXT}
        label={t('reader.tafsir.next')}
        mirrorIconInRtl
        onPress={() => onNext?.()}
        testID={`${testID}-next`}
      />
    </View>
  );

  if (tafsirs.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ gap: theme.space[6], paddingVertical: theme.space[6] }} testID={testID}>
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
        {navigation}
      </ScrollView>
    );
  }

  const source = selected?.authorName ?? selected?.name ?? '';

  return (
    <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[6] }} testID={testID}>
      <View
        accessibilityLabel={t('reader.tafsir.pickerLabel')}
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}
      >
        {tafsirs.map((tafsir) => (
          <Chip
            caption={tafsir.lengthTag ?? undefined}
            key={tafsir.resourceId}
            label={tafsir.name}
            onPress={() => onSelect(tafsir.resourceId)}
            role="radio"
            selected={tafsir.resourceId === selectedId}
            testID={`${testID}-option-${tafsir.resourceId}`}
          />
        ))}
      </View>
      <Card accessibilityLabel={ayahLabel} accessible={ayahLabel !== undefined} testID={`${testID}-ayah`}>
        <QuranText fontScale={fontScale} testID={`${testID}-ayah-block`} variant="quranReading">
          <Text testID={`${testID}-ayah-text`}>{textUthmani}</Text>
          {` ﴿${formatNumber(verseNumber, 'ar')}﴾`}
        </QuranText>
      </Card>
      {selected === null ? null : (
        <View style={{ gap: 2 }}>
          <UiText variant="headline">{selected.name}</UiText>
          {coverage === null ? null : (
            <UiText testID={`${testID}-coverage`} tone="muted" variant="caption">
              {t('reader.tafsir.coverage', { from: formatNumber(coverage.from, locale), to: formatNumber(coverage.to, locale) })}
            </UiText>
          )}
        </View>
      )}
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
        <UiText testID={`${testID}-source`} tone="muted" variant="caption">
          {t('reader.tafsir.source', { author: source })}
        </UiText>
      )}
      {navigation}
    </ScrollView>
  );
}
