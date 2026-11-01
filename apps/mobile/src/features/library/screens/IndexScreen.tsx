import { FlashList } from '@shopify/flash-list';
import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { ContentColumn, useTabContentBottom } from '@/core/layout';
import { ContinueReadingRow } from '@/features/library/components/ContinueReadingRow';
import { IndexSegment, type IndexSegmentKey } from '@/features/library/components/IndexSegment';
import { JuzRow } from '@/features/library/components/JuzRow';
import { SurahRow } from '@/features/library/components/SurahRow';
import { SurahRowSkeleton } from '@/features/library/components/SurahRowSkeleton';
import { listJuzStarts } from '@/features/library/data/juz';
import { getChapter, listChapters, type ChapterRecord } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { useTheme } from '@/core/theme';
import { Screen, ScreenHeader, SearchButton, SkeletonGroup } from '@/shared/ui';

type ContinueReading = {
  verseKey: string;
  chapter: ChapterRecord;
  ayah: number;
};

type IndexItem = { kind: 'surah'; chapter: ChapterRecord } | { kind: 'juz'; juz: number; verseKey: string };

// While the content database opens, the list holds ten surah rows, each with its own name length.
const SKELETON_NAME_WIDTHS = ['34%', '28%', '40%', '30%', '24%', '36%', '32%', '26%', '38%', '30%'] as const;

function readHref(verseKey: string): Href {
  return `/read/${verseKey}` as Href;
}

export function IndexScreen({ testID = 'screen-index' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ready } = useContentDb();
  const lastReadVerseKey = useLastReadVerseKey();
  const bottom = useTabContentBottom();
  const [segment, setSegment] = useState<IndexSegmentKey>('surahs');

  const { continueReading, rows } = useMemo(() => {
    if (!ready) {
      return { continueReading: undefined, rows: [] as IndexItem[] };
    }
    let executor;
    try {
      executor = openContentDb().executor;
    } catch {
      return { continueReading: undefined, rows: [] as IndexItem[] };
    }
    const chapters = listChapters(executor);
    const juzStarts = listJuzStarts(executor);

    let continueReading: ContinueReading | undefined;
    const verse = getVerseByKey(executor, lastReadVerseKey);
    const chapter = verse === undefined ? undefined : getChapter(executor, verse.chapterId);
    if (verse !== undefined && chapter !== undefined) {
      continueReading = { verseKey: verse.verseKey, chapter, ayah: verse.verseNumber };
    }

    const rows: IndexItem[] =
      segment === 'surahs'
        ? chapters.map((chapter) => ({ kind: 'surah' as const, chapter }))
        : juzStarts.map((entry) => ({ kind: 'juz' as const, juz: entry.juz, verseKey: entry.verseKey }));

    return { continueReading, rows };
  }, [lastReadVerseKey, ready, segment]);

  const openVerse = useCallback((verseKey: string) => {
    router.push(readHref(verseKey));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: IndexItem }) => {
      if (item.kind === 'surah') {
        return (
          <SurahRow
            chapter={item.chapter}
            onPress={() => openVerse(`${item.chapter.id}:1`)}
            separator="line"
            testID={`surah-row-${item.chapter.id}`}
          />
        );
      }
      return (
        <JuzRow
          juz={{ juz: item.juz, verseKey: item.verseKey }}
          onPress={() => openVerse(item.verseKey)}
          separator="line"
          testID={`juz-row-${item.juz}`}
        />
      );
    },
    [openVerse],
  );

  const keyExtractor = useCallback((item: IndexItem) => {
    return item.kind === 'surah' ? `surah-${item.chapter.id}` : `juz-${item.juz}`;
  }, []);

  const header = continueReading ? (
    <ContinueReadingRow
      ayah={continueReading.ayah}
      chapter={continueReading.chapter}
      onPress={() => openVerse(continueReading.verseKey)}
    />
  ) : null;

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterList}>
        <ScreenHeader title={t('library.index.title')} trailing={<SearchButton onPress={() => router.push('/search')} testID="index-search" />}>
          <IndexSegment onChange={setSegment} testID="index-segment" value={segment} />
        </ScreenHeader>
        <View style={{ flex: 1, marginTop: theme.size.blockGap, minHeight: 200 }}>
          <FlashList
            contentContainerStyle={{ paddingBottom: bottom }}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            data={rows}
            keyExtractor={keyExtractor}
            ListEmptyComponent={
              ready ? undefined : (
                <SkeletonGroup testID="index-loading">
                  {SKELETON_NAME_WIDTHS.map((width, index) => (
                    <SurahRowSkeleton key={`${width}-${index}`} nameWidth={width} />
                  ))}
                </SkeletonGroup>
              )
            }
            ListHeaderComponent={header}
            renderItem={renderItem}
            testID="index-list"
          />
        </View>
      </ContentColumn>
    </Screen>
  );
}
