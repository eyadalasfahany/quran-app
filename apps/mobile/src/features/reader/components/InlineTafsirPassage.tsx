import RenderHtml, { type MixedStyleRecord } from '@native-html/render';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, useWindowDimensions, type TextStyle } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber, type Locale } from '@/core/i18n';
import { uiFontFamilies, useTheme } from '@/core/theme';
import { maxFontScale, UiText } from '@/shared/ui';

import type { VerseRecord } from '../data/verses';
import { loadTafsirOptions, loadTafsirPassage } from '../panels/panel-data';
import { tafsirAuthorName, tafsirDisplayName, textDirection } from '../panels/panel-text';
import { QURAN_QUOTE_CLASS, wrapQuranQuotes } from '../panels/tafsir-quotes';

const PASSAGE_LINE_HEIGHT_RATIO = 1.75;
/** Inline tafsir body height in Reading mode (developer, 1 Nov 2026). */
const INLINE_TAFSIR_VIEWPORT_RATIO = 0.5;
const SYSTEM_FONTS = Object.values(uiFontFamilies);
const TAGS_STYLES: MixedStyleRecord = {
  b: { fontFamily: uiFontFamilies[700], fontWeight: 'normal' },
  strong: { fontFamily: uiFontFamilies[700], fontWeight: 'normal' },
};

export function InlineTafsirPassage({
  executor,
  verse,
  resourceId,
  fontScale = 1,
  testID = 'inline-tafsir-passage',
}: {
  executor: SqlExecutor;
  verse: VerseRecord;
  resourceId: number | null;
  fontScale?: number;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollHeight = windowHeight * INLINE_TAFSIR_VIEWPORT_RATIO;
  const [width, setWidth] = useState<number | null>(null);

  const tafsirOption = useMemo(() => {
    if (resourceId === null) {
      return null;
    }
    return loadTafsirOptions(executor).find((row) => row.resourceId === resourceId) ?? null;
  }, [executor, resourceId]);

  const passage = useMemo(() => {
    if (resourceId === null) {
      return null;
    }
    return loadTafsirPassage(executor, resourceId, verse);
  }, [executor, resourceId, verse]);

  const html = passage?.html ?? null;
  const coverage = passage?.coverage ?? null;

  const direction = useMemo(() => {
    const fallback = tafsirOption?.direction ?? 'rtl';
    if (html === null) {
      return fallback;
    }
    return textDirection(html.replace(/<[^>]+>/g, ' '), fallback);
  }, [html, tafsirOption?.direction]);

  const passageHtml = useMemo(() => (html === null ? null : wrapQuranQuotes(html)), [html]);

  const body: TextStyle = theme.text.body ?? {};
  const fontSize = (body.fontSize ?? 17) * fontScale * 0.92;
  const baseStyle = {
    color: theme.colors.inkMuted,
    fontFamily: uiFontFamilies[400],
    fontSize,
    lineHeight: Math.round(fontSize * PASSAGE_LINE_HEIGHT_RATIO),
    textAlign: 'auto' as const,
    writingDirection: direction,
  };
  const classesStyles: MixedStyleRecord = {
    [QURAN_QUOTE_CLASS]: { color: theme.colors.gold },
  };

  if (resourceId === null) {
    return (
      <View accessibilityRole="text" testID={testID}>
        <UiText tone="muted" variant="caption">
          {t('reader.inlineTafsir.noTafsirSelected')}
        </UiText>
      </View>
    );
  }

  const displayName =
    tafsirOption === null
      ? t('reader.tafsir.fallbackName', { id: resourceId })
      : tafsirDisplayName(tafsirOption, locale, t('reader.tafsir.fallbackName', { id: resourceId }));

  const coverageLabel =
    html === null
      ? null
      : coverage === null
        ? t('reader.tafsir.coverageOne', { ayah: formatNumber(verse.verseNumber, locale) })
        : t('reader.tafsir.coverage', { from: formatNumber(coverage.from, locale), to: formatNumber(coverage.to, locale) });

  return (
    <View
      accessibilityLabel={t('reader.ayahPanel.tafsir')}
      accessibilityRole="text"
      style={{ gap: theme.space[2], paddingTop: theme.space[2] }}
      testID={testID}
    >
      {coverageLabel === null ? null : (
        <UiText testID={`${testID}-coverage`} tone="muted" variant="caption">
          {coverageLabel}
        </UiText>
      )}
      <ScrollView
        accessibilityLabel={t('reader.ayahPanel.tafsir')}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={{ height: scrollHeight }}
        testID={`${testID}-scroll`}
      >
        <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ direction }}>
          {html === null ? (
            <UiText testID={`${testID}-no-entry`} tone="muted" variant="caption">
              {t('reader.tafsir.noEntry')}
            </UiText>
          ) : (
            <RenderHtml
              baseStyle={baseStyle}
              classesStyles={classesStyles}
              contentWidth={width ?? windowWidth}
              defaultTextProps={{ maxFontSizeMultiplier: maxFontScale.content }}
              source={{ html: passageHtml ?? '' }}
              systemFonts={SYSTEM_FONTS}
              tagsStyles={TAGS_STYLES}
            />
          )}
        </View>
      </ScrollView>
      {tafsirOption === null ? null : (
        <UiText testID={`${testID}-source`} tone="muted" variant="label">
          {t('reader.tafsir.source', { author: tafsirAuthorName(tafsirOption, locale) ?? displayName })}
        </UiText>
      )}
    </View>
  );
}
