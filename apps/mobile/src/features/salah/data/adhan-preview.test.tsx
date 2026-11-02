import { act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioStatus } from 'expo-audio';

import { pause, resume } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';

import { renderUi } from '../../../../jest/render-ui';

import { createAdhanPreview, useAdhanPreview, type AdhanPreviewControls, type AdhanPreviewState } from './adhan-preview';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// The Quran player's pause and resume. Mocked so the test sees the calls, not the playlist.
jest.mock('@/features/audio/player', () => ({
  pause: jest.fn(),
  resume: jest.fn(() => Promise.resolve()),
}));

type FakePlayer = {
  addListener: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  emit: (status: Partial<AudioStatus>) => void;
  listenerCount: () => number;
};

/** A stand-in for expo-audio's AudioPlayer. `emit` delivers a status update to its listener. */
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
    emit: (status) => {
      const full = { id: 'fake', currentTime: 0, duration: 0, playing: false, didJustFinish: false, isLoaded: true, ...status } as AudioStatus;
      for (const listener of [...listeners]) {
        listener(full);
      }
    },
    listenerCount: () => listeners.size,
  };
}

const createdPlayers: FakePlayer[] = [];

/** The n-th player the module created; fails the test if it did not create one. */
function playerAt(index: number): FakePlayer {
  const player = createdPlayers[index];
  if (player === undefined) {
    throw new Error(`no player ${index}`);
  }
  return player;
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

function setQuranStatus(status: 'idle' | 'loading' | 'playing' | 'paused' | 'error') {
  usePlayerStore.setState({ status });
}

describe('adhan preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createdPlayers.length = 0;
    jest.mocked(createAudioPlayer).mockImplementation(() => {
      const player = makeFakePlayer();
      createdPlayers.push(player);
      return player as unknown as ReturnType<typeof createAudioPlayer>;
    });
    setQuranStatus('idle');
  });

  function makePreview() {
    const states: AdhanPreviewState[] = [];
    const preview = createAdhanPreview((state) => states.push(state));
    return { preview, states, last: () => states[states.length - 1] };
  }

  it('starts a voice, reports it as playing, and plays its clip', async () => {
    const { preview, last } = makePreview();

    preview.toggle('makkah');
    await flush();

    expect(last()).toEqual({ playingId: 'makkah', progress: 0 });
    expect(createdPlayers).toHaveLength(1);
    expect(playerAt(0).play).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ playsInSilentMode: true }));
  });

  it('stops when the same voice is toggled again', async () => {
    const { preview, last } = makePreview();
    preview.toggle('makkah');
    await flush();

    preview.toggle('makkah');

    expect(last()).toEqual({ playingId: null, progress: 0 });
    expect(playerAt(0).pause).toHaveBeenCalled();
    expect(playerAt(0).remove).toHaveBeenCalled();
    expect(playerAt(0).listenerCount()).toBe(0);
  });

  it('switches to another voice, releasing the first player', async () => {
    const { preview, last } = makePreview();
    preview.toggle('makkah');
    await flush();

    preview.toggle('madinah');
    await flush();

    expect(last()).toEqual({ playingId: 'madinah', progress: 0 });
    expect(createdPlayers).toHaveLength(2);
    expect(playerAt(0).remove).toHaveBeenCalled();
    expect(playerAt(1).play).toHaveBeenCalledTimes(1);
  });

  it('ignores a late status event from the player it switched away from', async () => {
    const { preview, last } = makePreview();
    preview.toggle('makkah');
    await flush();
    preview.toggle('madinah');
    await flush();

    playerAt(0).emit({ currentTime: 2, duration: 5, playing: true });

    expect(last()).toEqual({ playingId: 'madinah', progress: 0 });
  });

  it('reports progress as a fraction of the clip', async () => {
    const { preview, last } = makePreview();
    preview.toggle('allahu_akbar_short');
    await flush();

    playerAt(0).emit({ currentTime: 2.5, duration: 5, playing: true });

    expect(last()).toEqual({ playingId: 'allahu_akbar_short', progress: 0.5 });
  });

  it('clears playingId when the clip ends', async () => {
    const { preview, last } = makePreview();
    preview.toggle('makkah');
    await flush();

    playerAt(0).emit({ currentTime: 5.9, duration: 5.9, didJustFinish: true });

    expect(last()).toEqual({ playingId: null, progress: 0 });
    expect(playerAt(0).listenerCount()).toBe(0);
  });

  it('pauses Quran audio when it is playing before a preview starts', async () => {
    setQuranStatus('playing');
    const { preview } = makePreview();

    preview.toggle('makkah');
    await flush();

    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('pauses Quran audio when it is loading before a preview starts', async () => {
    setQuranStatus('loading');
    const { preview } = makePreview();

    preview.toggle('makkah');
    await flush();

    expect(pause).toHaveBeenCalledTimes(1);
  });

  it.each(['paused', 'idle', 'error'] as const)('leaves Quran audio alone when it is %s', async (status) => {
    setQuranStatus(status);
    const { preview } = makePreview();

    preview.toggle('makkah');
    await flush();

    expect(pause).not.toHaveBeenCalled();
  });

  it('never resumes Quran audio', async () => {
    setQuranStatus('playing');
    const { preview } = makePreview();

    preview.toggle('makkah');
    preview.toggle('makkah');
    preview.toggle('madinah');
    await flush();
    preview.stop();

    expect(resume).not.toHaveBeenCalled();
  });

  it('never writes the Quran player store', async () => {
    setQuranStatus('idle');
    const before = usePlayerStore.getState();
    const { preview } = makePreview();

    preview.toggle('makkah');
    await flush();
    playerAt(0).emit({ currentTime: 1, duration: 5, playing: true });
    preview.stop();

    const after = usePlayerStore.getState();
    expect(after.chapterId).toBe(before.chapterId);
    expect(after.activeVerseId).toBe(before.activeVerseId);
    expect(after.positionMs).toBe(before.positionMs);
    expect(after.status).toBe('idle');
  });

  it('stops when the controller is disposed, without a state change', async () => {
    const { preview, states } = makePreview();
    preview.toggle('makkah');
    await flush();
    const count = states.length;

    preview.dispose();

    expect(playerAt(0).remove).toHaveBeenCalled();
    expect(states).toHaveLength(count);
  });

  it('does nothing when stop is called with nothing playing', () => {
    const { preview, states } = makePreview();

    preview.stop();

    expect(states).toHaveLength(0);
  });
});

/** Runs a state change inside an async act, as the other hook tests do under `renderUi`. */
const run = (change: () => void) =>
  act(async () => {
    change();
    await Promise.resolve();
  });

/**
 * Renders the hook and shows its state as text, so tests read what a screen would show. The controls are stable, so the
 * probe hands them out once, from the first render.
 */
function Probe({ onControls }: { onControls: (controls: AdhanPreviewControls) => void }) {
  const controls = useAdhanPreview();
  onControls(controls);
  return <Text testID="preview-state">{`${controls.playingId ?? 'none'}|${controls.progress}`}</Text>;
}

describe('useAdhanPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createdPlayers.length = 0;
    jest.mocked(createAudioPlayer).mockImplementation(() => {
      const player = makeFakePlayer();
      createdPlayers.push(player);
      return player as unknown as ReturnType<typeof createAudioPlayer>;
    });
    setQuranStatus('idle');
  });

  async function mountProbe() {
    let controls: AdhanPreviewControls | null = null;
    const view = await renderUi(<Probe onControls={(value) => (controls ??= value)} />);
    const current = (): AdhanPreviewControls => {
      if (controls === null) {
        throw new Error('the probe did not render');
      }
      return controls;
    };
    return { view, current, shown: () => view.getByTestId('preview-state').props.children as string };
  }

  it('starts, switches and stops through the hook', async () => {
    const { current, shown } = await mountProbe();

    await run(() => current().toggle('makkah'));
    await flush();
    expect(shown()).toBe('makkah|0');

    await run(() => current().toggle('madinah'));
    await flush();
    expect(shown()).toBe('madinah|0');

    await run(() => current().stop());
    expect(shown()).toBe('none|0');
  });

  it('reflects the clip progress', async () => {
    const { current, shown } = await mountProbe();
    await run(() => current().toggle('makkah'));
    await flush();

    await run(() => playerAt(0).emit({ currentTime: 1, duration: 4, playing: true }));

    expect(shown()).toBe('makkah|0.25');
  });

  it('stops the preview when Quran audio starts', async () => {
    const { current, shown } = await mountProbe();
    await run(() => current().toggle('makkah'));
    await flush();

    await run(() => setQuranStatus('loading'));

    expect(shown()).toBe('none|0');
    expect(playerAt(0).remove).toHaveBeenCalled();
  });

  it('keeps the preview when Quran audio pauses', async () => {
    setQuranStatus('playing');
    const { current, shown } = await mountProbe();
    await run(() => current().toggle('makkah'));
    await flush();

    await run(() => setQuranStatus('paused'));

    expect(shown()).toBe('makkah|0');
  });

  it('stops playback on unmount', async () => {
    const { view, current } = await mountProbe();
    await run(() => current().toggle('makkah'));
    await flush();

    await act(async () => {
      view.unmount();
    });

    expect(playerAt(0).remove).toHaveBeenCalled();
    expect(playerAt(0).listenerCount()).toBe(0);
  });
});
