import { renderHook } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { minutesUntil, remainingLabel } from '@/core/i18n/durations';
import { prayerClock } from '@/core/i18n/clock';
import { nextPrayer, timesFor } from '@/features/salah/data/prayer-times';
import { useNextPrayer, usePrayerLocation } from '@/features/salah/hooks';

import { useNextPrayerCard } from './next-prayer';

// Only the location is mocked. The times, the next prayer, the tick and the formatter are the real ones.
jest.mock('@/features/salah/hooks', () => {
  const actual = jest.requireActual<typeof import('@/features/salah/hooks')>('@/features/salah/hooks');
  return { ...actual, useNextPrayer: jest.fn(actual.useNextPrayer), usePrayerLocation: jest.fn() };
});

const cairo = { lat: 30.0444, lng: 31.2357 };
const now = new Date(2026, 10, 1, 12, 0, 0);

function setLocation(coords: { lat: number; lng: number } | null) {
  jest.mocked(usePrayerLocation).mockReturnValue({
    coords,
    permissionStatus: 'granted',
    refresh: jest.fn(),
    source: 'manual',
  } as unknown as ReturnType<typeof usePrayerLocation>);
}

describe('useNextPrayerCard', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now });
    i18n.changeLanguage('ar');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('asks for a location when there is none', async () => {
    setLocation(null);

    const { result } = await renderHook(() => useNextPrayerCard(now));

    expect(result.current).toEqual({ kind: 'noLocation' });
  });

  it('shows the next prayer, its time and the time left, with the shared formatter', async () => {
    setLocation(cairo);
    const next = nextPrayer(timesFor(now, cairo), now, cairo);
    if (next === null) {
      throw new Error('expected a next prayer');
    }
    const t = i18n.getFixedT('ar');

    const { result } = await renderHook(() => useNextPrayerCard(now));

    expect(result.current).toEqual({
      kind: 'prayer',
      name: t(`home.salah.${next.name}`),
      remaining: remainingLabel(minutesUntil(next.time, now), 'ar', t),
      time: prayerClock(next.time, 'ar'),
    });
  });

  it('reads as no prayer, without throwing, when the next prayer has no time', async () => {
    setLocation(cairo);
    jest.mocked(useNextPrayer).mockReturnValueOnce({ name: 'fajr', time: undefined } as never);

    const { result } = await renderHook(() => useNextPrayerCard(now));

    expect(result.current).toEqual({ kind: 'noLocation' });
  });

  it('reads the time in Arabic digits with the period marker', async () => {
    setLocation(cairo);

    const { result } = await renderHook(() => useNextPrayerCard(now));

    if (result.current.kind !== 'prayer') {
      throw new Error('expected a prayer');
    }
    expect(result.current.time).toMatch(/^[٠-٩]+:[٠-٩]{2} /);
    expect(result.current.remaining).toMatch(/^بعد /);
  });
});
