import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { destinations, type Destination, SectionScreen, useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { ContinueReadingCard } from '@/features/home/components/ContinueReadingCard';
import { HomeTileRow } from '@/features/home/components/HomeTileRow';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { SearchButton, type IconName } from '@/shared/ui';

// Home's tiles open the tabs they name. Only shipped features get a tile (ADR 0017).
function tabHref(name: Destination['name']): Href {
  const destination = destinations.find((item) => item.name === name);
  if (destination === undefined) {
    throw new Error(`Unknown tab ${name}`);
  }
  return destination.href;
}

const SURAHS_ICON: IconName = { ios: 'list.bullet', android: 'format_list_bulleted' };
const SAVED_ICON: IconName = { ios: 'bookmark', android: 'bookmark' };

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ready } = useContentDb();
  const lastReadVerseKey = useLastReadVerseKey();
  // Expanded windows keep search in the sidebar (MainShell), so the header drops its button there.
  const expanded = useWindowClass() === 'expanded';

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
    <SectionScreen gutter={theme.size.gutterHome} testID="screen-home" title={t('home.greeting')} trailing={expanded ? undefined : <SearchButton onPress={() => router.push('/search')} testID="home-search" />}>
      {continueReading ? (
        <ContinueReadingCard
          ayah={continueReading.verse.verseNumber}
          juz={continueReading.verse.juz}
          onPress={() => router.push(`/read/${continueReading.verse.verseKey}` as Href)}
          page={continueReading.verse.page}
          surahName={continueReading.chapter.nameArabic}
        />
      ) : null}
      <HomeTileRow
        tiles={[
          { icon: SURAHS_ICON, key: 'surahs', label: t('home.tiles.surahs'), onPress: () => router.navigate(tabHref('(mushaf)')) },
          { icon: SAVED_ICON, key: 'saved', label: t('home.tiles.saved'), onPress: () => router.navigate(tabHref('(my-quran)')) },
        ]}
      />
    </SectionScreen>
  );
}
