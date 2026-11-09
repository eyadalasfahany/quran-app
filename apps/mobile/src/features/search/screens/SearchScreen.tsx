import { FlashList } from '@shopify/flash-list';
import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { useAzkarAvailable } from '@/features/azkar/data';
import { markDiscovered } from '@/features/discover/store';
import { goBackOr, HOME_TAB } from '@/core/navigation/go-back';
import { azkarHref } from '@/features/azkar/routes';
import { HadithRecentSearches } from '@/features/hadith/components/HadithRecentSearches';
import { HadithSearchResults } from '@/features/hadith/components/HadithSearchResults';
import { HadithStateView } from '@/features/hadith/components/HadithStateView';
import { HADITH_SEARCH_PAGE_SIZE } from '@/features/hadith/data';
import { useHadithAvailable, useHadithSearch } from '@/features/hadith/hooks';
import {
  addHadithRecentSearch,
  clearHadithRecentSearches,
  readHadithRecentSearches,
  removeHadithRecentSearch,
} from '@/features/hadith/recent-searches';
import { hadithHref } from '@/features/hadith/routes';
import { getWords, type WordRecord } from '@/features/reader/data/words';
import { AzkarSearchIdle } from '@/features/search/components/AzkarSearchIdle';
import { AzkarSearchResults } from '@/features/search/components/AzkarSearchResults';
import { RecentSearches } from '@/features/search/components/RecentSearches';
import { SearchBar } from '@/features/search/components/SearchBar';
import { SearchScopeChips } from '@/features/search/components/SearchScopeChips';
import { SearchIdleHint } from '@/features/search/components/SearchIdleHint';
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
import { Screen } from '@/shared/ui';
import { DiscoverTipCard } from '@/features/discover/components/DiscoverTipCard';

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
  const hadithAvailable = useHadithAvailable();
  // The last scope the reader picked stays for the rest of the session (search.scope).
  const [scope, setScope] = useState<SearchScope>(readSessionSearchScope);
  const scopes: SearchScope[] = ['quran'];
  if (hadithAvailable) {
    scopes.push('hadith');
  }
  if (azkarAvailable) {
    scopes.push('azkar');
  }
  const activeScope: SearchScope = scopes.includes(scope) ? scope : 'quran';
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const activeLimit = query.trim() === debouncedQuery.trim() ? resultLimit : SEARCH_PAGE_SIZE;
  const [hadithRecent, setHadithRecent] = useState(readHadithRecentSearches);
  const [hadithLimit, setHadithLimit] = useState(HADITH_SEARCH_PAGE_SIZE);
  // Only the hadith scope runs the hadith search; the other scopes pass an empty query, which has no tokens.
  const hadith = useHadithSearch({
    query: activeScope === 'hadith' ? debouncedQuery : '',
    scope: null,
    limit: hadithLimit,
  });

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
    markDiscovered('app.search');
  }, []);

  const onSelectRecent = useCallback(
    (value: string) => {
      setQuery(value);
      setResultLimit(SEARCH_PAGE_SIZE);
      commitSearch(value);
    },
    [commitSearch],
  );

  const commitHadithSearch = useCallback((value: string) => {
    setHadithRecent(addHadithRecentSearch(value));
  }, []);

  const onSelectHadithRecent = useCallback((value: string) => {
    setQuery(value);
    setHadithLimit(HADITH_SEARCH_PAGE_SIZE);
    setHadithRecent(addHadithRecentSearch(value));
  }, []);

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
  const placeholder =
    activeScope === 'hadith'
      ? t('search.placeholderHadith')
      : activeScope === 'azkar'
        ? t('search.placeholderAzkar')
        : t('search.placeholder');
  const showHadithIdle = activeScope === 'hadith' && (showRecent || !hadith.hasTokens);

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
                setHadithLimit(HADITH_SEARCH_PAGE_SIZE);
              }}
              onSubmit={activeScope === 'hadith' ? commitHadithSearch : commitSearch}
              placeholder={placeholder}
              value={query}
            />
            {/* The Discover tour's search step (ADR 0053): a search completes it. */}
            <DiscoverTipCard id="app.search" />
            {scopes.length > 1 ? (
              <SearchScopeChips onChange={selectScope} scopes={scopes} value={activeScope} />
            ) : null}
          </View>

          {showHadithIdle ? (
            <View style={{ gap: theme.space[4], paddingTop: theme.space[4] }}>
              <HadithRecentSearches
                onClear={() => setHadithRecent(clearHadithRecentSearches())}
                onRemove={(entry) => setHadithRecent(removeHadithRecentSearch(entry))}
                onSelect={onSelectHadithRecent}
                queries={hadithRecent}
              />
              <SearchIdleHint testID="search-hadith-idle-hint" text={t('search.hadithIdleHint')} />
            </View>
          ) : null}

          {!showRecent && activeScope === 'hadith' && hadith.hasTokens && hadith.hits.length === 0 ? (
            <View style={{ paddingTop: theme.space[4] }}>
              <HadithStateView kind="noResults" />
            </View>
          ) : null}

          {!showRecent && activeScope === 'hadith' && hadith.hits.length > 0 ? (
            <View style={{ flex: 1 }}>
              <HadithSearchResults
                hasMore={hadith.hasMore}
                hits={hadith.hits}
                key={debouncedQuery}
                onLoadMore={() => {
                  if (hadith.hasMore) {
                    setHadithLimit((current) => current + HADITH_SEARCH_PAGE_SIZE);
                  }
                }}
                onOpen={(hit) => {
                  commitHadithSearch(query);
                  router.push(hadithHref.reader(hit.collection.slug, hit.item.hadithNumber));
                }}
                total={hadith.total}
              />
            </View>
          ) : null}

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
              <SearchIdleHint testID="search-empty" text={t('search.quranIdleHint')} />
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
