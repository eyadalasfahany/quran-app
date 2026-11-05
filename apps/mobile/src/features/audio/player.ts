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
import { openUserDb } from '@/core/db/user/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { getLocale } from '@/core/i18n/locale';
import { networkIsOffline } from '@/core/network/network-state';
import { chapterDisplayName, getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';

import { activeTimingIndex, activeWordPosition, ayahSeekStartMs } from './active-ayah';
import { chapterAudio, type ChapterAudio } from './data/audio-files';
import { isPlayableOffline, listDownloadsForReciter } from './data/downloads';
import { upsertRecentListen } from './data/recent-listens';
import { listReciters, recitationIdForResource } from './data/reciters';
import { timingsFitAudio, timingsFor, type AyahTiming } from './data/timings';
import { clampSeek, isChapterId, usePlayerStore, type PlayerErrorCode } from './playerStore';
import { resetSkipNoticeForTests, useSkipNoticeStore } from './skip-notice';
import {
  isRepeatRangeValid,
  repeatAction,
  repeatContainsPosition,
  repeatContainsVerse,
  REPEAT_END_TOLERANCE_MS,
  type RepeatRequest,
} from './repeat';
import { fileForDownloadPath } from './downloads/files';
import { readLastPosition, writeLastPosition } from './resume-model';
import { resolveInitialAnchor } from '@/features/reader/anchor/reading-anchor';

import { getReciterId, setReciterId } from './settings';
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
// Home's recent list (spec §12): the status tick saves the surah at most this often while it plays.
const LISTEN_SAVE_INTERVAL_MS = 15_000;

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
// The index a user load of a chosen surah asked for. Its track change is not a skip, so it raises no notice (ADR 0062).
let loadTargetIndex: number | null = null;
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
let trackTimings: { chapterId: number; audioFileId: number | null; timings: AyahTiming[] } | null = null;
// Timings per audio file id, read once for the session.
const timingsCache = new Map<number, AyahTiming[]>();
// While a repeat seek is being applied, the decoded position at or above this is stale: the seek has not landed.
let repeatGuardMs: number | null = null;
// The last save of a surah's listen, and the last position the status tick reported for one.
let lastListenSave: { key: string; at: number } | null = null;
let lastTick: { reciterId: number; chapterId: number; positionMs: number } | null = null;
// The token of the seek now in flight (see seekPlaylist), or null. Until it lands the playlist reports the position
// it had before the seek, so the status ticks must not move the highlight.
let pendingSeek: number | null = null;
let seekSerial = 0;
// The ayah a play-from-ayah asked for, held until the highlight reaches that ayah. The first ticks after the seek
// report about where it starts, and the highlight lag, or a first word that starts before the ayah, would put them in
// the ayah before, so the floor holds the ayah until the timings reach it.
let highlightFloor: { chapterId: number; verseId: number } | null = null;
// The repeat a reciter switch carries into the surah it loads (switchReciter). Applied when that surah's track change
// lands, or at the end of its load when the track was already in place, so a track change that arrives after the load
// does not clear it. Any other load or a stop drops it.
let pendingSwitchRepeat: RepeatRequest | null = null;

const store = () => usePlayerStore.getState();

/** Reader follow resumes on each explicit play or resume from the user (ADR 0037). */
function bumpPlayCommand(): void {
  store().bumpPlayCommand();
}

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
  if (recitationId === undefined) {
    return { error: 'not-installed' };
  }
  const audio = chapterAudio(db, recitationId, chapterId);
  // The pack is installed but has no file for this surah (ADR 0062): unavailable, not a missing install.
  return audio === undefined ? { error: 'surah-unavailable' } : { audio };
}

/**
 * Records why a lookup found no file. A surah the reciter lacks is `surah-unavailable` (ADR 0062), which keeps the
 * reciter and surah so the reader bar can say so; anything else is a plain failure.
 */
function failLookup(error: PlayerErrorCode, reciterId: number, chapterId: number): void {
  if (error === 'surah-unavailable') {
    store().markUnavailable({ reciterId, chapterId });
    return;
  }
  store().markFailed(error);
}

/** Whether a surah can play without the network. */
type LocalAudioState =
  /** Downloaded and verified within the last 7 days. */
  | 'local'
  /** Downloaded, but not verified for longer than 7 days. The licence rule stops it playing offline. */
  | 'stale'
  /** Not downloaded. */
  | 'missing';

function localAudioState(reciterId: number, chapterId: number): LocalAudioState {
  let state: LocalAudioState = 'missing';
  for (const row of listDownloadsForReciter(reciterId, { db: openUserDb().executor })) {
    if (row.chapterId !== chapterId || row.status !== 'done' || !fileForDownloadPath(row.localPath).exists) {
      continue;
    }
    if (isPlayableOffline(row)) {
      return 'local';
    }
    state = 'stale';
  }
  return state;
}

/**
 * Why a surah cannot start: it has no playable local copy and the device is known to be offline. Null when the
 * stream may be tried. Checked before the load, so the reader sees the message at once instead of a timeout.
 */
function offlineFailure(reciterId: number, chapterId: number): PlayerErrorCode | null {
  const local = localAudioState(reciterId, chapterId);
  if (local === 'local' || !networkIsOffline()) {
    return null;
  }
  return local === 'stale' ? 'verify-required' : 'offline';
}

/** The content row's duration: only a placeholder until the loaded track reports its own. */
function rowDurationMs(db: SqlExecutor, reciterId: number, chapterId: number): number {
  const lookup = lookupAudio(db, reciterId, chapterId);
  return 'audio' in lookup ? lookup.audio.durationMs : 0;
}

function appIconUrl(): string | undefined {
  // An Android release build resolves the icon to a drawable name ("assets_images_icon"). expo-audio's artworkUrl
  // must be a URL, or setActiveForLockScreen rejects and the load fails, so the lock screen goes without artwork.
  const uri = Image.resolveAssetSource(appIcon)?.uri;
  return uri?.includes('://') === true ? uri : undefined;
}

function lockScreenMetadata(db: SqlExecutor, reciterId: number, chapterId: number): AudioMetadata {
  const arabic = getLocale() === 'ar';
  const chapter = getChapter(db, chapterId);
  const reciter = listReciters(db).find((row) => row.resourceId === reciterId);
  const reciterName = reciter === undefined ? undefined : (arabic ? reciter.nameAr : reciter.name) ?? reciter.nameAr ?? reciter.name ?? undefined;
  return {
    title: chapter === undefined ? undefined : chapterDisplayName(chapter, arabic ? 'ar' : 'en'),
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
  loadTargetIndex = null;
  trackTimings = null;
  repeatGuardMs = null;
  lastTick = null;
  pendingSeek = null;
  highlightFloor = null;
}

/**
 * The file URI of each surah of this reciter that is downloaded, verified within 7 days and still on disk,
 * keyed by audio file id. Read when a playlist is built, so a download that finishes later plays from the next rebuild.
 */
function playableLocalFiles(reciterId: number): Map<number, string> {
  const files = new Map<number, string>();
  for (const row of listDownloadsForReciter(reciterId, { db: openUserDb().executor })) {
    if (!isPlayableOffline(row)) {
      continue;
    }
    const file = fileForDownloadPath(row.localPath);
    if (file.exists) {
      files.set(row.audioFileId, file.uri);
    }
  }
  return files;
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
  // A repeat belongs to the reciter it was set with.
  if (queue !== null) {
    releaseRepeat();
  }
  // One file per surah, in surah order. Like chapterAudio, the lowest id wins when a surah has two rows.
  // A surah downloaded and playable offline plays from its local file; the rest stream from QF's URL.
  const rows = db.all<{ id: number; chapterId: number; url: string }>(
    `SELECT id, chapter_id AS chapterId, audio_url AS url
     FROM chapter_audio_files
     WHERE recitation_id = ?
     ORDER BY chapter_id, id`,
    [recitationId],
  );
  const localFiles = playableLocalFiles(reciterId);
  const chapterIds: number[] = [];
  const sources: { uri: string }[] = [];
  for (const row of rows) {
    if (chapterIds.at(-1) === row.chapterId) {
      continue;
    }
    chapterIds.push(row.chapterId);
    sources.push({ uri: localFiles.get(row.id) ?? row.url });
  }
  disposeQueue();
  // A playlist for another reciter has no recited ayah until its first status update.
  store().setActive(null, null);
  const playlist = createAudioPlaylist({ sources, updateInterval: STATUS_INTERVAL_MS });
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
  const lookup = lookupAudio(db, reciterId, chapterId);
  trackTimings = {
    chapterId,
    audioFileId: 'audio' in lookup ? lookup.audio.id : null,
    timings: timingsForChapter(db, reciterId, chapterId),
  };
}

/**
 * Drops the playing surah's timings when they do not match the audio the player loaded (ADR 0052): the surah then
 * plays with no highlight and no repeat, as a reciter without timings does, never with a wrong highlight. The file is
 * remembered for the session, so playing it again does not highlight either.
 */
function dropTimingsThatDoNotFit(chapterId: number, durationMs: number): void {
  if (trackTimings === null || trackTimings.chapterId !== chapterId || timingsFitAudio(trackTimings.timings, durationMs)) {
    return;
  }
  if (trackTimings.audioFileId !== null) {
    timingsCache.set(trackTimings.audioFileId, []);
  }
  trackTimings = { ...trackTimings, timings: [] };
  highlightFloor = null;
  store().setActive(null, null);
}

/** Ends the repeat: the range is forgotten and a seek still in flight is no longer waited for. */
function releaseRepeat(): void {
  repeatGuardMs = null;
  store().clearRepeat();
}

/** Sets the repeat a reciter switch carried over, when the surah now loaded has timings that hold its range. */
function applySwitchRepeat(timings: readonly AyahTiming[]): void {
  const request = pendingSwitchRepeat;
  pendingSwitchRepeat = null;
  if (request !== null && isRepeatRangeValid(request, timings)) {
    store().setRepeat(request);
  }
}

/** Ends the repeat when moving to `verseId` takes the person outside its range. */
function releaseRepeatOutside(timings: readonly AyahTiming[], verseId: number): void {
  const repeat = store().repeat;
  if (repeat !== null && !repeatContainsVerse(repeat, timings, verseId)) {
    releaseRepeat();
  }
}

/**
 * Applies the repeat to the decoded position of the surah now playing: at the end of its last ayah the range
 * starts again, until its count is reached, and then the repeat ends and playback continues.
 */
function applyRepeat(active: Queue, chapterId: number, positionMs: number): void {
  const repeat = store().repeat;
  if (repeat === null || trackTimings?.chapterId !== chapterId) {
    return;
  }
  const { timings } = trackTimings;
  if (repeatGuardMs !== null) {
    if (positionMs >= repeatGuardMs) {
      return;
    }
    repeatGuardMs = null;
  }
  const action = repeatAction(repeat, timings, positionMs);
  if (action === 'none') {
    return;
  }
  if (action === 'finish') {
    releaseRepeat();
    return;
  }
  const last = timings.find((timing) => timing.verseId === repeat.toVerseId);
  repeatGuardMs = (last?.endMs ?? 0) - REPEAT_END_TOLERANCE_MS;
  store().advanceRepeat();
  store().setPosition(action.seekTo);
  seekPlaylist(active.playlist, action.seekTo / 1000).catch((error: unknown) => {
    console.warn('Repeat seek failed.', error);
    store().markFailed('load-failed');
  });
}

/** Highlights the ayah and word at `positionMs` of the surah now playing. */
function updateHighlight(chapterId: number, reportedMs: number): void {
  const positionMs = Math.max(0, reportedMs - HIGHLIGHT_LAG_MS);
  const timings = trackTimings?.chapterId === chapterId ? trackTimings.timings : [];
  const index = activeTimingIndex(timings, positionMs);
  const timing = index < 0 ? undefined : timings[index];
  const floor = highlightFloor;
  if (floor !== null && floor.chapterId === chapterId) {
    // While the timings are before the floor's ayah (or in no ayah at all), keep the floor's ayah. Once they reach it or
    // a later one, the floor is done. An ayah with no timing has nothing to reach, so the floor is dropped at once.
    const floorIndex = timings.findIndex((row) => row.verseId === floor.verseId);
    if (floorIndex >= 0 && (timing === undefined || index < floorIndex)) {
      store().setActive(floor.verseId, null);
      return;
    }
    highlightFloor = null;
  }
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
/**
 * Says continuous play moved over surahs the reciter lacks (ADR 0062). Raised only when there is a gap; the skipped
 * surahs are the ids strictly between the two.
 */
function raiseSkipNotice(reciterId: number, fromChapter: number, toChapter: number): void {
  if (toChapter <= fromChapter + 1) {
    return;
  }
  const chapterIds = Array.from({ length: toChapter - fromChapter - 1 }, (_, offset) => fromChapter + 1 + offset);
  useSkipNoticeStore.getState().show({ reciterId, chapterIds });
}

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

function listenKey(reciterId: number, chapterId: number): string {
  return `${reciterId}:${chapterId}`;
}

/**
 * Saves a surah's listen for Home's recent list. Wrapped in try/catch: a database error is logged and never
 * stops playback.
 */
function saveListen(reciterId: number, chapterId: number, positionMs: number): void {
  const now = Date.now();
  lastListenSave = { key: listenKey(reciterId, chapterId), at: now };
  try {
    const lookup = lookupAudio(contentDb(), reciterId, chapterId);
    if (!('audio' in lookup)) {
      return;
    }
    upsertRecentListen({
      audioFileId: lookup.audio.id,
      reciterResourceId: reciterId,
      chapterId,
      lastPositionMs: Math.max(0, Math.round(positionMs)),
      playedAt: now,
    });
  } catch (error) {
    console.warn('Recent listen was not saved.', error);
  }
}

/** The status tick's save: the same surah at most once per 15 s, and a new surah at once. */
function saveListenOnTick(reciterId: number, chapterId: number, positionMs: number): void {
  if (lastListenSave?.key === listenKey(reciterId, chapterId) && Date.now() - lastListenSave.at < LISTEN_SAVE_INTERVAL_MS) {
    return;
  }
  saveListen(reciterId, chapterId, positionMs);
}

/** Saves the surah now loaded at its current position, for pause and stop. */
function saveCurrentListen(): void {
  const state = store();
  if (state.reciterId === null || state.chapterId === null) {
    return;
  }
  saveListen(state.reciterId, state.chapterId, currentPositionMs());
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
    // Offline with no local copy, the stream was never going to load: say so, not a generic failure.
    const chapterId = active.chapterIds[index];
    const offline = chapterId === undefined ? null : offlineFailure(active.reciterId, chapterId);
    current.markFailed(offline ?? 'load-failed');
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
  if (status.isLoaded && status.duration > 0 && chapterId !== undefined) {
    current.setDuration(Math.round(status.duration * 1000));
    dropTimingsThatDoNotFit(chapterId, Math.round(status.duration * 1000));
  }
  if ((current.status === 'playing' || current.status === 'paused') && status.currentIndex === active.chapterIds.length - 1 && isFinishedLastTrack(status)) {
    stopPlayback();
    return;
  }
  // The position is not the new one while a seek is pending, and a load paused before it plays reports the old track's
  // time too (a surah change with no seek), so neither moves the highlight. Once the load plays, its position is the new one.
  const positionIsNew = pendingSeek === null && !(current.status === 'loading' && !status.playing);
  if (status.isLoaded && chapterId !== undefined && positionIsNew) {
    updateHighlight(chapterId, Math.round(status.currentTime * 1000));
  }
  if (current.status === 'playing' || current.status === 'paused') {
    current.setPosition(Math.round(status.currentTime * 1000));
  }
  if (current.status === 'playing' && status.playing && status.isLoaded && chapterId !== undefined) {
    applyRepeat(active, chapterId, Math.round(status.currentTime * 1000));
  }
  if (status.isLoaded && chapterId !== undefined) {
    lastTick = { reciterId: active.reciterId, chapterId, positionMs: Math.round(status.currentTime * 1000) };
  }
  // A loading surah that reports playing is about to be marked playing below, so it counts as playing here.
  if ((current.status === 'playing' || current.status === 'loading') && status.playing && status.isLoaded && chapterId !== undefined) {
    saveListenOnTick(active.reciterId, chapterId, Math.round(status.currentTime * 1000));
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
    if (chapterId !== undefined) {
      saveListen(active.reciterId, chapterId, Math.round(status.currentTime * 1000));
    }
  }
}

function onTrackChanged({ previousIndex, currentIndex }: { previousIndex: number; currentIndex: number }): void {
  const active = queue;
  if (active === null) {
    return;
  }
  // A surah change ends the repeat, whoever made it.
  releaseRepeat();
  const fromUs = intendedIndex === currentIndex;
  const loadTarget = loadTargetIndex;
  loadTargetIndex = null;
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
  const endedChapter = active.chapterIds[previousIndex];
  if (lastTick !== null && lastTick.chapterId === endedChapter) {
    saveListen(lastTick.reciterId, lastTick.chapterId, lastTick.positionMs);
  }
  const chapterId = active.chapterIds[currentIndex];
  if (chapterId === undefined) {
    return;
  }
  const db = contentDb();
  store().moveTo({ chapterId, durationMs: rowDurationMs(db, active.reciterId, chapterId) });
  // The playlist moved one index forward on its own while audio plays: any gap was surahs the reciter lacks.
  const playingNow = before.status === 'playing' || before.status === 'loading';
  if (playingNow && currentIndex === previousIndex + 1 && currentIndex !== loadTarget && endedChapter !== undefined) {
    raiseSkipNotice(active.reciterId, endedChapter, chapterId);
  }
  // moveTo clears the highlight, so a track change that is ours keeps the ayah the load asked for.
  const floor = highlightFloor;
  if (fromUs && floor !== null && floor.chapterId === chapterId) {
    store().setActive(floor.verseId, null);
  }
  loadedChapterId = chapterId;
  setTrackTimings(db, active.reciterId, chapterId);
  if (fromUs && loadTarget === currentIndex) {
    applySwitchRepeat(trackTimings?.timings ?? []);
  }
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
  pendingSwitchRepeat = null;
  releaseRepeat();
  queue?.playlist.pause();
  saveCurrentListen();
  highlightFloor = null;
  useSkipNoticeStore.getState().clear();
  store().markStopped();
}

/**
 * Seeks the playlist and marks the seek pending until it lands, successfully or not. A newer seek or load replaces the
 * mark, so the seek it replaced cannot clear it.
 */
function seekPlaylist(playlist: AudioPlaylist, seconds: number): Promise<void> {
  seekSerial += 1;
  const token = seekSerial;
  pendingSeek = token;
  return playlist.seekTo(seconds).finally(() => {
    if (pendingSeek === token) {
      pendingSeek = null;
    }
  });
}

async function loadChapter(
  chapterId: number,
  positionMs: number,
  reciterId: number | null,
  startVerseId?: number,
  options?: { skippedFrom?: number; repeat?: RepeatRequest },
): Promise<void> {
  loadSequence += 1;
  useSkipNoticeStore.getState().clear();
  pendingSwitchRepeat = options?.repeat ?? null;
  // A load that starts supersedes any seek still pending from an earlier one, and any ayah held for an earlier load.
  pendingSeek = null;
  highlightFloor = null;
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
    failLookup(lookup.error, reciterId, chapterId);
    return;
  }
  const offline = offlineFailure(reciterId, chapterId);
  if (offline !== null) {
    clearWatchdog();
    queue?.playlist.pause();
    store().markFailed(offline);
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
    if (startVerseId !== undefined) {
      highlightFloor = { chapterId, verseId: startVerseId };
    }
    if (active.playlist.currentIndex !== index) {
      intendedIndex = index;
      loadTargetIndex = index;
      active.playlist.skipTo(index);
    }
    loadedChapterId = chapterId;
    setTrackTimings(db, reciterId, chapterId);
    // Set after the track change, which clears the highlight: the requested ayah is shown at once, not after the first tick.
    if (startVerseId !== undefined) {
      store().setActive(startVerseId, null);
    }
    if (positionMs > 0) {
      await seekPlaylist(active.playlist, positionMs / 1000);
      if (sequence !== loadSequence) {
        return;
      }
    }
    startPlayback(active, index);
    // The track change of a load the playlist made synchronously has already applied the carried repeat. Otherwise the
    // track is in place (no change is pending), so the carried repeat applies now.
    if (loadTargetIndex === null) {
      applySwitchRepeat(timingsForChapter(db, reciterId, chapterId));
    }
    // Continuous play (nextAyah, nextSurah's restore) crossed surahs the reciter lacks: say so once the load plays.
    if (options?.skippedFrom !== undefined) {
      raiseSkipNotice(reciterId, options.skippedFrom, chapterId);
    }
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
    bumpPlayCommand();
    releaseRepeat();
    await loadChapter(chapterId, fromMs, currentReciterId(contentDb()));
  });
}

/** Plays from the start of an ayah: its surah file, seeked to the ayah's start. With no timings, from 0. */
export function playFromVerse(verseKey: string): Promise<void> {
  return guarded(async () => {
    bumpPlayCommand();
    releaseRepeat();
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
      failLookup(lookup.error, reciterId, verse.chapterId);
      return;
    }
    const timing = timingsForChapter(db, reciterId, verse.chapterId).find((row) => row.verseId === verse.id);
    await loadChapter(verse.chapterId, timing === undefined ? 0 : ayahSeekStartMs(timing), reciterId, verse.id);
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
      releaseRepeatOutside(timings, before.verseId);
      await jumpTo(state.chapterId, ayahSeekStartMs(before), reciterId);
      return;
    }
    const previous = neighbourChapter(db, reciterId, state.chapterId, -1);
    if (previous === null) {
      releaseRepeatOutside(timings, timings[0]?.verseId ?? -1);
      await jumpTo(state.chapterId, 0, reciterId);
      return;
    }
    releaseRepeat();
    const lastOfPrevious = timingsForChapter(db, reciterId, previous).at(-1);
    await loadChapter(previous, lastOfPrevious === undefined ? 0 : ayahSeekStartMs(lastOfPrevious), reciterId);
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
      releaseRepeatOutside(timings, after.verseId);
      await jumpTo(state.chapterId, ayahSeekStartMs(after), reciterId);
      return;
    }
    const following = neighbourChapter(db, reciterId, state.chapterId, 1);
    if (following === null) {
      stopPlayback();
      return;
    }
    releaseRepeat();
    const firstOfFollowing = timingsForChapter(db, reciterId, following)[0];
    await loadChapter(following, firstOfFollowing === undefined ? 0 : ayahSeekStartMs(firstOfFollowing), reciterId, undefined, {
      skippedFrom: state.chapterId,
    });
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

/** What a reciter switch did (ADR 0062 decision 6): moved, nothing to move, or the reciter lacks the surah. */
export type SwitchOutcome = 'switched' | 'unavailable' | 'none';

/** The ayah a switch keeps: the one being recited, else the last-read ayah when it is in this surah, else none. */
function ayahToKeep(db: SqlExecutor, chapterId: number, activeVerseId: number | null): number | undefined {
  if (activeVerseId !== null) {
    return activeVerseId;
  }
  const verse = getVerseByKey(db, resolveInitialAnchor().verseKey);
  return verse !== undefined && verse.chapterId === chapterId ? verse.id : undefined;
}

/**
 * Moves the loaded surah to another reciter at the start of the current ayah (ADR 0062 decision 6). The new reciter's
 * timings give the start; without usable timings for that ayah it starts the surah from 0. Keeps play or pause and
 * the repeat range. The choice is always saved first. `autoplay: true` plays whatever the previous state was (a
 * download that finished). Outcomes:
 * - `switched`: moved. Playing or loading keeps playing; paused stays paused at the new place, and resume plays it.
 * - `unavailable`: the reciter has no file for the surah and the audio was playing (or autoplay was asked for). The old
 *   audio is stopped and the unavailable state (ADR 0062 decision 1) is shown.
 * - `none`: nothing moved. Nothing is loaded, the player is idle or in error (and autoplay was not asked for), or the
 *   reciter lacks the surah while paused without autoplay (the choice is kept, the store is not changed).
 */
export async function switchReciter(resourceId: number, options?: { autoplay?: boolean }): Promise<SwitchOutcome> {
  setReciterId(resourceId);
  const state = store();
  const { chapterId, status, repeat } = state;
  const playing = status === 'playing' || status === 'loading';
  const autoplay = options?.autoplay === true;
  if (chapterId === null || (!playing && status !== 'paused' && !autoplay)) {
    return 'none';
  }
  const db = contentDb();
  const lookup = lookupAudio(db, resourceId, chapterId);
  if ('error' in lookup) {
    if (lookup.error !== 'surah-unavailable' || !(playing || autoplay)) {
      return 'none';
    }
    stopPlayback();
    store().markUnavailable({ reciterId: resourceId, chapterId });
    return 'unavailable';
  }
  const verseId = ayahToKeep(db, chapterId, state.activeVerseId);
  const timing = verseId === undefined ? undefined : timingsForChapter(db, resourceId, chapterId).find((row) => row.verseId === verseId);
  const positionMs = timing === undefined ? 0 : ayahSeekStartMs(timing);
  const carried = repeat === null ? null : { fromVerseId: repeat.fromVerseId, toVerseId: repeat.toVerseId, count: repeat.count };

  if (playing || autoplay) {
    bumpPlayCommand();
    releaseRepeat();
    await loadChapter(chapterId, positionMs, resourceId, verseId, { repeat: carried ?? undefined });
    return 'switched';
  }
  // Paused: the new file is not loaded here. resume() loads it at the new place.
  disposeQueue();
  pendingSwitchRepeat = null;
  store().restore({ reciterId: resourceId, chapterId, positionMs });
  setTrackTimings(db, resourceId, chapterId);
  store().setActive(verseId ?? null, null);
  if (carried !== null) {
    setRepeat(carried);
  }
  return 'switched';
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
  saveCurrentListen();
}

/** Continues the current surah. After a restore, it loads the file at the saved position first. */
export function resume(): Promise<void> {
  return guarded(async () => {
    const before = store();
    if (before.status === 'playing' || before.status === 'loading') {
      return;
    }
    if (before.chapterId === null && !restoreLastSession()) {
      // Nothing is loaded and nothing was saved: start the first surah.
      await playChapter(1);
      return;
    }
    const state = store();
    if (state.chapterId === null) {
      return;
    }
    // A paused track by another reciter than the selected one moves to the selected reciter at the same ayah (ADR 0062
    // decision 7). Only the saved choice counts, and only when it resolves to itself (an installed reciter).
    const saved = getReciterId();
    const selected = currentReciterId(contentDb());
    if (state.status === 'paused' && selected !== null && selected === saved && selected !== state.reciterId) {
      await switchReciter(selected, { autoplay: true });
      return;
    }
    bumpPlayCommand();
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
  highlightFloor = null;
  const target = clampSeek(positionMs);
  if (state.repeat !== null && trackTimings?.chapterId === state.chapterId && !repeatContainsPosition(state.repeat, trackTimings.timings, target)) {
    releaseRepeat();
  }
  if (queue !== null && loadedChapterId === state.chapterId) {
    seekPlaylist(queue.playlist, target / 1000).catch((error: unknown) => {
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
    releaseRepeat();
    await loadChapter(next, 0, reciterId, undefined, { skippedFrom: state.chapterId });
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
    releaseRepeat();
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
  repeatGuardMs = null;
  store().restore(saved);
  return true;
}

/** Where a seek to an ayah of the surah now playing lands, or null when it has no timing there. */
export function seekStartMs(verseId: number): number | null {
  if (trackTimings === null || trackTimings.chapterId !== store().chapterId) {
    return null;
  }
  const timing = trackTimings.timings.find((row) => row.verseId === verseId);
  return timing === undefined ? null : ayahSeekStartMs(timing);
}

/** True when the surah now playing has ayah timings, so the highlight and the ayah controls can follow it. */
export function hasAyahTimings(): boolean {
  return trackTimings !== null && trackTimings.chapterId === store().chapterId && trackTimings.timings.length > 0;
}

/**
 * Repeats an ayah range of the current surah from its timings. Returns false, and changes nothing, when the
 * range is not in this surah's timings, so a surah without timings cannot repeat.
 */
export function setRepeat(request: RepeatRequest): boolean {
  const state = store();
  if (state.chapterId === null) {
    return false;
  }
  const reciterId = reciterFor(state);
  if (reciterId === null || !isRepeatRangeValid(request, timingsForChapter(contentDb(), reciterId, state.chapterId))) {
    return false;
  }
  releaseRepeat();
  store().setRepeat(request);
  return store().repeat !== null;
}

// The playlist plays at the store's volume, and follows volume changes (the sleep timer's fade).
// The skip notice ends when playback fails or stops, or the reciter changes (ADR 0062).
usePlayerStore.subscribe((state, previous) => {
  if (state.volume !== previous.volume && queue !== null) {
    queue.playlist.volume = state.volume;
  }
  const ended = (state.status === 'error' || state.status === 'idle') && state.status !== previous.status;
  if (ended || state.reciterId !== previous.reciterId) {
    useSkipNoticeStore.getState().clear();
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
  repeatGuardMs = null;
  lastListenSave = null;
  loadTargetIndex = null;
  timingsCache.clear();
  resetSkipNoticeForTests();
  usePlayerStore.getState().reset();
}
