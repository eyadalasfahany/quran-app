import { FlashList } from '@shopify/flash-list';
import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { getWords, type WordRecord } from '@/features/reader/data/words';
import { RecentSearches } from '@/features/search/components/RecentSearches';
import { SearchResultRow } from '@/features/search/components/SearchResultRow';
import { SearchShowMore } from '@/features/search/components/SearchShowMore';
import { SurahResultRow } from '@/features/search/components/SurahResultRow';
import { useDebouncedValue } from '@/features/search/hooks/useDebouncedValue';
import { addRecentSearch, readRecentSearches, removeRecentSearch } from '@/features/search/recentSearches';
import { searchQuran, type SearchResult, SEARCH_PAGE_SIZE } from '@/features/search/searchQuran';
import { SearchField, uiTextProps, useContrastColors } from '@/shared/ui';

const SEARCH_DEBOUNCE_MS = 150;

function readHref(verseKey: string): Href {
  return `/read/${verseKey}` as Href;
}

export function SearchScreen({ testID = 'screen-search' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const insets = useSafeAreaInsets();
  const { ready } = useContentDb();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(() => readRecentSearches());
  const [resultLimit, setResultLimit] = useState(SEARCH_PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const activeLimit = query.trim() === debouncedQuery.trim() ? resultLimit : SEARCH_PAGE_SIZE;

  const page = useMemo(() => {
    if (!ready || debouncedQuery.trim().length === 0) {
      return { results: [] as SearchResult[], hasMore: false, parsed: { kind: 'empty' as const } };
    }
    let executor;
    try {
      executor = openContentDb().executor;
    } catch {
      return { results: [] as SearchResult[], hasMore: false, parsed: { kind: 'empty' as const } };
    }
    return searchQuran(executor, debouncedQuery, { limit: activeLimit });
  }, [activeLimit, debouncedQuery, ready]);

  const verseWordsById = useMemo(() => {
    const map = new Map<number, WordRecord[]>();
    if (!ready) {
      return map;
    }
    let executor;
    try {
      executor = openContentDb().executor;
    } catch {
      return map;
    }
    for (const item of page.results) {
      if (item.kind !== 'verse') {
        continue;
      }
      try {
        map.set(item.verse.id, getWords(executor, item.verse.id));
      } catch {
        map.set(item.verse.id, []);
      }
    }
    return map;
  }, [page.results, ready]);

  const openVerse = useCallback((verseKey: string) => {
    router.push(readHref(verseKey));
  }, []);

  const commitSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }
    setRecent(addRecentSearch(trimmed));
  }, []);

  const onSelectRecent = useCallback(
    (value: string) => {
      setQuery(value);
      setResultLimit(SEARCH_PAGE_SIZE);
      commitSearch(value);
    },
    [commitSearch],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      if (item.kind === 'surah') {
        return (
          <SurahResultRow
            chapter={item.chapter}
            onPress={() => openVerse(`${item.chapter.id}:1`)}
            separator="line"
            testID={`search-surah-${item.chapter.id}`}
          />
        );
      }
      return (
        <SearchResultRow
          chapter={item.chapter}
          highlightedPositions={item.highlightedPositions}
          onPress={() => {
            commitSearch(query);
            openVerse(item.verse.verseKey);
          }}
          separator="line"
          testID={`search-verse-${item.verse.id}`}
          verse={item.verse}
          words={verseWordsById.get(item.verse.id) ?? []}
        />
      );
    },
    [commitSearch, openVerse, query, verseWordsById],
  );

  const keyExtractor = useCallback((item: SearchResult) => {
    return item.kind === 'surah' ? `surah-${item.chapter.id}` : `verse-${item.verse.id}`;
  }, []);

  const showRecent = query.trim().length === 0;
  const waitingForDebounce = query.trim().length > 0 && query !== debouncedQuery;
  const showNoResults =
    !showRecent &&
    !waitingForDebounce &&
    debouncedQuery.trim().length > 0 &&
    ready &&
    page.results.length === 0 &&
    page.parsed.kind !== 'empty';

  return (
    <View
      style={{ backgroundColor: theme.colors.surface, flex: 1, paddingTop: insets.top }}
      testID={testID}
    >
      <ContentColumn>
        <View style={{ gap: theme.space[3], paddingBottom: theme.space[2], paddingTop: theme.space[4] }}>
          <Text {...uiTextProps('title')} style={[theme.text.title, { color: theme.colors.ink }]}>
            {t('search.title')}
          </Text>
          <SearchField
            autoFocus
            onChangeText={(text) => {
              setQuery(text);
              setResultLimit(SEARCH_PAGE_SIZE);
            }}
            onSubmit={commitSearch}
            placeholder={t('search.placeholder')}
            testID="search-field"
            value={query}
          />
          <Text {...uiTextProps('caption')} style={[theme.text.caption, { color: colors.inkMuted }]}>
            {t('search.hint')}
          </Text>
        </View>

        {showRecent ? (
          <View style={{ gap: theme.space[4] }}>
            <RecentSearches
              onRemove={(entry) => setRecent(removeRecentSearch(entry))}
              onSelect={onSelectRecent}
              queries={recent}
              testID="search-recent"
            />
            <Text {...uiTextProps('body')} style={[theme.text.body, { color: colors.inkMuted }]}>
              {t('search.empty')}
            </Text>
          </View>
        ) : null}

        {showNoResults ? (
          <Text {...uiTextProps('body')} style={[theme.text.body, { color: colors.inkMuted, paddingTop: theme.space[4] }]}>
            {t('search.noResults')}
          </Text>
        ) : null}

        {!showRecent && page.results.length > 0 ? (
          <View style={{ flex: 1, minHeight: 240 }}>
            <FlashList
              data={page.results}
              keyExtractor={keyExtractor}
              ListFooterComponent={
                page.hasMore ? (
                  <SearchShowMore onPress={() => setResultLimit((current) => current + SEARCH_PAGE_SIZE)} />
                ) : null
              }
              renderItem={renderItem}
              testID="search-results"
            />
          </View>
        ) : null}
      </ContentColumn>
    </View>
  );
}
