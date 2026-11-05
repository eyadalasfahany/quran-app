import { act, renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { MINI_PLAYER_CAPSULE_FOOTPRINT, MINI_PLAYER_READER_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { usePlayerStore } from '@/features/audio/playerStore';
import { useMiniUnavailable } from '@/features/audio/hooks/useMiniUnavailable';
import { resetSkipNoticeForTests, useSkipNoticeStore } from '@/features/audio/skip-notice';

import { useReaderMiniCollapse } from './mini-bar-collapse';
import { readerMiniFootprint, useReaderMiniFootprint } from './useReaderMiniFootprint';
import { useReaderSettings } from './settings';

// The notice's own rule is tested in useMiniUnavailable.test.tsx; here only the footprint it reserves matters.
jest.mock('@/features/audio/hooks/useMiniUnavailable', () => ({ useMiniUnavailable: jest.fn(() => null) }));

function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
  });
}

describe('readerMiniFootprint', () => {
  it('reserves the bar: 28 above the safe area, 68 high, and the 12 gap (108)', () => {
    expect(readerMiniFootprint(true, false)).toEqual({ bottom: 28, collapsed: false, footprint: 108, height: 68, shown: true });
    expect(MINI_PLAYER_READER_FOOTPRINT).toBe(108);
  });

  it('reserves the capsule: its hit area, 18 above the safe area and 44 high (62)', () => {
    expect(readerMiniFootprint(true, true)).toEqual({ bottom: 18, collapsed: true, footprint: 62, height: 44, shown: true });
    expect(MINI_PLAYER_CAPSULE_FOOTPRINT).toBe(62);
  });

  it('reserves nothing when hidden, collapsed or not', () => {
    expect(readerMiniFootprint(false, false)).toMatchObject({ footprint: 0, height: 0, shown: false });
    expect(readerMiniFootprint(false, true)).toMatchObject({ footprint: 0, height: 0, shown: false });
  });
});

describe('readerMiniFootprint with the unavailable notice', () => {
  it('reserves the unavailable bar when it is shown and expanded: 28 above, 136 high, 176 with the gap', () => {
    expect(readerMiniFootprint(true, false, true)).toEqual({ bottom: 28, collapsed: false, footprint: 176, height: 136, shown: true });
  });

  it('reserves the capsule when collapsed, even while unavailable', () => {
    expect(readerMiniFootprint(true, true, true)).toEqual({ bottom: 18, collapsed: true, footprint: 62, height: 44, shown: true });
  });

  it('reserves nothing when hidden, even while unavailable', () => {
    expect(readerMiniFootprint(false, false, true)).toMatchObject({ footprint: 0, height: 0, shown: false });
  });

  it('keeps the playing bar footprint when not unavailable', () => {
    expect(readerMiniFootprint(true, false, false)).toMatchObject({ footprint: 108, height: 68 });
  });
});

describe('useReaderMiniFootprint', () => {
  beforeEach(() => {
    setWindowWidth(390);
    usePlayerStore.getState().reset();
    useReaderMiniCollapse.getState().setCollapsed(false);
    useReaderSettings.setState({ mode: 'reading' });
  });

  afterEach(() => {
    useReaderMiniCollapse.getState().setCollapsed(false);
  });

  it('is hidden while nothing is loaded and no reciter resolves, so nothing is reserved', async () => {
    usePlayerStore.getState().markStopped();
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current.footprint).toBe(0);
  });

  it('reserves the bar while playing in Reading', async () => {
    usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
    usePlayerStore.getState().markPlaying();
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current).toMatchObject({ collapsed: false, footprint: 108, shown: true });
  });

  it('reserves the capsule footprint when collapsed', async () => {
    usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
    usePlayerStore.getState().markPlaying();
    useReaderMiniCollapse.getState().setCollapsed(true);
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current).toMatchObject({ bottom: 18, collapsed: true, footprint: 62, height: 44, shown: true });
  });

  it('reserves nothing in Focus, which has its own transport', async () => {
    usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
    usePlayerStore.getState().markPlaying();
    useReaderSettings.setState({ mode: 'focus' });
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current.footprint).toBe(0);
  });

  it('reserves nothing on an expanded window, where the bar is hidden', async () => {
    setWindowWidth(1000);
    usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
    usePlayerStore.getState().markPlaying();
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current.footprint).toBe(0);
  });
});

describe('useReaderMiniFootprint while a surah is unavailable', () => {
  beforeEach(() => {
    setWindowWidth(390);
    usePlayerStore.getState().reset();
    useReaderMiniCollapse.getState().setCollapsed(false);
    useReaderSettings.setState({ mode: 'reading' });
  });

  afterEach(() => {
    jest.mocked(useMiniUnavailable).mockReturnValue(null);
    useReaderMiniCollapse.getState().setCollapsed(false);
  });

  it('reserves the taller bar while the notice holds', async () => {
    usePlayerStore.getState().markUnavailable({ reciterId: 30, chapterId: 37 });
    jest.mocked(useMiniUnavailable).mockReturnValue({ reciterId: 30, chapterId: 37 });
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current).toMatchObject({ footprint: 176, height: 136, shown: true });
  });

  it('goes back to the playing bar footprint once the notice no longer holds', async () => {
    usePlayerStore.getState().markUnavailable({ reciterId: 30, chapterId: 37 });
    jest.mocked(useMiniUnavailable).mockReturnValue(null);
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current).toMatchObject({ footprint: 108, height: 68, shown: true });
  });
});

describe('readerMiniFootprint with the skip notice (ADR 0062)', () => {
  it('reserves the playing bar and its notice line: 28 above, 86 high, 126 with the gap', () => {
    expect(readerMiniFootprint(true, false, false, true)).toEqual({ bottom: 28, collapsed: false, footprint: 126, height: 86, shown: true });
  });

  it('keeps the capsule footprint when collapsed, notice or not', () => {
    expect(readerMiniFootprint(true, true, false, true)).toMatchObject({ footprint: 62, height: 44 });
  });

  it('reserves nothing when hidden, notice or not', () => {
    expect(readerMiniFootprint(false, false, false, true)).toMatchObject({ footprint: 0, height: 0, shown: false });
  });
});

describe('useReaderMiniFootprint while a skip notice shows', () => {
  beforeEach(() => {
    setWindowWidth(390);
    usePlayerStore.getState().reset();
    useReaderMiniCollapse.getState().setCollapsed(false);
    useReaderSettings.setState({ mode: 'reading' });
  });

  afterEach(async () => {
    await act(async () => {
      resetSkipNoticeForTests();
    });
  });

  it('reserves the notice line while audio plays', async () => {
    usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
    usePlayerStore.getState().markPlaying();
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [38] });
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current).toMatchObject({ footprint: 126, height: 86, shown: true });
  });

  it('reserves no notice line once the audio is paused, since the bar draws none', async () => {
    usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
    usePlayerStore.getState().markPlaying();
    usePlayerStore.getState().markPaused();
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [38] });
    const { result } = await renderHook(() => useReaderMiniFootprint());

    expect(result.current).toMatchObject({ footprint: 108, height: 68 });
  });
});
