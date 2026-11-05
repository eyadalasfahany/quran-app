import { openContentDb } from '@/core/db/content/open';
import { resolveInitialAnchor } from '../reader/anchor/reading-anchor';
import { surahAvailability } from './data/surah-availability';
import { playChapter, playFromVerse, resume, switchReciter, type SwitchOutcome } from './player';
import { usePlayerStore } from './playerStore';
import { getReciterId, setReciterId } from './settings';
import { downloadReciterPack } from './reciter-downloads';

/** The app's one current ayah (ADR 0046): the verse key the reader last showed or the player followed. */
export function currentAyahKey(): string {
  return resolveInitialAnchor().verseKey;
}

// The installed-later reciter whose download is waiting to switch playback to him (ADR 0062 decision 7, Q12). Only the
// latest pick counts: a pick replaced, cleared, or cancelled before its download ends does not switch.
let pendingPackPick: number | null = null;

/** Drops the pending pick (the player list closed, or the user chose another reciter). */
export function clearPendingPackPick(): void {
  pendingPackPick = null;
}

/**
 * Starting playback with another reciter cancels a pending pick for a different one (decided Q12): the download keeps
 * running, only the auto-switch is dropped. A pick for the same reciter stays.
 */
function cancelPendingPickForOther(resourceId: number): void {
  if (pendingPackPick !== null && pendingPackPick !== resourceId) {
    pendingPackPick = null;
  }
}

/** Drops the pending pick only when it is for this reciter (the download was cancelled). */
export function clearPendingPackPickFor(resourceId: number): void {
  if (pendingPackPick === resourceId) {
    pendingPackPick = null;
  }
}

// Pausing or stopping cancels a pending pick: a download that ends after playback stopped does not start it.
usePlayerStore.subscribe((state, previous) => {
  if (state.status !== previous.status && (state.status === 'paused' || state.status === 'idle' || state.status === 'error')) {
    pendingPackPick = null;
  }
});

function isPlayingOrLoading(): boolean {
  const { status } = usePlayerStore.getState();
  return status === 'playing' || status === 'loading';
}

/**
 * Plays a reciter from the current ayah (ADR 0046): `reader.lastVerseKey`, the one ayah the app has. A pack that
 * isn't installed is installed first; if that fails, nothing changes. A reciter already playing or loading is kept
 * as it is. Otherwise the reciter starts the current ayah from its start, even when that ayah is the paused one.
 */
export async function playReciter(resourceId: number, installed: boolean): Promise<void> {
  cancelPendingPickForOther(resourceId);
  const store = usePlayerStore.getState();
  store.beginStarting({ kind: 'reciter', resourceId });
  const current = usePlayerStore.getState();
  if (current.reciterId === resourceId && (current.status === 'playing' || current.status === 'loading')) {
    current.clearStarting();
    return;
  }
  if (!installed && !(await downloadReciterPack(resourceId))) {
    store.clearStarting();
    return;
  }
  setReciterId(resourceId);
  await playFromVerse(currentAyahKey());
}

/**
 * Plays a recent listen: its reciter, from the saved position of its surah (Home's «آخر ما استمعت إليه»). The listen's
 * reciter becomes the selected one (ADR 0062 decision 7). An uninstalled pack is installed first; if that fails,
 * nothing changes.
 */
export async function playRecentListen(
  listen: { reciterResourceId: number; chapterId: number; lastPositionMs: number },
  installed: boolean,
): Promise<void> {
  cancelPendingPickForOther(listen.reciterResourceId);
  const store = usePlayerStore.getState();
  store.beginStarting({ kind: 'listen', resourceId: listen.reciterResourceId, chapterId: listen.chapterId });
  // The surah already loaded with this reciter is not restarted at the saved position, which can be up to
  // 15 s behind: playing stays as it is, and paused resumes where it stopped.
  const current = usePlayerStore.getState();
  if (current.reciterId === listen.reciterResourceId && current.chapterId === listen.chapterId) {
    if (current.status === 'paused') {
      setReciterId(listen.reciterResourceId);
      await resume();
      return;
    }
    if (current.status === 'playing' || current.status === 'loading') {
      setReciterId(listen.reciterResourceId);
      current.clearStarting();
      return;
    }
  }
  if (!installed && !(await downloadReciterPack(listen.reciterResourceId))) {
    store.clearStarting();
    return;
  }
  setReciterId(listen.reciterResourceId);
  await playChapter(listen.chapterId, listen.lastPositionMs);
}

/**
 * Plays one surah from a reciter, for the reciter's download page. The page installs the pack before it lists the
 * surahs, so nothing is installed here. When the current ayah (ADR 0046) is in this surah it plays from that ayah,
 * otherwise from the surah's start (ADR 0062, decided Q9).
 */
export async function playSurahFromReciter(resourceId: number, chapterId: number): Promise<void> {
  cancelPendingPickForOther(resourceId);
  usePlayerStore.getState().beginStarting({ kind: 'surah', resourceId, chapterId });
  setReciterId(resourceId);
  const key = currentAyahKey();
  if (Number(key.split(':')[0]) === chapterId) {
    await playFromVerse(key);
    return;
  }
  await playChapter(chapterId);
}

/**
 * Moves the loaded surah to `resourceId` at the current ayah (ADR 0062 decision 6). The buffering ring shows while audio
 * is due to start, and is cleared when it does not start.
 */
async function moveToReciter(resourceId: number, autoplay: boolean): Promise<SwitchOutcome> {
  if (autoplay || isPlayingOrLoading()) {
    usePlayerStore.getState().beginStarting({ kind: 'reciter', resourceId });
  }
  const outcome = await switchReciter(resourceId, { autoplay });
  if (!isPlayingOrLoading()) {
    usePlayerStore.getState().clearStarting();
  }
  return outcome;
}

/**
 * Makes a reciter the selected one (ADR 0062 decision 7). Nothing plays on its own: only the choice is saved. When
 * another reciter is playing or loading and this pack is installed, playback moves to him at the start of the
 * current ayah and keeps playing. Selecting the reciter who is already playing does nothing. Uninstalled while
 * another plays, his pack downloads at once and playback moves to him when it finishes, unless the pick was cancelled
 * meanwhile (decided Q12). A failed download keeps the current playback, and the selection reverts to the reciter
 * still playing (unless the user picked another one meanwhile).
 */
export async function selectReciter(resourceId: number, installed: boolean): Promise<void> {
  clearPendingPackPick();
  const playing = isPlayingOrLoading();
  if (playing && usePlayerStore.getState().reciterId === resourceId) {
    return;
  }
  setReciterId(resourceId);
  if (installed) {
    if (playing || usePlayerStore.getState().status === 'paused') {
      await moveToReciter(resourceId, false);
    }
    return;
  }
  if (!playing) {
    return;
  }
  pendingPackPick = resourceId;
  const installedOk = await downloadReciterPack(resourceId);
  if (pendingPackPick !== resourceId) {
    return;
  }
  pendingPackPick = null;
  if (!installedOk) {
    // The failed reciter was saved before the download (decided Q12): the selection goes back to the one still playing.
    const playingId = usePlayerStore.getState().reciterId;
    if (playingId !== null && getReciterId() === resourceId) {
      setReciterId(playingId);
    }
    return;
  }
  if (!isPlayingOrLoading()) {
    return;
  }
  await moveToReciter(resourceId, false);
}

/** The player's list and the Listen tab's row: an installed reciter is selected (and playback moves to him). */
export function pickInstalledReciter(resourceId: number): Promise<void> {
  return selectReciter(resourceId, true);
}

/**
 * The player's list download button: installs the pack, then plays from the current ayah with him (decision 5: a
 * finished download always auto-plays). Nothing switches when the pick was replaced or cleared meanwhile, or when the
 * installed pack has no file for the surah (the row then shows the surah as unavailable).
 */
export async function pickDownloadedReciter(resourceId: number): Promise<void> {
  pendingPackPick = resourceId;
  const installedOk = await downloadReciterPack(resourceId);
  if (pendingPackPick !== resourceId) {
    return;
  }
  pendingPackPick = null;
  if (!installedOk) {
    return;
  }
  const { chapterId } = usePlayerStore.getState();
  if (chapterId === null) {
    await playReciter(resourceId, true);
    return;
  }
  if (surahAvailability(openContentDb().executor, resourceId, chapterId) === 'unavailable') {
    return;
  }
  await moveToReciter(resourceId, true);
}
