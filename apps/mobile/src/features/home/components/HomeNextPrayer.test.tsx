import { act, fireEvent, screen } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { minutesUntil, remainingLabel } from '@/core/i18n/durations';
import { nextPrayer, timesFor } from '@/features/salah/data/prayer-times';
import { useNextPrayer, usePrayerLocation } from '@/features/salah/hooks';
import { renderUi } from '../../../../jest/render-ui';

import { HomeNextPrayer, HOME_PRAYER_TICK_MS } from './HomeNextPrayer';

// Only the location is mocked (and the next prayer, to force a missing time). The times and the tick are the real ones.
jest.mock('@/features/salah/hooks', () => {
  const actual = jest.requireActual<typeof import('@/features/salah/hooks')>('@/features/salah/hooks');
  return { ...actual, useNextPrayer: jest.fn(actual.useNextPrayer), usePrayerLocation: jest.fn() };
});

const cairo = { lat: 30.0444, lng: 31.2357 };
const start = new Date(2026, 10, 1, 12, 0, 0);

function setLocation(coords: { lat: number; lng: number } | null) {
  jest.mocked(usePrayerLocation).mockReturnValue({
    coords,
    permissionStatus: 'granted',
    refresh: jest.fn(),
    source: 'manual',
  } as unknown as ReturnType<typeof usePrayerLocation>);
}

describe('HomeNextPrayer', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: start });
    i18n.changeLanguage('ar');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the next prayer for the location, in Arabic', async () => {
    setLocation(cairo);
    await renderUi(<HomeNextPrayer onPress={jest.fn()} />);

    const next = nextPrayer(timesFor(start, cairo), start, cairo);
    expect(next).not.toBeNull();
    expect(screen.getByTestId('home-next-prayer-time')).toBeOnTheScreen();
  });

  it('asks for a location when there is none', async () => {
    setLocation(null);
    await renderUi(<HomeNextPrayer onPress={jest.fn()} />);

    expect(screen.getByTestId('home-next-prayer-prompt')).toHaveTextContent('حدّد موقعك لعرض مواقيت الصلاة');
  });

  it('opens the Salah screen through onPress', async () => {
    setLocation(cairo);
    const onPress = jest.fn();
    await renderUi(<HomeNextPrayer onPress={onPress} />);

    fireEvent.press(screen.getByTestId('home-next-prayer'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('counts the time left down with its own minute tick', async () => {
    setLocation(cairo);
    await renderUi(<HomeNextPrayer onPress={jest.fn()} />);
    const before = screen.getByTestId('home-next-prayer').props.accessibilityLabel as string;

    // Move the clock past the next minute boundary; the card re-renders on its own tick.
    await act(async () => {
      jest.advanceTimersByTime(HOME_PRAYER_TICK_MS * 30);
    });

    expect(screen.getByTestId('home-next-prayer').props.accessibilityLabel).not.toBe(before);
  });

  it('renders the prompt, without throwing, when a prayer time is missing (polar latitudes)', async () => {
    setLocation(cairo);
    jest.mocked(useNextPrayer).mockReturnValueOnce({ name: 'fajr', time: undefined } as never);

    await renderUi(<HomeNextPrayer onPress={jest.fn()} />);

    expect(screen.getByTestId('home-next-prayer-prompt')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-next-prayer-time')).toBeNull();
  });

  it('renders the prompt on the first render, before the location and the times have loaded', async () => {
    setLocation(null);
    await renderUi(<HomeNextPrayer onPress={jest.fn()} />);

    expect(screen.getByTestId('home-next-prayer-prompt')).toBeOnTheScreen();
  });

  it('uses the shared formatter for the time left', async () => {
    setLocation(cairo);
    await renderUi(<HomeNextPrayer onPress={jest.fn()} />);

    const next = nextPrayer(timesFor(start, cairo), start, cairo);
    if (next === null) {
      throw new Error('expected a next prayer');
    }
    const t = i18n.getFixedT('ar');
    expect(screen.getByText(remainingLabel(minutesUntil(next.time, start), 'ar', t))).toBeOnTheScreen();
  });
});
