import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { SectionScreen } from '@/core/layout';
import { ContinueReadingCard } from '@/features/home/components/ContinueReadingCard';
import { useReadingAnchor } from '@/features/reader/anchor/useReadingAnchor';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';

export function HomeScreen() {
  const { t } = useTranslation();
  const { ready } = useContentDb();
  const anchor = useReadingAnchor();

  const continueReading = useMemo(() => {
    if (!ready) {
      return undefined;
    }
    try {
      const executor = openContentDb().executor;
      const verse = getVerseByKey(executor, anchor.verseKey);
      const chapter = verse === undefined ? undefined : getChapter(executor, verse.chapterId);
      if (verse === undefined || chapter === undefined) {
        return undefined;
      }
      return { chapter, verse };
    } catch {
      return undefined;
    }
  }, [anchor.verseKey, ready]);

  return (
    <SectionScreen testID="screen-home" title={t('tabs.home')}>
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
