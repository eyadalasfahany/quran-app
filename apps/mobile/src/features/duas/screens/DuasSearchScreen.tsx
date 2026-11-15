import { FlashList } from '@shopify/flash-list';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale } from '@/core/i18n';
import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { RecentSearches, Screen, SearchBar, SearchCategoryRow, SearchResultRow, UiText, type MatchRange } from '@/shared/ui';
import { AzkarSectionTitle } from '@/features/azkar/components/AzkarSectionTitle';
import { azkarHref } from '@/features/azkar/routes';
import { useQuranReferenceLabel } from '@/features/azkar/data';
import { useDebouncedValue } from '@/features/search/hooks/useDebouncedValue';

import { categoryCountText, categoryName } from '../data/category-labels';
import { addDuasRecentSearch, clearDuasRecentSearches, readDuasRecentSearches, removeDuasRecentSearch } from '../data/recent-searches';
import { useDuaCategories, useDuaSearch } from '../data/hooks';
import type { DuaSearchHit } from '../data/search';
import { duasHref, goBackOr } from '../routes';

const SEARCH_DEBOUNCE_MS = 150;

/** One row of the dua hit list: the «الأدعية» heading, or one matching dua with its number. */
type HitRow = { kind: 'heading' } | { kind: 'hit'; hit: DuaSearchHit; number: number };

/** What one hit shows and where it opens. A Hisn hit opens its Azkar entry; the others open their own detail. */
type HitView = { preview: string; highlight: MatchRange | null; categoryId: string | null; open: () => void };

/**
 * Duas search (screens/, #DuasSearch). With no query it shows the hint and the recent searches; with a query it lists the
 * matching categories («التصنيفات»), then the matching duas («الأدعية»), each with its category as a caption. Matches are
 * highlighted, never rewritten. A Quranic match shows its surah and verses, never the verse text.
 */
export function DuasSearchScreen({ testID = 'screen-duas-search' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readDuasRecentSearches);
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const { categories, duas } = useDuaSearch(debounced);
  const allCategories = useDuaCategories();
  const quranReference = useQuranReferenceLabel(locale);
  const hasQuery = query.trim().length > 0;

  const captionById = useMemo(
    () => new Map(allCategories.map((category) => [category.id, categoryName(category, t, locale)])),
    [allCategories, t, locale],
  );

  const remember = (value: string) => setRecent(addDuasRecentSearch(value));
  const noResults = hasQuery && debounced.trim() === query.trim() && categories.length === 0 && duas.length === 0;

  const viewOf = (hit: DuaSearchHit): HitView => {
    const openThen = (route: Href) => () => {
      remember(query);
      router.push(route);
    };
    switch (hit.kind) {
      case 'quran':
        return {
          preview: quranReference({ surah: hit.surah, verseFrom: hit.verseFrom, verseTo: hit.verseTo }) ?? t('duas.categories.quran'),
          highlight: null,
          categoryId: hit.categoryId,
          open: openThen(duasHref.quranDetail(hit.duaKey)),
        };
      case 'hadith':
        return {
          preview: hit.preview,
          highlight: hit.highlight,
          categoryId: hit.categoryId,
          open: openThen(duasHref.hadithDetail(hit.duaKey)),
        };
      case 'hisn':
        return {
          preview: hit.preview,
          highlight: hit.highlight,
          categoryId: hit.categoryId,
          open: openThen(azkarHref.entry(hit.entryKey)),
        };
    }
  };

  const rows: HitRow[] =
    duas.length === 0 ? [] : [{ kind: 'heading' }, ...duas.map((hit, index) => ({ hit, kind: 'hit' as const, number: index + 1 }))];

  const header = (
    <View style={{ gap: theme.space[4], paddingBottom: duas.length > 0 ? theme.space[4] : 0 }}>
      {!hasQuery ? (
        <>
          <UiText tone="muted" variant="caption">
            {t('duas.search.hint')}
          </UiText>
          <RecentSearches
            clearLabel={t('duas.search.clear')}
            onClear={() => setRecent(clearDuasRecentSearches())}
            onRemove={(value) => setRecent(removeDuasRecentSearch(value))}
            onSelect={(value) => {
              setQuery(value);
              remember(value);
            }}
            queries={recent}
            removeLabel={(value) => t('duas.search.removeRecent', { query: value })}
            testID="duas-recent-searches"
            title={t('duas.search.recentTitle')}
          />
        </>
      ) : null}

      {categories.length > 0 ? (
        <View style={{ gap: theme.space[3] }}>
          <AzkarSectionTitle testID="duas-search-categories" title={t('duas.search.categoriesHeading')} />
          {categories.map((match) => (
            <SearchCategoryRow
              countText={categoryCountText(match.category.count, locale, t)}
              highlight={match.highlight}
              key={match.category.id}
              onPress={() => {
                remember(query);
                router.push(duasHref.category(match.category.id));
              }}
              testID={`duas-search-category-${match.category.id}`}
              title={match.label}
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
          <SearchBar
            backLabel={t('duas.search.back')}
            onBack={() => goBackOr(duasHref.home)}
            onChangeText={setQuery}
            onSubmit={(value) => {
              if (value.trim().length > 0) {
                remember(value);
              }
            }}
            placeholder={t('duas.search.placeholder')}
            testID="duas-search-bar"
            value={query}
          />
          <FlashList
            ListEmptyComponent={
              noResults ? (
                <View style={{ paddingTop: theme.space[4] }}>
                  <UiText align="center" tone="muted" variant="subhead">
                    {t('duas.search.noResults')}
                  </UiText>
                </View>
              ) : null
            }
            ListHeaderComponent={header}
            contentContainerStyle={{ paddingBottom: theme.space[8] }}
            data={rows}
            ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} />}
            keyExtractor={(row) => (row.kind === 'heading' ? 'heading' : row.hit.key)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.kind === 'heading') {
                return <AzkarSectionTitle title={t('duas.search.duasHeading')} testID="duas-search-duas" />;
              }
              const view = viewOf(item.hit);
              return (
                <SearchResultRow
                  caption={view.categoryId === null ? null : (captionById.get(view.categoryId) ?? null)}
                  highlight={view.highlight}
                  number={item.number}
                  onPress={view.open}
                  preview={view.preview}
                  testID={`duas-search-result-${item.number}`}
                />
              );
            }}
          />
        </View>
      </ContentColumn>
    </Screen>
  );
}
