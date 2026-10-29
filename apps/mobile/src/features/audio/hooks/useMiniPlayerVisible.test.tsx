import { act, renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { usePlayerStore } from '../playerStore';
import { useMiniPlayerVisible } from './useMiniPlayerVisible';

function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
  });
}

// Loads a surah and moves it to the given status, as the player engine does.
function setStatus(status: 'idle' | 'loading' | 'playing' | 'paused' | 'error') {
  const store = usePlayerStore.getState();
  store.reset();
  if (status === 'idle') {
    return;
  }
  store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
  if (status === 'playing') {
    store.markPlaying();
  }
  if (status === 'paused') {
    store.markPlaying();
    store.markPaused();
  }
  if (status === 'error') {
    store.markFailed('load-failed');
  }
}

describe('useMiniPlayerVisible', () => {
  beforeEach(() => {
    setWindowWidth(390);
    usePlayerStore.getState().reset();
  });

  it.each(['tabs', 'reader'] as const)('is hidden while the player is idle (%s)', async (variant) => {
    const { result } = await renderHook(() => useMiniPlayerVisible(variant));

    expect(result.current).toBe(false);
  });

  it.each(['loading', 'playing', 'paused', 'error'] as const)('is shown once the player is %s', async (status) => {
    setStatus(status);
    const { result } = await renderHook(() => useMiniPlayerVisible('tabs'));

    expect(result.current).toBe(true);
  });

  it('is shown on a medium window', async () => {
    setWindowWidth(700);
    setStatus('playing');
    const { result } = await renderHook(() => useMiniPlayerVisible('reader'));

    expect(result.current).toBe(true);
  });

  it('is hidden on an expanded window, even while playing', async () => {
    setWindowWidth(1000);
    setStatus('playing');
    const { result } = await renderHook(() => useMiniPlayerVisible('tabs'));

    expect(result.current).toBe(false);
  });

  it('follows the status when it changes', async () => {
    const { result } = await renderHook(() => useMiniPlayerVisible('tabs'));
    expect(result.current).toBe(false);

    await act(() => {
      setStatus('playing');
    });
    expect(result.current).toBe(true);
  });
});
