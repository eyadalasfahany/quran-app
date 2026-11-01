import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { UiText, Screen } from '@/shared/ui';
import { useDebouncedValue } from '@/features/search/hooks/useDebouncedValue';

import { AzkarRecentSearches } from '../components/AzkarRecentSearches';
import { AzkarSearchBar } from '../components/AzkarSearchBar';
import { AzkarSearchResultRow } from '../components/AzkarSearchResultRow';
import { AzkarSectionTitle } from '../components/AzkarSectionTitle';
import { AzkarTopicTile } from '../components/AzkarTopicTile';
import {
  addAzkarRecentSearch,
  clearAzkarRecentSearches,
  readAzkarRecentSearches,
  removeAzkarRecentSearch,
  useAzkarCategories,
  useAzkarSearch,
} from '../data';
import type { AzkarSearchHit } from '../data/search';
import { azkarHref, goBackOr } from '../routes';

const SEARCH_DEBOUNCE_MS = 150;

/** One row of the hit list: the «المداخل» heading, or one matching dhikr with its number. */
type HitRow = { kind: 'heading' } | { kind: 'hit'; hit: AzkarSearchHit; number: number };

/**
 * Azkar search (quran-app-screens.html, #AzkarSearch and #AzkarSearchEmpty). With no query it shows the recent
 * searches; with a query it lists the matching topics and dhikr. Matches are highlighted, never rewritten.
 *
 * The matching dhikr are a virtual list (FlashList, as in the search tab), so a long result set is not all mounted at
 * once. The topics, the recent searches and the hint sit above it in the list header.
 */
export function AzkarSearchScreen({ testID = 'screen-azkar-search' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readAzkarRecentSearches);
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const { entries, categoryIds } = useAzkarSearch(debounced);
  const categories = useAzkarCategories(locale);
  const hasQuery = query.trim().length > 0;

  const remember = (value: string) => setRecent(addAzkarRecentSearch(value));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const matchedCategories = categoryIds.map((id) => categoryById.get(id)).filter((category) => category !== undefined);
  const noResults = hasQuery && debounced.trim() === query.trim() && entries.length === 0 && matchedCategories.length === 0;

  const rows: HitRow[] =
    entries.length === 0
      ? []
      : [{ kind: 'heading' }, ...entries.map((hit, index) => ({ hit, kind: 'hit' as const, number: index + 1 }))];

  const header = (
    <View style={{ gap: theme.space[4], paddingBottom: entries.length > 0 ? theme.space[4] : 0 }}>
      {!hasQuery ? (
        <>
          <UiText tone="muted" variant="caption">
            {t('azkar.search.hint')}
          </UiText>
          <AzkarRecentSearches
            onClear={() => setRecent(clearAzkarRecentSearches())}
            onRemove={(value) => setRecent(removeAzkarRecentSearch(value))}
            onSelect={(value) => {
              setQuery(value);
              remember(value);
            }}
            queries={recent}
          />
        </>
      ) : null}

      {matchedCategories.length > 0 ? (
        <View style={{ gap: theme.space[3] }}>
          <AzkarSectionTitle title={t('azkar.search.chaptersHeading')} testID="azkar-search-chapters" />
          {matchedCategories.map((category) => (
            <AzkarTopicTile
              countText={t('azkar.browse.topicCount', {
                count: category.unitCount,
                number: formatNumber(category.unitCount, locale),
              })}
              key={category.id}
              onPress={() => {
                remember(query);
                router.push(azkarHref.category(category.id));
              }}
              testID={`azkar-search-category-${category.id}`}
              title={t(`azkar.categories.${category.id}` as never)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[5], paddingTop: theme.space[2] }}>
          <AzkarSearchBar
            onBack={() => goBackOr(azkarHref.home)}
            onChangeText={setQuery}
            onSubmit={(value) => {
              if (value.trim().length > 0) {
                remember(value);
              }
            }}
            value={query}
          />
          <FlashList
            ListEmptyComponent={
              noResults ? (
                <View style={{ paddingTop: theme.space[4] }}>
                  <UiText align="center" tone="muted" variant="subhead">
                    {t('azkar.search.noResults')}
                  </UiText>
                </View>
              ) : null
            }
            ListHeaderComponent={header}
            contentContainerStyle={{ paddingBottom: theme.space[8] }}
            data={rows}
            ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} />}
            keyExtractor={(row) => (row.kind === 'heading' ? 'heading' : row.hit.entryKey)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              item.kind === 'heading' ? (
                <AzkarSectionTitle title={t('azkar.search.entriesHeading')} testID="azkar-search-entries" />
              ) : (
                <AzkarSearchResultRow
                  highlight={item.hit.highlight}
                  number={item.number}
                  onPress={() => {
                    remember(query);
                    router.push(azkarHref.entry(item.hit.entryKey));
                  }}
                  preview={item.hit.preview}
                  testID={`azkar-search-result-${item.number}`}
                />
              )
            }
          />
        </View>
      </ContentColumn>
    </Screen>
  );
}
