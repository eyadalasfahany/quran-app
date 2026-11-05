import { act, renderHook } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';

import { usePlayerStore } from '@/features/audio/playerStore';
import { resetSkipNoticeForTests, useSkipNoticeStore } from '@/features/audio/skip-notice';

import { useTabContentBottom } from './useTabContentBottom';

let mockBottomInset = 0;

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: mockBottomInset, left: 0, right: 0, top: 0 }),
  };
});

function setPlatform(os: Platform['OS']) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

function startLoad() {
  usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
}

describe('useTabContentBottom', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    mockBottomInset = 0;
    usePlayerStore.getState().reset();
    Dimensions.set({
      screen: { fontScale: 1, height: 844, scale: 1, width: 390 },
      window: { fontScale: 1, height: 844, scale: 1, width: 390 },
    });
  });

  afterEach(async () => {
    setPlatform(originalOs);
    await act(async () => {
      resetSkipNoticeForTests();
    });
  });

  it('adds the native bar footprint on iOS while the player is idle, since the bar does not inset scroll views', async () => {
    setPlatform('ios');
    const { result } = await renderHook(() => useTabContentBottom());

    expect(result.current).toBe(92);
  });

  it('adds the bar footprint and the mini player footprint on iOS while something is loaded', async () => {
    setPlatform('ios');
    startLoad();
    const { result } = await renderHook(() => useTabContentBottom());

    expect(result.current).toBe(92 + 76);
  });

  it('clears the Android floating bar while the player is idle, from the system inset (ADR 0033)', async () => {
    setPlatform('android');
    mockBottomInset = 24;
    const { result } = await renderHook(() => useTabContentBottom());

    expect(result.current).toBe(100);
  });

  it('clears the Android floating bar and the mini player together while something is loaded', async () => {
    setPlatform('android');
    startLoad();
    const { result } = await renderHook(() => useTabContentBottom());

    expect(result.current).toBe(76 + 76);
  });

  it('adds the skip notice line to the mini player footprint while it shows (ADR 0062)', async () => {
    setPlatform('android');
    startLoad();
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [38] });
    const { result } = await renderHook(() => useTabContentBottom());

    expect(result.current).toBe(76 + 76 + 18);
  });

  it('does not add the notice line while nothing plays, since the bar is not drawn', async () => {
    setPlatform('android');
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [38] });
    const { result } = await renderHook(() => useTabContentBottom());

    // Only the Android floating-bar clearance (76) remains: no mini player footprint and no notice line.
    expect(result.current).toBe(76);
  });
});
