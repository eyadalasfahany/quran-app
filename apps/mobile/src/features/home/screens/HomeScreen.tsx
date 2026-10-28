import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { SectionScreen } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { ContinueReadingCard } from '@/features/home/components/ContinueReadingCard';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { SearchButton } from '@/shared/ui';

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ready } = useContentDb();
  const lastReadVerseKey = useLastReadVerseKey();

  const continueReading = useMemo(() => {
    if (!ready) {
      return undefined;
    }
    try {
      const executor = openContentDb().executor;
      const verse = getVerseByKey(executor, lastReadVerseKey);
      const chapter = verse === undefined ? undefined : getChapter(executor, verse.chapterId);
      if (verse === undefined || chapter === undefined) {
        return undefined;
      }
      return { chapter, verse };
    } catch {
      return undefined;
    }
  }, [lastReadVerseKey, ready]);

  return (
    <SectionScreen gutter={theme.size.gutterHome} testID="screen-home" title={t('home.greeting')} trailing={<SearchButton testID="home-search" />}>
      {continueReading ? (
        <ContinueReadingCard
          ayah={continueReading.verse.verseNumber}
          juz={continueReading.verse.juz}
          onPress={() => router.push(`/read/${continueReading.verse.verseKey}` as Href)}
          page={continueReading.verse.page}
          surahName={continueReading.chapter.nameArabic}
        />
      ) : null}
    </SectionScreen>
  );
}
