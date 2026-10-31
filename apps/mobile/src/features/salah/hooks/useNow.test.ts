import { renderHook, waitFor } from '@testing-library/react-native';

import { useNow } from './useNow';

// Real timers throughout: RNTL's act() never settles under jest fake timers.

describe('useNow', () => {
  it('returns the current time on mount', async () => {
    const before = Date.now();
    const { result } = await renderHook(() => useNow());

    expect(Math.abs(result.current.getTime() - before)).toBeLessThan(1000);
  });

  it('ticks forward on the interval', async () => {
    const { result } = await renderHook(() => useNow(20));
    const first = result.current;

    await waitFor(() => expect(result.current.getTime()).toBeGreaterThan(first.getTime()));
  });

  it('does not tick when the interval is Infinity', async () => {
    const { result } = await renderHook(() => useNow(Infinity));
    const first = result.current;

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(result.current).toBe(first);
  });

  it('stops ticking after unmount', async () => {
    const { result, unmount } = await renderHook(() => useNow(20));
    await waitFor(() => expect(result.current.getTime()).toBeGreaterThan(Date.now() - 1000));

    unmount();
    const stoppedAt = result.current;
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(result.current).toBe(stoppedAt);
  });
});
