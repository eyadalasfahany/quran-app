import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { pause } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';

import type { AdhanVoiceId } from './adhan-sounds';

/**
 * Previews an adhan voice in the sound picker (ADR 0047). It is a separate expo-audio player, like the Azkar player:
 * it never writes the Quran `playerStore` state, the current ayah or recent listens. Before a preview starts it pauses
 * Quran audio when that audio is playing or loading, and it never resumes it.
 */

export interface AdhanPreviewState {
  playingId: AdhanVoiceId | null;
  /** 0 to 1 through the clip. */
  progress: number;
}

export interface AdhanPreviewControls extends AdhanPreviewState {
  toggle: (id: AdhanVoiceId) => void;
  stop: () => void;
}

// The same clips the notification scheduler names by file (ADR 0047). Metro resolves each require to a bundled asset.
const CLIPS: Record<AdhanVoiceId, number> = {
  allahu_akbar_short: require('../../../../assets/adhan/allahu_akbar_short.wav'),
  makkah: require('../../../../assets/adhan/adhan_makkah.wav'),
  madinah: require('../../../../assets/adhan/adhan_madinah.wav'),
};

const AUDIO_MODE = {
  allowsRecording: false,
  interruptionMode: 'doNotMix',
  playsInSilentMode: true,
  shouldPlayInBackground: true,
} as const;

// A clip is 5 to 6 s; a 100 ms tick keeps the bar smooth without much work.
const STATUS_INTERVAL_MS = 100;

const IDLE: AdhanPreviewState = { playingId: null, progress: 0 };

type Session = {
  id: number;
  voice: AdhanVoiceId;
  player: AudioPlayer;
  subscription: { remove: () => void };
};

let audioModeReady: Promise<void> | null = null;

function ensureAudioMode(): Promise<void> {
  audioModeReady ??= setAudioModeAsync(AUDIO_MODE).catch((error: unknown) => {
    console.warn('Audio mode was not set. The adhan preview may stop in the background.', error);
  });
  return audioModeReady;
}

/** Pauses Quran audio only when it is playing or loading. Never resumes it. */
function pauseQuranIfActive(): void {
  const { status } = usePlayerStore.getState();
  if (status === 'playing' || status === 'loading') {
    pause();
  }
}

/**
 * A preview controller. The hook owns one, and `onChange` receives every state change. Each preview is its own player
 * with an id, so a late status event from a stopped clip never changes the state of the one now playing.
 */
export function createAdhanPreview(onChange: (state: AdhanPreviewState) => void) {
  let session: Session | null = null;
  let sessionCount = 0;
  const emit = (next: AdhanPreviewState) => {
    onChange(next);
  };

  /** Stops and releases the current player, if any. Its listener goes with it. */
  const release = () => {
    if (session === null) {
      return;
    }
    const { player, subscription } = session;
    session = null;
    subscription.remove();
    player.pause();
    player.remove();
  };

  const onStatus = (id: number, status: AudioStatus) => {
    if (session?.id !== id) {
      return;
    }
    if (status.didJustFinish) {
      release();
      emit(IDLE);
      return;
    }
    const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
    emit({ playingId: session.voice, progress });
  };

  const start = (voice: AdhanVoiceId) => {
    release();
    pauseQuranIfActive();
    sessionCount += 1;
    const id = sessionCount;
    const player = createAudioPlayer(CLIPS[voice], { updateInterval: STATUS_INTERVAL_MS });
    const subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      onStatus(id, status);
    });
    session = { id, voice, player, subscription };
    emit({ playingId: voice, progress: 0 });
    void ensureAudioMode().then(() => {
      if (session?.id !== id) {
        return;
      }
      player.play();
    });
  };

  const stop = () => {
    if (session === null) {
      return;
    }
    release();
    emit(IDLE);
  };

  return {
    /** Starts the voice, or stops it when it is the one playing. Starting another voice switches to it. */
    toggle(voice: AdhanVoiceId) {
      if (session?.voice === voice) {
        stop();
        return;
      }
      start(voice);
    },
    stop,
    /** Releases the player without a state change. The screen calls it on unmount. */
    dispose: release,
  };
}

export type AdhanPreview = ReturnType<typeof createAdhanPreview>;

/** The picker's preview. The state follows the player; the controls are stable across renders. */
export function useAdhanPreview(): AdhanPreviewControls {
  const [state, setState] = useState<AdhanPreviewState>(IDLE);
  const [preview] = useState<AdhanPreview>(() => createAdhanPreview(setState));

  useEffect(() => () => preview.dispose(), [preview]);

  // Quran audio starting stops the preview, as it stops an Azkar recording. The Quran store is only read here.
  useEffect(
    () =>
      usePlayerStore.subscribe((next, previous) => {
        const quranStarted = next.status !== previous.status && (next.status === 'playing' || next.status === 'loading');
        if (quranStarted) {
          preview.stop();
        }
      }),
    [preview],
  );

  return {
    ...state,
    toggle: (id) => preview.toggle(id),
    stop: () => preview.stop(),
  };
}
