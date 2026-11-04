import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { Screen } from '@/shared/ui';

import { NameSourceLine } from '../components/NameSourceLine';
import { NamesEmptyState } from '../components/NamesEmptyState';
import { NamesGrid } from '../components/NamesGrid';
import { NamesList } from '../components/NamesList';
import { NamesScreenHeader } from '../components/NamesScreenHeader';
import { NamesSearchField } from '../components/NamesSearchField';
import { NamesUnavailableState } from '../components/NamesUnavailableState';
import { NamesViewSwitch } from '../components/NamesViewSwitch';
import { useNamesAvailable, useNamesListMeta, useNamesSummaries, useNamesViewMode } from '../data/hooks';
import { searchNames } from '../data/search';
import { MENU_TAB } from '@/core/navigation/go-back';
import { openContentDb } from '@/core/db/content/open';

import { toggleNameFavourite } from '../data/favorites-repository';
import { namesHref, goBackOr } from '../routes';

export function NamesListScreen({ testID = 'screen-names-list' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const available = useNamesAvailable();
  const listMeta = useNamesListMeta();
  const summaries = useNamesSummaries();
  const [viewMode, setViewMode] = useNamesViewMode();
  const [query, setQuery] = useState('');
  const [, setFavouriteTick] = useState(0);
  const bumpFavourites = () => setFavouriteTick((value) => value + 1);

  const filtered = useMemo(() => {
    if (query.trim() === '') {
      return summaries;
    }
    const { executor } = openContentDb();
    const slugs = new Set(searchNames(executor, query));
    return summaries.filter((item) => slugs.has(item.nameSlug));
  }, [query, summaries]); // favouriteTick intentionally omitted: list re-reads on navigation in N6

  const openDetail = (slug: string) => router.push(namesHref.detail(slug));

  return (
    <Screen testID={testID}>
      <ContentColumn gutter={theme.size.gutterHome}>
        <View style={{ flex: 1, gap: theme.space[4], paddingTop: theme.space[2] }}>
          <NamesScreenHeader onBack={() => goBackOr(MENU_TAB)} title={t('names.list.title')} />
          {!available ? (
            <NamesUnavailableState />
          ) : summaries.length === 0 ? (
            <NamesEmptyState />
          ) : (
            <>
              <NamesSearchField onChangeText={setQuery} value={query} />
              <NamesViewSwitch mode={viewMode} onChange={setViewMode} />
              {listMeta ? <NameSourceLine label={listMeta.sourceLabelAr} /> : null}
              <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[8] }}>
                {viewMode === 'grid' ? (
                  <NamesGrid
                    items={filtered}
                    onFavouritePress={(slug) => {
                      toggleNameFavourite(slug);
                      bumpFavourites();
                    }}
                    onOpen={openDetail}
                  />
                ) : (
                  <NamesList
                    items={filtered}
                    onFavouritePress={(slug) => {
                      toggleNameFavourite(slug);
                      bumpFavourites();
                    }}
                    onOpen={openDetail}
                  />
                )}
              </ScrollView>
            </>
          )}
        </View>
      </ContentColumn>
    </Screen>
  );
}
