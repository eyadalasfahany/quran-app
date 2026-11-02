import { usePlayerStore, type PlayerStatus, type PlayTarget } from '../playerStore';

/** The slice of the player the buffering ring reads: what was asked for, and what is loaded. */
export type StartState = {
  status: PlayerStatus;
  startingTarget: PlayTarget | null;
  reciterId: number | null;
  chapterId: number | null;
};

/**
 * Which play a button stands for. `target` matches the tap that started it. `loaded`, when given, matches the item
 * the player has loaded while its file is still loading, so the ring stays through the file load.
 */
export type StartMatch = {
  target: (target: PlayTarget) => boolean;
  loaded?: (state: StartState) => boolean;
};

/** An ayah's play button. Only the tap matches: the ayah is not loaded as an item of its own. */
export function verseMatch(verseKey: string | null): StartMatch {
  return { target: (target) => verseKey !== null && target.kind === 'verse' && target.verseKey === verseKey };
}

/** A reciter's row: its tap, or the reciter loading. */
export function reciterMatch(resourceId: number): StartMatch {
  return {
    target: (target) => target.kind === 'reciter' && target.resourceId === resourceId,
    loaded: (state) => state.reciterId === resourceId,
  };
}

/** A surah row on a reciter's page: its tap, or that surah loading. */
export function surahMatch(resourceId: number, chapterId: number): StartMatch {
  return {
    target: (target) => target.kind === 'surah' && target.resourceId === resourceId && target.chapterId === chapterId,
    loaded: (state) => state.reciterId === resourceId && state.chapterId === chapterId,
  };
}

/** A recent listen: its tap, or that listen loading. */
export function listenMatch(resourceId: number, chapterId: number): StartMatch {
  return {
    target: (target) => target.kind === 'listen' && target.resourceId === resourceId && target.chapterId === chapterId,
    loaded: (state) => state.reciterId === resourceId && state.chapterId === chapterId,
  };
}

/**
 * Whether a play button is starting. With no match, any start counts (the mini and full players). With a match, only
 * a start for that item counts. The loaded fallback applies only while the status is `loading`.
 */
export function isStartingFor(state: StartState, match?: StartMatch): boolean {
  if (match === undefined) {
    return state.startingTarget !== null || state.status === 'loading';
  }
  if (state.startingTarget !== null && match.target(state.startingTarget)) {
    return true;
  }
  return state.status === 'loading' && (match.loaded?.(state) ?? false);
}

/** The start state, subscribed once. Lists read it once and pass the result to each row with `isStartingFor`. */
export function useStartState(): StartState {
  const status = usePlayerStore((state) => state.status);
  const startingTarget = usePlayerStore((state) => state.startingTarget);
  const reciterId = usePlayerStore((state) => state.reciterId);
  const chapterId = usePlayerStore((state) => state.chapterId);
  return { chapterId, reciterId, startingTarget, status };
}

/** Whether a play button is starting, for one component (not inside a list's `map`). */
export function useIsStarting(match?: StartMatch): boolean {
  return isStartingFor(useStartState(), match);
}
