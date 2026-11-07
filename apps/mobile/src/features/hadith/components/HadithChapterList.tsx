import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';

import { useTheme } from '@/core/theme';

import type { HadithBookOutlineItem, HadithChapter } from '../types';

import { ChapterRow } from './ChapterRow';
import { ChapterRunRow } from './ChapterRunRow';

/**
 * The outline of a chaptered book (ADR 0076, option B), in the order given, 12 apart: every chapter with `ChapterRow`,
 * and each run of chapterless hadith in place with `ChapterRunRow`.
 */
export function HadithChapterList({
  items,
  header,
  onOpenChapter,
  onOpenRun,
  testID = 'hadith-chapter-list',
}: {
  items: HadithBookOutlineItem[];
  header?: ReactElement;
  onOpenChapter: (chapter: HadithChapter) => void;
  onOpenRun: (run: { firstPosition: number; lastPosition: number }) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: theme.space[8] }}
      data={items}
      ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} testID={`${testID}-gap`} />}
      keyExtractor={(item) => (item.kind === 'chapter' ? `chapter-${item.chapter.id}` : `run-${item.firstPosition}`)}
      ListHeaderComponent={header}
      renderItem={({ item }) =>
        item.kind === 'chapter' ? (
          <ChapterRow
            chapter={item.chapter}
            onPress={() => onOpenChapter(item.chapter)}
            testID={`${testID}-item-${item.chapter.id}`}
          />
        ) : (
          <ChapterRunRow
            onPress={() => onOpenRun(item)}
            run={item}
            testID={`${testID}-run-${item.firstPosition}`}
          />
        )
      }
      testID={testID}
    />
  );
}
