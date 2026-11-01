import { act, renderHook } from '@testing-library/react-native';

import { timesFor } from '../data/prayer-times';
import { usePrayerClock, useTodayTimes } from './index';

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const MORNING = new Date(2026, 9, 31, 8, 0, 0, 0);

describe('usePrayerClock and useTodayTimes', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: MORNING });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not re-render between prayer boundaries (no per-second tick on the screen)', async () => {
    const { result } = await renderHook(() => usePrayerClock(RIYADH));
    const first = result.current.now;

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current.now).toBe(first);
  });

  it('re-renders at the next prayer time, so the active row moves on time', async () => {
    const dhuhr = timesFor(MORNING, RIYADH).dhuhr;
    const { result } = await renderHook(() => usePrayerClock(RIYADH));
    const first = result.current.now;

    await act(async () => {
      jest.advanceTimersByTime(dhuhr.getTime() - MORNING.getTime() + 100);
    });

    expect(result.current.now).not.toBe(first);
    expect(result.current.now.getTime()).toBeGreaterThanOrEqual(dhuhr.getTime());
  });

  it('gives the day’s times without a location as null', async () => {
    const { result } = await renderHook(() => usePrayerClock(null));

    expect(result.current.times).toBeNull();
  });

  it('keeps the same times object for the whole local day, whatever the time of day', async () => {
    const { result, rerender } = await renderHook(
      ({ at }: { at: Date }) => useTodayTimes(RIYADH, at),
      { initialProps: { at: MORNING } },
    );
    const first = result.current;

    await rerender({ at: new Date(2026, 9, 31, 15, 30, 0, 0) });

    expect(result.current).toBe(first);
  });

  it('recomputes the times on the next local day', async () => {
    const { result, rerender } = await renderHook(
      ({ at }: { at: Date }) => useTodayTimes(RIYADH, at),
      { initialProps: { at: MORNING } },
    );
    const first = result.current;

    await rerender({ at: new Date(2026, 10, 1, 8, 0, 0, 0) });

    expect(result.current).not.toBe(first);
    expect(result.current?.fajr.getDate()).toBe(1);
  });
});
