import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { themes } from '@/core/theme';
import { MINI_PLAYER_NOTICE_HEIGHT, MINI_PLAYER_TABS_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { resetSkipNoticeForTests, useSkipNoticeStore } from '@/features/audio/skip-notice';
import { usePlayerStore } from '@/features/audio/playerStore';

import { flatStyle, renderUi } from '../../../../jest/render-ui';

import { requestLocationPermissions, setManualLocation } from '../data/location';
import { SalahScreen } from './SalahScreen';

const INSETS = { top: 59, right: 0, bottom: 34, left: 0 };

function screen() {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: INSETS }}>
      <SalahScreen />
    </SafeAreaProvider>
  );
}

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
}));

jest.mock('expo-location', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined', DENIED: 'denied', GRANTED: 'granted' },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 24.7136, longitude: 46.6753 } })),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../data/location', () => ({
  ...jest.requireActual('../data/location'),
  requestLocationPermissions: jest.fn(async () => 'granted'),
  setAutoLocation: jest.fn(),
  setManualLocation: jest.fn(),
}));

// 10:00Z on 2026-10-31 — after Dhuhr (08:37Z), before Asr (11:51Z) in Riyadh, on any test-runner timezone.
const mockNow = new Date('2026-10-31T10:00:00Z');
const RIYADH = { lat: 24.7136, lng: 46.6753 };

const mockLocation = jest.fn(() => ({
  source: 'auto' as const,
  coords: RIYADH as { lat: number; lng: number } | null,
  cityId: undefined as string | undefined,
  cityName: undefined as { ar: string; en: string } | undefined,
  permissionStatus: 'granted' as string,
  refresh: jest.fn(),
}));

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  // The screen's clock is pinned to mockNow; the times are the real engine's for that instant.
  usePrayerClock: (coords: { lat: number; lng: number } | null) => ({
    now: mockNow,
    times: coords ? jest.requireActual<typeof import('../data/prayer-times')>('../data/prayer-times').timesFor(mockNow, coords) : null,
  }),
  usePrayerLocation: () => mockLocation(),
}));

describe('SalahScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.mockReturnValue({
      source: 'auto',
      coords: RIYADH,
      cityId: undefined,
      cityName: undefined,
      permissionStatus: 'granted',
      refresh: jest.fn(),
    });
  });

  it('renders the header with the Hijri · Gregorian date line', async () => {
    const view = await renderUi(screen());

    expect(view.getByText('الصلاة')).toBeTruthy();
    expect(view.getByTestId('salah-header-subtitle')).toHaveTextContent('٢٠ جمادى الأولى ١٤٤٨ · السبت ٣١ أكتوبر');
  });

  it('counts down to العصر in the hero and marks its row active', async () => {
    const view = await renderUi(screen());

    expect(view.getByTestId('salah-hero-name')).toHaveTextContent('العصر');
    expect(view.getByTestId('salah-row-asr-active-bar')).toBeTruthy();
    expect(view.queryByTestId('salah-row-fajr-active-bar')).toBeNull();
  });

  it('keeps the scenic hero and a plain times list; past rows are muted', async () => {
    const view = await renderUi(screen());

    expect(view.getByTestId('salah-hero-photo')).toBeTruthy();
    expect(view.queryByTestId('salah-hero-ring')).toBeNull();
    expect(view.getByTestId('salah-row-asr-active-bar')).toBeTruthy();
    expect(flatStyle(view.getByTestId('salah-row-asr').props.style).backgroundColor).toBe(
      themes.light.colors.fillSecondary,
    );
    expect(flatStyle(view.getByText('الفجر').props.style).color).toBe(themes.light.colors.inkMuted);
  });

  it('draws the six rows, five bells, and an empty slot for الشروق', async () => {
    const view = await renderUi(screen());

    for (const key of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      expect(view.getByTestId(`salah-row-${key}`)).toBeTruthy();
    }
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      expect(view.getByTestId(`salah-bell-${prayer}`)).toBeTruthy();
    }
    expect(view.getByTestId('salah-row-sunrise-bell-slot')).toBeTruthy();
  });

  it('pushes the qibla route from the qibla row, bearing shown from true north', async () => {
    const view = await renderUi(screen());

    expect(view.getByTestId('salah-qibla-subtitle')).toHaveTextContent('٢٤٤° من الشمال الحقيقي');

    await fireEvent.press(view.getByTestId('salah-qibla'));
    expect(router.push).toHaveBeenCalledWith('/salah/qibla');
  });

  it('opens the adhan sound picker from the header speaker button', async () => {
    const view = await renderUi(screen());

    await fireEvent.press(view.getByTestId('salah-header-sound'));

    expect(router.push).toHaveBeenCalledWith('/adhan-sound');
  });

  it('opens the location sheet from the header and stores a picked city', async () => {
    const view = await renderUi(screen());

    await fireEvent.press(view.getByTestId('salah-header-location'));
    await fireEvent.changeText(view.getByTestId('salah-location-sheet-search-input'), 'مكة');
    await fireEvent.press(view.getByTestId('salah-location-sheet-city-makkah'));

    expect(setManualLocation).toHaveBeenCalledWith({ id: 'makkah', lat: 21.4225, lng: 39.8262 });
  });

  it('shows the empty state with a city-picker action when location is denied', async () => {
    mockLocation.mockReturnValue({
      source: 'auto',
      coords: null,
      cityId: undefined,
      cityName: undefined,
      permissionStatus: 'denied',
      refresh: jest.fn(),
    });

    const view = await renderUi(screen());

    expect(view.getByTestId('salah-no-location')).toBeTruthy();

    await fireEvent.press(view.getByTestId('salah-no-location-action'));
    expect(view.getByTestId('salah-location-sheet')).toBeTruthy();
  });

  it('shows the saved last place with its times and the last-known label, not the empty state (ADR 0086)', async () => {
    mockLocation.mockReturnValue({
      source: 'auto',
      coords: RIYADH,
      cityId: undefined,
      cityName: undefined,
      permissionStatus: 'undetermined',
      pending: false,
      stale: true,
      refresh: jest.fn(),
    } as never);

    const view = await renderUi(screen());

    expect(view.getByTestId('salah-hero-place')).toHaveTextContent(/آخر موقع معروف/);
    expect(view.getByTestId('salah-hero-name')).toHaveTextContent('العصر');
    expect(view.queryByTestId('salah-locating')).toBeNull();
    expect(view.queryByTestId('salah-no-location')).toBeNull();
    // A seeded place never opens the system prompt: the place is there, so there is nothing to ask for yet.
    expect(requestLocationPermissions).not.toHaveBeenCalled();
  });

  it('shows the loading state, not the empty state, while the location read is pending with permission granted', async () => {
    mockLocation.mockReturnValue({
      source: 'auto',
      coords: null,
      cityId: undefined,
      cityName: undefined,
      permissionStatus: 'granted',
      pending: true,
      refresh: jest.fn(),
    } as never);

    const view = await renderUi(screen());

    expect(view.getByTestId('salah-locating')).toBeTruthy();
    expect(view.queryByTestId('salah-no-location')).toBeNull();
  });

  it('shows the empty state once the read has finished without a location', async () => {
    mockLocation.mockReturnValue({
      source: 'auto',
      coords: null,
      cityId: undefined,
      cityName: undefined,
      permissionStatus: 'granted',
      pending: false,
      refresh: jest.fn(),
    } as never);

    const view = await renderUi(screen());

    expect(view.queryByTestId('salah-locating')).toBeNull();
    expect(view.getByTestId('salah-no-location')).toBeTruthy();
  });

  describe('mini player clearance', () => {
    beforeEach(() => {
      Dimensions.set({
        screen: { fontScale: 1, height: 844, scale: 1, width: 390 },
        window: { fontScale: 1, height: 844, scale: 1, width: 390 },
      });
      usePlayerStore.getState().reset();
    });

    afterEach(async () => {
      usePlayerStore.getState().reset();
      await act(async () => {
        resetSkipNoticeForTests();
      });
    });

    it('pads the scroll content by the bar footprint while the bar shows, so the qibla row clears it', async () => {
      const store = usePlayerStore.getState();
      store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      store.markPlaying();
      const view = await renderUi(screen());

      expect(flatStyle(view.getByTestId('screen-salah-scroll').props.contentContainerStyle).paddingBottom).toBe(
        themes.light.space[4] + MINI_PLAYER_TABS_FOOTPRINT + themes.light.size.touchTarget + themes.light.space[4] * 2,
      );
    });

    it('grows the bottom inset by the skip notice line while the notice shows during playback', async () => {
      const store = usePlayerStore.getState();
      store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 48_000 });
      store.markPlaying();
      const view = await renderUi(screen());
      const before = Number(flatStyle(view.getByTestId('screen-salah-scroll').props.contentContainerStyle).paddingBottom);

      await act(async () => {
        useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [38] });
      });

      expect(flatStyle(view.getByTestId('screen-salah-scroll').props.contentContainerStyle).paddingBottom).toBe(
        before + MINI_PLAYER_NOTICE_HEIGHT,
      );
    });

    it('adds no bar footprint while the player is idle', async () => {
      const view = await renderUi(screen());

      expect(flatStyle(view.getByTestId('screen-salah-scroll').props.contentContainerStyle).paddingBottom).toBe(
        themes.light.space[4],
      );
    });
  });
});
