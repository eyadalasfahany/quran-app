import {
  createAudioPlaylist,
  setAudioModeAsync,
  type AudioMetadata,
  type AudioPlaylist,
  type AudioPlaylistStatus,
} from 'expo-audio';
import { AppState, Image } from 'react-native';

import appIcon from '../../../assets/images/icon.png';
import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { getLocale } from '@/core/i18n/locale';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';

import { activeTimingIndex, activeWordPosition } from './active-ayah';
import { chapterAudio, type ChapterAudio } from './data/audio-files';
import { listReciters, recitationIdForResource } from './data/reciters';
import { timingsFor, type AyahTiming } from './data/timings';
import { clampSeek, isChapterId, usePlayerStore, type PlayerErrorCode } from './playerStore';
import { readLastPosition, writeLastPosition } from './resume-model';
import { getReciterId } from './settings';
import { defaultReciterId, resolveReciterId } from './settings-model';

// One expo-audio AudioPlaylist per reciter: the reciter's surah files in surah order, so the lock screen
// gets next and previous surah and surahs follow each other. Audio URLs come only from chapter_audio_files
// (ADR 0008); this module makes no other network calls.

// Interruption `doNotMix` is what lock-screen controls need (expo-audio's setActiveForLockScreen note).
const AUDIO_MODE = {
  allowsRecording: false,
  interruptionMode: 'doNotMix',
  playsInSilentMode: true,
  shouldPlayInBackground: true,
} as const;

// expo-audio reports no load failure: a bad URL or a 404 leaves isLoaded false forever. A track that has not
// loaded this long after it was asked to play has failed.
const LOAD_TIMEOUT_MS = 10_000;
// Offline, iOS skips past a track that never loaded about 15 s after play (spike, 29 Oct 2026). A skip sooner
// than this is a person (lock-screen next or previous), not that failure; the watchdog still covers the new track.
const OFFLINE_SKIP_MIN_MS = 5_000;
// A last track this close to its end, and not playing, counts as finished.
const END_TOLERANCE_S = 0.5;
const LOCK_SCREEN_CONTROLS = { showNextTrack: true, showPreviousTrack: true } as const;
// The status tick. The recited ayah must follow the audio within 150 ms (spec §12), so the tick is 100 ms.
const STATUS_INTERVAL_MS = 100;
// The player reports the position it decodes, which is heard a little later (the output buffer, the speaker or
// Bluetooth route), and QF's word segments start slightly before the word is heard (Afasy 1:2: 6,025 against the
// ayah's 6,090). So the highlight looks up a moment earlier than the reported position. Seeking stays exact.
// Tuned on the iPhone 17 simulator; raise it if the highlight still leads the voice.
export const HIGHLIGHT_LAG_MS = 100;

type Subscription = { remove: () => void };

type Queue = {
  reciterId: number;
  playlist: AudioPlaylist;
  /** The surah for each playlist index. Surahs with no audio row for this reciter are not in the playlist. */
  chapterIds: number[];
};

let queue: Queue | null = null;
let queueSubscriptions: Subscription[] = [];
// The surah whose file is in the playlist at its current index, or null when the player holds nothing we can resume.
let loadedChapterId: number | null = null;
// The playlist index that last reported isLoaded, or null since the last track change.
let loadedIndex: number | null = null;
// The index the engine asked for last. A trackChanged to this index came from us; any other came from the system.
let intendedIndex: number | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let watchedIndex: number | null = null;
// When the watched track was asked to play, for telling the offline skip from a quick lock-screen skip.
let watchedSince = 0;
// Bumped by every load and stop, so a load that was overtaken never starts playback.
let loadSequence = 0;
let audioModeReady: Promise<void> | null = null;
let appStateSubscription: Subscription | null = null;
// The surah now playing and its timings, sorted by start (empty when its file has none). The highlight and
// the ayah navigation read them.
let trackTimings: { chapterId: number; timings: AyahTiming[] } | null = null;
// Timings per audio file id, read once for the session.
const timingsCache = new Map<number, AyahTiming[]>();

const store = () => usePlayerStore.getState();

function contentDb(): SqlExecutor {
  return openContentDb().executor;
}

/** The reciter to play when the caller gives none: the saved choice, resolved against what is installed. */
function currentReciterId(db: SqlExecutor): number | null {
  const reciters = listReciters(db);
  return resolveReciterId(getReciterId(), reciters, defaultReciterId(reciters));
}

function reciterFor(state: { reciterId: number | null }): number | null {
  return state.reciterId ?? currentReciterId(contentDb());
}

type AudioLookup = { audio: ChapterAudio } | { error: PlayerErrorCode };

function lookupAudio(db: SqlExecutor, reciterId: number, chapterId: number): AudioLookup {
  const recitationId = recitationIdForResource(db, reciterId);
  const audio = recitationId === undefined ? undefined : chapterAudio(db, recitationId, chapterId);
  return audio === undefined ? { error: 'not-installed' } : { audio };
}

/** The content row's duration: only a placeholder until the loaded track reports its own. */
function rowDurationMs(db: SqlExecutor, reciterId: number, chapterId: number): number {
  const lookup = lookupAudio(db, reciterId, chapterId);
  return 'audio' in lookup ? lookup.audio.durationMs : 0;
}

function appIconUrl(): string | undefined {
  return Image.resolveAssetSource(appIcon)?.uri;
}

function lockScreenMetadata(db: SqlExecutor, reciterId: number, chapterId: number): AudioMetadata {
  const arabic = getLocale() === 'ar';
  const chapter = getChapter(db, chapterId);
  const reciter = listReciters(db).find((row) => row.resourceId === reciterId);
  const reciterName = reciter === undefined ? undefined : (arabic ? reciter.nameAr : reciter.name) ?? reciter.nameAr ?? reciter.name ?? undefined;
  return {
    title: chapter === undefined ? undefined : arabic ? chapter.nameArabic : chapter.nameEn,
    artist: reciterName,
    artworkUrl: appIconUrl(),
  };
}

function ensureAudioMode(): Promise<void> {
  audioModeReady ??= setAudioModeAsync(AUDIO_MODE).catch((error: unknown) => {
    console.warn('Audio mode was not set. Playback may stop in the background.', error);
  });
  return audioModeReady;
}

/** Tears down the playlist and its listeners, and forgets which track it had loaded. */
function disposeQueue(): void {
  clearWatchdog();
  for (const subscription of queueSubscriptions) {
    subscription.remove();
  }
  queueSubscriptions = [];
  if (queue !== null) {
    queue.playlist.pause();
    queue.playlist.destroy();
  }
  queue = null;
  loadedChapterId = null;
  loadedIndex = null;
  intendedIndex = null;
  trackTimings = null;
}

/**
 * The playlist for `reciterId`, reused while the reciter is unchanged and rebuilt when it changes. Undefined
 * when the reciter's recitation is not installed.
 */
function ensureQueue(db: SqlExecutor, reciterId: number): Queue | undefined {
  if (queue !== null && queue.reciterId === reciterId) {
    return queue;
  }
  const recitationId = recitationIdForResource(db, reciterId);
  if (recitationId === undefined) {
    return undefined;
  }
  // One file per surah, in surah order. Like chapterAudio, the lowest id wins when a surah has two rows.
  const rows = db.all<{ chapterId: number; url: string }>(
    `SELECT chapter_id AS chapterId, audio_url AS url
     FROM chapter_audio_files
     WHERE recitation_id = ?
     ORDER BY chapter_id, id`,
    [recitationId],
  );
  const chapterIds: number[] = [];
  const sources: { uri: string }[] = [];
  for (const row of rows) {
    if (chapterIds.at(-1) === row.chapterId) {
      continue;
    }
    chapterIds.push(row.chapterId);
    sources.push({ uri: row.url });
  }
  disposeQueue();
  // A playlist for another reciter has no recited ayah until its first status update.
  store().setActive(null, null);
  const playlist = createAudioPlaylist({ sources, updateInterval: STATUS_INTERVAL_MS });
  playlist.playbackRate = store().speed;
  playlist.volume = store().volume;
  queueSubscriptions = [
    playlist.addListener('playlistStatusUpdate', onPlaylistStatus),
    playlist.addListener('trackChanged', onTrackChanged),
  ];
  queue = { reciterId, playlist, chapterIds };
  appStateSubscription ??= AppState.addEventListener('change', (next) => {
    if (next === 'background') {
      saveResumeState();
    }
  });
  return queue;
}

/** The timings of a surah's file for this reciter, read once per audio file. Empty when it has none. */
function timingsForChapter(db: SqlExecutor, reciterId: number, chapterId: number): AyahTiming[] {
  const lookup = lookupAudio(db, reciterId, chapterId);
  if (!('audio' in lookup)) {
    return [];
  }
  const cached = timingsCache.get(lookup.audio.id);
  if (cached !== undefined) {
    return cached;
  }
  const timings = timingsFor(db, lookup.audio.id);
  timingsCache.set(lookup.audio.id, timings);
  return timings;
}

/** Loads the timings of the surah that has just started playing. */
function setTrackTimings(db: SqlExecutor, reciterId: number, chapterId: number): void {
  trackTimings = { chapterId, timings: timingsForChapter(db, reciterId, chapterId) };
}

/** Highlights the ayah and word at `positionMs` of the surah now playing. */
function updateHighlight(chapterId: number, reportedMs: number): void {
  const positionMs = Math.max(0, reportedMs - HIGHLIGHT_LAG_MS);
  const timings = trackTimings?.chapterId === chapterId ? trackTimings.timings : [];
  const index = activeTimingIndex(timings, positionMs);
  const timing = index < 0 ? undefined : timings[index];
  store().setActive(timing?.verseId ?? null, timing === undefined ? null : activeWordPosition(timing, positionMs));
}

/** The playlist, when it is holding `chapterId` at its current index. */
function activeQueue(chapterId: number): Queue | null {
  if (queue === null || loadedChapterId !== chapterId) {
    return null;
  }
  return queue.chapterIds[queue.playlist.currentIndex] === chapterId ? queue : null;
}

/** The surah before or after `chapterId` that this reciter has a file for, or null. */
function neighbourChapter(db: SqlExecutor, reciterId: number, chapterId: number, direction: 1 | -1): number | null {
  const chapterIds = ensureQueue(db, reciterId)?.chapterIds ?? [];
  if (direction === 1) {
    return chapterIds.find((id) => id > chapterId) ?? null;
  }
  return [...chapterIds].reverse().find((id) => id < chapterId) ?? null;
}

function currentPositionMs(): number {
  const state = store();
  if (queue !== null && loadedChapterId === state.chapterId) {
    return Math.round(queue.playlist.currentTime * 1000);
  }
  return state.positionMs;
}

function saveResumeState(): void {
  const state = store();
  if (state.chapterId === null || !['loading', 'playing', 'paused'].includes(state.status)) {
    return;
  }
  writeLastPosition({ reciterId: state.reciterId, chapterId: state.chapterId, positionMs: currentPositionMs() });
}

function clearWatchdog(): void {
  if (watchdog !== null) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

/** Fails the load if the track at `index` has not reported isLoaded 10 s after playback was asked for. */
function startWatchdog(index: number): void {
  clearWatchdog();
  const active = queue;
  if (active === null) {
    return;
  }
  watchedIndex = index;
  watchedSince = Date.now();
  watchdog = setTimeout(() => {
    watchdog = null;
    if (queue !== active || loadedIndex === index) {
      return;
    }
    const current = store();
    if (current.status !== 'playing' && current.status !== 'loading') {
      return;
    }
    active.playlist.pause();
    current.markFailed('load-failed');
  }, LOAD_TIMEOUT_MS);
}

function startPlayback(active: Queue, index: number): void {
  active.playlist.play();
  startWatchdog(index);
}

function isFinishedLastTrack(status: AudioPlaylistStatus): boolean {
  return (
    status.didJustFinish ||
    (!status.playing && status.isLoaded && status.duration > 0 && status.currentTime >= status.duration - END_TOLERANCE_S)
  );
}

function onPlaylistStatus(status: AudioPlaylistStatus): void {
  const active = queue;
  if (active === null) {
    return;
  }
  if (status.isLoaded) {
    loadedIndex = status.currentIndex;
    if (status.currentIndex === watchedIndex) {
      clearWatchdog();
    }
  }
  const current = store();
  const chapterId = active.chapterIds[status.currentIndex];
  const onCurrent = chapterId !== undefined && chapterId === current.chapterId;
  if (current.status === 'idle' || current.status === 'error' || !onCurrent) {
    return;
  }
  // The loaded track's own duration replaces the content row's placeholder.
  if (status.isLoaded && status.duration > 0) {
    current.setDuration(Math.round(status.duration * 1000));
  }
  if ((current.status === 'playing' || current.status === 'paused') && status.currentIndex === active.chapterIds.length - 1 && isFinishedLastTrack(status)) {
    stopPlayback();
    return;
  }
  if (status.isLoaded && chapterId !== undefined) {
    updateHighlight(chapterId, Math.round(status.currentTime * 1000));
  }
  if (current.status === 'playing' || current.status === 'paused') {
    current.setPosition(Math.round(status.currentTime * 1000));
  }
  if (status.playing) {
    if (current.status === 'loading' || current.status === 'paused') {
      current.markPlaying();
    }
    return;
  }
  // The system paused playback (lock screen, headphones, another app).
  if (current.status === 'playing') {
    current.markPaused();
    saveResumeState();
  }
}

function onTrackChanged({ previousIndex, currentIndex }: { previousIndex: number; currentIndex: number }): void {
  const active = queue;
  if (active === null) {
    return;
  }
  const fromUs = intendedIndex === currentIndex;
  const previousLoaded = loadedIndex === previousIndex;
  const stuckLongEnough = watchedIndex === previousIndex && Date.now() - watchedSince >= OFFLINE_SKIP_MIN_MS;
  intendedIndex = null;
  loadedIndex = null;
  const before = store();
  if (!fromUs && !previousLoaded && stuckLongEnough && (before.status === 'playing' || before.status === 'loading')) {
    // The system moved on past a track that never loaded (offline). Stop on that track rather than
    // letting the queue run through the rest of the surahs.
    clearWatchdog();
    store().markFailed('load-failed');
    active.playlist.pause();
    intendedIndex = previousIndex;
    active.playlist.skipTo(previousIndex);
    return;
  }
  const chapterId = active.chapterIds[currentIndex];
  if (chapterId === undefined) {
    return;
  }
  const db = contentDb();
  store().moveTo({ chapterId, durationMs: rowDurationMs(db, active.reciterId, chapterId) });
  loadedChapterId = chapterId;
  setTrackTimings(db, active.reciterId, chapterId);
  active.playlist.updateLockScreenMetadata(lockScreenMetadata(db, active.reciterId, chapterId));
  writeLastPosition({ reciterId: active.reciterId, chapterId, positionMs: 0 });
  const status = store().status;
  if (status === 'playing' || status === 'loading') {
    startWatchdog(currentIndex);
  }
}

async function guarded(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.warn('Audio action failed.', error);
    store().markFailed('load-failed');
  }
}

function stopPlayback(): void {
  loadSequence += 1;
  clearWatchdog();
  queue?.playlist.pause();
  store().markStopped();
}

async function loadChapter(chapterId: number, positionMs: number, reciterId: number | null): Promise<void> {
  loadSequence += 1;
  const sequence = loadSequence;
  if (!isChapterId(chapterId)) {
    store().markFailed('invalid-chapter');
    return;
  }
  if (reciterId === null) {
    store().markFailed('no-reciter');
    return;
  }
  const db = contentDb();
  const lookup = lookupAudio(db, reciterId, chapterId);
  if ('error' in lookup) {
    store().markFailed(lookup.error);
    return;
  }
  store().beginLoad({ reciterId, chapterId, positionMs, durationMs: lookup.audio.durationMs });
  try {
    await ensureAudioMode();
    if (sequence !== loadSequence) {
      return;
    }
    const active = ensureQueue(db, reciterId);
    const index = active?.chapterIds.indexOf(chapterId) ?? -1;
    if (active === undefined || index < 0) {
      store().markFailed('not-installed');
      return;
    }
    active.playlist.setActiveForLockScreen(true, lockScreenMetadata(db, reciterId, chapterId), LOCK_SCREEN_CONTROLS);
    if (active.playlist.currentIndex !== index) {
      intendedIndex = index;
      active.playlist.skipTo(index);
    }
    loadedChapterId = chapterId;
    setTrackTimings(db, reciterId, chapterId);
    if (positionMs > 0) {
      await active.playlist.seekTo(positionMs / 1000);
      if (sequence !== loadSequence) {
        return;
      }
    }
    startPlayback(active, index);
  } catch (error) {
    console.warn('Audio file did not load.', error);
    if (sequence === loadSequence) {
      loadedChapterId = null;
      clearWatchdog();
      store().markFailed('load-failed');
    }
  }
}

/** Plays a surah from `fromMs` with the saved reciter (or the default one). */
export function playChapter(chapterId: number, fromMs = 0): Promise<void> {
  return guarded(async () => {
    await loadChapter(chapterId, fromMs, currentReciterId(contentDb()));
  });
}

/** Plays from the start of an ayah: its surah file, seeked to the ayah's start. With no timings, from 0. */
export function playFromVerse(verseKey: string): Promise<void> {
  return guarded(async () => {
    const db = contentDb();
    const verse = getVerseByKey(db, verseKey);
    if (verse === undefined) {
      store().markFailed('invalid-verse');
      return;
    }
    const reciterId = currentReciterId(db);
    if (reciterId === null) {
      store().markFailed('no-reciter');
      return;
    }
    const lookup = lookupAudio(db, reciterId, verse.chapterId);
    if ('error' in lookup) {
      store().markFailed(lookup.error);
      return;
    }
    const timing = timingsForChapter(db, reciterId, verse.chapterId).find((row) => row.verseId === verse.id);
    await loadChapter(verse.chapterId, timing?.startMs ?? 0, reciterId);
  });
}

/**
 * Seeks to the start of the ayah before the one being recited. From the first ayah it goes to the last ayah of
 * the surah before, and from the first surah's first ayah it starts again. With no timings for this surah it
 * does what `previousSurah` does.
 */
export function previousAyah(): Promise<void> {
  return guarded(async () => {
    const state = store();
    if (state.chapterId === null) {
      return;
    }
    const reciterId = reciterFor(state);
    if (reciterId === null) {
      store().markFailed('no-reciter');
      return;
    }
    const db = contentDb();
    const timings = timingsForChapter(db, reciterId, state.chapterId);
    if (timings.length === 0) {
      await previousSurah();
      return;
    }
    const index = activeTimingIndex(timings, currentPositionMs());
    const before = index > 0 ? timings[index - 1] : undefined;
    if (before !== undefined) {
      await jumpTo(state.chapterId, before.startMs, reciterId);
      return;
    }
    const previous = neighbourChapter(db, reciterId, state.chapterId, -1);
    if (previous === null) {
      await jumpTo(state.chapterId, 0, reciterId);
      return;
    }
    await loadChapter(previous, timingsForChapter(db, reciterId, previous).at(-1)?.startMs ?? 0, reciterId);
  });
}

/**
 * Seeks to the start of the ayah after the one being recited. From the last ayah it goes to the first ayah of
 * the next surah, and after the last surah it stops. With no timings for this surah it does what `nextSurah` does.
 */
export function nextAyah(): Promise<void> {
  return guarded(async () => {
    const state = store();
    if (state.chapterId === null) {
      return;
    }
    const reciterId = reciterFor(state);
    if (reciterId === null) {
      store().markFailed('no-reciter');
      return;
    }
    const db = contentDb();
    const timings = timingsForChapter(db, reciterId, state.chapterId);
    if (timings.length === 0) {
      await nextSurah();
      return;
    }
    const after = timings[activeTimingIndex(timings, currentPositionMs()) + 1];
    if (after !== undefined) {
      await jumpTo(state.chapterId, after.startMs, reciterId);
      return;
    }
    const following = neighbourChapter(db, reciterId, state.chapterId, 1);
    if (following === null) {
      stopPlayback();
      return;
    }
    await loadChapter(following, timingsForChapter(db, reciterId, following)[0]?.startMs ?? 0, reciterId);
  });
}

/** Plays `chapterId` from `positionMs`: a seek when that surah is loaded, a load of its file otherwise. */
async function jumpTo(chapterId: number, positionMs: number, reciterId: number): Promise<void> {
  if (activeQueue(chapterId) !== null) {
    seek(positionMs);
    return;
  }
  await loadChapter(chapterId, positionMs, reciterId);
}

export function pause(): void {
  const state = store();
  if (state.status !== 'playing' && state.status !== 'loading') {
    return;
  }
  if (state.status === 'loading') {
    // Cancels a load that has not started playing yet, so it cannot start playback afterwards.
    loadSequence += 1;
  }
  clearWatchdog();
  queue?.playlist.pause();
  store().markPaused();
  saveResumeState();
}

/** Continues the current surah. After a restore, it loads the file at the saved position first. */
export function resume(): Promise<void> {
  return guarded(async () => {
    const state = store();
    if (state.chapterId === null || state.status === 'playing' || state.status === 'loading') {
      return;
    }
    if (queue !== null && loadedChapterId === state.chapterId && state.status !== 'error') {
      startPlayback(queue, queue.playlist.currentIndex);
      store().markPlaying();
      return;
    }
    await loadChapter(state.chapterId, state.positionMs, reciterFor(state));
  });
}

export function seek(positionMs: number): void {
  const state = store();
  if (state.chapterId === null) {
    return;
  }
  const target = clampSeek(positionMs);
  if (queue !== null && loadedChapterId === state.chapterId) {
    queue.playlist.seekTo(target / 1000).catch((error: unknown) => {
      console.warn('Seek failed.', error);
      store().markFailed('load-failed');
    });
  }
  store().setPosition(target);
}

export function nextSurah(): Promise<void> {
  return guarded(async () => {
    const state = store();
    if (state.chapterId === null) {
      return;
    }
    const active = activeQueue(state.chapterId);
    if (active !== null) {
      const index = active.playlist.currentIndex;
      if (index >= active.chapterIds.length - 1) {
        stopPlayback();
        return;
      }
      intendedIndex = index + 1;
      active.playlist.next();
      startPlayback(active, index + 1);
      return;
    }
    // Nothing of this surah is in the playlist (after a restore): load the next one the usual way.
    const reciterId = reciterFor(state);
    if (reciterId === null) {
      store().markFailed('no-reciter');
      return;
    }
    const next = neighbourChapter(contentDb(), reciterId, state.chapterId, 1);
    if (next === null) {
      stopPlayback();
      return;
    }
    await loadChapter(next, 0, reciterId);
  });
}

export function previousSurah(): Promise<void> {
  return guarded(async () => {
    const state = store();
    if (state.chapterId === null) {
      return;
    }
    const active = activeQueue(state.chapterId);
    if (active !== null) {
      const index = active.playlist.currentIndex;
      if (index === 0) {
        // The first surah has nothing before it: start it again.
        seek(0);
        startPlayback(active, 0);
        return;
      }
      intendedIndex = index - 1;
      active.playlist.previous();
      startPlayback(active, index - 1);
      return;
    }
    const reciterId = reciterFor(state);
    if (reciterId === null) {
      store().markFailed('no-reciter');
      return;
    }
    const previous = neighbourChapter(contentDb(), reciterId, state.chapterId, -1) ?? state.chapterId;
    await loadChapter(previous, 0, reciterId);
  });
}

/**
 * Loads the saved resume state into the store as paused. It does not load or play the file; `resume()` does
 * that. Returns false when nothing is saved or something is already playing.
 */
export function restoreLastSession(): boolean {
  const state = store();
  if (state.status === 'playing' || state.status === 'loading') {
    return false;
  }
  const saved = readLastPosition();
  if (saved === null) {
    return false;
  }
  loadedChapterId = null;
  store().restore(saved);
  return true;
}

// The playlist plays at the store's speed, and follows speed changes.
usePlayerStore.subscribe((state, previous) => {
  if (state.speed !== previous.speed && queue !== null) {
    queue.playlist.playbackRate = state.speed;
  }
});

// The playlist plays at the store's volume, and follows volume changes (the sleep timer's fade).
usePlayerStore.subscribe((state, previous) => {
  if (state.volume !== previous.volume && queue !== null) {
    queue.playlist.volume = state.volume;
  }
});

/** Test-only: forget the playlist, the load state and the store. */
export function resetPlayerForTests(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
  disposeQueue();
  loadSequence = 0;
  audioModeReady = null;
  watchedIndex = null;
  timingsCache.clear();
  usePlayerStore.getState().reset();
}
