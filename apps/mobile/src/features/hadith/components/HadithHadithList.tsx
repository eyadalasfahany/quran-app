import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { hadithNumberText } from '../number-text';
import { isUnavailableHadith } from '../source-credit';
import type { HadithListItem } from '../types';

import { HadithCard } from './HadithCard';
import { HadithUnavailableCard } from './HadithUnavailableCard';

// Half a screen from the end, the next page loads.
const END_THRESHOLD = 0.5;

/** The paged hadith cards of a book, a chapter or a single-book collection. Each card opens the reader. */
export function HadithHadithList({
  items,
  hasMore,
  onLoadMore,
  onOpen,
  savedNumbers,
  header,
  bottomInset = 0,
  testID = 'hadith-hadith-list',
}: {
  items: HadithListItem[];
  hasMore: boolean;
  onLoadMore: () => void;
  onOpen: (item: HadithListItem) => void;
  savedNumbers?: ReadonlySet<string>;
  header?: ReactElement;
  bottomInset?: number;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: bottomInset }}
      data={items}
      ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} testID={`${testID}-gap`} />}
      keyExtractor={(item) => `${item.id}`}
      ListHeaderComponent={header}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={END_THRESHOLD}
      renderItem={({ item }) =>
        isUnavailableHadith(item.sourceCode) ? (
          <HadithUnavailableCard
            hadithNumber={hadithNumberText(item)}
            onPress={() => onOpen(item)}
            testID={`${testID}-item-${item.id}`}
          />
        ) : (
          <HadithCard
            item={{ hadithNumber: hadithNumberText(item), textAr: item.textAr }}
            onPress={() => onOpen(item)}
            saved={savedNumbers?.has(item.hadithNumber) ?? false}
            testID={`${testID}-item-${item.id}`}
          />
        )
      }
      testID={testID}
    />
  );
}
