import { FlashList } from '@shopify/flash-list';
import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { useAzkarAvailable } from '@/features/azkar/data';
import { goBackOr, HOME_TAB } from '@/core/navigation/go-back';
import { azkarHref } from '@/features/azkar/routes';
import { getWords, type WordRecord } from '@/features/reader/data/words';
import { AzkarSearchIdle } from '@/features/search/components/AzkarSearchIdle';
import { AzkarSearchResults } from '@/features/search/components/AzkarSearchResults';
import { RecentSearches } from '@/features/search/components/RecentSearches';
import { SearchBar } from '@/features/search/components/SearchBar';
import { SearchMessage } from '@/features/search/components/SearchMessage';
import { SearchResultRow } from '@/features/search/components/SearchResultRow';
import { SearchShowMore } from '@/features/search/components/SearchShowMore';
import { SurahResultRow } from '@/features/search/components/SurahResultRow';
import { useDebouncedValue } from '@/features/search/hooks/useDebouncedValue';
import {
  addRecentSearch,
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
} from '@/features/search/recentSearches';
import { searchQuran, type SearchResult, SEARCH_PAGE_SIZE } from '@/features/search/searchQuran';
import { readSessionSearchScope, rememberSessionSearchScope, type SearchScope } from '@/features/search/searchScope';
import { Screen, SegmentedControl, UiText } from '@/shared/ui';

const SEARCH_DEBOUNCE_MS = 150;

function readHref(verseKey: string): Href {
  return `/read/${verseKey}` as Href;
}

export function SearchScreen({ testID = 'screen-search' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ready } = useContentDb();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(() => readRecentSearches());
  const [resultLimit, setResultLimit] = useState(SEARCH_PAGE_SIZE);
  // The Azkar scope exists only once Azkar content is installed (ADR 0031); without it search is Quran only.
  const azkarAvailable = useAzkarAvailable();
  // The last scope the reader picked stays for the rest of the session (search.scope).
  const [scope, setScope] = useState<SearchScope>(readSessionSearchScope);
  const activeScope: SearchScope = azkarAvailable && scope === 'azkar' ? 'azkar' : 'quran';
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

  const selectScope = useCallback((next: SearchScope) => {
    rememberSessionSearchScope(next);
    setScope(next);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      if (item.kind === 'surah') {
        return (
          <SurahResultRow
            chapter={item.chapter}
            onPress={() => openVerse(`${item.chapter.id}:1`)}
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
  // True while the typed query has not yet reached the debounced value that the results are computed from.
  const waitingForDebounce = query.trim().length > 0 && query.trim() !== debouncedQuery.trim();
  const showNoResults =
    !showRecent &&
    !waitingForDebounce &&
    activeScope === 'quran' &&
    debouncedQuery.trim().length > 0 &&
    ready &&
    page.results.length === 0 &&
    page.parsed.kind !== 'empty';
  const placeholder = activeScope === 'azkar' ? t('search.placeholderAzkar') : t('search.placeholder');
  const hint = activeScope === 'azkar' ? t('search.hintAzkar') : t('search.hint');

  // The keyboard lifts the whole column, field and results alike, so the results keep their room in a short
  // (landscape) window. One avoiding view covers both scopes; a nested one would add its padding twice.
  return (
    <Screen testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        testID="search-keyboard"
      >
        <ContentColumn>
          <View style={{ gap: theme.space[2], paddingTop: theme.space[2] }}>
            <SearchBar
              onCancel={() => goBackOr(HOME_TAB)}
              onChangeText={(text) => {
                setQuery(text);
                setResultLimit(SEARCH_PAGE_SIZE);
              }}
              onSubmit={commitSearch}
              placeholder={placeholder}
              value={query}
            />
            <UiText tone="muted" variant="label">
              {hint}
            </UiText>
            {azkarAvailable ? (
              <SegmentedControl
                label={t('search.scope.label')}
                onChange={selectScope}
                options={[
                  { key: 'quran', label: t('search.scope.quran') },
                  { key: 'azkar', label: t('search.scope.azkar') },
                ]}
                testID="search-scope"
                value={activeScope}
              />
            ) : null}
          </View>

          {showRecent && activeScope === 'azkar' ? (
            <View style={{ paddingTop: theme.space[4] }}>
              <AzkarSearchIdle
                onClear={() => setRecent(clearRecentSearches())}
                onRemove={(entry) => setRecent(removeRecentSearch(entry))}
                onSelect={onSelectRecent}
                queries={recent}
              />
            </View>
          ) : null}

          {showRecent && activeScope === 'quran' ? (
            <View style={{ gap: theme.space[4], paddingTop: theme.space[4] }}>
              <RecentSearches
                onRemove={(entry) => setRecent(removeRecentSearch(entry))}
                onSelect={onSelectRecent}
                queries={recent}
                testID="search-recent"
              />
              <SearchMessage message={t('search.empty')} testID="search-empty" />
            </View>
          ) : null}

          {showNoResults ? (
            <View style={{ paddingTop: theme.space[4] }}>
              <SearchMessage message={t('search.noResults')} testID="search-no-results" />
            </View>
          ) : null}

          {!showRecent && activeScope === 'azkar' ? (
            <AzkarSearchResults
              onOpenChapter={(categoryId) => {
                commitSearch(query);
                router.push(azkarHref.category(categoryId));
              }}
              onOpenEntry={(entryKey) => {
                commitSearch(query);
                router.push(azkarHref.entry(entryKey));
              }}
              pending={waitingForDebounce}
              query={debouncedQuery}
            />
          ) : null}

          {!showRecent && activeScope === 'quran' && page.results.length > 0 ? (
            <View style={{ flex: 1 }}>
              <FlashList
                data={page.results}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: theme.space[2] }} />}
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
      </KeyboardAvoidingView>
    </Screen>
  );
}
