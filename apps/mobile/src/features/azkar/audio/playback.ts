import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';

import { usePlayerStore } from '@/features/audio/playerStore';

import type { AzkarRecording } from '../data/model';
import { isPlayableAvailability, type AzkarAudioAvailability } from './availability';

/**
 * Plays one Azkar recording through expo-audio, the library the Quran player uses (ADR 0031 §8). It is a separate
 * player with its own state: it never writes the Quran `playerStore` (the Quran queue, resume and lock screen).
 * It reads that store only to stop when Quran audio starts.
 */

export type AzkarPlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'finished';

export type AzkarPlaybackState = {
  /** The reader unit whose recording is loaded, or null. */
  unitKey: string | null;
  status: AzkarPlaybackStatus;
  positionMs: number;
  durationMs: number;
};

const IDLE: AzkarPlaybackState = { unitKey: null, status: 'idle', positionMs: 0, durationMs: 0 };

export const useAzkarPlaybackStore = create<AzkarPlaybackState>()(() => IDLE);

// The status tick. A progress bar needs a few updates a second, not the Quran highlight's 100 ms.
const STATUS_INTERVAL_MS = 250;

// Same session settings as the Quran player (features/audio/player.ts): playback continues with the screen off.
const AUDIO_MODE = {
  allowsRecording: false,
  interruptionMode: 'doNotMix',
  playsInSilentMode: true,
  shouldPlayInBackground: true,
} as const;

type Session = {
  id: number;
  unitKey: string;
  recording: AzkarRecording;
  player: AudioPlayer;
  subscription: { remove: () => void };
  onEnded: (() => void) | undefined;
};

let session: Session | null = null;
let sessionCount = 0;
let audioModeReady: Promise<void> | null = null;

function ensureAudioMode(): Promise<void> {
  audioModeReady ??= setAudioModeAsync(AUDIO_MODE).catch((error: unknown) => {
    console.warn('Audio mode was not set. Azkar playback may stop in the background.', error);
  });
  return audioModeReady;
}

/** Stops and releases the current player, if any. Its listeners go with it. */
function releaseSession(): void {
  if (session === null) {
    return;
  }
  const { player, subscription } = session;
  session = null;
  subscription.remove();
  player.pause();
  player.remove();
}

function onStatus(id: number, status: AudioStatus): void {
  if (session?.id !== id) {
    return;
  }

  if (status.didJustFinish) {
    useAzkarPlaybackStore.setState({ status: 'finished', positionMs: status.duration * 1000 });
    // The player stays loaded, so replay can start it again. The callback lets the reader advance (autoplay).
    session.onEnded?.();
    return;
  }

  const current = useAzkarPlaybackStore.getState();
  // Only a playing player becomes paused on its own; a loading one stays loading until it plays.
  const nextStatus: AzkarPlaybackStatus = status.playing ? 'playing' : current.status === 'playing' ? 'paused' : current.status;
  useAzkarPlaybackStore.setState({
    status: nextStatus,
    positionMs: status.currentTime * 1000,
    durationMs: status.duration > 0 ? status.duration * 1000 : current.durationMs,
  });
}

function startPlayer(id: number): void {
  void ensureAudioMode().then(() => {
    if (session?.id !== id) {
      return;
    }
    session.player.play();
    useAzkarPlaybackStore.setState({ status: 'playing' });
  });
}

/**
 * Starts a recording for one reader unit. It runs only when the availability allows playback (`stream` or `local`);
 * otherwise it does nothing and returns false. Any recording already playing is stopped first.
 */
export function playAzkarRecording(
  recording: AzkarRecording,
  availability: AzkarAudioAvailability,
  options: { unitKey: string; onEnded?: () => void },
): boolean {
  if (!isPlayableAvailability(availability)) {
    return false;
  }

  releaseSession();
  sessionCount += 1;
  const id = sessionCount;
  const player = createAudioPlayer({ uri: recording.remoteUrl }, { updateInterval: STATUS_INTERVAL_MS });
  const subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
    onStatus(id, status);
  });

  session = { id, unitKey: options.unitKey, recording, player, subscription, onEnded: options.onEnded };
  useAzkarPlaybackStore.setState({
    unitKey: options.unitKey,
    status: 'loading',
    positionMs: 0,
    durationMs: recording.durationMs,
  });
  startPlayer(id);
  return true;
}

/** Pauses the loaded recording. Nothing happens when nothing is playing. */
export function pauseAzkarRecording(): void {
  if (session === null || useAzkarPlaybackStore.getState().status !== 'playing') {
    return;
  }
  session.player.pause();
  useAzkarPlaybackStore.setState({ status: 'paused' });
}

/** Plays from the current position, or from the start after the recording finished. */
export function resumeAzkarRecording(): void {
  if (session === null) {
    return;
  }
  if (useAzkarPlaybackStore.getState().status === 'finished') {
    replayAzkarRecording();
    return;
  }
  session.player.play();
  useAzkarPlaybackStore.setState({ status: 'playing' });
}

/** Starts the loaded recording again from the beginning. */
export function replayAzkarRecording(): void {
  if (session === null) {
    return;
  }
  const id = session.id;
  const { player } = session;
  useAzkarPlaybackStore.setState({ status: 'loading', positionMs: 0 });
  void player.seekTo(0).then(() => {
    if (session?.id !== id) {
      return;
    }
    player.play();
    useAzkarPlaybackStore.setState({ status: 'playing' });
  });
}

/** Moves the loaded recording to a position in milliseconds. */
export function seekAzkarRecording(positionMs: number): void {
  if (session === null) {
    return;
  }
  const clamped = Math.min(Math.max(0, positionMs), useAzkarPlaybackStore.getState().durationMs);
  void session.player.seekTo(clamped / 1000);
  useAzkarPlaybackStore.setState({ positionMs: clamped });
}

/** Stops playback and releases the player. The reader calls it on blur, on switching units and on unmount. */
export function stopAzkarRecording(): void {
  releaseSession();
  useAzkarPlaybackStore.setState(IDLE);
}

// Quran audio starting stops the Azkar recording. The Quran store is only read here, never written.
usePlayerStore.subscribe((state, previous) => {
  if (session === null) {
    return;
  }
  const quranStarted = state.status !== previous.status && (state.status === 'playing' || state.status === 'loading');
  if (quranStarted) {
    stopAzkarRecording();
  }
});

/** Test-only: drop the session and the store. */
export function resetAzkarPlaybackForTests(): void {
  releaseSession();
  audioModeReady = null;
  sessionCount = 0;
  useAzkarPlaybackStore.setState(IDLE);
}
