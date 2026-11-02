import { act, renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';

import { usePlayerStore } from '../playerStore';
import { useMiniPlayerVisible } from './useMiniPlayerVisible';

// The reciter a play would use: null until a test sets one.
let mockReciter: { resourceId: number } | null = null;
jest.mock('../play-verse', () => ({ catalogueReciter: () => mockReciter }));

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
    storage.remove(storageKeys.readerLastVerseKey);
  });

  it.each(['tabs', 'reader', 'sidebar'] as const)('is hidden while the player is idle (%s)', async (variant) => {
    const { result } = await renderHook(() => useMiniPlayerVisible(variant));

    expect(result.current).toBe(false);
  });

  it('shows the reader bar while idle when a reciter resolves, even with no saved ayah', async () => {
    mockReciter = { resourceId: 30 };
    try {
      const reader = await renderHook(() => useMiniPlayerVisible('reader'));
      expect(reader.result.current).toBe(true);
    } finally {
      mockReciter = null;
    }
  });

  it.each(['tabs', 'sidebar'] as const)('shows the %s bar while idle once an ayah is saved and a reciter resolves', async (variant) => {
    setWindowWidth(variant === 'sidebar' ? 1000 : 390);
    mockReciter = { resourceId: 30 };
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    try {
      const { result } = await renderHook(() => useMiniPlayerVisible(variant));
      expect(result.current).toBe(true);
    } finally {
      mockReciter = null;
    }
  });

  it.each(['tabs', 'sidebar'] as const)('hides the %s bar while idle with a reciter but no saved ayah', async (variant) => {
    setWindowWidth(variant === 'sidebar' ? 1000 : 390);
    mockReciter = { resourceId: 30 };
    try {
      const { result } = await renderHook(() => useMiniPlayerVisible(variant));
      expect(result.current).toBe(false);
    } finally {
      mockReciter = null;
    }
  });

  it.each(['tabs', 'sidebar'] as const)('hides the %s bar while idle with a saved ayah but no reciter', async (variant) => {
    setWindowWidth(variant === 'sidebar' ? 1000 : 390);
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    const { result } = await renderHook(() => useMiniPlayerVisible(variant));

    expect(result.current).toBe(false);
  });

  it('keeps the tabs bar hidden on an expanded window while idle, even with a saved ayah and a reciter', async () => {
    setWindowWidth(1000);
    mockReciter = { resourceId: 30 };
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    try {
      const { result } = await renderHook(() => useMiniPlayerVisible('tabs'));
      expect(result.current).toBe(false);
    } finally {
      mockReciter = null;
    }
  });

  it('keeps the sidebar footer hidden on a compact window while idle, even with a saved ayah and a reciter', async () => {
    mockReciter = { resourceId: 30 };
    storage.set(storageKeys.readerLastVerseKey, '2:255');
    try {
      const { result } = await renderHook(() => useMiniPlayerVisible('sidebar'));
      expect(result.current).toBe(false);
    } finally {
      mockReciter = null;
    }
  });

  it('hides the idle reader bar on an expanded window, even with a reciter', async () => {
    setWindowWidth(1000);
    mockReciter = { resourceId: 30 };
    try {
      const { result } = await renderHook(() => useMiniPlayerVisible('reader'));
      expect(result.current).toBe(false);
    } finally {
      mockReciter = null;
    }
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

  it('shows the sidebar footer on an expanded window while playing', async () => {
    setWindowWidth(1000);
    setStatus('playing');
    const { result } = await renderHook(() => useMiniPlayerVisible('sidebar'));

    expect(result.current).toBe(true);
  });

  it.each(['compact', 'medium'] as const)('hides the sidebar footer on a %s window, even while playing', async (windowClass) => {
    setWindowWidth(windowClass === 'compact' ? 390 : 700);
    setStatus('playing');
    const { result } = await renderHook(() => useMiniPlayerVisible('sidebar'));

    expect(result.current).toBe(false);
  });

  it('shows the sidebar footer on an expanded window once a surah is loaded and paused', async () => {
    setWindowWidth(1000);
    setStatus('paused');
    const { result } = await renderHook(() => useMiniPlayerVisible('sidebar'));

    expect(result.current).toBe(true);
  });

  it('hides the sidebar footer on an expanded window while idle', async () => {
    setWindowWidth(1000);
    const { result } = await renderHook(() => useMiniPlayerVisible('sidebar'));

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
