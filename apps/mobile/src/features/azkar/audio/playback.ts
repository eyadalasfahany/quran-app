import { createAudioPlayer, setAudioModeAsync, type AudioMetadata, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Image } from 'react-native';

import appIcon from '../../../../assets/images/icon.png';
import { apiBaseUrl } from '@/core/api/base-url';
import { networkIsOffline } from '@/core/network/network-state';
import { usePlayerStore } from '@/features/audio/playerStore';

import { getProgressRows, recordTap } from '../data/progress-repository';
import { audioAvailability, type AzkarAudioAvailability } from './availability';
import { NoAudioDownloadPort, type AzkarDownloadPort } from './downloads';
import { resolveAudioUrl } from './audio-url';
import {
  initialAzkarPlayerState,
  useAzkarPlayerStore,
  type AzkarPlayerScope,
  type AzkarPlayerState,
  type AzkarPlaybackError,
} from './azkarPlayerStore';
import { runPlays, type AzkarQueueItem, type AzkarRepeatMode } from './queue';

/**
 * The Azkar audio engine (ADR 0031 §8). It plays a queue of recordings through expo-audio, the library the Quran player
 * uses, with its own store (`azkarPlayerStore`). It never writes the Quran `playerStore`; it reads that store only to
 * stop when Quran audio starts.
 *
 * Counting: each play that ends counts one repetition in the reader's progress (`recordTap`), so the ring fills with
 * the audio. A tap on the reader that lands while a play runs claims that play, so the one repetition is counted once,
 * by the tap. A play counts at most once, whatever events arrive.
 */

// The status tick. A progress bar needs a few updates a second.
const STATUS_INTERVAL_MS = 250;
// expo-audio reports no load failure: a bad URL or a 404 leaves the player unloaded. Playback that has not loaded this
// long after it was asked to play has failed (the same rule as the Quran player).
const LOAD_TIMEOUT_MS = 10_000;
// The lock screen shows play and pause only: one recording is one player, so next and previous would do nothing.
const LOCK_SCREEN_CONTROLS = { showNextTrack: false, showPreviousTrack: false } as const;

// Same session settings as the Quran player (features/audio/player.ts): playback continues with the screen off.
const AUDIO_MODE = {
  allowsRecording: false,
  interruptionMode: 'doNotMix',
  playsInSilentMode: true,
  shouldPlayInBackground: true,
} as const;

type Session = {
  token: number;
  item: AzkarQueueItem;
  player: AudioPlayer;
  subscription: { remove: () => void };
  loaded: boolean;
  /** The current play has ended (its `didJustFinish` was handled). Cleared once the next play has started. */
  finished: boolean;
  /** A replay of this dhikr has been asked for and has not started yet. */
  restarting: boolean;
  /** A tap on the reader claimed the play in progress (or the replay about to start), so its end does not count. */
  claimed: boolean;
  watchdog: ReturnType<typeof setTimeout> | null;
};

let session: Session | null = null;
let tokenCounter = 0;
let audioModeReady: Promise<void> | null = null;
// The download port the queue reads local files from. Set by each start.
let activePort: AzkarDownloadPort = NoAudioDownloadPort;
// Where playback continues after the sleep timer paused it at the end of a dhikr: the next dhikr, or this one mid-loop.
let resumeAt: number | null = null;

const state = (): AzkarPlayerState => useAzkarPlayerStore.getState();
const setState = (partial: Partial<AzkarPlayerState>): void => useAzkarPlayerStore.setState(partial);

function ensureAudioMode(): Promise<void> {
  audioModeReady ??= setAudioModeAsync(AUDIO_MODE).catch((error: unknown) => {
    console.warn('Audio mode was not set. Azkar playback may stop in the background.', error);
  });
  return audioModeReady;
}

function appIconUrl(): string | undefined {
  return Image.resolveAssetSource(appIcon)?.uri;
}

function lockScreenMetadata(item: AzkarQueueItem): AudioMetadata {
  return {
    title: state().scope?.title,
    artist: item.recording.reciterName,
    artworkUrl: appIconUrl(),
  };
}

function clearWatchdog(current: Session): void {
  if (current.watchdog !== null) {
    clearTimeout(current.watchdog);
    current.watchdog = null;
  }
}

/** Stops and releases the current player, if any. Its listeners go with it. */
function releaseSession(): void {
  if (session === null) {
    return;
  }
  const current = session;
  session = null;
  clearWatchdog(current);
  current.subscription.remove();
  current.player.pause();
  current.player.clearLockScreenControls();
  current.player.remove();
}

/** Whether a recording can play now: local when downloaded, else streamed when the rights allow and the device is online. */
function availabilityOf(item: AzkarQueueItem): AzkarAudioAvailability {
  const downloaded = activePort.status(item.recording.recordingKey)?.state === 'done';
  return audioAvailability(item.recording, { online: !networkIsOffline(), downloaded });
}

/** The URI to play: the downloaded file when there is one, else the recording's stream URL. */
function sourceUri(item: AzkarQueueItem): string {
  const local = activePort.localUri?.(item.recording.recordingKey) ?? null;
  if (local !== null) {
    return local;
  }
  let base = '';
  try {
    base = apiBaseUrl();
  } catch {
    base = '';
  }
  return resolveAudioUrl(item.recording.remoteUrl, base);
}

/** The progress count of a unit when its run begins. Zero when nothing is counted, or on a database error. */
function countAtStart(item: AzkarQueueItem): number {
  const scope = state().scope;
  if (scope === null) {
    return 0;
  }
  try {
    const row = getProgressRows(scope.scopeKey, scope.periodKey).find((candidate) => candidate.itemKey === item.unitKey);
    return row?.currentCount ?? 0;
  } catch (error) {
    console.warn('Azkar progress was not read.', error);
    return 0;
  }
}

/** Counts one repetition for the unit of a play that ended. A database error is logged and never stops playback. */
function countPlay(item: AzkarQueueItem): void {
  const scope = state().scope;
  if (scope === null) {
    return;
  }
  try {
    recordTap(scope.scopeKey, scope.periodKey, item.unitKey, item.requiredCount);
  } catch (error) {
    console.warn('Azkar repetition was not counted.', error);
  }
}

/** Starts a run for the queue item at `index`: its plays, and the count it starts from. */
function beginRun(index: number, item: AzkarQueueItem): void {
  const start = countAtStart(item);
  setState({
    index,
    playsDone: 0,
    countAtStart: start,
    runPlays: runPlays(state().repeatMode, item.requiredCount, start),
  });
}

function endScope(): void {
  releaseSession();
  setState({ status: 'finished', error: null, positionMs: 0 });
}

function failWith(error: AzkarPlaybackError): void {
  releaseSession();
  setState({ status: 'error', error, positionMs: 0 });
}

/**
 * Plays the queue from `index`: skips items with no playable audio, then starts the first playable one as a new run.
 * An item that needs the network while the device is offline (not downloaded) stops playback with the offline error.
 * Past the last item, the scope ends.
 */
function playFrom(index: number): void {
  const queue = state().queue;
  const position = nextPlayable(queue, index);
  const item = position === -1 ? undefined : queue[position];
  if (item === undefined) {
    endScope();
    return;
  }
  if (availabilityOf(item) === 'stream_offline') {
    setState({ index: position });
    failWith('offline');
    return;
  }
  beginRun(position, item);
  loadItem(position, item);
}

/** The first queue position at or after `from` whose recording can play, or -1. */
function nextPlayable(queue: readonly AzkarQueueItem[], from: number): number {
  for (let position = Math.max(0, from); position < queue.length; position += 1) {
    const item = queue[position];
    if (item !== undefined && availabilityOf(item) !== 'none') {
      return position;
    }
  }
  return -1;
}

function loadItem(index: number, item: AzkarQueueItem): void {
  releaseSession();
  tokenCounter += 1;
  const token = tokenCounter;
  const current = state();
  setState({ index, status: 'loading', error: null, positionMs: 0, durationMs: item.recording.durationMs });

  const player = createAudioPlayer({ uri: sourceUri(item) }, { updateInterval: STATUS_INTERVAL_MS });
  const subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
    onStatus(token, status);
  });
  const next: Session = {
    token,
    item,
    player,
    subscription,
    loaded: false,
    finished: false,
    restarting: false,
    claimed: false,
    watchdog: null,
  };
  session = next;
  player.setPlaybackRate(current.speed);
  player.volume = current.volume;
  player.setActiveForLockScreen(true, lockScreenMetadata(item), LOCK_SCREEN_CONTROLS);
  next.watchdog = setTimeout(() => {
    next.watchdog = null;
    if (session?.token === token && !next.loaded) {
      failWith('load-failed');
    }
  }, LOAD_TIMEOUT_MS);

  void ensureAudioMode().then(() => {
    if (session?.token !== token) {
      return;
    }
    player.play();
    setState({ status: 'playing' });
  });
}

/** Plays the current item again from its start, within the same run (a repeat of the count, or a loop). */
function replayCurrent(): void {
  const current = session;
  if (current === null) {
    return;
  }
  // The end of the play stays handled until the replay starts, so a repeated end event cannot count it again.
  current.restarting = true;
  setState({ status: 'loading', positionMs: 0 });
  void current.player.seekTo(0).then(() => {
    if (session?.token !== current.token) {
      return;
    }
    current.finished = false;
    current.restarting = false;
    current.player.play();
    setState({ status: 'playing' });
  });
}

function onStatus(token: number, status: AudioStatus): void {
  const current = session;
  if (current === null || current.token !== token) {
    return;
  }
  if (status.didJustFinish) {
    onPlayFinished(current);
    return;
  }
  if (status.isLoaded && !current.loaded) {
    current.loaded = true;
    clearWatchdog(current);
  }
  const before = state();
  // Only a playing player becomes paused on its own. A loading one stays loading until it plays.
  const nextStatus = status.playing ? 'playing' : before.status === 'playing' ? 'paused' : before.status;
  setState({
    status: nextStatus,
    positionMs: status.currentTime * 1000,
    durationMs: status.duration > 0 ? status.duration * 1000 : before.durationMs,
  });
}

/**
 * One play ended. It counts once (unless a tap claimed it), then the run decides: a replay, the sleep timer's pause at
 * the end of the unit, or the next queue item. Past the last item the scope ends.
 */
function onPlayFinished(current: Session): void {
  if (current.finished) {
    return;
  }
  current.finished = true;
  if (!current.claimed) {
    countPlay(current.item);
  }
  // A claim belonged to the play that has just ended. A claim made from now on belongs to the next one.
  current.claimed = false;

  const before = state();
  const playsDone = before.playsDone + 1;
  const runEnds = before.runPlays !== null && playsDone >= before.runPlays;
  setState({ playsDone, positionMs: before.durationMs });

  if (before.sleepMode === 'endOfUnit' && (runEnds || before.runPlays === null)) {
    // The sleep timer ends playback at the end of this dhikr: it pauses, and the next play resumes with the next dhikr
    // (or this one, mid-loop). The sleep timer is spent.
    resumeAt = runEnds ? before.index + 1 : before.index;
    releaseSession();
    setState({ sleepMode: 'off', sleepEndsAtMs: null, sleepFading: false, status: 'paused' });
    return;
  }
  if (!runEnds) {
    replayCurrent();
    return;
  }
  playFrom(before.index + 1);
}

/** Claims the play of `unitKey` that is running, so the tap that counted it is its only count. */
export function claimAzkarPlay(unitKey: string): void {
  const current = session;
  if (current === null || current.item.unitKey !== unitKey || (current.finished && !current.restarting)) {
    return;
  }
  const status = state().status;
  if (status === 'playing' || status === 'loading' || status === 'paused') {
    current.claimed = true;
  }
}

/** Starts a queue at `index` in `scope`. Any Azkar recording already playing is stopped first. Quran is not touched here. */
export function startAzkarQueue(request: {
  scope: AzkarPlayerScope;
  queue: AzkarQueueItem[];
  index: number;
  port?: AzkarDownloadPort;
}): void {
  releaseSession();
  activePort = request.port ?? NoAudioDownloadPort;
  if (request.queue.length === 0 || request.index < 0 || request.index >= request.queue.length) {
    stopAzkarPlayback();
    return;
  }
  setState({
    scope: request.scope,
    queue: request.queue,
    index: request.index,
    status: 'loading',
    error: null,
    positionMs: 0,
    durationMs: 0,
    playsDone: 0,
    runPlays: 1,
    countAtStart: 0,
  });
  playFrom(request.index);
}

/** Pauses the playing recording. Nothing happens when nothing is playing. */
export function pauseAzkarPlayback(): void {
  const current = session;
  const status = state().status;
  if (current === null || (status !== 'playing' && status !== 'loading')) {
    return;
  }
  current.player.pause();
  setState({ status: 'paused' });
}

/** Continues the queue: resumes a pause, plays again after the end of the scope, and retries after an error. */
export function resumeAzkarPlayback(): void {
  const { status, queue, index } = state();
  if (queue.length === 0) {
    return;
  }
  if (session === null && status === 'paused' && resumeAt !== null) {
    const at = resumeAt;
    resumeAt = null;
    playFrom(at);
    return;
  }
  if (status === 'finished') {
    playFrom(0);
    return;
  }
  if (status === 'error') {
    playFrom(index);
    return;
  }
  if (session === null || status === 'playing' || status === 'loading') {
    return;
  }
  session.player.play();
  setState({ status: 'playing' });
}

/** Moves the playing recording to a position in milliseconds, within the loaded dhikr. */
export function seekAzkarPlayback(positionMs: number): void {
  const current = session;
  if (current === null) {
    return;
  }
  const duration = state().durationMs;
  const clamped = Math.min(Math.max(0, Number.isFinite(positionMs) ? positionMs : 0), duration > 0 ? duration : Infinity);
  void current.player.seekTo(clamped / 1000);
  setState({ positionMs: clamped });
}

/** The next dhikr (+1) or the previous one (-1). Previous from the first dhikr starts it again. Past the ends, nothing. */
export function skipAzkarPlayback(direction: 1 | -1): void {
  const { queue, index } = state();
  if (queue.length === 0) {
    return;
  }
  if (direction === 1) {
    if (index + 1 < queue.length) {
      playFrom(index + 1);
    }
    return;
  }
  playFrom(index > 0 ? index - 1 : 0);
}

/** Changes the repeat mode. The current run takes the new rule: once it has reached its plays, it ends. */
export function setAzkarRepeatMode(mode: AzkarRepeatMode): void {
  const { queue, index, countAtStart } = state();
  const item = queue[index];
  setState({
    repeatMode: mode,
    runPlays: item === undefined ? 1 : runPlays(mode, item.requiredCount, countAtStart),
  });
}

/** Changes the speed of the playing recording and of the ones after it. */
export function setAzkarSpeed(rate: number): void {
  setState({ speed: rate });
}

/** Stops playback and releases the player. The queue, the scope and the settings are cleared with it. */
export function stopAzkarPlayback(): void {
  releaseSession();
  resumeAt = null;
  setState({
    ...initialAzkarPlayerState,
    repeatMode: state().repeatMode,
    speed: state().speed,
    sleepMode: state().sleepMode,
    sleepEndsAtMs: state().sleepEndsAtMs,
    sleepNowMs: state().sleepNowMs,
    sleepFading: state().sleepFading,
    volume: state().volume,
  });
}

// The player plays at the store's speed and volume, and follows changes (the sleep timer's fade).
useAzkarPlayerStore.subscribe((next, previous) => {
  if (session === null) {
    return;
  }
  if (next.speed !== previous.speed) {
    session.player.setPlaybackRate(next.speed);
  }
  if (next.volume !== previous.volume) {
    session.player.volume = next.volume;
  }
});

// Quran audio starting stops the Azkar recording. The Quran store is only read here, never written.
usePlayerStore.subscribe((next, previous) => {
  if (session === null) {
    return;
  }
  const quranStarted = next.status !== previous.status && (next.status === 'playing' || next.status === 'loading');
  if (quranStarted) {
    stopAzkarPlayback();
  }
});

/** Test-only: drop the session, the store and the module state. */
export function resetAzkarPlaybackForTests(): void {
  releaseSession();
  audioModeReady = null;
  tokenCounter = 0;
  resumeAt = null;
  activePort = NoAudioDownloadPort;
  useAzkarPlayerStore.setState(initialAzkarPlayerState);
}
