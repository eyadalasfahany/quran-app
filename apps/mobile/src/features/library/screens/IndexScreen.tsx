import { FlashList } from '@shopify/flash-list';
import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { ContinueReadingRow } from '@/features/library/components/ContinueReadingRow';
import { IndexSegment, type IndexSegmentKey } from '@/features/library/components/IndexSegment';
import { JuzRow } from '@/features/library/components/JuzRow';
import { SurahRow } from '@/features/library/components/SurahRow';
import { listJuzStarts } from '@/features/library/data/juz';
import { getChapter, listChapters, type ChapterRecord } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { useReadingAnchor } from '@/features/reader/anchor/useReadingAnchor';
import { uiTextProps } from '@/shared/ui';

type ContinueReading = {
  verseKey: string;
  chapter: ChapterRecord;
  ayah: number;
};

type IndexItem = { kind: 'surah'; chapter: ChapterRecord } | { kind: 'juz'; juz: number; verseKey: string };

function readHref(verseKey: string): Href {
  return `/read/${verseKey}` as Href;
}

export function IndexScreen({ testID = 'screen-index' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready } = useContentDb();
  const anchor = useReadingAnchor();
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
    const verse = getVerseByKey(executor, anchor.verseKey);
    const chapter = verse === undefined ? undefined : getChapter(executor, verse.chapterId);
    if (verse !== undefined && chapter !== undefined) {
      continueReading = { verseKey: verse.verseKey, chapter, ayah: verse.verseNumber };
    }

    const rows: IndexItem[] =
      segment === 'surahs'
        ? chapters.map((chapter) => ({ kind: 'surah' as const, chapter }))
        : juzStarts.map((entry) => ({ kind: 'juz' as const, juz: entry.juz, verseKey: entry.verseKey }));

    return { continueReading, rows };
  }, [anchor.verseKey, ready, segment]);

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
      verseKey={continueReading.verseKey}
    />
  ) : null;

  return (
    <View
      style={{ backgroundColor: theme.colors.surface, flex: 1, paddingTop: insets.top }}
      testID={testID}
    >
      <ContentColumn>
        <View style={{ gap: theme.space[3], paddingBottom: theme.space[2], paddingTop: theme.space[4] }}>
          <Text {...uiTextProps('title')} style={[theme.text.title, { color: theme.colors.ink }]}>
            {t('library.index.title')}
          </Text>
          <IndexSegment onChange={setSegment} testID="index-segment" value={segment} />
        </View>
        <View style={{ flex: 1, minHeight: 200 }}>
          <FlashList
            data={rows}
            keyExtractor={keyExtractor}
            ListHeaderComponent={header}
            renderItem={renderItem}
            testID="index-list"
          />
        </View>
      </ContentColumn>
    </View>
  );
}
