import { fireEvent, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { requestLocationPermissions } from '../data/location';
import { usePrayerLocation } from '../hooks';
import { useQiblaHeading } from '../hooks/useQiblaHeading';
import { QiblaScreen } from './QiblaScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 59 }) };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

jest.mock('../data/location', () => ({
  requestLocationPermissions: jest.fn(() => Promise.resolve('granted')),
}));

// A fixed bearing and distance: the compass math itself is covered by the unit tests.
jest.mock('../data/prayer-times', () => ({ qiblaBearing: jest.fn(() => 244) }));
jest.mock('../data/distance', () => ({
  ...jest.requireActual<typeof import('../data/distance')>('../data/distance'),
  distanceToMakkah: jest.fn(() => 1245),
}));

const mockLocationWithCoords = {
  cityName: undefined,
  coords: { lat: 24.7136, lng: 46.6753 },
  permissionStatus: Location.PermissionStatus.GRANTED,
  refresh: jest.fn(() => Promise.resolve()),
  source: 'auto' as const,
};

jest.mock('../hooks', () => ({ usePrayerLocation: jest.fn(() => mockLocationWithCoords) }));

jest.mock('../hooks/useQiblaHeading', () => ({
  ...jest.requireActual<typeof import('../hooks/useQiblaHeading')>('../hooks/useQiblaHeading'),
  useQiblaHeading: jest.fn(() => ({ accuracy: 'good', heading: 14, supported: true })),
}));

const mockHeading = (value: { heading: number | null; accuracy: 'good' | 'poor' | 'unavailable'; supported: boolean }) =>
  jest.mocked(useQiblaHeading).mockReturnValue(value);

describe('QiblaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(usePrayerLocation).mockReturnValue(mockLocationWithCoords);
    jest.mocked(useReducedMotion).mockReturnValue(false);
    mockHeading({ accuracy: 'good', heading: 14, supported: true });
  });

  it('renders header, dial, readout and meta panel on the player-dark canvas', async () => {
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('اتجاه القبلة')).toBeOnTheScreen();
    expect(view.getByText('مكة المكرمة · المسجد الحرام')).toBeOnTheScreen();
    expect(view.getByLabelText('اتجاه القبلة: ٢٤٤ درجة')).toBeOnTheScreen();
    expect(view.getByText('٢٤٤°')).toBeOnTheScreen();
    expect(view.getByText('١٬٢٤٥ كم')).toBeOnTheScreen();
    expect(view.getByTestId('qibla-meta-panel')).toBeOnTheScreen();
  });

  it('goes back from the back button', async () => {
    const view = await renderUi(<QiblaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'رجوع' }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('flips the back chevron only in RTL (%s)', async (locale) => {
    const view = await renderUi(<QiblaScreen />, { locale });
    const icon = view.getByTestId('qibla-back-icon', { includeHiddenElements: true });

    expect(flatStyle(icon.props.style).transform).toEqual(locale === 'ar' ? [{ scaleX: -1 }] : undefined);
  });

  it('asks for permission and refreshes the location from the location button', async () => {
    const view = await renderUi(<QiblaScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'الموقع' }));

    expect(requestLocationPermissions).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockLocationWithCoords.refresh).toHaveBeenCalledTimes(1));
  });

  it('shows the empty state when the location is unset, and its action asks for permission', async () => {
    const refresh = jest.fn(() => Promise.resolve());
    jest.mocked(usePrayerLocation).mockReturnValue({ ...mockLocationWithCoords, coords: null, refresh });

    const view = await renderUi(<QiblaScreen />);

    expect(view.getByRole('header', { name: 'الموقع غير محدد' })).toBeOnTheScreen();
    expect(view.queryByTestId('qibla-compass')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'تحديد الموقع' }));
    expect(requestLocationPermissions).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('shows the calibration notice while accuracy is poor, and hides it on recovery', async () => {
    mockHeading({ accuracy: 'poor', heading: 14, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('حرّك جهازك على شكل ٨')).toBeOnTheScreen();

    mockHeading({ accuracy: 'good', heading: 14, supported: true });
    await view.rerender(<QiblaScreen />);
    await waitFor(() => expect(view.queryByText('حرّك جهازك على شكل ٨')).toBeNull());
  });

  it('shows the unsupported note and a static dial when the device has no compass', async () => {
    mockHeading({ accuracy: 'unavailable', heading: null, supported: false });
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('هذا الجهاز لا يدعم البوصلة؛ الاتجاه المعروض محسوب من موقعك')).toBeOnTheScreen();
    // Static dial: the needle rests on the marker at the bearing.
    const style = view.getByTestId('qibla-compass-needle').props.style;
    expect(JSON.stringify(style)).toContain('244deg');
  });

  it('shows the aligned pill and fires the success haptic when the needle settles on the marker', async () => {
    mockHeading({ accuracy: 'good', heading: 242, supported: true }); // |244 − 242| ≤ 3
    const view = await renderUi(<QiblaScreen />);

    expect(view.getByText('أنت باتجاه القبلة')).toBeOnTheScreen();
    await waitFor(() =>
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success),
    );
    // The haptic effect is keyed on the aligned edge ([aligned] deps + a ref), so it fires
    // once per false→true transition. RNTL remounts on rerender, so an exact count across
    // renders is not assertable here; the negative cases below guard the edges.
  });

  it('shows neither the pill nor a haptic while unaligned', async () => {
    mockHeading({ accuracy: 'good', heading: 100, supported: true });
    const view = await renderUi(<QiblaScreen />);

    expect(view.queryByText('أنت باتجاه القبلة')).toBeNull();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('renders the static dial and no haptic under Reduce Motion, even when aligned', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    mockHeading({ accuracy: 'good', heading: 244, supported: true });
    const view = await renderUi(<QiblaScreen />);

    // The hook is not even asked to watch: enabled = bearing !== null && !reduceMotion.
    expect(useQiblaHeading).toHaveBeenCalledWith(false);
    expect(view.queryByText('أنت باتجاه القبلة')).toBeNull();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(JSON.stringify(view.getByTestId('qibla-compass-needle').props.style)).toContain('244deg');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/screens/QiblaScreen.tsx')).toEqual([]);
  });
});
