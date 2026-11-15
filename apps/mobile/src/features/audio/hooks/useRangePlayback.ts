import { useMemo, useState } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { verseKeyToId } from '@/features/reader/data/verses';

import { catalogueReciter, playRange } from '../play-verse';
import { pause, resume } from '../player';
import { rangePlayability, type RangePlayability } from '../range-availability';
import { usePlayerStore, type PlayerErrorCode } from '../playerStore';

import { rangeMatch, useIsStarting } from './useIsStarting';

/**
 * What a dua's play button shows (ADR 0092 decision 3). `idle`: a tap plays the range. `starting`: the tap is loading.
 * `playing` and `paused` are this range only. `unavailable`: the reciter cannot play the range (the button is disabled
 * with its hint). `error`: this button's last play failed.
 */
export type RangePlaybackState = 'idle' | 'starting' | 'playing' | 'paused' | 'unavailable' | 'error';

export type RangePlayback = {
  state: RangePlaybackState;
  /** The ayah being recited, when this range plays. Null for any other range, and when nothing plays. */
  activeVerseId: number | null;
  /** The code to show: the failed play's error, or why the range is unavailable. Null when there is nothing to show. */
  errorCode: PlayerErrorCode | null;
  /** Plays the range; pauses it while it plays; resumes it while it is paused. Does nothing while it starts or is unavailable. */
  toggle: () => void;
};

/** Verse keys to ids in the content database; null when a key is not there (the range then cannot play). */
function verseIds(fromKey: string | null, toKey: string | null): { fromId: number; toId: number } | null {
  if (fromKey === null || toKey === null) {
    return null;
  }
  try {
    const { executor } = openContentDb();
    const fromId = verseKeyToId(executor, fromKey);
    const toId = verseKeyToId(executor, toKey);
    return fromId === undefined || toId === undefined ? null : { fromId, toId };
  } catch {
    return null;
  }
}

/** The reciter a play would use, checked against the content database. An unopened database does not block the button. */
function playabilityOf(fromKey: string | null, toKey: string | null): RangePlayability {
  if (fromKey === null || toKey === null) {
    return 'invalid';
  }
  try {
    const { executor } = openContentDb();
    return rangePlayability(executor, catalogueReciter()?.resourceId ?? null, fromKey, toKey);
  } catch {
    return 'ok';
  }
}

/** The player's code for a range that cannot play. Not-recorded and invalid ends show the ayah-unavailable copy. */
function codeFor(playability: RangePlayability): PlayerErrorCode | null {
  switch (playability) {
    case 'no-reciter':
      return 'no-reciter';
    case 'surah-unavailable':
      return 'surah-unavailable';
    case 'no-timings':
      return 'no-timings';
    case 'not-recorded':
    case 'invalid':
      return 'invalid-verse';
    case 'ok':
    case 'not-installed':
      return null;
  }
}

/**
 * The play control of a verse range from a dua (ADR 0092 decision 3). It drives the Quran player, so the reciter, the
 * highlight and the stop at the range's end are the player's. `fromKey` and `toKey` are verse keys of one surah; null
 * for a dua that is not loaded yet.
 */
export function useRangePlayback(fromKey: string | null, toKey: string | null): RangePlayback {
  const status = usePlayerStore((state) => state.status);
  const rangePlay = usePlayerStore((state) => state.rangePlay);
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);
  const playerError = usePlayerStore((state) => state.error);
  const startingTarget = usePlayerStore((state) => state.startingTarget);
  const reciterId = usePlayerStore((state) => state.reciterId);
  // An empty key matches no start, so a dua that is not loaded never counts another play as its own.
  const starting = useIsStarting(rangeMatch(fromKey ?? '', toKey ?? ''));
  // The error shows only on the button that asked for the play, not on an error of another play.
  const [attempted, setAttempted] = useState(false);

  const ids = useMemo(() => verseIds(fromKey, toKey), [fromKey, toKey]);
  const playability = useMemo(
    () => playabilityOf(fromKey, toKey),
    // The reciter, the pack and the start of a play can change what the range needs, so they re-check it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fromKey, toKey, status, startingTarget, reciterId],
  );

  const own =
    rangePlay !== null && ids !== null && rangePlay.fromVerseId === ids.fromId && rangePlay.toVerseId === ids.toId;

  let state: RangePlaybackState = 'idle';
  if (starting || (own && status === 'loading')) {
    state = 'starting';
  } else if (own && status === 'playing') {
    state = 'playing';
  } else if (own && status === 'paused') {
    state = 'paused';
  } else if (attempted && status === 'error') {
    state = 'error';
  } else if (playability !== 'ok' && playability !== 'not-installed') {
    state = 'unavailable';
  }

  const errorCode = state === 'error' ? playerError : state === 'unavailable' ? codeFor(playability) : null;

  const toggle = () => {
    if (state === 'playing') {
      pause();
      return;
    }
    if (state === 'paused') {
      void resume();
      return;
    }
    if (state === 'starting' || state === 'unavailable' || fromKey === null || toKey === null) {
      return;
    }
    setAttempted(true);
    void playRange(fromKey, toKey);
  };

  return {
    state,
    activeVerseId: own ? activeVerseId : null,
    errorCode,
    toggle,
  };
}
