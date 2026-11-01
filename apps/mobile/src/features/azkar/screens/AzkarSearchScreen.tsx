import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

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
import { azkarHref, goBackOr } from '../routes';

const SEARCH_DEBOUNCE_MS = 150;

/**
 * Azkar search (quran-app-screens.html, #AzkarSearch and #AzkarSearchEmpty). With no query it shows the recent
 * searches; with a query it lists the matching topics and dhikr. Matches are highlighted, never rewritten.
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
          <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[8] }} keyboardShouldPersistTaps="handled">
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

            {entries.length > 0 ? (
              <View style={{ gap: theme.space[3] }}>
                <AzkarSectionTitle title={t('azkar.search.entriesHeading')} testID="azkar-search-entries" />
                {entries.map((hit, index) => (
                  <AzkarSearchResultRow
                    highlight={hit.highlight}
                    key={hit.entryKey}
                    number={index + 1}
                    onPress={() => {
                      remember(query);
                      router.push(azkarHref.entry(hit.entryKey));
                    }}
                    preview={hit.preview}
                    testID={`azkar-search-result-${index + 1}`}
                  />
                ))}
              </View>
            ) : null}

            {noResults ? (
              <UiText align="center" tone="muted" variant="subhead">
                {t('azkar.search.noResults')}
              </UiText>
            ) : null}
          </ScrollView>
        </View>
      </ContentColumn>
    </Screen>
  );
}
