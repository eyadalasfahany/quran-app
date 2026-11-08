import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';

import { useTheme } from '@/core/theme';

import type { HadithBook } from '../types';

import { BookRow } from './BookRow';

/** The books of a multi-book collection, one row each, 12 apart. The header sits above the rows. */
export function HadithBookList({
  books,
  header,
  compact = false,
  selectedBookId,
  onOpen,
  testID = 'hadith-book-list',
}: {
  books: HadithBook[];
  header?: ReactElement;
  compact?: boolean;
  selectedBookId?: number;
  onOpen: (book: HadithBook) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: theme.space[8] }}
      data={books}
      ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} testID={`${testID}-gap`} />}
      keyExtractor={(book) => `${book.id}`}
      ListHeaderComponent={header === undefined ? undefined : <View style={{ paddingBottom: theme.space[4] }}>{header}</View>}
      renderItem={({ item }) => (
        <BookRow
          book={item}
          compact={compact}
          onPress={() => onOpen(item)}
          selected={item.id === selectedBookId}
          testID={`${testID}-item-${item.id}`}
        />
      )}
      testID={testID}
    />
  );
}
