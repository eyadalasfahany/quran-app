import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useContentDb } from '@/core/db/content/open';
import { formatNumber } from '@/core/i18n';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui/UiText';

import { useDoneCountsByReciter } from '../data/downloads';
import { useReciterCatalogue } from '../hooks/useReciterCatalogue';
import { useReciterAvailabilityForSurah } from '../hooks/useReciterSurahAvailability';
import { currentReciterFirst, playerReciterRowState } from '../player-reciters';
import { recitationStyleKey, reciterInitial } from '../player-view';
import { usePlayerStore } from '../playerStore';
import {
  clearPendingPackPick,
  clearPendingPackPickFor,
  pickDownloadedReciter,
  pickInstalledReciter,
} from '../reciter-playback';
import { cancelReciterPack, useReciterDownloads } from '../reciter-downloads';
import { joinStatusLine, reciterDisplayName } from '../reciter-list';

import { PlayerReciterRow, type PlayerReciterRowState } from './PlayerReciterRow';
import { PlayerScrollView } from './PlayerScrollView';

// The frame's gap between the title and the rows, and between the rows' title and the list.
const LIST_GAP = 6;
const TITLE_INSET = 6;

// The «القرّاء» list under the player's options (quran-app-screens.html, #PlayerReciters). It composes the rows and
// wires them to the catalogue, the surah's availability and the pack downloads. Tapping an installed row selects him
// and moves playback to him at the current ayah; a download moves playback when it finishes (ADR 0062 decision 7).
// `scrollable` is true when the player fits the window: the list then scrolls inside
// its slot. Otherwise the whole player scrolls and the list takes its natural height.
export function PlayerReciterList({ scrollable }: { scrollable: boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const { ready } = useContentDb();
  const chapterId = usePlayerStore((state) => state.chapterId);
  const playerReciterId = usePlayerStore((state) => state.reciterId);
  const playing = usePlayerStore((state) => state.status === 'playing');
  const { reciters, selectedId } = useReciterCatalogue(ready);
  const availability = useReciterAvailabilityForSurah(
    reciters.map((reciter) => reciter.resourceId),
    chapterId,
  );
  const downloads = useReciterDownloads((state) => state.byId);
  const doneCounts = useDoneCountsByReciter();

  const currentId = playerReciterId ?? selectedId;
  const ordered = currentReciterFirst(reciters, currentId);

  // Leaving the player drops a download's pending switch (the user chose to leave; ADR 0062 decision 7).
  useEffect(() => () => {
    clearPendingPackPick();
  }, []);

  const rows = ordered.map((reciter, index) => {
    const isCurrent = reciter.resourceId === currentId;
    const download = downloads[reciter.resourceId];
    const state: PlayerReciterRowState = playerReciterRowState({
      availability: availability[reciter.resourceId] ?? 'unknown',
      downloading: download?.status === 'downloading',
      installed: reciter.installed,
      isCurrent,
    });
    const name = reciterDisplayName(reciter, locale, t('listen.unnamed'));
    const styleKey = recitationStyleKey(reciter.style);
    const downloaded = doneCounts[reciter.resourceId] ?? 0;

    // Status: the current reciter's «يُتلى الآن» while playing, the no-timings note, then the downloaded count.
    // A row without a pack says why it has no status beyond its download, and an unavailable row says the surah.
    const statusLabel = (() => {
      if (state === 'unavailable') {
        return t('player.reciters.unavailableForSurah');
      }
      if (state === 'downloading') {
        return t('ui.download.downloading');
      }
      if (state === 'notDownloaded') {
        return download?.status === 'failed' ? t('ui.download.failed') : t('player.reciters.notDownloaded');
      }
      return joinStatusLine([
        isCurrent && playing ? t('player.nowPlaying') : null,
        reciter.installed && !reciter.hasTimings ? t('listen.noFollow') : null,
        downloaded > 0 ? t('listen.downloadedSurahs', { count: downloaded, n: formatNumber(downloaded, locale) }) : null,
      ]);
    })();

    return (
      <PlayerReciterRow
        key={reciter.resourceId}
        letter={reciterInitial(name)}
        name={name}
        onCancel={() => {
          clearPendingPackPickFor(reciter.resourceId);
          cancelReciterPack(reciter.resourceId);
        }}
        onDownload={() => {
          void pickDownloadedReciter(reciter.resourceId);
        }}
        onSelect={() => {
          void pickInstalledReciter(reciter.resourceId);
        }}
        playing={isCurrent && playing}
        progress={download?.status === 'downloading' ? download.progress : 0}
        showDivider={index < ordered.length - 1}
        state={state}
        statusLabel={statusLabel}
        styleLabel={state === 'unavailable' || styleKey === null ? null : t(styleKey)}
        testID={`player-reciter-${reciter.resourceId}`}
      />
    );
  });

  const title = (
    <UiText
      accessibilityRole="header"
      style={{ color: theme.colors.playerMuted, marginHorizontal: TITLE_INSET }}
      variant="caption"
      weight={500}
    >
      {t('player.reciters.title')}
    </UiText>
  );

  return (
    <View
      style={{ flex: scrollable ? 1 : undefined, gap: LIST_GAP, minHeight: scrollable ? 0 : undefined }}
      testID="player-reciters"
    >
      {title}
      {scrollable ? (
        <PlayerScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ flex: 1, minHeight: 0 }}
          testID="player-reciters-scroll"
        >
          {rows}
        </PlayerScrollView>
      ) : (
        <View>{rows}</View>
      )}
    </View>
  );
}
