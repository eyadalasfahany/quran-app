import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { MINI_PLAYER_CAPSULE_FOOTPRINT, MINI_PLAYER_READER_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { usePlayerStore } from '@/features/audio/playerStore';

import { useReaderMiniCollapse } from './mini-bar-collapse';
import { readerMiniFootprint, useReaderMiniFootprint } from './useReaderMiniFootprint';
import { useReaderSettings } from './settings';

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
