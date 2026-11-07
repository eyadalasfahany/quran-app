import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';

import { useTheme } from '@/core/theme';

import type { HadithChapter } from '../types';

import { ChapterRow } from './ChapterRow';

/** The chapters of a chaptered book, in the order given, 12 apart. */
export function HadithChapterList({
  chapters,
  header,
  onOpen,
  testID = 'hadith-chapter-list',
}: {
  chapters: HadithChapter[];
  header?: ReactElement;
  onOpen: (chapter: HadithChapter) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: theme.space[8] }}
      data={chapters}
      ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} testID={`${testID}-gap`} />}
      keyExtractor={(chapter) => `${chapter.id}`}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <ChapterRow chapter={item} onPress={() => onOpen(item)} testID={`${testID}-item-${item.id}`} />
      )}
      testID={testID}
    />
  );
}
