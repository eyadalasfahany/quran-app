import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { EmptyState, Screen } from '@/shared/ui';
import { AzkarListCard } from '@/features/azkar/components/AzkarListCard';
import { AzkarScreenHeader } from '@/features/azkar/components/AzkarScreenHeader';
import { getChapter } from '@/features/reader/data/chapters';
import { openContentDb } from '@/core/db/content/open';

import { DuasSourceRow } from '../components/DuasSourceRow';
import { useQuranicDuasList } from '../data/hooks';
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

/** Quranic duas in Mushaf order (quran-app-screens.html, list companion to #DuaQuranDetail). */
export function DuaQuranListScreen({ testID = 'screen-dua-quran-list' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const items = useQuranicDuasList();

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <AzkarScreenHeader
          onBack={() => goBackOr(duasHref.home)}
          title={t('duas.quran.listTitle')}
        />
        {items.length === 0 ? (
          <EmptyState body={t('duas.quran.emptyBody')} testID="dua-quran-list-empty" title={t('duas.quran.emptyTitle')} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: theme.space[8] }}>
            <AzkarListCard>
              {items.map((item, index) => {
                const range =
                  item.verseTo !== null && item.verseTo !== item.verseFrom
                    ? t('duas.quran.ayahRange', {
                        from: formatNumber(item.verseFrom, locale),
                        to: formatNumber(item.verseTo, locale),
                      })
                    : t('duas.quran.ayahSingle', { ayah: formatNumber(item.verseFrom, locale) });

                return (
                  <DuasSourceRow
                    detail={`${surahLabel(item.surah, locale)} · ${range}`}
                    key={item.duaKey}
                    onPress={() => router.push(duasHref.quranDetail(item.duaKey))}
                    separator={index < items.length - 1}
                    testID={`dua-quran-row-${item.duaKey}`}
                    title={t('duas.quran.rowTitle', {
                      index: formatNumber(item.position, locale),
                      surah: surahLabel(item.surah, locale),
                    })}
                  />
                );
              })}
            </AzkarListCard>
          </ScrollView>
        )}
      </ContentColumn>
    </Screen>
  );
}
