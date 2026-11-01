import { act } from '@testing-library/react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioStatus } from 'expo-audio';

import { makeRecording, FIXTURE_RECORDING_URL } from '../../../../jest/azkar-audio-fixtures';
import { usePlayerStore } from '@/features/audio/playerStore';

import {
  pauseAzkarRecording,
  playAzkarRecording,
  replayAzkarRecording,
  resetAzkarPlaybackForTests,
  resumeAzkarRecording,
  seekAzkarRecording,
  stopAzkarRecording,
  useAzkarPlaybackStore,
} from './playback';

jest.mock('expo-audio', () => ({
  createAudioPlaylist: jest.fn(),
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

type FakePlayer = {
  addListener: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  emit: (status: Partial<AudioStatus>) => void;
  listenerCount: () => number;
};

/** A stand-in for expo-audio's AudioPlayer. `emit` delivers a status update to the playback listener. */
function makeFakePlayer(): FakePlayer {
  const listeners = new Set<(status: AudioStatus) => void>();
  return {
    addListener: jest.fn((event: string, listener: (status: AudioStatus) => void) => {
      if (event !== 'playbackStatusUpdate') {
        throw new Error(`Unexpected event ${event}`);
      }
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    }),
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    emit: (status) => {
      const full = {
        id: 'fake',
        currentTime: 0,
        duration: 0,
        playing: false,
        didJustFinish: false,
        isLoaded: true,
        ...status,
      } as AudioStatus;
      for (const listener of [...listeners]) {
        listener(full);
      }
    },
    listenerCount: () => listeners.size,
  };
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

const mockCreatePlayer = createAudioPlayer as unknown as jest.Mock;

function lastPlayer(): FakePlayer {
  const results = mockCreatePlayer.mock.results;
  return results[results.length - 1]?.value as FakePlayer;
}

describe('playAzkarRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePlayer.mockImplementation(() => makeFakePlayer());
    resetAzkarPlaybackForTests();
  });

  afterEach(() => {
    resetAzkarPlaybackForTests();
    usePlayerStore.setState({ status: 'idle' });
  });

  it('does nothing and creates no player unless the availability allows playback', () => {
    expect(playAzkarRecording(makeRecording(), 'none', { unitKey: 'u1' })).toBe(false);
    expect(playAzkarRecording(makeRecording(), 'stream_offline', { unitKey: 'u1' })).toBe(false);
    expect(mockCreatePlayer).not.toHaveBeenCalled();
    expect(useAzkarPlaybackStore.getState().unitKey).toBeNull();
  });

  it('streams a stream recording from its remote URL and plays it once audio mode is set', async () => {
    expect(playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' })).toBe(true);
    expect(mockCreatePlayer).toHaveBeenCalledWith({ uri: FIXTURE_RECORDING_URL }, { updateInterval: 250 });
    expect(useAzkarPlaybackStore.getState()).toMatchObject({ unitKey: 'u1', status: 'loading', durationMs: 65_000 });

    await flush();
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'doNotMix', shouldPlayInBackground: true }),
    );
    expect(lastPlayer().play).toHaveBeenCalledTimes(1);
    expect(useAzkarPlaybackStore.getState().status).toBe('playing');
  });

  it('plays a local recording the same way', async () => {
    playAzkarRecording(makeRecording({ downloadAllowed: true }), 'local', { unitKey: 'u1' });
    await flush();
    expect(lastPlayer().play).toHaveBeenCalledTimes(1);
  });

  it('still plays when the audio mode cannot be set', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(setAudioModeAsync).mockRejectedValueOnce(new Error('no audio session'));
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    await flush();
    expect(lastPlayer().play).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stops the previous recording and releases its player before starting another', async () => {
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    const first = lastPlayer();
    playAzkarRecording(makeRecording({ recordingKey: 'fixture:recording-002' }), 'stream', { unitKey: 'u2' });

    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(first.pause).toHaveBeenCalled();
    expect(first.listenerCount()).toBe(0);
    expect(useAzkarPlaybackStore.getState().unitKey).toBe('u2');
  });

  it('follows the status: position, duration and playing', async () => {
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    await flush();

    act(() => lastPlayer().emit({ playing: true, currentTime: 12.5, duration: 65 }));
    expect(useAzkarPlaybackStore.getState()).toMatchObject({ status: 'playing', positionMs: 12_500, durationMs: 65_000 });

    act(() => lastPlayer().emit({ playing: false, currentTime: 13, duration: 65 }));
    expect(useAzkarPlaybackStore.getState().status).toBe('paused');
  });

  it('keeps the placeholder duration until the player reports one', async () => {
    playAzkarRecording(makeRecording({ durationMs: 40_000 }), 'stream', { unitKey: 'u1' });
    await flush();
    act(() => lastPlayer().emit({ playing: true, currentTime: 1, duration: 0 }));
    expect(useAzkarPlaybackStore.getState().durationMs).toBe(40_000);
  });

  it('finishes once, keeps the player for replay, and calls the reader back', async () => {
    const onEnded = jest.fn();
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1', onEnded });
    await flush();
    act(() => lastPlayer().emit({ playing: true, currentTime: 64, duration: 65 }));

    act(() => lastPlayer().emit({ playing: false, didJustFinish: true, currentTime: 65, duration: 65 }));
    expect(useAzkarPlaybackStore.getState().status).toBe('finished');
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(lastPlayer().remove).not.toHaveBeenCalled();
  });

  it('ignores status from a player that was replaced', async () => {
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    const first = lastPlayer();
    playAzkarRecording(makeRecording({ recordingKey: 'fixture:recording-002' }), 'stream', { unitKey: 'u2' });
    await flush();

    act(() => first.emit({ playing: true, currentTime: 30, duration: 65 }));
    expect(useAzkarPlaybackStore.getState().positionMs).toBe(0);
  });
});

describe('transport controls', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockCreatePlayer.mockImplementation(() => makeFakePlayer());
    resetAzkarPlaybackForTests();
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    await flush();
    act(() => lastPlayer().emit({ playing: true, currentTime: 10, duration: 65 }));
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetAzkarPlaybackForTests();
    usePlayerStore.setState({ status: 'idle' });
  });

  it('pauses a playing recording', () => {
    pauseAzkarRecording();
    expect(lastPlayer().pause).toHaveBeenCalledTimes(1);
    expect(useAzkarPlaybackStore.getState().status).toBe('paused');
  });

  it('does nothing to pause when nothing is playing', () => {
    pauseAzkarRecording();
    pauseAzkarRecording();
    expect(lastPlayer().pause).toHaveBeenCalledTimes(1);
  });

  it('resumes a paused recording from its position', () => {
    pauseAzkarRecording();
    jest.clearAllMocks();
    resumeAzkarRecording();
    expect(lastPlayer().play).toHaveBeenCalledTimes(1);
    expect(lastPlayer().seekTo).not.toHaveBeenCalled();
    expect(useAzkarPlaybackStore.getState().status).toBe('playing');
  });

  it('restarts from the beginning when resumed after it finished', () => {
    act(() => lastPlayer().emit({ playing: false, didJustFinish: true, currentTime: 65, duration: 65 }));
    jest.clearAllMocks();
    resumeAzkarRecording();
    expect(lastPlayer().seekTo).toHaveBeenCalledWith(0);
  });

  it('replays from the start and plays again', async () => {
    replayAzkarRecording();
    expect(lastPlayer().seekTo).toHaveBeenCalledWith(0);
    expect(useAzkarPlaybackStore.getState()).toMatchObject({ status: 'loading', positionMs: 0 });
    await flush();
    expect(lastPlayer().play).toHaveBeenCalledTimes(1);
    expect(useAzkarPlaybackStore.getState().status).toBe('playing');
  });

  it('seeks in seconds and clamps to the duration', () => {
    seekAzkarRecording(20_000);
    expect(lastPlayer().seekTo).toHaveBeenLastCalledWith(20);
    expect(useAzkarPlaybackStore.getState().positionMs).toBe(20_000);

    seekAzkarRecording(999_000);
    expect(lastPlayer().seekTo).toHaveBeenLastCalledWith(65);
    expect(useAzkarPlaybackStore.getState().positionMs).toBe(65_000);

    seekAzkarRecording(-5);
    expect(lastPlayer().seekTo).toHaveBeenLastCalledWith(0);
  });

  it('stops: releases the player and resets the state', () => {
    const player = lastPlayer();
    stopAzkarRecording();
    expect(player.pause).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalledTimes(1);
    expect(player.listenerCount()).toBe(0);
    expect(useAzkarPlaybackStore.getState()).toEqual({ unitKey: null, status: 'idle', positionMs: 0, durationMs: 0 });
  });

  it('ignores the transport calls once stopped', () => {
    stopAzkarRecording();
    jest.clearAllMocks();
    pauseAzkarRecording();
    resumeAzkarRecording();
    replayAzkarRecording();
    seekAzkarRecording(1000);
    expect(mockCreatePlayer).not.toHaveBeenCalled();
    expect(useAzkarPlaybackStore.getState().status).toBe('idle');
  });
});

describe('isolation from the Quran player', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePlayer.mockImplementation(() => makeFakePlayer());
    resetAzkarPlaybackForTests();
    usePlayerStore.setState({ status: 'idle' });
  });

  afterEach(() => {
    resetAzkarPlaybackForTests();
    usePlayerStore.setState({ status: 'idle' });
  });

  it('never writes the Quran store when it plays', async () => {
    const before = usePlayerStore.getState();
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    await flush();
    act(() => lastPlayer().emit({ playing: true, currentTime: 1, duration: 65 }));
    pauseAzkarRecording();
    stopAzkarRecording();
    expect(usePlayerStore.getState()).toBe(before);
  });

  it('stops the Azkar recording when Quran audio starts playing', async () => {
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    await flush();
    const player = lastPlayer();

    act(() => {
      usePlayerStore.setState({ status: 'playing' });
    });
    expect(player.remove).toHaveBeenCalledTimes(1);
    expect(useAzkarPlaybackStore.getState().status).toBe('idle');
  });

  it('stops the Azkar recording when Quran audio starts loading', () => {
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    act(() => {
      usePlayerStore.setState({ status: 'loading' });
    });
    expect(useAzkarPlaybackStore.getState().unitKey).toBeNull();
  });

  it('does not stop for Quran status changes that are not a start', () => {
    playAzkarRecording(makeRecording(), 'stream', { unitKey: 'u1' });
    act(() => {
      usePlayerStore.setState({ status: 'paused' });
    });
    expect(useAzkarPlaybackStore.getState().unitKey).toBe('u1');
  });
});
