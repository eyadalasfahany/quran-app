import { useTranslation } from 'react-i18next';
import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';

import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { bookTitle } from '../titles';
import type { HadithSearchResultHit } from '../data';

import { HadithSearchResultRow } from './HadithSearchResultRow';

// Half a screen from the end, the next page loads.
const END_THRESHOLD = 0.5;

/**
 * The search results: a count line («٣٢ نتيجة») as the first list header, then one card per hit, with a gap between
 * cards. Each card opens the reader. `onLoadMore` runs at the end only while `hasMore`.
 */
export function HadithSearchResults({
  hits,
  total,
  hasMore,
  onLoadMore,
  onOpen,
  bottomInset = 0,
  header,
  testID = 'hadith-search-results',
}: {
  hits: readonly HadithSearchResultHit[];
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpen: (hit: HadithSearchResultHit) => void;
  bottomInset?: number;
  header?: ReactElement;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const countText = t('hadith.search.resultCount', { count: total, n: formatNumber(total, locale) });

  return (
    <FlatList
      contentContainerStyle={{ paddingBottom: bottomInset }}
      data={[...hits]}
      ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} />}
      keyExtractor={(hit) => `${hit.item.resourceId}:${hit.item.id}`}
      ListHeaderComponent={
        <View style={{ gap: theme.space[3], paddingBottom: theme.space[3] }}>
          <UiText
            accessibilityLiveRegion="polite"
            testID={`${testID}-count`}
            tone="muted"
            variant="caption"
            weight={600}
          >
            {countText}
          </UiText>
          {header}
        </View>
      }
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={END_THRESHOLD}
      renderItem={({ item }) => (
        <HadithSearchResultRow
          bookTitleText={bookTitle(item.book, locale, t)}
          hit={item}
          onPress={() => onOpen(item)}
          testID={`${testID}-item-${item.item.resourceId}-${item.item.id}`}
        />
      )}
      testID={testID}
    />
  );
}
