import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioMetadata,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { AppState, Image } from 'react-native';

import appIcon from '../../../assets/images/icon.png';
import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { getLocale } from '@/core/i18n/locale';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';

import { chapterAudio, type ChapterAudio } from './data/audio-files';
import { listReciters, recitationIdForResource } from './data/reciters';
import { timingsFor } from './data/timings';
import { clampSeek, isChapterId, nextChapterId, previousChapterId, usePlayerStore, type PlayerErrorCode } from './playerStore';
import { readLastPosition, writeLastPosition } from './resume-model';
import { getReciterId } from './settings';
import { resolveReciterId } from './settings-model';

// One expo-audio player for the whole app, created on first use. Audio URLs come only from
// chapter_audio_files (ADR 0008); this module makes no other network calls.

// Interruption `doNotMix` is what lock-screen controls need (expo-audio's setActiveForLockScreen note).
const AUDIO_MODE = {
  allowsRecording: false,
  interruptionMode: 'doNotMix',
  playsInSilentMode: true,
  shouldPlayInBackground: true,
} as const;

let player: AudioPlayer | null = null;
// The surah whose file is loaded in the player, or null when the player holds nothing we can resume.
let loadedChapterId: number | null = null;
// Bumped by every load and stop, so a load that was overtaken never calls play().
let loadSequence = 0;
let audioModeReady: Promise<void> | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

const store = () => usePlayerStore.getState();

function contentDb(): SqlExecutor {
  return openContentDb().executor;
}

/** The reciter to play when the caller gives none: the saved choice, resolved against what is installed. */
function currentReciterId(db: SqlExecutor): number | null {
  // TODO(phase-3 D2) is recorded in settings-model: the default reciter is null until D2 lands.
  return resolveReciterId(getReciterId(), listReciters(db), null);
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

function getPlayer(): AudioPlayer {
  if (player === null) {
    player = createAudioPlayer(null);
    player.addListener('playbackStatusUpdate', onPlayerStatus);
    appStateSubscription ??= AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        saveResumeState();
      }
    });
  }
  return player;
}

function currentPositionMs(): number {
  const state = store();
  if (player !== null && loadedChapterId === state.chapterId) {
    return Math.round(player.currentTime * 1000);
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

function isNotFound(message: string): boolean {
  return /\b404\b|not found/i.test(message);
}

function onPlayerStatus(status: AudioStatus): void {
  const current = store();
  if (status.error !== null) {
    if (current.status !== 'error') {
      current.markFailed(isNotFound(status.error) ? 'not-found' : 'load-failed');
    }
    return;
  }
  // The player's own duration replaces the content row's placeholder once it is known.
  if (status.duration > 0) {
    current.setDuration(Math.round(status.duration * 1000));
  }
  if (current.status === 'idle' || current.status === 'error') {
    return;
  }
  if ((current.status === 'playing' || current.status === 'paused') && status.didJustFinish) {
    void guarded(nextSurah);
    return;
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
  player?.pause();
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
  const { audio } = lookup;
  // The content row's duration is only a placeholder until the player reports its own.
  store().beginLoad({ reciterId, chapterId, positionMs, durationMs: audio.durationMs });
  try {
    await ensureAudioMode();
    if (sequence !== loadSequence) {
      return;
    }
    const current = getPlayer();
    current.setActiveForLockScreen(true, lockScreenMetadata(db, reciterId, chapterId));
    current.replace({ uri: audio.url });
    loadedChapterId = chapterId;
    if (positionMs > 0) {
      await current.seekTo(positionMs / 1000);
      if (sequence !== loadSequence) {
        return;
      }
    }
    current.play();
  } catch (error) {
    console.warn('Audio file did not load.', error);
    if (sequence === loadSequence) {
      loadedChapterId = null;
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
    const timing = timingsFor(db, lookup.audio.id).find((row) => row.verseId === verse.id);
    await loadChapter(verse.chapterId, timing?.startMs ?? 0, reciterId);
  });
}

export function pause(): void {
  const state = store();
  if (state.status !== 'playing' && state.status !== 'loading') {
    return;
  }
  if (state.status === 'loading') {
    // Cancels a load that has not started playing yet, so it cannot call play() afterwards.
    loadSequence += 1;
  }
  player?.pause();
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
    if (player !== null && loadedChapterId === state.chapterId && state.status !== 'error') {
      player.play();
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
  if (player !== null && loadedChapterId === state.chapterId) {
    player.seekTo(target / 1000).catch((error: unknown) => {
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
    const next = nextChapterId(state.chapterId);
    if (next === null) {
      stopPlayback();
      return;
    }
    await loadChapter(next, 0, reciterFor(state));
  });
}

export function previousSurah(): Promise<void> {
  return guarded(async () => {
    const state = store();
    if (state.chapterId === null) {
      return;
    }
    await loadChapter(previousChapterId(state.chapterId), 0, reciterFor(state));
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

/** Test-only: forget the player, the load state and the store. */
export function resetPlayerForTests(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
  player = null;
  loadedChapterId = null;
  loadSequence = 0;
  audioModeReady = null;
  usePlayerStore.getState().reset();
}
