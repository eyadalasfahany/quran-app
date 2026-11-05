import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, Screen } from '@/shared/ui';
import { AzkarListCard } from '@/features/azkar/components/AzkarListCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { AzkarSectionTitle } from '@/features/azkar/components/AzkarSectionTitle';
import { getChapter } from '@/features/reader/data/chapters';

import { DuaQuranListRow } from '../components/DuaQuranListRow';
import { getQuranicDuaVerses } from '../data/content-repository';
import { useQuranicDuasList } from '../data/hooks';
import type { QuranicDuaSummary } from '../data/model';
import { duasHref, goBackOr } from '../routes';

function surahLabel(surah: number, locale: 'ar' | 'en'): string {
  try {
    const { executor } = openContentDb();
    const chapter = getChapter(executor, surah);
    if (chapter === undefined) {
      return String(surah);
    }
    return locale === 'ar' ? chapter.nameArabic : chapter.nameSimple;
  } catch {
    return String(surah);
  }
}

function ayahRangeLabel(item: QuranicDuaSummary, locale: 'ar' | 'en', translate: TFunction): string {
  if (item.verseTo !== null && item.verseTo !== item.verseFrom) {
    return translate('duas.quran.ayahRange', {
      from: formatNumber(item.verseFrom, locale),
      to: formatNumber(item.verseTo, locale),
    });
  }
  return translate('duas.quran.ayahSingle', { ayah: formatNumber(item.verseFrom, locale) });
}

/** The verse text of a dua, verses joined with one space. Empty when the verses are missing from `verses`. */
function readVerseText(item: QuranicDuaSummary): string {
  try {
    const { executor } = openContentDb();
    return getQuranicDuaVerses(executor, item)
      .map((verse) => verse.textUthmani)
      .join(' ');
  } catch {
    return '';
  }
}

/**
 * Quranic duas grouped by surah (quran-app-screens.html, list companion to #DuaQuranDetail). Each row shows its full verse
 * text. A dua whose verses are missing is left out, so no row is ever blank.
 */
export function DuaQuranListScreen({ testID = 'screen-dua-quran-list' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const items = useQuranicDuasList();
  const sections = useMemo(() => {
    const bySurah = new Map<number, { item: QuranicDuaSummary; text: string }[]>();
    for (const item of items) {
      const text = readVerseText(item);
      if (text.length === 0) {
        continue;
      }
      const group = bySurah.get(item.surah) ?? [];
      group.push({ item, text });
      bySurah.set(item.surah, group);
    }
    return [...bySurah.entries()]
      .sort(([a], [b]) => a - b)
      .map(([surah, rows]) => ({ surah, rows }));
  }, [items]);

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.size.sectionGap, paddingTop: theme.space[2] }}>
          <AzkarScreenHeader
            onBack={() => goBackOr(duasHref.home)}
            title={t('duas.quran.listTitle')}
          />
          {items.length === 0 ? (
            <EmptyState body={t('duas.quran.emptyBody')} testID="dua-quran-list-empty" title={t('duas.quran.emptyTitle')} />
          ) : (
            <ScrollView contentContainerStyle={{ gap: theme.size.sectionGap, paddingBottom: theme.space[8] }}>
            {sections.map((section) => {
              const surahName = surahLabel(section.surah, locale);
              return (
                <View key={section.surah} style={{ gap: theme.space[3] }}>
                  <AzkarSectionTitle testID={`dua-quran-surah-${section.surah}`} title={surahName} />
                  <AzkarListCard>
                    {section.rows.map((row, index) => (
                      <DuaQuranListRow
                        ayahLabel={ayahRangeLabel(row.item, locale, t)}
                        key={row.item.duaKey}
                        onPress={() => router.push(duasHref.quranDetail(row.item.duaKey))}
                        separator={index < section.rows.length - 1}
                        surahName={surahName}
                        testID={`dua-quran-row-${row.item.duaKey}`}
                        text={row.text}
                      />
                    ))}
                  </AzkarListCard>
                </View>
              );
            })}
            </ScrollView>
          )}
        </View>
      </ContentColumn>
    </Screen>
  );
}
