import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { ContentColumn, useTabContentBottom } from '@/core/layout';
import { goBackOr } from '@/core/navigation/go-back';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';
import { useDebouncedValue } from '@/features/search/hooks/useDebouncedValue';

import { HadithListHeader } from '../components/HadithListHeader';
import { HadithListSkeleton } from '../components/HadithListSkeleton';
import { HadithRecentSearches } from '../components/HadithRecentSearches';
import { HadithScopeChips } from '../components/HadithScopeChips';
import { HadithSearchField } from '../components/HadithSearchField';
import { HadithSearchHint } from '../components/HadithSearchHint';
import { HadithSearchResults } from '../components/HadithSearchResults';
import { HadithStateView } from '../components/HadithStateView';
import { HADITH_SEARCH_PAGE_SIZE } from '../data';
import { useHadithAvailable, useHadithSearch, useInstalledHadithCollections } from '../hooks';
import { hadithHref } from '../routes';
import {
  addHadithRecentSearch,
  clearHadithRecentSearches,
  readHadithRecentSearches,
  removeHadithRecentSearch,
} from '../recent-searches';

const SEARCH_DEBOUNCE_MS = 150;

/**
 * Hadith search over the installed collections (step 14). The query runs as the user types (debounced) and at once on
 * submit. The scope chips narrow it; a tap on a result opens the reader.
 */
export function HadithSearchScreen({ testID = 'screen-hadith-search' }: { testID?: string }) {
  const theme = useTheme();
  const { ready } = useContentDb();
  const available = useHadithAvailable();
  const installed = useInstalledHadithCollections();
  const collections = useMemo(() => [...installed].sort((a, b) => a.number - b.number), [installed]);
  const bottomInset = useTabContentBottom();

  const [value, setValue] = useState('');
  // The query as submitted: it runs at once, without waiting for the debounce.
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [chosenScope, setChosenScope] = useState<string | null>(null);
  const [limit, setLimit] = useState(HADITH_SEARCH_PAGE_SIZE);
  const [recent, setRecent] = useState(readHadithRecentSearches);

  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);
  const query = submitted !== null && submitted === value ? submitted : debounced;
  // A scope whose collection is no longer installed falls back to all of them.
  const scope = collections.some((collection) => collection.slug === chosenScope) ? chosenScope : null;
  const result = useHadithSearch({ query, scope, limit });

  const back = () => goBackOr(hadithHref.home);

  const onChangeText = (text: string) => {
    setValue(text);
    setLimit(HADITH_SEARCH_PAGE_SIZE);
  };

  const onSubmit = (text: string) => {
    setValue(text);
    setSubmitted(text);
    setLimit(HADITH_SEARCH_PAGE_SIZE);
    setRecent(addHadithRecentSearch(text));
  };

  const onChooseScope = (next: string | null) => {
    setChosenScope(next);
    setLimit(HADITH_SEARCH_PAGE_SIZE);
  };

  const onSelectRecent = (text: string) => {
    setValue(text);
    setSubmitted(text);
    setLimit(HADITH_SEARCH_PAGE_SIZE);
    setRecent(addHadithRecentSearch(text));
  };

  const onLoadMore = () => {
    if (result.hasMore) {
      setLimit((current) => current + HADITH_SEARCH_PAGE_SIZE);
    }
  };

  let body: ReactNode;
  if (!ready) {
    body = <HadithListSkeleton />;
  } else if (!available) {
    body = <HadithStateView kind="offlineEmpty" />;
  } else if (!result.hasTokens) {
    body = (
      <View style={{ gap: theme.space[4] }}>
        <HadithRecentSearches
          onClear={() => setRecent(clearHadithRecentSearches())}
          onRemove={(text) => setRecent(removeHadithRecentSearch(text))}
          onSelect={onSelectRecent}
          queries={recent}
        />
        <HadithSearchHint />
      </View>
    );
  } else if (result.hits.length === 0) {
    body = <HadithStateView kind="noResults" />;
  } else {
    body = (
      <HadithSearchResults
        bottomInset={bottomInset}
        hasMore={result.hasMore}
        hits={result.hits}
        key={`${scope ?? 'all'}|${query}`}
        onLoadMore={onLoadMore}
        onOpen={(hit) => {
          setRecent(addHadithRecentSearch(value));
          router.push(hadithHref.reader(hit.collection.slug, hit.item.hadithNumber));
        }}
        total={result.total}
      />
    );
  }

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterList}>
        <View style={{ flex: 1, gap: theme.space[4], paddingTop: theme.space[2] }}>
          <HadithListHeader onBack={back} />
          <HadithSearchField
            autoFocus
            onCancel={back}
            onChangeText={onChangeText}
            onSubmit={onSubmit}
            value={value}
          />
          {collections.length > 0 ? (
            <HadithScopeChips collections={collections} onChange={onChooseScope} scope={scope} />
          ) : null}
          <View style={{ flex: 1 }}>{body}</View>
        </View>
      </ContentColumn>
    </Screen>
  );
}
