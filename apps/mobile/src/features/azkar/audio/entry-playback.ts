import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';

import { listRecordingsForItems } from '../data/content-repository';
import type { AzkarRecording } from '../data/model';
import { periodKey, scopeKeyForEntry } from '../data/progress';
import type { ReaderUnit } from '../data/reader-units';
import { azkarHref } from '../routes';
import { audioAvailability, isPlayableAvailability } from './availability';
import { currentAzkarItem, useAzkarPlayerStore } from './azkarPlayerStore';
import { useIsDownloaded, useOnline } from './hooks';
import { azkarDownloadPort } from './port';
import { buildAzkarQueue, queueStartIndex, repetitionOf } from './queue';
import { recordingForUnit } from './recording-for-unit';
import { pauseAzkarPlayback, resumeAzkarPlayback, skipAzkarPlayback, stopAzkarPlayback } from './playback';
import { startAzkarPlayback } from './start';

/**
 * The play and pause control of one entry, as the Azkar reader draws it (ADR 0031 §8, ADR 0092 decision 3). `playing`
 * and `loading` select the pause glyph.
 */
export type AzkarEntryPlayControl = { playing: boolean; loading: boolean; onToggle: () => void };

/** The props of the player bar while an entry's audio is loaded (playing, loading or paused). */
export type AzkarEntryPlayerBar = {
  playing: boolean;
  positionMs: number;
  durationMs: number;
  repetition: { current: number; total: number } | null;
  canPrevious: boolean;
  canNext: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpen: () => void;
};

/** What a single-entry screen draws for its audio. */
export type AzkarEntryPlayback = {
  /** The entry's recording, or null. Null draws no download control and no play control. */
  recording: AzkarRecording | null;
  /** Play and pause, or null: no recording, or the recording needs the network while the device is offline. */
  playControl: AzkarEntryPlayControl | null;
  /** The recording needs the network and the device is offline and it is not downloaded: draw the offline pill. */
  offline: boolean;
  /** The player bar while this entry's audio is loaded; null otherwise. */
  bar: AzkarEntryPlayerBar | null;
};

/** The recordings of the items, read from `content.db`. A database error reads as no recording, never as a crash. */
function readRecordings(itemIds: readonly number[]): AzkarRecording[] {
  if (itemIds.length === 0) {
    return [];
  }
  try {
    const { executor } = openContentDb();
    return listRecordingsForItems(executor, itemIds);
  } catch {
    return [];
  }
}

/**
 * The audio of one Azkar entry shown outside the Azkar reader, such as a Hisn dua in Duas (ADR 0092 decision 3). It plays
 * the entry through `azkarPlayerStore` with the same queue, counting and offline rules as the Azkar reader, so a dua
 * plays exactly as it would from Azkar. Only this module and `features/azkar/index.ts` are the public way in.
 *
 * Leaving the entry (its key changes or the screen unmounts) stops its playback, as the Azkar reader does.
 */
export function useAzkarEntryPlayback({
  entryKey,
  units,
  title,
}: {
  entryKey: string;
  units: readonly ReaderUnit[];
  /** The title the player shows (the lock screen and the player sheet). */
  title: string;
}): AzkarEntryPlayback {
  // The catalogue revision re-reads the recordings after an import.
  const catalogRevision = useCatalogVersion((state) => state.version);
  const itemIds = useMemo(
    () => units.flatMap((unit) => [...unit.preface, ...unit.body, ...unit.afterword].map((item) => item.id)),
    [units],
  );
  // Read once per entry, not per render.
  const recordings = useMemo(
    () => readRecordings(itemIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemIds, catalogRevision],
  );
  const queue = useMemo(
    () => buildAzkarQueue(units, (unit) => recordingForUnit(recordings, unit.body.map((item) => item.id))),
    [units, recordings],
  );
  // One entry has one recording; the first queue item carries it.
  const recording = queue[0]?.recording ?? null;

  const scopeKey = scopeKeyForEntry(entryKey);
  const online = useOnline();
  const downloaded = useIsDownloaded(recording, azkarDownloadPort);
  const availability = audioAvailability(recording, { online, downloaded });

  // The player is read by selector: the position is read by the bar, which is drawn only while this entry plays.
  const playerScope = useAzkarPlayerStore((state) => state.scope);
  const playerQueue = useAzkarPlayerStore((state) => state.queue);
  const playerIndex = useAzkarPlayerStore((state) => state.index);
  const playerStatus = useAzkarPlayerStore((state) => state.status);
  const positionMs = useAzkarPlayerStore((state) => state.positionMs);
  const durationMs = useAzkarPlayerStore((state) => state.durationMs);
  const countAtStart = useAzkarPlayerStore((state) => state.countAtStart);
  const playsDone = useAzkarPlayerStore((state) => state.playsDone);

  // Leaving this entry (another key, or unmount) stops its playback, so no audio plays from a screen the person left.
  useEffect(
    () => () => {
      if (useAzkarPlayerStore.getState().scope?.scopeKey === scopeKey) {
        stopAzkarPlayback();
      }
    },
    [scopeKey],
  );

  const engineOn = playerScope?.scopeKey === scopeKey && playerStatus !== 'idle';
  const item = engineOn ? currentAzkarItem({ queue: playerQueue, index: playerIndex }) : null;

  const onToggle = () => {
    if (engineOn) {
      if (playerStatus === 'playing' || playerStatus === 'loading') {
        pauseAzkarPlayback();
      } else {
        resumeAzkarPlayback();
      }
      return;
    }
    const index = queueStartIndex(queue, 0);
    if (index < 0) {
      return;
    }
    startAzkarPlayback({
      scope: { scopeKey, periodKey: periodKey('session', new Date()), title },
      queue,
      index,
      port: azkarDownloadPort,
    });
  };

  const playable = recording !== null && (engineOn || isPlayableAvailability(availability));

  return {
    recording,
    playControl: playable
      ? { playing: engineOn && playerStatus === 'playing', loading: engineOn && playerStatus === 'loading', onToggle }
      : null,
    offline: !engineOn && availability === 'stream_offline',
    bar:
      engineOn && item !== null
        ? {
            playing: playerStatus === 'playing',
            positionMs,
            durationMs,
            repetition: repetitionOf(item.requiredCount, countAtStart, playsDone),
            canPrevious: playerQueue.length > 0,
            canNext: playerIndex + 1 < playerQueue.length,
            onToggle,
            onPrevious: () => skipAzkarPlayback(-1),
            onNext: () => skipAzkarPlayback(1),
            onOpen: () => {
              router.push(azkarHref.player);
            },
          }
        : null,
  };
}
