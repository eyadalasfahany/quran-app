import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { useLocale } from '@/core/i18n/useLocale';
import { ContentColumn } from '@/core/layout';
import { EmptyState, Screen } from '@/shared/ui';

import { type ReciterFilterOption } from '../components/ReciterFilterChips';
import { ReciterListHeader } from '../components/ReciterListHeader';
import { ReciterRow, type ReciterRowStatus } from '../components/ReciterRow';
import { useMiniPlayerVisible } from '../hooks/useMiniPlayerVisible';
import { useReciterCatalogue } from '../hooks/useReciterCatalogue';
import { recitationStyleKey, reciterInitial } from '../player-view';
import { playReciter } from '../reciter-playback';
import { useReciterDownloads } from '../reciter-downloads';
import {
  matchesFilter,
  matchesQuery,
  reciterDisplayName,
  reciterStatus,
  type ReciterEntry,
  type ReciterFilter,
} from '../reciter-list';
import { MINI_PLAYER_TABS_FOOTPRINT } from '../mini-player-metrics';
import { setReciterId } from '../settings';

// The frame's 16 pt gutter.
const FRAME_GUTTER = 16;

// The chip row's values: every filter, plus «المحمّلة», which is disabled until step 7.
type ChipValue = ReciterFilter | 'downloaded';

// The Listen tab (quran-app-screens.html, #Reciters). It composes the reciter components and wires them to
// the catalogue, the download store and the player. It draws no UI of its own.
export function ListenScreen() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { ready } = useContentDb();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReciterFilter>('all');
  const { reciters, selectedId, playingId } = useReciterCatalogue(ready);
  const downloads = useReciterDownloads((state) => state.byId);
  const miniShown = useMiniPlayerVisible('tabs');

  const rows = useMemo(
    () => reciters.filter((reciter) => matchesQuery(reciter, query) && matchesFilter(reciter, filter)),
    [reciters, query, filter],
  );

  // «المحمّلة» needs the per-surah downloads of step 7, so it is disabled until then.
  const filterOptions: ReciterFilterOption<ChipValue>[] = [
    { value: 'all', label: t('listen.filter.all') },
    { value: 'Murattal', label: t('player.style.murattal') },
    { value: 'Mujawwad', label: t('player.style.mujawwad') },
    { value: 'Muallim', label: t('player.style.muallim') },
    { value: 'downloaded', label: t('listen.filter.downloaded'), disabled: true },
  ];

  const statusFor = (reciter: ReciterEntry, failed: boolean): ReciterRowStatus | null => {
    const kind = reciterStatus({ failed, playing: reciter.resourceId === playingId, style: reciter.style });
    if (kind === 'nowPlaying') {
      return { label: t('player.nowPlaying'), tone: 'muted' };
    }
    if (kind === 'failed') {
      return { label: t('ui.download.failed'), tone: 'danger' };
    }
    if (kind === 'teaching') {
      return { label: t('listen.teaching'), tone: 'muted' };
    }
    return null;
  };

  return (
    <Screen testID="screen-listen">
      <ContentColumn gutter={FRAME_GUTTER}>
        <FlatList
          contentContainerStyle={{ paddingBottom: miniShown ? MINI_PLAYER_TABS_FOOTPRINT : 0 }}
          data={rows}
          keyExtractor={(reciter) => String(reciter.resourceId)}
          // A React element, not an inline component: its type stays the same across renders, so the search
          // field is not remounted (and does not lose focus) when the query changes the list.
          ListHeaderComponent={
            <ReciterListHeader<ChipValue>
              filter={filter}
              filterLabel={t('listen.filter.group')}
              filterOptions={filterOptions}
              onFilterChange={(value) => {
                if (value !== 'downloaded') {
                  setFilter(value);
                }
              }}
              onQueryChange={setQuery}
              query={query}
              searchPlaceholder={t('listen.search.placeholder')}
              title={t('tabs.listen')}
            />
          }
          ListEmptyComponent={
            <EmptyState body={t('listen.empty.body')} testID="reciter-empty" title={t('listen.empty.title')} />
          }
          renderItem={({ item }) => {
            const download = downloads[item.resourceId];
            const name = reciterDisplayName(item, locale, t('listen.unnamed'));
            const styleKey = recitationStyleKey(item.style);
            return (
              <ReciterRow
                downloadProgress={download?.status === 'downloading' ? download.progress : null}
                letter={reciterInitial(name)}
                name={name}
                onPlay={() => {
                  void playReciter(item.resourceId, item.installed);
                }}
                onSelect={() => {
                  setReciterId(item.resourceId);
                }}
                playHint={download?.status === 'downloading' ? t('ui.download.downloading') : undefined}
                playLabel={t('listen.play', { name })}
                selected={item.resourceId === selectedId}
                status={statusFor(item, download?.status === 'failed')}
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
