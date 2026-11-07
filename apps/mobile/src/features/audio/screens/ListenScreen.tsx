import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { ContentColumn, useTabBarScrollHandlers, useTabContentBottom } from '@/core/layout';
import { useCatalogVersion } from '@/core/sync';
import { EmptyState, Screen, SkeletonGroup } from '@/shared/ui';
import { DiscoverTipCard } from '@/features/discover/components/DiscoverTipCard';
import { markDiscovered } from '@/features/discover/store';

import { type ReciterFilterOption } from '../components/ReciterFilterChips';
import { ReciterListHeader } from '../components/ReciterListHeader';
import { ReciterRow, type ReciterRowStatus } from '../components/ReciterRow';
import { ReciterRowSkeleton } from '../components/ReciterRowSkeleton';
import { useDoneCountsByReciter, useVerifyNeededCounts } from '../data/downloads';
import { isStartingFor, reciterMatch, useStartState } from '../hooks/useIsStarting';
import { useReciterCatalogue } from '../hooks/useReciterCatalogue';
import { recitationStyleKey, reciterInitial } from '../player-view';
import { pause } from '../player';
import { playReciter, selectReciter } from '../reciter-playback';
import { useReciterDownloads } from '../reciter-downloads';
import {
  joinStatusLine,
  matchesFilter,
  matchesQuery,
  reciterDisplayName,
  reciterStatus,
  type ReciterEntry,
  type ReciterFilter,
} from '../reciter-list';

// The frame's 16 pt gutter.
const FRAME_GUTTER = 16;
// The loading skeleton's seven rows, each with its own name length (screens/, #loading).
const SKELETON_NAME_WIDTHS = ['62%', '48%', '70%', '55%', '66%', '44%', '58%'] as const;

// The Listen tab (screens/, #Reciters). It composes the reciter components and wires them to
// the catalogue, the download store and the player. It draws no UI of its own.
export function ListenScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const router = useRouter();
  const { ready } = useContentDb();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReciterFilter>('all');
  const { reciters, selectedId, playingId } = useReciterCatalogue(ready);
  const startState = useStartState();
  const downloads = useReciterDownloads((state) => state.byId);
  const doneCounts = useDoneCountsByReciter();
  const verifyCounts = useVerifyNeededCounts();
  const bottom = useTabContentBottom();
  const tabScroll = useTabBarScrollHandlers();
  const syncSettled = useCatalogVersion((state) => state.syncSettled);
  // Until the first catalogue sync has run, an empty list is loading, not «no reciters».
  const loading = !ready || (reciters.length === 0 && !syncSettled);
  // No reciter rows at all (a first launch that could not reach the network) is not the same as a search with no match.
  const catalogueEmpty = ready && reciters.length === 0 && !loading;

  const rows = useMemo(
    () =>
      reciters.filter(
        (reciter) =>
          matchesQuery(reciter, query) && matchesFilter(reciter, filter, doneCounts[reciter.resourceId] ?? 0),
      ),
    [reciters, query, filter, doneCounts],
  );

  const filterOptions: ReciterFilterOption<ReciterFilter>[] = [
    { value: 'all', label: t('listen.filter.all') },
    { value: 'Murattal', label: t('player.style.murattal') },
    { value: 'Mujawwad', label: t('player.style.mujawwad') },
    { value: 'Muallim', label: t('player.style.muallim') },
    { value: 'downloaded', label: t('listen.filter.downloaded') },
  ];

  // The status line: «يُتلى الآن» or the failure or the teaching note, then «٣ سور محمّلة» when some are downloaded,
  // then the verify notice when a finished download needs a connection.
  const statusFor = (reciter: ReciterEntry, failed: boolean, downloaded: number, verifyNeeded: number): ReciterRowStatus | null => {
    const kind = reciterStatus({ failed, playing: reciter.resourceId === playingId, style: reciter.style });
    let primary: ReciterRowStatus | null = null;
    if (kind === 'nowPlaying') {
      primary = { label: t('player.nowPlaying'), tone: 'muted' };
    } else if (kind === 'failed') {
      primary = { label: t('ui.download.failed'), tone: 'danger' };
    } else if (kind === 'teaching') {
      primary = { label: t('listen.teaching'), tone: 'muted' };
    }
    const count =
      downloaded > 0
        ? t('listen.downloadedSurahs', { count: downloaded, n: formatNumber(downloaded, locale) })
        : null;
    const verify = verifyNeeded > 0 ? t('network.verifyDownloads') : null;
    // An installed reciter with no usable timings plays without highlight or repeat (ADR 0052), and says so.
    const noFollow = reciter.installed && !reciter.hasTimings ? t('listen.noFollow') : null;
    const label = joinStatusLine([primary?.label ?? null, noFollow, count, verify]);
    return label === null ? null : { label, tone: primary?.tone ?? 'muted' };
  };

  return (
    <Screen testID="screen-listen">
      <ContentColumn gutter={FRAME_GUTTER}>
        <FlatList
          contentContainerStyle={{ paddingBottom: bottom }}
          data={rows}
          {...tabScroll}
          keyExtractor={(reciter) => String(reciter.resourceId)}
          // A React element, not an inline component: its type stays the same across renders, so the search
          // field is not remounted (and does not lose focus) when the query changes the list.
          ListHeaderComponent={
            <View>
              <ReciterListHeader<ReciterFilter>
                filter={filter}
                filterLabel={t('listen.filter.group')}
                filterOptions={filterOptions}
                onFilterChange={setFilter}
                onQueryChange={setQuery}
                query={query}
                searchPlaceholder={t('listen.search.placeholder')}
                title={t('tabs.listen')}
              />
              {/* The Discover tour's listening step (ADR 0053): its arrow points down at the reciters' play buttons. */}
              <DiscoverTipCard id="listen.follow" pointer />
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <SkeletonGroup testID="reciter-loading">
                {SKELETON_NAME_WIDTHS.map((width) => (
                  <ReciterRowSkeleton key={width} nameWidth={width} />
                ))}
              </SkeletonGroup>
            ) : catalogueEmpty ? (
              <EmptyState
                body={t('listen.catalogue.body')}
                testID="reciter-catalogue-empty"
                title={t('listen.catalogue.title')}
              />
            ) : (
              <EmptyState body={t('listen.empty.body')} testID="reciter-empty" title={t('listen.empty.title')} />
            )
          }
          renderItem={({ item }) => {
            const download = downloads[item.resourceId];
            const name = reciterDisplayName(item, locale, t('listen.unnamed'));
            const styleKey = recitationStyleKey(item.style);
            const playing = item.resourceId === playingId;
            const starting = isStartingFor(startState, reciterMatch(item.resourceId));
            return (
              <ReciterRow
                downloadProgress={download?.status === 'downloading' ? download.progress : null}
                letter={reciterInitial(name)}
                name={name}
                onOptions={() => {
                  // The ⋯ button selects the reciter, then opens his page (ADR 0062 decision 7).
                  void selectReciter(item.resourceId, item.installed);
                  router.push(`/(main)/(listen)/reciter/${item.resourceId}` as Href);
                }}
                onPlay={() => {
                  if (playing) {
                    pause();
                    return;
                  }
                  // Pressing play is the Discover tour's listening step (ADR 0053).
                  markDiscovered('listen.follow');
                  void playReciter(item.resourceId, item.installed);
                }}
                onSelect={() => {
                  void selectReciter(item.resourceId, item.installed);
                }}
                optionsLabel={t('listen.options')}
                playHint={download?.status === 'downloading' ? t('ui.download.downloading') : undefined}
                playLabel={playing || starting ? t('player.pause') : t('listen.play', { name })}
                playing={playing}
                starting={starting}
                selected={item.resourceId === selectedId}
                status={statusFor(
                  item,
                  download?.status === 'failed',
                  doneCounts[item.resourceId] ?? 0,
                  verifyCounts[item.resourceId] ?? 0,
                )}
                styleLabel={styleKey === null ? null : t(styleKey)}
                testID={`reciter-row-${item.resourceId}`}
              />
            );
          }}
          style={{ flex: 1 }}
          testID="reciter-list"
        />
      </ContentColumn>
    </Screen>
  );
}
