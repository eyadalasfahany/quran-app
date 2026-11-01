import { act, fireEvent, screen } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { nextPrayer, timesFor } from '@/features/salah/data/prayer-times';
import { usePrayerLocation } from '@/features/salah/hooks';
import { renderUi } from '../../../../jest/render-ui';

import { MENU_SALAH_TICK_MS, MenuSalahCard } from './MenuSalahCard';

// Only the location is mocked. The times, the next prayer and the clock are the real ones.
jest.mock('@/features/salah/hooks', () => ({
  ...jest.requireActual<typeof import('@/features/salah/hooks')>('@/features/salah/hooks'),
  usePrayerLocation: jest.fn(),
}));

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

function card(onPress = jest.fn()) {
  return <MenuSalahCard caption="الصلاة" icon={{ ios: 'moon.stars', android: 'mosque' }} onPress={onPress} />;
}

describe('MenuSalahCard', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: start });
    i18n.changeLanguage('ar');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the next prayer as its title, with its time and the time left', async () => {
    setLocation(cairo);
    await renderUi(card());

    const next = nextPrayer(timesFor(start, cairo), start, cairo);
    if (next === null) {
      throw new Error('expected a next prayer');
    }
    expect(screen.getByTestId('menu-card-salah')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-salah-preview')).toHaveTextContent(/^[٠-٩]{1,2}:[٠-٩]{2} /);
  });

  it('shows a neutral prayer line without a location', async () => {
    setLocation(null);
    await renderUi(card(), { locale: 'en' });

    expect(screen.getByTestId('menu-card-salah-preview')).toHaveTextContent('Prayer times for your location');
  });

  it('opens the Salah screen through onPress, as a button', async () => {
    setLocation(cairo);
    const onPress = jest.fn();
    await renderUi(card(onPress));

    fireEvent.press(screen.getByRole('button', { name: /الصلاة/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('updates the time left on its own minute tick', async () => {
    setLocation(cairo);
    await renderUi(card(), { locale: 'en' });
    const before = screen.getByTestId('menu-card-salah-preview').props.children;

    await act(async () => {
      jest.advanceTimersByTime(MENU_SALAH_TICK_MS * 30);
    });

    expect(screen.getByTestId('menu-card-salah-preview').props.children).not.toEqual(before);
  });

  it('keeps the minute tick at one minute', () => {
    expect(MENU_SALAH_TICK_MS).toBe(60_000);
  });
});
