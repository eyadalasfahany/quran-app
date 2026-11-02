import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { useTabRail } from './useTabRail';

function setWindow(width: number, height: number) {
  Dimensions.set({
    screen: { fontScale: 1, height, scale: 1, width },
    window: { fontScale: 1, height, scale: 1, width },
  });
}

describe('useTabRail (ADR 0036, ADR 0051 as amended 2 Nov 2026)', () => {
  afterEach(() => {
    setWindow(390, 844);
  });

  it.each<[string, number, number]>([
    ['a phone in portrait', 390, 844],
    ['a large phone in portrait', 430, 932],
    ['a medium window (a foldable or iPad mini in portrait)', 700, 1000],
    ['a medium window at its widest', 839, 1100],
  ])('is false on %s, which keeps the bottom bar', async (_name, width, height) => {
    setWindow(width, height);
    const { result } = await renderHook(() => useTabRail());

    expect(result.current).toBe(false);
  });

  it.each<[string, number, number]>([
    ['a landscape phone', 844, 390],
    ['a large landscape phone', 956, 440],
  ])('is true on %s, a short window', async (_name, width, height) => {
    setWindow(width, height);
    const { result } = await renderHook(() => useTabRail());

    expect(result.current).toBe(true);
  });

  it.each<[string, number, number]>([
    ['a 1024 by 768 window', 1024, 768],
    ['a 1280 by 800 window', 1280, 800],
    ['an iPad in portrait, 1024 by 1366', 1024, 1366],
    ['an Android tablet in landscape, 2560 by 1600', 2560, 1600],
  ])('is true on an expanded window: %s', async (_name, width, height) => {
    setWindow(width, height);
    const { result } = await renderHook(() => useTabRail());

    expect(result.current).toBe(true);
  });

  it('follows the window when it is resized from a phone to a tablet', async () => {
    setWindow(390, 844);
    const { result, rerender } = await renderHook(() => useTabRail());
    expect(result.current).toBe(false);

    setWindow(1024, 768);
    await rerender({});
    expect(result.current).toBe(true);
  });
});
