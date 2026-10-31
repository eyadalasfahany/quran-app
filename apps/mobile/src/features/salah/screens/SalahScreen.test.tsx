import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { renderUi } from '../../../../jest/render-ui';

import { setManualLocation } from '../data/location';
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
  useNow: () => mockNow,
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
});
