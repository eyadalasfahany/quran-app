import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { qiblaBearing } from '@/features/salah/data/prayer-times';
import { useAzkarAvailable, useContinueAzkar } from '@/features/azkar/data';
import { usePrayerLocation } from '@/features/salah/hooks';

import { MenuScreen } from './MenuScreen';

// Only the location (a device service) and the data that reads the user and content databases are replaced. The
// Qibla bearing, the prayer times and the Azkar card's own hooks run for real.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
}));

jest.mock('@/features/salah/hooks', () => ({
  ...jest.requireActual('@/features/salah/hooks'),
  usePrayerLocation: jest.fn(),
}));

jest.mock('@/features/azkar/data', () => ({
  ...jest.requireActual('@/features/azkar/data'),
  useAzkarAvailable: jest.fn(() => false),
  useContinueAzkar: jest.fn(() => null),
}));

jest.mock('@/features/khatma/data/hooks', () => ({
  useActivePlan: () => ({ data: [] }),
  usePlanLogs: () => ({ data: [] }),
  useKhatmaMarkerVerseId: () => null,
}));

// London: a fixed location, so the bearing has a known value.
const LONDON = { lat: 51.5074, lng: -0.1278 };

function withLocation(coords: { lat: number; lng: number } | null) {
  jest.mocked(usePrayerLocation).mockReturnValue({
    source: 'auto',
    coords,
    permissionStatus: 'granted',
    refresh: jest.fn(),
  } as never);
}

describe('MenuScreen', () => {
  beforeEach(() => {
    jest.mocked(router.navigate).mockClear();
    jest.mocked(router.push).mockClear();
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
    jest.mocked(useContinueAzkar).mockReset();
    withLocation(LONDON);
  });

  it('shows the title and the cards in Arabic', async () => {
    await renderUi(<MenuScreen />);

    expect(screen.getByRole('header', { name: 'القائمة' })).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-salah')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-qibla')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-sources')).toBeOnTheScreen();
  });

  it('shows the Qibla bearing from the real calculation, not a stub', async () => {
    const expected = `${Math.round(qiblaBearing(LONDON))}° from true north`;
    await renderUi(<MenuScreen />, { locale: 'en' });

    expect(screen.getByTestId('menu-card-qibla-preview')).toHaveTextContent(expected);
  });

  it('shows the next prayer with its clock time', async () => {
    await renderUi(<MenuScreen />, { locale: 'en' });

    expect(screen.getByTestId('menu-card-salah-preview')).toHaveTextContent(/\d{1,2}:\d{2} (AM|PM) · in /);
  });

  it('shows a neutral prayer subtitle without a location', async () => {
    withLocation(null);
    await renderUi(<MenuScreen />, { locale: 'en' });

    expect(screen.getByTestId('menu-card-salah-preview')).toHaveTextContent('Prayer times for your location');
    expect(screen.getByTestId('menu-card-qibla-preview')).toHaveTextContent('Direction of the Kaaba from your location');
  });

  it('hides the Azkar card without Azkar content, and does not read Azkar progress', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
    await renderUi(<MenuScreen />);

    expect(screen.queryByTestId('menu-card-azkar')).toBeNull();
    expect(useContinueAzkar).not.toHaveBeenCalled();
  });

  it('shows the Azkar card with its progress once Azkar content is installed', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useContinueAzkar).mockReturnValue({
      scope: { scopeKey: 'category:morning', periodKey: 'd', total: 24, categoryId: 'morning', entryKey: null, occasion: 'morning' },
      completed: 12,
    } as never);
    await renderUi(<MenuScreen />);

    expect(screen.getByTestId('menu-card-azkar')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-azkar-preview')).toHaveTextContent('١٢ من ٢٤');
    expect(flatStyle(screen.getByTestId('menu-card-azkar-progress').props.style).width).toBe('50%');
  });

  it('hides the Khatma preview line without an active plan', async () => {
    await renderUi(<MenuScreen />);

    expect(screen.getByTestId('menu-card-khatma')).toBeOnTheScreen();
    expect(screen.queryByTestId('menu-card-khatma-preview')).toBeNull();
  });

  it('opens the Salah route, not a tab, from its card', async () => {
    await renderUi(<MenuScreen />);

    fireEvent.press(screen.getByTestId('menu-card-salah'));
    expect(router.navigate).toHaveBeenCalledWith('/(main)/(salah)');
  });

  it('opens the Qibla screen, Khatma, settings and sources from their cards', async () => {
    await renderUi(<MenuScreen />);

    fireEvent.press(screen.getByTestId('menu-card-qibla'));
    expect(router.push).toHaveBeenLastCalledWith('/salah/qibla');
    fireEvent.press(screen.getByTestId('menu-card-khatma'));
    expect(router.push).toHaveBeenLastCalledWith('/khatma');
    fireEvent.press(screen.getByTestId('menu-card-settings'));
    expect(router.push).toHaveBeenLastCalledWith('/settings');
    fireEvent.press(screen.getByTestId('menu-card-sources'));
    expect(router.push).toHaveBeenLastCalledWith('/settings/sources');
  });

  it('opens the three tabs from their cards', async () => {
    await renderUi(<MenuScreen />);

    fireEvent.press(screen.getByTestId('menu-card-mushaf'));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(mushaf)');
    fireEvent.press(screen.getByTestId('menu-card-listen'));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(listen)');
    fireEvent.press(screen.getByTestId('menu-card-my-quran'));
    expect(router.navigate).toHaveBeenLastCalledWith('/(main)/(my-quran)');
  });

  it('opens search from its card and from the floating button', async () => {
    await renderUi(<MenuScreen />);

    fireEvent.press(screen.getByTestId('menu-card-search'));
    expect(router.push).toHaveBeenLastCalledWith('/search');
    fireEvent.press(screen.getByTestId('menu-search'));
    expect(router.push).toHaveBeenLastCalledWith('/search');
  });

  it('has no Downloads card, since there is no downloads route', async () => {
    await renderUi(<MenuScreen />);

    expect(screen.queryByTestId('menu-card-downloads')).toBeNull();
  });
});
